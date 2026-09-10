import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Clock } from './Clock'

describe('Clock', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('shows zero before the run starts', () => {
    render(<Clock startedAt={null} endedAt={null} now={() => 0} />)
    expect(screen.getByText('0:00.0')).toBeInTheDocument()
  })

  it('ticks while running', () => {
    let t = 1000
    render(<Clock startedAt={1000} endedAt={null} now={() => t} />)
    t = 3500
    act(() => {
      vi.advanceTimersByTime(200)
    })
    expect(screen.getByText('0:02.5')).toBeInTheDocument()
  })

  it('freezes at the end time', () => {
    render(<Clock startedAt={0} endedAt={65_340} now={() => 999_999} />)
    expect(screen.getByText('1:05.3')).toBeInTheDocument()
  })
})
