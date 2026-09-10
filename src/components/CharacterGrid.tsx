import type { PositionState } from '../lib/types'
import styles from './CharacterGrid.module.css'

interface CharacterGridProps {
  order: string[]
  states: PositionState[]
}

/**
 * Display-only: the 100-character target text with per-position progress
 * state. Not keyboard-navigable content, so it's hidden from the
 * accessibility tree; the live status lives on the input/summary instead.
 */
export function CharacterGrid({ order, states }: CharacterGridProps) {
  return (
    <div className={styles.grid} aria-hidden="true">
      {order.map((ch, i) => (
        <span key={i} className={styles.glyph} data-state={states[i]}>
          {ch}
        </span>
      ))}
    </div>
  )
}
