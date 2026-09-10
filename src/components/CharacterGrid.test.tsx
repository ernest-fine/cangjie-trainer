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
})
