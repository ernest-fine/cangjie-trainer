import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
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
    expect(screen.getByText('Switch your keyboard to Cangjie')).toBeInTheDocument()
    expect(screen.getByText('Set 3')).toBeInTheDocument()
    expect(screen.getByText('Timed')).toBeInTheDocument()
  })

  it('calls onFinish with the result when a timed run completes', () => {
    const onFinish = vi.fn()
    render(<Drill setIndex={0} mode="timed" order={order} onFinish={onFinish} onBack={() => {}} />)
    typeCommitted('X' + order.slice(1).join(''))
    expect(onFinish).toHaveBeenCalledTimes(1)
    const result = onFinish.mock.calls[0][0]
    expect(result.setIndex).toBe(0)
    expect(result.wrongTally).toBe(1)
    expect(result.missed).toEqual([order[0]])
    expect(result.order).toEqual(order)
    expect(result.elapsedMs).toBeGreaterThanOrEqual(0)
  })

  it('does not call onFinish in free mode, shows done instead', () => {
    const onFinish = vi.fn()
    render(<Drill setIndex={0} mode="free" order={order} onFinish={onFinish} onBack={() => {}} />)
    typeCommitted(order.join(''))
    expect(onFinish).not.toHaveBeenCalled()
    expect(screen.getByText('Done')).toBeInTheDocument()
  })

  it('hides the clock in free mode', () => {
    render(<Drill setIndex={0} mode="free" order={order} onFinish={() => {}} onBack={() => {}} />)
    expect(screen.queryByText('0:00.0')).not.toBeInTheDocument()
  })

  it('restart clears the input', async () => {
    render(<Drill setIndex={0} mode="free" order={order} onFinish={() => {}} onBack={() => {}} />)
    typeCommitted('X')
    await userEvent.click(screen.getByRole('button', { name: 'Restart' }))
    expect((screen.getByRole('textbox') as HTMLInputElement).value).toBe('')
  })

  it('back button calls onBack', async () => {
    const onBack = vi.fn()
    render(<Drill setIndex={0} mode="free" order={order} onFinish={() => {}} onBack={onBack} />)
    await userEvent.click(screen.getByRole('button', { name: 'Back' }))
    expect(onBack).toHaveBeenCalled()
  })
})
