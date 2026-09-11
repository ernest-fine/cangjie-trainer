import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { STRINGS } from '../lib/strings'
import type { RunResult } from '../lib/types'
import { Report } from './Report'

const result: RunResult = {
  setIndex: 0,
  order: [...'的一是'],
  elapsedMs: 90_000,
  wrongCount: 5,
  missed: ['的', '是'],
}

const noop = () => {}

describe('Report', () => {
  it('shows speed, accuracy, time, and missed characters', () => {
    render(<Report result={result} isNewBest={false} previousBest={undefined} onRetry={noop} onRetryScrambled={noop} onBack={noop} />)
    expect(screen.getByRole('heading', { name: STRINGS.setComplete(1) })).toBeInTheDocument()
    expect(screen.getByText('67')).toBeInTheDocument()
    expect(screen.getByText(STRINGS.charsPerMinute)).toBeInTheDocument()
    expect(screen.getByText('95%')).toBeInTheDocument()
    expect(screen.getByText(STRINGS.accuracy)).toBeInTheDocument()
    expect(screen.getByText('1:30.0')).toBeInTheDocument()
    expect(screen.getByText(STRINGS.time)).toBeInTheDocument()
    expect(screen.getByText(STRINGS.missed)).toBeInTheDocument()
    expect(screen.getByText('的')).toBeInTheDocument()
    expect(screen.getByText('是')).toBeInTheDocument()
  })

  it('shows the Cangjie radicals and letters for each missed character', () => {
    render(
      <Report result={{ ...result, missed: ['嗰', '草'] }} isNewBest={false} previousBest={undefined} onRetry={noop} onRetryScrambled={noop} onBack={noop} />,
    )
    const list = screen.getByRole('list', { name: STRINGS.missed })
    const items = within(list).getAllByRole('listitem')
    expect(items).toHaveLength(2)
    expect(items[0]).toHaveTextContent('嗰')
    expect(items[0]).toHaveTextContent('口人田口')
    expect(items[0]).toHaveTextContent('ROWR')
    expect(items[1]).toHaveTextContent('廿日十')
    expect(items[1]).toHaveTextContent('TAJ')
  })

  it('says new best when the run is a record', () => {
    render(<Report result={result} isNewBest previousBest={undefined} onRetry={noop} onRetryScrambled={noop} onBack={noop} />)
    expect(screen.getByText(STRINGS.newBest)).toBeInTheDocument()
  })

  it('shows no record yet when there is no previous best', () => {
    render(<Report result={result} isNewBest={false} previousBest={undefined} onRetry={noop} onRetryScrambled={noop} onBack={noop} />)
    expect(screen.getByText(STRINGS.noRecord)).toBeInTheDocument()
  })

  it('shows the previous best otherwise', () => {
    render(
      <Report
        result={result}
        isNewBest={false}
        previousBest={{ bestMs: 80_000, accuracy: 1, recordedAt: '' }}
        onRetry={noop}
        onRetryScrambled={noop}
        onBack={noop}
      />,
    )
    expect(screen.getByText(STRINGS.best('1:20.0'))).toBeInTheDocument()
  })

  it('shows a no-mistakes message when nothing was missed', () => {
    render(
      <Report result={{ ...result, wrongCount: 0, missed: [] }} isNewBest={false} previousBest={undefined} onRetry={noop} onRetryScrambled={noop} onBack={noop} />,
    )
    expect(screen.getByText(STRINGS.noMistakes)).toBeInTheDocument()
  })

  it('wires the three buttons', async () => {
    const onRetry = vi.fn()
    const onRetryScrambled = vi.fn()
    const onBack = vi.fn()
    render(<Report result={result} isNewBest={false} previousBest={undefined} onRetry={onRetry} onRetryScrambled={onRetryScrambled} onBack={onBack} />)
    await userEvent.click(screen.getByRole('button', { name: STRINGS.retry }))
    await userEvent.click(screen.getByRole('button', { name: STRINGS.retryScrambled }))
    await userEvent.click(screen.getByRole('button', { name: STRINGS.backToSets }))
    expect(onRetry).toHaveBeenCalled()
    expect(onRetryScrambled).toHaveBeenCalled()
    expect(onBack).toHaveBeenCalled()
  })
})
