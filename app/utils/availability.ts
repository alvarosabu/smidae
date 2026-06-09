type BadgeColor = 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'error' | 'neutral'

export const AVAILABILITY = [
  { value: 'available', label: 'Available', color: 'success' },
  { value: 'eol', label: 'End-of-Life', color: 'warning' },
  { value: 'discontinued', label: 'Discontinued', color: 'error' }
] as const satisfies ReadonlyArray<{ value: string, label: string, color: BadgeColor }>

export type Availability = typeof AVAILABILITY[number]['value']

const DEFAULT = AVAILABILITY[0]

/** Resolve an availability value to its label + badge color, defaulting to Available. */
export function getAvailability(value?: string | null) {
  return AVAILABILITY.find(a => a.value === value) ?? DEFAULT
}
