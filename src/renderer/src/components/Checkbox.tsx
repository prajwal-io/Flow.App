import { CheckIcon } from './Icons'

interface CheckboxProps {
  checked: boolean
  onChange: () => void
  label: string
}

export function Checkbox({ checked, onChange, label }: CheckboxProps) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      className={`check${checked ? ' is-checked' : ''}`}
      onClick={onChange}
    >
      <CheckIcon size={9} />
    </button>
  )
}
