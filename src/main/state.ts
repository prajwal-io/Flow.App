import { app } from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import type { BreakKind, DayKey, PersistedState, Settings, Task, TimerState } from '../shared/types'

export const DEFAULT_SETTINGS: Settings = {
  flows: 4,
  focusMinutes: 25,
  breakMinutes: 5,
  longBreakMinutes: 15,
  longBreakEvery: 3,
  autoStartBreaks: true,
  autoStartFocus: true,
  pauseWhenIdle: true,
  soundEnabled: true,
  alwaysOnTop: false,
  launchAtLogin: false,
  pauseOnLock: false,
  globalShortcutEnabled: true,
  theme: 'system',
}

export const DEFAULT_TIMER: TimerState = {
  phase: 'focus',
  status: 'idle',
  currentFlow: 1,
  completedFlows: 0,
  breakKind: 'short',
  endsAt: null,
  remainingMs: DEFAULT_SETTINGS.focusMinutes * 60_000,
  phaseDurationMs: DEFAULT_SETTINGS.focusMinutes * 60_000,
  pauseReason: null,
}

export function defaultState(): PersistedState {
  return {
    version: 1,
    settings: { ...DEFAULT_SETTINGS },
    tasks: [],
    timer: { ...DEFAULT_TIMER },
    history: {},
    windowPosition: null,
  }
}

const clamp = (n: unknown, min: number, max: number, fallback: number): number =>
  typeof n === 'number' && Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n))) : fallback

/** Merges persisted data onto defaults, discarding anything malformed. */
export function normalizeState(raw: unknown): PersistedState {
  const base = defaultState()
  if (typeof raw !== 'object' || raw === null) return base
  const input = raw as Partial<PersistedState>

  const s = (typeof input.settings === 'object' && input.settings !== null ? input.settings : {}) as Partial<Settings>
  const settings: Settings = {
    flows: clamp(s.flows, 1, 12, base.settings.flows),
    focusMinutes: clamp(s.focusMinutes, 1, 60, base.settings.focusMinutes),
    breakMinutes: clamp(s.breakMinutes, 1, 30, base.settings.breakMinutes),
    longBreakMinutes: clamp(s.longBreakMinutes, 1, 60, base.settings.longBreakMinutes),
    longBreakEvery: clamp(s.longBreakEvery, 1, 12, base.settings.longBreakEvery),
    autoStartBreaks: typeof s.autoStartBreaks === 'boolean' ? s.autoStartBreaks : base.settings.autoStartBreaks,
    autoStartFocus: typeof s.autoStartFocus === 'boolean' ? s.autoStartFocus : base.settings.autoStartFocus,
    pauseWhenIdle: typeof s.pauseWhenIdle === 'boolean' ? s.pauseWhenIdle : base.settings.pauseWhenIdle,
    soundEnabled: typeof s.soundEnabled === 'boolean' ? s.soundEnabled : base.settings.soundEnabled,
    alwaysOnTop: typeof s.alwaysOnTop === 'boolean' ? s.alwaysOnTop : base.settings.alwaysOnTop,
    launchAtLogin: typeof s.launchAtLogin === 'boolean' ? s.launchAtLogin : base.settings.launchAtLogin,
    pauseOnLock: typeof s.pauseOnLock === 'boolean' ? s.pauseOnLock : base.settings.pauseOnLock,
    globalShortcutEnabled:
      typeof s.globalShortcutEnabled === 'boolean' ? s.globalShortcutEnabled : base.settings.globalShortcutEnabled,
    theme: s.theme === 'light' || s.theme === 'dark' || s.theme === 'system' ? s.theme : base.settings.theme,
  }

  const tasks: Task[] = Array.isArray(input.tasks)
    ? input.tasks
        .filter((t): t is Task => typeof t === 'object' && t !== null && typeof t.text === 'string' && t.text.trim().length > 0)
        .map((t) => ({
          id: typeof t.id === 'string' && t.id ? t.id : cryptoRandomId(),
          text: t.text.trim().slice(0, 120),
          flow:
            typeof t.flow === 'number' && Number.isFinite(t.flow)
              ? Math.min(settings.flows, Math.max(1, Math.round(t.flow)))
              : 'all',
          estimate: clamp(t.estimate, 0, 12, 0),
          completed: Boolean(t.completed),
        }))
    : []

  const t = (typeof input.timer === 'object' && input.timer !== null ? input.timer : {}) as Partial<TimerState>
  const focusMs = settings.focusMinutes * 60_000
  const breakMs = settings.breakMinutes * 60_000
  const longBreakMs = settings.longBreakMinutes * 60_000
  const phase: TimerState['phase'] =
    t.phase === 'focus' || t.phase === 'break' || t.phase === 'done' ? t.phase : base.timer.phase
  const status: TimerState['status'] =
    t.status === 'running' || t.status === 'paused' || t.status === 'idle' ? t.status : base.timer.status
  const breakKind: BreakKind = t.breakKind === 'long' ? 'long' : 'short'
  const fallbackDuration = phase === 'break' ? (breakKind === 'long' ? longBreakMs : breakMs) : phase === 'focus' ? focusMs : 0
  // Durations are capped by what the phase could legitimately have been when it
  // started, not by the settings the user may have changed since.
  const phaseDurationMs =
    phase === 'done'
      ? 0
      : clamp(t.phaseDurationMs, 60_000, phase === 'break' ? (breakKind === 'long' ? 60 : 30) * 60_000 : 60 * 60_000, fallbackDuration)
  const timer: TimerState = {
    phase,
    status,
    currentFlow: clamp(t.currentFlow, 1, settings.flows, 1),
    completedFlows: clamp(t.completedFlows, 0, settings.flows, 0),
    breakKind,
    endsAt: typeof t.endsAt === 'number' && Number.isFinite(t.endsAt) && t.endsAt > 0 ? t.endsAt : null,
    remainingMs:
      typeof t.remainingMs === 'number' && Number.isFinite(t.remainingMs) && t.remainingMs >= 0
        ? Math.min(t.remainingMs, Math.max(phaseDurationMs, focusMs, breakMs, longBreakMs))
        : fallbackDuration,
    phaseDurationMs,
    pauseReason: null,
  }
  if (timer.status === 'paused') {
    // Paused states from older versions had no reason; they were user pauses.
    timer.pauseReason = t.pauseReason === 'away' ? 'away' : 'user'
  }
  if (timer.status !== 'running') timer.endsAt = null
  // A running timer without a deadline can neither pause nor advance; park it.
  if (timer.status === 'running' && timer.endsAt === null) {
    timer.status = 'paused'
    timer.pauseReason = 'user'
  }
  if (timer.phase === 'done') {
    timer.status = 'idle'
    timer.remainingMs = 0
    timer.phaseDurationMs = 0
    timer.breakKind = 'short'
    timer.pauseReason = null
  }

  const history: PersistedState['history'] = {}
  if (typeof input.history === 'object' && input.history !== null) {
    for (const [key, value] of Object.entries(input.history)) {
      if (/^\d{4}-\d{2}-\d{2}$/.test(key) && typeof value === 'object' && value !== null) {
        const v = value as { focusMs?: unknown; flows?: unknown; plannedMs?: unknown }
        history[key as DayKey] = {
          focusMs: clamp(v.focusMs, 0, 24 * 60 * 60 * 1000, 0),
          flows: clamp(v.flows, 0, 99, 0),
          plannedMs: clamp(v.plannedMs, 0, 24 * 60 * 60 * 1000, 0),
        }
      }
    }
  }

  let windowPosition: PersistedState['windowPosition'] = null
  if (typeof input.windowPosition === 'object' && input.windowPosition !== null) {
    const p = input.windowPosition as { x?: unknown; y?: unknown }
    if (typeof p.x === 'number' && Number.isFinite(p.x) && typeof p.y === 'number' && Number.isFinite(p.y)) {
      windowPosition = { x: Math.round(p.x), y: Math.round(p.y) }
    }
  }

  const version: PersistedState['version'] = 1
  return { version, settings, tasks, timer, history, windowPosition }
}

export function cryptoRandomId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)
}

/** Local JSON persistence with debounced, atomic writes. */
export class Store {
  private file: string
  private data: PersistedState
  private saveTimer: NodeJS.Timeout | null = null

  constructor() {
    this.file = path.join(app.getPath('userData'), 'flow-state.json')
    this.data = this.load()
  }

  get(): PersistedState {
    return this.data
  }

  mutate(fn: (state: PersistedState) => void): void {
    fn(this.data)
    this.scheduleSave()
  }

  /**
   * Replaces local data with an imported backup. The current window position is
   * kept: a backup should not teleport the mini-player to another monitor.
   */
  importState(next: PersistedState): void {
    this.data = { ...next, windowPosition: this.data.windowPosition }
    this.flush()
  }

  private load(): PersistedState {
    try {
      // Editors on Windows sometimes prepend a UTF-8 BOM; tolerate it rather
      // than treating a hand-edited file as corrupt and resetting everything.
      const raw = fs.readFileSync(this.file, 'utf8').replace(/^\uFEFF/, '')
      return normalizeState(JSON.parse(raw))
    } catch {
      return defaultState()
    }
  }

  private scheduleSave(): void {
    // Coalesce bursts without letting sustained activity postpone the write
    // forever: the first change starts the clock, later changes join it.
    if (this.saveTimer) return
    this.saveTimer = setTimeout(() => {
      this.saveTimer = null
      this.write()
    }, 400)
  }

  /** Atomic write: temp file first, then rename over the original. */
  private write(): void {
    try {
      const tmp = `${this.file}.tmp`
      fs.writeFileSync(tmp, JSON.stringify(this.data), 'utf8')
      fs.renameSync(tmp, this.file)
    } catch (err) {
      console.error('[flow] failed to persist state:', err)
    }
  }

  flush(): void {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer)
      this.saveTimer = null
    }
    this.write()
  }
}
