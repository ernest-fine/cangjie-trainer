# Time Attack Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A countdown mode of 1, 2, or 3 minutes over random characters from the whole list, scored by characters per minute, with per-duration personal bests.

**Architecture:** `useDrill` gains an optional time limit and an `expire()` action driven by a 100 ms tick from the Drill. Drill gets a third mode, `attack`, rendering a three-row rolling window and a countdown; everything else (pause, Escape, IME handling) is reused. `RunResult` grows `kind`, `durationMs`, `typedCount`, `correctCount`; Report and Home branch on them. Attack bests live under their own storage key.

**Tech Stack:** React 19, TypeScript strict, Vitest with jsdom and Testing Library, CSS modules.

**Spec:** `docs/superpowers/specs/2026-09-11-time-attack-design.md`

## Global Constraints

- Project root `/Users/gabes/Documents/cangjie-trainer`, branch `build/initial-app`. Commit after every task. Do not push.
- `Mode = 'timed' | 'free' | 'attack'`. Attack durations are exactly 60 000, 120 000, 180 000 ms; minutes are 1, 2, 3.
- Random order: 600 characters drawn uniformly from `SETS.flat()` with an injectable rng, never the same character twice in a row.
- Hook: `limitMs?` option; `remainingMs()` = `limitMs - elapsedMs()` clamped at 0, `Infinity` without a limit; `expire()` sets `endedAt = startedAt + pausedMs + limitMs` only when started, not done, not paused, and `elapsedMs() >= limitMs`. Input after `endedAt` is ignored (existing rule).
- Drill drives `expire()` every 100 ms while running and after every committed input.
- Window: rows of 20, three rows shown, first row = `max(0, floor(typedLength / 20) - 1)`.
- `RunResult`: `{ kind: 'set' | 'attack'; setIndex: number; durationMs: number; order: string[]; elapsedMs: number; typedCount: number; correctCount: number; wrongCount: number; missed: string[] }`. Sets: `kind 'set'`, `durationMs 0`, `typedCount 100`. Attacks: `setIndex -1`, `elapsedMs === durationMs`.
- CPM: sets `charsPerMinute(elapsedMs, typedCount)`; attacks `charsPerMinute(durationMs, correctCount)`. Accuracy `accuracy(wrongCount, typedCount)`, 0 when `typedCount` is 0.
- Attack bests: key `cangjie-trainer:attack-bests`, map minutes → `{ cpm, accuracy, recordedAt }`; qualifies when accuracy ≥ 0.9, `typedCount > 0`, and `cpm` strictly greater than existing (any qualifying run when none).
- Strings, exactly: `attack` 限時挑戰; `minutes(n)` `${n} 分鐘`; `attackTitle(n)` `限時挑戰 · ${n} 分鐘`; `remaining` 剩餘; `correctCount` 打對; `charsUnit(n)` `${n} 字`. Home best text under each duration: `${cpm} 每分鐘字數 · ${acc}%`.
- Report for attacks: heading `attackTitle(n)`, the 時間 stat replaced by 打對 with value `charsUnit(correctCount)`, 打亂後再試 hidden. Retry starts a fresh random order of the same duration.
- Components contain no user-facing literals. tsconfig has `strict`, `noUnusedLocals`, `verbatimModuleSyntax`: type-only imports use `import type`.
- Commit message format: subject, blank line, then `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>` and `Claude-Session: https://claude.ai/code/session_01WdRxGmqZsrgQdo7US6y7ux`.

---

## File Structure

| Path | Responsibility |
|---|---|
| `src/lib/types.ts` | `Mode`, `RunResult`, `AttackMinutes`, `AttackBestRecord`, `AttackBests`. |
| `src/lib/strings.ts` | Six new strings. |
| `src/lib/attack.ts`, `attack.test.ts` | `randomOrder`, `windowStart`, constants. |
| `src/lib/scoring.ts`, `scoring.test.ts` | `accuracy(0, 0)` guard. |
| `src/hooks/useDrill.ts`, `useDrill.test.ts` | `limitMs`, `remainingMs`, `isExpired`, `expire`. |
| `src/lib/storage.ts`, `storage.test.ts` | Attack bests. |
| `src/components/Drill.tsx`, `Drill.module.css`, `Drill.test.tsx` | Attack mode: title, countdown, window, expiry tick, new `RunResult`. |
| `src/components/Report.tsx`, `Report.test.tsx` | Kind-aware heading, stat, buttons; `previousBestText` prop. |
| `src/components/Home.tsx`, `Home.module.css`, `Home.test.tsx` | Attack card. |
| `src/App.tsx`, `App.test.tsx` | Start attack, finish attack, bests, retry. |

---

### Task 1: Types, strings, random order, scoring guard

**Files:**
- Modify: `src/lib/types.ts`, `src/lib/strings.ts`, `src/lib/scoring.ts`, `src/lib/scoring.test.ts`, `src/lib/strings.test.ts`
- Create: `src/lib/attack.ts`, `src/lib/attack.test.ts`

**Interfaces:**
- Produces:

```ts
type Mode = 'timed' | 'free' | 'attack'
type AttackMinutes = 1 | 2 | 3
interface RunResult { kind: 'set' | 'attack'; setIndex: number; durationMs: number; order: string[]; elapsedMs: number; typedCount: number; correctCount: number; wrongCount: number; missed: string[] }
interface AttackBestRecord { cpm: number; accuracy: number; recordedAt: string }
type AttackBests = Record<number, AttackBestRecord>
const ATTACK_MINUTES: readonly AttackMinutes[] = [1, 2, 3]
const ATTACK_ORDER_LENGTH = 600
const ROW_LENGTH = 20
const WINDOW_ROWS = 3
function randomOrder(pool: readonly string[], length?: number, rng?: () => number): string[]
function windowStart(typedLength: number): number
STRINGS.attack, STRINGS.minutes(n), STRINGS.attackTitle(n), STRINGS.remaining, STRINGS.correctCount, STRINGS.charsUnit(n)
```

- [ ] **Step 1: Write the failing tests**

`src/lib/attack.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { ATTACK_ORDER_LENGTH, randomOrder, windowStart } from './attack'

const pool = [...'的一是不了在人有我他']

function seeded(seed: number) {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296
    return s / 4294967296
  }
}

describe('randomOrder', () => {
  it('draws the requested length from the pool', () => {
    const order = randomOrder(pool, 50, seeded(1))
    expect(order).toHaveLength(50)
    for (const ch of order) expect(pool).toContain(ch)
  })

  it('defaults to 600 characters', () => {
    expect(randomOrder(pool, undefined, seeded(2))).toHaveLength(ATTACK_ORDER_LENGTH)
  })

  it('never repeats a character immediately', () => {
    const order = randomOrder(pool, 600, seeded(3))
    for (let i = 1; i < order.length; i++) expect(order[i]).not.toBe(order[i - 1])
  })

  it('is deterministic for a given rng', () => {
    expect(randomOrder(pool, 30, seeded(4))).toEqual(randomOrder(pool, 30, seeded(4)))
  })

  it('uses more than a handful of the pool', () => {
    expect(new Set(randomOrder(pool, 100, seeded(5))).size).toBeGreaterThan(5)
  })
})

describe('windowStart', () => {
  it('keeps the first row on top until the cursor reaches row two', () => {
    expect(windowStart(0)).toBe(0)
    expect(windowStart(19)).toBe(0)
    expect(windowStart(20)).toBe(0)
    expect(windowStart(39)).toBe(0)
  })

  it('keeps the cursor row in the middle afterwards', () => {
    expect(windowStart(40)).toBe(20)
    expect(windowStart(59)).toBe(20)
    expect(windowStart(60)).toBe(40)
    expect(windowStart(123)).toBe(100)
  })
})
```

Append to `src/lib/scoring.test.ts` inside `describe('accuracy', ...)`:

```ts
  it('is 0 when nothing was typed', () => {
    expect(accuracy(0, 0)).toBe(0)
  })

  it('uses the given total', () => {
    expect(accuracy(3, 140)).toBeCloseTo(137 / 140)
  })
```

Append to `src/lib/strings.test.ts` inside `describe('STRINGS', ...)`:

```ts
  it('formats the time attack strings', () => {
    expect(STRINGS.minutes(2)).toBe('2 分鐘')
    expect(STRINGS.attackTitle(3)).toBe('限時挑戰 · 3 分鐘')
    expect(STRINGS.charsUnit(137)).toBe('137 字')
  })
```

- [ ] **Step 2: Run to verify they fail**

```bash
npm test -- src/lib
```

Expected: attack tests fail (module missing); `accuracy(0, 0)` fails (returns 1 today); strings test fails.

- [ ] **Step 3: Types**

Replace `src/lib/types.ts`:

```ts
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
```

- [ ] **Step 4: Strings**

In `src/lib/strings.ts`, after `backToSets: '返回選單',` add:

```ts

  attack: '限時挑戰',
  minutes: (n: number) => `${n} 分鐘`,
  attackTitle: (n: number) => `限時挑戰 · ${n} 分鐘`,
  remaining: '剩餘',
  correctCount: '打對',
  charsUnit: (n: number) => `${n} 字`,
```

- [ ] **Step 5: Scoring guard**

In `src/lib/scoring.ts`, replace `accuracy`:

```ts
export function accuracy(wrongCount: number, total = DEFAULT_TOTAL): number {
  if (total <= 0) return 0
  return Math.max(0, total - wrongCount) / total
}
```

- [ ] **Step 6: Random order helper**

`src/lib/attack.ts`:

```ts
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
```

- [ ] **Step 7: Run and commit**

```bash
npm test -- src/lib
npx tsc -p tsconfig.app.json --noEmit
```

The type check will report errors in `Drill.tsx`, `Report.test.tsx`, and `App.tsx` because `RunResult` gained required fields. That is expected until Tasks 4 to 6; to keep the suite green in the meantime, do NOT run `npm run build` yet, and run `npm test -- src/lib` only. Vitest does not type-check, so it stays green.

```bash
git add src/lib
git commit -m "feat: types, strings, and random order for time attack"
```

---

### Task 2: Time limit in the hook

**Files:**
- Modify: `src/hooks/useDrill.ts`, `src/hooks/useDrill.test.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces, added to `UseDrillOptions`: `limitMs?: number`. Added to `Drill`: `remainingMs(): number`, `isExpired: boolean`, `expire(): void`.

- [ ] **Step 1: Write the failing tests**

Append inside `describe('useDrill', ...)` in `src/hooks/useDrill.test.ts`:

```ts
  describe('time limit', () => {
    it('reports Infinity remaining and never expires without a limit', () => {
      const clock = fakeClock(0)
      const { result } = renderHook(() => useDrill(order, { now: clock.now }))
      act(() => result.current.onInput(order[0], false))
      clock.advance(999_999)
      act(() => result.current.expire())
      expect(result.current.remainingMs()).toBe(Infinity)
      expect(result.current.isExpired).toBe(false)
      expect(result.current.isDone).toBe(false)
    })

    it('counts down and clamps at zero', () => {
      const clock = fakeClock(0)
      const { result } = renderHook(() => useDrill(order, { now: clock.now, limitMs: 60_000 }))
      expect(result.current.remainingMs()).toBe(60_000)
      act(() => result.current.onInput(order[0], false))
      clock.advance(15_000)
      expect(result.current.remainingMs()).toBe(45_000)
      clock.advance(60_000)
      expect(result.current.remainingMs()).toBe(0)
    })

    it('does not expire before the clock starts or before the limit', () => {
      const clock = fakeClock(0)
      const { result } = renderHook(() => useDrill(order, { now: clock.now, limitMs: 60_000 }))
      clock.advance(120_000)
      act(() => result.current.expire())
      expect(result.current.isDone).toBe(false)
      act(() => result.current.onInput(order[0], false))
      clock.advance(59_999)
      act(() => result.current.expire())
      expect(result.current.isDone).toBe(false)
    })

    it('expires at the limit with elapsed exactly the limit, excluding pauses', () => {
      const clock = fakeClock(0)
      const { result } = renderHook(() => useDrill(order, { now: clock.now, limitMs: 60_000 }))
      act(() => result.current.onInput(order[0], false))
      clock.advance(10_000)
      act(() => result.current.pause())
      clock.advance(30_000)
      act(() => result.current.resume())
      clock.advance(50_000)
      act(() => result.current.expire())
      expect(result.current.isDone).toBe(false)
      clock.advance(150)
      act(() => result.current.expire())
      expect(result.current.isDone).toBe(true)
      expect(result.current.isExpired).toBe(true)
      expect(result.current.elapsedMs()).toBe(60_000)
      expect(result.current.remainingMs()).toBe(0)
    })

    it('ignores input after expiry', () => {
      const clock = fakeClock(0)
      const { result } = renderHook(() => useDrill(order, { now: clock.now, limitMs: 1_000 }))
      act(() => result.current.onInput(order[0], false))
      clock.advance(1_000)
      act(() => result.current.expire())
      act(() => result.current.onInput(order[0] + order[1], false))
      expect([...result.current.typed]).toHaveLength(1)
    })

    it('does not expire while paused', () => {
      const clock = fakeClock(0)
      const { result } = renderHook(() => useDrill(order, { now: clock.now, limitMs: 1_000 }))
      act(() => result.current.onInput(order[0], false))
      clock.advance(500)
      act(() => result.current.pause())
      clock.advance(5_000)
      act(() => result.current.expire())
      expect(result.current.isDone).toBe(false)
    })
  })
```

- [ ] **Step 2: Run to verify they fail**

```bash
npm test -- src/hooks
```

Expected: the six new tests fail (`expire is not a function` and similar).

- [ ] **Step 3: Implement**

In `src/hooks/useDrill.ts`:

Add to `UseDrillOptions`:

```ts
  /** Time attack: the run ends when elapsed time reaches this. */
  limitMs?: number
```

Add to `Drill` after `elapsedMs(): number`:

```ts
  /** Time left before the limit; Infinity without a limit; clamped at 0. */
  remainingMs(): number
  isExpired: boolean
  /** Ends the run if the limit has been reached. No-op otherwise. */
  expire(): void
```

Inside `useDrill`, after `const rng = ...`:

```ts
  const limitMs = options.limitMs
```

After the `elapsedMs` callback:

```ts
  const remainingMs = useCallback(() => {
    if (limitMs === undefined) return Infinity
    return Math.max(0, limitMs - elapsedMs())
  }, [limitMs, elapsedMs])

  const expire = useCallback(() => {
    if (limitMs === undefined) return
    const t = now()
    setState((prev) => {
      if (prev.startedAt === null || prev.endedAt !== null || prev.pausedAt !== null) return prev
      const elapsed = t - prev.startedAt - prev.pausedMs
      if (elapsed < limitMs) return prev
      return { ...prev, endedAt: prev.startedAt + prev.pausedMs + limitMs }
    })
  }, [limitMs, now])
```

Before the `return`, compute:

```ts
  const isExpired =
    limitMs !== undefined &&
    state.startedAt !== null &&
    state.endedAt !== null &&
    state.endedAt - state.startedAt - state.pausedMs >= limitMs
```

In the returned object add `remainingMs,`, `isExpired,`, and `expire,`.

- [ ] **Step 4: Run and commit**

```bash
npm test -- src/hooks
git add src/hooks
git commit -m "feat: add a time limit and expiry to useDrill"
```

Expected: hook suite 25 passed (19 existing + 6).

---

### Task 3: Attack bests in storage

**Files:**
- Modify: `src/lib/storage.ts`, `src/lib/storage.test.ts`

**Interfaces:**
- Consumes: `AttackBestRecord`, `AttackBests` from `src/lib/types.ts`.
- Produces: `ATTACK_STORAGE_KEY = 'cangjie-trainer:attack-bests'`, `loadAttackBests(storage?): AttackBests`, `saveAttackBest(minutes: number, record: AttackBestRecord, storage?): void`, `qualifiesAsAttackBest(existing: AttackBestRecord | undefined, candidate: { cpm: number; accuracy: number; typedCount: number }): boolean`.

- [ ] **Step 1: Write the failing tests**

Append to `src/lib/storage.test.ts` (the file already defines `fakeStorage` and `throwingStorage`):

```ts
import { ATTACK_STORAGE_KEY, loadAttackBests, qualifiesAsAttackBest, saveAttackBest } from './storage'
import type { AttackBestRecord } from './types'

const attackRecord: AttackBestRecord = { cpm: 46, accuracy: 0.95, recordedAt: '2026-09-11T00:00:00.000Z' }

describe('attack bests', () => {
  it('round trips by minutes and keeps other durations', () => {
    const storage = fakeStorage()
    saveAttackBest(1, attackRecord, storage)
    saveAttackBest(3, { ...attackRecord, cpm: 40 }, storage)
    expect(loadAttackBests(storage)).toEqual({ 1: attackRecord, 3: { ...attackRecord, cpm: 40 } })
  })

  it('uses its own key', () => {
    const storage = fakeStorage()
    saveAttackBest(2, attackRecord, storage)
    expect(storage.getItem(ATTACK_STORAGE_KEY)).not.toBeNull()
    expect(storage.getItem('cangjie-trainer:bests')).toBeNull()
  })

  it('drops malformed entries and survives corrupt JSON and throwing storage', () => {
    expect(loadAttackBests(fakeStorage({ [ATTACK_STORAGE_KEY]: '{oops' }))).toEqual({})
    const stored = JSON.stringify({ 1: attackRecord, 2: { cpm: 'fast' }, 3: null })
    expect(loadAttackBests(fakeStorage({ [ATTACK_STORAGE_KEY]: stored }))).toEqual({ 1: attackRecord })
    expect(loadAttackBests(throwingStorage())).toEqual({})
    expect(() => saveAttackBest(1, attackRecord, throwingStorage())).not.toThrow()
  })
})

describe('qualifiesAsAttackBest', () => {
  it('accepts the first accurate run with something typed', () => {
    expect(qualifiesAsAttackBest(undefined, { cpm: 30, accuracy: 0.9, typedCount: 30 })).toBe(true)
  })

  it('rejects an empty or sloppy run', () => {
    expect(qualifiesAsAttackBest(undefined, { cpm: 0, accuracy: 0, typedCount: 0 })).toBe(false)
    expect(qualifiesAsAttackBest(undefined, { cpm: 50, accuracy: 0.89, typedCount: 50 })).toBe(false)
  })

  it('needs a strictly higher cpm than the record', () => {
    expect(qualifiesAsAttackBest(attackRecord, { cpm: 47, accuracy: 1, typedCount: 47 })).toBe(true)
    expect(qualifiesAsAttackBest(attackRecord, { cpm: 46, accuracy: 1, typedCount: 46 })).toBe(false)
    expect(qualifiesAsAttackBest(attackRecord, { cpm: 45, accuracy: 1, typedCount: 45 })).toBe(false)
  })
})
```

Place the two new imports at the top of the file with the existing ones.

- [ ] **Step 2: Run to verify they fail**

```bash
npm test -- src/lib/storage
```

Expected: FAIL, the new exports do not exist.

- [ ] **Step 3: Implement**

In `src/lib/storage.ts`:

Change the type import to `import type { AttackBestRecord, AttackBests, BestRecord, Bests } from './types'`.

After `MIN_BEST_ACCURACY` add:

```ts
export const ATTACK_STORAGE_KEY = 'cangjie-trainer:attack-bests'
```

After `isRecord` add:

```ts
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
```

At the end of the file add:

```ts
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
  if (candidate.typedCount <= 0) return false
  if (candidate.accuracy < MIN_BEST_ACCURACY) return false
  if (!existing) return true
  return candidate.cpm > existing.cpm
}
```

- [ ] **Step 4: Run and commit**

```bash
npm test -- src/lib/storage
git add src/lib/storage.ts src/lib/storage.test.ts
git commit -m "feat: store per-duration time attack bests"
```

---

### Task 4: Attack mode in the Drill

**Files:**
- Modify: `src/components/Drill.tsx`, `src/components/Drill.module.css`, `src/components/Drill.test.tsx`

**Interfaces:**
- Consumes: `useDrill` with `limitMs`, `remainingMs`, `isRunning`, `expire`; `windowStart`, `ROW_LENGTH`, `WINDOW_ROWS` from `src/lib/attack.ts`; `STRINGS.attackTitle`, `STRINGS.remaining`.
- Produces: `DrillProps` gains `durationMs?: number` (required in practice when `mode === 'attack'`). `onFinish` receives the full new `RunResult`.

- [ ] **Step 1: Update existing tests for the new `RunResult` and add attack tests**

In `src/components/Drill.test.tsx`, in `calls onFinish with the result when a timed run completes`, add after the `setIndex` assertion:

```tsx
    expect(result.kind).toBe('set')
    expect(result.durationMs).toBe(0)
    expect(result.typedCount).toBe(100)
    expect(result.correctCount).toBe(99)
```

Append inside `describe('Drill', ...)`:

```tsx
  describe('attack', () => {
    const attackOrder = Array.from({ length: 600 }, (_, i) => order[i % 100])

    afterEach(() => vi.useRealTimers())

    function renderAttack(onFinish = vi.fn(), now = () => 0) {
      render(
        <Drill setIndex={-1} mode="attack" order={attackOrder} durationMs={60_000} onFinish={onFinish} onBack={() => {}} now={now} />,
      )
      return onFinish
    }

    it('shows the attack title and a countdown', () => {
      renderAttack()
      expect(screen.getByText(STRINGS.attackTitle(1))).toBeInTheDocument()
      expect(screen.getByRole('timer', { name: STRINGS.remaining })).toHaveTextContent('1:00.0')
    })

    it('shows a three-row window that follows the cursor', () => {
      renderAttack()
      const glyphs = () => [...document.querySelectorAll('[data-state]')].map((el) => el.textContent)
      expect(glyphs()).toHaveLength(60)
      expect(glyphs()[0]).toBe(attackOrder[0])
      typeCommitted(attackOrder.slice(0, 40).join(''))
      expect(glyphs()[0]).toBe(attackOrder[20])
      expect(glyphs()).toHaveLength(60)
      expect(document.querySelectorAll('[data-state="current"]')).toHaveLength(1)
    })

    it('ends when the countdown reaches zero and reports the counts', () => {
      vi.useFakeTimers()
      let t = 0
      const onFinish = renderAttack(vi.fn(), () => t)
      typeCommitted(attackOrder.slice(0, 10).join(''))
      typeCommitted(attackOrder.slice(0, 10).join('') + '錯' + attackOrder.slice(11, 30).join(''))
      t = 59_000
      act(() => {
        vi.advanceTimersByTime(100)
      })
      expect(onFinish).not.toHaveBeenCalled()
      t = 60_050
      act(() => {
        vi.advanceTimersByTime(100)
      })
      expect(onFinish).toHaveBeenCalledTimes(1)
      const result = onFinish.mock.calls[0][0]
      expect(result.kind).toBe('attack')
      expect(result.setIndex).toBe(-1)
      expect(result.durationMs).toBe(60_000)
      expect(result.elapsedMs).toBe(60_000)
      expect(result.typedCount).toBe(30)
      expect(result.wrongCount).toBe(1)
      expect(result.correctCount).toBe(29)
      expect(result.missed).toEqual([attackOrder[10]])
      expect(screen.getByRole('textbox')).toBeDisabled()
    })

    it('a pause extends the run', () => {
      vi.useFakeTimers()
      let t = 0
      const onFinish = renderAttack(vi.fn(), () => t)
      typeCommitted(attackOrder[0])
      t = 10_000
      fireEvent.click(screen.getByRole('button', { name: STRINGS.pause }))
      t = 50_000
      fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: STRINGS.resume }))
      t = 65_000
      act(() => {
        vi.advanceTimersByTime(100)
      })
      expect(onFinish).not.toHaveBeenCalled()
      t = 100_100
      act(() => {
        vi.advanceTimersByTime(100)
      })
      expect(onFinish).toHaveBeenCalledTimes(1)
    })

    it('hides the set name and the done mark', () => {
      renderAttack()
      expect(screen.queryByText(STRINGS.setName(0))).not.toBeInTheDocument()
      expect(screen.queryByText(STRINGS.done)).not.toBeInTheDocument()
    })
  })
```

Add `act` to the Testing Library import: `import { act, fireEvent, render, screen, within } from '@testing-library/react'`.

- [ ] **Step 2: Run to verify they fail**

```bash
npm test -- src/components/Drill
```

Expected: the attack tests fail; the `kind` assertions in the timed test fail.

- [ ] **Step 3: Implement**

Replace `src/components/Drill.tsx`:

```tsx
import { useEffect, useRef } from 'react'
import { useDrill } from '../hooks/useDrill'
import { ROW_LENGTH, WINDOW_ROWS, windowStart } from '../lib/attack'
import { missedCharacters } from '../lib/scoring'
import { STRINGS } from '../lib/strings'
import type { Mode, RunResult } from '../lib/types'
import { Button } from './Button'
import { CharacterGrid } from './CharacterGrid'
import { Clock } from './Clock'
import { DrillInput } from './DrillInput'
import styles from './Drill.module.css'

export interface DrillProps {
  setIndex: number
  mode: Mode
  order: string[]
  /** Required when mode is 'attack'. */
  durationMs?: number
  onFinish(result: RunResult): void
  onBack(): void
  now?: () => number
}

const IME_PROCESSING_KEY_CODE = 229
/** Escape pressed this soon after a composition ended was cancelling that composition. */
const COMPOSITION_END_GRACE_MS = 100
const EXPIRE_TICK_MS = 100

export function Drill({ setIndex, mode, order, durationMs, onFinish, onBack, now }: DrillProps) {
  const attack = mode === 'attack'
  const drill = useDrill(order, { now, limitMs: attack ? durationMs : undefined })
  const {
    isPaused,
    isRunning,
    isDone,
    startedAt,
    runId,
    typed,
    states,
    pause,
    resume,
    scramble,
    restart,
    onInput,
    elapsedMs,
    remainingMs,
    expire,
    wrongPositions,
    order: drillOrder,
  } = drill
  const inputRef = useRef<HTMLInputElement | null>(null)
  const resumeRef = useRef<HTMLButtonElement | null>(null)
  const reported = useRef(false)
  const composing = useRef(false)
  const compositionEndedAt = useRef(-Infinity)
  const clocked = mode === 'timed' || attack
  const canPause = startedAt !== null && !isDone

  useEffect(() => {
    reported.current = false
  }, [runId])

  useEffect(() => {
    if (!clocked || !isDone || reported.current) return
    reported.current = true
    const typedCount = [...typed].length
    onFinish({
      kind: attack ? 'attack' : 'set',
      setIndex,
      durationMs: attack ? (durationMs ?? 0) : 0,
      order: drillOrder,
      elapsedMs: elapsedMs(),
      typedCount,
      correctCount: typedCount - wrongPositions.length,
      wrongCount: wrongPositions.length,
      missed: missedCharacters(drillOrder, wrongPositions),
    })
  }, [clocked, attack, durationMs, isDone, typed, drillOrder, elapsedMs, wrongPositions, onFinish, setIndex])

  // Time attack: end the run when the countdown reaches zero.
  useEffect(() => {
    if (!attack || !isRunning) return
    const id = setInterval(expire, EXPIRE_TICK_MS)
    return () => clearInterval(id)
  }, [attack, isRunning, expire])

  // Pausing disables the input, so move focus to the overlay's resume button;
  // resuming hands it back to the input.
  useEffect(() => {
    if (isPaused) resumeRef.current?.focus()
    else inputRef.current?.focus()
  }, [isPaused])

  // Track IME composition at the document level so the Escape guard below
  // does not depend on how a browser orders compositionend and keydown.
  useEffect(() => {
    if (!clocked) return
    const onStart = () => {
      composing.current = true
    }
    const onEnd = () => {
      composing.current = false
      compositionEndedAt.current = Date.now()
    }
    document.addEventListener('compositionstart', onStart)
    document.addEventListener('compositionend', onEnd)
    return () => {
      document.removeEventListener('compositionstart', onStart)
      document.removeEventListener('compositionend', onEnd)
    }
  }, [clocked])

  // Escape toggles pause, except when it is cancelling an IME composition.
  useEffect(() => {
    if (!clocked) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      const cancellingComposition =
        e.isComposing ||
        e.keyCode === IME_PROCESSING_KEY_CODE ||
        composing.current ||
        Date.now() - compositionEndedAt.current < COMPOSITION_END_GRACE_MS
      if (cancellingComposition) return
      if (isPaused) {
        e.preventDefault()
        resume()
      } else if (canPause) {
        e.preventDefault()
        pause()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [clocked, isPaused, canPause, pause, resume])

  // Auto-pause when the page is hidden. Never auto-resume.
  useEffect(() => {
    if (!clocked) return
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') pause()
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [clocked, pause])

  const focusInput = () => inputRef.current?.focus()

  const handleInput = (value: string, isComposing: boolean) => {
    onInput(value, isComposing)
    if (attack) expire()
  }

  // Attack mode shows a rolling three-row window; sets show everything.
  const start = attack ? windowStart([...typed].length) : 0
  const end = attack ? start + ROW_LENGTH * WINDOW_ROWS : drillOrder.length
  const visibleOrder = drillOrder.slice(start, end)
  const visibleStates = states.slice(start, end)
  const minutes = Math.round((durationMs ?? 0) / 60_000)

  return (
    <main className={styles.screen} onClick={focusInput}>
      <header className={styles.bar}>
        <div className={styles.title}>
          {attack ? (
            <span className={styles.setName}>{STRINGS.attackTitle(minutes)}</span>
          ) : (
            <>
              <span className={styles.setName}>{STRINGS.setName(setIndex + 1)}</span>
              <span className={styles.mode}>{mode === 'timed' ? STRINGS.timed : STRINGS.free}</span>
            </>
          )}
        </div>
        {clocked && (
          <span className={styles.clock} role="timer" aria-label={attack ? STRINGS.remaining : STRINGS.time}>
            <Clock elapsedMs={attack ? remainingMs : elapsedMs} running={isRunning} />
          </span>
        )}
        {clocked && (
          <Button variant="secondary" onClick={isPaused ? resume : pause} disabled={!canPause}>
            {isPaused ? STRINGS.resume : STRINGS.pause}
          </Button>
        )}
        <Button variant="secondary" onClick={scramble}>
          {STRINGS.scramble}
        </Button>
        <Button variant="secondary" onClick={restart}>
          {STRINGS.restart}
        </Button>
        <Button variant="ghost" onClick={onBack}>
          {STRINGS.back}
        </Button>
      </header>

      <div className={styles.gridArea}>
        {/* The grid keeps its layout box while paused so the page does not jump. */}
        <CharacterGrid order={visibleOrder} states={visibleStates} concealed={isPaused} />
        {isPaused && (
          <div className={styles.pausedOverlay} role="dialog" aria-labelledby="paused-label">
            <p id="paused-label" className={styles.pausedLabel}>
              {STRINGS.paused}
            </p>
            <Button ref={resumeRef} variant="primary" onClick={resume}>
              {STRINGS.resume}
            </Button>
          </div>
        )}
      </div>

      <p className={styles.hint}>{STRINGS.hint}</p>

      <DrillInput key={runId} onValue={handleInput} inputRef={inputRef} disabled={isDone || isPaused} />

      {mode === 'free' && isDone && <p className={styles.done}>{STRINGS.done}</p>}
    </main>
  )
}
```

Two notes for the implementer:
- `CharacterGrid` keys glyphs by index, so a sliding window re-renders glyph text in place. That is correct and cheap.
- The existing timed test `hides the clock in free mode` still passes: no `role="timer"` in free mode.

No CSS change is required; `.clock` already exists. If the countdown looks cramped next to the longer attack title on narrow screens, allow the title to shrink by adding `min-width: 0` to `.title` in `Drill.module.css`.

- [ ] **Step 4: Run and commit**

```bash
npm test -- src/components/Drill
npm test -- src/components/Clock src/hooks
git add src/components/Drill.tsx src/components/Drill.module.css src/components/Drill.test.tsx
git commit -m "feat: time attack mode in the drill with a rolling window and countdown"
```

Expected: Drill suite passes (the previous tests plus five attack tests). `npm run build` still fails on `Report.test.tsx` and `App.tsx` until Tasks 5 and 6.

---

### Task 5: Report and Home

**Files:**
- Modify: `src/components/Report.tsx`, `src/components/Report.test.tsx`, `src/components/Home.tsx`, `src/components/Home.module.css`, `src/components/Home.test.tsx`

**Interfaces:**
- Consumes: new `RunResult`, `AttackBests`, `ATTACK_MINUTES`, strings.
- Produces:

```ts
interface ReportProps {
  result: RunResult
  isNewBest: boolean
  /** Formatted previous record, for example 最佳 1:20.0 or 最佳 46 每分鐘字數; undefined when none. */
  previousBestText: string | undefined
  onRetry(): void
  /** Omitted for attacks; the button is hidden when absent. */
  onRetryScrambled?: () => void
  onBack(): void
}
interface HomeProps {
  bests: Bests
  attackBests: AttackBests
  onStart(setIndex: number, mode: Mode): void
  onStartAttack(minutes: AttackMinutes): void
}
```

- [ ] **Step 1: Update the Report tests**

In `src/components/Report.test.tsx`:

Replace the `result` fixture:

```tsx
const result: RunResult = {
  kind: 'set',
  setIndex: 0,
  durationMs: 0,
  order: [...'的一是'],
  elapsedMs: 90_000,
  typedCount: 100,
  correctCount: 95,
  wrongCount: 5,
  missed: ['的', '是'],
}
```

Every `previousBest={undefined}` becomes `previousBestText={undefined}`. In `shows the previous best otherwise`, replace the `previousBest={{ bestMs: 80_000, accuracy: 1, recordedAt: '' }}` prop with `previousBestText={STRINGS.best('1:20.0')}` (the assertion stays `STRINGS.best('1:20.0')`).

Append inside `describe('Report', ...)`:

```tsx
  it('reports a time attack by characters per minute and correct count', async () => {
    const onRetry = vi.fn()
    const attack: RunResult = {
      kind: 'attack',
      setIndex: -1,
      durationMs: 120_000,
      order: [],
      elapsedMs: 120_000,
      typedCount: 140,
      correctCount: 137,
      wrongCount: 3,
      missed: ['嗰'],
    }
    render(<Report result={attack} isNewBest={false} previousBestText={undefined} onRetry={onRetry} onBack={noop} />)
    expect(screen.getByRole('heading', { name: STRINGS.attackTitle(2) })).toBeInTheDocument()
    expect(screen.getByText('69')).toBeInTheDocument() // round(137 / 2)
    expect(screen.getByText('98%')).toBeInTheDocument() // 137 / 140
    expect(screen.getByText(STRINGS.charsUnit(137))).toBeInTheDocument()
    expect(screen.getByText(STRINGS.correctCount)).toBeInTheDocument()
    expect(screen.queryByText(STRINGS.time)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: STRINGS.retryScrambled })).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: STRINGS.retry }))
    expect(onRetry).toHaveBeenCalled()
  })
```

- [ ] **Step 2: Update the Home tests**

In `src/components/Home.test.tsx`, every `render(<Home bests={...} onStart={...} />)` gains `attackBests={{}} onStartAttack={() => {}}`. Append inside `describe('Home', ...)`:

```tsx
  it('offers three time attack durations with bests', async () => {
    const onStartAttack = vi.fn()
    render(
      <Home
        bests={{}}
        attackBests={{ 2: { cpm: 46, accuracy: 0.95, recordedAt: '' } }}
        onStart={() => {}}
        onStartAttack={onStartAttack}
      />,
    )
    const card = screen.getByRole('article', { name: STRINGS.attack })
    await userEvent.click(within(card).getByRole('button', { name: STRINGS.minutes(1) }))
    expect(onStartAttack).toHaveBeenCalledWith(1)
    await userEvent.click(within(card).getByRole('button', { name: STRINGS.minutes(3) }))
    expect(onStartAttack).toHaveBeenCalledWith(3)
    expect(within(card).getByText(`46 ${STRINGS.charsPerMinute} · 95%`)).toBeInTheDocument()
    expect(within(card).getAllByText(STRINGS.noBest)).toHaveLength(2)
  })
```

- [ ] **Step 3: Run to verify they fail**

```bash
npm test -- src/components/Report src/components/Home
```

Expected: the new tests fail; the existing Report tests fail on the changed prop name.

- [ ] **Step 4: Implement Report**

Replace `src/components/Report.tsx`:

```tsx
import { CANGJIE } from '../data/cangjie'
import { radicalsFor } from '../lib/cangjie'
import { accuracy, charsPerMinute, formatTime } from '../lib/scoring'
import { STRINGS } from '../lib/strings'
import type { RunResult } from '../lib/types'
import { Button } from './Button'
import styles from './Report.module.css'

export interface ReportProps {
  result: RunResult
  isNewBest: boolean
  /** Formatted previous record, or undefined when there is none. */
  previousBestText: string | undefined
  onRetry(): void
  /** Omitted for time attacks; the button is hidden when absent. */
  onRetryScrambled?: () => void
  onBack(): void
}

export function Report({ result, isNewBest, previousBestText, onRetry, onRetryScrambled, onBack }: ReportProps) {
  const attack = result.kind === 'attack'
  const minutes = Math.round(result.durationMs / 60_000)
  const cpm = attack ? charsPerMinute(result.durationMs, result.correctCount) : charsPerMinute(result.elapsedMs, result.typedCount)
  const acc = Math.round(accuracy(result.wrongCount, result.typedCount) * 100)

  let recordText: string
  let recordClass = styles.statValue
  if (isNewBest) {
    recordText = STRINGS.newBest
    recordClass = `${styles.statValue} ${styles.newBest}`
  } else if (previousBestText) {
    recordText = previousBestText
  } else {
    recordText = STRINGS.noRecord
  }

  return (
    <main className={styles.screen}>
      <section className={styles.card} aria-labelledby="report-heading">
        <h1 id="report-heading" className={styles.heading}>
          {attack ? STRINGS.attackTitle(minutes) : STRINGS.setComplete(result.setIndex + 1)}
        </h1>

        <div className={styles.hero}>
          <span className={styles.speed}>{cpm}</span>
          <span className={styles.speedLabel}>{STRINGS.charsPerMinute}</span>
        </div>

        <div className={styles.stats}>
          <div className={styles.stat}>
            <span className={styles.statValue}>{acc}%</span>
            <span className={styles.statLabel}>{STRINGS.accuracy}</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statValue}>{attack ? STRINGS.charsUnit(result.correctCount) : formatTime(result.elapsedMs)}</span>
            <span className={styles.statLabel}>{attack ? STRINGS.correctCount : STRINGS.time}</span>
          </div>
          <div className={styles.stat}>
            <span className={recordClass}>{recordText}</span>
            <span className={styles.statLabel}>{STRINGS.record}</span>
          </div>
        </div>

        <div>
          <p className={styles.missedLabel} id="missed-label">
            {STRINGS.missed}
          </p>
          {result.missed.length === 0 ? (
            <p className={styles.none}>{STRINGS.noMistakes}</p>
          ) : (
            <ul className={styles.missed} aria-labelledby="missed-label">
              {result.missed.map((ch) => {
                const code = CANGJIE[ch]
                return (
                  <li key={ch} className={styles.missedCard}>
                    <span className={styles.missedGlyph}>{ch}</span>
                    {code && (
                      <>
                        <span className={styles.missedRadicals}>{radicalsFor(code)}</span>
                        <span className={styles.missedCode}>{code}</span>
                      </>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        <div className={styles.actions}>
          <Button variant="primary" onClick={onRetry}>
            {STRINGS.retry}
          </Button>
          {onRetryScrambled && (
            <Button variant="secondary" onClick={onRetryScrambled}>
              {STRINGS.retryScrambled}
            </Button>
          )}
          <Button variant="ghost" onClick={onBack}>
            {STRINGS.backToSets}
          </Button>
        </div>
      </section>
    </main>
  )
}
```

- [ ] **Step 5: Implement Home**

Replace `src/components/Home.tsx`:

```tsx
import { SETS, SET_SIZE } from '../data/sets'
import { ATTACK_MINUTES } from '../lib/attack'
import { formatTime } from '../lib/scoring'
import { STRINGS } from '../lib/strings'
import type { AttackBests, AttackMinutes, Bests, Mode } from '../lib/types'
import { Button } from './Button'
import styles from './Home.module.css'

export interface HomeProps {
  bests: Bests
  attackBests: AttackBests
  onStart(setIndex: number, mode: Mode): void
  onStartAttack(minutes: AttackMinutes): void
}

export function Home({ bests, attackBests, onStart, onStartAttack }: HomeProps) {
  return (
    <main className={styles.screen}>
      <header className={styles.header}>
        <h1 className={styles.title}>{STRINGS.appTitle}</h1>
        <p className={styles.subtitle}>{STRINGS.subtitle}</p>
      </header>

      <article className={`${styles.card} ${styles.attackCard}`} aria-labelledby="attack-title">
        <div className={styles.cardHead}>
          <h2 id="attack-title" className={styles.setName}>
            {STRINGS.attack}
          </h2>
        </div>
        <ul className={styles.attackList}>
          {ATTACK_MINUTES.map((minutes) => {
            const best = attackBests[minutes]
            return (
              <li key={minutes} className={styles.attackRow}>
                <Button variant="primary" onClick={() => onStartAttack(minutes)}>
                  {STRINGS.minutes(minutes)}
                </Button>
                <span className={styles.best}>
                  <span className={styles.bestLabel}>{STRINGS.bestLabel}</span>
                  <span>{best ? `${best.cpm} ${STRINGS.charsPerMinute} · ${Math.round(best.accuracy * 100)}%` : STRINGS.noBest}</span>
                </span>
              </li>
            )
          })}
        </ul>
      </article>

      <div className={styles.grid}>
        {SETS.map((set, i) => {
          const best = bests[i]
          return (
            <article key={i} className={styles.card} aria-labelledby={`set-${i + 1}-title`}>
              <div className={styles.cardHead}>
                <h2 id={`set-${i + 1}-title`} className={styles.setName}>
                  {STRINGS.setName(i + 1)}
                </h2>
                <span className={styles.range}>{STRINGS.setRange(i * SET_SIZE + 1, (i + 1) * SET_SIZE)}</span>
              </div>
              <div className={styles.preview} aria-hidden="true">
                {set.slice(0, 8).join('')}
              </div>
              <div className={styles.best}>
                <span className={styles.bestLabel}>{STRINGS.bestLabel}</span>
                {best ? (
                  <>
                    <span>{formatTime(best.bestMs)}</span>
                    <span>{Math.round(best.accuracy * 100)}%</span>
                  </>
                ) : (
                  <span>{STRINGS.noBest}</span>
                )}
              </div>
              <div className={styles.actions}>
                <Button variant="primary" onClick={() => onStart(i, 'timed')}>
                  {STRINGS.timed}
                </Button>
                <Button variant="secondary" onClick={() => onStart(i, 'free')}>
                  {STRINGS.free}
                </Button>
              </div>
            </article>
          )
        })}
      </div>
    </main>
  )
}
```

Append to `src/components/Home.module.css`:

```css
.attackCard {
  margin-bottom: 1.5rem;
}

.attackList {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr));
  gap: 0.75rem 1.5rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.attackRow {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}
```

Note: `Home.test.tsx`'s existing `renders ten set cards` asserts `getAllByRole('article')` has length 10. The attack card makes it 11. Change that assertion to `toHaveLength(11)` and the `cards[0]` / `cards[1]` / `[3]` indexes in the other Home tests to `cards[1]` / `cards[2]` / `[4]`, since the attack card comes first. Alternatively query set cards by name: `screen.getByRole('article', { name: STRINGS.setName(1) })`. Prefer the by-name form where an index was used.

- [ ] **Step 6: Run and commit**

```bash
npm test -- src/components/Report src/components/Home
git add src/components/Report.tsx src/components/Report.test.tsx src/components/Home.tsx src/components/Home.module.css src/components/Home.test.tsx
git commit -m "feat: time attack card on Home and attack-aware Report"
```

---

### Task 6: App wiring

**Files:**
- Modify: `src/App.tsx`, `src/App.test.tsx`

**Interfaces:**
- Consumes: everything above.

- [ ] **Step 1: Update the App tests**

In `src/App.test.tsx`:

- Every `screen.getAllByRole('article')[n]` that meant a set card becomes `screen.getByRole('article', { name: STRINGS.setName(n + 1) })`, because the attack card is now the first article.
- Append inside `describe('App', ...)`:

```tsx
  it('starts a time attack from the home card', async () => {
    render(<App />)
    const card = screen.getByRole('article', { name: STRINGS.attack })
    await userEvent.click(within(card).getByRole('button', { name: STRINGS.minutes(1) }))
    expect(screen.getByText(STRINGS.attackTitle(1))).toBeInTheDocument()
    expect(screen.getByRole('timer', { name: STRINGS.remaining })).toHaveTextContent('1:00.0')
    expect(document.querySelectorAll('[data-state]')).toHaveLength(60)
  })
```

- [ ] **Step 2: Run to verify it fails**

```bash
npm test -- src/App
```

Expected: the attack test fails (no attack card wired); others may fail on the article query change until Step 3.

- [ ] **Step 3: Implement**

Replace `src/App.tsx`:

```tsx
import { useCallback, useRef, useState } from 'react'
import { Drill } from './components/Drill'
import { Home } from './components/Home'
import { Report } from './components/Report'
import { SETS } from './data/sets'
import { randomOrder } from './lib/attack'
import { accuracy, charsPerMinute, formatTime, shuffle } from './lib/scoring'
import {
  loadAttackBests,
  loadBests,
  qualifiesAsAttackBest,
  qualifiesAsBest,
  saveAttackBest,
  saveBest,
} from './lib/storage'
import { STRINGS } from './lib/strings'
import type { AttackBestRecord, AttackBests, AttackMinutes, BestRecord, Bests, Mode, RunResult } from './lib/types'

type Screen =
  | { name: 'home' }
  | { name: 'drill'; setIndex: number; mode: Mode; order: string[]; durationMs: number; runKey: number }
  | { name: 'report'; result: RunResult; isNewBest: boolean; previousBestText: string | undefined }

const ALL_CHARACTERS = SETS.flat()

export default function App() {
  const [bests, setBests] = useState<Bests>(() => loadBests())
  const [attackBests, setAttackBests] = useState<AttackBests>(() => loadAttackBests())
  const [screen, setScreen] = useState<Screen>({ name: 'home' })
  const runKeyCounter = useRef(0)

  const startDrill = useCallback((setIndex: number, mode: Mode, order: string[] = SETS[setIndex]) => {
    runKeyCounter.current += 1
    setScreen({ name: 'drill', setIndex, mode, order, durationMs: 0, runKey: runKeyCounter.current })
  }, [])

  const startAttack = useCallback((minutes: AttackMinutes) => {
    runKeyCounter.current += 1
    setScreen({
      name: 'drill',
      setIndex: -1,
      mode: 'attack',
      order: randomOrder(ALL_CHARACTERS),
      durationMs: minutes * 60_000,
      runKey: runKeyCounter.current,
    })
  }, [])

  const finishRun = useCallback(
    (result: RunResult) => {
      if (result.kind === 'attack') {
        const minutes = Math.round(result.durationMs / 60_000)
        const previous = attackBests[minutes]
        const cpm = charsPerMinute(result.durationMs, result.correctCount)
        const acc = accuracy(result.wrongCount, result.typedCount)
        const isNewBest = qualifiesAsAttackBest(previous, { cpm, accuracy: acc, typedCount: result.typedCount })
        if (isNewBest) {
          const record: AttackBestRecord = { cpm, accuracy: acc, recordedAt: new Date().toISOString() }
          saveAttackBest(minutes, record)
          setAttackBests((prev) => ({ ...prev, [minutes]: record }))
        }
        const previousBestText = previous ? STRINGS.best(`${previous.cpm} ${STRINGS.charsPerMinute}`) : undefined
        setScreen({ name: 'report', result, isNewBest, previousBestText })
        return
      }
      const previousBest = bests[result.setIndex]
      const acc = accuracy(result.wrongCount, result.typedCount)
      const isNewBest = qualifiesAsBest(previousBest, { elapsedMs: result.elapsedMs, accuracy: acc })
      if (isNewBest) {
        const record: BestRecord = { bestMs: result.elapsedMs, accuracy: acc, recordedAt: new Date().toISOString() }
        saveBest(result.setIndex, record)
        setBests((prev) => ({ ...prev, [result.setIndex]: record }))
      }
      const previousBestText = previousBest ? STRINGS.best(formatTime(previousBest.bestMs)) : undefined
      setScreen({ name: 'report', result, isNewBest, previousBestText })
    },
    [bests, attackBests],
  )

  const goHome = useCallback(() => setScreen({ name: 'home' }), [])

  switch (screen.name) {
    case 'home':
      return <Home bests={bests} attackBests={attackBests} onStart={startDrill} onStartAttack={startAttack} />
    case 'drill':
      return (
        <Drill
          key={screen.runKey}
          setIndex={screen.setIndex}
          mode={screen.mode}
          order={screen.order}
          durationMs={screen.durationMs}
          onFinish={finishRun}
          onBack={goHome}
        />
      )
    case 'report': {
      const { result } = screen
      if (result.kind === 'attack') {
        const minutes = Math.round(result.durationMs / 60_000) as AttackMinutes
        return (
          <Report
            result={result}
            isNewBest={screen.isNewBest}
            previousBestText={screen.previousBestText}
            onRetry={() => startAttack(minutes)}
            onBack={goHome}
          />
        )
      }
      return (
        <Report
          result={result}
          isNewBest={screen.isNewBest}
          previousBestText={screen.previousBestText}
          onRetry={() => startDrill(result.setIndex, 'timed', result.order)}
          onRetryScrambled={() => startDrill(result.setIndex, 'timed', shuffle(result.order))}
          onBack={goHome}
        />
      )
    }
  }
}
```

- [ ] **Step 4: Full suite, type check, build, lint, commit**

```bash
npm test
npx tsc -p tsconfig.app.json --noEmit
npm run build
npx oxlint src
git add src/App.tsx src/App.test.tsx
git commit -m "feat: wire time attack into the app with per-duration bests"
```

Expected: all pass, no type errors, build and lint clean.

- [ ] **Step 5: Manual check (human)**

With the macOS Cangjie input source, start 限時挑戰 1 分鐘: confirm the countdown starts on the first committed character, the window slides after row two, the run ends at zero even mid-composition, the report shows characters per minute and 打對, and the Home card shows the best afterwards. Record as PR checklist items.

---

## Self-review notes

- **Spec coverage:** Home card and buttons (Task 5, 6); random order (Task 1); hook limit, `remainingMs`, `expire`, pause exclusion, input ignored after end (Task 2); Drill tick and per-input expire, title, countdown with 剩餘, three-row window (Task 4); `RunResult` shape (Task 1, filled in Task 4); CPM and accuracy formulas (Task 5 Report, Task 6 App); report heading, 打對 stat, hidden 打亂後再試, retry with fresh order (Task 5, 6); attack bests key, validation, qualification (Task 3); strings (Task 1); tests per section.
- **Type consistency:** `RunResult` fields match across Tasks 1, 4, 5, 6. `previousBestText` replaces `previousBest` on Report in Tasks 5 and 6. `onRetryScrambled` optional in both. `remainingMs`, `expire`, `isRunning` names match Tasks 2 and 4. `randomOrder`, `windowStart`, `ROW_LENGTH`, `WINDOW_ROWS`, `ATTACK_MINUTES` match Tasks 1, 4, 5, 6.
- **Green-suite note:** Vitest does not type-check, so the suite stays green between Tasks 1 and 6 even though `tsc` reports the `RunResult` gaps; `npm run build` is only expected to pass again at the end of Task 6.
