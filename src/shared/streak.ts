import type { DayKey, DayStat } from './types'
import { daysBetween, dayKey } from './date'

/**
 * Streak rules — the retention heart of Flow 1.3, kept honest:
 * a day counts when focus was actually logged, or when it was healed by the
 * one-per-week streak repair. A repair marks the day; it never invents focus.
 */

/** A healable gap must sit inside the 7-day strip. */
const REPAIR_WINDOW_DAYS = 7
/** One repair per week: the cooldown between two heals. */
const REPAIR_COOLDOWN_DAYS = 7

export interface StreakInfo {
  /** Length of the most recent unbroken run of counting days. */
  count: number
  /** The run reaches today or yesterday, so today's work can still extend it. */
  alive: boolean
  /** Today already counts toward the run. */
  activeToday: boolean
  /** A closed missed day that may be healed right now; null when not offered. */
  repairKey: DayKey | null
}

function qualifies(stat: DayStat | undefined): boolean {
  return Boolean(stat && (stat.focusMs > 0 || stat.repaired))
}

function dayShift(key: DayKey, delta: number): DayKey {
  const d = new Date(`${key}T12:00:00`)
  d.setDate(d.getDate() + delta)
  return dayKey(d)
}

/** Derives the current streak and the one repair available for it, if any. */
export function streakInfo(
  history: Record<DayKey, DayStat>,
  today: DayKey,
  lastRepairAt: DayKey | null,
): StreakInfo {
  const empty: StreakInfo = { count: 0, alive: false, activeToday: false, repairKey: null }

  // The latest counting day — ISO keys sort lexicographically.
  let latest: DayKey | null = null
  for (const key of Object.keys(history)) {
    if (key > today) continue // future-dated imports are not evidence
    if (qualifies(history[key]) && (latest === null || key > latest)) latest = key
  }
  if (latest === null) return empty

  let count = 0
  let cursor: DayKey | null = latest
  while (cursor !== null && qualifies(history[cursor])) {
    count += 1
    cursor = dayShift(cursor, -1)
  }

  const age = daysBetween(latest, today)
  const activeToday = age === 0
  const alive = activeToday || age === 1
  // Alive runs need no repair: today is still open, and yesterday's work keeps
  // the run standing. Only a closed, missed day is healable.
  if (alive) return { count, alive, activeToday, repairKey: null }

  const gap = dayShift(latest, 1) // the day the run actually broke
  const gapAge = daysBetween(gap, today)
  if (!Number.isFinite(gapAge) || gapAge <= 0 || gapAge >= REPAIR_WINDOW_DAYS) return { ...empty, count, alive }
  if (lastRepairAt !== null) {
    const since = daysBetween(lastRepairAt, today)
    if (Number.isFinite(since) && since < REPAIR_COOLDOWN_DAYS) return { ...empty, count, alive }
  }
  return { count, alive, activeToday: false, repairKey: gap }
}

/** Main-process guard for the repair command: only the offered day, once a week. */
export function canRepairDay(
  history: Record<DayKey, DayStat>,
  key: DayKey,
  today: DayKey,
  lastRepairAt: DayKey | null,
): boolean {
  return streakInfo(history, today, lastRepairAt).repairKey === key
}
