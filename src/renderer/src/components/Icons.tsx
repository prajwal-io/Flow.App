interface IconProps {
  size?: number
}

const base = (size: number) => ({
  width: size,
  height: size,
  viewBox: '0 0 16 16',
  'aria-hidden': true as const,
})

export function PlayIcon({ size = 13 }: IconProps) {
  return (
    <svg {...base(size)} fill="currentColor">
      <path d="M5.3 3.55a.55.55 0 0 1 .83-.46l6.05 3.98a.58.58 0 0 1 0 .96L6.13 12.0a.55.55 0 0 1-.83-.46V3.55Z" />
    </svg>
  )
}

export function PauseIcon({ size = 13 }: IconProps) {
  return (
    <svg {...base(size)} fill="currentColor">
      <rect x="4.6" y="3.6" width="2.5" height="8.8" rx="1" />
      <rect x="8.9" y="3.6" width="2.5" height="8.8" rx="1" />
    </svg>
  )
}

export function SkipIcon({ size = 14 }: IconProps) {
  return (
    <svg {...base(size)} fill="currentColor">
      <path d="M4.4 3.7a.5.5 0 0 1 .76-.42l5.1 3.72a.55.55 0 0 1 0 .9L5.16 11.6a.5.5 0 0 1-.76-.42V3.7Z" />
      <rect x="11.35" y="3.3" width="1.3" height="9.4" rx="0.65" />
    </svg>
  )
}

export function ResetIcon({ size = 14 }: IconProps) {
  return (
    <svg {...base(size)} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3.3 8a4.7 4.7 0 1 0 1.6-3.53" />
      <path d="M3 2.9v2.9h2.9" />
    </svg>
  )
}

export function ChevronUpIcon({ size = 14 }: IconProps) {
  return (
    <svg {...base(size)} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4.2 9.8 8 6l3.8 3.8" />
    </svg>
  )
}

export function ChevronDownIcon({ size = 14 }: IconProps) {
  return (
    <svg {...base(size)} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4.2 6.2 8 10l3.8-3.8" />
    </svg>
  )
}

export function CloseIcon({ size = 13 }: IconProps) {
  return (
    <svg {...base(size)} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M4.4 4.4l7.2 7.2M11.6 4.4l-7.2 7.2" />
    </svg>
  )
}

export function PinIcon({ size = 14 }: IconProps) {
  return (
    <svg {...base(size)} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.6 2.4 13.6 6.4l-1.7.5-2.7 2.7.3 2.2-1.4 1.4-4-4L6.1 7l2.2.3 2.7-2.7.6-2.2Z" />
      <path d="M6.1 9.9 2.9 13.1" />
    </svg>
  )
}

export function CheckIcon({ size = 10 }: IconProps) {
  return (
    <svg {...base(size)} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3.2 8.4 6.3 11.5 12.8 5" />
    </svg>
  )
}

export function PlusIcon({ size = 13 }: IconProps) {
  return (
    <svg {...base(size)} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M8 3.4v9.2M3.4 8h9.2" />
    </svg>
  )
}

export function MinusIcon({ size = 13 }: IconProps) {
  return (
    <svg {...base(size)} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M3.4 8h9.2" />
    </svg>
  )
}

export function SoundOnIcon({ size = 14 }: IconProps) {
  return (
    <svg {...base(size)} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8.1 3.2 4.8 6H2.9v4h1.9l3.3 2.8V3.2Z" />
      <path d="M10.6 6.1a2.8 2.8 0 0 1 0 3.8" />
      <path d="M12.4 4.4a5.3 5.3 0 0 1 0 7.2" />
    </svg>
  )
}

export function SoundOffIcon({ size = 14 }: IconProps) {
  return (
    <svg {...base(size)} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8.1 3.2 4.8 6H2.9v4h1.9l3.3 2.8V3.2Z" />
      <path d="M10.8 6.4l3 3.2M13.8 6.4l-3 3.2" />
    </svg>
  )
}

/** Half-filled disc: reads light / dark / auto at a glance. */
export function AppearanceIcon({ size = 14 }: IconProps) {
  return (
    <svg {...base(size)} fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="8" cy="8" r="5.1" />
      <path d="M8 2.9a5.1 5.1 0 0 1 0 10.2Z" fill="currentColor" stroke="none" />
    </svg>
  )
}

/** Two sliders: the native shorthand for preferences. */
export function SettingsIcon({ size = 14 }: IconProps) {
  return (
    <svg {...base(size)} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M2.8 4.6h10.4M2.8 11.4h10.4" />
      <circle cx="6.1" cy="4.6" r="1.6" />
      <circle cx="9.9" cy="11.4" r="1.6" />
    </svg>
  )
}

/** Six-dot reorder handle for a task row. */
export function GripIcon({ size = 12 }: IconProps) {
  return (
    <svg {...base(size)} fill="currentColor">
      <circle cx="5.6" cy="3.4" r="1" />
      <circle cx="10.4" cy="3.4" r="1" />
      <circle cx="5.6" cy="8" r="1" />
      <circle cx="10.4" cy="8" r="1" />
      <circle cx="5.6" cy="12.6" r="1" />
      <circle cx="10.4" cy="12.6" r="1" />
    </svg>
  )
}
