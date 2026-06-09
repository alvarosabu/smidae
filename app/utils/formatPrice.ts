export function formatPrice(value: number | null | undefined): string | null {
  if (value == null) return null
  return new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR' }).format(value)
}
