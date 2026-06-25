import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import bcrypt from 'bcryptjs'
import { setSupabaseAuthHeader } from '@/lib/supabase'

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
        const syncToken = import.meta.env?.VITE_SYNC_TOKEN || crypto.randomUUID()
        setSupabaseAuthHeader(syncToken)
        set({ isSetup: true, isUnlocked: true, passwordHash, recoveryHash, syncToken })
      },

      unlock: async (password) => {
        const { passwordHash, syncToken } = get()
        if (!passwordHash) return false
        const ok = await bcrypt.compare(password, passwordHash)
        if (ok) {
          const updatedToken = syncToken || import.meta.env?.VITE_SYNC_TOKEN || crypto.randomUUID()
          setSupabaseAuthHeader(updatedToken)
          set({ isUnlocked: true, syncToken: updatedToken })
        }
        return ok
      },

      lock: () => set({ isUnlocked: false }),

      changePassword: async (currentPassword, newPassword) => {
        const { passwordHash } = get()
        if (!passwordHash) return false
        const ok = await bcrypt.compare(currentPassword, passwordHash)
        if (!ok) return false
        const newHash = await bcrypt.hash(newPassword, 10)
        set({ passwordHash: newHash })
        return true
      },

      resetWithRecovery: async (phrase, newPassword) => {
        const { recoveryHash, syncToken } = get()
        if (!recoveryHash) return false
        const ok = await bcrypt.compare(phrase.toLowerCase().trim(), recoveryHash)
        if (!ok) return false
        const newHash = await bcrypt.hash(newPassword, 10)
        const updatedToken = syncToken || import.meta.env?.VITE_SYNC_TOKEN || crypto.randomUUID()
        setSupabaseAuthHeader(updatedToken)
        set({ passwordHash: newHash, syncToken: updatedToken })
        return true
      },
    }),
    {
      name: 'fitos-auth',
      // Only persist auth config, never the unlocked state
      partialize: (s) => ({
        isSetup: s.isSetup,
        passwordHash: s.passwordHash,
        recoveryHash: s.recoveryHash,
        syncToken: s.syncToken,
      }),
    }
  )
)
