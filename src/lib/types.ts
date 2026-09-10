export type Mode = 'timed' | 'free'

export type PositionState = 'correct' | 'wrong' | 'current' | 'pending'

export interface RunResult {
  setIndex: number
  order: string[]
  elapsedMs: number
  wrongTally: number
  missed: string[]
}

export interface BestRecord {
  bestMs: number
  /** 0 to 1 */
  accuracy: number
  /** ISO 8601 */
  recordedAt: string
}

export type Bests = Record<number, BestRecord>
