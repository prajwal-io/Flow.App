import type { Phase, TimerStatus } from '../../../shared/types'
import { IconButton } from './IconButton'
import { PauseIcon, PlayIcon, ResetIcon, SkipIcon } from './Icons'

interface TransportProps {
  status: TimerStatus
  phase: Phase
  onToggle: () => void
  onReset: () => void
  onSkip: () => void
}

export function Transport({ status, phase, onToggle, onReset, onSkip }: TransportProps) {
  const playLabel =
    phase === 'done' ? 'Start a new session' : status === 'running' ? 'Pause' : status === 'paused' ? 'Resume' : 'Start focus'

  return (
    <div className="transport">
      <IconButton label="Reset session" onClick={onReset} className="transport-btn">
        <ResetIcon />
      </IconButton>
      <button type="button" className="play" aria-label={playLabel} title={playLabel} onClick={onToggle}>
        {status === 'running' ? <PauseIcon /> : <PlayIcon />}
      </button>
      <IconButton label="Skip to next phase" onClick={onSkip} className="transport-btn">
        <SkipIcon />
      </IconButton>
    </div>
  )
}
