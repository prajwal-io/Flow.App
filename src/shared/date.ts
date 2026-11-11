import type { DayKey } from './types'

/** Local-day key for history buckets. */
export function dayKey(date = new Date()): DayKey {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Oldest-to-newest day keys ending today (or `end`). */
export function recentDayKeys(count: number, end = new Date()): DayKey[] {
  const keys: DayKey[] = []
  for (let i = count - 1; i >= 0; i -= 1) {
    keys.push(dayKey(new Date(end.getFullYear(), end.getMonth(), end.getDate() - i)))
  }
  return keys
}

/** One-letter weekday label for the compact history strip. */
export function weekdayInitial(key: DayKey): string {
  return new Date(`${key}T12:00:00`).toLocaleDateString(undefined, { weekday: 'narrow' })
}

/**
 * Whole days from `from` to `to` (positive when `to` is later). Noon anchors
 * keep the arithmetic free of DST shifts; malformed keys yield NaN, which every
 * comparison in the repair checks treats as "not eligible".
 */
export function daysBetween(from: DayKey, to: DayKey): number {
  const a = Date.parse(`${from}T12:00:00`)
  const b = Date.parse(`${to}T12:00:00`)
  const days = Math.round((b - a) / 86_400_000)
  return Number.isFinite(days) ? days : Number.NaN
}

/** Readable date for tooltips and screen readers. */
export function dayLabel(key: DayKey): string {
  return new Date(`${key}T12:00:00`).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}
