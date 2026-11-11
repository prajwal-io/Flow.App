import { useEffect, useRef, useState } from 'react'
import type { ChimeKind, SettingsPatch, ThemePreference } from '../../shared/types'
import { api } from './lib/api'
import { setAmbience } from './lib/ambience'
import { runCaptureScenarios } from './lib/capture'
import { formatClock } from './lib/format'
import { playChime } from './lib/sound'
import { useRemainingMs, useTheme } from './lib/hooks'
import type { PanelView } from './lib/view'
import { useAppState } from './state'
import { TitleBar } from './components/TitleBar'
import { TimerFace } from './components/TimerFace'
import { CurrentTaskRow } from './components/CurrentTaskRow'
import { ExpandedPanel } from './components/ExpandedPanel'

export default function App() {
  const state = useAppState()
  const remaining = useRemainingMs(state?.timer)
  const [view, setView] = useState<PanelView>('work')

  useTheme(state?.settings.theme ?? 'system')

  // Latest sound prefs for the phase-end handler without re-subscribing.
  const soundRef = useRef(true)
  const chimeRef = useRef<ChimeKind>('bell')
  useEffect(() => {
    soundRef.current = state?.settings.soundEnabled ?? true
    chimeRef.current = state?.settings.chime ?? 'bell'
  }, [state?.settings.soundEnabled, state?.settings.chime])

  useEffect(() => {
    return api.onPhaseEnd((kind) => {
      if (soundRef.current) playChime(kind, chimeRef.current)
    })
  }, [])

  // Ambience is the sound of honest focus: running focus only — never breaks,
  // pauses, or away time.
  const ambience = state?.settings.ambience ?? 'off'
  const focusing = state?.timer.phase === 'focus' && state?.timer.status === 'running'
  useEffect(() => {
    setAmbience(focusing ? ambience : 'off')
    return () => setAmbience('off')
  }, [focusing, ambience])

  // Dev-only capture scenarios: launched with FLOW_SHOT=<name[,name...]>.
  useEffect(() => {
    if (!import.meta.env.DEV) return
    const shot = new URLSearchParams(window.location.search).get('shot')
    if (shot) void runCaptureScenarios(shot)
  }, [])

  const expanded = state?.windowMode === 'expanded'

  useEffect(() => {
    if (!expanded) setView('work')
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
        if (view !== 'work') setView('work')
        else api.command(expanded ? { type: 'set-expanded', expanded: false } : { type: 'hide-window' })
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [expanded, view])

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
        view={view}
        onViewChange={setView}
        onToggleAlwaysOnTop={() => api.command({ type: 'set-always-on-top', on: !settings.alwaysOnTop })}
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
          view={view}
          onViewChange={setView}
          onSettingsChange={updateSettings}
          onThemeChange={(theme: ThemePreference) => updateSettings({ theme })}
        />
      ) : (
        <CurrentTaskRow task={activeTask} onToggle={(id) => api.command({ type: 'toggle-task', id })} />
      )}
    </div>
  )
}
