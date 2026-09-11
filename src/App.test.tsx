import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import App from './App'
import { SETS } from './data/sets'
import { STRINGS } from './lib/strings'
import { STORAGE_KEY } from './lib/storage'

function typeCommitted(value: string) {
  const input = screen.getByRole('textbox') as HTMLInputElement
  input.value = value
  fireEvent.compositionEnd(input)
}

describe('App', () => {
  beforeEach(() => localStorage.clear())

  it('starts on the home screen', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: STRINGS.appTitle })).toBeInTheDocument()
  })

  it('runs a timed set through to the report and stores the best', async () => {
    render(<App />)
    const card = screen.getAllByRole('article')[0]
    await userEvent.click(within(card).getByRole('button', { name: STRINGS.timed }))
    expect(screen.getByText(STRINGS.setName(1))).toBeInTheDocument()

    typeCommitted(SETS[0][0])
    typeCommitted(SETS[0].join(''))

    expect(screen.getByText(STRINGS.charsPerMinute)).toBeInTheDocument()
    expect(screen.getByText(STRINGS.newBest)).toBeInTheDocument()
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')).toHaveProperty('0')

    await userEvent.click(screen.getByRole('button', { name: STRINGS.backToSets }))
    expect(within(screen.getAllByRole('article')[0]).getByText('100%')).toBeInTheDocument()
  })

  it('retry returns to the drill with the same set', async () => {
    render(<App />)
    await userEvent.click(within(screen.getAllByRole('article')[1]).getByRole('button', { name: STRINGS.timed }))
    typeCommitted(SETS[1].join(''))
    await userEvent.click(screen.getByRole('button', { name: STRINGS.retry }))
    expect(screen.getByText(STRINGS.setName(2))).toBeInTheDocument()
    expect((screen.getByRole('textbox') as HTMLInputElement).value).toBe('')
  })

  it('free mode never shows a report', async () => {
    render(<App />)
    await userEvent.click(within(screen.getAllByRole('article')[0]).getByRole('button', { name: STRINGS.free }))
    typeCommitted(SETS[0].join(''))
    expect(screen.queryByText(STRINGS.charsPerMinute)).not.toBeInTheDocument()
    expect(screen.getByText(STRINGS.done)).toBeInTheDocument()
  })

  it('retry scrambled starts the drill with a different order', async () => {
    render(<App />)
    await userEvent.click(within(screen.getAllByRole('article')[2]).getByRole('button', { name: STRINGS.timed }))
    typeCommitted(SETS[2].join(''))
    await userEvent.click(screen.getByRole('button', { name: STRINGS.retryScrambled }))
    const shown = [...document.querySelectorAll('[data-state]')].map((el) => el.textContent).join('')
    expect(shown).toHaveLength(100)
    expect(shown).not.toBe(SETS[2].join(''))
    expect([...shown].sort()).toEqual([...SETS[2]].sort())
  })
})
