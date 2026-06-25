import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import bcrypt from 'bcryptjs'
import { setSupabaseAuthHeader, supabase } from '@/lib/supabase'
import type { WeightUnit, EnergyUnit } from '@/types'

interface AuthState {
  isSetup: boolean
  isUnlocked: boolean
  passwordHash: string | null
  recoveryHash: string | null
  syncToken: string | null
  setup: (password: string, recoveryPhrase: string) => Promise<void>
  unlock: (password: string) => Promise<boolean>
  lock: () => void
  changePassword: (currentPassword: string, newPassword: string) => Promise<boolean>
  resetWithRecovery: (phrase: string, newPassword: string) => Promise<boolean>
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
        const passwordHash = await bcrypt.hash(password, 10)
        const recoveryHash = await bcrypt.hash(recoveryPhrase.toLowerCase().trim(), 10)
        const syncToken = await deriveSyncToken(password)
        setSupabaseAuthHeader(syncToken)
        set({ isSetup: true, isUnlocked: true, passwordHash, recoveryHash, syncToken })
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
              try {
                const { useProfileStore } = await import('./index')
                const profileId = useProfileStore.getState().profile?.id
                if (profileId) {
                  // Temporarily authorize with old token to write new token
                  setSupabaseAuthHeader(syncToken || '')
                  await supabase.from('profiles').update({ sync_token: derivedToken }).eq('id', profileId)
                }
              } catch (err) {
                console.warn('[FitOS Auth] Token migration failed — proceeding offline:', err)
              }
            }
            setSupabaseAuthHeader(derivedToken)
            set({ isUnlocked: true, syncToken: derivedToken })
          }
          return ok
        }

        // Case B: No local store credentials (new device pairing/initial setup)
        setSupabaseAuthHeader(derivedToken)
        try {
          const { data: profileRow } = await supabase.from('profiles').select('*').limit(1).maybeSingle()
          
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
            return true
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
              // Violates single-row UNIQUE constraint (profile exists with different token) -> wrong password!
              console.error('[FitOS Auth] Unique constraint violation on pairing insert:', insErr.message)
              return false
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
            return true
          }
        } catch (err) {
          console.error('[FitOS Auth] Pairing/verify fetch failed:', err)
          return false
        }
      },

      lock: () => set({ isUnlocked: false }),

      changePassword: async (currentPassword, newPassword) => {
        const { passwordHash, syncToken } = get()
        if (!passwordHash) return false
        const ok = await bcrypt.compare(currentPassword, passwordHash)
        if (!ok) return false
        const newHash = await bcrypt.hash(newPassword, 10)
        const derivedToken = await deriveSyncToken(newPassword)

        const { useProfileStore } = await import('./index')
        const profileId = useProfileStore.getState().profile?.id
        if (profileId && syncToken) {
          try {
            setSupabaseAuthHeader(syncToken)
            await supabase.from('profiles').update({ sync_token: derivedToken }).eq('id', profileId)
          } catch (err) {
            console.warn('[FitOS Auth] Change password DB update failed:', err)
          }
        }

        setSupabaseAuthHeader(derivedToken)
        set({ passwordHash: newHash, syncToken: derivedToken })
        return true
      },

      resetWithRecovery: async (phrase, newPassword) => {
        const { recoveryHash, syncToken } = get()
        if (!recoveryHash) return false
        const ok = await bcrypt.compare(phrase.toLowerCase().trim(), recoveryHash)
        if (!ok) return false
        const newHash = await bcrypt.hash(newPassword, 10)
        const derivedToken = await deriveSyncToken(newPassword)

        const { useProfileStore } = await import('./index')
        const profileId = useProfileStore.getState().profile?.id
        if (profileId && syncToken) {
          try {
            setSupabaseAuthHeader(syncToken)
            await supabase.from('profiles').update({ sync_token: derivedToken }).eq('id', profileId)
          } catch (err) {
            console.warn('[FitOS Auth] DB update after recovery reset failed:', err)
          }
        }

        setSupabaseAuthHeader(derivedToken)
        set({ passwordHash: newHash, syncToken: derivedToken })
        return true
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
