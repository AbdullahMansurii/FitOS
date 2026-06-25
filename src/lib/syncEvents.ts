/**
 * syncEvents.ts
 * Thin event bridge so store/index.ts can trigger syncs without
 * importing sync.ts directly (which would create a circular dependency).
 *
 * Usage:
 *  - sync.ts calls registerSchedulePush(schedulePush) on module init
 *  - store/index.ts calls notifySync() after mutations
 */

type ScheduleFn = (delayMs?: number) => void

let _schedulePush: ScheduleFn = () => {
  // No-op until sync.ts registers itself (happens on App mount)
}

/** Called once by sync.ts to register its schedulePush function. */
export function registerSchedulePush(fn: ScheduleFn) {
  _schedulePush = fn
}

/** Called by store mutations to schedule a background sync. */
export function notifySync(delayMs = 5000) {
  _schedulePush(delayMs)
}
