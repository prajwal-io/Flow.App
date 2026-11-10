import type { Phase } from '../../../shared/types'

interface BeadsProps {
  flows: number
  current: number
  done: number
  phase: Phase
}

/**
 * Session progress as a row of beads: solid once a flow is finished, a ring on
 * the flow in play, faint ahead. The mini-player's quiet progress signature.
 */
export function Beads({ flows, current, done, phase }: BeadsProps) {
  const label =
    phase === 'done'
      ? `All ${flows} flows completed`
      : `Flow ${current} of ${flows}, ${done} completed`

  return (
    <div className="beads" role="img" aria-label={label} title={label}>
      {Array.from({ length: flows }, (_, i) => {
        const n = i + 1
        const kind = n <= done ? 'done' : n === current ? 'current' : 'ahead'
        return <span key={n} className={`bead bead--${kind}`} />
      })}
    </div>
  )
}
