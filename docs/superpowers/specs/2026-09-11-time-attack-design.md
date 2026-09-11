# Time Attack — Design Spec

Date: 2026-09-11
Status: Approved for planning
Extends: `2026-09-10-cangjie-trainer-design.md`, `2026-09-11-pause-design.md`, `2026-09-11-final-state-scoring-design.md`, `2026-09-11-cangjie-codes-design.md`

## Purpose

A countdown mode: type as many characters as possible in 1, 2, or 3 minutes, drawn at random from the whole 1000-character list. The headline score is characters per minute. It reuses the drill, its pause behaviour, its IME handling, and the report.

## Requirements

### Starting a run

- Home gains a card 限時挑戰 with three buttons 1 分鐘, 2 分鐘, 3 分鐘. Under each button the personal best for that duration, as `NN 每分鐘字數 · NN%`, or — when none.
- `Mode` becomes `'timed' | 'free' | 'attack'`. Starting an attack passes `durationMs` (60 000, 120 000, or 180 000) and a freshly drawn order.
- The order is 600 characters drawn uniformly at random from `SETS.flat()` with an injectable rng, rejecting any draw equal to the previous character. 600 exceeds any plausible three-minute count; if the order is ever exhausted the run ends as a set would.

### Hook (`useDrill`)

- New option `limitMs?: number`. New derived values `remainingMs(): number` (`limitMs - elapsedMs()`, clamped at 0; `Infinity` when no limit) and `isExpired: boolean`.
- New action `expire()`: if the clock has started, the run is not done, and `elapsedMs() >= limitMs`, it sets `endedAt` so that `elapsedMs()` equals exactly `limitMs` (that is, `endedAt = startedAt + pausedMs + limitMs`). Otherwise a no-op. `onInput` after `endedAt` is set is ignored, as today, so a composition committed after zero is discarded.
- The Drill drives `expire()` from a 100 ms interval while the run is running (same cadence as the clock), and calls it once more on every committed input, so the end is never later than one tick after zero.
- `wrongPositions`, `pause`, `resume`, `restart`, `scramble` are unchanged. `scramble` on an attack redraws nothing; it shuffles the existing order, which is still random. `restart` keeps the order.

### Drill screen in attack mode

- The bar shows 限時挑戰 · 1 分鐘 in place of the set name and mode, and a countdown in place of the stopwatch: `formatTime(remainingMs())`, labelled 剩餘 for assistive technology via `aria-label`.
- The grid is a three-row window. Row height is 20 characters. With `cursorRow = floor(typedLength / 20)`, the window's first row is `max(0, cursorRow - 1)`, clamped so that three rows are shown while the order allows. `CharacterGrid` receives the sliced `order` and `states` for those rows.
- Pause, Escape, auto-pause, the hint, and the input are unchanged. The pause overlay covers the window.
- When the run ends, `onFinish` receives a `RunResult` with `kind: 'attack'`, `durationMs`, `typedCount` (characters committed, capped at the order), `correctCount` (`typedCount - wrongCount`), `wrongCount`, `missed`, and `elapsedMs` equal to `durationMs`.

### `RunResult`

```ts
interface RunResult {
  kind: 'set' | 'attack'
  setIndex: number        // 0 to 9 for sets; -1 for attacks
  durationMs: number      // attack only; 0 for sets
  order: string[]
  elapsedMs: number
  typedCount: number      // sets: 100
  correctCount: number    // typedCount - wrongCount
  wrongCount: number
  missed: string[]
}
```

Set runs fill `kind: 'set'`, `durationMs: 0`, `typedCount: 100`.

### Scoring and report

- Characters per minute: sets keep `charsPerMinute(elapsedMs, 100)`; attacks use `charsPerMinute(durationMs, correctCount)`.
- Accuracy: `accuracy(wrongCount, typedCount)`; for a set `typedCount` is 100 so nothing changes. If `typedCount` is 0, accuracy is 0.
- Report heading: sets 第 N 組完成; attacks 限時挑戰 · N 分鐘. The 時間 stat shows `formatTime(elapsedMs)` for sets and, for attacks, 打對 with the value `NN 字`. The record stat and the missed list with Cangjie codes are unchanged. Retry restarts the same attack with a new random order; 打亂後再試 is hidden for attacks (it would be redundant); 返回選單 as today.

### Personal bests

- New storage key `cangjie-trainer:attack-bests`, a map from minutes (1, 2, 3) to `{ cpm: number, accuracy: number, recordedAt: string }`, validated on read like set bests.
- `qualifiesAsAttackBest(existing, candidate)`: accuracy at least 0.9 and `cpm` strictly greater than the existing `cpm` (any qualifying run when none exists). A run with `typedCount` 0 never qualifies.
- App loads both maps on startup and passes attack bests to Home.

### Strings

| Key | Chinese |
|---|---|
| `attack` | 限時挑戰 |
| `minutes(n)` | `${n} 分鐘` |
| `attackTitle(n)` | `限時挑戰 · ${n} 分鐘` |
| `remaining` | 剩餘 |
| `correctCount` | 打對 |
| `charsUnit(n)` | `${n} 字` |

Existing strings cover everything else.

## Error handling

- The interval that drives `expire()` is cleared on unmount, on pause, and once the run is done.
- If `limitMs` is undefined (sets and free), `remainingMs()` is `Infinity`, `isExpired` is false, and `expire()` is a no-op, so existing modes are untouched.
- A composition in progress at zero is discarded by the existing "ignore input after end" rule; the input is disabled, which also closes the IME session.

## Testing

- `useDrill`: `expire()` no-op before start and before the limit; sets `endedAt` so `elapsedMs()` equals the limit, including after a pause; input after expiry ignored; `remainingMs()` counts down and clamps at 0; modes without a limit unaffected.
- `scoring`: `charsPerMinute(60_000, 137) === 137`, `accuracy(3, 140)` rounds to 98%, `accuracy(0, 0) === 0`.
- Random order helper (`src/lib/attack.ts`): length 600, all characters from the list, no immediate repeats, deterministic under an injected rng.
- `Drill` (attack, fake clock): countdown text, window slides when the cursor reaches row two, `onFinish` fires with `kind: 'attack'` and the right counts when the fake clock passes the limit and a tick fires, paused time extends the run.
- `storage`: attack bests round trip, validation, qualification by cpm.
- `Home`: three duration buttons call `onStartAttack(minutes)`; bests shown.
- `Report`: attack heading, 打對 stat, hidden 打亂後再試.
- `App`: a 1-minute attack with the fake clock through Drill's `now` prop is not reachable at App level; cover the App wiring with a set run as today plus a Home-to-Drill attack start assertion (heading 限時挑戰 · 1 分鐘 visible).

## Out of scope

- Custom durations.
- Weighting the random draw by frequency.
- Leaderboards or sharing.
