# Cangjie Codes for Missed Characters — Design Spec

Date: 2026-09-11
Status: Approved for planning
Extends: `2026-09-10-cangjie-trainer-design.md` (Report screen)

## Purpose

When the report lists a missed character, the learner should see how to type it: the Cangjie radicals and the key letters. The codes are third-generation Cangjie (倉頡三代), which both the built-in macOS and Windows input methods use.

## Requirements

### Data

- Source: the Unicode Unihan database, field `kCangjie` in `Unihan_DictionaryLikeData.txt`, from `https://www.unicode.org/Public/UCD/latest/ucd/Unihan.zip`. Verified: every one of the 1000 set characters has a code, and eleven codes the user actually typed match.
- `scripts/build-cangjie.mjs` (plain Node, no dependencies beyond built-ins and the system `unzip`):
  1. Imports the current character list by reading `src/data/sets.ts` and extracting the ten string literals (no TypeScript execution needed).
  2. Downloads `Unihan.zip` into `data-sources/` if absent; extracts `Unihan_DictionaryLikeData.txt` there.
  3. Parses lines matching `U+XXXX\tkCangjie\tCODE`.
  4. Writes `src/data/cangjie.ts` exporting `CANGJIE: Readonly<Record<string, string>>` with an entry for each of the 1000 characters, keys in set order, values uppercase letters A to Z.
  5. Fails with a clear message, writing nothing, if any set character has no code or a code contains anything but A to Z.
- `package.json`: `build:cangjie` runs the script; `build:characters` becomes `node scripts/build-characters.mjs && node scripts/build-cangjie.mjs` so the two files cannot drift.
- License: the README's "Character data" section gains a Unicode notice: "Cangjie codes are from the Unicode Unihan database, © Unicode, Inc., used under the Unicode License v3 (https://www.unicode.org/license.txt)."

### Radicals

`src/lib/cangjie.ts`:

- `RADICALS: Readonly<Record<string, string>>` mapping the 24 Cangjie keys to radicals: A 日, B 月, C 金, D 木, E 水, F 火, G 土, H 竹, I 戈, J 十, K 大, L 中, M 一, N 弓, O 人, P 心, Q 手, R 口, S 尸, T 廿, U 山, V 女, W 田, X 難, Y 卜, Z 重.
- `radicalsFor(code: string): string` maps each letter to its radical and joins them: `radicalsFor('ROWR') === '口人田口'`. An unknown letter throws, since the build script guarantees the alphabet.

### Report

- Each missed character renders as a card in the existing missed list (`<ul>` with `<li>` per character), in set order, deduplicated as today:
  - the character, large, in `--font-cjk`
  - the radicals below it, in `--font-cjk`, muted colour
  - the key letters below that, in `--font-mono`, smaller
- The card has an accessible name of the form `嗰 口人田口 ROWR` (the three texts in reading order; no `aria-label` needed).
- The 錯字 heading and the 全部正確 empty state are unchanged.
- The list wraps; on narrow screens cards stay at least 5.5rem wide so the radicals do not wrap mid-code.

### Strings

No new user-facing strings.

## Error handling

- A character with no code cannot reach the report, because the build script refuses to write `cangjie.ts` unless every set character is present, and the data test enforces the same at test time.
- `radicalsFor` throwing on an unknown letter would surface as a test failure, never at runtime, for the same reason.

## Testing

- `src/data/cangjie.test.ts`: every character in every set has an entry; every code matches `/^[A-Z]{1,5}$/`; spot checks 嗰 → ROWR, 草 → TAJ, 係 → OHVF.
- `src/lib/cangjie.test.ts`: `RADICALS` has exactly 24 keys; `radicalsFor('ROWR')` is 口人田口; `radicalsFor('X')` is 難; an unknown letter throws.
- `src/components/Report.test.tsx`: with `missed: ['嗰']` the report shows 口人田口 and ROWR inside the missed list.

## Out of scope

- Showing codes during the drill or on hover in the grid.
- Cangjie 5 or Quick (速成) codes.
- Codes for characters outside the ten sets.
