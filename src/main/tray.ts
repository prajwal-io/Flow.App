import { Menu, Tray, nativeImage } from 'electron'
import type { AppState } from '../shared/types'

export interface TrayDeps {
  iconPath: string
  getState: () => AppState
  onToggleWindow: () => void
  onCommand: (type: 'toggle' | 'reset' | 'skip' | 'quit') => void
  onToggleAlwaysOnTop: (on: boolean) => void
  onToggleSound: (on: boolean) => void
}

let tray: Tray | null = null
let deps: TrayDeps | null = null
let lastTooltip = ''

export function createTray(trayDeps: TrayDeps): Tray {
  deps = trayDeps
  const image = nativeImage.createFromPath(trayDeps.iconPath)
  tray = new Tray(image)
  tray.setToolTip('Flow')
  rebuildTrayMenu()

  // Windows/Linux: left-click toggles the mini-player; the menu is on right-click.
  tray.on('click', () => {
    if (process.platform !== 'darwin') trayDeps.onToggleWindow()
  })

  return tray
}

export function destroyTray(): void {
  tray?.destroy()
  tray = null
}

/** Rebuilds the context menu from current state (cheap; called on transitions). */
export function refreshTrayMenu(): void {
  if (!tray || !deps) return
  rebuildTrayMenu()
  const tooltip = tooltipFor(deps.getState())
  if (tooltip !== lastTooltip) {
    lastTooltip = tooltip
    tray.setToolTip(tooltip)
  }
}

/** Keeps the tooltip's countdown honest between transitions. */
export function tickTrayTooltip(): void {
  if (!tray || !deps) return
  const tooltip = tooltipFor(deps.getState())
  if (tooltip !== lastTooltip) {
    lastTooltip = tooltip
    tray.setToolTip(tooltip)
  }
}

function tooltipFor(state: AppState): string {
  const { timer, settings } = state
  if (timer.phase === 'done') return `Flow — session complete (${settings.flows} flows)`
  const secs = Math.max(0, Math.ceil((timer.status === 'running' && timer.endsAt ? timer.endsAt - Date.now() : timer.remainingMs) / 1000))
  const clock = `${String(Math.floor(secs / 60)).padStart(2, '0')}:${String(secs % 60).padStart(2, '0')}`
  const phase =
    timer.phase === 'focus' ? 'Focus' : timer.breakKind === 'long' ? 'Long break' : 'Break'
  const flow = timer.phase === 'break' ? Math.min(timer.currentFlow + 1, settings.flows) : timer.currentFlow
  const place = timer.phase === 'break' ? `next flow ${flow}/${settings.flows}` : `flow ${flow}/${settings.flows}`
  const suffix =
    timer.status === 'running'
      ? ''
      : timer.status === 'paused'
        ? timer.pauseReason === 'away'
          ? ' · away'
          : ' · paused'
        : ' · idle'
  return `Flow — ${clock} ${phase} · ${place}${suffix}`
}

function rebuildTrayMenu(): void {
  if (!tray || !deps) return
  const state = deps.getState()
  const running = state.timer.status === 'running'
  const action =
    running
      ? 'Pause'
      : state.timer.phase === 'done'
        ? 'Start new session'
        : state.timer.status === 'paused'
          ? 'Resume'
          : 'Start'

  const menu = Menu.buildFromTemplate([
    { label: 'Show Flow', click: () => deps!.onToggleWindow() },
    { type: 'separator' },
    { label: action, click: () => deps!.onCommand('toggle') },
    { label: 'Skip to next', click: () => deps!.onCommand('skip') },
    { label: 'Reset session', click: () => deps!.onCommand('reset') },
    { type: 'separator' },
    {
      label: 'Always on Top',
      type: 'checkbox',
      checked: state.settings.alwaysOnTop,
      click: (item) => deps!.onToggleAlwaysOnTop(item.checked),
    },
    {
      label: 'Sound',
      type: 'checkbox',
      checked: state.settings.soundEnabled,
      click: (item) => deps!.onToggleSound(item.checked),
    },
    { type: 'separator' },
    { label: 'Quit Flow', click: () => deps!.onCommand('quit') },
  ])
  tray.setContextMenu(menu)
}

export function trayExists(): boolean {
  return tray !== null && !tray.isDestroyed()
}
