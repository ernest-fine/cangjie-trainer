import { beforeEach, describe, expect, it } from 'vitest'
import { STORAGE_KEY, loadBests, qualifiesAsBest, saveBest } from './storage'
import type { BestRecord } from './types'

function fakeStorage(initial: Record<string, string> = {}): Storage {
  const data = new Map(Object.entries(initial))
  return {
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
    clear: () => data.clear(),
    key: (i) => [...data.keys()][i] ?? null,
    get length() {
      return data.size
    },
  }
}

function throwingStorage(): Storage {
  const boom = () => {
    throw new Error('denied')
  }
  return { getItem: boom, setItem: boom, removeItem: boom, clear: boom, key: boom, length: 0 }
}

const record: BestRecord = { bestMs: 90_000, accuracy: 0.95, recordedAt: '2026-09-10T00:00:00.000Z' }

describe('loadBests', () => {
  let storage: Storage
  beforeEach(() => {
    storage = fakeStorage()
  })

  it('returns an empty object when nothing is stored', () => {
    expect(loadBests(storage)).toEqual({})
  })

  it('round trips a saved record', () => {
    saveBest(2, record, storage)
    expect(loadBests(storage)).toEqual({ 2: record })
  })

  it('keeps other sets when saving one', () => {
    saveBest(0, record, storage)
    saveBest(3, { ...record, bestMs: 80_000 }, storage)
    expect(Object.keys(loadBests(storage))).toEqual(['0', '3'])
  })

  it('returns empty on corrupt JSON', () => {
    expect(loadBests(fakeStorage({ [STORAGE_KEY]: '{not json' }))).toEqual({})
  })

  it('drops entries with the wrong shape', () => {
    const stored = JSON.stringify({ 1: record, 2: { bestMs: 'fast' }, 3: null })
    expect(loadBests(fakeStorage({ [STORAGE_KEY]: stored }))).toEqual({ 1: record })
  })

  it('returns empty when storage throws', () => {
    expect(loadBests(throwingStorage())).toEqual({})
  })

  it('does not throw when saving to a throwing storage', () => {
    expect(() => saveBest(0, record, throwingStorage())).not.toThrow()
  })
})

describe('qualifiesAsBest', () => {
  it('accepts the first accurate run', () => {
    expect(qualifiesAsBest(undefined, { elapsedMs: 120_000, accuracy: 0.9 })).toBe(true)
  })

  it('rejects the first run when too sloppy', () => {
    expect(qualifiesAsBest(undefined, { elapsedMs: 120_000, accuracy: 0.89 })).toBe(false)
  })

  it('accepts a faster accurate run', () => {
    expect(qualifiesAsBest(record, { elapsedMs: 80_000, accuracy: 0.92 })).toBe(true)
  })

  it('rejects a faster sloppy run', () => {
    expect(qualifiesAsBest(record, { elapsedMs: 80_000, accuracy: 0.5 })).toBe(false)
  })

  it('rejects a slower run', () => {
    expect(qualifiesAsBest(record, { elapsedMs: 100_000, accuracy: 1 })).toBe(false)
  })

  it('rejects an equal time', () => {
    expect(qualifiesAsBest(record, { elapsedMs: 90_000, accuracy: 1 })).toBe(false)
  })
})
