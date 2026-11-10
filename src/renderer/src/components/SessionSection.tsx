import type { Settings, SettingsPatch } from '../../../shared/types'
import { Stepper, StepperControl } from './Stepper'

interface SessionSectionProps {
  settings: Settings
  onChange: (patch: SettingsPatch) => void
}

interface Preset {
  name: string
  values: string
  focusMinutes: number
  breakMinutes: number
  longBreakMinutes: number
  longBreakEvery: number
}

const PRESETS: Preset[] = [
  { name: 'Classic', values: '25·5', focusMinutes: 25, breakMinutes: 5, longBreakMinutes: 15, longBreakEvery: 3 },
  { name: 'Deep', values: '50·10', focusMinutes: 50, breakMinutes: 10, longBreakMinutes: 20, longBreakEvery: 3 },
  { name: 'Sprint', values: '15·3', focusMinutes: 15, breakMinutes: 3, longBreakMinutes: 10, longBreakEvery: 3 },
]

export function SessionSection({ settings, onChange }: SessionSectionProps) {
  const activePreset = PRESETS.find(
    (preset) =>
      preset.focusMinutes === settings.focusMinutes &&
      preset.breakMinutes === settings.breakMinutes &&
      preset.longBreakMinutes === settings.longBreakMinutes &&
      preset.longBreakEvery === settings.longBreakEvery,
  )

  return (
    <section className="section">
      <h2 className="section-label">Session</h2>
      <Stepper label="Flows" value={settings.flows} min={1} max={12} onChange={(flows) => onChange({ flows })} />
      <Stepper
        label="Focus length"
        value={settings.focusMinutes}
        min={1}
        max={60}
        suffix="min"
        onChange={(focusMinutes) => onChange({ focusMinutes })}
      />
      <Stepper
        label="Break length"
        value={settings.breakMinutes}
        min={1}
        max={30}
        suffix="min"
        onChange={(breakMinutes) => onChange({ breakMinutes })}
      />

      <div className="row long-break-row">
        <span className="row-label">Long break</span>
        <div className="long-break-controls">
          <StepperControl
            label="Long break length"
            value={settings.longBreakMinutes}
            min={1}
            max={60}
            suffix="min"
            onChange={(longBreakMinutes) => onChange({ longBreakMinutes })}
          />
          <span className="row-hint long-break-every">every</span>
          <select
            className="inline-select"
            value={settings.longBreakEvery}
            onChange={(e) => onChange({ longBreakEvery: Number(e.target.value) })}
            aria-label="Long break every N flows"
            title="Take a long break after this many flows"
          >
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                {i + 1} {i === 0 ? 'flow' : 'flows'}
              </option>
            ))}
          </select>
        </div>
      </div>

      {settings.longBreakEvery >= settings.flows && (
        <p className="row-note">
          {settings.flows === 1
            ? 'A one-flow plan has no breaks.'
            : 'No long break in this plan — the session ends on its last flow.'}
        </p>
      )}

      <div className="presets" role="group" aria-label="Duration presets">
        {PRESETS.map((preset) => {
          const active = activePreset?.name === preset.name
          return (
            <button
              key={preset.name}
              type="button"
              className={`preset${active ? ' is-active' : ''}`}
              aria-pressed={active}
              title={`${preset.name}: ${preset.focusMinutes} min focus, ${preset.breakMinutes} min break, ${preset.longBreakMinutes} min long break`}
              onClick={() =>
                onChange({
                  focusMinutes: preset.focusMinutes,
                  breakMinutes: preset.breakMinutes,
                  longBreakMinutes: preset.longBreakMinutes,
                  longBreakEvery: preset.longBreakEvery,
                })
              }
            >
              <span>{preset.name}</span>
              <span className="preset-values">{preset.values}</span>
            </button>
          )
        })}
      </div>
    </section>
  )
}
