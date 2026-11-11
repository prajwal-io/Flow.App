import { useState } from 'react'
import type { Settings, SettingsPatch } from '../../../shared/types'
import { api } from '../lib/api'
import { Switch } from './Switch'

interface BlockSectionProps {
  settings: Settings
  onChange: (patch: SettingsPatch) => void
}

const isWindows = api.platform === 'win32'

/**
 * Distraction blocking: domains go unreachable only while a focus is running,
 * in every browser, through the system hosts file. Windows only for now.
 */
export function BlockSection({ settings, onChange }: BlockSectionProps) {
  const [draft, setDraft] = useState('')

  const addSite = (): void => {
    const next = draft.trim()
    if (!next) return
    onChange({ blockedSites: [...settings.blockedSites, next] })
    setDraft('')
  }

  const removeSite = (site: string): void => {
    onChange({ blockedSites: settings.blockedSites.filter((host) => host !== site) })
  }

  return (
    <section className="section">
      <h2 className="section-label">Block</h2>

      <div className="row row--wide">
        <span className="row-copy">
          <span className="row-label">Block sites during focus</span>
          <span className="row-hint">
            {isWindows ? 'Only while a focus is running' : 'Windows only — not available on macOS yet'}
          </span>
        </span>
        <Switch
          checked={settings.blockDuringFocus}
          disabled={!isWindows}
          onChange={() => onChange({ blockDuringFocus: !settings.blockDuringFocus })}
          label="Block listed sites while a focus is actually running"
        />
      </div>

      {settings.blockedSites.length > 0 && (
        <ul className="site-list">
          {settings.blockedSites.map((site) => (
            <li key={site} className="site-row">
              <span className="site-host">{site}</span>
              <button
                type="button"
                className="site-remove"
                aria-label={`Remove ${site}`}
                title={`Remove ${site}`}
                onClick={() => removeSite(site)}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="site-add">
        <input
          className="site-input"
          type="text"
          value={draft}
          placeholder="example.com"
          aria-label="Site to block"
          title="A domain like example.com — Enter adds it"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              addSite()
            }
          }}
        />
        <button type="button" className="text-btn" disabled={!draft.trim()} onClick={addSite}>
          Add
        </button>
      </div>

      <p className="row-note">
        {settings.blockDuringFocus && settings.blockedSites.length === 0
          ? 'No sites yet — add one below and it goes down on your next running focus.'
          : 'Works in every browser. Breaks and pauses stay open on purpose.'}
      </p>
    </section>
  )
}
