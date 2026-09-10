import type { PositionState } from './types'

const DEFAULT_TOTAL = 100

export function positionStates(target: string[], typed: string): PositionState[] {
  const chars = [...typed]
  return target.map((ch, i) => {
    if (i < chars.length) return chars[i] === ch ? 'correct' : 'wrong'
    if (i === chars.length) return 'current'
    return 'pending'
  })
}

/**
 * Positions that became wrong between two committed input values.
 * Only the changed suffix is inspected, so a backspace adds nothing and a
 * fix adds nothing. Retyping a wrong character wrong again counts again.
 */
export function newlyWrongPositions(prevTyped: string, typed: string, target: string[]): number[] {
  const prev = [...prevTyped]
  const next = [...typed]
  let common = 0
  while (common < prev.length && common < next.length && prev[common] === next[common]) common++
  const wrong: number[] = []
  for (let i = common; i < next.length && i < target.length; i++) {
    if (next[i] !== target[i]) wrong.push(i)
  }
  return wrong
}

export function charsPerMinute(elapsedMs: number, count = DEFAULT_TOTAL): number {
  if (elapsedMs <= 0) return 0
  return Math.round(count / (elapsedMs / 60_000))
}

export function accuracy(wrongTally: number, total = DEFAULT_TOTAL): number {
  return Math.max(0, total - wrongTally) / total
}

// Fisher-Yates shuffle. The `rng` should return a number in [0, 1); returning exactly 1 is tolerated.
export function shuffle<T>(items: readonly T[], rng: () => number = Math.random): T[] {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.min(i, Math.floor(rng() * (i + 1)))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

export function missedCharacters(target: string[], wrongPositions: Iterable<number>): string[] {
  const positions = new Set(wrongPositions)
  const seen = new Set<string>()
  const missed: string[] = []
  target.forEach((ch, i) => {
    if (positions.has(i) && !seen.has(ch)) {
      seen.add(ch)
      missed.push(ch)
    }
  })
  return missed
}

/**
 * Formats a duration in milliseconds as `m:ss.t`. Tenths of a second are
 * truncated (floored), not rounded. Negative input is clamped to 0.
 */
export function formatTime(ms: number): string {
  const clamped = Math.max(0, ms)
  const tenths = Math.floor(clamped / 100)
  const minutes = Math.floor(tenths / 600)
  const seconds = Math.floor((tenths % 600) / 10)
  const tenth = tenths % 10
  return `${minutes}:${String(seconds).padStart(2, '0')}.${tenth}`
}
