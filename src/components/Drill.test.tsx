import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { STRINGS } from '../lib/strings'
import { Drill } from './Drill'

const order = Array.from({ length: 100 }, (_, i) => String.fromCodePoint(0x4e00 + i))

function typeCommitted(value: string) {
  const input = screen.getByRole('textbox') as HTMLInputElement
  input.value = value
  fireEvent.compositionEnd(input)
}

describe('Drill', () => {
  it('shows the hint, set name, and mode', () => {
    render(<Drill setIndex={2} mode="timed" order={order} onFinish={() => {}} onBack={() => {}} />)
    expect(screen.getByText(STRINGS.hint)).toBeInTheDocument()
    expect(screen.getByText(STRINGS.setName(3))).toBeInTheDocument()
    expect(screen.getByText(STRINGS.timed)).toBeInTheDocument()
  })

  it('calls onFinish with the result when a timed run completes', () => {
    const onFinish = vi.fn()
    render(<Drill setIndex={0} mode="timed" order={order} onFinish={onFinish} onBack={() => {}} />)
    typeCommitted('錯' + order.slice(1).join(''))
    expect(onFinish).toHaveBeenCalledTimes(1)
    const result = onFinish.mock.calls[0][0]
    expect(result.setIndex).toBe(0)
    expect(result.wrongCount).toBe(1)
    expect(result.missed).toEqual([order[0]])
    expect(result.order).toEqual(order)
    expect(result.elapsedMs).toBeGreaterThanOrEqual(0)
  })

  it('does not end the run when the IME commits raw code letters for the last character', () => {
    const onFinish = vi.fn()
    render(<Drill setIndex={0} mode="timed" order={order} onFinish={onFinish} onBack={() => {}} />)
    const almostDone = order.slice(0, 99).join('')
    typeCommitted(almostDone)
    // Safari + macOS Cangjie: a six-key code is invalid, so space commits the letters.
    typeCommitted(almostDone + 'mgmmju')
    expect(onFinish).not.toHaveBeenCalled()
    typeCommitted(almostDone + order[99])
    expect(onFinish).toHaveBeenCalledTimes(1)
    expect(onFinish.mock.calls[0][0].wrongCount).toBe(0)
    expect(onFinish.mock.calls[0][0].missed).toEqual([])
  })

  it('does not call onFinish in free mode, shows done instead', () => {
    const onFinish = vi.fn()
    render(<Drill setIndex={0} mode="free" order={order} onFinish={onFinish} onBack={() => {}} />)
    typeCommitted(order.join(''))
    expect(onFinish).not.toHaveBeenCalled()
    expect(screen.getByText(STRINGS.done)).toBeInTheDocument()
  })

  it('hides the clock in free mode', () => {
    render(<Drill setIndex={0} mode="free" order={order} onFinish={() => {}} onBack={() => {}} />)
    expect(screen.queryByText('0:00.0')).not.toBeInTheDocument()
  })

  it('restart clears the input', async () => {
    render(<Drill setIndex={0} mode="free" order={order} onFinish={() => {}} onBack={() => {}} />)
    typeCommitted('錯')
    await userEvent.click(screen.getByRole('button', { name: STRINGS.restart }))
    expect((screen.getByRole('textbox') as HTMLInputElement).value).toBe('')
  })

  it('back button calls onBack', async () => {
    const onBack = vi.fn()
    render(<Drill setIndex={0} mode="free" order={order} onFinish={() => {}} onBack={onBack} />)
    await userEvent.click(screen.getByRole('button', { name: STRINGS.back }))
    expect(onBack).toHaveBeenCalled()
  })

  it('accumulates time across several commits and forgives a corrected mistake', () => {
    let t = 1000
    const onFinish = vi.fn()
    render(<Drill setIndex={0} mode="timed" order={order} onFinish={onFinish} onBack={() => {}} now={() => t} />)
    typeCommitted(order.slice(0, 10).join(''))
    t += 2000
    typeCommitted(order.slice(0, 10).join('') + '錯')
    typeCommitted(order.slice(0, 10).join(''))
    typeCommitted(order.slice(0, 11).join(''))
    t += 3000
    typeCommitted(order.join(''))
    expect(onFinish).toHaveBeenCalledTimes(1)
    const result = onFinish.mock.calls[0][0]
    expect(result.elapsedMs).toBe(5000)
    expect(result.wrongCount).toBe(0)
    expect(result.missed).toEqual([])
  })

  describe('pause', () => {
    function setVisibility(state: 'hidden' | 'visible') {
      Object.defineProperty(document, 'visibilityState', { value: state, configurable: true })
      fireEvent(document, new Event('visibilitychange'))
    }

    it('has no pause control in free mode', () => {
      render(<Drill setIndex={0} mode="free" order={order} onFinish={() => {}} onBack={() => {}} />)
      expect(screen.queryByRole('button', { name: STRINGS.pause })).not.toBeInTheDocument()
    })

    it('is disabled until the first character commits', () => {
      render(<Drill setIndex={0} mode="timed" order={order} onFinish={() => {}} onBack={() => {}} />)
      expect(screen.getByRole('button', { name: STRINGS.pause })).toBeDisabled()
      typeCommitted(order[0])
      expect(screen.getByRole('button', { name: STRINGS.pause })).toBeEnabled()
    })

    it('pausing hides the grid, disables the input, and resuming restores and focuses it', async () => {
      render(<Drill setIndex={0} mode="timed" order={order} onFinish={() => {}} onBack={() => {}} />)
      typeCommitted(order[0])
      await userEvent.click(screen.getByRole('button', { name: STRINGS.pause }))
      expect(screen.getByText(STRINGS.paused)).toBeInTheDocument()
      expect(document.querySelectorAll('[data-state]')).toHaveLength(0)
      expect(screen.getByRole('textbox')).toBeDisabled()
      expect(within(screen.getByRole('dialog')).getByRole('button', { name: STRINGS.resume })).toHaveFocus()
      await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: STRINGS.resume }))
      expect(screen.queryByText(STRINGS.paused)).not.toBeInTheDocument()
      expect(document.querySelectorAll('[data-state]')).toHaveLength(100)
      expect(screen.getByRole('textbox')).toBeEnabled()
      expect(screen.getByRole('textbox')).toHaveFocus()
    })

    it('excludes paused time from the reported result', async () => {
      let t = 0
      const onFinish = vi.fn()
      render(<Drill setIndex={0} mode="timed" order={order} onFinish={onFinish} onBack={() => {}} now={() => t} />)
      typeCommitted(order[0])
      t = 1000
      await userEvent.click(screen.getByRole('button', { name: STRINGS.pause }))
      t = 61_000
      await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: STRINGS.resume }))
      t = 62_000
      typeCommitted(order.join(''))
      expect(onFinish.mock.calls[0][0].elapsedMs).toBe(2000)
    })

    it('escape toggles pause and resume', () => {
      vi.useFakeTimers()
      try {
        render(<Drill setIndex={0} mode="timed" order={order} onFinish={() => {}} onBack={() => {}} />)
        typeCommitted(order[0])
        vi.advanceTimersByTime(150) // past the post-composition grace window
        fireEvent.keyDown(document, { key: 'Escape' })
        expect(screen.getByText(STRINGS.paused)).toBeInTheDocument()
        fireEvent.keyDown(document, { key: 'Escape' })
        expect(screen.queryByText(STRINGS.paused)).not.toBeInTheDocument()
      } finally {
        vi.useRealTimers()
      }
    })

    it('escape during an IME composition does nothing', () => {
      render(<Drill setIndex={0} mode="timed" order={order} onFinish={() => {}} onBack={() => {}} />)
      typeCommitted(order[0])
      fireEvent.keyDown(document, { key: 'Escape', isComposing: true })
      expect(screen.queryByText(STRINGS.paused)).not.toBeInTheDocument()
      fireEvent.keyDown(document, { key: 'Process', keyCode: 229 })
      expect(screen.queryByText(STRINGS.paused)).not.toBeInTheDocument()
    })

    it('escape while the input reports a composition in progress does nothing', () => {
      render(<Drill setIndex={0} mode="timed" order={order} onFinish={() => {}} onBack={() => {}} />)
      typeCommitted(order[0])
      const input = screen.getByRole('textbox')
      fireEvent.compositionStart(input)
      fireEvent.keyDown(document, { key: 'Escape' })
      expect(screen.queryByText(STRINGS.paused)).not.toBeInTheDocument()
    })

    describe('escape right after a composition ends', () => {
      afterEach(() => vi.useRealTimers())

      it('is treated as cancelling the composition, then works again shortly after', () => {
        vi.useFakeTimers()
        render(<Drill setIndex={0} mode="timed" order={order} onFinish={() => {}} onBack={() => {}} />)
        typeCommitted(order[0])
        // Some browsers end the composition first and only then deliver the Escape keydown.
        fireEvent.keyDown(document, { key: 'Escape' })
        expect(screen.queryByText(STRINGS.paused)).not.toBeInTheDocument()
        vi.advanceTimersByTime(150)
        fireEvent.keyDown(document, { key: 'Escape' })
        expect(screen.getByText(STRINGS.paused)).toBeInTheDocument()
      })
    })

    it('escape before the clock starts does nothing', () => {
      render(<Drill setIndex={0} mode="timed" order={order} onFinish={() => {}} onBack={() => {}} />)
      fireEvent.keyDown(document, { key: 'Escape' })
      expect(screen.queryByText(STRINGS.paused)).not.toBeInTheDocument()
    })

    it('pauses when the page is hidden and does not resume when shown', () => {
      render(<Drill setIndex={0} mode="timed" order={order} onFinish={() => {}} onBack={() => {}} />)
      typeCommitted(order[0])
      setVisibility('hidden')
      expect(screen.getByText(STRINGS.paused)).toBeInTheDocument()
      setVisibility('visible')
      expect(screen.getByText(STRINGS.paused)).toBeInTheDocument()
    })

    it('restart while paused clears the pause and re-enables a fresh input', async () => {
      render(<Drill setIndex={0} mode="timed" order={order} onFinish={() => {}} onBack={() => {}} />)
      typeCommitted(order[0])
      await userEvent.click(screen.getByRole('button', { name: STRINGS.pause }))
      await userEvent.click(screen.getByRole('button', { name: STRINGS.restart }))
      expect(screen.queryByText(STRINGS.paused)).not.toBeInTheDocument()
      expect(document.querySelectorAll('[data-state]')).toHaveLength(100)
      const input = screen.getByRole('textbox') as HTMLInputElement
      expect(input).toBeEnabled()
      expect(input.value).toBe('')
      expect(input).toHaveFocus()
    })

    it('does not pause on hide before the clock starts', () => {
      render(<Drill setIndex={0} mode="timed" order={order} onFinish={() => {}} onBack={() => {}} />)
      setVisibility('hidden')
      expect(screen.queryByText(STRINGS.paused)).not.toBeInTheDocument()
      setVisibility('visible')
    })
  })
})
