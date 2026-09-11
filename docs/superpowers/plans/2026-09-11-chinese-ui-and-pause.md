# Chinese Interface and Pause Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every user-facing string becomes standard written Chinese (Hong Kong usage) via one strings module, and timed runs gain a pause that stops the clock, hides the grid, and excludes paused time from results.

**Architecture:** `src/lib/strings.ts` holds all copy; components and tests import it. `useDrill` gains pause state and an `elapsedMs()` function that all timing consumers use. The Clock becomes a pure display of `elapsedMs()` while `running`. Drill wires a pause button, an overlay that replaces the grid, an Escape key toggle, and an auto-pause on tab hide.

**Tech Stack:** React 19, TypeScript (strict), Vitest with jsdom and Testing Library, CSS modules.

**Specs:** `docs/superpowers/specs/2026-09-11-chinese-ui-design.md`, `docs/superpowers/specs/2026-09-11-pause-design.md`

## Global Constraints

- Project root `/Users/gabes/Documents/cangjie-trainer`, branch `build/initial-app`. Commit after every task. Do not push.
- Copy is exactly the table in the Chinese interface spec. A space on each side of an Arabic numeral inside Chinese text (第 1 組, 第 1 至 100 字); no space before `%`.
- Components contain no user-facing string literals; everything comes from `STRINGS` in `src/lib/strings.ts`. Tests import `STRINGS` for names and text.
- `index.html`: `<html lang="zh-Hant">`, `<title>倉頡練習</title>`. Remove every per-element `lang="zh-Hant"` attribute.
- README stays English.
- Pause: `elapsedMs()` = `(endedAt ?? now()) - startedAt - pausedMs - (pausedAt !== null ? now() - pausedAt : 0)`, clamped at 0, and 0 before the clock starts. `pause()` only when started, not done, not paused. `resume()` only when paused. Input ignored while paused. Restart and scramble clear pause state.
- Clock props are exactly `{ elapsedMs: () => number; running: boolean }`.
- Escape toggles pause in timed mode via a `document` keydown listener that ignores events with `isComposing === true` or `keyCode === 229`. `visibilitychange` to `hidden` pauses when running. Never auto-resume. No pause in free mode.
- While paused: the grid is not rendered, an overlay shows 已暫停 with a 繼續 button, the input is disabled. On resume the input is focused.
- tsconfig has `strict`, `noUnusedLocals`, `verbatimModuleSyntax`: type-only imports use `import type`.
- Commit message format: subject, blank line, then `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>` and `Claude-Session: https://claude.ai/code/session_01WdRxGmqZsrgQdo7US6y7ux`.

---

## File Structure

| Path | Responsibility |
|---|---|
| `src/lib/strings.ts` | All user-facing copy. |
| `src/lib/strings.test.ts` | Number-embedding helpers. |
| `index.html` | Document language and title. |
| `src/components/Home.tsx`, `Home.test.tsx` | Chinese copy. |
| `src/components/Report.tsx`, `Report.test.tsx` | Chinese copy, drop `lang` attr. |
| `src/components/Drill.tsx`, `Drill.module.css`, `Drill.test.tsx` | Chinese copy; then pause button, overlay, Escape, visibility. |
| `src/components/DrillInput.tsx` | Placeholder and label from `STRINGS`, drop `lang` attr. |
| `src/components/CharacterGrid.tsx` | Drop `lang` attr. |
| `src/App.test.tsx` | Query by `STRINGS`. |
| `src/hooks/useDrill.ts`, `useDrill.test.ts` | Pause state, `pause`, `resume`, `elapsedMs`, `isPaused`, `isRunning`. |
| `src/components/Clock.tsx`, `Clock.test.tsx` | New props. |

---

### Task 1: Strings module and document language

**Files:**
- Create: `src/lib/strings.ts`, `src/lib/strings.test.ts`
- Modify: `index.html`

**Interfaces:**
- Produces: `STRINGS` (frozen object) with the members listed in Step 3. Functions: `setName(n)`, `setRange(from, to)`, `setComplete(n)`, `best(time)`.

- [ ] **Step 1: Write the failing test**

`src/lib/strings.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { STRINGS } from './strings'

describe('STRINGS', () => {
  it('embeds numbers with spaces on both sides', () => {
    expect(STRINGS.setName(1)).toBe('第 1 組')
    expect(STRINGS.setRange(1, 100)).toBe('第 1 至 100 字')
    expect(STRINGS.setComplete(3)).toBe('第 3 組完成')
    expect(STRINGS.best('1:20.0')).toBe('最佳 1:20.0')
  })

  it('is frozen', () => {
    expect(Object.isFrozen(STRINGS)).toBe(true)
  })
})
```

- [ ] **Step 2: Run to verify it fails**

```bash
npm test -- src/lib/strings
```

Expected: FAIL, cannot find module `./strings`.

- [ ] **Step 3: Write the module**

`src/lib/strings.ts`:

```ts
/** Every user-facing string. Standard written Chinese, Hong Kong usage. */
export const STRINGS = Object.freeze({
  appTitle: '倉頡練習',
  subtitle: '以倉頡輸入法練習香港書面語及粵語最常用的字',

  setName: (n: number) => `第 ${n} 組`,
  setRange: (from: number, to: number) => `第 ${from} 至 ${to} 字`,
  bestLabel: '最佳',
  noBest: '—',
  timed: '計時',
  free: '自由練習',

  scramble: '打亂次序',
  restart: '重新開始',
  back: '返回',
  hint: '請切換至倉頡輸入法',
  placeholder: '在此輸入',
  inputLabel: '請輸入上方顯示的字',
  done: '完成',
  pause: '暫停',
  resume: '繼續',
  paused: '已暫停',

  setComplete: (n: number) => `第 ${n} 組完成`,
  charsPerMinute: '每分鐘字數',
  accuracy: '準確度',
  time: '時間',
  record: '紀錄',
  newBest: '新紀錄',
  best: (time: string) => `最佳 ${time}`,
  noRecord: '未有紀錄',
  missed: '錯字',
  noMistakes: '全部正確',
  retry: '再試一次',
  retryScrambled: '打亂再試',
  backToSets: '返回字組',
})
```

- [ ] **Step 4: Update `index.html`**

Change line 2 to `<html lang="zh-Hant">` and the title to `<title>倉頡練習</title>`.

- [ ] **Step 5: Run and commit**

```bash
npm test -- src/lib/strings
git add src/lib/strings.ts src/lib/strings.test.ts index.html
git commit -m "feat: add the Chinese strings module and document language"
```

Expected: 2 passed.

---

### Task 2: Chinese copy in every screen

**Files:**
- Modify: `src/components/Home.tsx`, `src/components/Home.test.tsx`, `src/components/Report.tsx`, `src/components/Report.test.tsx`, `src/components/Drill.tsx`, `src/components/Drill.module.css`, `src/components/Drill.test.tsx`, `src/components/DrillInput.tsx`, `src/components/CharacterGrid.tsx`, `src/App.test.tsx`

**Interfaces:**
- Consumes: `STRINGS` from `src/lib/strings.ts`.
- Produces: no interface change; only rendered text.

- [ ] **Step 1: Update the tests first (they will fail until Step 2)**

`src/components/Home.test.tsx`, replace the whole file:

```tsx
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { STRINGS } from '../lib/strings'
import { Home } from './Home'

describe('Home', () => {
  it('gives every card an accessible name', () => {
    render(<Home bests={{}} onStart={() => {}} />)
    expect(screen.getByRole('article', { name: STRINGS.setName(1) })).toBeInTheDocument()
    expect(screen.getByRole('article', { name: STRINGS.setName(10) })).toBeInTheDocument()
  })

  it('renders ten set cards with rank ranges', () => {
    render(<Home bests={{}} onStart={() => {}} />)
    expect(screen.getAllByRole('article')).toHaveLength(10)
    expect(screen.getByText(STRINGS.setRange(1, 100))).toBeInTheDocument()
    expect(screen.getByText(STRINGS.setRange(901, 1000))).toBeInTheDocument()
  })

  it('shows a dash when there is no best, and the best otherwise', () => {
    render(
      <Home bests={{ 1: { bestMs: 65_340, accuracy: 0.95, recordedAt: '2026-09-10T00:00:00.000Z' } }} onStart={() => {}} />,
    )
    const cards = screen.getAllByRole('article')
    expect(within(cards[0]).getByText(STRINGS.noBest)).toBeInTheDocument()
    expect(within(cards[1]).getByText('1:05.3')).toBeInTheDocument()
    expect(within(cards[1]).getByText('95%')).toBeInTheDocument()
  })

  it('starts the chosen set and mode', async () => {
    const onStart = vi.fn()
    render(<Home bests={{}} onStart={onStart} />)
    const card = screen.getAllByRole('article')[3]
    await userEvent.click(within(card).getByRole('button', { name: STRINGS.timed }))
    expect(onStart).toHaveBeenCalledWith(3, 'timed')
    await userEvent.click(within(card).getByRole('button', { name: STRINGS.free }))
    expect(onStart).toHaveBeenCalledWith(3, 'free')
  })

  it('shows the title and subtitle', () => {
    render(<Home bests={{}} onStart={() => {}} />)
    expect(screen.getByRole('heading', { name: STRINGS.appTitle })).toBeInTheDocument()
    expect(screen.getByText(STRINGS.subtitle)).toBeInTheDocument()
  })
})
```

`src/components/Report.test.tsx`, replace the whole file:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { STRINGS } from '../lib/strings'
import type { RunResult } from '../lib/types'
import { Report } from './Report'

const result: RunResult = {
  setIndex: 0,
  order: [...'的一是'],
  elapsedMs: 90_000,
  wrongTally: 5,
  missed: ['的', '是'],
}

const noop = () => {}

describe('Report', () => {
  it('shows speed, accuracy, time, and missed characters', () => {
    render(<Report result={result} isNewBest={false} previousBest={undefined} onRetry={noop} onRetryScrambled={noop} onBack={noop} />)
    expect(screen.getByRole('heading', { name: STRINGS.setComplete(1) })).toBeInTheDocument()
    expect(screen.getByText('67')).toBeInTheDocument()
    expect(screen.getByText(STRINGS.charsPerMinute)).toBeInTheDocument()
    expect(screen.getByText('95%')).toBeInTheDocument()
    expect(screen.getByText(STRINGS.accuracy)).toBeInTheDocument()
    expect(screen.getByText('1:30.0')).toBeInTheDocument()
    expect(screen.getByText(STRINGS.time)).toBeInTheDocument()
    expect(screen.getByText(STRINGS.missed)).toBeInTheDocument()
    expect(screen.getByText('的')).toBeInTheDocument()
    expect(screen.getByText('是')).toBeInTheDocument()
  })

  it('says new best when the run is a record', () => {
    render(<Report result={result} isNewBest previousBest={undefined} onRetry={noop} onRetryScrambled={noop} onBack={noop} />)
    expect(screen.getByText(STRINGS.newBest)).toBeInTheDocument()
  })

  it('shows no record yet when there is no previous best', () => {
    render(<Report result={result} isNewBest={false} previousBest={undefined} onRetry={noop} onRetryScrambled={noop} onBack={noop} />)
    expect(screen.getByText(STRINGS.noRecord)).toBeInTheDocument()
  })

  it('shows the previous best otherwise', () => {
    render(
      <Report
        result={result}
        isNewBest={false}
        previousBest={{ bestMs: 80_000, accuracy: 1, recordedAt: '' }}
        onRetry={noop}
        onRetryScrambled={noop}
        onBack={noop}
      />,
    )
    expect(screen.getByText(STRINGS.best('1:20.0'))).toBeInTheDocument()
  })

  it('shows a no-mistakes message when nothing was missed', () => {
    render(
      <Report result={{ ...result, wrongTally: 0, missed: [] }} isNewBest={false} previousBest={undefined} onRetry={noop} onRetryScrambled={noop} onBack={noop} />,
    )
    expect(screen.getByText(STRINGS.noMistakes)).toBeInTheDocument()
  })

  it('wires the three buttons', async () => {
    const onRetry = vi.fn()
    const onRetryScrambled = vi.fn()
    const onBack = vi.fn()
    render(<Report result={result} isNewBest={false} previousBest={undefined} onRetry={onRetry} onRetryScrambled={onRetryScrambled} onBack={onBack} />)
    await userEvent.click(screen.getByRole('button', { name: STRINGS.retry }))
    await userEvent.click(screen.getByRole('button', { name: STRINGS.retryScrambled }))
    await userEvent.click(screen.getByRole('button', { name: STRINGS.backToSets }))
    expect(onRetry).toHaveBeenCalled()
    expect(onRetryScrambled).toHaveBeenCalled()
    expect(onBack).toHaveBeenCalled()
  })
})
```

`src/components/Drill.test.tsx`: add `import { STRINGS } from '../lib/strings'` after the `vitest` import, then change these assertions:

```tsx
    // in 'shows the hint, set name, and mode'
    expect(screen.getByText(STRINGS.hint)).toBeInTheDocument()
    expect(screen.getByText(STRINGS.setName(3))).toBeInTheDocument()
    expect(screen.getByText(STRINGS.timed)).toBeInTheDocument()
    // in 'does not call onFinish in free mode, shows done instead'
    expect(screen.getByText(STRINGS.done)).toBeInTheDocument()
    // in 'restart clears the input'
    await userEvent.click(screen.getByRole('button', { name: STRINGS.restart }))
    // in 'back button calls onBack'
    await userEvent.click(screen.getByRole('button', { name: STRINGS.back }))
```

`src/App.test.tsx`: add `import { STRINGS } from './lib/strings'` after the storage import, then change:

```tsx
    // 'starts on the home screen'
    expect(screen.getByRole('heading', { name: STRINGS.appTitle })).toBeInTheDocument()
    // 'runs a timed set ...'
    await userEvent.click(within(card).getByRole('button', { name: STRINGS.timed }))
    expect(screen.getByText(STRINGS.setName(1))).toBeInTheDocument()
    ...
    expect(screen.getByText(STRINGS.charsPerMinute)).toBeInTheDocument()
    expect(screen.getByText(STRINGS.newBest)).toBeInTheDocument()
    ...
    await userEvent.click(screen.getByRole('button', { name: STRINGS.backToSets }))
    // 'retry returns to the drill with the same set'
    await userEvent.click(within(screen.getAllByRole('article')[1]).getByRole('button', { name: STRINGS.timed }))
    ...
    await userEvent.click(screen.getByRole('button', { name: STRINGS.retry }))
    expect(screen.getByText(STRINGS.setName(2))).toBeInTheDocument()
    // 'free mode never shows a report'
    await userEvent.click(within(screen.getAllByRole('article')[0]).getByRole('button', { name: STRINGS.free }))
    ...
    expect(screen.queryByText(STRINGS.charsPerMinute)).not.toBeInTheDocument()
    expect(screen.getByText(STRINGS.done)).toBeInTheDocument()
    // 'retry scrambled starts the drill with a different order'
    await userEvent.click(within(screen.getAllByRole('article')[2]).getByRole('button', { name: STRINGS.timed }))
    ...
    await userEvent.click(screen.getByRole('button', { name: STRINGS.retryScrambled }))
```

Run `npm test` and confirm the Home, Report, Drill, and App suites fail on the new text.

- [ ] **Step 2: Home**

Replace `src/components/Home.tsx`:

```tsx
import { SETS, SET_SIZE } from '../data/sets'
import { formatTime } from '../lib/scoring'
import { STRINGS } from '../lib/strings'
import type { Bests, Mode } from '../lib/types'
import { Button } from './Button'
import styles from './Home.module.css'

export interface HomeProps {
  bests: Bests
  onStart(setIndex: number, mode: Mode): void
}

export function Home({ bests, onStart }: HomeProps) {
  return (
    <main className={styles.screen}>
      <header className={styles.header}>
        <h1 className={styles.title}>{STRINGS.appTitle}</h1>
        <p className={styles.subtitle}>{STRINGS.subtitle}</p>
      </header>
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

- [ ] **Step 3: Report**

In `src/components/Report.tsx`: add `import { STRINGS } from '../lib/strings'` after the scoring import, then replace the literals:

```tsx
  if (isNewBest) {
    recordText = STRINGS.newBest
    recordClass = `${styles.statValue} ${styles.newBest}`
  } else if (previousBest) {
    recordText = STRINGS.best(formatTime(previousBest.bestMs))
  } else {
    recordText = STRINGS.noRecord
  }
```

```tsx
        <h1 id="report-heading" className={styles.heading}>
          {STRINGS.setComplete(result.setIndex + 1)}
        </h1>
```

`characters per minute` → `{STRINGS.charsPerMinute}`; `Accuracy` → `{STRINGS.accuracy}`; `Time` → `{STRINGS.time}`; `Record` → `{STRINGS.record}`; `Missed` → `{STRINGS.missed}`; `No mistakes` → `{STRINGS.noMistakes}`; `Retry` → `{STRINGS.retry}`; `Retry scrambled` → `{STRINGS.retryScrambled}`; `Back to sets` → `{STRINGS.backToSets}`. Remove `lang="zh-Hant"` from the `<ul>`.

- [ ] **Step 4: Drill, DrillInput, CharacterGrid**

`src/components/Drill.tsx`: add `import { STRINGS } from '../lib/strings'` after the scoring import, then:

```tsx
          <span className={styles.setName}>{STRINGS.setName(setIndex + 1)}</span>
          <span className={styles.mode}>{mode === 'timed' ? STRINGS.timed : STRINGS.free}</span>
```

`Scramble` → `{STRINGS.scramble}`, `Restart` → `{STRINGS.restart}`, `Back` → `{STRINGS.back}`, hint → `{STRINGS.hint}`, `Done` → `{STRINGS.done}`.

`src/components/Drill.module.css`: in `.mode` delete the `text-transform: uppercase;` and `letter-spacing: 0.08em;` lines (meaningless for Chinese).

`src/components/DrillInput.tsx`: add `import { STRINGS } from '../lib/strings'`, set `placeholder={STRINGS.placeholder}` and `aria-label={STRINGS.inputLabel}`, and remove the `lang="zh-Hant"` attribute.

`src/components/CharacterGrid.tsx`: remove `lang="zh-Hant"` from the grid `div`.

- [ ] **Step 5: Run everything and commit**

```bash
npm test
npm run build
npx oxlint src
git add src index.html
git commit -m "feat: present the whole interface in Chinese"
```

Expected: all tests pass, build and lint clean. `grep -rn "lang=\"zh-Hant\"" src` prints nothing.

---

### Task 3: Pause state in the hook

**Files:**
- Modify: `src/hooks/useDrill.ts`, `src/hooks/useDrill.test.ts`

**Interfaces:**
- Produces, added to `DrillState`: `pausedAt: number | null`, `pausedMs: number`. Added to `Drill`: `isPaused: boolean`, `isRunning: boolean`, `elapsedMs(): number`, `pause(): void`, `resume(): void`.

- [ ] **Step 1: Write the failing tests**

Append inside `describe('useDrill', ...)` in `src/hooks/useDrill.test.ts`:

```ts
  describe('pause', () => {
    it('excludes paused time from elapsedMs', () => {
      const clock = fakeClock(0)
      const { result } = renderHook(() => useDrill(order, { now: clock.now }))
      act(() => result.current.onInput(order[0], false))
      clock.advance(1000)
      act(() => result.current.pause())
      expect(result.current.isPaused).toBe(true)
      expect(result.current.isRunning).toBe(false)
      clock.advance(5000)
      expect(result.current.elapsedMs()).toBe(1000)
      act(() => result.current.resume())
      expect(result.current.isPaused).toBe(false)
      expect(result.current.isRunning).toBe(true)
      clock.advance(2000)
      expect(result.current.elapsedMs()).toBe(3000)
    })

    it('reports the pause-excluded time when the run ends', () => {
      const clock = fakeClock(0)
      const { result } = renderHook(() => useDrill(order, { now: clock.now }))
      act(() => result.current.onInput(order[0], false))
      clock.advance(1000)
      act(() => result.current.pause())
      clock.advance(9000)
      act(() => result.current.resume())
      clock.advance(1000)
      act(() => result.current.onInput(order.join(''), false))
      expect(result.current.isDone).toBe(true)
      expect(result.current.elapsedMs()).toBe(2000)
    })

    it('ignores pause before the clock starts', () => {
      const { result } = renderHook(() => useDrill(order))
      act(() => result.current.pause())
      expect(result.current.isPaused).toBe(false)
      expect(result.current.elapsedMs()).toBe(0)
    })

    it('ignores a second pause and a resume when not paused', () => {
      const clock = fakeClock(0)
      const { result } = renderHook(() => useDrill(order, { now: clock.now }))
      act(() => result.current.onInput(order[0], false))
      act(() => result.current.resume())
      expect(result.current.isPaused).toBe(false)
      clock.advance(100)
      act(() => result.current.pause())
      const firstPausedAt = result.current.pausedAt
      clock.advance(100)
      act(() => result.current.pause())
      expect(result.current.pausedAt).toBe(firstPausedAt)
    })

    it('ignores input while paused', () => {
      const { result } = renderHook(() => useDrill(order))
      act(() => result.current.onInput(order[0], false))
      act(() => result.current.pause())
      act(() => result.current.onInput(order[0] + order[1], false))
      expect([...result.current.typed]).toHaveLength(1)
    })

    it('restart and scramble clear the pause', () => {
      const { result } = renderHook(() => useDrill(order))
      act(() => result.current.onInput(order[0], false))
      act(() => result.current.pause())
      act(() => result.current.restart())
      expect(result.current.isPaused).toBe(false)
      expect(result.current.pausedMs).toBe(0)
      act(() => result.current.onInput(order[0], false))
      act(() => result.current.pause())
      act(() => result.current.scramble())
      expect(result.current.isPaused).toBe(false)
      expect(result.current.pausedMs).toBe(0)
    })

    it('is not running before start or after the end', () => {
      const { result } = renderHook(() => useDrill(order))
      expect(result.current.isRunning).toBe(false)
      act(() => result.current.onInput(order.join(''), false))
      expect(result.current.isRunning).toBe(false)
    })
  })
```

- [ ] **Step 2: Run to verify they fail**

```bash
npm test -- src/hooks
```

Expected: the seven new tests fail (`pause is not a function` and similar); the existing ones pass.

- [ ] **Step 3: Implement**

Replace `src/hooks/useDrill.ts`:

```ts
import { useCallback, useMemo, useState } from 'react'
import { hanCharacters, newlyWrongPositions, positionStates, shuffle } from '../lib/scoring'
import type { PositionState } from '../lib/types'

export interface UseDrillOptions {
  now?: () => number
  rng?: () => number
}

export interface DrillState {
  order: string[]
  typed: string
  wrongTally: number
  wrongPositions: number[]
  startedAt: number | null
  endedAt: number | null
  /** Timestamp of the current pause, or null when not paused. */
  pausedAt: number | null
  /** Total time spent in earlier pauses. */
  pausedMs: number
  runId: number
}

export interface Drill extends DrillState {
  states: PositionState[]
  isDone: boolean
  isPaused: boolean
  /** Clock started, not done, not paused. */
  isRunning: boolean
  /** Elapsed time excluding pauses; 0 before the clock starts. */
  elapsedMs(): number
  onInput(value: string, isComposing: boolean): void
  scramble(): void
  restart(): void
  pause(): void
  resume(): void
}

function freshState(order: string[], runId: number): DrillState {
  return {
    order,
    typed: '',
    wrongTally: 0,
    wrongPositions: [],
    startedAt: null,
    endedAt: null,
    pausedAt: null,
    pausedMs: 0,
    runId,
  }
}

export function useDrill(initialOrder: string[], options: UseDrillOptions = {}): Drill {
  const now = useMemo(() => options.now ?? (() => performance.now()), [options.now])
  const rng = useMemo(() => options.rng ?? Math.random, [options.rng])
  const [state, setState] = useState<DrillState>(() => freshState(initialOrder, 0))

  const onInput = useCallback(
    (value: string, isComposing: boolean) => {
      if (isComposing) return
      const t = now()
      setState((prev) => {
        if (prev.endedAt !== null || prev.pausedAt !== null) return prev
        const capped = [...hanCharacters(value)].slice(0, prev.order.length).join('')
        const wrong = newlyWrongPositions(prev.typed, capped, prev.order)
        const startedAt = prev.startedAt ?? (capped.length > 0 ? t : null)
        const done = [...capped].length === prev.order.length
        return {
          ...prev,
          typed: capped,
          wrongTally: prev.wrongTally + wrong.length,
          wrongPositions: wrong.length ? [...prev.wrongPositions, ...wrong] : prev.wrongPositions,
          startedAt,
          endedAt: done ? t : null,
        }
      })
    },
    [now],
  )

  const pause = useCallback(() => {
    const t = now()
    setState((prev) => {
      if (prev.startedAt === null || prev.endedAt !== null || prev.pausedAt !== null) return prev
      return { ...prev, pausedAt: t }
    })
  }, [now])

  const resume = useCallback(() => {
    const t = now()
    setState((prev) => {
      if (prev.pausedAt === null) return prev
      return { ...prev, pausedMs: prev.pausedMs + (t - prev.pausedAt), pausedAt: null }
    })
  }, [now])

  const restart = useCallback(() => {
    setState((prev) => freshState(prev.order, prev.runId + 1))
  }, [])

  const scramble = useCallback(() => {
    setState((prev) => freshState(shuffle(prev.order, rng), prev.runId + 1))
  }, [rng])

  const elapsedMs = useCallback(() => {
    if (state.startedAt === null) return 0
    const end = state.endedAt ?? now()
    const openPause = state.pausedAt !== null ? now() - state.pausedAt : 0
    return Math.max(0, end - state.startedAt - state.pausedMs - openPause)
  }, [state.startedAt, state.endedAt, state.pausedAt, state.pausedMs, now])

  const states = useMemo(() => positionStates(state.order, state.typed), [state.order, state.typed])

  return {
    ...state,
    states,
    isDone: state.endedAt !== null,
    isPaused: state.pausedAt !== null,
    isRunning: state.startedAt !== null && state.endedAt === null && state.pausedAt === null,
    elapsedMs,
    onInput,
    scramble,
    restart,
    pause,
    resume,
  }
}
```

- [ ] **Step 4: Run and commit**

```bash
npm test -- src/hooks
npm test
git add src/hooks
git commit -m "feat: add pause state and pause-excluded elapsed time to useDrill"
```

Expected: hook suite 17 passed; full suite green (Drill still computes elapsed from `endedAt - startedAt` until Task 4, which is unchanged behaviour when no pause happens).

---

### Task 4: Clock props, pause button, overlay, Escape, and auto-pause

**Files:**
- Modify: `src/components/Clock.tsx`, `src/components/Clock.test.tsx`, `src/components/Drill.tsx`, `src/components/Drill.module.css`, `src/components/Drill.test.tsx`

**Interfaces:**
- Consumes: `Drill` fields from Task 3 (`isPaused`, `isRunning`, `elapsedMs`, `pause`, `resume`, `startedAt`, `isDone`), `STRINGS.pause`, `STRINGS.resume`, `STRINGS.paused`.
- Produces: `Clock({ elapsedMs: () => number; running: boolean })`.

- [ ] **Step 1: Write the failing Clock tests**

Replace `src/components/Clock.test.tsx`:

```tsx
import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Clock } from './Clock'

describe('Clock', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('shows the elapsed value', () => {
    render(<Clock elapsedMs={() => 0} running={false} />)
    expect(screen.getByText('0:00.0')).toBeInTheDocument()
  })

  it('ticks while running', () => {
    let t = 0
    render(<Clock elapsedMs={() => t} running />)
    t = 2500
    act(() => {
      vi.advanceTimersByTime(200)
    })
    expect(screen.getByText('0:02.5')).toBeInTheDocument()
  })

  it('does not tick while not running', () => {
    let t = 1000
    const { rerender } = render(<Clock elapsedMs={() => t} running />)
    act(() => {
      vi.advanceTimersByTime(100)
    })
    rerender(<Clock elapsedMs={() => t} running={false} />)
    t = 9000
    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(screen.getByText('0:01.0')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Write the failing Drill tests**

Append inside `describe('Drill', ...)` in `src/components/Drill.test.tsx` (the file already imports `fireEvent`, `render`, `screen`, `userEvent`, `vi`, and `STRINGS`):

```tsx
  describe('pause', () => {
    function setVisibility(state: 'hidden' | 'visible') {
      Object.defineProperty(document, 'visibilityState', { value: state, configurable: true })
      fireEvent(document, new Event('visibilitychange'))
    }

    it('has no pause control in free mode', () => {
      render(<Drill setIndex={0} mode="free" order={order} onFinish={() => {}} onBack={() => {}} />)
      expect(screen.queryByRole('button', { name: STRINGS.pause })).not.toBeInTheDocument()
    })

    it('is disabled until the first character commits', () => {
      render(<Drill setIndex={0} mode="timed" order={order} onFinish={() => {}} onBack={() => {}} />)
      expect(screen.getByRole('button', { name: STRINGS.pause })).toBeDisabled()
      typeCommitted(order[0])
      expect(screen.getByRole('button', { name: STRINGS.pause })).toBeEnabled()
    })

    it('pausing hides the grid, disables the input, and resuming restores and focuses it', async () => {
      render(<Drill setIndex={0} mode="timed" order={order} onFinish={() => {}} onBack={() => {}} />)
      typeCommitted(order[0])
      await userEvent.click(screen.getByRole('button', { name: STRINGS.pause }))
      expect(screen.getByText(STRINGS.paused)).toBeInTheDocument()
      expect(document.querySelectorAll('[data-state]')).toHaveLength(0)
      expect(screen.getByRole('textbox')).toBeDisabled()
      await userEvent.click(screen.getByRole('dialog').querySelector('button')!)
      expect(screen.queryByText(STRINGS.paused)).not.toBeInTheDocument()
      expect(document.querySelectorAll('[data-state]')).toHaveLength(100)
      expect(screen.getByRole('textbox')).toBeEnabled()
      expect(screen.getByRole('textbox')).toHaveFocus()
    })

    it('excludes paused time from the reported result', async () => {
      let t = 0
      const onFinish = vi.fn()
      render(<Drill setIndex={0} mode="timed" order={order} onFinish={onFinish} onBack={() => {}} now={() => t} />)
      typeCommitted(order[0])
      t = 1000
      await userEvent.click(screen.getByRole('button', { name: STRINGS.pause }))
      t = 61_000
      await userEvent.click(screen.getAllByRole('button', { name: STRINGS.resume })[0])
      t = 62_000
      typeCommitted(order.join(''))
      expect(onFinish.mock.calls[0][0].elapsedMs).toBe(2000)
    })

    it('escape toggles pause and resume', () => {
      render(<Drill setIndex={0} mode="timed" order={order} onFinish={() => {}} onBack={() => {}} />)
      typeCommitted(order[0])
      fireEvent.keyDown(document, { key: 'Escape' })
      expect(screen.getByText(STRINGS.paused)).toBeInTheDocument()
      fireEvent.keyDown(document, { key: 'Escape' })
      expect(screen.queryByText(STRINGS.paused)).not.toBeInTheDocument()
    })

    it('escape during an IME composition does nothing', () => {
      render(<Drill setIndex={0} mode="timed" order={order} onFinish={() => {}} onBack={() => {}} />)
      typeCommitted(order[0])
      fireEvent.keyDown(document, { key: 'Escape', keyCode: 229 })
      expect(screen.queryByText(STRINGS.paused)).not.toBeInTheDocument()
    })

    it('pauses when the page is hidden and does not resume when shown', () => {
      render(<Drill setIndex={0} mode="timed" order={order} onFinish={() => {}} onBack={() => {}} />)
      typeCommitted(order[0])
      setVisibility('hidden')
      expect(screen.getByText(STRINGS.paused)).toBeInTheDocument()
      setVisibility('visible')
      expect(screen.getByText(STRINGS.paused)).toBeInTheDocument()
    })

    it('does not pause on hide before the clock starts', () => {
      render(<Drill setIndex={0} mode="timed" order={order} onFinish={() => {}} onBack={() => {}} />)
      setVisibility('hidden')
      expect(screen.queryByText(STRINGS.paused)).not.toBeInTheDocument()
      setVisibility('visible')
    })
  })
```

While paused the resume button appears twice (bar and overlay), which is why the `excludes paused time` test uses `getAllByRole(...)[0]` and the hide-the-grid test clicks the button inside the `dialog`.

- [ ] **Step 3: Run to verify they fail**

```bash
npm test -- src/components/Clock src/components/Drill
```

Expected: Clock tests fail on the new props; the eight pause tests fail; existing Drill tests still pass.

- [ ] **Step 4: Implement Clock**

Replace `src/components/Clock.tsx`:

```tsx
import { useEffect, useState } from 'react'
import { formatTime } from '../lib/scoring'

interface ClockProps {
  /** Elapsed milliseconds, excluding pauses. */
  elapsedMs: () => number
  /** Tick while true; freeze the displayed value while false. */
  running: boolean
}

const TICK_MS = 100

export function Clock({ elapsedMs, running }: ClockProps) {
  const [, setTick] = useState(0)

  useEffect(() => {
    if (!running) return
    const id = setInterval(() => setTick((t) => t + 1), TICK_MS)
    return () => clearInterval(id)
  }, [running])

  return (
    <span style={{ fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums' }} aria-live="off">
      {formatTime(elapsedMs())}
    </span>
  )
}
```

- [ ] **Step 5: Implement Drill**

Replace `src/components/Drill.tsx`:

```tsx
import { useEffect, useRef } from 'react'
import { useDrill } from '../hooks/useDrill'
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
  onFinish(result: RunResult): void
  onBack(): void
  now?: () => number
}

const IME_PROCESSING_KEY_CODE = 229

export function Drill({ setIndex, mode, order, onFinish, onBack, now }: DrillProps) {
  const drill = useDrill(order, { now })
  const inputRef = useRef<HTMLInputElement | null>(null)
  const reported = useRef(false)
  const timed = mode === 'timed'

  useEffect(() => {
    reported.current = false
  }, [drill.runId])

  useEffect(() => {
    if (!timed || !drill.isDone || reported.current) return
    reported.current = true
    onFinish({
      setIndex,
      order: drill.order,
      elapsedMs: drill.elapsedMs(),
      wrongTally: drill.wrongTally,
      missed: missedCharacters(drill.order, drill.wrongPositions),
    })
  }, [timed, drill.isDone, drill.order, drill.elapsedMs, drill.wrongTally, drill.wrongPositions, onFinish, setIndex])

  // Refocus the input whenever a pause ends.
  useEffect(() => {
    if (!drill.isPaused) inputRef.current?.focus()
  }, [drill.isPaused])

  // Escape toggles pause, except while the IME is composing.
  useEffect(() => {
    if (!timed) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.isComposing || e.keyCode === IME_PROCESSING_KEY_CODE) return
      e.preventDefault()
      if (drill.isPaused) drill.resume()
      else drill.pause()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [timed, drill.isPaused, drill.pause, drill.resume])

  // Auto-pause when the page is hidden. Never auto-resume.
  useEffect(() => {
    if (!timed) return
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') drill.pause()
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [timed, drill.pause])

  const focusInput = () => inputRef.current?.focus()
  const canPause = drill.startedAt !== null && !drill.isDone

  return (
    <main className={styles.screen} onClick={focusInput}>
      <header className={styles.bar}>
        <div className={styles.title}>
          <span className={styles.setName}>{STRINGS.setName(setIndex + 1)}</span>
          <span className={styles.mode}>{timed ? STRINGS.timed : STRINGS.free}</span>
        </div>
        {timed && (
          <span className={styles.clock}>
            <Clock elapsedMs={drill.elapsedMs} running={drill.isRunning} />
          </span>
        )}
        {timed && (
          <Button variant="secondary" onClick={drill.isPaused ? drill.resume : drill.pause} disabled={!canPause}>
            {drill.isPaused ? STRINGS.resume : STRINGS.pause}
          </Button>
        )}
        <Button variant="secondary" onClick={drill.scramble}>
          {STRINGS.scramble}
        </Button>
        <Button variant="secondary" onClick={drill.restart}>
          {STRINGS.restart}
        </Button>
        <Button variant="ghost" onClick={onBack}>
          {STRINGS.back}
        </Button>
      </header>

      {drill.isPaused ? (
        <div className={styles.pausedOverlay} role="dialog" aria-label={STRINGS.paused}>
          <p className={styles.pausedLabel}>{STRINGS.paused}</p>
          <Button variant="primary" onClick={drill.resume}>
            {STRINGS.resume}
          </Button>
        </div>
      ) : (
        <CharacterGrid order={drill.order} states={drill.states} />
      )}

      <p className={styles.hint}>{STRINGS.hint}</p>

      <DrillInput key={drill.runId} onValue={drill.onInput} inputRef={inputRef} disabled={drill.isDone || drill.isPaused} />

      {mode === 'free' && drill.isDone && <p className={styles.done}>{STRINGS.done}</p>}
    </main>
  )
}
```

Append to `src/components/Drill.module.css`:

```css
.pausedOverlay {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  width: 100%;
  max-width: 64rem;
  min-height: 14rem;
  margin: 0 auto;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
}

.pausedLabel {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--text-muted);
}
```

- [ ] **Step 6: Run everything and commit**

```bash
npm test
npm run build
npx oxlint src
git add src/components
git commit -m "feat: pause timed practice with a hidden grid, Escape, and auto-pause on hide"
```

Expected: all tests pass, build and lint clean.

---

## Self-review notes

- **Spec coverage, Chinese UI:** strings module and functions (Task 1), `index.html` (Task 1), every screen's copy and removal of `lang` attributes (Task 2), tests via `STRINGS` (Task 2), README untouched.
- **Spec coverage, pause:** state and actions, `elapsedMs`, `isPaused`, input ignored while paused, restart and scramble clearing (Task 3); Clock props (Task 4); bar button disabled until start and relabelled while paused, overlay replacing the grid, input disabled, refocus on resume, Escape with composition guard, auto-pause on hide with no auto-resume, free mode unchanged (Task 4); report receives pause-excluded time (Task 4 `onFinish`).
- **Type consistency:** `Clock` props `{ elapsedMs, running }` match between Task 4 tests and implementation; `drill.elapsedMs`, `drill.isRunning`, `drill.isPaused`, `drill.pause`, `drill.resume` match Task 3's `Drill` interface; `STRINGS` member names match between Task 1 and all later uses.
- **Known test note:** the paused state renders two 繼續 buttons (bar and overlay). Tests that click resume use `getAllByRole(...)[0]` or the overlay `dialog`.
