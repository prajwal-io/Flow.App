import type { Settings } from '../../../shared/types'
import { api } from './api'

/**
 * Dev-only capture harness. Launching the app with FLOW_SHOT=<scenario> drives
 * real commands against the real engine, screenshots the result, and tidies up,
 * producing honest evidence for the design review.
 */

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

const DEMO_TASKS = [
  { text: 'Draft the quarterly outline', flow: 1 as const },
  { text: 'Review pull request #412', flow: 2 as const },
  { text: 'Clear inbox to zero', flow: 'all' as const },
]

async function addDemoTasks(): Promise<void> {
  for (const task of DEMO_TASKS) {
    api.command({ type: 'add-task', text: task.text, flow: task.flow })
  }
  await wait(120)
}

function setTheme(theme: 'light' | 'dark'): void {
  api.command({ type: 'update-settings', patch: { theme } })
}

let originalSettings: Settings | null = null

async function cleanup(): Promise<void> {
  const state = await api.getState()
  for (const task of state.tasks) {
    if (DEMO_TASKS.some((d) => d.text === task.text)) api.command({ type: 'delete-task', id: task.id })
  }
  api.command({ type: 'reset' })
  if (originalSettings) {
    const {
      flows,
      focusMinutes,
      breakMinutes,
      longBreakMinutes,
      longBreakEvery,
      autoStartBreaks,
      autoStartFocus,
      pauseWhenIdle,
      soundEnabled,
      launchAtLogin,
      pauseOnLock,
      globalShortcutEnabled,
      theme,
    } = originalSettings
    api.command({
      type: 'update-settings',
      patch: {
        flows,
        focusMinutes,
        breakMinutes,
        longBreakMinutes,
        longBreakEvery,
        autoStartBreaks,
        autoStartFocus,
        pauseWhenIdle,
        soundEnabled,
        launchAtLogin,
        pauseOnLock,
        globalShortcutEnabled,
        theme,
      },
    })
  }
  api.command({ type: 'set-expanded', expanded: false })
  await wait(350)
}

let alreadyRan = false

/** Runs one or more comma-separated scenarios in sequence, once. */
export async function runCaptureScenarios(param: string): Promise<void> {
  if (alreadyRan) return // StrictMode runs effects twice; capture once.
  alreadyRan = true
  await wait(450) // window paint + first state push
  originalSettings = (await api.getState()).settings

  // Each scenario cleans up after itself, restoring the profile's settings and
  // an empty plan, so a batch never compounds the previous shot's state.
  for (const name of param.split(',').map((s) => s.trim()).filter(Boolean)) {
    await runCaptureScenario(name)
  }

  api.captureDone()
}

async function runCaptureScenario(name: string): Promise<void> {
  switch (name) {
    case 'compact-idle':
      break

    case 'compact-focus': {
      setTheme('light')
      await addDemoTasks()
      api.command({ type: 'start' })
      await wait(700)
      await api.capture('compact-light')
      break
    }

    case 'compact-break': {
      setTheme('light')
      await addDemoTasks()
      api.command({ type: 'start' })
      await wait(300)
      api.command({ type: 'skip' })
      await wait(700)
      await api.capture('compact-break')
      break
    }

    case 'compact-flow2': {
      setTheme('light')
      await addDemoTasks()
      api.command({ type: 'start' })
      await wait(300)
      api.command({ type: 'skip' })
      await wait(300)
      api.command({ type: 'skip' })
      await wait(700)
      await api.capture('compact-flow2')
      break
    }

    case 'expanded-light': {
      setTheme('light')
      await addDemoTasks()
      api.command({ type: 'set-expanded', expanded: true })
      await wait(750)
      await api.capture('expanded-light')
      break
    }

    case 'expanded-dark': {
      setTheme('dark')
      await addDemoTasks()
      api.command({ type: 'set-expanded', expanded: true })
      await wait(850)
      await api.capture('expanded-dark')
      break
    }

    case 'compact-dark': {
      setTheme('dark')
      await addDemoTasks()
      api.command({ type: 'start' })
      await wait(700)
      await api.capture('compact-dark')
      break
    }

    case 'compact-done': {
      setTheme('light')
      await addDemoTasks()
      api.command({ type: 'start' })
      await wait(300)
      // focus1 → break → f2 → break → f3 → break → f4 → done
      for (let i = 0; i < 7; i += 1) {
        api.command({ type: 'skip' })
        await wait(250)
      }
      await api.capture('compact-done')
      break
    }

    case 'compact-paused': {
      setTheme('light')
      await addDemoTasks()
      api.command({ type: 'start' })
      await wait(600)
      api.command({ type: 'pause' })
      await wait(400)
      await api.capture('compact-paused')
      break
    }

    case 'tasks-checked': {
      setTheme('light')
      await addDemoTasks()
      await wait(150)
      const s = await api.getState()
      const done = s.tasks.filter((t) => t.text !== 'Clear inbox to zero')
      for (const t of done) api.command({ type: 'toggle-task', id: t.id })
      await wait(250)
      api.command({ type: 'set-expanded', expanded: true })
      await wait(750)
      await api.capture('tasks-checked')
      break
    }

    case 'compact-long-break': {
      setTheme('light')
      await addDemoTasks()
      api.command({
        type: 'update-settings',
        patch: { flows: 4, longBreakEvery: 1, autoStartBreaks: true },
      })
      await wait(180)
      api.command({ type: 'start' })
      await wait(300)
      api.command({ type: 'skip' })
      await wait(550)
      await api.capture('compact-long-break')
      break
    }

    case 'compact-away': {
      setTheme('light')
      await addDemoTasks()
      api.command({ type: 'start' })
      await wait(900)
      api.command({ type: 'dev-pause-away', idleSeconds: 300 })
      await wait(450)
      await api.capture('compact-away')
      break
    }

    case 'expanded-settings': {
      setTheme('light')
      await addDemoTasks()
      api.command({ type: 'set-expanded', expanded: true })
      await wait(750)
      document.querySelector<HTMLButtonElement>('button[aria-label="Settings"]')?.click()
      await wait(350)
      await api.capture('expanded-settings')
      break
    }

    case 'expanded-done': {
      setTheme('light')
      api.command({
        type: 'update-settings',
        patch: {
          flows: 4,
          focusMinutes: 25,
          breakMinutes: 5,
          longBreakMinutes: 15,
          longBreakEvery: 3,
          autoStartBreaks: true,
          autoStartFocus: true,
        },
      })
      await wait(180)
      await addDemoTasks()
      api.command({ type: 'reset' })
      await wait(120)
      api.command({ type: 'set-expanded', expanded: true })
      await wait(750)
      api.command({ type: 'start' })
      await wait(300)
      // focus1 → break → f2 → break → f3 → long break → f4 → done
      for (let i = 0; i < 7; i += 1) {
        api.command({ type: 'skip' })
        await wait(230)
      }
      await wait(350)
      await api.capture('expanded-done')
      break
    }

    default:
      return
  }

  await cleanup()
}