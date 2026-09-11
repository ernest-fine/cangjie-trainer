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

  it('does not score input while composing', () => {
    const { result } = renderHook(() => useDrill(order))
    act(() => result.current.onInput('x', true))
    expect(result.current.typed).toBe('')
  })

  it('starts the clock on the first keystroke, even mid-composition', () => {
    const clock = fakeClock(5000)
    const { result } = renderHook(() => useDrill(order, { now: clock.now }))
    act(() => result.current.onInput('口', true))
    expect(result.current.startedAt).toBe(5000)
    expect(result.current.isRunning).toBe(true)
    clock.advance(700)
    act(() => result.current.onInput(order[0], false))
    expect(result.current.startedAt).toBe(5000)
    expect(result.current.elapsedMs()).toBe(700)
  })

  it('starts the clock on a committed character when there was no composition', () => {
    const clock = fakeClock(5000)
    const { result } = renderHook(() => useDrill(order, { now: clock.now }))
    act(() => result.current.onInput(order[0], false))
    expect(result.current.startedAt).toBe(5000)
    clock.advance(100)
    act(() => result.current.onInput(order[0] + order[1], false))
    expect(result.current.startedAt).toBe(5000)
  })

  it('does not start the clock from a composition while paused or after the end', () => {
    const clock = fakeClock(0)
    const { result } = renderHook(() => useDrill(order, { now: clock.now }))
    act(() => result.current.onInput(order.join(''), false))
    expect(result.current.isDone).toBe(true)
    act(() => result.current.onInput('口', true))
    expect(result.current.startedAt).toBe(0)
  })

  it('reports wrong positions and forgives them once fixed', () => {
    const { result } = renderHook(() => useDrill(order))
    act(() => result.current.onInput('錯', false))
    expect(result.current.wrongPositions).toEqual([0])
    expect(result.current.states[0]).toBe('wrong')
    act(() => result.current.onInput('', false))
    act(() => result.current.onInput(order[0], false))
    expect(result.current.wrongPositions).toEqual([])
    expect(result.current.states[0]).toBe('correct')
  })

  it('keeps unfixed wrong positions at the end of the run', () => {
    const { result } = renderHook(() => useDrill(order))
    act(() => result.current.onInput('錯' + order.slice(1).join(''), false))
    expect(result.current.isDone).toBe(true)
    expect(result.current.wrongPositions).toEqual([0])
  })

  it('ignores non-Han characters the IME commits for an invalid code', () => {
    const { result } = renderHook(() => useDrill(order))
    const almostDone = order.slice(0, 99).join('')
    act(() => result.current.onInput(almostDone, false))
    act(() => result.current.onInput(almostDone + 'mgmmju', false))
    expect([...result.current.typed]).toHaveLength(99)
    expect(result.current.wrongPositions).toEqual([])
    expect(result.current.isDone).toBe(false)
    act(() => result.current.onInput(almostDone + 'mgmmju' + order[99], false))
    expect(result.current.isDone).toBe(true)
    expect(result.current.wrongPositions).toEqual([])
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
    act(() => result.current.onInput('錯', false))
    const before = result.current.runId
    act(() => result.current.restart())
    expect(result.current.typed).toBe('')
    expect(result.current.wrongPositions).toEqual([])
    expect(result.current.startedAt).toBeNull()
    expect(result.current.order).toEqual(order)
    expect(result.current.runId).toBe(before + 1)
  })

  it('scramble clears the run and changes the order', () => {
    const { result } = renderHook(() => useDrill(order, { rng: () => 0.5 }))
    act(() => result.current.onInput('錯', false))
    act(() => result.current.scramble())
    expect(result.current.typed).toBe('')
    expect(result.current.wrongPositions).toEqual([])
    expect(result.current.order).not.toEqual(order)
    expect([...result.current.order].sort()).toEqual([...order].sort())
  })

  describe('pause', () => {
    it('excludes paused time from elapsedMs', () => {
      const clock = fakeClock(0)
      const { result } = renderHook(() => useDrill(order, { now: clock.now }))
      act(() => result.current.onInput(order[0], false))
      clock.advance(1000)
      act(() => result.current.pause())
      expect(result.current.isPaused).toBe(true)
      expect(result.current.isRunning).toBe(false)
      clock.advance(5000)
      expect(result.current.elapsedMs()).toBe(1000)
      act(() => result.current.resume())
      expect(result.current.isPaused).toBe(false)
      expect(result.current.isRunning).toBe(true)
      clock.advance(2000)
      expect(result.current.elapsedMs()).toBe(3000)
    })

    it('reports the pause-excluded time when the run ends', () => {
      const clock = fakeClock(0)
      const { result } = renderHook(() => useDrill(order, { now: clock.now }))
      act(() => result.current.onInput(order[0], false))
      clock.advance(1000)
      act(() => result.current.pause())
      clock.advance(9000)
      act(() => result.current.resume())
      clock.advance(1000)
      act(() => result.current.onInput(order.join(''), false))
      expect(result.current.isDone).toBe(true)
      expect(result.current.elapsedMs()).toBe(2000)
    })

    it('ignores pause before the clock starts', () => {
      const { result } = renderHook(() => useDrill(order))
      act(() => result.current.pause())
      expect(result.current.isPaused).toBe(false)
      expect(result.current.elapsedMs()).toBe(0)
    })

    it('ignores a second pause and a resume when not paused', () => {
      const clock = fakeClock(0)
      const { result } = renderHook(() => useDrill(order, { now: clock.now }))
      act(() => result.current.onInput(order[0], false))
      act(() => result.current.resume())
      expect(result.current.isPaused).toBe(false)
      expect(result.current.pausedMs).toBe(0)
      clock.advance(100)
      act(() => result.current.pause())
      const firstPausedAt = result.current.pausedAt
      clock.advance(100)
      act(() => result.current.pause())
      expect(result.current.pausedAt).toBe(firstPausedAt)
    })

    it('ignores input while paused', () => {
      const { result } = renderHook(() => useDrill(order))
      act(() => result.current.onInput(order[0], false))
      act(() => result.current.pause())
      act(() => result.current.onInput(order[0] + order[1], false))
      expect([...result.current.typed]).toHaveLength(1)
    })

    it('restart and scramble clear the pause', () => {
      const { result } = renderHook(() => useDrill(order))
      act(() => result.current.onInput(order[0], false))
      act(() => result.current.pause())
      act(() => result.current.restart())
      expect(result.current.isPaused).toBe(false)
      expect(result.current.pausedMs).toBe(0)
      act(() => result.current.onInput(order[0], false))
      act(() => result.current.pause())
      act(() => result.current.scramble())
      expect(result.current.isPaused).toBe(false)
      expect(result.current.pausedMs).toBe(0)
    })

    it('is not running before start or after the end', () => {
      const { result } = renderHook(() => useDrill(order))
      expect(result.current.isRunning).toBe(false)
      act(() => result.current.onInput(order.join(''), false))
      expect(result.current.isRunning).toBe(false)
    })
  })

  describe('time limit', () => {
    it('reports Infinity remaining and never expires without a limit', () => {
      const clock = fakeClock(0)
      const { result } = renderHook(() => useDrill(order, { now: clock.now }))
      act(() => result.current.onInput(order[0], false))
      clock.advance(999_999)
      act(() => result.current.expire())
      expect(result.current.remainingMs()).toBe(Infinity)
      expect(result.current.isExpired).toBe(false)
      expect(result.current.isDone).toBe(false)
    })

    it('counts down and clamps at zero', () => {
      const clock = fakeClock(0)
      const { result } = renderHook(() => useDrill(order, { now: clock.now, limitMs: 60_000 }))
      expect(result.current.remainingMs()).toBe(60_000)
      act(() => result.current.onInput(order[0], false))
      clock.advance(15_000)
      expect(result.current.remainingMs()).toBe(45_000)
      clock.advance(60_000)
      expect(result.current.remainingMs()).toBe(0)
    })

    it('does not expire before the clock starts or before the limit', () => {
      const clock = fakeClock(0)
      const { result } = renderHook(() => useDrill(order, { now: clock.now, limitMs: 60_000 }))
      clock.advance(120_000)
      act(() => result.current.expire())
      expect(result.current.isDone).toBe(false)
      act(() => result.current.onInput(order[0], false))
      clock.advance(59_999)
      act(() => result.current.expire())
      expect(result.current.isDone).toBe(false)
    })

    it('expires at the limit with elapsed exactly the limit, excluding pauses', () => {
      const clock = fakeClock(0)
      const { result } = renderHook(() => useDrill(order, { now: clock.now, limitMs: 60_000 }))
      act(() => result.current.onInput(order[0], false))
      clock.advance(10_000)
      act(() => result.current.pause())
      clock.advance(30_000)
      act(() => result.current.resume())
      clock.advance(49_999)
      act(() => result.current.expire())
      expect(result.current.isDone).toBe(false)
      clock.advance(150)
      act(() => result.current.expire())
      expect(result.current.isDone).toBe(true)
      expect(result.current.isExpired).toBe(true)
      expect(result.current.elapsedMs()).toBe(60_000)
      expect(result.current.remainingMs()).toBe(0)
    })

    it('ignores input after expiry', () => {
      const clock = fakeClock(0)
      const { result } = renderHook(() => useDrill(order, { now: clock.now, limitMs: 1_000 }))
      act(() => result.current.onInput(order[0], false))
      clock.advance(1_000)
      act(() => result.current.expire())
      act(() => result.current.onInput(order[0] + order[1], false))
      expect([...result.current.typed]).toHaveLength(1)
    })

    it('does not expire while paused', () => {
      const clock = fakeClock(0)
      const { result } = renderHook(() => useDrill(order, { now: clock.now, limitMs: 1_000 }))
      act(() => result.current.onInput(order[0], false))
      clock.advance(500)
      act(() => result.current.pause())
      clock.advance(5_000)
      act(() => result.current.expire())
      expect(result.current.isDone).toBe(false)
    })
  })
})
