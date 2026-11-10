import { IconButton } from './IconButton'
import { MinusIcon, PlusIcon } from './Icons'

export interface StepperControlProps {
  label: string
  value: number
  min: number
  max: number
  suffix?: string
  onChange: (value: number) => void
}

/** The bare minus / value / plus cluster, for rows with extra controls. */
export function StepperControl({ label, value, min, max, suffix, onChange }: StepperControlProps) {
  const clamp = (n: number) => Math.min(max, Math.max(min, n))

  return (
    <div className="stepper">
      <IconButton label={`Decrease ${label}`} onClick={() => onChange(clamp(value - 1))} disabled={value <= min}>
        <MinusIcon />
      </IconButton>
      <span className="stepper-value">
        {value}
        {suffix ? ` ${suffix}` : ''}
      </span>
      <IconButton label={`Increase ${label}`} onClick={() => onChange(clamp(value + 1))} disabled={value >= max}>
        <PlusIcon />
      </IconButton>
    </div>
  )
}

interface StepperProps extends StepperControlProps {}

/** macOS-preferences-style row: label left, stepper right. */
export function Stepper({ label, value, min, max, suffix, onChange }: StepperProps) {
  return (
    <div className="row">
      <span className="row-label">{label}</span>
      <StepperControl
        label={label}
        value={value}
        min={min}
        max={max}
        suffix={suffix}
        onChange={onChange}
      />
    </div>
  )
}
