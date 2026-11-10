import { useEffect, useReducer } from 'react'
import type { ThemePreference, TimerState } from '../../../shared/types'

/**
 * Remaining milliseconds for the current phase. While running this re-derives
 * from the `endsAt` timestamp rather than counting ticks, so it stays exact
 * across throttling and sleep; the main process owns the real state.
 */
export function useRemainingMs(timer: TimerState | undefined): number {
  const [, force] = useReducer((n: number) => n + 1, 0)

  const running = timer?.status === 'running'
  const endsAt = timer?.endsAt ?? null

  useEffect(() => {
    if (!running || endsAt === null) return
    const id = window.setInterval(force, 250)
    return () => window.clearInterval(id)
  }, [running, endsAt])

  if (!timer) return 0
  if (timer.status === 'running' && timer.endsAt !== null) {
    return Math.max(0, timer.endsAt - Date.now())
  }
  return timer.remainingMs
}

/** Resolves the appearance preference and follows the OS in `system` mode. */
export function useTheme(preference: ThemePreference): void {
  useEffect(() => {
    const query = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = () => {
      const resolved = preference === 'system' ? (query.matches ? 'dark' : 'light') : preference
      document.documentElement.dataset.theme = resolved
    }
    apply()
    query.addEventListener('change', apply)
    return () => query.removeEventListener('change', apply)
  }, [preference])
}
