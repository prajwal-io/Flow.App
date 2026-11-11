import { useEffect, useState, type ReactNode } from 'react'
import type { DayKey, DayStat, Settings, ThemePreference, TimerState } from '../../../shared/types'
import { dayKey, dayLabel, recentDayKeys, weekdayInitial } from '../../../shared/date'
import { streakInfo } from '../../../shared/streak'
import { api } from '../lib/api'
import { formatFocusDuration } from '../lib/format'
import { IconButton } from './IconButton'
import { AppearanceIcon, SoundOffIcon, SoundOnIcon } from './Icons'

interface TodayFooterProps {
  history: Record<DayKey, DayStat>
  lastRepairAt: DayKey | null
  settings: Settings
  timer: TimerState
  onViewReport: () => void
  onToggleSound: () => void
  onCycleTheme: (next: ThemePreference) => void
}

const THEME_ORDER: ThemePreference[] = ['system', 'light', 'dark']
const THEME_LABEL: Record<ThemePreference, string> = {
  system: 'Appearance: follow system',
  light: 'Appearance: light',
  dark: 'Appearance: dark',
}

export function TodayFooter({
  history,
  lastRepairAt,
  settings,
  timer,
  onViewReport,
  onToggleSound,
  onCycleTheme,
}: TodayFooterProps) {
  const today = dayKey()
  const days = recentDayKeys(7)
  const stat = history[today]
  const focused = stat?.focusMs ?? 0
  const planned = stat?.plannedMs ?? 0
  const flows = stat?.flows ?? 0
  const done = timer.phase === 'done'

  const streak = streakInfo(history, today, lastRepairAt)
  const repairKey = streak.repairKey

  // Delight: a gentle pulse when the streak count actually grows. Derived in
  // render (StrictMode-safe), ended by a timer — reduced motion drops the
  // animation itself via the global rule.
  const [pulseTrack, setPulseTrack] = useState({ count: streak.count, pulse: false })
  if (pulseTrack.count !== streak.count) {
    setPulseTrack({ count: streak.count, pulse: streak.count > pulseTrack.count })
  }
  useEffect(() => {
    if (!pulseTrack.pulse) return
    const timer = setTimeout(() => setPulseTrack((v) => ({ ...v, pulse: false })), 800)
    return () => clearTimeout(timer)
  }, [pulseTrack.pulse])

  const minutesFor = (key: DayKey) => Math.round((history[key]?.focusMs ?? 0) / 60_000)
  const maxMinutes = Math.max(1, ...days.map(minutesFor))

  const text = done
    ? planned > 0
      ? `Day close · ${formatFocusDuration(focused)} of ${formatFocusDuration(planned)} planned`
      : `Day close · ${formatFocusDuration(focused)} focused`
    : focused === 0
      ? 'No focus logged today'
      : `Today · ${formatFocusDuration(focused)} · ${flows} flow${flows === 1 ? '' : 's'}`

  const weekLabel = days
    .map((key) => `${dayLabel(key)}: ${minutesFor(key) > 0 ? formatFocusDuration(history[key].focusMs) : 'no focus'}`)
    .join(', ')

  const cycleTheme = () => {
    const index = THEME_ORDER.indexOf(settings.theme)
    onCycleTheme(THEME_ORDER[(index + 1) % THEME_ORDER.length])
  }

  // The footer line: streak when it is standing, a quiet heal when it broke.
  const lead: ReactNode[] = []
  if (streak.alive && streak.count > 0) {
    lead.push(
      <span
        className={`today-streak${pulseTrack.pulse ? ' is-pulse' : ''}`}
        key="streak"
        title="Consecutive days with honest focus"
      >
        {streak.count} day streak
      </span>,
    )
  } else if (repairKey) {
    lead.push(
      <button
        type="button"
        className="heal-btn"
        key="heal"
        title="Mark the missed day to keep your streak — one heal per week. No focus time is added."
        onClick={() => api.command({ type: 'repair-day', key: repairKey })}
      >
        Heal missed day
      </button>,
    )
  }

  return (
    <footer className="today">
      <button
        type="button"
        className="week"
        title="Open the weekly report"
        aria-label={`Open the weekly report — focus over the last seven days — ${weekLabel}`}
        onClick={onViewReport}
      >
        {days.map((key) => {
          const minutes = minutesFor(key)
          const repaired = history[key]?.repaired === true
          const height = minutes > 0 ? Math.max(3, Math.round((minutes / maxMinutes) * 18)) : repaired ? 7 : 2
          const isToday = key === today
          const state = repaired
            ? 'healed'
            : minutes > 0
              ? formatFocusDuration(history[key].focusMs)
              : 'no focus'
          return (
            <span
              key={key}
              className={`week-day${isToday ? ' is-today' : ''}${repaired ? ' is-repaired' : minutes === 0 ? ' is-empty' : ''}`}
              title={`${dayLabel(key)} · ${state}`}
            >
              <span className="week-bar" style={{ height }} />
              <span className="week-label">{weekdayInitial(key)}</span>
            </span>
          )
        })}
      </button>

      <div className="today-row">
        <span className="today-stat" title={lead.length > 0 ? `${streak.alive ? `${streak.count} day streak · ` : ''}${text}` : text}>
          {lead.length > 0 ? (
            <>
              {lead}
              <span className="today-sep">·</span>
            </>
          ) : null}
          {text}
        </span>
        <div className="today-actions">
          <IconButton
            label={settings.soundEnabled ? 'Mute chime' : 'Unmute chime'}
            active={settings.soundEnabled}
            onClick={onToggleSound}
          >
            {settings.soundEnabled ? <SoundOnIcon /> : <SoundOffIcon />}
          </IconButton>
          <IconButton label={THEME_LABEL[settings.theme]} onClick={cycleTheme}>
            <AppearanceIcon />
          </IconButton>
        </div>
      </div>
    </footer>
  )
}
