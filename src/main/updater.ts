import { app } from 'electron'
import { autoUpdater } from 'electron-updater'

/**
 * Quiet auto-updates from GitHub Releases. The update downloads in the
 * background and installs only when the user quits — never mid-session, never
 * with a modal. Dev runs have no app-update.yml, so they never check.
 */
export function startUpdater(notify: (title: string, body: string) => void): void {
  if (!app.isPackaged) return

  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on('update-downloaded', (info) => {
    notify('Update ready', `Flow ${info.version} installs when you quit.`)
  })
  autoUpdater.on('error', (err) => {
    // An unreachable release host must never disturb the app.
    console.warn('[flow] update check failed:', err.message)
  })

  // Let startup settle first; the check itself must never block the window.
  setTimeout(() => {
    autoUpdater.checkForUpdates().catch((err: unknown) => {
      console.warn('[flow] update check failed:', err)
    })
  }, 10_000)
}
