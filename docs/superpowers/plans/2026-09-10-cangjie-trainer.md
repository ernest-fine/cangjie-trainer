# Cangjie Trainer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A single-page React app where a learner retypes sets of the 1000 most common traditional Chinese characters with their real OS Cangjie IME, gets per-character feedback, a stopwatch, a characters-per-minute report, and locally stored personal bests.

**Architecture:** Vite + React + TypeScript with no router. Pure logic lives in `src/lib` (scoring, storage) and is fully unit tested. One hook, `useDrill`, owns the state of a run. Screens (Home, Drill, Report) are thin components; `App.tsx` switches between them and persists bests.

**Tech Stack:** Vite 8, React 19, TypeScript, Vitest, jsdom, @testing-library/react, plain CSS with custom properties. No component library. Package manager: npm.

**Spec:** `docs/superpowers/specs/2026-09-10-cangjie-trainer-design.md`

## Global Constraints

- Project root: `/Users/gabes/Documents/cangjie-trainer` (already a git repo with the spec committed).
- Traditional Chinese only. 10 sets of exactly 100 characters, ranks 1 to 1000.
- The app reads only committed IME text. Input events with `isComposing === true` are ignored.
- Typed value is capped at 100 characters.
- Accuracy = `(100 - wrongTally) / 100`, floored at 0. `wrongTally` only ever increases within a run.
- Characters per minute = `round(100 / (elapsedMs / 60000))`. The label is "characters per minute", never "WPM".
- A run replaces a stored best only when its time is lower and accuracy is at least 0.9. A set with no record accepts the first run with accuracy at least 0.9.
- `localStorage` key: `cangjie-trainer:bests`. Every storage call is wrapped in try/catch.
- Hint text above the input, exactly: `Switch your keyboard to Cangjie`
- Time format: `m:ss.t` (minutes, two-digit seconds, one tenth digit), e.g. `1:05.3`.
- Git: commit after every task. Do **not** add a remote or push. The remote will be set later under the user's personal GitHub account (`ernest-fine`), never under `cwy11111`.
- UI tasks (6 through 10): load the `agent-skills:frontend-ui-engineering` skill before writing markup or CSS. Visual direction from the spec: calm typing surface, large CJK glyphs, generous spacing, one accent color for the current character, muted green for correct, muted red for wrong, light and dark themes via `prefers-color-scheme`.

---

## File Structure

| Path | Responsibility |
|---|---|
| `vite.config.ts` | Vite plugin and Vitest config (jsdom, setup file). |
| `src/test/setup.ts` | Registers jest-dom matchers. |
| `src/lib/types.ts` | Shared types: `Mode`, `PositionState`, `RunResult`, `BestRecord`, `Bests`. |
| `src/data/sets.ts` | `CHARACTERS` (1000-char string), `SETS` (10 arrays of 100), `SET_SIZE`, `SET_COUNT`. |
| `src/lib/scoring.ts` | Pure functions: `positionStates`, `newlyWrongPositions`, `charsPerMinute`, `accuracy`, `shuffle`, `missedCharacters`, `formatTime`. |
| `src/lib/storage.ts` | `loadBests`, `saveBest`, `qualifiesAsBest`. |
| `src/hooks/useDrill.ts` | Run state machine. |
| `src/styles/global.css` | Tokens, reset, theme. |
| `src/components/Button.tsx` + `.module.css` | Shared button. |
| `src/components/CharacterGrid.tsx` + `.module.css` | 100 glyphs with state classes. |
| `src/components/DrillInput.tsx` + `.module.css` | Uncontrolled text input that reports committed values. |
| `src/components/Clock.tsx` | Display-only ticking timer. |
| `src/components/Drill.tsx` + `.module.css` | Drill screen, owns `useDrill`. |
| `src/components/Home.tsx` + `.module.css` | Set cards. |
| `src/components/Report.tsx` + `.module.css` | Result screen. |
| `src/App.tsx` | Screen switching, best persistence. |
| `src/main.tsx` | Entry. |

---

### Task 1: Scaffold the project with Vitest and Testing Library

**Files:**
- Create: whole Vite react-ts scaffold in `/Users/gabes/Documents/cangjie-trainer`
- Modify: `vite.config.ts`, `package.json`, `tsconfig.app.json`, `.gitignore`
- Create: `src/test/setup.ts`, `src/App.test.tsx`

**Interfaces:**
- Produces: `npm test` runs Vitest once; `npm run dev`, `npm run build` work.

- [ ] **Step 1: Scaffold into a temp directory and copy in (the project dir already has `.git` and `docs/`)**

```bash
cd /private/tmp/claude-501/-Users-gabes-Documents/742b4273-b963-4127-9745-ea6827cdc5d7/scratchpad
rm -rf scaffold
npx --yes create-vite@latest scaffold --template react-ts --no-interactive
rsync -a --exclude .git scaffold/ /Users/gabes/Documents/cangjie-trainer/
cd /Users/gabes/Documents/cangjie-trainer
ls
```

Expected: `index.html package.json src tsconfig.json vite.config.ts docs ...`

- [ ] **Step 2: Install dependencies**

```bash
cd /Users/gabes/Documents/cangjie-trainer
npm install
npm install -D vitest jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

Expected: no errors, `node_modules` created.

- [ ] **Step 3: Configure Vitest in `vite.config.ts`**

Replace the file with:

```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
})
```

- [ ] **Step 4: Create the setup file**

`src/test/setup.ts`:

```ts
import '@testing-library/jest-dom/vitest'
```

- [ ] **Step 5: Add scripts to `package.json`**

In the `"scripts"` object add:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 6: Remove the scaffold's demo code**

Delete `src/App.css`, `src/assets/react.svg`, `public/vite.svg`. Replace `src/App.tsx` with:

```tsx
export default function App() {
  return <h1>Cangjie Trainer</h1>
}
```

Replace `src/index.css` contents with a single line for now (Task 6 fills it):

```css
:root { color-scheme: light dark; }
```

In `index.html` set `<title>Cangjie Trainer</title>`, set `<html lang="zh-Hant">`, and remove the `<link rel="icon" ...>` line.

- [ ] **Step 7: Write a smoke test**

`src/App.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('App', () => {
  it('renders the title', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: 'Cangjie Trainer' })).toBeInTheDocument()
  })
})
```

- [ ] **Step 8: Run tests and build**

```bash
npm test
npm run build
```

Expected: `1 passed`, then `✓ built in ...`.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "chore: scaffold Vite React TypeScript app with Vitest"
```

---

### Task 2: Shared types and character set data

**Files:**
- Create: `src/lib/types.ts`, `src/data/sets.ts`, `src/data/sets.test.ts`

**Interfaces:**
- Produces:
  - `type Mode = 'timed' | 'free'`
  - `type PositionState = 'correct' | 'wrong' | 'current' | 'pending'`
  - `interface RunResult { setIndex: number; order: string[]; elapsedMs: number; wrongTally: number; missed: string[] }`
  - `interface BestRecord { bestMs: number; accuracy: number; recordedAt: string }`
  - `type Bests = Record<number, BestRecord>`
  - `SET_SIZE = 100`, `SET_COUNT = 10`, `CHARACTERS: string`, `SETS: string[][]`

- [ ] **Step 1: Write the types file**

`src/lib/types.ts`:

```ts
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
```

- [ ] **Step 2: Write the failing data test**

`src/data/sets.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { CHARACTERS, SETS, SET_COUNT, SET_SIZE } from './sets'

describe('character sets', () => {
  it('has exactly 1000 characters', () => {
    expect([...CHARACTERS]).toHaveLength(SET_COUNT * SET_SIZE)
  })

  it('has no duplicates', () => {
    expect(new Set(CHARACTERS).size).toBe(SET_COUNT * SET_SIZE)
  })

  it('contains only Han characters', () => {
    for (const ch of CHARACTERS) {
      expect(ch).toMatch(/^\p{Script=Han}$/u)
    }
  })

  it('splits into 10 sets of 100 in order', () => {
    expect(SETS).toHaveLength(SET_COUNT)
    for (const set of SETS) expect(set).toHaveLength(SET_SIZE)
    expect(SETS[0][0]).toBe('的')
    expect(SETS[1][0]).toBe([...CHARACTERS][100])
    expect(SETS.flat().join('')).toBe(CHARACTERS)
  })
})
```

- [ ] **Step 3: Run to verify it fails**

```bash
npm test -- src/data
```

Expected: FAIL, cannot find module `./sets`.

- [ ] **Step 4: Write the data file**

`src/data/sets.ts`. The ten lines below are exactly 100 characters each. Copy them verbatim.

```ts
export const SET_SIZE = 100
export const SET_COUNT = 10

/** 1000 common traditional Chinese characters, most frequent first. */
export const CHARACTERS =
  '的一是不了在人有我他這個們中來上大為和國地到以說時要就出會可也你對生能而子那得於著下自之年過發後作裡用道行所然家種事成方多經麼去法學如都同現當沒動面起看定天分還進好小部其些主樣理心她本前開但因只從想實' +
  '日軍者意無力它與長把機十民第公此已工使情明性知全三又關點正業外將兩高間由問很最重並物手應戰向頭文體政美相見被利什二等產或新己制身果加西斯月話合回特代內信表化老給世位次度門任常先海通教兒原東聲提立及比員' +
  '解水名真論處走義各入幾口認條平系氣題活爾更別打女變四神總何電數安少報才結反受目太量再感建務做接必場件計管期市直德資命山金指克許統區保至隊形社便空決治展馬科司五基眼書非則聽白卻界達光放強即像難且權思王象' +
  '完設式色路記南品住告類求據程北邊死張該交規萬取拉格望覺術領共確傳師觀清今切院讓識候帶導爭運笑飛風步改收根幹造言聯持組每濟車親極林服快辦議往元英士證近失轉夫令準布始怎呢存未遠叫台單影具羅字愛擊流備兵連調' +
  '深商算質團集百需價花黨華城石級整府離況亞請技際約示復病息究線似官火斷精滿支視消越器容照須九增研寫稱企八功吃警吧護足待紅局限選歷房隨曾推苦讀香境委婦敢段驗吸養易鬥層項係語構板陣停頓習漸座獲毛畫底遊室紀響' +
  '校談舉戲黃江灣講陳劉李尚童父母哥弟姐妹朋友醫錢買賣飯喝睡早晚午夜昨週末假旅玩樂音聞紙雜誌店圖館博園街鄉村河湖島嶼晴雨雪雲霧熱冷暖涼春夏秋冬左右橙綠藍紫黑灰棕顏狀圓短矮胖瘦慢舊壞醜臭甜酸辣鹹淡輕軟硬乾濕' +
  '亮暗髮睛耳朵鼻嘴牙舌臉頸肩胸背腹腰腿腳甲皮膚骨血肉肝肺胃腸腦貓狗鳥魚豬牛羊雞鴨鵝虎獅熊猴兔鼠蛇龍鳳蟲蝶蜂蟻米麵包餅蛋糕奶茶咖啡汁啤酒葡萄蘋蕉橘瓜草莓菜湯蝦蟹豆腐糖鹽油醋醬桌椅床沙櫃燈窗簾牆屋頂廚廁浴客' +
  '廳臥陽庫衣褲裙鞋襪帽圍巾套鏡錶戒鏈傘船鐵巴踏摩托票站港碼橋隧律察農演歌跑跳坐躺拿送借找答練考試敗喜歡討厭怕擔興傷緊害羞驕傲謝抱歉迎零六七千億半雙號角塊宜貴付款帳節端宵聖誕婚典禮派網料檔案密登載裝刪除搜' +
  '尋按鍵螢幕盤滑印憲投稅銀貸率股險貿史哲藝育星球宇宙土木雷健康疾冒燒咳嗽痛藥針檢查療休較稍微乎概終突刻偶雖既儘哪誰嗎啊呀哦喔嘛啦懂忘懷疑希願擇劃繼續束止棄堅努嘗群眾庭低速淺寬窄厚薄粗細彎斜糙淨髒亂齊靜吵' +
  '鬧簡複困危普奇怪楚模糊爸媽爺叔姑舅姨孫婿媳妻兄姊掃洗刷擦煮炒烤蒸炸剪縫織唱踢拋抓握搬抬扔丟撿拾扶靠躲藏翻滾爬鎮縣省州樓巷弄寸尺丈里斤噸升筆墨硯刀叉匙碗杯壺瓶罐盒箱袋籃籠餐食貌尊敬謙虛誠勇聰笨懶勤奮仔耐'

const all = [...CHARACTERS]

export const SETS: string[][] = Array.from({ length: SET_COUNT }, (_, i) =>
  all.slice(i * SET_SIZE, (i + 1) * SET_SIZE),
)
```

- [ ] **Step 5: Run to verify it passes**

```bash
npm test -- src/data
```

Expected: `4 passed`. If the length or duplicate test fails, a line was mis-copied. Count each line with `node -e "console.log([...process.argv[1]].length)" '<line>'` and fix.

- [ ] **Step 6: Commit**

```bash
git add src/lib/types.ts src/data
git commit -m "feat: add shared types and 1000-character frequency sets"
```

---

### Task 3: Scoring functions

**Files:**
- Create: `src/lib/scoring.ts`, `src/lib/scoring.test.ts`

**Interfaces:**
- Consumes: `PositionState` from `src/lib/types.ts`.
- Produces:
  - `positionStates(target: string[], typed: string): PositionState[]`
  - `newlyWrongPositions(prevTyped: string, typed: string, target: string[]): number[]`
  - `charsPerMinute(elapsedMs: number, count?: number): number`
  - `accuracy(wrongTally: number, total?: number): number` (0 to 1)
  - `shuffle<T>(items: readonly T[], rng?: () => number): T[]`
  - `missedCharacters(target: string[], wrongPositions: Iterable<number>): string[]`
  - `formatTime(ms: number): string`

- [ ] **Step 1: Write the failing tests**

`src/lib/scoring.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import {
  accuracy,
  charsPerMinute,
  formatTime,
  missedCharacters,
  newlyWrongPositions,
  positionStates,
  shuffle,
} from './scoring'

const target = [...'的一是不了']

describe('positionStates', () => {
  it('marks everything pending except the first as current when nothing is typed', () => {
    expect(positionStates(target, '')).toEqual(['current', 'pending', 'pending', 'pending', 'pending'])
  })

  it('marks correct, wrong, current, pending', () => {
    expect(positionStates(target, '的X')).toEqual(['correct', 'wrong', 'current', 'pending', 'pending'])
  })

  it('has no current position when the run is complete', () => {
    expect(positionStates(target, '的一是不了')).toEqual(['correct', 'correct', 'correct', 'correct', 'correct'])
  })

  it('ignores typed characters beyond the target length', () => {
    expect(positionStates(target, '的一是不了多')).toHaveLength(5)
  })
})

describe('newlyWrongPositions', () => {
  it('reports a newly typed wrong character', () => {
    expect(newlyWrongPositions('的', '的X', target)).toEqual([1])
  })

  it('reports nothing for a correct character', () => {
    expect(newlyWrongPositions('的', '的一', target)).toEqual([])
  })

  it('reports nothing on backspace', () => {
    expect(newlyWrongPositions('的X', '的', target)).toEqual([])
  })

  it('reports again when a wrong character is retyped wrong', () => {
    expect(newlyWrongPositions('的', '的Y', target)).toEqual([1])
  })

  it('reports nothing when a wrong character is fixed', () => {
    expect(newlyWrongPositions('的X', '的一', target)).toEqual([])
  })

  it('handles several characters committed at once', () => {
    expect(newlyWrongPositions('', '的AB', target)).toEqual([1, 2])
  })

  it('ignores positions beyond the target', () => {
    expect(newlyWrongPositions('的一是不', '的一是不了Z', target)).toEqual([])
  })
})

describe('charsPerMinute', () => {
  it('computes 100 chars in one minute as 100', () => {
    expect(charsPerMinute(60_000)).toBe(100)
  })

  it('rounds to a whole number', () => {
    expect(charsPerMinute(90_000)).toBe(67)
  })

  it('returns 0 for a non-positive time', () => {
    expect(charsPerMinute(0)).toBe(0)
  })
})

describe('accuracy', () => {
  it('is 1 with no mistakes', () => {
    expect(accuracy(0)).toBe(1)
  })

  it('subtracts mistakes from the total', () => {
    expect(accuracy(10)).toBeCloseTo(0.9)
  })

  it('floors at 0', () => {
    expect(accuracy(150)).toBe(0)
  })
})

describe('shuffle', () => {
  it('returns a permutation of the same items', () => {
    const items = [...'的一是不了在人有我他']
    const result = shuffle(items)
    expect(result).toHaveLength(items.length)
    expect([...result].sort()).toEqual([...items].sort())
  })

  it('does not mutate the input', () => {
    const items = ['a', 'b', 'c']
    shuffle(items)
    expect(items).toEqual(['a', 'b', 'c'])
  })

  it('is deterministic with an injected rng', () => {
    const rng = () => 0
    expect(shuffle(['a', 'b', 'c'], rng)).toEqual(shuffle(['a', 'b', 'c'], rng))
  })
})

describe('missedCharacters', () => {
  it('returns wrong targets in set order without duplicates', () => {
    const t = [...'的一的是']
    expect(missedCharacters(t, [2, 0, 3])).toEqual(['的', '是'])
  })
})

describe('formatTime', () => {
  it('formats as m:ss.t', () => {
    expect(formatTime(65_340)).toBe('1:05.3')
    expect(formatTime(0)).toBe('0:00.0')
    expect(formatTime(599_990)).toBe('9:59.9')
  })
})
```

- [ ] **Step 2: Run to verify it fails**

```bash
npm test -- src/lib/scoring
```

Expected: FAIL, cannot find module `./scoring`.

- [ ] **Step 3: Implement**

`src/lib/scoring.ts`:

```ts
import type { PositionState } from './types'

export const DEFAULT_TOTAL = 100

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

export function shuffle<T>(items: readonly T[], rng: () => number = Math.random): T[] {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
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

export function formatTime(ms: number): string {
  const tenths = Math.floor(ms / 100)
  const minutes = Math.floor(tenths / 600)
  const seconds = Math.floor((tenths % 600) / 10)
  const tenth = tenths % 10
  return `${minutes}:${String(seconds).padStart(2, '0')}.${tenth}`
}
```

- [ ] **Step 4: Run to verify it passes**

```bash
npm test -- src/lib/scoring
```

Expected: `21 passed`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/scoring.ts src/lib/scoring.test.ts
git commit -m "feat: add pure scoring functions"
```

---

### Task 4: Personal best storage

**Files:**
- Create: `src/lib/storage.ts`, `src/lib/storage.test.ts`

**Interfaces:**
- Consumes: `BestRecord`, `Bests` from `src/lib/types.ts`.
- Produces:
  - `STORAGE_KEY = 'cangjie-trainer:bests'`
  - `MIN_BEST_ACCURACY = 0.9`
  - `loadBests(storage?: Storage): Bests`
  - `saveBest(setIndex: number, record: BestRecord, storage?: Storage): void`
  - `qualifiesAsBest(existing: BestRecord | undefined, candidate: { elapsedMs: number; accuracy: number }): boolean`

- [ ] **Step 1: Write the failing tests**

`src/lib/storage.test.ts`:

```ts
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
```

- [ ] **Step 2: Run to verify it fails**

```bash
npm test -- src/lib/storage
```

Expected: FAIL, cannot find module `./storage`.

- [ ] **Step 3: Implement**

`src/lib/storage.ts`:

```ts
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
```

- [ ] **Step 4: Run to verify it passes**

```bash
npm test -- src/lib/storage
```

Expected: `13 passed`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/storage.ts src/lib/storage.test.ts
git commit -m "feat: add personal best storage with validation"
```

---

### Task 5: The `useDrill` hook

**Files:**
- Create: `src/hooks/useDrill.ts`, `src/hooks/useDrill.test.ts`

**Interfaces:**
- Consumes: `positionStates`, `newlyWrongPositions`, `shuffle` from `src/lib/scoring.ts`; `PositionState` from `src/lib/types.ts`.
- Produces:

```ts
interface UseDrillOptions { now?: () => number; rng?: () => number }
interface DrillState {
  order: string[]
  typed: string
  wrongTally: number
  wrongPositions: number[]
  startedAt: number | null
  endedAt: number | null
  runId: number
}
interface Drill extends DrillState {
  states: PositionState[]
  isDone: boolean
  onInput(value: string, isComposing: boolean): void
  scramble(): void
  restart(): void
}
function useDrill(initialOrder: string[], options?: UseDrillOptions): Drill
```

`runId` increments on every restart or scramble. `Drill.tsx` uses it as the `key` of the input so the uncontrolled field is remounted empty.

- [ ] **Step 1: Write the failing tests**

`src/hooks/useDrill.test.ts`:

```ts
import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useDrill } from './useDrill'

const order = Array.from({ length: 100 }, (_, i) => String.fromCodePoint(0x4e00 + i))

function fakeClock(start = 1000) {
  let t = start
  return { now: () => t, advance: (ms: number) => void (t += ms) }
}

describe('useDrill', () => {
  it('starts with nothing typed and the first position current', () => {
    const { result } = renderHook(() => useDrill(order))
    expect(result.current.typed).toBe('')
    expect(result.current.states[0]).toBe('current')
    expect(result.current.startedAt).toBeNull()
    expect(result.current.isDone).toBe(false)
  })

  it('ignores input while composing', () => {
    const { result } = renderHook(() => useDrill(order))
    act(() => result.current.onInput('x', true))
    expect(result.current.typed).toBe('')
    expect(result.current.startedAt).toBeNull()
  })

  it('starts the clock on the first committed character', () => {
    const clock = fakeClock(5000)
    const { result } = renderHook(() => useDrill(order, { now: clock.now }))
    act(() => result.current.onInput(order[0], false))
    expect(result.current.startedAt).toBe(5000)
    clock.advance(100)
    act(() => result.current.onInput(order[0] + order[1], false))
    expect(result.current.startedAt).toBe(5000)
  })

  it('tracks wrong characters and never decrements the tally', () => {
    const { result } = renderHook(() => useDrill(order))
    act(() => result.current.onInput('X', false))
    expect(result.current.wrongTally).toBe(1)
    expect(result.current.states[0]).toBe('wrong')
    act(() => result.current.onInput('', false))
    act(() => result.current.onInput(order[0], false))
    expect(result.current.wrongTally).toBe(1)
    expect(result.current.wrongPositions).toEqual([0])
    expect(result.current.states[0]).toBe('correct')
  })

  it('caps typed input at the set length', () => {
    const { result } = renderHook(() => useDrill(order))
    act(() => result.current.onInput(order.join('') + '多', false))
    expect([...result.current.typed]).toHaveLength(100)
  })

  it('ends the run when all positions are filled', () => {
    const clock = fakeClock(0)
    const { result } = renderHook(() => useDrill(order, { now: clock.now }))
    act(() => result.current.onInput(order[0], false))
    clock.advance(60_000)
    act(() => result.current.onInput(order.join(''), false))
    expect(result.current.isDone).toBe(true)
    expect(result.current.endedAt).toBe(60_000)
  })

  it('ignores input after the run is done', () => {
    const { result } = renderHook(() => useDrill(order))
    act(() => result.current.onInput(order.join(''), false))
    act(() => result.current.onInput('', false))
    expect([...result.current.typed]).toHaveLength(100)
  })

  it('restart clears the run and keeps the order', () => {
    const { result } = renderHook(() => useDrill(order))
    act(() => result.current.onInput('X', false))
    const before = result.current.runId
    act(() => result.current.restart())
    expect(result.current.typed).toBe('')
    expect(result.current.wrongTally).toBe(0)
    expect(result.current.startedAt).toBeNull()
    expect(result.current.order).toEqual(order)
    expect(result.current.runId).toBe(before + 1)
  })

  it('scramble clears the run and changes the order', () => {
    const { result } = renderHook(() => useDrill(order, { rng: () => 0.5 }))
    act(() => result.current.onInput('X', false))
    act(() => result.current.scramble())
    expect(result.current.typed).toBe('')
    expect(result.current.wrongTally).toBe(0)
    expect(result.current.order).not.toEqual(order)
    expect([...result.current.order].sort()).toEqual([...order].sort())
  })
})
```

- [ ] **Step 2: Run to verify it fails**

```bash
npm test -- src/hooks
```

Expected: FAIL, cannot find module `./useDrill`.

- [ ] **Step 3: Implement**

`src/hooks/useDrill.ts`:

```ts
import { useCallback, useMemo, useState } from 'react'
import { newlyWrongPositions, positionStates, shuffle } from '../lib/scoring'
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
  runId: number
}

export interface Drill extends DrillState {
  states: PositionState[]
  isDone: boolean
  onInput(value: string, isComposing: boolean): void
  scramble(): void
  restart(): void
}

function freshState(order: string[], runId: number): DrillState {
  return { order, typed: '', wrongTally: 0, wrongPositions: [], startedAt: null, endedAt: null, runId }
}

export function useDrill(initialOrder: string[], options: UseDrillOptions = {}): Drill {
  const now = options.now ?? (() => performance.now())
  const rng = options.rng ?? Math.random
  const [state, setState] = useState<DrillState>(() => freshState(initialOrder, 0))

  const onInput = useCallback(
    (value: string, isComposing: boolean) => {
      if (isComposing) return
      setState((prev) => {
        if (prev.endedAt !== null) return prev
        const capped = [...value].slice(0, prev.order.length).join('')
        const wrong = newlyWrongPositions(prev.typed, capped, prev.order)
        const t = now()
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

  const restart = useCallback(() => {
    setState((prev) => freshState(prev.order, prev.runId + 1))
  }, [])

  const scramble = useCallback(() => {
    setState((prev) => freshState(shuffle(prev.order, rng), prev.runId + 1))
  }, [rng])

  const states = useMemo(() => positionStates(state.order, state.typed), [state.order, state.typed])

  return {
    ...state,
    states,
    isDone: state.endedAt !== null,
    onInput,
    scramble,
    restart,
  }
}
```

- [ ] **Step 4: Run to verify it passes**

```bash
npm test -- src/hooks
```

Expected: `9 passed`.

- [ ] **Step 5: Commit**

```bash
git add src/hooks
git commit -m "feat: add useDrill run state hook"
```

---

### Task 6: Global styles and Button

Load the `agent-skills:frontend-ui-engineering` skill before this task.

**Files:**
- Modify: `src/index.css` (replace), `src/main.tsx`
- Create: `src/components/Button.tsx`, `src/components/Button.module.css`, `src/components/Button.test.tsx`

**Interfaces:**
- Produces: CSS custom properties listed below, used by every later task. `Button` component:

```ts
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost'
}
```

- [ ] **Step 1: Write the global stylesheet**

Replace `src/index.css` with:

```css
:root {
  color-scheme: light dark;

  --font-ui: -apple-system, 'SF Pro Text', 'Helvetica Neue', 'PingFang TC', 'Noto Sans TC', sans-serif;
  --font-cjk: 'Songti TC', 'Noto Serif TC', 'PingFang TC', serif;
  --font-mono: 'SF Mono', Menlo, Consolas, monospace;

  --bg: #f7f5f0;
  --surface: #ffffff;
  --surface-2: #efece5;
  --border: #dcd8ce;
  --text: #1f1d1a;
  --text-muted: #6f6a60;
  --accent: #2f6fed;
  --accent-soft: #dbe6ff;
  --correct: #3a8a5c;
  --correct-soft: #dff1e6;
  --wrong: #c24a3b;
  --wrong-soft: #f8dcd7;

  --radius: 12px;
  --radius-sm: 8px;
  --shadow: 0 1px 2px rgb(0 0 0 / 0.05), 0 8px 24px rgb(0 0 0 / 0.06);
}

@media (prefers-color-scheme: dark) {
  :root {
    --bg: #15161a;
    --surface: #1e2026;
    --surface-2: #262930;
    --border: #343842;
    --text: #ecebe6;
    --text-muted: #9a9890;
    --accent: #6f9cff;
    --accent-soft: #24304d;
    --correct: #6fc794;
    --correct-soft: #1f3a2b;
    --wrong: #ef7b6d;
    --wrong-soft: #45231e;
    --shadow: 0 1px 2px rgb(0 0 0 / 0.4), 0 8px 24px rgb(0 0 0 / 0.35);
  }
}

*,
*::before,
*::after {
  box-sizing: border-box;
}

html,
body,
#root {
  margin: 0;
  min-height: 100%;
}

body {
  font-family: var(--font-ui);
  font-size: 16px;
  line-height: 1.5;
  color: var(--text);
  background: var(--bg);
  -webkit-font-smoothing: antialiased;
}

button,
input {
  font: inherit;
  color: inherit;
}

h1,
h2,
h3,
p {
  margin: 0;
}
```

- [ ] **Step 2: Confirm `src/main.tsx` imports `./index.css`**

The scaffold already does. It should read:

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

- [ ] **Step 3: Write the failing Button test**

`src/components/Button.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Button } from './Button'

describe('Button', () => {
  it('renders its label and handles clicks', async () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Timed</Button>)
    await userEvent.click(screen.getByRole('button', { name: 'Timed' }))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('defaults to type="button"', () => {
    render(<Button>Go</Button>)
    expect(screen.getByRole('button')).toHaveAttribute('type', 'button')
  })
})
```

- [ ] **Step 4: Run to verify it fails**

```bash
npm test -- src/components/Button
```

Expected: FAIL, cannot find module `./Button`.

- [ ] **Step 5: Implement Button**

`src/components/Button.module.css`:

```css
.button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  min-height: 2.5rem;
  padding: 0 1rem;
  border-radius: var(--radius-sm);
  border: 1px solid transparent;
  cursor: pointer;
  font-weight: 500;
  transition: background-color 120ms ease, border-color 120ms ease, transform 80ms ease;
}

.button:active {
  transform: translateY(1px);
}

.button:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.primary {
  background: var(--accent);
  color: #fff;
}

.primary:hover {
  filter: brightness(1.08);
}

.secondary {
  background: var(--surface);
  border-color: var(--border);
}

.secondary:hover {
  background: var(--surface-2);
}

.ghost {
  background: transparent;
  color: var(--text-muted);
}

.ghost:hover {
  background: var(--surface-2);
  color: var(--text);
}
```

`src/components/Button.tsx`:

```tsx
import type { ButtonHTMLAttributes } from 'react'
import styles from './Button.module.css'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost'
}

export function Button({ variant = 'secondary', className, type = 'button', ...rest }: ButtonProps) {
  const classes = [styles.button, styles[variant], className].filter(Boolean).join(' ')
  return <button type={type} className={classes} {...rest} />
}
```

- [ ] **Step 6: Run tests and build**

```bash
npm test
npm run build
```

Expected: all pass, build succeeds.

- [ ] **Step 7: Commit**

```bash
git add src/index.css src/main.tsx src/components/Button.tsx src/components/Button.module.css src/components/Button.test.tsx
git commit -m "feat: add design tokens, global styles, and Button"
```

---

### Task 7: CharacterGrid, DrillInput, and Clock

Load the `agent-skills:frontend-ui-engineering` skill before this task.

**Files:**
- Create: `src/components/CharacterGrid.tsx`, `src/components/CharacterGrid.module.css`, `src/components/CharacterGrid.test.tsx`
- Create: `src/components/DrillInput.tsx`, `src/components/DrillInput.module.css`, `src/components/DrillInput.test.tsx`
- Create: `src/components/Clock.tsx`, `src/components/Clock.test.tsx`

**Interfaces:**
- Consumes: `PositionState` from `src/lib/types.ts`, `formatTime` from `src/lib/scoring.ts`.
- Produces:

```ts
function CharacterGrid(props: { order: string[]; states: PositionState[] }): JSX.Element
function DrillInput(props: {
  onValue(value: string, isComposing: boolean): void
  inputRef: React.RefObject<HTMLInputElement | null>
  disabled?: boolean
}): JSX.Element
function Clock(props: { startedAt: number | null; endedAt: number | null; now?: () => number }): JSX.Element
```

- [ ] **Step 1: Write the failing CharacterGrid test**

`src/components/CharacterGrid.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { CharacterGrid } from './CharacterGrid'

describe('CharacterGrid', () => {
  it('renders every character with a data-state attribute', () => {
    render(<CharacterGrid order={['的', '一', '是']} states={['correct', 'wrong', 'current']} />)
    expect(screen.getByText('的')).toHaveAttribute('data-state', 'correct')
    expect(screen.getByText('一')).toHaveAttribute('data-state', 'wrong')
    expect(screen.getByText('是')).toHaveAttribute('data-state', 'current')
  })
})
```

- [ ] **Step 2: Write the failing DrillInput test**

`src/components/DrillInput.test.tsx`:

```tsx
import { fireEvent, render, screen } from '@testing-library/react'
import { createRef } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { DrillInput } from './DrillInput'

describe('DrillInput', () => {
  it('reports committed input with the composing flag', () => {
    const onValue = vi.fn()
    const ref = createRef<HTMLInputElement>()
    render(<DrillInput onValue={onValue} inputRef={ref} />)
    const input = screen.getByRole('textbox')
    fireEvent.input(input, { target: { value: '的' }, isComposing: false })
    expect(onValue).toHaveBeenLastCalledWith('的', false)
  })

  it('passes through isComposing true', () => {
    const onValue = vi.fn()
    const ref = createRef<HTMLInputElement>()
    render(<DrillInput onValue={onValue} inputRef={ref} />)
    const input = screen.getByRole('textbox')
    fireEvent.input(input, { target: { value: 'a' }, isComposing: true })
    expect(onValue).toHaveBeenLastCalledWith('a', true)
  })

  it('reports the value again on compositionend as committed', () => {
    const onValue = vi.fn()
    const ref = createRef<HTMLInputElement>()
    render(<DrillInput onValue={onValue} inputRef={ref} />)
    const input = screen.getByRole('textbox') as HTMLInputElement
    input.value = '的一'
    fireEvent.compositionEnd(input)
    expect(onValue).toHaveBeenLastCalledWith('的一', false)
  })

  it('exposes the element through inputRef', () => {
    const ref = createRef<HTMLInputElement>()
    render(<DrillInput onValue={() => {}} inputRef={ref} />)
    expect(ref.current).toBeInstanceOf(HTMLInputElement)
  })
})
```

- [ ] **Step 3: Write the failing Clock test**

`src/components/Clock.test.tsx`:

```tsx
import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Clock } from './Clock'

describe('Clock', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('shows zero before the run starts', () => {
    render(<Clock startedAt={null} endedAt={null} now={() => 0} />)
    expect(screen.getByText('0:00.0')).toBeInTheDocument()
  })

  it('ticks while running', () => {
    let t = 1000
    render(<Clock startedAt={1000} endedAt={null} now={() => t} />)
    t = 3500
    act(() => {
      vi.advanceTimersByTime(200)
    })
    expect(screen.getByText('0:02.5')).toBeInTheDocument()
  })

  it('freezes at the end time', () => {
    render(<Clock startedAt={0} endedAt={65_340} now={() => 999_999} />)
    expect(screen.getByText('1:05.3')).toBeInTheDocument()
  })
})
```

- [ ] **Step 4: Run to verify they fail**

```bash
npm test -- src/components
```

Expected: three files FAIL with cannot find module.

- [ ] **Step 5: Implement CharacterGrid**

`src/components/CharacterGrid.module.css`:

```css
.grid {
  display: grid;
  grid-template-columns: repeat(20, minmax(0, 1fr));
  gap: 0.35rem 0.15rem;
  width: 100%;
  max-width: 64rem;
  margin: 0 auto;
  padding: 1.5rem 1rem;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  user-select: none;
}

.glyph {
  font-family: var(--font-cjk);
  font-size: clamp(1.25rem, 2.4vw, 2rem);
  line-height: 1.6;
  text-align: center;
  border-radius: 6px;
  color: var(--text-muted);
  transition: background-color 100ms ease, color 100ms ease;
}

.glyph[data-state='correct'] {
  color: var(--correct);
}

.glyph[data-state='wrong'] {
  color: var(--wrong);
  background: var(--wrong-soft);
}

.glyph[data-state='current'] {
  color: var(--text);
  background: var(--accent-soft);
  box-shadow: inset 0 -3px 0 var(--accent);
}

@media (max-width: 640px) {
  .grid {
    grid-template-columns: repeat(10, minmax(0, 1fr));
  }
}
```

`src/components/CharacterGrid.tsx`:

```tsx
import type { PositionState } from '../lib/types'
import styles from './CharacterGrid.module.css'

interface CharacterGridProps {
  order: string[]
  states: PositionState[]
}

export function CharacterGrid({ order, states }: CharacterGridProps) {
  return (
    <div className={styles.grid} aria-hidden="true">
      {order.map((ch, i) => (
        <span key={i} className={styles.glyph} data-state={states[i]}>
          {ch}
        </span>
      ))}
    </div>
  )
}
```

- [ ] **Step 6: Implement DrillInput**

`src/components/DrillInput.module.css`:

```css
.input {
  display: block;
  width: 100%;
  max-width: 64rem;
  margin: 0 auto;
  padding: 0.9rem 1.1rem;
  font-family: var(--font-cjk);
  font-size: clamp(1.25rem, 2.4vw, 1.75rem);
  letter-spacing: 0.06em;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  outline: none;
  transition: border-color 120ms ease, box-shadow 120ms ease;
}

.input:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-soft);
}

.input::placeholder {
  color: var(--text-muted);
  letter-spacing: 0;
  font-family: var(--font-ui);
}
```

`src/components/DrillInput.tsx`:

```tsx
import type { CompositionEvent, FormEvent, RefObject } from 'react'
import styles from './DrillInput.module.css'

interface DrillInputProps {
  onValue(value: string, isComposing: boolean): void
  inputRef: RefObject<HTMLInputElement | null>
  disabled?: boolean
}

/**
 * Uncontrolled on purpose: React controlled inputs interfere with IME
 * composition. The owner remounts this component (via `key`) to clear it.
 */
export function DrillInput({ onValue, inputRef, disabled }: DrillInputProps) {
  const handleInput = (e: FormEvent<HTMLInputElement>) => {
    const native = e.nativeEvent as InputEvent
    onValue(e.currentTarget.value, native.isComposing === true)
  }

  const handleCompositionEnd = (e: CompositionEvent<HTMLInputElement>) => {
    onValue(e.currentTarget.value, false)
  }

  return (
    <input
      ref={inputRef}
      className={styles.input}
      type="text"
      autoFocus
      autoComplete="off"
      autoCorrect="off"
      autoCapitalize="off"
      spellCheck={false}
      disabled={disabled}
      placeholder="在此輸入"
      aria-label="Type the characters shown above"
      onInput={handleInput}
      onCompositionEnd={handleCompositionEnd}
    />
  )
}
```

- [ ] **Step 7: Implement Clock**

`src/components/Clock.tsx`:

```tsx
import { useEffect, useState } from 'react'
import { formatTime } from '../lib/scoring'

interface ClockProps {
  startedAt: number | null
  endedAt: number | null
  now?: () => number
}

const TICK_MS = 100

export function Clock({ startedAt, endedAt, now = () => performance.now() }: ClockProps) {
  const [, setTick] = useState(0)
  const running = startedAt !== null && endedAt === null

  useEffect(() => {
    if (!running) return
    const id = setInterval(() => setTick((t) => t + 1), TICK_MS)
    return () => clearInterval(id)
  }, [running])

  const elapsed = startedAt === null ? 0 : (endedAt ?? now()) - startedAt

  return (
    <span style={{ fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums' }} aria-live="off">
      {formatTime(elapsed)}
    </span>
  )
}
```

- [ ] **Step 8: Run tests**

```bash
npm test -- src/components
```

Expected: all pass. If the DrillInput `isComposing` test fails because jsdom drops the flag from `fireEvent.input`, change the two `fireEvent.input(...)` calls to dispatch a real `InputEvent`:

```ts
input.value = '的'
input.dispatchEvent(new InputEvent('input', { bubbles: true, isComposing: false }))
```

- [ ] **Step 9: Commit**

```bash
git add src/components
git commit -m "feat: add CharacterGrid, DrillInput, and Clock components"
```

---

### Task 8: Drill screen

Load the `agent-skills:frontend-ui-engineering` skill before this task.

**Files:**
- Create: `src/components/Drill.tsx`, `src/components/Drill.module.css`, `src/components/Drill.test.tsx`

**Interfaces:**
- Consumes: `useDrill` from `src/hooks/useDrill.ts`; `CharacterGrid`, `DrillInput`, `Clock`, `Button`; `missedCharacters` from `src/lib/scoring.ts`; `Mode`, `RunResult` from `src/lib/types.ts`.
- Produces:

```ts
interface DrillProps {
  setIndex: number
  mode: Mode
  order: string[]
  onFinish(result: RunResult): void
  onBack(): void
}
function Drill(props: DrillProps): JSX.Element
```

- [ ] **Step 1: Write the failing test**

`src/components/Drill.test.tsx`:

```tsx
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Drill } from './Drill'

const order = Array.from({ length: 100 }, (_, i) => String.fromCodePoint(0x4e00 + i))

function typeCommitted(value: string) {
  const input = screen.getByRole('textbox') as HTMLInputElement
  input.value = value
  fireEvent.compositionEnd(input)
}

describe('Drill', () => {
  it('shows the hint, set name, and mode', () => {
    render(<Drill setIndex={2} mode="timed" order={order} onFinish={() => {}} onBack={() => {}} />)
    expect(screen.getByText('Switch your keyboard to Cangjie')).toBeInTheDocument()
    expect(screen.getByText('Set 3')).toBeInTheDocument()
    expect(screen.getByText('Timed')).toBeInTheDocument()
  })

  it('calls onFinish with the result when a timed run completes', () => {
    const onFinish = vi.fn()
    render(<Drill setIndex={0} mode="timed" order={order} onFinish={onFinish} onBack={() => {}} />)
    typeCommitted('X' + order.slice(1).join(''))
    expect(onFinish).toHaveBeenCalledTimes(1)
    const result = onFinish.mock.calls[0][0]
    expect(result.setIndex).toBe(0)
    expect(result.wrongTally).toBe(1)
    expect(result.missed).toEqual([order[0]])
    expect(result.order).toEqual(order)
    expect(result.elapsedMs).toBeGreaterThanOrEqual(0)
  })

  it('does not call onFinish in free mode, shows done instead', () => {
    const onFinish = vi.fn()
    render(<Drill setIndex={0} mode="free" order={order} onFinish={onFinish} onBack={() => {}} />)
    typeCommitted(order.join(''))
    expect(onFinish).not.toHaveBeenCalled()
    expect(screen.getByText('Done')).toBeInTheDocument()
  })

  it('hides the clock in free mode', () => {
    render(<Drill setIndex={0} mode="free" order={order} onFinish={() => {}} onBack={() => {}} />)
    expect(screen.queryByText('0:00.0')).not.toBeInTheDocument()
  })

  it('restart clears the input', async () => {
    render(<Drill setIndex={0} mode="free" order={order} onFinish={() => {}} onBack={() => {}} />)
    typeCommitted('X')
    await userEvent.click(screen.getByRole('button', { name: 'Restart' }))
    expect((screen.getByRole('textbox') as HTMLInputElement).value).toBe('')
  })

  it('back button calls onBack', async () => {
    const onBack = vi.fn()
    render(<Drill setIndex={0} mode="free" order={order} onFinish={() => {}} onBack={onBack} />)
    await userEvent.click(screen.getByRole('button', { name: 'Back' }))
    expect(onBack).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run to verify it fails**

```bash
npm test -- src/components/Drill
```

Expected: FAIL, cannot find module `./Drill`.

- [ ] **Step 3: Implement**

`src/components/Drill.module.css`:

```css
.screen {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding: 1.5rem clamp(1rem, 4vw, 3rem) 3rem;
}

.bar {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  max-width: 64rem;
  width: 100%;
  margin: 0 auto;
}

.title {
  display: flex;
  align-items: baseline;
  gap: 0.6rem;
  margin-right: auto;
}

.setName {
  font-size: 1.1rem;
  font-weight: 600;
}

.mode {
  font-size: 0.85rem;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.clock {
  font-size: 1.25rem;
  min-width: 5.5rem;
  text-align: right;
}

.hint {
  max-width: 64rem;
  width: 100%;
  margin: 0 auto;
  font-size: 0.9rem;
  color: var(--text-muted);
}

.done {
  max-width: 64rem;
  width: 100%;
  margin: 0 auto;
  color: var(--correct);
  font-weight: 600;
}
```

`src/components/Drill.tsx`:

```tsx
import { useEffect, useRef } from 'react'
import { useDrill } from '../hooks/useDrill'
import { missedCharacters } from '../lib/scoring'
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
}

export function Drill({ setIndex, mode, order, onFinish, onBack }: DrillProps) {
  const drill = useDrill(order)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const reported = useRef(false)

  useEffect(() => {
    reported.current = false
  }, [drill.runId])

  useEffect(() => {
    if (mode !== 'timed' || !drill.isDone || reported.current) return
    reported.current = true
    onFinish({
      setIndex,
      order: drill.order,
      elapsedMs: (drill.endedAt ?? 0) - (drill.startedAt ?? 0),
      wrongTally: drill.wrongTally,
      missed: missedCharacters(drill.order, drill.wrongPositions),
    })
  }, [mode, drill.isDone, drill.order, drill.endedAt, drill.startedAt, drill.wrongTally, drill.wrongPositions, onFinish, setIndex])

  const focusInput = () => inputRef.current?.focus()

  return (
    <main className={styles.screen} onClick={focusInput}>
      <header className={styles.bar}>
        <div className={styles.title}>
          <span className={styles.setName}>Set {setIndex + 1}</span>
          <span className={styles.mode}>{mode === 'timed' ? 'Timed' : 'Free'}</span>
        </div>
        {mode === 'timed' && (
          <span className={styles.clock}>
            <Clock startedAt={drill.startedAt} endedAt={drill.endedAt} />
          </span>
        )}
        <Button variant="secondary" onClick={drill.scramble}>
          Scramble
        </Button>
        <Button variant="secondary" onClick={drill.restart}>
          Restart
        </Button>
        <Button variant="ghost" onClick={onBack}>
          Back
        </Button>
      </header>

      <CharacterGrid order={drill.order} states={drill.states} />

      <p className={styles.hint}>Switch your keyboard to Cangjie</p>

      <DrillInput key={drill.runId} onValue={drill.onInput} inputRef={inputRef} disabled={drill.isDone} />

      {mode === 'free' && drill.isDone && <p className={styles.done}>Done</p>}
    </main>
  )
}
```

- [ ] **Step 4: Run tests**

```bash
npm test -- src/components/Drill
```

Expected: `6 passed`.

- [ ] **Step 5: Commit**

```bash
git add src/components/Drill.tsx src/components/Drill.module.css src/components/Drill.test.tsx
git commit -m "feat: add Drill screen"
```

---

### Task 9: Home screen

Load the `agent-skills:frontend-ui-engineering` skill before this task.

**Files:**
- Create: `src/components/Home.tsx`, `src/components/Home.module.css`, `src/components/Home.test.tsx`

**Interfaces:**
- Consumes: `SETS`, `SET_SIZE` from `src/data/sets.ts`; `formatTime` from `src/lib/scoring.ts`; `Bests`, `Mode` from `src/lib/types.ts`; `Button`.
- Produces:

```ts
interface HomeProps { bests: Bests; onStart(setIndex: number, mode: Mode): void }
function Home(props: HomeProps): JSX.Element
```

- [ ] **Step 1: Write the failing test**

`src/components/Home.test.tsx`:

```tsx
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Home } from './Home'

describe('Home', () => {
  it('renders ten set cards with rank ranges', () => {
    render(<Home bests={{}} onStart={() => {}} />)
    expect(screen.getAllByRole('article')).toHaveLength(10)
    expect(screen.getByText('1 to 100')).toBeInTheDocument()
    expect(screen.getByText('901 to 1000')).toBeInTheDocument()
  })

  it('shows a dash when there is no best, and the best otherwise', () => {
    render(
      <Home bests={{ 1: { bestMs: 65_340, accuracy: 0.95, recordedAt: '2026-09-10T00:00:00.000Z' } }} onStart={() => {}} />,
    )
    const cards = screen.getAllByRole('article')
    expect(within(cards[0]).getByText('—')).toBeInTheDocument()
    expect(within(cards[1]).getByText('1:05.3')).toBeInTheDocument()
    expect(within(cards[1]).getByText('95%')).toBeInTheDocument()
  })

  it('starts the chosen set and mode', async () => {
    const onStart = vi.fn()
    render(<Home bests={{}} onStart={onStart} />)
    const card = screen.getAllByRole('article')[3]
    await userEvent.click(within(card).getByRole('button', { name: 'Timed' }))
    expect(onStart).toHaveBeenCalledWith(3, 'timed')
    await userEvent.click(within(card).getByRole('button', { name: 'Free' }))
    expect(onStart).toHaveBeenCalledWith(3, 'free')
  })
})
```

- [ ] **Step 2: Run to verify it fails**

```bash
npm test -- src/components/Home
```

Expected: FAIL, cannot find module `./Home`.

- [ ] **Step 3: Implement**

`src/components/Home.module.css`:

```css
.screen {
  min-height: 100vh;
  padding: 3rem clamp(1rem, 4vw, 3rem) 4rem;
  max-width: 64rem;
  margin: 0 auto;
}

.header {
  margin-bottom: 2rem;
}

.title {
  font-size: 2rem;
  font-weight: 700;
  letter-spacing: -0.01em;
}

.subtitle {
  margin-top: 0.35rem;
  color: var(--text-muted);
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(17rem, 1fr));
  gap: 1rem;
}

.card {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 1.25rem;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
}

.cardHead {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}

.setName {
  font-size: 1.1rem;
  font-weight: 600;
}

.range {
  font-size: 0.85rem;
  color: var(--text-muted);
}

.preview {
  font-family: var(--font-cjk);
  font-size: 1.4rem;
  letter-spacing: 0.1em;
  color: var(--text-muted);
}

.best {
  display: flex;
  gap: 0.75rem;
  font-family: var(--font-mono);
  font-size: 0.9rem;
  color: var(--text-muted);
}

.bestLabel {
  font-family: var(--font-ui);
}

.actions {
  display: flex;
  gap: 0.5rem;
  margin-top: auto;
}
```

`src/components/Home.tsx`:

```tsx
import { SETS, SET_SIZE } from '../data/sets'
import { formatTime } from '../lib/scoring'
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
        <h1 className={styles.title}>Cangjie Trainer</h1>
        <p className={styles.subtitle}>倉頡練習 · Retype the most common characters with your Cangjie keyboard.</p>
      </header>
      <div className={styles.grid}>
        {SETS.map((set, i) => {
          const best = bests[i]
          return (
            <article key={i} className={styles.card}>
              <div className={styles.cardHead}>
                <span className={styles.setName}>Set {i + 1}</span>
                <span className={styles.range}>
                  {i * SET_SIZE + 1} to {(i + 1) * SET_SIZE}
                </span>
              </div>
              <div className={styles.preview} aria-hidden="true">
                {set.slice(0, 8).join('')}
              </div>
              <div className={styles.best}>
                <span className={styles.bestLabel}>Best</span>
                {best ? (
                  <>
                    <span>{formatTime(best.bestMs)}</span>
                    <span>{Math.round(best.accuracy * 100)}%</span>
                  </>
                ) : (
                  <span>—</span>
                )}
              </div>
              <div className={styles.actions}>
                <Button variant="primary" onClick={() => onStart(i, 'timed')}>
                  Timed
                </Button>
                <Button variant="secondary" onClick={() => onStart(i, 'free')}>
                  Free
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

- [ ] **Step 4: Run tests**

```bash
npm test -- src/components/Home
```

Expected: `3 passed`.

- [ ] **Step 5: Commit**

```bash
git add src/components/Home.tsx src/components/Home.module.css src/components/Home.test.tsx
git commit -m "feat: add Home screen with set cards and personal bests"
```

---

### Task 10: Report screen

Load the `agent-skills:frontend-ui-engineering` skill before this task.

**Files:**
- Create: `src/components/Report.tsx`, `src/components/Report.module.css`, `src/components/Report.test.tsx`

**Interfaces:**
- Consumes: `accuracy`, `charsPerMinute`, `formatTime` from `src/lib/scoring.ts`; `BestRecord`, `RunResult` from `src/lib/types.ts`; `Button`.
- Produces:

```ts
interface ReportProps {
  result: RunResult
  isNewBest: boolean
  previousBest: BestRecord | undefined
  onRetry(): void
  onRetryScrambled(): void
  onBack(): void
}
function Report(props: ReportProps): JSX.Element
```

- [ ] **Step 1: Write the failing test**

`src/components/Report.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { RunResult } from '../lib/types'
import { Report } from './Report'

const result: RunResult = {
  setIndex: 0,
  order: [...'的一是'],
  elapsedMs: 90_000,
  wrongTally: 5,
  missed: ['的', '是'],
}

describe('Report', () => {
  it('shows speed, accuracy, time, and missed characters', () => {
    render(
      <Report result={result} isNewBest={false} previousBest={undefined} onRetry={() => {}} onRetryScrambled={() => {}} onBack={() => {}} />,
    )
    expect(screen.getByText('67')).toBeInTheDocument()
    expect(screen.getByText('characters per minute')).toBeInTheDocument()
    expect(screen.getByText('95%')).toBeInTheDocument()
    expect(screen.getByText('1:30.0')).toBeInTheDocument()
    expect(screen.getByText('的')).toBeInTheDocument()
    expect(screen.getByText('是')).toBeInTheDocument()
  })

  it('says new best when the run is a record', () => {
    render(
      <Report result={result} isNewBest previousBest={undefined} onRetry={() => {}} onRetryScrambled={() => {}} onBack={() => {}} />,
    )
    expect(screen.getByText('New best')).toBeInTheDocument()
  })

  it('shows the previous best otherwise', () => {
    render(
      <Report
        result={result}
        isNewBest={false}
        previousBest={{ bestMs: 80_000, accuracy: 1, recordedAt: '' }}
        onRetry={() => {}}
        onRetryScrambled={() => {}}
        onBack={() => {}}
      />,
    )
    expect(screen.getByText('Best 1:20.0')).toBeInTheDocument()
  })

  it('shows a no-mistakes message when nothing was missed', () => {
    render(
      <Report result={{ ...result, wrongTally: 0, missed: [] }} isNewBest={false} previousBest={undefined} onRetry={() => {}} onRetryScrambled={() => {}} onBack={() => {}} />,
    )
    expect(screen.getByText('No mistakes')).toBeInTheDocument()
  })

  it('wires the three buttons', async () => {
    const onRetry = vi.fn()
    const onRetryScrambled = vi.fn()
    const onBack = vi.fn()
    render(
      <Report result={result} isNewBest={false} previousBest={undefined} onRetry={onRetry} onRetryScrambled={onRetryScrambled} onBack={onBack} />,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }))
    await userEvent.click(screen.getByRole('button', { name: 'Retry scrambled' }))
    await userEvent.click(screen.getByRole('button', { name: 'Back to sets' }))
    expect(onRetry).toHaveBeenCalled()
    expect(onRetryScrambled).toHaveBeenCalled()
    expect(onBack).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run to verify it fails**

```bash
npm test -- src/components/Report
```

Expected: FAIL, cannot find module `./Report`.

- [ ] **Step 3: Implement**

`src/components/Report.module.css`:

```css
.screen {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2rem;
  padding: 3rem clamp(1rem, 4vw, 3rem);
}

.card {
  width: 100%;
  max-width: 36rem;
  padding: 2rem;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.heading {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text-muted);
}

.hero {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.speed {
  font-family: var(--font-mono);
  font-size: 4rem;
  font-weight: 600;
  line-height: 1;
  letter-spacing: -0.02em;
}

.speedLabel {
  margin-top: 0.4rem;
  color: var(--text-muted);
}

.stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
}

.stat {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.statValue {
  font-family: var(--font-mono);
  font-size: 1.25rem;
  font-weight: 600;
}

.statLabel {
  font-size: 0.8rem;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.newBest {
  color: var(--correct);
}

.missedLabel {
  font-size: 0.8rem;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-bottom: 0.5rem;
}

.missed {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.missedGlyph {
  font-family: var(--font-cjk);
  font-size: 1.5rem;
  line-height: 1;
  padding: 0.45rem 0.55rem;
  border-radius: var(--radius-sm);
  color: var(--wrong);
  background: var(--wrong-soft);
}

.none {
  color: var(--correct);
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}
```

`src/components/Report.tsx`:

```tsx
import { accuracy, charsPerMinute, formatTime } from '../lib/scoring'
import type { BestRecord, RunResult } from '../lib/types'
import { Button } from './Button'
import styles from './Report.module.css'

export interface ReportProps {
  result: RunResult
  isNewBest: boolean
  previousBest: BestRecord | undefined
  onRetry(): void
  onRetryScrambled(): void
  onBack(): void
}

export function Report({ result, isNewBest, previousBest, onRetry, onRetryScrambled, onBack }: ReportProps) {
  const cpm = charsPerMinute(result.elapsedMs)
  const acc = Math.round(accuracy(result.wrongTally) * 100)

  let bestText: string
  let bestClass = ''
  if (isNewBest) {
    bestText = 'New best'
    bestClass = styles.newBest
  } else if (previousBest) {
    bestText = `Best ${formatTime(previousBest.bestMs)}`
  } else {
    bestText = 'No record yet'
  }

  return (
    <main className={styles.screen}>
      <section className={styles.card}>
        <h1 className={styles.heading}>Set {result.setIndex + 1} complete</h1>

        <div className={styles.hero}>
          <span className={styles.speed}>{cpm}</span>
          <span className={styles.speedLabel}>characters per minute</span>
        </div>

        <div className={styles.stats}>
          <div className={styles.stat}>
            <span className={styles.statValue}>{acc}%</span>
            <span className={styles.statLabel}>Accuracy</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statValue}>{formatTime(result.elapsedMs)}</span>
            <span className={styles.statLabel}>Time</span>
          </div>
          <div className={styles.stat}>
            <span className={`${styles.statValue} ${bestClass}`}>{bestText}</span>
            <span className={styles.statLabel}>Record</span>
          </div>
        </div>

        <div>
          <p className={styles.missedLabel}>Missed</p>
          {result.missed.length === 0 ? (
            <p className={styles.none}>No mistakes</p>
          ) : (
            <div className={styles.missed}>
              {result.missed.map((ch) => (
                <span key={ch} className={styles.missedGlyph}>
                  {ch}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className={styles.actions}>
          <Button variant="primary" onClick={onRetry}>
            Retry
          </Button>
          <Button variant="secondary" onClick={onRetryScrambled}>
            Retry scrambled
          </Button>
          <Button variant="ghost" onClick={onBack}>
            Back to sets
          </Button>
        </div>
      </section>
    </main>
  )
}
```

- [ ] **Step 4: Run tests**

```bash
npm test -- src/components/Report
```

Expected: `5 passed`.

- [ ] **Step 5: Commit**

```bash
git add src/components/Report.tsx src/components/Report.module.css src/components/Report.test.tsx
git commit -m "feat: add Report screen"
```

---

### Task 11: App wiring, persistence, and end-to-end check

**Files:**
- Modify: `src/App.tsx` (replace), `src/App.test.tsx` (replace)
- Create: `README.md`

**Interfaces:**
- Consumes: `Home`, `Drill`, `Report`; `SETS`; `shuffle`, `accuracy` from `src/lib/scoring.ts`; `loadBests`, `saveBest`, `qualifiesAsBest` from `src/lib/storage.ts`; `Bests`, `BestRecord`, `Mode`, `RunResult` from `src/lib/types.ts`.

- [ ] **Step 1: Write the failing App test**

Replace `src/App.test.tsx` with:

```tsx
import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import App from './App'
import { SETS } from './data/sets'
import { STORAGE_KEY } from './lib/storage'

function typeCommitted(value: string) {
  const input = screen.getByRole('textbox') as HTMLInputElement
  input.value = value
  fireEvent.compositionEnd(input)
}

describe('App', () => {
  beforeEach(() => localStorage.clear())

  it('starts on the home screen', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: 'Cangjie Trainer' })).toBeInTheDocument()
  })

  it('runs a timed set through to the report and stores the best', async () => {
    render(<App />)
    const card = screen.getAllByRole('article')[0]
    await userEvent.click(within(card).getByRole('button', { name: 'Timed' }))
    expect(screen.getByText('Set 1')).toBeInTheDocument()

    typeCommitted(SETS[0][0])
    typeCommitted(SETS[0].join(''))

    expect(screen.getByText('characters per minute')).toBeInTheDocument()
    expect(screen.getByText('New best')).toBeInTheDocument()
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')).toHaveProperty('0')

    await userEvent.click(screen.getByRole('button', { name: 'Back to sets' }))
    expect(within(screen.getAllByRole('article')[0]).getByText('100%')).toBeInTheDocument()
  })

  it('retry returns to the drill with the same set', async () => {
    render(<App />)
    await userEvent.click(within(screen.getAllByRole('article')[1]).getByRole('button', { name: 'Timed' }))
    typeCommitted(SETS[1].join(''))
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(screen.getByText('Set 2')).toBeInTheDocument()
    expect((screen.getByRole('textbox') as HTMLInputElement).value).toBe('')
  })

  it('free mode never shows a report', async () => {
    render(<App />)
    await userEvent.click(within(screen.getAllByRole('article')[0]).getByRole('button', { name: 'Free' }))
    typeCommitted(SETS[0].join(''))
    expect(screen.queryByText('characters per minute')).not.toBeInTheDocument()
    expect(screen.getByText('Done')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run to verify it fails**

```bash
npm test -- src/App
```

Expected: FAIL on the second test (no set cards rendered by the placeholder App).

- [ ] **Step 3: Implement App**

Replace `src/App.tsx` with:

```tsx
import { useCallback, useState } from 'react'
import { Drill } from './components/Drill'
import { Home } from './components/Home'
import { Report } from './components/Report'
import { SETS } from './data/sets'
import { accuracy, shuffle } from './lib/scoring'
import { loadBests, qualifiesAsBest, saveBest } from './lib/storage'
import type { BestRecord, Bests, Mode, RunResult } from './lib/types'

type Screen =
  | { name: 'home' }
  | { name: 'drill'; setIndex: number; mode: Mode; order: string[]; runKey: number }
  | { name: 'report'; result: RunResult; isNewBest: boolean; previousBest: BestRecord | undefined }

export default function App() {
  const [bests, setBests] = useState<Bests>(() => loadBests())
  const [screen, setScreen] = useState<Screen>({ name: 'home' })
  const [runKey, setRunKey] = useState(0)

  const startDrill = useCallback(
    (setIndex: number, mode: Mode, order: string[] = SETS[setIndex]) => {
      setRunKey((k) => k + 1)
      setScreen({ name: 'drill', setIndex, mode, order, runKey: runKey + 1 })
    },
    [runKey],
  )

  const finishRun = useCallback(
    (result: RunResult) => {
      const previousBest = bests[result.setIndex]
      const acc = accuracy(result.wrongTally)
      const isNewBest = qualifiesAsBest(previousBest, { elapsedMs: result.elapsedMs, accuracy: acc })
      if (isNewBest) {
        const record: BestRecord = { bestMs: result.elapsedMs, accuracy: acc, recordedAt: new Date().toISOString() }
        saveBest(result.setIndex, record)
        setBests((prev) => ({ ...prev, [result.setIndex]: record }))
      }
      setScreen({ name: 'report', result, isNewBest, previousBest })
    },
    [bests],
  )

  const goHome = useCallback(() => setScreen({ name: 'home' }), [])

  switch (screen.name) {
    case 'home':
      return <Home bests={bests} onStart={startDrill} />
    case 'drill':
      return (
        <Drill
          key={screen.runKey}
          setIndex={screen.setIndex}
          mode={screen.mode}
          order={screen.order}
          onFinish={finishRun}
          onBack={goHome}
        />
      )
    case 'report':
      return (
        <Report
          result={screen.result}
          isNewBest={screen.isNewBest}
          previousBest={screen.previousBest}
          onRetry={() => startDrill(screen.result.setIndex, 'timed', screen.result.order)}
          onRetryScrambled={() => startDrill(screen.result.setIndex, 'timed', shuffle(screen.result.order))}
          onBack={goHome}
        />
      )
  }
}
```

The `key={screen.runKey}` on `Drill` forces a fresh `useDrill` state for every new run, so Retry never inherits the previous run.

- [ ] **Step 4: Run the whole suite and build**

```bash
npm test
npm run build
```

Expected: every test passes, build succeeds with no type errors.

- [ ] **Step 5: Write README**

`README.md`:

```markdown
# Cangjie Trainer

Practice the Cangjie input method by retyping the 1000 most common traditional Chinese characters, 100 at a time, with your real OS Cangjie keyboard.

- Ten frequency sets, each 100 characters
- Timed mode with a stopwatch and a characters-per-minute report
- Free mode with no clock
- Scramble the order so you learn the characters, not the sequence
- Personal bests saved in your browser

## Run

    npm install
    npm run dev

## Test

    npm test

## Notes

Switch your system keyboard to Cangjie before typing. The app only reads committed characters from the IME.
```

- [ ] **Step 6: Manual check with a real Cangjie IME**

```bash
npm run dev
```

Open the printed URL in a browser. With the macOS Cangjie input source active:

1. Start Set 1 timed. Confirm the clock starts only after the first character commits, not while the candidate window is open.
2. Type a wrong character, confirm it turns red and the cursor moves on. Backspace and retype it, confirm it turns green.
3. Type through to the end. Confirm the report appears with the numbers, the missed list, and "New best".
4. Click Retry scrambled. Confirm the order changed and the input is empty.
5. Click Back to sets. Confirm the card for Set 1 shows the best time.
6. Start Set 1 free. Confirm there is no clock, and "Done" appears at the end.
7. Toggle the system to dark mode and confirm the theme follows.

Record anything that misbehaves as a follow-up rather than patching silently.

- [ ] **Step 7: Commit**

```bash
git add src/App.tsx src/App.test.tsx README.md
git commit -m "feat: wire screens together with personal best persistence"
```

---

## Self-review notes

- **Spec coverage:** sets (Task 2), drill behavior and IME rules (Tasks 5, 7, 8), timing and scoring (Task 3), report (Task 10), personal bests and qualification rule (Task 4, Task 11), home (Task 9), error handling for storage (Task 4), hint text (Task 8), refocus on click (Task 8), theme (Task 6), manual IME check (Task 11). Out-of-scope items are not implemented.
- **Type consistency:** `onValue(value, isComposing)` in DrillInput feeds `onInput(value, isComposing)` in the hook. `RunResult` shape is identical in Drill, Report, and App. `qualifiesAsBest` takes `{ elapsedMs, accuracy }` everywhere.
