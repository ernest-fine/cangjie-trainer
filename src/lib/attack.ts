import { charsPerMinute } from './scoring'
import type { AttackMinutes, RunResult } from './types'

export const ATTACK_MINUTES: readonly AttackMinutes[] = [1, 2, 3]
/** 300 characters per minute for three minutes; nobody types Cangjie that fast. */
export const ATTACK_ORDER_LENGTH = 900
export const ROW_LENGTH = 20
export const WINDOW_ROWS = 3

/**
 * Uniform draws from the pool, never the same pool index twice in a row
 * (the same character, for a pool of distinct characters). Each draw picks
 * from the pool minus the previous index, so any rng in [0, 1) terminates,
 * including a constant one.
 */
export function randomOrder(
  pool: readonly string[],
  length = ATTACK_ORDER_LENGTH,
  rng: () => number = Math.random,
): string[] {
  if (pool.length < 2) throw new Error('randomOrder needs at least two characters')
  const order: string[] = []
  let previous = -1
  while (order.length < length) {
    const choices = previous < 0 ? pool.length : pool.length - 1
    let index = Math.min(choices - 1, Math.floor(rng() * choices))
    if (previous >= 0 && index >= previous) index += 1
    order.push(pool[index])
    previous = index
  }
  return order
}

/**
 * Index of the first character shown: the cursor's row stays in the middle.
 * With `orderLength`, the window never runs past the end, so the last rows
 * still show three full rows.
 */
export function windowStart(typedLength: number, orderLength = Infinity): number {
  const cursorRow = Math.floor(typedLength / ROW_LENGTH)
  const start = Math.max(0, cursorRow - 1) * ROW_LENGTH
  if (!Number.isFinite(orderLength)) return start
  const lastStart = Math.max(0, Math.ceil(orderLength / ROW_LENGTH) - WINDOW_ROWS) * ROW_LENGTH
  return Math.min(start, lastStart)
}

/**
 * Characters per minute for a time attack: correct characters over the time
 * actually run, which is the full duration unless the order was exhausted.
 */
export function attackCpm(result: Pick<RunResult, 'elapsedMs' | 'correctCount'>): number {
  return charsPerMinute(result.elapsedMs, result.correctCount)
}
