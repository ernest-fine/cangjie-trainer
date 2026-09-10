import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { RunResult } from '../lib/types'
import { Report } from './Report'

const result: RunResult = {
  setIndex: 0,
  order: [...'的一是'],
  elapsedMs: 90_000,
  wrongTally: 5,
  missed: ['的', '是'],
}

describe('Report', () => {
  it('shows speed, accuracy, time, and missed characters', () => {
    render(
      <Report result={result} isNewBest={false} previousBest={undefined} onRetry={() => {}} onRetryScrambled={() => {}} onBack={() => {}} />,
    )
    expect(screen.getByText('67')).toBeInTheDocument()
    expect(screen.getByText('characters per minute')).toBeInTheDocument()
    expect(screen.getByText('95%')).toBeInTheDocument()
    expect(screen.getByText('1:30.0')).toBeInTheDocument()
    expect(screen.getByText('的')).toBeInTheDocument()
    expect(screen.getByText('是')).toBeInTheDocument()
  })

  it('says new best when the run is a record', () => {
    render(
      <Report result={result} isNewBest previousBest={undefined} onRetry={() => {}} onRetryScrambled={() => {}} onBack={() => {}} />,
    )
    expect(screen.getByText('New best')).toBeInTheDocument()
  })

  it('shows the previous best otherwise', () => {
    render(
      <Report
        result={result}
        isNewBest={false}
        previousBest={{ bestMs: 80_000, accuracy: 1, recordedAt: '' }}
        onRetry={() => {}}
        onRetryScrambled={() => {}}
        onBack={() => {}}
      />,
    )
    expect(screen.getByText('Best 1:20.0')).toBeInTheDocument()
  })

  it('shows a no-mistakes message when nothing was missed', () => {
    render(
      <Report result={{ ...result, wrongTally: 0, missed: [] }} isNewBest={false} previousBest={undefined} onRetry={() => {}} onRetryScrambled={() => {}} onBack={() => {}} />,
    )
    expect(screen.getByText('No mistakes')).toBeInTheDocument()
  })

  it('wires the three buttons', async () => {
    const onRetry = vi.fn()
    const onRetryScrambled = vi.fn()
    const onBack = vi.fn()
    render(
      <Report result={result} isNewBest={false} previousBest={undefined} onRetry={onRetry} onRetryScrambled={onRetryScrambled} onBack={onBack} />,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }))
    await userEvent.click(screen.getByRole('button', { name: 'Retry scrambled' }))
    await userEvent.click(screen.getByRole('button', { name: 'Back to sets' }))
    expect(onRetry).toHaveBeenCalled()
    expect(onRetryScrambled).toHaveBeenCalled()
    expect(onBack).toHaveBeenCalled()
  })
})
