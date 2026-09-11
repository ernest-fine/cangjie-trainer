import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { STRINGS } from '../lib/strings'
import { Home } from './Home'

describe('Home', () => {
  it('gives every card an accessible name', () => {
    render(<Home bests={{}} attackBests={{}} onStart={() => {}} onStartAttack={() => {}} />)
    expect(screen.getByRole('article', { name: STRINGS.setName(1) })).toBeInTheDocument()
    expect(screen.getByRole('article', { name: STRINGS.setName(10) })).toBeInTheDocument()
  })

  it('renders ten set cards with rank ranges', () => {
    render(<Home bests={{}} attackBests={{}} onStart={() => {}} onStartAttack={() => {}} />)
    expect(screen.getAllByRole('article')).toHaveLength(11)
    expect(screen.getByText(STRINGS.setRange(1, 100))).toBeInTheDocument()
    expect(screen.getByText(STRINGS.setRange(901, 1000))).toBeInTheDocument()
  })

  it('shows a dash when there is no best, and the best otherwise', () => {
    render(
      <Home
        bests={{ 1: { bestMs: 65_340, accuracy: 0.95, recordedAt: '2026-09-10T00:00:00.000Z' } }}
        attackBests={{}}
        onStart={() => {}}
        onStartAttack={() => {}}
      />,
    )
    const set1 = screen.getByRole('article', { name: STRINGS.setName(1) })
    const set2 = screen.getByRole('article', { name: STRINGS.setName(2) })
    expect(within(set1).getByText(STRINGS.noBest)).toBeInTheDocument()
    expect(within(set2).getByText('1:05.3')).toBeInTheDocument()
    expect(within(set2).getByText('95%')).toBeInTheDocument()
  })

  it('starts the chosen set and mode', async () => {
    const onStart = vi.fn()
    render(<Home bests={{}} attackBests={{}} onStart={onStart} onStartAttack={() => {}} />)
    const card = screen.getByRole('article', { name: STRINGS.setName(4) })
    await userEvent.click(within(card).getByRole('button', { name: STRINGS.timed }))
    expect(onStart).toHaveBeenCalledWith(3, 'timed')
    await userEvent.click(within(card).getByRole('button', { name: STRINGS.free }))
    expect(onStart).toHaveBeenCalledWith(3, 'free')
  })

  it('shows the title and subtitle', () => {
    render(<Home bests={{}} attackBests={{}} onStart={() => {}} onStartAttack={() => {}} />)
    expect(screen.getByRole('heading', { name: STRINGS.appTitle })).toBeInTheDocument()
    expect(screen.getByText(STRINGS.subtitle)).toBeInTheDocument()
  })

  it('offers three time attack durations with bests', async () => {
    const onStartAttack = vi.fn()
    render(
      <Home
        bests={{}}
        attackBests={{ 2: { cpm: 46, accuracy: 0.95, recordedAt: '' } }}
        onStart={() => {}}
        onStartAttack={onStartAttack}
      />,
    )
    const card = screen.getByRole('article', { name: STRINGS.attack })
    await userEvent.click(within(card).getByRole('button', { name: STRINGS.minutes(1) }))
    expect(onStartAttack).toHaveBeenCalledWith(1)
    await userEvent.click(within(card).getByRole('button', { name: STRINGS.minutes(3) }))
    expect(onStartAttack).toHaveBeenCalledWith(3)
    expect(within(card).getByText(`46 ${STRINGS.charsPerMinute} · 95%`)).toBeInTheDocument()
    expect(within(card).getAllByText(STRINGS.noBest)).toHaveLength(2)
  })
})
