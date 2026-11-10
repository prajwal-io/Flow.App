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

/** Readable date for tooltips and screen readers. */
export function dayLabel(key: DayKey): string {
  return new Date(`${key}T12:00:00`).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}
