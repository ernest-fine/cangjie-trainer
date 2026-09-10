import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useDrill } from './useDrill'

const order = Array.from({ length: 100 }, (_, i) => String.fromCodePoint(0x4e00 + i))

function fakeClock(start = 1000) {
  let t = start
  return { now: () => t, advance: (ms: number) => void (t += ms) }
}

describe('useDrill', () => {
  it('starts with nothing typed and the first position current', () => {
    const { result } = renderHook(() => useDrill(order))
    expect(result.current.typed).toBe('')
    expect(result.current.states[0]).toBe('current')
    expect(result.current.startedAt).toBeNull()
    expect(result.current.isDone).toBe(false)
  })

  it('ignores input while composing', () => {
    const { result } = renderHook(() => useDrill(order))
    act(() => result.current.onInput('x', true))
    expect(result.current.typed).toBe('')
    expect(result.current.startedAt).toBeNull()
  })

  it('starts the clock on the first committed character', () => {
    const clock = fakeClock(5000)
    const { result } = renderHook(() => useDrill(order, { now: clock.now }))
    act(() => result.current.onInput(order[0], false))
    expect(result.current.startedAt).toBe(5000)
    clock.advance(100)
    act(() => result.current.onInput(order[0] + order[1], false))
    expect(result.current.startedAt).toBe(5000)
  })

  it('tracks wrong characters and never decrements the tally', () => {
    const { result } = renderHook(() => useDrill(order))
    act(() => result.current.onInput('X', false))
    expect(result.current.wrongTally).toBe(1)
    expect(result.current.states[0]).toBe('wrong')
    act(() => result.current.onInput('', false))
    act(() => result.current.onInput(order[0], false))
    expect(result.current.wrongTally).toBe(1)
    expect(result.current.wrongPositions).toEqual([0])
    expect(result.current.states[0]).toBe('correct')
  })

  it('caps typed input at the set length', () => {
    const { result } = renderHook(() => useDrill(order))
    act(() => result.current.onInput(order.join('') + '多', false))
    expect([...result.current.typed]).toHaveLength(100)
  })

  it('ends the run when all positions are filled', () => {
    const clock = fakeClock(0)
    const { result } = renderHook(() => useDrill(order, { now: clock.now }))
    act(() => result.current.onInput(order[0], false))
    clock.advance(60_000)
    act(() => result.current.onInput(order.join(''), false))
    expect(result.current.isDone).toBe(true)
    expect(result.current.endedAt).toBe(60_000)
  })

  it('ignores input after the run is done', () => {
    const { result } = renderHook(() => useDrill(order))
    act(() => result.current.onInput(order.join(''), false))
    act(() => result.current.onInput('', false))
    expect([...result.current.typed]).toHaveLength(100)
  })

  it('restart clears the run and keeps the order', () => {
    const { result } = renderHook(() => useDrill(order))
    act(() => result.current.onInput('X', false))
    const before = result.current.runId
    act(() => result.current.restart())
    expect(result.current.typed).toBe('')
    expect(result.current.wrongTally).toBe(0)
    expect(result.current.startedAt).toBeNull()
    expect(result.current.order).toEqual(order)
    expect(result.current.runId).toBe(before + 1)
  })

  it('scramble clears the run and changes the order', () => {
    const { result } = renderHook(() => useDrill(order, { rng: () => 0.5 }))
    act(() => result.current.onInput('X', false))
    act(() => result.current.scramble())
    expect(result.current.typed).toBe('')
    expect(result.current.wrongTally).toBe(0)
    expect(result.current.order).not.toEqual(order)
    expect([...result.current.order].sort()).toEqual([...order].sort())
  })
})
