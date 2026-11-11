import type { ChimeKind, PhaseEndKind } from '../../../shared/types'

let ctx: AudioContext | null = null

export function getAudioContext(): AudioContext {
  if (!ctx) ctx = new AudioContext()
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

/** Shared envelope: near-instant attack, exponential tail. */
function envelope(c: AudioContext, at: number, dur: number, peak: number): GainNode {
  const env = c.createGain()
  env.gain.setValueAtTime(0.0001, at)
  env.gain.linearRampToValueAtTime(peak, at + 0.012)
  env.gain.exponentialRampToValueAtTime(0.0001, at + dur)
  return env
}

/** One soft bell: sine pair through a lowpass, exponential decay. */
function bell(c: AudioContext, freq: number, at: number, dur: number, gain: number): void {
  const osc = c.createOscillator()
  osc.type = 'sine'
  osc.frequency.value = freq

  const shimmer = c.createOscillator()
  shimmer.type = 'sine'
  shimmer.frequency.value = freq * 2.004 // barely-there octave, adds warmth

  const env = envelope(c, at, dur, gain)
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

/** A dry wooden knock: pitched drop, short body, no shimmer. */
function wood(c: AudioContext, freq: number, at: number, dur: number, gain: number): void {
  const osc = c.createOscillator()
  osc.type = 'triangle'
  osc.frequency.setValueAtTime(freq * 0.9, at)
  osc.frequency.exponentialRampToValueAtTime(freq * 0.55, at + 0.06)

  const env = envelope(c, at, Math.min(dur * 0.4, 0.45), gain * 1.2)
  const bp = c.createBiquadFilter()
  bp.type = 'bandpass'
  bp.frequency.value = freq * 2.2
  bp.Q.value = 1.1

  osc.connect(env)
  env.connect(bp)
  bp.connect(c.destination)
  osc.start(at)
  osc.stop(at + dur + 0.05)
}

/** Struck glass: bright partials, slow shimmering decay. */
function glass(c: AudioContext, freq: number, at: number, dur: number, gain: number): void {
  const osc = c.createOscillator()
  osc.type = 'sine'
  osc.frequency.value = freq * 2

  const partial = c.createOscillator()
  partial.type = 'sine'
  partial.frequency.value = freq * 3.01 // inharmonic: the glassy edge

  const env = envelope(c, at, dur * 1.15, gain * 0.8)
  const hp = c.createBiquadFilter()
  hp.type = 'highpass'
  hp.frequency.value = 900

  osc.connect(env)
  partial.connect(env)
  env.connect(hp)
  hp.connect(c.destination)

  osc.start(at)
  partial.start(at)
  osc.stop(at + dur * 1.2)
  partial.stop(at + dur * 1.2)
}

/** A warm little chord, swelling rather than striking. */
function pad(c: AudioContext, freq: number, at: number, dur: number, gain: number): void {
  const lp = c.createBiquadFilter()
  lp.type = 'lowpass'
  lp.frequency.value = 1700
  const bus = c.createGain()
  bus.gain.value = 1
  lp.connect(bus)
  bus.connect(c.destination)

  const ratios = [1, 1.26, 1.5] // root, minor third, fifth
  for (const ratio of ratios) {
    const osc = c.createOscillator()
    osc.type = 'sine'
    osc.frequency.value = freq * ratio
    const env = c.createGain()
    env.gain.setValueAtTime(0.0001, at)
    env.gain.linearRampToValueAtTime(gain, at + 0.22) // slow swell, soft landing
    env.gain.exponentialRampToValueAtTime(0.0001, at + dur)
    osc.connect(env)
    env.connect(lp)
    osc.start(at)
    osc.stop(at + dur + 0.05)
  }
}

type Voice = (c: AudioContext, freq: number, at: number, dur: number, gain: number) => void

const VOICES: Record<ChimeKind, Voice> = { bell, wood, glass, pad }

/**
 * A quiet chime per transition: rising pair when focus ends, a single soft
 * note when a break ends, a warm arpeggio when the session completes.
 */
export function playChime(kind: PhaseEndKind, chime: ChimeKind = 'bell'): void {
  try {
    const c = getAudioContext()
    const voice = VOICES[chime] ?? bell
    const t = c.currentTime + 0.02
    if (kind === 'focus') {
      voice(c, 659.26, t, 1.1, 0.095)
      voice(c, 880.0, t + 0.19, 1.4, 0.08)
    } else if (kind === 'break') {
      voice(c, 523.25, t, 1.3, 0.09)
    } else {
      voice(c, 659.26, t, 1.0, 0.085)
      voice(c, 830.61, t + 0.17, 1.1, 0.075)
      voice(c, 987.77, t + 0.35, 1.7, 0.07)
    }
  } catch {
    // Audio is a garnish; never let it break the timer.
  }
}
