export type Phase = 'focus' | 'break' | 'done'
export type TimerStatus = 'idle' | 'running' | 'paused'
export type ThemePreference = 'light' | 'dark' | 'system'
export type WindowMode = 'compact' | 'expanded'
export type BreakKind = 'short' | 'long'
/** Why a paused timer stopped: the user, or time away from the machine. */
export type PauseReason = 'user' | 'away'

export interface Settings {
  /** Number of focus sessions ("flows") in one plan. 1–12. */
  flows: number
  /** Focus duration in minutes. 1–60. */
  focusMinutes: number
  /** Short break duration in minutes. 1–30. */
  breakMinutes: number
  /** Long break duration in minutes. 1–60. */
  longBreakMinutes: number
  /** Take a long break after this many completed flows. 1–12. */
  longBreakEvery: number
  /** Start a break automatically when a focus phase ends. */
  autoStartBreaks: boolean
  /** Start the next focus automatically when a break ends. */
  autoStartFocus: boolean
  /** Pause a running focus after a stretch of system-wide inactivity. */
  pauseWhenIdle: boolean
  /** Play the soft chime when a phase ends. */
  soundEnabled: boolean
  /** Keep the mini-player above other windows. */
  alwaysOnTop: boolean
  /** Start Flow hidden in the tray when the user signs in. */
  launchAtLogin: boolean
  /** Pause a running timer when the screen locks or the system sleeps. */
  pauseOnLock: boolean
  /** Register the fixed global shortcut. */
  globalShortcutEnabled: boolean
  theme: ThemePreference
}

/** Settings the renderer may change; the pin preference has its own command. */
export type SettingsPatch = Partial<Omit<Settings, 'alwaysOnTop'>>

/** Top-left of the mini-player, remembered across launches. */
export interface WindowPosition {
  x: number
  y: number
}

export interface Task {
  id: string
  text: string
  /** A specific flow (1-based) or the whole plan. */
  flow: number | 'all'
  /** Estimated flows for this task; 0 means unestimated. */
  estimate: number
  completed: boolean
}

export interface TimerState {
  phase: Phase
  status: TimerStatus
  /** 1-based flow currently in play. */
  currentFlow: number
  /** Flows finished so far in this plan (progress beads). */
  completedFlows: number
  /** Which kind of break the current break is; short outside a break. */
  breakKind: BreakKind
  /** Epoch ms when the running phase ends; null unless running. */
  endsAt: number | null
  /** Remaining time of the current phase when not running. */
  remainingMs: number
  /**
   * Full planned duration of the current phase. Kept stable for the life of the
   * phase, so editing a duration setting mid-phase cannot skew progress or the
   * focus time credited to the daily history.
   */
  phaseDurationMs: number
  /** Set while paused; cleared whenever the timer runs. */
  pauseReason: PauseReason | null
}

/** `YYYY-MM-DD` in local time. */
export type DayKey = string

export interface DayStat {
  /** Focused milliseconds credited to this day. */
  focusMs: number
  /** Focus phases completed (not skipped) this day. */
  flows: number
  /** Focus time planned by sessions completed this day. */
  plannedMs: number
}

export interface PersistedState {
  version: 1
  settings: Settings
  tasks: Task[]
  timer: TimerState
  history: Record<DayKey, DayStat>
  /** Last user-placed window position; null until the window is moved. */
  windowPosition: WindowPosition | null
}

export interface AppState {
  settings: Settings
  tasks: Task[]
  timer: TimerState
  history: Record<DayKey, DayStat>
  /** First unfinished task relevant to the current flow, if any. */
  activeTaskId: string | null
  windowMode: WindowMode
  /** True when the global shortcut is registered and usable right now. */
  shortcutActive: boolean
}

export type PhaseEndKind = 'focus' | 'break' | 'session'

export type Command =
  | { type: 'start' }
  | { type: 'pause' }
  | { type: 'toggle' }
  | { type: 'reset' }
  | { type: 'skip' }
  | { type: 'add-task'; text: string; flow: number | 'all' }
  | { type: 'toggle-task'; id: string }
  | { type: 'edit-task'; id: string; text: string }
  | { type: 'delete-task'; id: string }
  | { type: 'set-task-estimate'; id: string; estimate: number }
  | { type: 'reorder-task'; id: string; toIndex: number }
  | { type: 'update-settings'; patch: SettingsPatch }
  | { type: 'set-always-on-top'; on: boolean }
  | { type: 'set-expanded'; expanded: boolean }
  | { type: 'export-data' }
  | { type: 'import-data' }
  | { type: 'hide-window' }
  | { type: 'quit' }
  /** Dev-only: exercises the away-pause state for screenshots and smoke tests. */
  | { type: 'dev-pause-away'; idleSeconds: number }

export interface FlowApi {
  getState(): Promise<AppState>
  onState(cb: (state: AppState) => void): () => void
  onPhaseEnd(cb: (kind: PhaseEndKind) => void): () => void
  command(cmd: Command): void
  platform: string
  /** Dev-only screenshot bridge; resolves null in packaged builds. */
  capture(name: string): Promise<string | null>
  /** Dev-only: asks main to quit after a capture batch. */
  captureDone(): void
}
