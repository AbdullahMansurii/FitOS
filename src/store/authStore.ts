import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import bcrypt from 'bcryptjs'
import { setSupabaseAuthHeader, supabase } from '@/lib/supabase'
import type { WeightUnit, EnergyUnit } from '@/types'

export interface AuthResult {
  success: boolean
  error?: string
}

interface AuthState {
  isSetup: boolean
  isUnlocked: boolean
  passwordHash: string | null
  recoveryHash: string | null
  syncToken: string | null
  setup: (password: string, recoveryPhrase: string) => Promise<AuthResult>
  unlock: (password: string) => Promise<AuthResult>
  lock: () => void
  changePassword: (currentPassword: string, newPassword: string) => Promise<AuthResult>
  resetWithRecovery: (phrase: string, newPassword: string) => Promise<AuthResult>
}

export async function deriveSyncToken(password: string): Promise<string> {
  const encoder = new TextEncoder()
  const salt = 'fitos-owner-salt-2026'
  const data = encoder.encode(password + salt)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      isSetup: false,
      isUnlocked: false,
      passwordHash: null,
      recoveryHash: null,
      syncToken: null,

      setup: async (password, recoveryPhrase) => {
        try {
          const passwordHash = await bcrypt.hash(password, 10)
          const recoveryHash = await bcrypt.hash(recoveryPhrase.toLowerCase().trim(), 10)
          const syncToken = await deriveSyncToken(password)
          setSupabaseAuthHeader(syncToken)
          set({ isSetup: true, isUnlocked: true, passwordHash, recoveryHash, syncToken })
          return { success: true }
        } catch (err: unknown) {
          const errMsg = err instanceof Error ? err.message : String(err)
          console.error('[FitOS Auth] Setup failed:', errMsg)
          return { success: false, error: errMsg }
        }
      },

      unlock: async (password) => {
        const { passwordHash, syncToken } = get()
        const derivedToken = await deriveSyncToken(password)

        // Case A: Local store has credentials (offline/cache path)
        if (passwordHash) {
          const ok = await bcrypt.compare(password, passwordHash)
          if (ok) {
            // Migrate database if device uses old random sync token format
            if (syncToken !== derivedToken) {
              const { useProfileStore } = await import('./index')
              const profileId = useProfileStore.getState().profile?.id
              if (profileId) {
                // Temporarily authorize with old token to write new token
                setSupabaseAuthHeader(syncToken || '')
                const { error } = await supabase
                  .from('profiles')
                  .update({ sync_token: derivedToken })
                  .eq('id', profileId)

                if (error) {
                  console.error('[FitOS Auth] Token migration failed:', error.message)
                  return { success: false, error: `Security Migration Failed: ${error.message}` }
                }
              } else {
                console.warn('[FitOS Auth] Profile ID missing during token migration.')
              }
            }
            setSupabaseAuthHeader(derivedToken)
            set({ isUnlocked: true, syncToken: derivedToken })
            return { success: true }
          }
          return { success: false, error: 'Incorrect password' }
        }

        // Case B: No local store credentials (new device pairing/initial setup)
        setSupabaseAuthHeader(derivedToken)
        try {
          const { data: profileRow, error: fetchErr } = await supabase
            .from('profiles')
            .select('*')
            .limit(1)
            .maybeSingle()
          
          if (fetchErr) {
            console.error('[FitOS Auth] Profile fetch failed:', fetchErr.message)
            return { success: false, error: `Database Connection Failed: ${fetchErr.message}` }
          }
          
          if (profileRow) {
            // Pairing success: Profile found with matching derived token
            const { useProfileStore } = await import('./index')
            useProfileStore.getState().setProfile({
              id: profileRow.id,
              displayName: profileRow.display_name,
              heightCm: profileRow.height_cm,
              weightUnit: profileRow.weight_unit as WeightUnit,
              energyUnit: profileRow.energy_unit as EnergyUnit,
              dateOfBirth: profileRow.date_of_birth,
              gender: profileRow.gender as 'male' | 'female' | 'other' | undefined,
              createdAt: profileRow.created_at,
              updatedAt: profileRow.updated_at,
            })

            const newHash = await bcrypt.hash(password, 10)
            set({
              isSetup: true,
              isUnlocked: true,
              passwordHash: newHash,
              syncToken: derivedToken
            })
            return { success: true }
          } else {
            // Either incorrect password (no profile matches derived token) OR DB is empty (first launch)
            const defaultId = crypto.randomUUID()
            const { error: insErr } = await supabase.from('profiles').insert({
              id: defaultId,
              display_name: 'Abdullah Mansuri',
              weight_unit: 'kg',
              energy_unit: 'kcal',
              sync_token: derivedToken,
              is_master: true,
            })

            if (insErr) {
              if (insErr.code === '23505') {
                // Unique constraint violated -> profile already exists -> wrong password!
                return { success: false, error: 'Incorrect password' }
              }
              console.error('[FitOS Auth] Unique constraint violation on pairing insert:', insErr.message)
              return { success: false, error: `Pairing Failed: ${insErr.message} (${insErr.code})` }
            }

            // Database was empty: Initial launch setup success
            const { useProfileStore } = await import('./index')
            useProfileStore.getState().setProfile({
              id: defaultId,
              displayName: 'Abdullah Mansuri',
              weightUnit: 'kg',
              energyUnit: 'kcal',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            })

            const newHash = await bcrypt.hash(password, 10)
            set({
              isSetup: true,
              isUnlocked: true,
              passwordHash: newHash,
              syncToken: derivedToken
            })
            return { success: true }
          }
        } catch (err: unknown) {
          const errMsg = err instanceof Error ? err.message : String(err)
          console.error('[FitOS Auth] Pairing/verify fetch failed:', errMsg)
          return { success: false, error: errMsg }
        }
      },

      lock: () => set({ isUnlocked: false }),

      changePassword: async (currentPassword, newPassword) => {
        const { passwordHash, syncToken } = get()
        if (!passwordHash) return { success: false, error: 'Auth not initialized' }
        const ok = await bcrypt.compare(currentPassword, passwordHash)
        if (!ok) return { success: false, error: 'Current password is incorrect' }
        const newHash = await bcrypt.hash(newPassword, 10)
        const derivedToken = await deriveSyncToken(newPassword)

        const { useProfileStore } = await import('./index')
        const profileId = useProfileStore.getState().profile?.id
        if (profileId && syncToken) {
          setSupabaseAuthHeader(syncToken)
          const { error } = await supabase
            .from('profiles')
            .update({ sync_token: derivedToken })
            .eq('id', profileId)
          
          if (error) {
            console.error('[FitOS Auth] Change password DB update failed:', error.message)
            return { success: false, error: `Database update failed: ${error.message}` }
          }
        }

        setSupabaseAuthHeader(derivedToken)
        set({ passwordHash: newHash, syncToken: derivedToken })
        return { success: true }
      },

      resetWithRecovery: async (phrase, newPassword) => {
        const { recoveryHash, syncToken } = get()
        if (!recoveryHash) return { success: false, error: 'Recovery hash not set' }
        const ok = await bcrypt.compare(phrase.toLowerCase().trim(), recoveryHash)
        if (!ok) return { success: false, error: 'Invalid recovery phrase' }
        const newHash = await bcrypt.hash(newPassword, 10)
        const derivedToken = await deriveSyncToken(newPassword)

        const { useProfileStore } = await import('./index')
        const profileId = useProfileStore.getState().profile?.id
        if (profileId && syncToken) {
          setSupabaseAuthHeader(syncToken)
          const { error } = await supabase
            .from('profiles')
            .update({ sync_token: derivedToken })
            .eq('id', profileId)

          if (error) {
            console.error('[FitOS Auth] DB update after recovery reset failed:', error.message)
            return { success: false, error: `Database update failed: ${error.message}` }
          }
        }

        setSupabaseAuthHeader(derivedToken)
        set({ passwordHash: newHash, syncToken: derivedToken })
        return { success: true }
      },
    }),
    {
      name: 'fitos-auth',
      partialize: (s) => ({
        isSetup: s.isSetup,
        passwordHash: s.passwordHash,
        recoveryHash: s.recoveryHash,
        syncToken: s.syncToken,
      }),
    }
  )
)
