import type { Settings, TimerState, WindowMode } from '../../../shared/types'
import type { PanelView } from '../lib/view'
import { IconButton } from './IconButton'
import { Beads } from './Beads'
import { ChevronDownIcon, ChevronUpIcon, CloseIcon, PinIcon, ReportIcon, SettingsIcon } from './Icons'

interface TitleBarProps {
  settings: Settings
  timer: TimerState
  mode: WindowMode
  view: PanelView
  onViewChange: (view: PanelView) => void
  onToggleAlwaysOnTop: () => void
  onToggleExpand: () => void
  onHide: () => void
  onToggleExpandByDoubleClick: () => void
}

export function TitleBar({
  settings,
  timer,
  mode,
  view,
  onViewChange,
  onToggleAlwaysOnTop,
  onToggleExpand,
  onHide,
  onToggleExpandByDoubleClick,
}: TitleBarProps) {
  return (
    <header
      className="bar"
      onDoubleClick={(e) => {
        if ((e.target as HTMLElement).closest('.bar-actions')) return
        onToggleExpandByDoubleClick()
      }}
    >
      <span className="wordmark">Flow</span>

      <Beads flows={settings.flows} current={timer.currentFlow} done={timer.completedFlows} phase={timer.phase} />

      <div className="bar-actions">
        <IconButton
          label={settings.alwaysOnTop ? 'Disable always on top' : 'Keep always on top'}
          active={settings.alwaysOnTop}
          onClick={onToggleAlwaysOnTop}
        >
          <PinIcon />
        </IconButton>
        {mode === 'expanded' && (
          <>
            <IconButton
              label={view === 'report' ? 'Close report' : 'Weekly report'}
              active={view === 'report'}
              onClick={() => onViewChange(view === 'report' ? 'work' : 'report')}
            >
              <ReportIcon />
            </IconButton>
            <IconButton
              label={view === 'settings' ? 'Close settings' : 'Settings'}
              active={view === 'settings'}
              onClick={() => onViewChange(view === 'settings' ? 'work' : 'settings')}
            >
              <SettingsIcon />
            </IconButton>
          </>
        )}
        <IconButton label={mode === 'compact' ? 'Expand' : 'Collapse'} onClick={onToggleExpand}>
          {mode === 'compact' ? <ChevronUpIcon /> : <ChevronDownIcon />}
        </IconButton>
        <IconButton label="Hide to tray" onClick={onHide}>
          <CloseIcon />
        </IconButton>
      </div>
    </header>
  )
}
