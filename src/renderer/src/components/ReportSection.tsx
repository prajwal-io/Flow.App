import type { AppState, DayKey } from '../../../shared/types'
import { dayKey, dayLabel, recentDayKeys } from '../../../shared/date'
import { streakInfo } from '../../../shared/streak'
import { formatFocusDuration } from '../lib/format'

interface ReportSectionProps {
  state: AppState
}

/**
 * The weekly honest report: last seven days of what actually happened,
 * computed locally from history. Nothing leaves the machine.
 */
export function ReportSection({ state }: ReportSectionProps) {
  const days = recentDayKeys(7)
  const today = dayKey()

  let focused = 0
  let planned = 0
  let blocked = 0
  let daysFocused = 0
  let longest = 0
  let bestKey: DayKey | null = null
  for (const key of days) {
    const stat = state.history[key]
    if (!stat) continue
    focused += stat.focusMs
    planned += stat.plannedMs
    blocked += stat.blockedMs
    if (stat.focusMs > 0) daysFocused += 1
    longest = Math.max(longest, stat.longestFlowMs)
    if (stat.focusMs > 0 && (bestKey === null || stat.focusMs > (state.history[bestKey]?.focusMs ?? 0))) bestKey = key
  }

  const streak = streakInfo(state.history, today, state.lastRepairAt)
  const hasData = focused > 0 || days.some((key) => state.history[key]?.repaired === true)

  // Two hairline bars, one scale: planned behind, focus in front of the same ruler.
  const scale = Math.max(focused, planned, 1)
  const focusWidth = Math.round((focused / scale) * 100)
  const plannedWidth = Math.round((planned / scale) * 100)

  const streakValue = streak.alive ? `${streak.count} day${streak.count === 1 ? '' : 's'}` : '—'

  return (
    <section className="section report">
      <h2 className="section-label">Report · last 7 days</h2>

      {!hasData ? (
        <p className="report-empty">No focus logged in the last seven days.</p>
      ) : (
        <>
          <div className="report-bars" aria-hidden="true">
            <div className="report-bar-row">
              <span className="report-bar-name">Focused</span>
              <span className="report-bar-track">
                <span className="report-bar report-bar--focus" style={{ width: `${focusWidth}%` }} />
              </span>
              <span className="report-bar-value">{focused > 0 ? formatFocusDuration(focused) : '—'}</span>
            </div>
            <div className="report-bar-row">
              <span className="report-bar-name">Planned</span>
              <span className="report-bar-track">
                <span className="report-bar report-bar--planned" style={{ width: `${plannedWidth}%` }} />
              </span>
              <span className="report-bar-value">{planned > 0 ? formatFocusDuration(planned) : '—'}</span>
            </div>
          </div>

          <div className="report-rows">
            <div className="report-row">
              <span className="report-row-label">Best day</span>
              <span className="report-row-value">
                {bestKey ? `${dayLabel(bestKey)} · ${formatFocusDuration(state.history[bestKey].focusMs)}` : '—'}
              </span>
            </div>
            <div className="report-row">
              <span className="report-row-label">Longest flow</span>
              <span className="report-row-value">{longest > 0 ? formatFocusDuration(longest) : '—'}</span>
            </div>
            <div className="report-row">
              <span className="report-row-label">Days focused</span>
              <span className="report-row-value">
                {daysFocused} of 7
              </span>
            </div>
            {blocked > 0 && (
              <div className="report-row">
                <span className="report-row-label" title="Focus time with site blocking active">
                  Blocked
                </span>
                <span className="report-row-value">{formatFocusDuration(blocked)}</span>
              </div>
            )}
            <div className="report-row">
              <span className="report-row-label" title="Consecutive days with honest focus">
                Streak
              </span>
              <span className={`report-row-value${streak.alive ? ' is-accent' : ''}`}>{streakValue}</span>
            </div>
          </div>
        </>
      )}

      <p className="report-note">All figures stay on this machine.</p>
    </section>
  )
}
