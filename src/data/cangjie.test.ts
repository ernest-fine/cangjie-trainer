import { describe, expect, it } from 'vitest'
import { CANGJIE } from './cangjie'
import { SETS } from './sets'

describe('CANGJIE', () => {
  it('has a code for every character in every set', () => {
    for (const set of SETS) {
      for (const ch of set) {
        expect(CANGJIE[ch], ch).toBeDefined()
      }
    }
  })

  it('has only well-formed codes', () => {
    for (const [ch, code] of Object.entries(CANGJIE)) {
      expect(code, ch).toMatch(/^[A-Z]{1,5}$/)
    }
  })

  it('matches codes typed on the built-in macOS input method', () => {
    expect(CANGJIE['嗰']).toBe('ROWR')
    expect(CANGJIE['草']).toBe('TAJ')
    expect(CANGJIE['係']).toBe('OHVF')
  })

  it('has no entries beyond the sets', () => {
    expect(Object.keys(CANGJIE)).toHaveLength(SETS.flat().length)
  })
})
