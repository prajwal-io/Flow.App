interface SwitchProps {
  checked: boolean
  onChange: () => void
  label: string
}

/** Small native-style toggle: a 30×18 track with a warm-clay on state. */
export function Switch({ checked, onChange, label }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      title={label}
      className={`switch${checked ? ' is-on' : ''}`}
      onClick={onChange}
    >
      <span className="switch-knob" />
    </button>
  )
}
