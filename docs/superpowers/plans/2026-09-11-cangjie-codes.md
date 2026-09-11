# Cangjie Codes for Missed Characters Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show each missed character's third-generation Cangjie code on the report, as radicals with the key letters beneath.

**Architecture:** A build script extracts `kCangjie` codes for the 1000 set characters from the Unicode Unihan database into `src/data/cangjie.ts`. A pure module maps key letters to radicals. The Report renders each missed character as a card with the character, radicals, and letters.

**Tech Stack:** Node 26 (built-in `fetch`, system `unzip`), React 19, TypeScript strict, Vitest, CSS modules.

**Spec:** `docs/superpowers/specs/2026-09-11-cangjie-codes-design.md`

## Global Constraints

- Project root `/Users/gabes/Documents/cangjie-trainer`, branch `build/initial-app`. Commit after every task. Do not push.
- Source URL, exactly: `https://www.unicode.org/Public/UCD/latest/ucd/Unihan.zip`; file inside: `Unihan_DictionaryLikeData.txt`; lines `U+XXXX\tkCangjie\tCODE`.
- `src/data/cangjie.ts` exports `CANGJIE: Readonly<Record<string, string>>`, one entry per set character, keys in set order, values matching `/^[A-Z]{1,5}$/`. The script fails and writes nothing if any set character lacks a code.
- `RADICALS` maps exactly: A 日, B 月, C 金, D 木, E 水, F 火, G 土, H 竹, I 戈, J 十, K 大, L 中, M 一, N 弓, O 人, P 心, Q 手, R 口, S 尸, T 廿, U 山, V 女, W 田, X 難, Y 卜, Z 重. `radicalsFor('ROWR') === '口人田口'`; unknown letters throw.
- `npm run build:cangjie` runs the script; `npm run build:characters` runs both scripts in sequence.
- README gains the Unicode notice verbatim: `Cangjie codes are from the Unicode Unihan database, © Unicode, Inc., used under the Unicode License v3 (https://www.unicode.org/license.txt).`
- Report cards: character (large, `--font-cjk`), radicals (`--font-cjk`, muted), letters (`--font-mono`, smaller), in set order, deduplicated. No new user-facing strings.
- Components contain no user-facing literals; tests use `STRINGS` where copy is asserted.
- tsconfig has `strict`, `noUnusedLocals`, `verbatimModuleSyntax`: type-only imports use `import type`.
- Commit message format: subject, blank line, then `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>` and `Claude-Session: https://claude.ai/code/session_01WdRxGmqZsrgQdo7US6y7ux`.

---

## File Structure

| Path | Responsibility |
|---|---|
| `scripts/build-cangjie.mjs` | Download Unihan, extract codes for the set characters, write `src/data/cangjie.ts`. |
| `src/data/cangjie.ts` | Generated `CANGJIE` table. |
| `src/data/cangjie.test.ts` | Coverage and format of the table. |
| `src/lib/cangjie.ts`, `src/lib/cangjie.test.ts` | `RADICALS`, `radicalsFor`. |
| `src/components/Report.tsx`, `Report.module.css`, `Report.test.tsx` | Missed-character cards. |
| `package.json`, `README.md` | Scripts and license notice. |

---

### Task 1: Radical map

**Files:**
- Create: `src/lib/cangjie.ts`, `src/lib/cangjie.test.ts`

**Interfaces:**
- Produces: `RADICALS: Readonly<Record<string, string>>`, `radicalsFor(code: string): string`.

- [ ] **Step 1: Write the failing test**

`src/lib/cangjie.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { RADICALS, radicalsFor } from './cangjie'

describe('RADICALS', () => {
  it('covers all 26 Cangjie keys', () => {
    expect(Object.keys(RADICALS).sort().join('')).toBe('ABCDEFGHIJKLMNOPQRSTUVWXYZ')
    expect(RADICALS.A).toBe('日')
    expect(RADICALS.X).toBe('難')
    expect(RADICALS.Z).toBe('重')
  })
})

describe('radicalsFor', () => {
  it('maps a code to its radicals', () => {
    expect(radicalsFor('ROWR')).toBe('口人田口')
    expect(radicalsFor('TAJ')).toBe('廿日十')
    expect(radicalsFor('X')).toBe('難')
  })

  it('throws on a letter that is not a Cangjie key', () => {
    expect(() => radicalsFor('R1')).toThrow(/not a Cangjie key/)
  })
})
```

- [ ] **Step 2: Run to verify it fails**

```bash
npm test -- src/lib/cangjie
```

Expected: FAIL, cannot find module `./cangjie`.

- [ ] **Step 3: Implement**

`src/lib/cangjie.ts`:

```ts
/** Third-generation Cangjie key letters and their radicals. */
export const RADICALS: Readonly<Record<string, string>> = Object.freeze({
  A: '日', B: '月', C: '金', D: '木', E: '水', F: '火', G: '土',
  H: '竹', I: '戈', J: '十', K: '大', L: '中', M: '一', N: '弓',
  O: '人', P: '心', Q: '手', R: '口', S: '尸', T: '廿', U: '山',
  V: '女', W: '田', X: '難', Y: '卜', Z: '重',
})

/** Maps a letter code such as `ROWR` to its radicals, `口人田口`. */
export function radicalsFor(code: string): string {
  return [...code]
    .map((letter) => {
      const radical = RADICALS[letter]
      if (!radical) throw new Error(`"${letter}" is not a Cangjie key`)
      return radical
    })
    .join('')
}
```

- [ ] **Step 4: Run and commit**

```bash
npm test -- src/lib/cangjie
git add src/lib/cangjie.ts src/lib/cangjie.test.ts
git commit -m "feat: add the Cangjie radical map"
```

Expected: 3 passed.

---

### Task 2: Build script and generated code table

**Files:**
- Create: `scripts/build-cangjie.mjs`, `src/data/cangjie.test.ts`
- Generate: `src/data/cangjie.ts`
- Modify: `package.json` (scripts), `README.md`

**Interfaces:**
- Consumes: `src/data/sets.ts` (read as text by the script; imported by the test).
- Produces: `CANGJIE: Readonly<Record<string, string>>` from `src/data/cangjie.ts`; `npm run build:cangjie`.

- [ ] **Step 1: Write the failing data test**

`src/data/cangjie.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { CANGJIE } from './cangjie'
import { SETS } from './sets'

describe('CANGJIE', () => {
  it('has a code for every character in every set', () => {
    for (const set of SETS) {
      for (const ch of set) {
        expect(CANGJIE[ch], ch).toBeDefined()
      }
    }
  })

  it('has only well-formed codes', () => {
    for (const [ch, code] of Object.entries(CANGJIE)) {
      expect(code, ch).toMatch(/^[A-Z]{1,5}$/)
    }
  })

  it('matches codes typed on the built-in macOS input method', () => {
    expect(CANGJIE['嗰']).toBe('ROWR')
    expect(CANGJIE['草']).toBe('TAJ')
    expect(CANGJIE['係']).toBe('OHVF')
  })

  it('has no entries beyond the sets', () => {
    expect(Object.keys(CANGJIE)).toHaveLength(SETS.flat().length)
  })
})
```

- [ ] **Step 2: Run to verify it fails**

```bash
npm test -- src/data/cangjie
```

Expected: FAIL, cannot find module `./cangjie`.

- [ ] **Step 3: Add the npm scripts**

In `package.json` `"scripts"`, change the character script and add the new one:

```json
"build:characters": "node scripts/build-characters.mjs && node scripts/build-cangjie.mjs",
"build:cangjie": "node scripts/build-cangjie.mjs",
```

- [ ] **Step 4: Write the script**

`scripts/build-cangjie.mjs`:

```js
#!/usr/bin/env node
/**
 * Regenerates src/data/cangjie.ts: the third-generation Cangjie code for
 * every character in src/data/sets.ts, taken from the Unicode Unihan
 * database (field kCangjie).
 *
 * Usage: npm run build:cangjie   (also run by npm run build:characters)
 * The Unihan zip is cached in data-sources/ (git-ignored).
 */
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const DATA_DIR = join(ROOT, 'data-sources')
const SETS_FILE = join(ROOT, 'src', 'data', 'sets.ts')
const OUTPUT = join(ROOT, 'src', 'data', 'cangjie.ts')

const UNIHAN_URL = 'https://www.unicode.org/Public/UCD/latest/ucd/Unihan.zip'
const UNIHAN_FILE = 'Unihan_DictionaryLikeData.txt'

function fail(message) {
  console.error(`build-cangjie: ${message}`)
  process.exit(1)
}

async function download(url, dest) {
  if (existsSync(dest)) return
  console.log(`downloading ${url}`)
  const res = await fetch(url)
  if (!res.ok) fail(`download failed: ${res.status} ${res.statusText} for ${url}`)
  writeFileSync(dest, Buffer.from(await res.arrayBuffer()))
}

/** The set characters, in order, read from the ten string literals in sets.ts. */
function readSetCharacters() {
  const source = readFileSync(SETS_FILE, 'utf8')
  const literals = [...source.matchAll(/'([^']+)'/g)].map((m) => m[1])
  const chars = [...literals.join('')]
  if (chars.length !== 1000) fail(`expected 1000 characters in sets.ts, found ${chars.length}`)
  return chars
}

/** Character -> kCangjie code for every entry in the Unihan file. */
function parseUnihan(text) {
  const codes = new Map()
  for (const line of text.split('\n')) {
    const m = line.match(/^U\+([0-9A-F]+)\tkCangjie\t([A-Z]+)\s*$/)
    if (m) codes.set(String.fromCodePoint(parseInt(m[1], 16)), m[2])
  }
  return codes
}

function render(entries) {
  const lines = entries.map(([ch, code]) => `  '${ch}': '${code}',`)
  return `/**
 * Third-generation Cangjie codes for every character in sets.ts.
 * Generated by scripts/build-cangjie.mjs; do not edit by hand.
 *
 * Source: Unicode Unihan database, field kCangjie, © Unicode, Inc.,
 * used under the Unicode License v3, https://www.unicode.org/license.txt
 */
export const CANGJIE: Readonly<Record<string, string>> = Object.freeze({
${lines.join('\n')}
})
`
}

async function main() {
  mkdirSync(DATA_DIR, { recursive: true })
  const zip = join(DATA_DIR, 'Unihan.zip')
  const txt = join(DATA_DIR, UNIHAN_FILE)
  await download(UNIHAN_URL, zip)
  if (!existsSync(txt)) execFileSync('unzip', ['-o', '-q', zip, UNIHAN_FILE, '-d', DATA_DIR], { stdio: 'inherit' })

  const codes = parseUnihan(readFileSync(txt, 'utf8'))
  if (codes.size < 20000) fail(`expected at least 20000 kCangjie entries, parsed ${codes.size}`)

  const chars = readSetCharacters()
  const missing = chars.filter((ch) => !codes.has(ch))
  if (missing.length) fail(`no Cangjie code for: ${missing.join('')}`)
  const bad = chars.filter((ch) => !/^[A-Z]{1,5}$/.test(codes.get(ch)))
  if (bad.length) fail(`malformed code for: ${bad.map((ch) => `${ch}=${codes.get(ch)}`).join(' ')}`)

  const entries = chars.map((ch) => [ch, codes.get(ch)])
  writeFileSync(OUTPUT, render(entries))
  console.log(`wrote ${OUTPUT} with ${entries.length} codes`)
  for (const ch of '嗰草係') console.log(`${ch}: ${codes.get(ch)}`)
}

main()
```

- [ ] **Step 5: Run the script and the tests**

```bash
npm run build:cangjie
npm test -- src/data/cangjie
```

Expected: `wrote .../src/data/cangjie.ts with 1000 codes`, then `嗰: ROWR`, `草: TAJ`, `係: OHVF`; 4 tests pass. Check `git status` shows `data-sources/` absent (ignored) and `src/data/cangjie.ts` new.

- [ ] **Step 6: README notice**

In `README.md`, after the HKCanCor paragraph in "Character data", add:

```markdown
Cangjie codes shown for missed characters are third-generation (倉頡三代) codes. Regenerate them with `npm run build:cangjie` (also run by `npm run build:characters`). Cangjie codes are from the Unicode Unihan database, © Unicode, Inc., used under the Unicode License v3 (https://www.unicode.org/license.txt).
```

- [ ] **Step 7: Full suite, build, commit**

```bash
npm test
npm run build
git add scripts/build-cangjie.mjs src/data/cangjie.ts src/data/cangjie.test.ts package.json README.md
git commit -m "feat: generate Cangjie codes for the set characters from Unihan"
```

---

### Task 3: Missed-character cards on the report

**Files:**
- Modify: `src/components/Report.tsx`, `src/components/Report.module.css`, `src/components/Report.test.tsx`

**Interfaces:**
- Consumes: `CANGJIE` from `src/data/cangjie.ts`, `radicalsFor` from `src/lib/cangjie.ts`.

- [ ] **Step 1: Write the failing test**

Add to `src/components/Report.test.tsx` inside `describe('Report', ...)`:

```tsx
  it('shows the Cangjie radicals and letters for each missed character', () => {
    render(
      <Report result={{ ...result, missed: ['嗰', '草'] }} isNewBest={false} previousBest={undefined} onRetry={noop} onRetryScrambled={noop} onBack={noop} />,
    )
    const list = screen.getByRole('list', { name: STRINGS.missed })
    const items = within(list).getAllByRole('listitem')
    expect(items).toHaveLength(2)
    expect(items[0]).toHaveTextContent('嗰')
    expect(items[0]).toHaveTextContent('口人田口')
    expect(items[0]).toHaveTextContent('ROWR')
    expect(items[1]).toHaveTextContent('廿日十')
    expect(items[1]).toHaveTextContent('TAJ')
  })
```

Add `within` to the Testing Library import at the top of the file: `import { render, screen, within } from '@testing-library/react'`. The list already has `aria-labelledby="missed-label"`, so `getByRole('list', { name: STRINGS.missed })` resolves.

- [ ] **Step 2: Run to verify it fails**

```bash
npm test -- src/components/Report
```

Expected: 1 failed (radicals not found), others pass.

- [ ] **Step 3: Implement**

In `src/components/Report.tsx`, add the imports after the scoring import:

```tsx
import { CANGJIE } from '../data/cangjie'
import { radicalsFor } from '../lib/cangjie'
```

Replace the missed list rendering:

```tsx
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
```

The `code &&` guard keeps the report working for a character outside the sets (for example a scrambled order built from a future custom set); today every missed character has a code, which the data test guarantees.

In `src/components/Report.module.css`, replace the `.missedGlyph` rule with:

```css
.missedCard {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.2rem;
  min-width: 5.5rem;
  padding: 0.6rem 0.5rem 0.5rem;
  border-radius: var(--radius-sm);
  background: var(--wrong-soft);
}

.missedGlyph {
  font-family: var(--font-cjk);
  font-size: 1.75rem;
  line-height: 1;
  color: var(--wrong);
}

.missedRadicals {
  font-family: var(--font-cjk);
  font-size: 0.95rem;
  line-height: 1.2;
  color: var(--text-muted);
  white-space: nowrap;
}

.missedCode {
  font-family: var(--font-mono);
  font-size: 0.75rem;
  letter-spacing: 0.08em;
  color: var(--text-muted);
}
```

Change the `.missed` gap from `0.4rem` to `0.5rem`.

- [ ] **Step 4: Run everything and commit**

```bash
npm test
npm run build
npx oxlint src
git add src/components/Report.tsx src/components/Report.module.css src/components/Report.test.tsx
git commit -m "feat: show Cangjie radicals and letters for missed characters"
```

Expected: all pass, build and lint clean.

---

## Self-review notes

- **Spec coverage:** data source, script, failure modes, npm scripts, README notice (Task 2); radical map and `radicalsFor` (Task 1); report cards and CSS (Task 3); tests for all three.
- **Spec correction applied:** the spec originally said "24 keys"; the table has all 26 letters. The spec was corrected when this plan was committed.
- **Type consistency:** `CANGJIE` and `radicalsFor` names match across Tasks 1 to 3.
