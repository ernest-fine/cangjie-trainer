import { describe, expect, it } from 'vitest'
import { CHARACTERS, SETS, SET_COUNT, SET_SIZE } from './sets'

describe('character sets', () => {
  it('has exactly 1000 characters', () => {
    expect([...CHARACTERS]).toHaveLength(SET_COUNT * SET_SIZE)
  })

  it('has no duplicates', () => {
    expect(new Set(CHARACTERS).size).toBe(SET_COUNT * SET_SIZE)
  })

  it('contains only Han characters', () => {
    for (const ch of CHARACTERS) {
      expect(ch).toMatch(/^\p{Script=Han}$/u)
    }
  })

  it('splits into 10 sets of 100 in order', () => {
    expect(SETS).toHaveLength(SET_COUNT)
    for (const set of SETS) expect(set).toHaveLength(SET_SIZE)
    expect(SETS[0][0]).toBe('的')
    expect(SETS[1][0]).toBe([...CHARACTERS][100])
    expect(SETS.flat().join('')).toBe(CHARACTERS)
  })

  it('contains common characters beyond rank 500', () => {
    for (const ch of '般標素適專參注溫餘') {
      expect(CHARACTERS).toContain(ch)
    }
  })

  it('does not contain rare characters', () => {
    for (const ch of '硯壺蟻嶼蝶蜂莓醋襪嗽') {
      expect(CHARACTERS).not.toContain(ch)
    }
  })
})
