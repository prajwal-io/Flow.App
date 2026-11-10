import type { TimerState } from '../../../shared/types'
import { Transport } from './Transport'

interface TimerFaceProps {
  timer: TimerState
  flows: number
  clock: string
  progress: number
  large: boolean
  onToggle: () => void
  onReset: () => void
  onSkip: () => void
}

function phaseLabel(timer: TimerState, flows: number): string {
  if (timer.phase === 'done') return 'Session complete'
  // During a break `currentFlow` still points at the flow just finished; name
  // the flow that is actually up next.
  const flow = timer.phase === 'break' ? Math.min(timer.currentFlow + 1, flows) : timer.currentFlow
  const breakLabel = timer.breakKind === 'long' ? 'Long break' : 'Break'
  const base = timer.phase === 'focus' ? `Focus · Flow ${flow} of ${flows}` : `${breakLabel} · Flow ${flow} next`
  if (timer.status === 'paused') {
    return timer.pauseReason === 'away' ? `${base} · paused away` : `${base} · Paused`
  }
  return base
}

/** The instrument face: countdown, phase line, linear progress, transport. */
export function TimerFace({ timer, flows, clock, progress, large, onToggle, onReset, onSkip }: TimerFaceProps) {
  const pct = Math.round(progress * 100)

  return (
    <section className={`face${large ? ' face--large' : ''}`}>
      <div className="clock">{clock}</div>

      <div className="phase-line" aria-live="polite">
        {phaseLabel(timer, flows)}
      </div>

      <div
        className="track"
        role="progressbar"
        aria-label="Phase progress"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
      >
        <div className="fill" style={{ transform: `scaleX(${progress})` }} />
      </div>

      <Transport status={timer.status} phase={timer.phase} onToggle={onToggle} onReset={onReset} onSkip={onSkip} />
    </section>
  )
}
