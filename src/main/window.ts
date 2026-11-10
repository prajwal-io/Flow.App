import { app, BrowserWindow, screen } from 'electron'
import path from 'node:path'
import type { WindowMode, WindowPosition } from '../shared/types'
import { clampToArea, snapToArea } from './geometry'

export const COMPACT_SIZE = { width: 328, height: 188 }
export const EXPANDED_SIZE = { width: 360, height: 664 }

const RESIZE_MS = 220
const POSITION_SAVE_MS = 350

let win: BrowserWindow | null = null
let mode: WindowMode = 'compact'
let resizeTimer: NodeJS.Timeout | null = null
let positionTimer: NodeJS.Timeout | null = null
let depsRef: WindowDeps | null = null
/** Compact top-left to return to after an automatic expand/collapse. */
let compactAnchor: WindowPosition | null = null
/** True once the expanded window has been deliberately dragged. */
let expandedDragged = false
let animating = false
let animationTarget: WindowPosition | null = null

export interface WindowDeps {
  isQuitting: () => boolean
  onModeChange: (mode: WindowMode) => void
  getWindowPosition: () => WindowPosition | null
  saveWindowPosition: (position: WindowPosition) => void
}

export function getFlowWindow(): BrowserWindow | null {
  return win && !win.isDestroyed() ? win : null
}

export function getMode(): WindowMode {
  return mode
}

/** The work area that should govern the saved/current position. */
function areaFor(position: WindowPosition): Electron.Rectangle {
  return screen.getDisplayNearestPoint(position).workArea
}

function defaultPosition(): WindowPosition {
  const { width, height } = COMPACT_SIZE
  const area = screen.getPrimaryDisplay().workArea
  // Docked near the bottom-right, where a mini-player belongs.
  return {
    x: Math.round(area.x + area.width - width - 24),
    y: Math.round(area.y + area.height - height - 48),
  }
}

/** A remembered position wins, clamped so a disconnected monitor can't strand it. */
function initialPosition(deps: WindowDeps): WindowPosition {
  const saved = deps.getWindowPosition()
  if (!saved) return defaultPosition()
  return clampToArea({ ...saved, ...COMPACT_SIZE }, areaFor(saved))
}

/** Persists the window's top-left, snapping first when the move has finished. */
function persistPosition(snap: boolean): void {
  const w = getFlowWindow()
  if (!w || !depsRef) return

  // Ignore resize-animation frames, and don't remember a position the app chose
  // for itself when expanding — only where the user actually put the window.
  if (animating) return
  if (mode === 'expanded' && !expandedDragged) return

  const bounds = w.getBounds()

  let position: WindowPosition = { x: bounds.x, y: bounds.y }
  if (snap) {
    const area = screen.getDisplayMatching(bounds).workArea
    position = snapToArea(bounds, area)
    if (position.x !== bounds.x || position.y !== bounds.y) w.setPosition(position.x, position.y)
  }

  // Expanded geometry is temporary; remember the compact top-left it implies.
  if (mode === 'expanded') {
    const area = screen.getDisplayMatching(bounds).workArea
    position = clampToArea({ ...position, ...COMPACT_SIZE }, area)
  }
  depsRef.saveWindowPosition(position)
}

/** Watches for a genuine drag of the expanded window (animation frames excluded). */
function noteExpandedMove(bounds: Electron.Rectangle): void {
  if (mode !== 'expanded' || animating || !animationTarget) return
  if (bounds.x !== animationTarget.x || bounds.y !== animationTarget.y) {
    expandedDragged = true
    compactAnchor = null
  }
}

/** Saves immediately; used on quit so a just-finished drag is never lost. */
export function saveWindowPositionNow(): void {
  if (positionTimer) {
    clearTimeout(positionTimer)
    positionTimer = null
  }
  persistPosition(false)
}

export function createFlowWindow(deps: WindowDeps, iconPath: string): BrowserWindow {
  depsRef = deps
  const { width, height } = COMPACT_SIZE
  const { x, y } = initialPosition(deps)

  win = new BrowserWindow({
    width,
    height,
    x,
    y,
    show: false,
    frame: false,
    transparent: true,
    resizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    title: 'Flow',
    icon: iconPath,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      backgroundThrottling: false,
      spellcheck: false,
    },
  })

  win.setMenuBarVisibility(false)

  const rendererUrl = process.env.ELECTRON_RENDERER_URL
  if (rendererUrl) {
    const url = new URL(rendererUrl)
    const shot = process.env.FLOW_SHOT
    if (shot) url.searchParams.set('shot', shot)
    void win.loadURL(url.toString())
  } else {
    void win.loadFile(path.join(__dirname, '../renderer/index.html'))
  }

  // Login launches stay in the tray: on Windows through the `--hidden` arg,
  // on macOS through the login-item flag (openAsHidden is no longer reliable).
  const launchedHidden =
    process.argv.includes('--hidden') ||
    (process.platform === 'darwin' && app.getLoginItemSettings().wasOpenedAtLogin)

  win.once('ready-to-show', () => {
    if (!launchedHidden) win?.show()
  })

  // Save while dragging (cheap, no snapping mid-gesture), then snap on release.
  win.on('move', () => {
    const bounds = win?.getBounds()
    if (bounds) noteExpandedMove(bounds)
    if (positionTimer) clearTimeout(positionTimer)
    positionTimer = setTimeout(() => {
      positionTimer = null
      persistPosition(false)
    }, POSITION_SAVE_MS)
  })

  win.on('moved', () => {
    const bounds = win?.getBounds()
    if (bounds) noteExpandedMove(bounds)
    if (positionTimer) {
      clearTimeout(positionTimer)
      positionTimer = null
    }
    persistPosition(true)
  })

  // Closing hides to the tray; the app keeps running until quit from there.
  win.on('close', (e) => {
    if (!deps.isQuitting()) {
      saveWindowPositionNow()
      e.preventDefault()
      win?.hide()
    }
  })

  win.on('closed', () => {
    win = null
  })

  return win
}

export function showFlowWindow(): void {
  const w = getFlowWindow()
  if (!w) return
  if (w.isMinimized()) w.restore()
  w.show()
  w.focus()
}

export function toggleFlowWindow(): void {
  const w = getFlowWindow()
  if (!w) return
  if (w.isVisible() && w.isFocused()) w.hide()
  else showFlowWindow()
}

export function hideFlowWindow(): void {
  getFlowWindow()?.hide()
}

export function setAlwaysOnTop(on: boolean): void {
  getFlowWindow()?.setAlwaysOnTop(on, 'floating')
}

/** Animates between compact and expanded bounds, keeping the window on screen. */
export function setExpanded(expanded: boolean, deps: WindowDeps): void {
  const w = getFlowWindow()
  if (!w) return

  const next: WindowMode = expanded ? 'expanded' : 'compact'
  const target = expanded ? EXPANDED_SIZE : COMPACT_SIZE
  if (resizeTimer) {
    clearInterval(resizeTimer)
    resizeTimer = null
  }

  const fromMode = mode
  const from = w.getBounds()
  const area = screen.getDisplayMatching(from).workArea
  let x = Math.max(area.x, Math.min(from.x, area.x + area.width - target.width))
  let y = Math.max(area.y, Math.min(from.y, area.y + area.height - target.height))

  const changed =
    next !== mode ||
    Math.abs(from.width - target.width) > 4 ||
    Math.abs(from.height - target.height) > 4
  mode = next
  deps.onModeChange(next)

  if (!changed) return

  if (expanded) {
    if (fromMode === 'compact') {
      // Remember where the mini-player was; an expanded window near the bottom
      // has to grow upward, and collapsing should return to the same spot.
      compactAnchor = { x: from.x, y: from.y }
      expandedDragged = false
    }
  } else if (compactAnchor && !expandedDragged) {
    const anchorArea = screen.getDisplayNearestPoint(compactAnchor).workArea
    const restored = clampToArea({ ...compactAnchor, ...COMPACT_SIZE }, anchorArea)
    x = restored.x
    y = restored.y
  }

  animationTarget = { x, y }
  animating = true

  const start = Date.now()
  resizeTimer = setInterval(() => {
    const w2 = getFlowWindow()
    if (!w2) {
      clearInterval(resizeTimer!)
      resizeTimer = null
      animating = false
      return
    }
    const t = Math.min(1, (Date.now() - start) / RESIZE_MS)
    const eased = 1 - Math.pow(1 - t, 3) // easeOutCubic
    const width = Math.round(from.width + (target.width - from.width) * eased)
    const height = Math.round(from.height + (target.height - from.height) * eased)
    w2.setBounds({ x, y, width, height })
    if (t >= 1) {
      clearInterval(resizeTimer!)
      resizeTimer = null
      animating = false
      if (!expanded) {
        compactAnchor = null
        expandedDragged = false
        // Restore the compact anchor exactly; snapping belongs to drags.
        persistPosition(false)
      }
    }
  }, 16)
}
