import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { STRINGS } from '../lib/strings'
import type { RunResult } from '../lib/types'
import { Report } from './Report'

const result: RunResult = {
  kind: 'set',
  setIndex: 0,
  durationMs: 0,
  order: [...'的一是'],
  elapsedMs: 90_000,
  typedCount: 100,
  correctCount: 95,
  wrongCount: 5,
  missed: ['的', '是'],
}

const noop = () => {}

describe('Report', () => {
  it('shows speed, accuracy, time, and missed characters', () => {
    render(<Report result={result} isNewBest={false} previousBestText={undefined} onRetry={noop} onRetryScrambled={noop} onBack={noop} />)
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
      <Report
        result={{ ...result, missed: ['嗰', '草'] }}
        isNewBest={false}
        previousBestText={undefined}
        onRetry={noop}
        onRetryScrambled={noop}
        onBack={noop}
      />,
    )
    const list = screen.getByRole('list', { name: STRINGS.missed })
    const items = within(list).getAllByRole('listitem')
    expect(items).toHaveLength(2)
    expect(items[0]).toHaveTextContent('嗰')
    expect(items[0]).toHaveTextContent('口人田口')
    expect(items[0]).toHaveTextContent('ROWR')
    expect(items[0].textContent).toBe('嗰口人田口ROWR')
    expect(items[1]).toHaveTextContent('廿日十')
    expect(items[1]).toHaveTextContent('TAJ')
  })

  it('says new best when the run is a record', () => {
    render(<Report result={result} isNewBest previousBestText={undefined} onRetry={noop} onRetryScrambled={noop} onBack={noop} />)
    expect(screen.getByText(STRINGS.newBest)).toBeInTheDocument()
  })

  it('shows no record yet when there is no previous best', () => {
    render(<Report result={result} isNewBest={false} previousBestText={undefined} onRetry={noop} onRetryScrambled={noop} onBack={noop} />)
    expect(screen.getByText(STRINGS.noRecord)).toBeInTheDocument()
  })

  it('shows the previous best otherwise', () => {
    render(
      <Report
        result={result}
        isNewBest={false}
        previousBestText={STRINGS.best('1:20.0')}
        onRetry={noop}
        onRetryScrambled={noop}
        onBack={noop}
      />,
    )
    expect(screen.getByText(STRINGS.best('1:20.0'))).toBeInTheDocument()
  })

  it('shows a no-mistakes message when nothing was missed', () => {
    render(
      <Report
        result={{ ...result, wrongCount: 0, missed: [] }}
        isNewBest={false}
        previousBestText={undefined}
        onRetry={noop}
        onRetryScrambled={noop}
        onBack={noop}
      />,
    )
    expect(screen.getByText(STRINGS.noMistakes)).toBeInTheDocument()
  })

  it('wires the three buttons', async () => {
    const onRetry = vi.fn()
    const onRetryScrambled = vi.fn()
    const onBack = vi.fn()
    render(
      <Report
        result={result}
        isNewBest={false}
        previousBestText={undefined}
        onRetry={onRetry}
        onRetryScrambled={onRetryScrambled}
        onBack={onBack}
      />,
    )
    await userEvent.click(screen.getByRole('button', { name: STRINGS.retry }))
    await userEvent.click(screen.getByRole('button', { name: STRINGS.retryScrambled }))
    await userEvent.click(screen.getByRole('button', { name: STRINGS.backToSets }))
    expect(onRetry).toHaveBeenCalled()
    expect(onRetryScrambled).toHaveBeenCalled()
    expect(onBack).toHaveBeenCalled()
  })

  it('reports a time attack by characters per minute and correct count', async () => {
    const onRetry = vi.fn()
    const attack: RunResult = {
      kind: 'attack',
      setIndex: -1,
      durationMs: 120_000,
      order: [],
      elapsedMs: 120_000,
      typedCount: 140,
      correctCount: 137,
      wrongCount: 3,
      missed: ['嗰'],
    }
    render(<Report result={attack} isNewBest={false} previousBestText={undefined} onRetry={onRetry} onBack={noop} />)
    expect(screen.getByRole('heading', { name: STRINGS.attackTitle(2) })).toBeInTheDocument()
    expect(screen.getByText('69')).toBeInTheDocument() // round(137 / 2)
    expect(screen.getByText('98%')).toBeInTheDocument() // 137 / 140
    expect(screen.getByText(STRINGS.charsUnit(137))).toBeInTheDocument()
    expect(screen.getByText(STRINGS.correctCount)).toBeInTheDocument()
    expect(screen.queryByText(STRINGS.time)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: STRINGS.retryScrambled })).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: STRINGS.retry }))
    expect(onRetry).toHaveBeenCalled()
  })
})
