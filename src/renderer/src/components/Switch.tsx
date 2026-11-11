interface SwitchProps {
  checked: boolean
  onChange: () => void
  label: string
  disabled?: boolean
}

/** Small native-style toggle: a 30×18 track with a warm-clay on state. */
export function Switch({ checked, onChange, label, disabled = false }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      title={label}
      className={`switch${checked ? ' is-on' : ''}`}
      onClick={onChange}
      disabled={disabled}
    >
      <span className="switch-knob" />
    </button>
  )
}
