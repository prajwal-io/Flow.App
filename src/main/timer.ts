import type { BreakKind, PauseReason, PersistedState, PhaseEndKind, SettingsPatch } from '../shared/types'
import { CHIME_KINDS, AMBIENCE_KINDS } from '../shared/types'
import { parseSites } from '../shared/blocking'
import { IDLE_PAUSE_SECONDS } from '../shared/constants'
import { dayKey } from '../shared/date'

interface StoreLike {
  get(): PersistedState
  mutate(fn: (state: PersistedState) => void): void
}

const HISTORY_KEEP_DAYS = 60
const MAX_STEPS_PER_TICK = 4

const clamp = (n: number, min: number, max: number): number => Math.min(max, Math.max(min, Math.round(n)))

/**
 * The phase state machine. Owns nothing but time: all scheduling derives from
 * `endsAt` timestamps, so the timer stays correct across minimize, reload and
 * system sleep — the tick just reconciles reality against the clock.
 */
export class TimerEngine {
  /** Fired after any change to the timer state. */
  onTransition: (() => void) | null = null
  /** Fired once per completed focus, break, or whole session. */
  onPhaseEnd: ((kind: PhaseEndKind) => void) | null = null

  /** Duration of the most recently *credited* focus (0 before the first). */
  lastFocusMs = 0

  constructor(private store: StoreLike) {}

  private focusMs(s: PersistedState): number {
    return s.settings.focusMinutes * 60_000
  }

  private longBreakMs(s: PersistedState): number {
    return s.settings.longBreakMinutes * 60_000
  }

  private breakMs(s: PersistedState): number {
    return s.timer.breakKind === 'long' ? this.longBreakMs(s) : s.settings.breakMinutes * 60_000
  }

  /** Planned duration of whichever phase is current. */
  private phaseMs(s: PersistedState): number {
    return s.timer.phase === 'break' ? this.breakMs(s) : this.focusMs(s)
  }

  start(): void {
    this.store.mutate((s) => {
      const t = s.timer
      if (t.status === 'running') return
      if (t.phase === 'done') this.resetTimer(s)
      if (s.timer.remainingMs <= 0) {
        s.timer.phaseDurationMs = this.phaseMs(s)
        s.timer.remainingMs = s.timer.phaseDurationMs
      }
      s.timer.status = 'running'
      s.timer.endsAt = Date.now() + s.timer.remainingMs
      s.timer.pauseReason = null
    })
    this.onTransition?.()
  }

  pause(reason: PauseReason = 'user'): void {
    this.store.mutate((s) => {
      const t = s.timer
      if (t.status !== 'running' || t.endsAt === null) return
      t.remainingMs = Math.max(0, t.endsAt - Date.now())
      t.status = 'paused'
      t.endsAt = null
      t.pauseReason = reason
    })
    this.onTransition?.()
  }

  /**
   * Honest-focus pause: the OS says there has been no input for `idleSeconds`.
   * Rewind the phase by that much (never past its start), so away time is not
   * counted as focus. The user resumes when they are ready; nothing nags.
   */
  pauseAway(idleSeconds: number): void {
    this.store.mutate((s) => this.pauseAwayLocked(s, idleSeconds))
    this.onTransition?.()
  }

  toggle(): void {
    if (this.store.get().timer.status === 'running') this.pause()
    else this.start()
  }

  reset(): void {
    this.store.mutate((s) => this.resetTimer(s))
    this.onTransition?.()
  }

  /**
   * Skip lands on the next phase without crediting focus time. It deliberately
   * emits no phase-end event: the user asked for this, so there is no "Focus
   * complete" notification or chime to fire.
   */
  skip(): void {
    this.store.mutate((s) => {
      if (s.timer.phase === 'done') {
        this.resetTimer(s)
        return
      }
      const wasRunning = s.timer.status === 'running'
      this.step(s, false, Date.now(), 'skip', wasRunning)
    })
    this.onTransition?.()
  }

  /** Reconcile against the wall clock; completes any phase whose deadline passed. */
  tick(idleSeconds = 0): void {
    // Most ticks have nothing to do. Bail before touching the store, otherwise
    // this 250 ms heartbeat would keep resetting the persistence debounce.
    const current = this.store.get().timer
    if (current.status !== 'running' || current.endsAt === null || Date.now() < current.endsAt) return

    let event: PhaseEndKind | null = null
    let changed = false
    this.store.mutate((s) => {
      const t = s.timer
      let guard = 0
      while (t.status === 'running' && t.endsAt !== null && Date.now() >= t.endsAt && guard++ < MAX_STEPS_PER_TICK) {
        // A focus phase that comes due while the user has been away for the
        // whole idle threshold is not focus. Return the away time and pause
        // instead of crediting phantom minutes. Auto-start cannot outrun this.
        if (t.phase === 'focus' && idleSeconds >= IDLE_PAUSE_SECONDS) {
          this.pauseAwayLocked(s, idleSeconds)
          changed = true
          break
        }

        const base = t.endsAt
        const kind = this.step(s, true, base, 'complete', true)
        changed = true
        if (kind === null) break
        event = kind
        if (kind === 'session') break
      }
    })
    if (changed) {
      if (event) this.onPhaseEnd?.(event)
      this.onTransition?.()
    }
  }

  /** Applies a settings patch and keeps the live timer consistent with it. */
  applySettings(patch: SettingsPatch): void {
    this.store.mutate((s) => {
      let timingsChanged = false

      if (patch.flows !== undefined) {
        s.settings.flows = clamp(patch.flows, 1, 12)
        s.timer.currentFlow = Math.min(s.timer.currentFlow, s.settings.flows)
        s.timer.completedFlows = Math.min(s.timer.completedFlows, s.settings.flows)
        if (s.timer.completedFlows >= s.settings.flows) {
          // The plan shrank to what has already been completed: finish it.
          if (s.timer.phase !== 'done') this.finish(s, false)
        } else if (s.timer.phase === 'done') {
          // More flows were added after the plan finished: reopen as focus of the next flow.
          s.timer.phase = 'focus'
          s.timer.status = 'idle'
          s.timer.currentFlow = Math.min(s.timer.completedFlows + 1, s.settings.flows)
          s.timer.breakKind = 'short'
          s.timer.pauseReason = null
          s.timer.phaseDurationMs = this.focusMs(s)
          s.timer.remainingMs = s.timer.phaseDurationMs
          s.timer.endsAt = null
        }
      }
      if (patch.focusMinutes !== undefined) {
        s.settings.focusMinutes = clamp(patch.focusMinutes, 1, 60)
        timingsChanged = true
      }
      if (patch.breakMinutes !== undefined) {
        s.settings.breakMinutes = clamp(patch.breakMinutes, 1, 30)
        timingsChanged = true
      }
      if (patch.longBreakMinutes !== undefined) {
        s.settings.longBreakMinutes = clamp(patch.longBreakMinutes, 1, 60)
        timingsChanged = true
      }
      if (patch.longBreakEvery !== undefined) {
        s.settings.longBreakEvery = clamp(patch.longBreakEvery, 1, 12)
      }
      if (patch.autoStartBreaks !== undefined) s.settings.autoStartBreaks = Boolean(patch.autoStartBreaks)
      if (patch.autoStartFocus !== undefined) s.settings.autoStartFocus = Boolean(patch.autoStartFocus)
      if (patch.pauseWhenIdle !== undefined) s.settings.pauseWhenIdle = Boolean(patch.pauseWhenIdle)
      if (patch.blockDuringFocus !== undefined) s.settings.blockDuringFocus = Boolean(patch.blockDuringFocus)
      if (patch.blockedSites !== undefined) s.settings.blockedSites = parseSites(patch.blockedSites)
      if (patch.soundEnabled !== undefined) s.settings.soundEnabled = Boolean(patch.soundEnabled)
      if (patch.chime !== undefined && CHIME_KINDS.includes(patch.chime)) s.settings.chime = patch.chime
      if (patch.ambience !== undefined && AMBIENCE_KINDS.includes(patch.ambience)) s.settings.ambience = patch.ambience
      if (patch.theme !== undefined) s.settings.theme = patch.theme
      if (patch.launchAtLogin !== undefined) s.settings.launchAtLogin = Boolean(patch.launchAtLogin)
      if (patch.pauseOnLock !== undefined) s.settings.pauseOnLock = Boolean(patch.pauseOnLock)
      if (patch.globalShortcutEnabled !== undefined) {
        s.settings.globalShortcutEnabled = Boolean(patch.globalShortcutEnabled)
      }

      if (timingsChanged && s.timer.status === 'idle' && s.timer.phase !== 'done') {
        s.timer.phaseDurationMs = this.phaseMs(s)
        s.timer.remainingMs = s.timer.phaseDurationMs
      }
    })
    this.onTransition?.()
  }

  private pauseAwayLocked(s: PersistedState, idleSeconds: number): void {
    const t = s.timer
    if (t.status !== 'running' || t.endsAt === null) return
    const remaining = Math.max(0, t.endsAt - Date.now())
    const elapsed = Math.max(0, t.phaseDurationMs - remaining)
    const awayMs = Math.min(Math.max(0, idleSeconds) * 1000, elapsed)
    t.remainingMs = Math.min(t.phaseDurationMs, remaining + awayMs)
    t.status = 'paused'
    t.endsAt = null
    t.pauseReason = 'away'
  }

  private resetTimer(s: PersistedState): void {
    s.timer.phase = 'focus'
    s.timer.status = 'idle'
    s.timer.currentFlow = 1
    s.timer.completedFlows = 0
    s.timer.breakKind = 'short'
    s.timer.endsAt = null
    s.timer.phaseDurationMs = this.focusMs(s)
    s.timer.remainingMs = s.timer.phaseDurationMs
    s.timer.pauseReason = null
  }

  private finish(s: PersistedState, recordPlan: boolean): void {
    if (recordPlan) this.recordPlan(s)
    const t = s.timer
    t.phase = 'done'
    t.status = 'idle'
    t.remainingMs = 0
    t.endsAt = null
    t.phaseDurationMs = 0
    t.breakKind = 'short'
    t.pauseReason = null
  }

  /**
   * One phase transition. `base` is the epoch the next phase is scheduled from:
   * the previous deadline when time elapsed (drift-free cadence), or now on skip.
   * If the next phase's deadline is also already in the past — the machine slept
   * through it — the session parks at the start of that phase instead of
   * fast-forwarding phantom flows.
   */
  private step(
    s: PersistedState,
    credit: boolean,
    base: number,
    mode: 'complete' | 'skip',
    wasRunning: boolean,
  ): PhaseEndKind | null {
    const t = s.timer

    if (t.phase === 'focus') {
      if (credit) this.creditFocus(s)
      t.completedFlows = t.currentFlow

      if (t.currentFlow >= s.settings.flows) {
        this.finish(s, true)
        return 'session'
      }

      t.phase = 'break'
      t.breakKind = this.nextBreakKind(s, t.completedFlows)
      this.enterPhase(s, base, mode, wasRunning, s.settings.autoStartBreaks)
      return 'focus'
    }

    if (t.phase === 'break') {
      t.currentFlow = Math.min(t.currentFlow + 1, s.settings.flows)
      t.phase = 'focus'
      t.breakKind = 'short'
      this.enterPhase(s, base, mode, wasRunning, s.settings.autoStartFocus)
      return 'break'
    }

    return null
  }

  private enterPhase(
    s: PersistedState,
    base: number,
    mode: 'complete' | 'skip',
    wasRunning: boolean,
    autoStart: boolean,
  ): void {
    const t = s.timer
    t.phaseDurationMs = this.phaseMs(s)
    t.remainingMs = t.phaseDurationMs
    t.pauseReason = null

    // Natural completion follows the two auto-start preferences. A manual skip
    // only keeps the cadence alive if the timer was already running; skipping
    // from idle or paused lands on the next phase, ready but stopped.
    const shouldRun = mode === 'complete' ? autoStart : wasRunning && autoStart
    if (!shouldRun) {
      t.status = 'idle'
      t.endsAt = null
      return
    }

    t.status = 'running'
    t.endsAt = base + t.phaseDurationMs
    this.parkIfOverdue(t, Date.now())
  }

  private parkIfOverdue(t: PersistedState['timer'], now: number): void {
    if (t.endsAt !== null && t.endsAt <= now) {
      t.status = 'paused'
      t.endsAt = null
      t.pauseReason = 'away'
    }
  }

  private nextBreakKind(s: PersistedState, completedFlows: number): BreakKind {
    const every = clamp(s.settings.longBreakEvery, 1, 12)
    return completedFlows > 0 && completedFlows % every === 0 ? 'long' : 'short'
  }

  private statFor(s: PersistedState) {
    const key = dayKey()
    const existing = s.history[key]
    if (existing) return existing
    const created = { focusMs: 0, flows: 0, plannedMs: 0, longestFlowMs: 0, blockedMs: 0, repaired: false }
    s.history[key] = created
    return created
  }

  private creditFocus(s: PersistedState): void {
    const stat = this.statFor(s)
    // Credit the phase that actually ran, not a duration changed mid-phase.
    const credited = s.timer.phaseDurationMs > 0 ? s.timer.phaseDurationMs : this.focusMs(s)
    stat.focusMs += credited
    stat.longestFlowMs = Math.max(stat.longestFlowMs, credited)
    stat.flows += 1
    // Honest block stat: only counts when a real blocklist was in play.
    if (s.settings.blockDuringFocus && s.settings.blockedSites.length > 0) stat.blockedMs += credited
    // Remembered for the phase-end notification: at that point the timer has
    // already moved on and `phaseDurationMs` belongs to the break.
    this.lastFocusMs = credited
    this.pruneHistory(s)
  }

  /** A finished plan contributes its intended focus time to the day's tally. */
  private recordPlan(s: PersistedState): void {
    const stat = this.statFor(s)
    stat.plannedMs += s.settings.flows * this.focusMs(s)
    this.pruneHistory(s)
  }

  private pruneHistory(s: PersistedState): void {
    const keys = Object.keys(s.history)
    if (keys.length <= HISTORY_KEEP_DAYS) return
    keys.sort()
    for (const key of keys.slice(0, keys.length - HISTORY_KEEP_DAYS)) delete s.history[key]
  }
}
