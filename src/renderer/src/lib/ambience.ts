import type { AmbienceKind } from '../../../shared/types'
import { getAudioContext } from './sound'

/**
 * Focus ambience: synthesized locally through WebAudio — no files, no network.
 * Plays only while a focus phase is actually running (never during breaks or
 * away pauses), so the sound itself marks honest focus.
 */

interface Voice {
  stop(when: number): void
}

let currentKind: AmbienceKind = 'off'
let active: Voice | null = null

let noiseBuffer: AudioBuffer | null = null

/** Two seconds of white noise, generated once and looped. */
function getNoise(c: AudioContext): AudioBuffer {
  if (!noiseBuffer) {
    const len = c.sampleRate * 2
    noiseBuffer = c.createBuffer(2, len, c.sampleRate)
    for (let ch = 0; ch < 2; ch += 1) {
      const data = noiseBuffer.getChannelData(ch)
      for (let i = 0; i < len; i += 1) data[i] = Math.random() * 2 - 1
    }
  }
  return noiseBuffer
}

function noiseSource(c: AudioContext): AudioBufferSourceNode {
  const src = c.createBufferSource()
  src.buffer = getNoise(c)
  src.loop = true
  return src
}

/** Soft glassy clinks at random intervals: the café murmur's little punctuation. */
function scheduleClinks(c: AudioContext, bus: AudioNode): { stop(): void } {
  let timer: ReturnType<typeof setTimeout> | null = null
  let stopped = false

  const ping = (): void => {
    if (stopped) return
    const at = c.currentTime + 0.05
    const osc = c.createOscillator()
    osc.type = 'sine'
    osc.frequency.value = 1800 + Math.random() * 1600
    const env = c.createGain()
    env.gain.setValueAtTime(0.0001, at)
    env.gain.linearRampToValueAtTime(0.014, at + 0.008)
    env.gain.exponentialRampToValueAtTime(0.0001, at + 0.22)
    osc.connect(env)
    env.connect(bus)
    osc.start(at)
    osc.stop(at + 0.3)
    timer = setTimeout(ping, 5000 + Math.random() * 11000)
  }
  timer = setTimeout(ping, 3500 + Math.random() * 6000)

  return {
    stop() {
      stopped = true
      if (timer) clearTimeout(timer)
    },
  }
}

function start(c: AudioContext, kind: Exclude<AmbienceKind, 'off'>): Voice {
  const src = noiseSource(c)
  const master = c.createGain()
  master.gain.setValueAtTime(0.0001, c.currentTime)
  master.connect(c.destination)

  const extras: { stop(when: number): void }[] = []

  if (kind === 'rain') {
    // Shaped hiss with a slow patter shimmer: steady, never dramatic.
    const hp = c.createBiquadFilter()
    hp.type = 'highpass'
    hp.frequency.value = 420
    const lp = c.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 5400
    const shimmer = c.createGain()
    shimmer.gain.value = 0.85
    const lfo = c.createOscillator()
    lfo.type = 'sine'
    lfo.frequency.value = 0.23
    const lfoDepth = c.createGain()
    lfoDepth.gain.value = 0.15
    lfo.connect(lfoDepth)
    lfoDepth.connect(shimmer.gain)
    src.connect(hp)
    hp.connect(lp)
    lp.connect(shimmer)
    shimmer.connect(master)
    src.start()
    lfo.start()
    extras.push({
      stop(when) {
        lfo.stop(when)
      },
    })
    master.gain.linearRampToValueAtTime(0.16, c.currentTime + 0.9)
  } else if (kind === 'brown') {
    // Deep filtered rumble: the classic brown noise hush.
    const lp = c.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 420
    const lift = c.createBiquadFilter()
    lift.type = 'lowshelf'
    lift.frequency.value = 200
    lift.gain.value = 7
    src.connect(lp)
    lp.connect(lift)
    lift.connect(master)
    src.start()
    master.gain.linearRampToValueAtTime(0.34, c.currentTime + 0.9)
  } else {
    // Café: brown murmur with a slow breath and the occasional cup.
    const lp = c.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 900
    const swell = c.createGain()
    swell.gain.value = 0.9
    const lfo = c.createOscillator()
    lfo.type = 'sine'
    lfo.frequency.value = 0.07
    const lfoDepth = c.createGain()
    lfoDepth.gain.value = 0.1
    lfo.connect(lfoDepth)
    lfoDepth.connect(swell.gain)
    src.connect(lp)
    lp.connect(swell)
    swell.connect(master)
    src.start()
    lfo.start()
    extras.push({
      stop(when) {
        lfo.stop(when)
      },
    })
    extras.push(scheduleClinks(c, master))
    master.gain.linearRampToValueAtTime(0.2, c.currentTime + 0.9)
  }

  return {
    stop(when) {
      for (const extra of extras) extra.stop(when)
      // Fade first, then cut: the room simply settles, never clicks off.
      master.gain.cancelScheduledValues(when)
      master.gain.setValueAtTime(master.gain.value, when)
      master.gain.linearRampToValueAtTime(0.0001, when + 0.5)
      try {
        src.stop(when + 0.55)
      } catch {
        // Already stopped.
      }
    },
  }
}

/**
 * Transitions the ambience to `kind`. Repeated calls with the same kind are
 * no-ops, so React re-renders never restart a playing room.
 */
export function setAmbience(kind: AmbienceKind): void {
  if (kind === currentKind) return
  const previous = active
  const prevKind = currentKind
  currentKind = kind
  active = null

  try {
    if (previous) {
      const c = getAudioContext()
      previous.stop(c.currentTime)
    }
    if (kind !== 'off') {
      const c = getAudioContext()
      active = start(c, kind)
    }
  } catch {
    // Silence is an acceptable fallback; the timer is what matters.
    currentKind = prevKind
    active = previous
  }
}
