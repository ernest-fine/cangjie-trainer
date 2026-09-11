import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Clock } from './Clock'

describe('Clock', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('shows the elapsed value', () => {
    render(<Clock elapsedMs={() => 0} running={false} />)
    expect(screen.getByText('0:00.0')).toBeInTheDocument()
  })

  it('ticks while running', () => {
    let t = 0
    render(<Clock elapsedMs={() => t} running />)
    t = 2500
    act(() => {
      vi.advanceTimersByTime(200)
    })
    expect(screen.getByText('0:02.5')).toBeInTheDocument()
  })

  it('does not tick while not running', () => {
    let t = 1000
    const { rerender } = render(<Clock elapsedMs={() => t} running />)
    act(() => {
      vi.advanceTimersByTime(100)
    })
    rerender(<Clock elapsedMs={() => t} running={false} />)
    t = 9000
    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(screen.getByText('0:01.0')).toBeInTheDocument()
  })
})
