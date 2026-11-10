import { app, BrowserWindow, dialog, ipcMain, Notification, powerMonitor, Menu, globalShortcut } from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import type { AppState, Command, PersistedState, PhaseEndKind } from '../shared/types'
import { IDLE_PAUSE_SECONDS, IDLE_POLL_MS } from '../shared/constants'
import { dayKey } from '../shared/date'
import { Store, cryptoRandomId, normalizeState } from './state'
import { TimerEngine } from './timer'
import {
  createFlowWindow,
  getFlowWindow,
  getMode,
  hideFlowWindow,
  saveWindowPositionNow,
  setAlwaysOnTop,
  setExpanded,
  showFlowWindow,
  toggleFlowWindow,
  type WindowDeps,
} from './window'
import { createTray, destroyTray, refreshTrayMenu, tickTrayTooltip } from './tray'

// Notifications on Windows are attributed through the AppUserModelID; this must
// match the appId electron-builder stamps into the Start-menu shortcut.
if (process.platform === 'win32') app.setAppUserModelId('com.flow.desktop')

// Dev-only: lets a test run keep its state out of the installed app's data.
if (!app.isPackaged && process.env.FLOW_USER_DATA) {
  const dir = path.resolve(process.env.FLOW_USER_DATA)
  fs.mkdirSync(dir, { recursive: true })
  app.setPath('userData', dir)
}

const GLOBAL_SHORTCUT = 'CommandOrControl+Alt+Space'

const store = new Store()
const engine = new TimerEngine(store)

let isQuitting = false
let shortcutActive = false

const windowDeps: WindowDeps = {
  isQuitting: () => isQuitting,
  onModeChange: () => broadcast(),
  getWindowPosition: () => store.get().windowPosition,
  saveWindowPosition: (position) => {
    store.mutate((s) => {
      s.windowPosition = position
    })
  },
}

/* ------------------------------------------------------------------ state */

function activeTaskId(): string | null {
  const s = store.get()
  // During a break the upcoming flow is the one worth showing work for.
  const flow =
    s.timer.phase === 'break' ? Math.min(s.timer.currentFlow + 1, s.settings.flows) : s.timer.currentFlow
  const open = s.tasks.filter((t) => !t.completed && (t.flow === flow || t.flow === 'all'))
  return open.find((t) => t.flow === flow)?.id ?? open[0]?.id ?? null
}

function snapshot(): AppState {
  const s = store.get()
  return {
    settings: s.settings,
    tasks: s.tasks,
    timer: s.timer,
    history: s.history,
    activeTaskId: activeTaskId(),
    windowMode: getMode(),
    shortcutActive,
  }
}

function broadcast(): void {
  const state = snapshot()
  for (const w of BrowserWindow.getAllWindows()) {
    if (!w.isDestroyed()) w.webContents.send('flow:state', state)
  }
  refreshTrayMenu()
}

/* -------------------------------------------------------------- boot hooks */

/** Mirrors the saved preference into the OS login-item registry. */
function syncLoginItem(): void {
  if (!app.isPackaged || process.platform === 'linux') return
  const openAtLogin = store.get().settings.launchAtLogin
  try {
    if (process.platform === 'win32') {
      app.setLoginItemSettings({ openAtLogin, path: process.execPath, args: ['--hidden'] })
    } else {
      app.setLoginItemSettings({ openAtLogin })
    }
  } catch (err) {
    console.error('[flow] failed to update login item:', err)
  }
}

/** Registers the one fixed shortcut, or records that another app owns it. */
function syncGlobalShortcut(): void {
  globalShortcut.unregister(GLOBAL_SHORTCUT)
  shortcutActive = false
  if (!store.get().settings.globalShortcutEnabled) return
  try {
    shortcutActive = globalShortcut.register(GLOBAL_SHORTCUT, () => {
      engine.toggle()
      // A global action deserves visible confirmation, even from the tray.
      showFlowWindow()
    })
  } catch {
    shortcutActive = false
  }
  if (!shortcutActive) console.warn(`[flow] global shortcut ${GLOBAL_SHORTCUT} is unavailable`)
}

/** Leaving the machine stops the clock instead of crediting phantom focus. */
function pauseForAway(): void {
  const s = store.get()
  if (!s.settings.pauseOnLock && !s.settings.pauseWhenIdle) return
  if (s.timer.status === 'running') engine.pause('away')
}

/**
 * Reconciles the phase machine, telling it how long the machine has been idle
 * when a focus deadline is due. That lets the engine refuse to credit a focus
 * the user was not present for.
 */
function engineTick(): void {
  const t = store.get().timer
  const due = t.status === 'running' && t.endsAt !== null && Date.now() >= t.endsAt
  const idle = due && store.get().settings.pauseWhenIdle ? powerMonitor.getSystemIdleTime() : 0
  engine.tick(idle)
}

/* ------------------------------------------------------------ notifications */

function notifyPhase(kind: PhaseEndKind): void {
  const state = snapshot()
  const breakLength =
    state.timer.breakKind === 'long' ? state.settings.longBreakMinutes : state.settings.breakMinutes
  const longBreak = state.timer.breakKind === 'long'
  const copy: Record<PhaseEndKind, { title: string; body: string }> = {
    focus: {
      title: 'Focus complete',
      body: `Flow ${state.timer.completedFlows} of ${state.settings.flows} done — take a ${breakLength} min ${
        longBreak ? 'long break' : 'break'
      }.`,
    },
    break: {
      title: 'Break over',
      body: `Ready for Flow ${state.timer.currentFlow} of ${state.settings.flows}.`,
    },
    session: {
      title: 'Session complete',
      body: `All ${state.settings.flows} flows finished. Nicely done.`,
    },
  }

  if (Notification.isSupported()) {
    const n = new Notification({ ...copy[kind], silent: true })
    n.on('click', () => showFlowWindow())
    n.show()
  }

  // The renderer answers with the soft chime (its WebAudio stays alive while hidden).
  for (const w of BrowserWindow.getAllWindows()) {
    if (!w.isDestroyed()) w.webContents.send('flow:phase-end', kind)
  }
}

/* ---------------------------------------------------------------- backups */

function messageBox(options: Electron.MessageBoxOptions): Promise<Electron.MessageBoxReturnValue> {
  const win = getFlowWindow()
  return win ? dialog.showMessageBox(win, options) : dialog.showMessageBox(options)
}

function notify(title: string, body: string): void {
  if (!Notification.isSupported()) return
  new Notification({ title, body, silent: true }).show()
}

/** Saves a human-readable JSON backup; nothing leaves the machine. */
async function exportData(): Promise<void> {
  const win = getFlowWindow()
  const options: Electron.SaveDialogOptions = {
    title: 'Export Flow data',
    defaultPath: path.join(app.getPath('documents'), `flow-backup-${dayKey()}.json`),
    filters: [{ name: 'Flow backup', extensions: ['json'] }],
  }
  const result = win ? await dialog.showSaveDialog(win, options) : await dialog.showSaveDialog(options)
  if (result.canceled || !result.filePath) return

  try {
    fs.writeFileSync(result.filePath, JSON.stringify(store.get(), null, 2), 'utf8')
    notify('Flow backup saved', path.basename(result.filePath))
  } catch (err) {
    console.error('[flow] failed to export data:', err)
    await messageBox({
      type: 'error',
      message: 'Flow could not save the backup.',
      detail: String(err),
    })
  }
}

/** Replaces settings, tasks, and history from a local backup. */
async function importData(): Promise<void> {
  const win = getFlowWindow()
  const options: Electron.OpenDialogOptions = {
    title: 'Import Flow data',
    properties: ['openFile'],
    filters: [{ name: 'Flow backup', extensions: ['json'] }],
  }
  const picked = win ? await dialog.showOpenDialog(win, options) : await dialog.showOpenDialog(options)
  if (picked.canceled || picked.filePaths.length === 0) return

  let next: PersistedState
  try {
    const raw = fs.readFileSync(picked.filePaths[0], 'utf8').replace(/^\uFEFF/, '')
    const parsed: unknown = JSON.parse(raw)
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      !('settings' in parsed || 'tasks' in parsed || 'history' in parsed)
    ) {
      throw new Error('This file is not a Flow backup.')
    }
    next = normalizeState(parsed)
  } catch (err) {
    await messageBox({
      type: 'error',
      message: 'Flow could not read that backup.',
      detail: String(err),
    })
    return
  }

  const confirm = await messageBox({
    type: 'warning',
    buttons: ['Cancel', 'Import'],
    defaultId: 0,
    cancelId: 0,
    message: 'Replace Flow data?',
    detail:
      'This replaces settings, tasks, and focus history. The current timer resets. Your window position stays where it is.',
  })
  if (confirm.response !== 1) return

  store.importState(next)
  engine.reset()
  syncLoginItem()
  syncGlobalShortcut()
  setAlwaysOnTop(store.get().settings.alwaysOnTop)
  broadcast()
  notify(
    'Flow data imported',
    `${next.tasks.length} task${next.tasks.length === 1 ? '' : 's'} · ${
      Object.keys(next.history).length
    } day${Object.keys(next.history).length === 1 ? '' : 's'} of history`,
  )
}

/* ---------------------------------------------------------------- commands */

function handleCommand(cmd: Command): void {
  switch (cmd.type) {
    case 'start':
      engine.start()
      break
    case 'pause':
      engine.pause()
      break
    case 'toggle':
      engine.toggle()
      break
    case 'reset':
      engine.reset()
      break
    case 'skip':
      engine.skip()
      break
    case 'add-task': {
      const text = cmd.text.trim()
      if (!text) return
      store.mutate((s) => {
        const flow =
          cmd.flow === 'all'
            ? ('all' as const)
            : Math.min(Math.max(1, Math.round(cmd.flow)), s.settings.flows)
        s.tasks.push({ id: cryptoRandomId(), text: text.slice(0, 120), flow, estimate: 0, completed: false })
      })
      break
    }
    case 'toggle-task':
      store.mutate((s) => {
        const task = s.tasks.find((t) => t.id === cmd.id)
        if (task) task.completed = !task.completed
      })
      break
    case 'edit-task':
      store.mutate((s) => {
        const task = s.tasks.find((t) => t.id === cmd.id)
        const text = cmd.text.trim()
        if (task && text) task.text = text.slice(0, 120)
        else if (task && !text) s.tasks = s.tasks.filter((t) => t.id !== cmd.id)
      })
      break
    case 'delete-task':
      store.mutate((s) => {
        s.tasks = s.tasks.filter((t) => t.id !== cmd.id)
      })
      break
    case 'set-task-estimate':
      store.mutate((s) => {
        const task = s.tasks.find((t) => t.id === cmd.id)
        if (!task || !Number.isFinite(cmd.estimate)) return
        task.estimate = Math.min(12, Math.max(0, Math.round(cmd.estimate)))
      })
      break
    case 'reorder-task':
      store.mutate((s) => {
        if (!Number.isFinite(cmd.toIndex)) return
        const from = s.tasks.findIndex((t) => t.id === cmd.id)
        if (from < 0) return
        const [task] = s.tasks.splice(from, 1)
        const to = Math.min(Math.max(0, Math.round(cmd.toIndex)), s.tasks.length)
        s.tasks.splice(to, 0, task)
      })
      break
    case 'update-settings': {
      const prevLaunchAtLogin = store.get().settings.launchAtLogin
      const prevShortcutEnabled = store.get().settings.globalShortcutEnabled
      engine.applySettings(cmd.patch)
      if (cmd.patch.launchAtLogin !== undefined && cmd.patch.launchAtLogin !== prevLaunchAtLogin) syncLoginItem()
      if (cmd.patch.globalShortcutEnabled !== undefined && cmd.patch.globalShortcutEnabled !== prevShortcutEnabled) {
        syncGlobalShortcut()
      }
      break
    }
    case 'set-always-on-top':
      store.mutate((s) => {
        s.settings.alwaysOnTop = cmd.on
      })
      setAlwaysOnTop(cmd.on)
      break
    case 'set-expanded':
      setExpanded(cmd.expanded, windowDeps)
      break
    case 'export-data':
      void exportData()
      return
    case 'import-data':
      void importData()
      return
    case 'dev-pause-away':
      if (!app.isPackaged) engine.pauseAway(cmd.idleSeconds)
      break
    case 'hide-window':
      hideFlowWindow()
      return
    case 'quit':
      isQuitting = true
      app.quit()
      return
  }
  broadcast()
}

/* -------------------------------------------------------------------- boot */

app.on('second-instance', () => showFlowWindow())

if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.whenReady().then(() => {
    // On macOS a menu is needed for the standard app/Edit shortcuts; on Windows
    // and Linux the frameless mini-player carries no menu bar.
    Menu.setApplicationMenu(
      process.platform === 'darwin'
        ? Menu.buildFromTemplate([{ role: 'appMenu' }, { role: 'editMenu' }, { role: 'windowMenu' }])
        : null,
    )

    engine.onTransition = () => broadcast()
    engine.onPhaseEnd = (kind) => notifyPhase(kind)

    // The shortcut and login item must be live before the first state snapshot.
    syncGlobalShortcut()
    syncLoginItem()

    createFlowWindow(windowDeps, path.join(__dirname, '../../resources/app-icon.png'))
    // Restore the persisted pin preference onto the new window.
    if (store.get().settings.alwaysOnTop) setAlwaysOnTop(true)

    createTray({
      iconPath: path.join(app.getAppPath(), 'resources', 'tray.png'),
      getState: snapshot,
      onToggleWindow: toggleFlowWindow,
      onCommand: (type) => {
        if (type === 'quit') {
          isQuitting = true
          app.quit()
        } else {
          handleCommand({ type })
        }
      },
      onToggleAlwaysOnTop: (on) => handleCommand({ type: 'set-always-on-top', on }),
      onToggleSound: (on) => handleCommand({ type: 'update-settings', patch: { soundEnabled: on } }),
    })

    ipcMain.handle('flow:get-state', () => snapshot())
    ipcMain.on('flow:command', (_e, cmd: Command) => handleCommand(cmd))

    // A capture batch exits itself so CI-style screenshot runs terminate.
    ipcMain.on('flow:capture-done', () => {
      if (!process.env.FLOW_SHOT) return
      setTimeout(() => {
        isQuitting = true
        app.quit()
      }, 250)
    })

    if (!app.isPackaged) {
      // Dev-only: lets the capture harness save screenshots for design review.
      ipcMain.handle('flow:dev-capture', async (_e, name: string) => {
        const w = getFlowWindow()
        if (!w) return null
        const image = await w.webContents.capturePage()
        const dir = path.join(app.getAppPath(), '.impeccable', 'review')
        fs.mkdirSync(dir, { recursive: true })
        const file = path.join(dir, `${String(name).replace(/[^a-z0-9-]/gi, '')}.png`)
        fs.writeFileSync(file, image.toPNG())
        return file
      })
    }

    // Reconcile against the wall clock; survives minimize, hide and system sleep.
    const tick = setInterval(engineTick, 250)
    tick.unref()

    // Honest focus: poll for system-wide inactivity while a focus is running.
    const idleCheck = setInterval(() => {
      const s = store.get()
      if (!s.settings.pauseWhenIdle || s.timer.phase !== 'focus' || s.timer.status !== 'running') return
      const idleSeconds = powerMonitor.getSystemIdleTime()
      if (idleSeconds >= IDLE_PAUSE_SECONDS) engine.pauseAway(idleSeconds)
    }, IDLE_POLL_MS)
    idleCheck.unref()

    // The tooltip counts down between transitions.
    const tooltip = setInterval(() => tickTrayTooltip(), 1000)
    tooltip.unref()

    powerMonitor.on('resume', engineTick)
    powerMonitor.on('unlock-screen', engineTick)
    powerMonitor.on('lock-screen', pauseForAway)
    powerMonitor.on('suspend', pauseForAway)

    app.on('activate', () => showFlowWindow())
  })
}

app.on('window-all-closed', () => {
  // Intentionally empty: Flow lives in the tray until explicitly quit.
})

app.on('before-quit', () => {
  isQuitting = true
  saveWindowPositionNow()
  engineTick()
  store.flush()
  globalShortcut.unregisterAll()
  destroyTray()
})
