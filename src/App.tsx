import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import { useAuthStore } from '@/store/authStore'
import { AppShell } from '@/components/layout/AppShell'
import { ErrorBoundary } from '@/components/shared/ErrorBoundary'
import { LockScreen } from '@/pages/Auth/LockScreen'
import { Dashboard } from '@/pages/Dashboard/Dashboard'
import { FoodPage } from '@/pages/Food/FoodPage'
import { WorkoutPage } from '@/pages/Workout/WorkoutPage'
import { ProgressPage } from '@/pages/Progress/ProgressPage'
import { CoachPage } from '@/pages/Coach/CoachPage'
import { SettingsPage } from '@/pages/Settings/SettingsPage'
import { MeasurementsPage } from '@/pages/Measurements/MeasurementsPage'
import { pullAll, schedulePush, isSupabaseReachable } from '@/lib/sync'
import { seedUserContext } from '@/lib/contextSeed'

function AuthGate({ children }: { children: React.ReactNode }) {
  const { isSetup, isUnlocked } = useAuthStore()
  if (!isSetup || !isUnlocked) return <LockScreen />
  return <>{children}</>
}

// ─── Sync initializer (runs once after unlock) ─────────────────────────────

function SyncInit() {
  const { isUnlocked } = useAuthStore()

  useEffect(() => {
    if (!isUnlocked) return

    // 1. Always seed Abdullah's context first (idempotent)
    seedUserContext()

    // 2. Check Supabase and sync
    isSupabaseReachable().then((reachable) => {
      if (!reachable) {
        console.info('[FitOS] Supabase unreachable — running offline')
        return
      }
      pullAll().then(() => schedulePush(2000))
    })
  }, [isUnlocked])

  return null
}

// ─── App ────────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <BrowserRouter>
      <AuthGate>
        <SyncInit />
        <AppShell>
          <ErrorBoundary>
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/food" element={<FoodPage />} />
              <Route path="/workout" element={<WorkoutPage />} />
              <Route path="/progress" element={<ProgressPage />} />
              <Route path="/coach" element={<CoachPage />} />
              <Route path="/measurements" element={<MeasurementsPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </ErrorBoundary>
        </AppShell>
      </AuthGate>
    </BrowserRouter>
  )
}
