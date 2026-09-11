import { describe, expect, it } from 'vitest'
import { ATTACK_ORDER_LENGTH, attackCpm, randomOrder, windowStart } from './attack'

const pool = [...'的一是不了在人有我他']

function seeded(seed: number) {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296
    return s / 4294967296
  }
}

describe('randomOrder', () => {
  it('draws the requested length from the pool', () => {
    const order = randomOrder(pool, 50, seeded(1))
    expect(order).toHaveLength(50)
    for (const ch of order) expect(pool).toContain(ch)
  })

  it('defaults to ATTACK_ORDER_LENGTH characters', () => {
    expect(randomOrder(pool, undefined, seeded(2))).toHaveLength(ATTACK_ORDER_LENGTH)
  })

  it('never repeats a character immediately', () => {
    const order = randomOrder(pool, 600, seeded(3))
    for (let i = 1; i < order.length; i++) expect(order[i]).not.toBe(order[i - 1])
  })

  it('is deterministic for a given rng', () => {
    expect(randomOrder(pool, 30, seeded(4))).toEqual(randomOrder(pool, 30, seeded(4)))
  })

  it('terminates and still avoids repeats with a constant rng', () => {
    const order = randomOrder(pool, 20, () => 0.3)
    expect(order).toHaveLength(20)
    for (let i = 1; i < order.length; i++) expect(order[i]).not.toBe(order[i - 1])
  })

  it('uses more than a handful of the pool', () => {
    expect(new Set(randomOrder(pool, 100, seeded(5))).size).toBeGreaterThan(5)
  })
})

describe('attackCpm', () => {
  it('divides correct characters by the time actually run', () => {
    expect(attackCpm({ elapsedMs: 120_000, correctCount: 137 })).toBe(69)
    expect(attackCpm({ elapsedMs: 30_000, correctCount: 60 })).toBe(120)
  })
})

describe('windowStart', () => {
  it('keeps the first row on top until the cursor reaches row two', () => {
    expect(windowStart(0)).toBe(0)
    expect(windowStart(19)).toBe(0)
    expect(windowStart(20)).toBe(0)
    expect(windowStart(39)).toBe(0)
  })

  it('stops sliding so the last three rows stay full', () => {
    expect(windowStart(560, 600)).toBe(540)
    expect(windowStart(580, 600)).toBe(540)
    expect(windowStart(599, 600)).toBe(540)
    expect(windowStart(40, 600)).toBe(20)
    expect(windowStart(50, 50)).toBe(0)
  })

  it('keeps the cursor row in the middle afterwards', () => {
    expect(windowStart(40)).toBe(20)
    expect(windowStart(59)).toBe(20)
    expect(windowStart(60)).toBe(40)
    expect(windowStart(123)).toBe(100)
  })
})
