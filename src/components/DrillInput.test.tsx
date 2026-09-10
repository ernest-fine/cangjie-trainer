import { fireEvent, render, screen } from '@testing-library/react'
import { createRef } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { DrillInput } from './DrillInput'

describe('DrillInput', () => {
  it('reports committed input with the composing flag', () => {
    const onValue = vi.fn()
    const ref = createRef<HTMLInputElement>()
    render(<DrillInput onValue={onValue} inputRef={ref} />)
    const input = screen.getByRole('textbox')
    fireEvent.input(input, { target: { value: '的' }, isComposing: false })
    expect(onValue).toHaveBeenLastCalledWith('的', false)
  })

  it('passes through isComposing true', () => {
    const onValue = vi.fn()
    const ref = createRef<HTMLInputElement>()
    render(<DrillInput onValue={onValue} inputRef={ref} />)
    const input = screen.getByRole('textbox')
    fireEvent.input(input, { target: { value: 'a' }, isComposing: true })
    expect(onValue).toHaveBeenLastCalledWith('a', true)
  })

  it('reports the value again on compositionend as committed', () => {
    const onValue = vi.fn()
    const ref = createRef<HTMLInputElement>()
    render(<DrillInput onValue={onValue} inputRef={ref} />)
    const input = screen.getByRole('textbox') as HTMLInputElement
    input.value = '的一'
    fireEvent.compositionEnd(input)
    expect(onValue).toHaveBeenLastCalledWith('的一', false)
  })

  it('exposes the element through inputRef', () => {
    const ref = createRef<HTMLInputElement>()
    render(<DrillInput onValue={() => {}} inputRef={ref} />)
    expect(ref.current).toBeInstanceOf(HTMLInputElement)
  })
})
