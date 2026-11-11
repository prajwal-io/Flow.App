import { useEffect, useState } from 'react'
import type { ChimeKind, Settings, SettingsPatch } from '../../../shared/types'
import { AMBIENCE_KINDS, CHIME_KINDS } from '../../../shared/types'
import { IDLE_PAUSE_SECONDS } from '../../../shared/constants'
import { api } from '../lib/api'
import { playChime } from '../lib/sound'
import { Switch } from './Switch'

interface BehaviorSectionProps {
  settings: Settings
  shortcutActive: boolean
  onChange: (patch: SettingsPatch) => void
}

const SHORTCUT_KEYS = api.platform === 'darwin' ? ['⌘', '⌥', 'Space'] : ['Ctrl', 'Alt', 'Space']
const IDLE_MINUTES = Math.round(IDLE_PAUSE_SECONDS / 60)

const CHIME_LABELS: Record<ChimeKind, string> = {
  bell: 'Bell',
  wood: 'Wood',
  glass: 'Glass',
  pad: 'Pad',
}

const AMBIENCE_LABELS: Record<(typeof AMBIENCE_KINDS)[number], string> = {
  off: 'Off',
  rain: 'Rain',
  brown: 'Brown noise',
  cafe: 'Café',
}

/** The behaviour half of the expanded panel: focus cadence and app integration. */
export function BehaviorSection({ settings, shortcutActive, onChange }: BehaviorSectionProps) {
  // "Copied" acknowledgment for the presence row; settles back on its own.
  const [copied, setCopied] = useState(false)
  useEffect(() => {
    const off = api.onPresenceCopied(() => setCopied(true))
    return off
  }, [])
  useEffect(() => {
    if (!copied) return
    const timer = setTimeout(() => setCopied(false), 1800)
    return () => clearTimeout(timer)
  }, [copied])

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

        <div className="row">
          <span className="row-label" title="The quiet sound at each phase end">
            Chime
          </span>
          <select
            className="inline-select"
            value={settings.chime}
            aria-label="Chime"
            onChange={(e) => {
              const chime = e.target.value as ChimeKind
              onChange({ chime })
              if (settings.soundEnabled) playChime('focus', chime)
            }}
          >
            {CHIME_KINDS.map((kind) => (
              <option key={kind} value={kind}>
                {CHIME_LABELS[kind]}
              </option>
            ))}
          </select>
        </div>

        <div className="row row--wide">
          <span className="row-copy">
            <span className="row-label">Ambience</span>
            <span className="row-hint">Plays only during running focus</span>
          </span>
          <select
            className="inline-select"
            value={settings.ambience}
            aria-label="Ambience"
            onChange={(e) => onChange({ ambience: e.target.value as (typeof AMBIENCE_KINDS)[number] })}
          >
            {AMBIENCE_KINDS.map((kind) => (
              <option key={kind} value={kind}>
                {AMBIENCE_LABELS[kind]}
              </option>
            ))}
          </select>
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

        <div className="row row--wide">
          <span className="row-copy">
            <span className="row-label">Share focus status</span>
            <span className="row-hint">One honest line for chat · “Focusing until 4:32 PM · Flow 2 of 4”</span>
          </span>
          <button
            type="button"
            className="text-btn"
            aria-label="Copy focus status"
            title="Copy a one-line status to the clipboard"
            onClick={() => api.command({ type: 'copy-presence' })}
          >
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      </section>
    </>
  )
}
