import type { AttackBestRecord, AttackBests, BestRecord, Bests } from './types'

export const STORAGE_KEY = 'cangjie-trainer:bests'
export const MIN_BEST_ACCURACY = 0.9
export const ATTACK_STORAGE_KEY = 'cangjie-trainer:attack-bests'

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

function isAttackRecord(value: unknown): value is AttackBestRecord {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return (
    typeof v.cpm === 'number' &&
    Number.isFinite(v.cpm) &&
    v.cpm > 0 &&
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
  if (candidate.elapsedMs <= 0) return false
  if (candidate.accuracy < MIN_BEST_ACCURACY) return false
  if (!existing) return true
  return candidate.elapsedMs < existing.bestMs
}

export function loadAttackBests(storage: Storage | undefined = defaultStorage()): AttackBests {
  try {
    const raw = storage?.getItem(ATTACK_STORAGE_KEY)
    if (!raw) return {}
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) return {}
    const bests: AttackBests = {}
    for (const [key, value] of Object.entries(parsed)) {
      const minutes = Number(key)
      if (Number.isInteger(minutes) && isAttackRecord(value)) {
        bests[minutes] = { cpm: value.cpm, accuracy: value.accuracy, recordedAt: value.recordedAt }
      }
    }
    return bests
  } catch {
    return {}
  }
}

export function saveAttackBest(
  minutes: number,
  record: AttackBestRecord,
  storage: Storage | undefined = defaultStorage(),
): void {
  try {
    const bests = loadAttackBests(storage)
    bests[minutes] = record
    storage?.setItem(ATTACK_STORAGE_KEY, JSON.stringify(bests))
  } catch {
    // Storage unavailable. The app works without memory.
  }
}

export function qualifiesAsAttackBest(
  existing: AttackBestRecord | undefined,
  candidate: { cpm: number; accuracy: number; typedCount: number },
): boolean {
  if (candidate.typedCount <= 0 || candidate.cpm <= 0) return false
  if (candidate.accuracy < MIN_BEST_ACCURACY) return false
  if (!existing) return true
  return candidate.cpm > existing.cpm
}
