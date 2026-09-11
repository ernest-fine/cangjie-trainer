import { describe, expect, it } from 'vitest'
import { STRINGS } from './strings'

describe('STRINGS', () => {
  it('embeds numbers with spaces on both sides', () => {
    expect(STRINGS.setName(1)).toBe('第 1 組')
    expect(STRINGS.setRange(1, 100)).toBe('第 1 至 100 字')
    expect(STRINGS.setComplete(3)).toBe('第 3 組完成')
    expect(STRINGS.best('1:20.0')).toBe('最佳 1:20.0')
  })

  it('is frozen', () => {
    expect(Object.isFrozen(STRINGS)).toBe(true)
  })

  it('formats the time attack strings', () => {
    expect(STRINGS.minutes(2)).toBe('2 分鐘')
    expect(STRINGS.attackTitle(3)).toBe('限時挑戰 · 3 分鐘')
    expect(STRINGS.charsUnit(137)).toBe('137 字')
  })
})
