import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { CharacterGrid } from './CharacterGrid'

describe('CharacterGrid', () => {
  it('renders every character with a data-state attribute', () => {
    render(<CharacterGrid order={['的', '一', '是']} states={['correct', 'wrong', 'current']} />)
    expect(screen.getByText('的')).toHaveAttribute('data-state', 'correct')
    expect(screen.getByText('一')).toHaveAttribute('data-state', 'wrong')
    expect(screen.getByText('是')).toHaveAttribute('data-state', 'current')
  })

  it('conceals the characters while keeping every cell', () => {
    const { container } = render(<CharacterGrid order={['的', '一', '是']} states={['correct', 'wrong', 'current']} concealed />)
    expect(container.querySelectorAll('[data-state]')).toHaveLength(0)
    expect(container.querySelectorAll('span')).toHaveLength(3)
    expect(screen.queryByText('的')).not.toBeInTheDocument()
  })
})
