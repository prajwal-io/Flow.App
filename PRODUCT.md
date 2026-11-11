# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

Electron desktop app (Windows + macOS). The renderer is web technology; the product's design language is a native desktop utility, not a responsive website.

## Stack

Electron + React + TypeScript + Vite (user-specified). No backend, accounts, cloud, database server, or paid APIs. Data persists to a local JSON file in the app's user-data directory.

## Users

Knowledge workers and students on Windows/macOS who do focused deep work in short sessions and want a quiet background Pomodoro companion that never becomes a destination itself.

## Product Purpose

Flow runs focus sessions (a configurable number of "flows" separated by short breaks, with a longer break at a chosen cadence) while tasks are organized per flow or across the whole plan. Success looks like: the user opens the machine, starts Flow once, and it quietly structures their day — resuming correctly after minimize, reload, or sleep — without demanding attention. Above all, the day's focus number stays honest: time away from the machine is never counted as focus.

## Positioning

A Pomodoro timer that treats the session as a plan rather than a bare countdown: tasks are assigned to individual flows or the whole plan, estimates are expressed in flows, the active task surfaces automatically for the current flow, and the whole thing lives in a small floating mini-player that survives sleep and background execution. What a neighbor could not copy unchanged is the combination of flow-scoped task assignment, a timestamp-driven phase machine that stays accurate across sleep, and honest focus accounting: after five minutes of system-wide inactivity Flow pauses, rewinds the countdown by the away time, and refuses to credit a focus that came due while the user was absent. It never auto-resumes or nags.

## Operating Context

- Runs locally on the user's desktop as a small frameless floating window (mini-player), always reachable via system tray / menu bar.
- Typical session: user sets flows/focus/break, assigns a few tasks, presses play, and works; the window may be hidden, minimized, or the machine asleep for long stretches.
- Notifications and an optional soft chime mark phase ends; closing the window keeps the app running in the tray.
- Windows is the primary dev/test platform here; macOS must be supported by the same codebase.
- The user may leave mid-focus; Flow detects that through OS-wide inactivity and pauses honestly rather than crediting phantom time.

## Capabilities and Constraints

- Session config: number of flows (default 4), focus minutes (default 25), short break minutes (default 5), long break minutes (default 15), and long-break cadence (default every 3 flows). Breaks only occur between flows; the last flow ends the session, and a plan whose cadence lands on the final flow gets a quiet "No long break in this plan" note.
- Duration presets: Classic (25/5), Deep (50/10), Sprint (15/3); each also sets the long-break length and cadence.
- Transport: start, pause, resume, skip, reset. Automatic focus ↔ break advancement with independent auto-start toggles for breaks and focus (both on by default). Skip from a running phase keeps the cadence running; skip from idle or paused lands on the next phase, ready but stopped.
- Tasks: create, edit (inline), delete, check off; each task assigned to one flow or the whole plan ("All"); an estimate of 1–12 flows (or unestimated); reorder by drag handle or `Alt+↑/↓`; the current task is shown in compact mode.
- Honest away pause: while a focus runs, Flow polls system-wide inactivity; after five minutes idle it pauses, rewinds the phase by the away time (never past its start), labels the state `paused away`, and never auto-resumes. A focus that comes due while the user is away is not credited. This is on by default.
- Honest blocking (Windows): a marked region in the system hosts file makes listed domains unreachable in every browser **only while a focus is actually running** (breaks, pauses, and away time are never blocked, and the region is released on quit). The first enable shows a plain-language consent dialog, then one UAC prompt to grant the current user write access; declining leaves the feature off — Flow never insists. Dev/capture runs must keep it off (a scratch-hosts override exists for tests).
- Compact mode: countdown, current task, session progress (flow beads), play/pause + skip + reset. Expanded working view: session plan with long-break cadence and presets, tasks, and a footer with a seven-day focus strip (the strip opens the weekly report) and today's tally. The settings view (gear) holds Focus/Block/App/Data/Keys: auto-start, away pause, chime voice and ambience, blocking sites, launch at login, global shortcut with registration feedback, lock handling, focus-status copy, local export/import, and the key map. The bar-chart icon opens the weekly report.
- Plan-vs-actual day close: completed sessions add their intended focus time to the day's planned total; when the session ends, the footer reads `Day close · 1h 40m of 2h planned` (or just the focused total when no plan was recorded).
- Streaks: a day counts when `focusMs > 0` or the day was healed. A broken run that ended within the 7-day strip can be repaired once per week; the repair marks the day (`repaired = true`, `focus` stays 0) and stamps `lastRepairAt`. The footer offers the heal as a quiet chip; a healed day shows a ring mark in the strip.
- Weekly report (bar-chart icon): last 7 days — focused vs planned twin hairline bars on one ruler, best day, longest flow, days focused, streak, and time spent with blocking active (only when used) — with the note "All figures stay on this machine."
- Sound identity: chime voice bell / wood / glass / pad with live preview on select, and focus ambience (rain, brown noise, café) synthesized in WebAudio — no audio assets, no network — playing only while a focus is actually running.
- Local backup: native-dialog JSON export/import in **Settings → Data**. Import replaces settings, tasks, and history, preserves the current window position, and resets the timer.
- Always-on-top toggle; tray access; background execution when the window is hidden; single-instance app.
- Window position is remembered across launches and snaps to work-area edges; the compact anchor is restored after expanding near a screen edge.
- Optional launch at login (starts hidden in the tray), a fixed `Ctrl/Cmd+Alt+Space` global start/pause shortcut with registration feedback, and optional pause when the screen locks or the system sleeps.
- Keyboard map: Space start/pause, S skip, R reset, Escape close the current view (settings or report) / collapse / hide, Alt+↑/↓ reorder a focused task.
- Timers remain accurate when minimized, hidden, or across computer sleep/wake (timestamp-based, main-process-owned state machine).
- Local persistence: settings, tasks, estimates, completion status, daily focus history (actual and planned), window position, and in-flight timer state (restored accurately after quit/relaunch).
- Native notifications + optional subtle synthesized chime on phase end; flows of 45+ minutes get a quiet acknowledgment, and the session-complete notification carries the current streak when it is 2+ days.
- Presence: **Settings → App → Share focus status** copies one honest line built from live timer state (e.g. `Focusing until 4:32 PM · Flow 2 of 4`, paused and idle variants never claim a running focus), with a transient "Copied" acknowledgment.
- Confirmed by user: warm clay/terracotta as the single accent; ship light **and** dark appearance (toggle); delivered first as a runnable dev app, then as a built per-user Windows installer (`dist/Flow-Setup-1.3.0.exe`) with electron-builder packaging documented for both Windows and macOS.
- Explicitly out of scope: cloud sync, accounts, leaderboards, competitive social features, money stakes, guilt-driven streak pressure (streaks are gentle and repairable), paid APIs.

## Brand Commitments

- Name: **Flow**.
- Pinned by the user: minimal, polished, native macOS-inspired design; neutral off-white + charcoal with one subtle accent (confirmed: warm clay); refined typography (Inter / SF Pro / system); compact rounded corners, precise spacing, thin separators, subtle borders; large readable timer type with a linear progress indicator; smooth restrained micro-interactions; smooth transitions between focus and break modes.
- Pinned prohibitions (binding): no excessive gradients, no glassmorphism, no neon glows, no oversized cards, no unnecessary illustrations, no dashboard clutter, no AI-slop aesthetics. The app must feel like a thoughtfully crafted native utility, not a website in a popup.

## Evidence on Hand

No real user data or brand assets exist. Any example tasks shown in the running app are synthetic and must read as plausible examples, not fabricated claims. No testimonials, benchmarks, or press exist and none may be invented.

## Product Principles

1. The timer is the product; every other element recedes around it.
2. Native utility, not a website in a popup: system conventions, tray, notifications, OS fonts, no web-only ornament.
3. Never lose time: phase state lives in the main process, derived from timestamps, correct across minimize, reload, and sleep.
4. Honest by default: the clock counts only focus that happened. Away time is returned, not credited, and the app never guilt-trips the user.
5. Calm by construction: one accent, thin separators, restrained motion; density over decoration.
6. Every control does what it says — no placeholder interactions, no dead toggles.

## Accessibility & Inclusion

Body text contrast ≥ 4.5:1 and large text ≥ 3:1 in both light and dark themes; every icon-only control carries an accessible label; visible keyboard focus; `prefers-reduced-motion` disables non-essential transitions; timer uses tabular numerals so digits never shift layout.
