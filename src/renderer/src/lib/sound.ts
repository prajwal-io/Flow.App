import type { PhaseEndKind } from '../../../shared/types'

let ctx: AudioContext | null = null

function getCtx(): AudioContext {
  if (!ctx) ctx = new AudioContext()
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

/** One soft bell: sine pair through a lowpass, exponential decay. */
function bell(c: AudioContext, freq: number, at: number, dur: number, gain: number): void {
  const osc = c.createOscillator()
  osc.type = 'sine'
  osc.frequency.value = freq

  const shimmer = c.createOscillator()
  shimmer.type = 'sine'
  shimmer.frequency.value = freq * 2.004 // barely-there octave, adds warmth

  const env = c.createGain()
  env.gain.setValueAtTime(0.0001, at)
  env.gain.linearRampToValueAtTime(gain, at + 0.01)
  env.gain.exponentialRampToValueAtTime(0.0001, at + dur)

  const lp = c.createBiquadFilter()
  lp.type = 'lowpass'
  lp.frequency.value = 2400

  osc.connect(env)
  shimmer.connect(env)
  env.connect(lp)
  lp.connect(c.destination)

  osc.start(at)
  shimmer.start(at)
  osc.stop(at + dur + 0.05)
  shimmer.stop(at + dur + 0.05)
}

/**
 * A quiet chime per transition: rising pair when focus ends, a single soft
 * note when a break ends, a warm arpeggio when the session completes.
 */
export function playChime(kind: PhaseEndKind): void {
  try {
    const c = getCtx()
    const t = c.currentTime + 0.02
    if (kind === 'focus') {
      bell(c, 659.26, t, 1.1, 0.095)
      bell(c, 880.0, t + 0.19, 1.4, 0.08)
    } else if (kind === 'break') {
      bell(c, 523.25, t, 1.3, 0.09)
    } else {
      bell(c, 659.26, t, 1.0, 0.085)
      bell(c, 830.61, t + 0.17, 1.1, 0.075)
      bell(c, 987.77, t + 0.35, 1.7, 0.07)
    }
  } catch {
    // Audio is a garnish; never let it break the timer.
  }
}
