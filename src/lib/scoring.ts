import type { PositionState } from './types'

const DEFAULT_TOTAL = 100

/**
 * Keeps only Han characters. IMEs commit non-Han text in a few situations
 * (macOS Cangjie commits the raw key letters when a code is invalid, and a
 * keyboard left in ASCII mode types letters); none of it can ever match a
 * target, so it is not scored.
 */
export function hanCharacters(value: string): string {
  return [...value].filter((ch) => /\p{Script=Han}/u.test(ch)).join('')
}

export function positionStates(target: string[], typed: string): PositionState[] {
  const chars = [...typed]
  return target.map((ch, i) => {
    if (i < chars.length) return chars[i] === ch ? 'correct' : 'wrong'
    if (i === chars.length) return 'current'
    return 'pending'
  })
}

/** Indices whose typed character differs from the target. */
export function wrongPositions(states: PositionState[]): number[] {
  const out: number[] = []
  states.forEach((state, i) => {
    if (state === 'wrong') out.push(i)
  })
  return out
}

export function charsPerMinute(elapsedMs: number, count = DEFAULT_TOTAL): number {
  if (elapsedMs <= 0) return 0
  return Math.round(count / (elapsedMs / 60_000))
}

export function accuracy(wrongCount: number, total = DEFAULT_TOTAL): number {
  return Math.max(0, total - wrongCount) / total
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
