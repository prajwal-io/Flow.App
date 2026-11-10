import type { Settings, TimerState, WindowMode } from '../../../shared/types'
import { IconButton } from './IconButton'
import { Beads } from './Beads'
import { ChevronDownIcon, ChevronUpIcon, CloseIcon, PinIcon, SettingsIcon } from './Icons'

interface TitleBarProps {
  settings: Settings
  timer: TimerState
  mode: WindowMode
  settingsOpen: boolean
  onToggleAlwaysOnTop: () => void
  onToggleSettings: () => void
  onToggleExpand: () => void
  onHide: () => void
  onToggleExpandByDoubleClick: () => void
}

export function TitleBar({
  settings,
  timer,
  mode,
  settingsOpen,
  onToggleAlwaysOnTop,
  onToggleSettings,
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
          <IconButton
            label={settingsOpen ? 'Close settings' : 'Settings'}
            active={settingsOpen}
            onClick={onToggleSettings}
          >
            <SettingsIcon />
          </IconButton>
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
