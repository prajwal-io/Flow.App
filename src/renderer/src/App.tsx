import { useEffect, useRef, useState } from 'react'
import type { SettingsPatch, ThemePreference } from '../../shared/types'
import { api } from './lib/api'
import { runCaptureScenarios } from './lib/capture'
import { formatClock } from './lib/format'
import { playChime } from './lib/sound'
import { useRemainingMs, useTheme } from './lib/hooks'
import { useAppState } from './state'
import { TitleBar } from './components/TitleBar'
import { TimerFace } from './components/TimerFace'
import { CurrentTaskRow } from './components/CurrentTaskRow'
import { ExpandedPanel } from './components/ExpandedPanel'

export default function App() {
  const state = useAppState()
  const remaining = useRemainingMs(state?.timer)
  const [settingsOpen, setSettingsOpen] = useState(false)

  useTheme(state?.settings.theme ?? 'system')

  // Latest settings for the phase-end handler without re-subscribing.
  const soundRef = useRef(true)
  useEffect(() => {
    soundRef.current = state?.settings.soundEnabled ?? true
  }, [state?.settings.soundEnabled])

  useEffect(() => {
    return api.onPhaseEnd((kind) => {
      if (soundRef.current) playChime(kind)
    })
  }, [])

  // Dev-only capture scenarios: launched with FLOW_SHOT=<name[,name...]>.
  useEffect(() => {
    if (!import.meta.env.DEV) return
    const shot = new URLSearchParams(window.location.search).get('shot')
    if (shot) void runCaptureScenarios(shot)
  }, [])

  const expanded = state?.windowMode === 'expanded'

  useEffect(() => {
    if (!expanded) setSettingsOpen(false)
  }, [expanded])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return

      const el = e.target as HTMLElement | null
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable)) return

      // Space on a focused control belongs to that control, not the timer.
      if (e.code === 'Space' && el?.closest('button, a, [role="button"], [role="checkbox"]')) return

      if (e.code === 'Space') {
        e.preventDefault()
        api.command({ type: 'toggle' })
      } else if (e.key.toLowerCase() === 's') {
        e.preventDefault()
        api.command({ type: 'skip' })
      } else if (e.key.toLowerCase() === 'r') {
        e.preventDefault()
        api.command({ type: 'reset' })
      } else if (e.key === 'Escape') {
        e.preventDefault()
        if (settingsOpen) setSettingsOpen(false)
        else api.command(expanded ? { type: 'set-expanded', expanded: false } : { type: 'hide-window' })
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [expanded, settingsOpen])

  if (!state) return <div className="app app--boot" />

  const { settings, timer } = state
  const focusMs = settings.focusMinutes * 60_000
  const breakMs = settings.breakMinutes * 60_000
  // The phase's own planned duration, not a setting the user may have changed since.
  const total = timer.phaseDurationMs > 0 ? timer.phaseDurationMs : timer.phase === 'break' ? breakMs : focusMs
  const progress = timer.phase === 'done' ? 1 : total > 0 ? Math.min(1, Math.max(0, 1 - remaining / total)) : 0
  const clock = timer.phase === 'done' ? '00:00' : formatClock(remaining)
  const activeTask = state.tasks.find((t) => t.id === state.activeTaskId) ?? null

  const updateSettings = (patch: SettingsPatch) =>
    api.command({ type: 'update-settings', patch })

  const toggleExpand = () => api.command({ type: 'set-expanded', expanded: !expanded })

  return (
    <div className="app" data-mode={state.windowMode} data-phase={timer.phase} data-status={timer.status}>
      <TitleBar
        settings={settings}
        timer={timer}
        mode={state.windowMode}
        settingsOpen={settingsOpen}
        onToggleAlwaysOnTop={() => api.command({ type: 'set-always-on-top', on: !settings.alwaysOnTop })}
        onToggleSettings={() => setSettingsOpen((open) => !open)}
        onToggleExpand={toggleExpand}
        onToggleExpandByDoubleClick={toggleExpand}
        onHide={() => api.command({ type: 'hide-window' })}
      />

      <TimerFace
        timer={timer}
        flows={settings.flows}
        clock={clock}
        progress={progress}
        large={!expanded}
        onToggle={() => api.command({ type: 'toggle' })}
        onReset={() => api.command({ type: 'reset' })}
        onSkip={() => api.command({ type: 'skip' })}
      />

      {expanded ? (
        <ExpandedPanel
          state={state}
          settingsOpen={settingsOpen}
          onSettingsChange={updateSettings}
          onThemeChange={(theme: ThemePreference) => updateSettings({ theme })}
        />
      ) : (
        <CurrentTaskRow task={activeTask} onToggle={(id) => api.command({ type: 'toggle-task', id })} />
      )}
    </div>
  )
}
