# Flow

A calm, minimal Pomodoro companion for Windows and macOS. Flow floats as a small
mini-player above your work, structures your day into focus *flows* separated by
breaks, and keeps your tasks attached to the flow they belong to.

Its rule is simple: **the clock only counts focus that actually happened.** If you
walk away, Flow quietly pauses, gives the away time back to the countdown, and never
credits a focus you were not there for.

- **Honest focus** — after five minutes of system-wide inactivity Flow pauses the
  current focus, rewinds it by the away time, and labels it `paused away`. It never
  auto-resumes and never nags.
- **Compact mini-player** — countdown, current task, session beads, play / pause / skip / reset
- **Expanded working panel** — session plan, long-break cadence, duration presets, tasks,
  and a seven-day focus strip with a plan-vs-actual line when a session closes
- **Long breaks that fit the plan** — a longer break after every N flows (15 minutes
  after every 3 by default), with independent auto-start toggles for breaks and focus
- **Tasks with intent** — assign a task to one flow or the whole plan, estimate it in
  flows (`1×`–`12×`), reorder by dragging the grip or pressing `Alt+↑/↓`
- **Settings, not clutter** — auto-start, away pause, launch at login, the global
  shortcut, lock handling, the key map, and local backup live behind one gear
- **Stays where you put it** — remembers its window position across launches and snaps to screen edges
- **Fits into the machine** — optional launch at login (hidden in the tray), a global
  `Ctrl/Cmd+Alt+Space` start/pause shortcut, and optional pause when the screen locks or the system sleeps
- **Accurate by design** — the phase machine lives in Electron's main process and is
  derived from timestamps, so the timer stays correct when minimized, hidden, reloaded,
  or when the computer sleeps and wakes
- **Quietly persistent** — closing the window hides Flow to the tray; settings, tasks,
  and focus history persist locally; an interrupted session restores exactly on relaunch
- **Local backup** — export a readable JSON file or restore one from **Settings → Data**;
  files stay on your machine and the current window position is kept on import
- **Native notifications** plus an optional soft synthesized chime when a phase ends
- **Light and dark** appearances (follow system, or set manually), one warm-clay accent

## What's new in 1.2.0

- Long breaks with a configurable cadence, plus auto-start breaks / auto-start focus.
- Duration presets: **Classic** 25·5, **Deep** 50·10, **Sprint** 15·3.
- Task estimates (1–12 flows) and drag / `Alt+↑/↓` reordering.
- Seven-day focus strip and a plan-vs-actual day close footer.
- Honest away pause after five minutes idle, on by default.
- A dedicated settings view and local JSON export / import.

## Requirements

- Node.js 18+ (developed on Node 24)
- npm 9+
- Windows 10/11 or macOS 11+

## Run locally (development)

```bash
cd flow
npm install
npm run dev
```

`npm run dev` starts Vite's dev server, bundles the main/preload processes in watch
mode, and launches Electron connected to it. Edit any file and the renderer hot-reloads;
main/preload changes restart Electron automatically.

## Useful commands

| Command              | What it does                                             |
| -------------------- | -------------------------------------------------------- |
| `npm run dev`        | Dev server + Electron with HMR                           |
| `npm run build`      | Production build to `out/`                               |
| `npm run typecheck`  | TypeScript across main, preload, and renderer            |
| `npm run preview`    | Run the production build in Electron                     |
| `npm run icons`      | Regenerate `build/icon.*` and `resources/tray.png`       |
| `npm run dist`       | Build + package with electron-builder                    |
| `npm run dist:win`   | Build + Windows NSIS installer → `dist/Flow-Setup-*.exe` |
| `npm run dist:mac`   | Build + macOS DMG → `dist/` (run on a Mac)               |

## Install (Windows)

A per-user installer is built at `dist/Flow-Setup-1.2.0.exe`. Run it directly, or
install it silently from a terminal:

```powershell
.\dist\Flow-Setup-1.2.0.exe /S
```

It installs to `%LOCALAPPDATA%\Programs\Flow` and adds a **Flow** Start-menu
shortcut. Installed copies keep their data in `%APPDATA%\Flow\flow-state.json`.

## Packaging

Flow uses [electron-builder](https://www.electron-builder.org/) with the config in
`electron-builder.yml`:

```bash
npm run dist:win   # on Windows → dist/Flow-Setup-1.2.0.exe
npm run dist:mac   # on macOS  → dist/Flow-1.2.0.dmg
```

Icons for all three platforms are generated from source by `scripts/gen-icons.mjs`
(no image tooling required) into `build/`.

## Keyboard shortcuts

| Key                        | Action                                             |
| -------------------------- | -------------------------------------------------- |
| `Space`                    | Start / pause                                      |
| `S`                        | Skip to the next phase                             |
| `R`                        | Reset the session                                  |
| `Escape`                   | Close settings, collapse the panel, or hide to tray |
| `Alt+↑ / Alt+↓`            | Reorder the focused task (when its grip has focus) |
| `Ctrl+Alt+Space` (global)  | Start / pause from anywhere (Windows/Linux)        |
| `Cmd+Option+Space` (global)| Start / pause from anywhere (macOS)                |
| Double-click the title bar | Toggle compact / expanded                          |

The global shortcut is registered while Flow is running and can be turned off in
**Expanded panel → Settings → App**. If another app already owns the combination,
Flow says so instead of failing silently.

## Where data lives

Everything is stored locally in a single JSON file:

- Windows: `%APPDATA%\Flow\flow-state.json`
- macOS: `~/Library/Application Support/Flow/flow-state.json`

**Settings → Data** exports a readable copy or restores one. Import replaces
settings, tasks, and focus history; the current window position is preserved and
the timer resets. There are no accounts, servers, or network calls. Delete the
state file to reset Flow to defaults.

## Architecture

```
src/
  shared/types.ts      Single source of truth for state & IPC contracts
  shared/date.ts       Local day keys and the seven-day strip
  shared/constants.ts  Away-pause threshold and idle poll interval
  main/                Electron main process
    timer.ts           Phase state machine (timestamp-driven, sleep-proof, honest away pause)
    state.ts           Debounced atomic JSON persistence, validation, backup import
    window.ts          Frameless window, position memory, edge snapping, resize animation
    geometry.ts        Pure clamp / snap math for window placement
    tray.ts            Tray/menu-bar icon, menu, tooltip countdown
    index.ts           IPC commands, notifications, login item, hotkey, power/idle events
  preload/index.ts     contextBridge API (sandboxed, context-isolated)
  renderer/src/
    App.tsx            Mode switching, settings view, shortcuts, phase-end chime
    state.ts           useSyncExternalStore mirror of main-process state
    components/        TitleBar, Beads, TimerFace, Transport, Session/Tasks/Settings UI
    lib/               countdown hook, formatting, WebAudio chime, capture harness
    styles.css         Design tokens (light + dark) and every style
```

**State flow:** the renderer sends commands, the main process mutates state, persists it,
and pushes a full snapshot back; the countdown itself is re-derived from `endsAt` in the
renderer, so no per-second IPC traffic is needed.

## License

MIT
