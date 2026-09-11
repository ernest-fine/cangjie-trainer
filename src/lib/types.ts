export type Mode = 'timed' | 'free' | 'attack'

export type PositionState = 'correct' | 'wrong' | 'current' | 'pending'

export type AttackMinutes = 1 | 2 | 3

export interface RunResult {
  kind: 'set' | 'attack'
  /** 0 to 9 for sets; -1 for attacks. */
  setIndex: number
  /** Attack only; 0 for sets. */
  durationMs: number
  order: string[]
  elapsedMs: number
  /** Characters committed; 100 for a completed set. */
  typedCount: number
  /** typedCount minus wrongCount. */
  correctCount: number
  /** Positions still wrong when the run ended. */
  wrongCount: number
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

export interface AttackBestRecord {
  cpm: number
  /** 0 to 1 */
  accuracy: number
  /** ISO 8601 */
  recordedAt: string
}

/** Keyed by minutes: 1, 2, 3. */
export type AttackBests = Record<number, AttackBestRecord>
