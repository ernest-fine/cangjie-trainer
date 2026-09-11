# Cantonese Character Blend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Re-rank the trainer's 1000 characters by an equal-weight blend of Hong Kong written Chinese and spoken Cantonese, produced by a committed, reproducible script.

**Architecture:** A dependency-free Node script downloads two corpora into a git-ignored folder, computes per-million character rates, blends them 50/50 with a small normalization table, and rewrites `src/data/sets.ts` in its existing shape. The app does not change structurally; the data tests are the acceptance test for the script.

**Tech Stack:** Node 26 (ESM, built-in `fetch`, `TextDecoder('big5')`, `child_process` calling the system `unzip`), Vitest.

**Spec:** `docs/superpowers/specs/2026-09-10-cantonese-blend-design.md`

## Global Constraints

- Project root: `/Users/gabes/Documents/cangjie-trainer`, branch `build/initial-app`. Commit after every task. Do not push.
- `src/data/sets.ts` keeps its exact exports and shape: `SET_SIZE = 100`, `SET_COUNT = 10`, `CHARACTERS` as ten concatenated 100-character string literals, `SETS` sliced from it.
- Written source URL, exactly: `https://humanum.arts.cuhk.edu.hk/Lexis/chifreq/chifreq.php?year=90&place=hk&sort=no&method=1` (Big5 HTML; character is the first table cell, raw count 頻次 is the fifth).
- Spoken source URL, exactly: `https://raw.githubusercontent.com/fcbond/hkcancor/master/data/hkcancor-utf8.zip`. Token lines are `word/pos/jyutping/`; skip tokens with part of speech `w`.
- Rates: `count / corpusTotal * 1_000_000`. Blend: `0.5 * writtenRate + 0.5 * spokenRate`. Absent from a corpus contributes 0.
- Normalization applied to the spoken corpus before counting: 噉 → 咁, 囖 → 囉, 𡃉 → 㗎.
- Drop any character with code point above U+FFFF. Han only (`\p{Script=Han}`).
- Sort: blended score descending, then written rate descending, then code point ascending. Take 1000.
- Script fails (non-zero exit, nothing written) if a download fails, the written table has fewer than 3000 distinct characters, or the zip yields fewer than 50 transcript files.
- Anchor tests: first character `係`; written anchors `般標素適專參注溫餘` present; Cantonese anchors `嘅唔係佢咗啲嗰喺咁哋冇嘢睇` present; rare `硯壺蟻嶼蝶蜂莓醋襪嗽` absent; all characters in the BMP.
- Home subtitle, exactly: `倉頡練習 · Retype the most common characters of Hong Kong written Chinese and Cantonese.` (the `倉頡練習` span keeps `lang="zh-Hant"`).
- README credits HKCanCor: `Luke, K. K. and Wong, M. L. Y. (2015). The Hong Kong Cantonese Corpus: Design and Uses. Journal of Chinese Linguistics.` with the CC BY 4.0 link `https://creativecommons.org/licenses/by/4.0/`.
- Commit message format: subject, blank line, then `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>` and `Claude-Session: https://claude.ai/code/session_01WdRxGmqZsrgQdo7US6y7ux`.

---

## File Structure

| Path | Responsibility |
|---|---|
| `scripts/build-characters.mjs` | Download, parse, normalize, blend, rank, and write `src/data/sets.ts`. |
| `data-sources/` (git-ignored) | Cached downloads: `hk90.html`, `hkcancor-utf8.zip`, extracted `hkcancor/`. |
| `src/data/sets.ts` | Generated output. Same exports as today. |
| `src/data/sets.test.ts` | Data acceptance tests, updated anchors. |
| `src/components/Home.tsx` | Subtitle copy. |
| `README.md` | Character data section with sources, weight, regenerate command, citation. |
| `package.json` | `build:characters` script. |
| `.gitignore` | `data-sources/`. |

---

### Task 1: Update the data tests to the blended ranking

**Files:**
- Modify: `src/data/sets.test.ts`

**Interfaces:**
- Consumes: `CHARACTERS`, `SETS`, `SET_COUNT`, `SET_SIZE` from `src/data/sets.ts` (unchanged names).
- Produces: the failing acceptance tests that Task 2 must turn green.

- [ ] **Step 1: Replace the anchor tests**

Replace the whole file `src/data/sets.test.ts` with:

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

  it('contains only Basic Multilingual Plane characters', () => {
    for (const ch of CHARACTERS) {
      expect(ch.codePointAt(0)!).toBeLessThanOrEqual(0xffff)
    }
  })

  it('splits into 10 sets of 100 in order', () => {
    expect(SETS).toHaveLength(SET_COUNT)
    for (const set of SETS) expect(set).toHaveLength(SET_SIZE)
    expect(SETS[1][0]).toBe([...CHARACTERS][100])
    expect(SETS.flat().join('')).toBe(CHARACTERS)
  })

  it('ranks the Cantonese copula first', () => {
    expect(SETS[0][0]).toBe('係')
  })

  it('contains common written characters that a frequency list must include', () => {
    for (const ch of '般標素適專參注溫餘') {
      expect(CHARACTERS).toContain(ch)
    }
  })

  it('contains the core written-Cantonese characters', () => {
    for (const ch of '嘅唔係佢咗啲嗰喺咁哋冇嘢睇') {
      expect(CHARACTERS).toContain(ch)
    }
  })

  it('does not contain rare characters', () => {
    for (const ch of '硯壺蟻嶼蝶蜂莓醋襪嗽') {
      expect(CHARACTERS).not.toContain(ch)
    }
  })
})
```

- [ ] **Step 2: Run to verify the new tests fail against the current data**

```bash
npm test -- src/data
```

Expected: 2 failed (`ranks the Cantonese copula first` because the first character is currently `的`, and `contains the core written-Cantonese characters` because 嘅 is absent), 7 passed.

- [ ] **Step 3: Commit the red tests**

```bash
git add src/data/sets.test.ts
git commit -m "test: pin blended Hong Kong and Cantonese character anchors"
```

---

### Task 2: The character build script and regenerated data

**Files:**
- Create: `scripts/build-characters.mjs`
- Modify: `package.json` (scripts), `.gitignore`
- Regenerate: `src/data/sets.ts`

**Interfaces:**
- Consumes: nothing from the app.
- Produces: `src/data/sets.ts` with unchanged exports. `npm run build:characters` regenerates it.

- [ ] **Step 1: Add the git-ignore entry and npm script**

Append to `.gitignore`:

```
# Downloaded corpora for scripts/build-characters.mjs
data-sources/
```

In `package.json` `"scripts"`, add:

```json
"build:characters": "node scripts/build-characters.mjs"
```

- [ ] **Step 2: Write the script**

`scripts/build-characters.mjs`:

```js
#!/usr/bin/env node
/**
 * Regenerates src/data/sets.ts from two corpora, blended at equal weight:
 *
 *   Written: 八、九十年代香港字頻統計 — CUHK Chinese Character Frequency
 *            Statistics for Hong Kong, Mainland China and Taiwan.
 *            https://humanum.arts.cuhk.edu.hk/Lexis/chifreq/
 *   Spoken:  Hong Kong Cantonese Corpus (HKCanCor), Luke & Wong (2015),
 *            CC BY 4.0. https://github.com/fcbond/hkcancor
 *
 * Usage: npm run build:characters
 * Downloads are cached in data-sources/ (git-ignored); re-runs are offline.
 */
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const DATA_DIR = join(ROOT, 'data-sources')
const OUTPUT = join(ROOT, 'src', 'data', 'sets.ts')

const WRITTEN_URL =
  'https://humanum.arts.cuhk.edu.hk/Lexis/chifreq/chifreq.php?year=90&place=hk&sort=no&method=1'
const SPOKEN_URL = 'https://raw.githubusercontent.com/fcbond/hkcancor/master/data/hkcancor-utf8.zip'

const WRITTEN_WEIGHT = 0.5
const SPOKEN_WEIGHT = 0.5
const SET_SIZE = 100
const SET_COUNT = 10
const TOTAL = SET_SIZE * SET_COUNT

/** Transcription variants in HKCanCor mapped to the forms people type. */
const NORMALIZE = new Map([
  ['噉', '咁'],
  ['囖', '囉'],
  ['𡃉', '㗎'],
])

const MIN_WRITTEN_CHARS = 3000
const MIN_TRANSCRIPTS = 50

const HAN = /^\p{Script=Han}$/u

function fail(message) {
  console.error(`build-characters: ${message}`)
  process.exit(1)
}

async function download(url, dest) {
  if (existsSync(dest)) return
  console.log(`downloading ${url}`)
  const res = await fetch(url)
  if (!res.ok) fail(`download failed: ${res.status} ${res.statusText} for ${url}`)
  writeFileSync(dest, Buffer.from(await res.arrayBuffer()))
}

/** Character -> raw count from the CUHK Big5 HTML table. */
function parseWritten(html) {
  const counts = new Map()
  for (const row of html.split(/<tr[^>]*>/i).slice(1)) {
    const cells = [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((m) =>
      m[1].replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim(),
    )
    if (cells.length < 5) continue
    const ch = cells[0]
    const count = Number(cells[4])
    if ([...ch].length === 1 && HAN.test(ch) && Number.isFinite(count)) {
      counts.set(ch, (counts.get(ch) ?? 0) + count)
    }
  }
  return counts
}

/** Character -> raw count from HKCanCor transcript files, after normalization. */
function parseSpoken(dir) {
  const files = readdirSync(dir).filter((f) => !f.includes('.'))
  if (files.length < MIN_TRANSCRIPTS) fail(`expected at least ${MIN_TRANSCRIPTS} transcripts, found ${files.length}`)
  const counts = new Map()
  const token = /^\s*(\S+?)\/([A-Za-z0-9]+)\/[^\/\n]*\/\s*$/gm
  for (const file of files) {
    const text = readFileSync(join(dir, file), 'utf8')
    for (const m of text.matchAll(token)) {
      const [, word, pos] = m
      if (pos === 'w') continue
      for (const raw of word) {
        const ch = NORMALIZE.get(raw) ?? raw
        if (HAN.test(ch)) counts.set(ch, (counts.get(ch) ?? 0) + 1)
      }
    }
  }
  return counts
}

/** Counts -> per-million rates. */
function rates(counts) {
  const total = [...counts.values()].reduce((a, b) => a + b, 0)
  const out = new Map()
  for (const [ch, n] of counts) out.set(ch, (n / total) * 1_000_000)
  return out
}

function blend(written, spoken) {
  const chars = new Set([...written.keys(), ...spoken.keys()])
  const scored = []
  for (const ch of chars) {
    if (ch.codePointAt(0) > 0xffff) continue
    const w = written.get(ch) ?? 0
    const s = spoken.get(ch) ?? 0
    scored.push({ ch, score: WRITTEN_WEIGHT * w + SPOKEN_WEIGHT * s, written: w })
  }
  scored.sort(
    (a, b) => b.score - a.score || b.written - a.written || a.ch.codePointAt(0) - b.ch.codePointAt(0),
  )
  return scored.slice(0, TOTAL).map((x) => x.ch)
}

function render(chars) {
  const lines = []
  for (let i = 0; i < SET_COUNT; i++) {
    const chunk = chars.slice(i * SET_SIZE, (i + 1) * SET_SIZE).join('')
    lines.push(`  '${chunk}'${i < SET_COUNT - 1 ? ' +' : ''}`)
  }
  return `export const SET_SIZE = ${SET_SIZE}
export const SET_COUNT = ${SET_COUNT}

/**
 * ${TOTAL} most frequent characters of Hong Kong written Chinese and spoken
 * Cantonese, most frequent first. Generated by scripts/build-characters.mjs;
 * do not edit by hand.
 *
 * Sources, blended at equal weight (${WRITTEN_WEIGHT} written, ${SPOKEN_WEIGHT} spoken)
 * after converting each to per-million character rates:
 *   Written: 八、九十年代香港字頻統計, CUHK Chinese Character Frequency Statistics
 *            for Hong Kong, Mainland China and Taiwan,
 *            https://humanum.arts.cuhk.edu.hk/Lexis/chifreq/
 *   Spoken:  Hong Kong Cantonese Corpus (HKCanCor), Luke & Wong (2015), CC BY 4.0,
 *            https://github.com/fcbond/hkcancor
 * Spoken transcription variants normalized before counting: 噉→咁, 囖→囉, 𡃉→㗎.
 * Characters outside the Basic Multilingual Plane are excluded.
 */
export const CHARACTERS =
${lines.join('\n')}

const all = [...CHARACTERS]

export const SETS: string[][] = Array.from({ length: SET_COUNT }, (_, i) =>
  all.slice(i * SET_SIZE, (i + 1) * SET_SIZE),
)
`
}

async function main() {
  mkdirSync(DATA_DIR, { recursive: true })
  const writtenFile = join(DATA_DIR, 'hk90.html')
  const zipFile = join(DATA_DIR, 'hkcancor-utf8.zip')
  const spokenDir = join(DATA_DIR, 'hkcancor', 'utf8')

  await download(WRITTEN_URL, writtenFile)
  await download(SPOKEN_URL, zipFile)
  if (!existsSync(spokenDir)) {
    execFileSync('unzip', ['-o', '-q', zipFile, '-d', join(DATA_DIR, 'hkcancor')], { stdio: 'inherit' })
  }

  const writtenHtml = new TextDecoder('big5').decode(readFileSync(writtenFile))
  const writtenCounts = parseWritten(writtenHtml)
  if (writtenCounts.size < MIN_WRITTEN_CHARS) {
    fail(`expected at least ${MIN_WRITTEN_CHARS} written characters, parsed ${writtenCounts.size}`)
  }
  const spokenCounts = parseSpoken(spokenDir)

  const chars = blend(rates(writtenCounts), rates(spokenCounts))
  if (chars.length !== TOTAL) fail(`expected ${TOTAL} characters, got ${chars.length}`)
  if (new Set(chars).size !== TOTAL) fail('duplicate characters in output')

  writeFileSync(OUTPUT, render(chars))

  console.log(`written corpus: ${writtenCounts.size} characters`)
  console.log(`spoken corpus:  ${spokenCounts.size} characters`)
  console.log(`first 20: ${chars.slice(0, 20).join('')}`)
  for (const ch of '嘅唔係咗') console.log(`rank of ${ch}: ${chars.indexOf(ch) + 1}`)
  console.log(`wrote ${OUTPUT}`)
}

main()
```

- [ ] **Step 3: Run the script**

```bash
npm run build:characters
```

Expected output, roughly:

```
downloading https://humanum.arts.cuhk.edu.hk/...
downloading https://raw.githubusercontent.com/fcbond/hkcancor/...
written corpus: 4621 characters
spoken corpus:  2400-2450 characters
first 20: 係的一我...
rank of 嘅: ~20-30
rank of 唔: ~5-10
rank of 係: 1
rank of 咗: ~60-80
wrote .../src/data/sets.ts
```

If `係` is not first or any rank is 0, stop and report; do not hand-edit the data.

- [ ] **Step 4: Confirm the generated file keeps its shape**

```bash
git diff --stat src/data/sets.ts
node -e "const s=require('fs').readFileSync('src/data/sets.ts','utf8');const m=[...s.matchAll(/'([^']+)'/g)].map(x=>x[1]);console.log('lines',m.length,'lens',m.map(l=>[...l].length).join(','),'unique',new Set(m.join('')).size)"
```

Expected: `lines 10 lens 100,100,100,100,100,100,100,100,100,100 unique 1000`. The diff touches only the doc comment and the ten literals.

- [ ] **Step 5: Run the full suite and build**

```bash
npm test
npm run build
```

Expected: all pass, including the two tests that failed in Task 1. `git status` must show `data-sources/` absent (ignored).

- [ ] **Step 6: Commit**

```bash
git add scripts/build-characters.mjs package.json .gitignore src/data/sets.ts
git commit -m "feat: blend Hong Kong written Chinese with spoken Cantonese in the character sets"
```

---

### Task 3: Copy, README, and attribution

**Files:**
- Modify: `src/components/Home.tsx` (subtitle), `src/components/Home.test.tsx`, `README.md`

**Interfaces:**
- Consumes: nothing new.
- Produces: user-facing copy and the license credit.

- [ ] **Step 1: Write the failing subtitle test**

Add to `src/components/Home.test.tsx` inside `describe('Home', ...)`:

```tsx
  it('describes the blended character sets', () => {
    render(<Home bests={{}} onStart={() => {}} />)
    expect(
      screen.getByText(/Retype the most common characters of Hong Kong written Chinese and Cantonese\./),
    ).toBeInTheDocument()
  })
```

- [ ] **Step 2: Run to verify it fails**

```bash
npm test -- src/components/Home
```

Expected: 1 failed (text not found), others pass.

- [ ] **Step 3: Update the subtitle**

In `src/components/Home.tsx`, change the subtitle paragraph to:

```tsx
        <p className={styles.subtitle}>
          <span lang="zh-Hant">倉頡練習</span> · Retype the most common characters of Hong Kong written Chinese and
          Cantonese.
        </p>
```

- [ ] **Step 4: Run to verify it passes**

```bash
npm test -- src/components/Home
```

Expected: all pass.

- [ ] **Step 5: Update the README**

Replace `README.md` with:

```markdown
# Cangjie Trainer

Practice the Cangjie input method by retyping the 1000 most common characters of Hong Kong written Chinese and Cantonese, 100 at a time, with your real OS Cangjie keyboard.

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

## Character data

The sets blend two corpora at equal weight, each converted to per-million character rates:

- Written Chinese: 八、九十年代香港字頻統計 from the CUHK Chinese Character Frequency Statistics for Hong Kong, Mainland China and Taiwan, https://humanum.arts.cuhk.edu.hk/Lexis/chifreq/
- Spoken Cantonese: the Hong Kong Cantonese Corpus (HKCanCor), https://github.com/fcbond/hkcancor

Regenerate the list with:

    npm run build:characters

The script downloads both sources into `data-sources/` (git-ignored) and rewrites `src/data/sets.ts`.

HKCanCor is released under CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/). Citation: Luke, K. K. and Wong, M. L. Y. (2015). The Hong Kong Cantonese Corpus: Design and Uses. Journal of Chinese Linguistics.

## Notes

Switch your system keyboard to Cangjie before typing. The app only reads committed characters from the IME.
```

- [ ] **Step 6: Run the full suite and build, then commit**

```bash
npm test
npm run build
git add src/components/Home.tsx src/components/Home.test.tsx README.md
git commit -m "docs: describe the blended character sets and credit HKCanCor"
```

---

## Self-review notes

- **Spec coverage:** sources and URLs (Task 2 constants), token parsing and `w` skip (Task 2 `parseSpoken`), rates and 50/50 blend (Task 2 `rates`, `blend`), normalization table (Task 2 `NORMALIZE`), BMP drop (Task 2 `blend`), sort with tie-breaks (Task 2 `blend`), output shape and doc comment (Task 2 `render`), caching in git-ignored `data-sources/` (Task 2 Step 1 and `download`), summary print (Task 2 `main`), npm script (Task 2 Step 1), failure conditions (Task 2 `fail` calls for download, written size, transcript count), tests (Task 1), Home copy and README with citation (Task 3), original spec pointer (already committed with the spec).
- **Type consistency:** exports of `sets.ts` unchanged; test imports unchanged.
- **System dependency:** the script shells out to `unzip`, present on macOS and most Linux systems. Node has no built-in zip reader; this is the smallest honest dependency.
