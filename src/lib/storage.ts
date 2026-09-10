import type { BestRecord, Bests } from './types'

export const STORAGE_KEY = 'cangjie-trainer:bests'
export const MIN_BEST_ACCURACY = 0.9

function defaultStorage(): Storage | undefined {
  try {
    return globalThis.localStorage
  } catch {
    return undefined
  }
}

function isRecord(value: unknown): value is BestRecord {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return (
    typeof v.bestMs === 'number' &&
    Number.isFinite(v.bestMs) &&
    v.bestMs > 0 &&
    typeof v.accuracy === 'number' &&
    v.accuracy >= 0 &&
    v.accuracy <= 1 &&
    typeof v.recordedAt === 'string'
  )
}

export function loadBests(storage: Storage | undefined = defaultStorage()): Bests {
  try {
    const raw = storage?.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) return {}
    const bests: Bests = {}
    for (const [key, value] of Object.entries(parsed)) {
      const index = Number(key)
      if (Number.isInteger(index) && isRecord(value)) {
        bests[index] = { bestMs: value.bestMs, accuracy: value.accuracy, recordedAt: value.recordedAt }
      }
    }
    return bests
  } catch {
    return {}
  }
}

export function saveBest(
  setIndex: number,
  record: BestRecord,
  storage: Storage | undefined = defaultStorage(),
): void {
  try {
    const bests = loadBests(storage)
    bests[setIndex] = record
    storage?.setItem(STORAGE_KEY, JSON.stringify(bests))
  } catch {
    // Storage unavailable. The app works without memory.
  }
}

export function qualifiesAsBest(
  existing: BestRecord | undefined,
  candidate: { elapsedMs: number; accuracy: number },
): boolean {
  if (candidate.accuracy < MIN_BEST_ACCURACY) return false
  if (!existing) return true
  return candidate.elapsedMs < existing.bestMs
}
