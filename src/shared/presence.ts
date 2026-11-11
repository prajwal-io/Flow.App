import type { PersistedState } from './types'

/**
 * Presence — one honest line the user can paste into chat or status fields.
 * Composed in the main process from live timer state, so it never claims a
 * focus that is not running or an end time that will not be kept.
 */

/** Mirrors the renderer clock: ceil, so the last second never reads 0:00. */
function clock(ms: number): string {
  const totalSec = Math.max(0, Math.ceil(ms / 1000))
  const minutes = Math.floor(totalSec / 60)
  const seconds = totalSec % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

/** System-locale time of day, e.g. `4:32 PM`. */
function at(epochMs: number): string {
  return new Date(epochMs).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

/** `1h 40m` / `45m`, mirroring the renderer's daily-tally formatter. */
function durationLabel(ms: number): string {
  const minutes = Math.round(ms / 60_000)
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest > 0 ? `${hours}h ${rest}m` : `${hours}h`
}

export function presenceLine(state: Pick<PersistedState, 'timer' | 'settings'>, todayFocusedMs: number): string {
  const { timer, settings } = state
  const flow = `Flow ${timer.currentFlow} of ${settings.flows}`
  const today = todayFocusedMs > 0 ? ` · ${durationLabel(todayFocusedMs)} focused today` : ''

  if (timer.phase === 'done') return `Plan complete${today}`

  if (timer.phase === 'break') {
    return timer.status === 'running' && timer.endsAt !== null
      ? `On a break until ${at(timer.endsAt)}`
      : `Break — ${clock(timer.remainingMs)} left`
  }

  // Focus phase.
  if (timer.status === 'running' && timer.endsAt !== null) return `Focusing until ${at(timer.endsAt)} · ${flow}`
  if (timer.status === 'paused') return `Focus paused with ${clock(timer.remainingMs)} left · ${flow}`
  return `No focus running${today}`
}
