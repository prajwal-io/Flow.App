import type { DayKey, DayStat, Settings, ThemePreference, TimerState } from '../../../shared/types'
import { dayKey, dayLabel, recentDayKeys, weekdayInitial } from '../../../shared/date'
import { formatFocusDuration } from '../lib/format'
import { IconButton } from './IconButton'
import { AppearanceIcon, SoundOffIcon, SoundOnIcon } from './Icons'

interface TodayFooterProps {
  history: Record<DayKey, DayStat>
  settings: Settings
  timer: TimerState
  onToggleSound: () => void
  onCycleTheme: (next: ThemePreference) => void
}

const THEME_ORDER: ThemePreference[] = ['system', 'light', 'dark']
const THEME_LABEL: Record<ThemePreference, string> = {
  system: 'Appearance: follow system',
  light: 'Appearance: light',
  dark: 'Appearance: dark',
}

export function TodayFooter({ history, settings, timer, onToggleSound, onCycleTheme }: TodayFooterProps) {
  const today = dayKey()
  const days = recentDayKeys(7)
  const stat = history[today]
  const focused = stat?.focusMs ?? 0
  const planned = stat?.plannedMs ?? 0
  const flows = stat?.flows ?? 0
  const done = timer.phase === 'done'

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

  return (
    <footer className="today">
      <div className="week" role="img" aria-label={`Focus over the last seven days — ${weekLabel}`}>
        {days.map((key) => {
          const minutes = minutesFor(key)
          const height = minutes > 0 ? Math.max(3, Math.round((minutes / maxMinutes) * 18)) : 2
          const isToday = key === today
          return (
            <span
              key={key}
              className={`week-day${isToday ? ' is-today' : ''}${minutes === 0 ? ' is-empty' : ''}`}
              title={`${dayLabel(key)} · ${minutes > 0 ? formatFocusDuration(history[key].focusMs) : 'no focus'}`}
            >
              <span className="week-bar" style={{ height }} />
              <span className="week-label">{weekdayInitial(key)}</span>
            </span>
          )
        })}
      </div>

      <div className="today-row">
        <span className="today-stat" title={text}>
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
