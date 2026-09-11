import type { PositionState } from '../lib/types'
import styles from './CharacterGrid.module.css'

interface CharacterGridProps {
  order: string[]
  states: PositionState[]
  /** Keep the layout box but show blank cells (used while paused). */
  concealed?: boolean
}

const BLANK = '\u3000'

/**
 * Display-only: the 100-character target text with per-position progress
 * state. Not keyboard-navigable content, so it's hidden from the
 * accessibility tree.
 */
export function CharacterGrid({ order, states, concealed = false }: CharacterGridProps) {
  return (
    <div className={styles.grid} aria-hidden="true">
      {order.map((ch, i) => (
        <span key={i} className={styles.glyph} data-state={concealed ? undefined : states[i]}>
          {concealed ? BLANK : ch}
        </span>
      ))}
    </div>
  )
}
