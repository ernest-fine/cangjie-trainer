import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Home } from './Home'

describe('Home', () => {
  it('gives every card an accessible name', () => {
    render(<Home bests={{}} onStart={() => {}} />)
    expect(screen.getByRole('article', { name: 'Set 1' })).toBeInTheDocument()
    expect(screen.getByRole('article', { name: 'Set 10' })).toBeInTheDocument()
  })

  it('renders ten set cards with rank ranges', () => {
    render(<Home bests={{}} onStart={() => {}} />)
    expect(screen.getAllByRole('article')).toHaveLength(10)
    expect(screen.getByText('1 to 100')).toBeInTheDocument()
    expect(screen.getByText('901 to 1000')).toBeInTheDocument()
  })

  it('shows a dash when there is no best, and the best otherwise', () => {
    render(
      <Home bests={{ 1: { bestMs: 65_340, accuracy: 0.95, recordedAt: '2026-09-10T00:00:00.000Z' } }} onStart={() => {}} />,
    )
    const cards = screen.getAllByRole('article')
    expect(within(cards[0]).getByText('—')).toBeInTheDocument()
    expect(within(cards[1]).getByText('1:05.3')).toBeInTheDocument()
    expect(within(cards[1]).getByText('95%')).toBeInTheDocument()
  })

  it('starts the chosen set and mode', async () => {
    const onStart = vi.fn()
    render(<Home bests={{}} onStart={onStart} />)
    const card = screen.getAllByRole('article')[3]
    await userEvent.click(within(card).getByRole('button', { name: 'Timed' }))
    expect(onStart).toHaveBeenCalledWith(3, 'timed')
    await userEvent.click(within(card).getByRole('button', { name: 'Free' }))
    expect(onStart).toHaveBeenCalledWith(3, 'free')
  })
})
