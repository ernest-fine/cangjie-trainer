import { describe, expect, it } from 'vitest'
import { RADICALS, radicalsFor } from './cangjie'

describe('RADICALS', () => {
  it('covers all 26 Cangjie keys', () => {
    expect(Object.keys(RADICALS).sort().join('')).toBe('ABCDEFGHIJKLMNOPQRSTUVWXYZ')
    expect(RADICALS.A).toBe('日')
    expect(RADICALS.X).toBe('難')
    expect(RADICALS.Z).toBe('重')
  })
})

describe('radicalsFor', () => {
  it('maps a code to its radicals', () => {
    expect(radicalsFor('ROWR')).toBe('口人田口')
    expect(radicalsFor('TAJ')).toBe('廿日十')
    expect(radicalsFor('X')).toBe('難')
  })

  it('throws on a letter that is not a Cangjie key', () => {
    expect(() => radicalsFor('R1')).toThrow(/not a Cangjie key/)
  })
})
