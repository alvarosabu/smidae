import { describe, it, expect } from 'vitest'
import { buildAssetUrl } from '../app/composables/useAssetUrl'

const BASE = 'http://localhost:8055'

describe('buildAssetUrl', () => {
  it('returns null for null input', () => {
    expect(buildAssetUrl(BASE, null)).toBeNull()
  })

  it('returns null for undefined input', () => {
    expect(buildAssetUrl(BASE, undefined)).toBeNull()
  })

  it('builds an asset URL from a file id string', () => {
    expect(buildAssetUrl(BASE, 'abc-123')).toBe('http://localhost:8055/assets/abc-123')
  })

  it('accepts a file object with an id field', () => {
    expect(buildAssetUrl(BASE, { id: 'abc-123' } as any)).toBe('http://localhost:8055/assets/abc-123')
  })

  it('returns null when file object has no id', () => {
    expect(buildAssetUrl(BASE, { id: '' } as any)).toBeNull()
  })

  it('applies width, height, fit, quality transforms', () => {
    const url = buildAssetUrl(BASE, 'abc', { width: 400, height: 300, fit: 'cover', quality: 80 })!
    expect(url).toContain('width=400')
    expect(url).toContain('height=300')
    expect(url).toContain('fit=cover')
    expect(url).toContain('quality=80')
  })

  it('applies a format transform', () => {
    const url = buildAssetUrl(BASE, 'abc', { format: 'webp' })!
    expect(url).toContain('format=webp')
  })

  it('uses a named transform key', () => {
    const url = buildAssetUrl(BASE, 'abc', { key: 'thumb' })!
    expect(url).toContain('key=thumb')
  })

  it('omits transform params that are undefined', () => {
    const url = buildAssetUrl(BASE, 'abc', { width: 400 })!
    expect(url).toContain('width=400')
    expect(url).not.toContain('height=')
    expect(url).not.toContain('fit=')
  })

  it('preserves trailing slash handling correctly', () => {
    expect(buildAssetUrl('http://localhost:8055/', 'abc-123')).toBe('http://localhost:8055/assets/abc-123')
  })
})
