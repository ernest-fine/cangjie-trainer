import type { AttackMinutes } from './types'

export const ATTACK_MINUTES: readonly AttackMinutes[] = [1, 2, 3]
/** More than anyone types in three minutes. */
export const ATTACK_ORDER_LENGTH = 600
export const ROW_LENGTH = 20
export const WINDOW_ROWS = 3

/** Uniform draws from the pool, never the same character twice in a row. */
export function randomOrder(
  pool: readonly string[],
  length = ATTACK_ORDER_LENGTH,
  rng: () => number = Math.random,
): string[] {
  if (pool.length < 2) throw new Error('randomOrder needs at least two characters')
  const order: string[] = []
  while (order.length < length) {
    const ch = pool[Math.min(pool.length - 1, Math.floor(rng() * pool.length))]
    if (order.length > 0 && order[order.length - 1] === ch) continue
    order.push(ch)
  }
  return order
}

/** Index of the first character shown: the cursor's row stays in the middle. */
export function windowStart(typedLength: number): number {
  const cursorRow = Math.floor(typedLength / ROW_LENGTH)
  return Math.max(0, cursorRow - 1) * ROW_LENGTH
}
