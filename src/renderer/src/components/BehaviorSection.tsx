import type { Settings, SettingsPatch } from '../../../shared/types'
import { IDLE_PAUSE_SECONDS } from '../../../shared/constants'
import { api } from '../lib/api'
import { Switch } from './Switch'

interface BehaviorSectionProps {
  settings: Settings
  shortcutActive: boolean
  onChange: (patch: SettingsPatch) => void
}

const SHORTCUT_KEYS = api.platform === 'darwin' ? ['⌘', '⌥', 'Space'] : ['Ctrl', 'Alt', 'Space']
const IDLE_MINUTES = Math.round(IDLE_PAUSE_SECONDS / 60)

/** The behaviour half of the expanded panel: focus cadence and app integration. */
export function BehaviorSection({ settings, shortcutActive, onChange }: BehaviorSectionProps) {
  return (
    <>
      <section className="section behavior">
        <h2 className="section-label">Focus</h2>

        <div className="row">
          <span className="row-label">Auto-start breaks</span>
          <Switch
            checked={settings.autoStartBreaks}
            onChange={() => onChange({ autoStartBreaks: !settings.autoStartBreaks })}
            label="Start breaks automatically"
          />
        </div>

        <div className="row">
          <span className="row-label">Auto-start focus</span>
          <Switch
            checked={settings.autoStartFocus}
            onChange={() => onChange({ autoStartFocus: !settings.autoStartFocus })}
            label="Start the next focus automatically after a break"
          />
        </div>

        <div className="row row--wide">
          <span className="row-copy">
            <span className="row-label">Pause when away</span>
            <span className="row-hint">{IDLE_MINUTES} min idle · away time isn't counted</span>
          </span>
          <Switch
            checked={settings.pauseWhenIdle}
            onChange={() => onChange({ pauseWhenIdle: !settings.pauseWhenIdle })}
            label={`Pause when away for ${IDLE_MINUTES} minutes; that time is not counted as focus`}
          />
        </div>
      </section>

      <section className="section behavior">
        <h2 className="section-label">App</h2>

        <div className="row">
          <span className="row-label">Launch at login</span>
          <Switch
            checked={settings.launchAtLogin}
            onChange={() => onChange({ launchAtLogin: !settings.launchAtLogin })}
            label="Launch at login"
          />
        </div>

        <div className="row row--wide">
          <span className="row-copy">
            <span className="row-label">Global shortcut</span>
            {!settings.globalShortcutEnabled ? (
              <span className="row-hint">Off</span>
            ) : shortcutActive ? (
              <span className="row-hint">
                {SHORTCUT_KEYS.map((key) => (
                  <kbd key={key} className="keycap">
                    {key}
                  </kbd>
                ))}
              </span>
            ) : (
              <span className="row-hint is-warn">Unavailable — in use</span>
            )}
          </span>
          <Switch
            checked={settings.globalShortcutEnabled}
            onChange={() => onChange({ globalShortcutEnabled: !settings.globalShortcutEnabled })}
            label="Global shortcut: start or pause from anywhere"
          />
        </div>

        <div className="row">
          <span className="row-label" title="Pause the timer when the screen locks or the computer sleeps">
            Pause when locked
          </span>
          <Switch
            checked={settings.pauseOnLock}
            onChange={() => onChange({ pauseOnLock: !settings.pauseOnLock })}
            label="Pause when locked or asleep"
          />
        </div>
      </section>
    </>
  )
}
