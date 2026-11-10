import type { AppState, SettingsPatch, ThemePreference } from '../../../shared/types'
import { BehaviorSection } from './BehaviorSection'
import { DataSection } from './DataSection'
import { KeysSection } from './KeysSection'
import { SessionSection } from './SessionSection'
import { TasksSection } from './TasksSection'
import { TodayFooter } from './TodayFooter'

interface ExpandedPanelProps {
  state: AppState
  settingsOpen: boolean
  onSettingsChange: (patch: SettingsPatch) => void
  onThemeChange: (theme: ThemePreference) => void
}

/** Expanded mode: the working plan, tasks, settings, and the week's tally. */
export function ExpandedPanel({ state, settingsOpen, onSettingsChange, onThemeChange }: ExpandedPanelProps) {
  return (
    <div className="panel">
      {settingsOpen ? (
        <>
          <BehaviorSection
            settings={state.settings}
            shortcutActive={state.shortcutActive}
            onChange={onSettingsChange}
          />
          <DataSection />
          <KeysSection />
        </>
      ) : (
        <>
          <SessionSection settings={state.settings} onChange={onSettingsChange} />
          <TasksSection tasks={state.tasks} currentFlow={state.timer.currentFlow} flows={state.settings.flows} />
        </>
      )}
      <TodayFooter
        history={state.history}
        settings={state.settings}
        timer={state.timer}
        onToggleSound={() => onSettingsChange({ soundEnabled: !state.settings.soundEnabled })}
        onCycleTheme={onThemeChange}
      />
    </div>
  )
}
