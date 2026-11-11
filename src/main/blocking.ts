import { app, BrowserWindow, dialog } from 'electron'
import { execFile } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import type { AppState } from '../shared/types'
import { renderBlock } from '../shared/blocking'

/**
 * Windows hosts-based blocking. The Flow region exists only while a focus
 * phase is actually running — breaks, pauses, and away time are never blocked.
 *
 * First enable asks Windows once (UAC) to grant the current user write access
 * to the hosts file; after that every session flips silently. Refusing the
 * prompt simply leaves blocking off — Flow never insists.
 */

type BlockState = Pick<AppState, 'settings' | 'timer'>

function hostsPath(): string {
  // Dev-only: lets tests point at a scratch file instead of the system hosts.
  if (!app.isPackaged && process.env.FLOW_HOSTS_PATH) return path.resolve(process.env.FLOW_HOSTS_PATH)
  return path.join(process.env.SystemRoot ?? 'C:\\Windows', 'System32', 'drivers', 'etc', 'hosts')
}

function readHosts(): string {
  try {
    return fs.readFileSync(hostsPath(), 'utf8')
  } catch {
    return '' // a missing hosts file reads as empty; the write step creates it
  }
}

/** Real-write probe: on Windows W_OK ignores ACLs, only an actual write knows. */
function canWrite(): boolean {
  const file = hostsPath()
  try {
    const content = fs.readFileSync(file, 'utf8')
    fs.writeFileSync(file, content, 'utf8')
    return true
  } catch {
    return false
  }
}

/** Writes the Flow region as exactly `sites` (empty = remove). Silent: never prompts. */
function applySites(sites: string[]): void {
  if (process.platform !== 'win32') return
  try {
    const current = readHosts()
    const desired = renderBlock(current, sites)
    if (desired === current) return // the common path: nothing to do
    if (!canWrite()) {
      console.warn('[flow] hosts is not writable; site blocking cannot update')
      return
    }
    fs.writeFileSync(hostsPath(), desired, 'utf8')
    console.log(sites.length > 0 ? `[flow] focus block active for ${sites.length} site(s)` : '[flow] focus block released')
  } catch (err) {
    console.error('[flow] failed to sync the hosts block:', err)
  }
}

/** Reconciles hosts with the timer on every state push. */
export function syncBlocklist(s: BlockState): void {
  const runningFocus = s.timer.phase === 'focus' && s.timer.status === 'running'
  applySites(s.settings.blockDuringFocus && runningFocus ? s.settings.blockedSites : [])
}

/** On quit there is no running focus left, so the region must go too. */
export function releaseBlocklist(): void {
  applySites([])
}

/** Asks once, in plain language, before Windows shows its own prompt. */
async function consent(): Promise<boolean> {
  const win = BrowserWindow.getAllWindows().find((w) => !w.isDestroyed())
  const options: Electron.MessageBoxOptions = {
    type: 'question',
    buttons: ['Not now', 'Continue'],
    defaultId: 0,
    cancelId: 0,
    message: 'Allow Flow to manage website blocking?',
    detail:
      'Windows will ask for administrator permission once. Flow will then add and remove its block list by itself, only while a focus is actually running. Nothing else on your computer is changed.',
  }
  const answer = win ? await dialog.showMessageBox(win, options) : await dialog.showMessageBox(options)
  return answer.response === 1
}

/** One-time UAC grant: elevated icacls gives the current user write access. */
function grantHostsPermission(): Promise<boolean> {
  return new Promise((resolve) => {
    const file = hostsPath().replace(/'/g, "''")
    const ps1 = [
      '$ErrorActionPreference = "Stop"',
      `if (-not (Test-Path -LiteralPath '${file}')) { New-Item -ItemType File -Path '${file}' -Force | Out-Null }`,
      `icacls '${file}' /grant "$env:USERDOMAIN\\$env:USERNAME:(OI)CI:M" | Out-Null`,
      'exit 0',
    ].join('\n')

    const script = path.join(os.tmpdir(), `flow-block-grant-${Date.now()}.ps1`)
    try {
      fs.writeFileSync(script, ps1, 'utf8')
    } catch (err) {
      console.error('[flow] could not stage the permission script:', err)
      resolve(false)
      return
    }

    // The wrapper starts a real elevated process and forwards its exit code.
    const launcher =
      `$p = Start-Process -FilePath powershell.exe -ArgumentList '-NoProfile','-ExecutionPolicy','Bypass','-File','${script.replace(/'/g, "''")}' -Verb RunAs -Wait -PassThru; ` +
      'exit $p.ExitCode'
    execFile(
      'powershell.exe',
      ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', launcher],
      { timeout: 120_000 },
      (err) => {
        try {
          fs.unlinkSync(script)
        } catch {
          // Best-effort cleanup.
        }
        resolve(!err && canWrite())
      },
    )
  })
}

/**
 * The full enable path: consent → UAC grant → writable. Returns false when
 * the user declines anywhere; the caller then leaves blocking off.
 */
export async function enableBlocking(): Promise<boolean> {
  if (process.platform !== 'win32') return false
  if (canWrite()) return true // permission already granted in an earlier session
  const agreed = await consent()
  if (!agreed) return false
  return grantHostsPermission()
}
