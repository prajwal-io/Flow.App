import type { AppState, SettingsPatch, ThemePreference } from '../../../shared/types'
import type { PanelView } from '../lib/view'
import { BehaviorSection } from './BehaviorSection'
import { BlockSection } from './BlockSection'
import { DataSection } from './DataSection'
import { KeysSection } from './KeysSection'
import { ReportSection } from './ReportSection'
import { SessionSection } from './SessionSection'
import { TasksSection } from './TasksSection'
import { TodayFooter } from './TodayFooter'

interface ExpandedPanelProps {
  state: AppState
  view: PanelView
  onViewChange: (view: PanelView) => void
  onSettingsChange: (patch: SettingsPatch) => void
  onThemeChange: (theme: ThemePreference) => void
}

/** Expanded mode: the working plan, its settings or report, and the week's tally. */
export function ExpandedPanel({ state, view, onViewChange, onSettingsChange, onThemeChange }: ExpandedPanelProps) {
  return (
    <div className="panel">
      {view === 'settings' ? (
        <>
          <BehaviorSection
            settings={state.settings}
            shortcutActive={state.shortcutActive}
            onChange={onSettingsChange}
          />
          <BlockSection settings={state.settings} onChange={onSettingsChange} />
          <DataSection />
          <KeysSection />
        </>
      ) : view === 'report' ? (
        <ReportSection state={state} />
      ) : (
        <>
          <SessionSection settings={state.settings} onChange={onSettingsChange} />
          <TasksSection tasks={state.tasks} currentFlow={state.timer.currentFlow} flows={state.settings.flows} />
        </>
      )}
      <TodayFooter
        history={state.history}
        lastRepairAt={state.lastRepairAt}
        settings={state.settings}
        timer={state.timer}
        onViewReport={() => onViewChange('report')}
        onToggleSound={() => onSettingsChange({ soundEnabled: !state.settings.soundEnabled })}
        onCycleTheme={onThemeChange}
      />
    </div>
  )
}
