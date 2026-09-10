# Cangjie Trainer — Design Spec

Date: 2026-09-10
Status: Approved for planning

## Purpose

A small React web app that helps a learner become fluent with the Cangjie input method. It shows lines of the most common traditional Chinese characters and asks the learner to retype them using their real operating-system Cangjie IME. The app judges the committed characters only. It never looks at Cangjie codes or raw keystrokes.

The learning loop: pick a frequency set, type it, see which characters were missed, scramble, repeat, beat your best time.

## Requirements

### Character sets

- Traditional Chinese characters, ordered by frequency of use.
- 10 sets of 100 characters. Set 1 is ranks 1 to 100, set 2 is ranks 101 to 200, and so on to rank 1000.
- Sets are static data shipped with the app as one string of 1000 characters, sliced into sets at module load.
- Data source: the Taiwan 1980s to 1990s written-text character frequency table (八、九十年代台灣字頻統計) from the CUHK Chinese Character Frequency Statistics for Hong Kong, Mainland China and Taiwan, https://humanum.arts.cuhk.edu.hk/Lexis/chifreq/. The test suite pins nine anchor characters that any frequency top 1000 must include, and ten rare ones it must not, so a regenerated list cannot drift silently.

### Modes

Both modes use the same drill screen.

- **Timed.** A stopwatch starts on the first committed character and stops when the 100th position is filled. A report follows.
- **Free.** Same drill with no clock and no report. When all 100 positions are filled the screen shows a small done mark and offers restart.

### Drill behavior

- The target characters are shown in a grid of 5 rows of 20.
- One text input sits below the grid. It is autofocused, and clicking anywhere on the drill area refocuses it.
- The app reads the full value of the input after each committed input event. Events fired while an IME composition is in progress are ignored.
- The typed value is capped at 100 characters. Extra characters are dropped.
- Each grid position has one state derived from the typed value:
  - `correct`: typed character equals the target.
  - `wrong`: typed character differs from the target.
  - `current`: the position equal to the typed length, when fewer than 100 typed.
  - `pending`: positions after the current one.
- Backspace works naturally. The user may back over a wrong character and retype it, and the grid then shows it as correct.
- A separate tally counts every wrong character ever committed during the run. Fixing a character does not reduce this tally. Accuracy is computed from this tally.
- **Scramble** replaces the character order with a shuffled copy of the set and restarts the run: typed value cleared, tally cleared, clock cleared.
- **Restart** clears the run and keeps the current order.
- A one-line hint above the input reads "Switch your keyboard to Cangjie" so a learner typing Latin letters understands why every character is wrong.
- Losing focus does not pause or stop the clock.

### Timing and scoring

- Start time is recorded on the first committed character in timed mode. End time is recorded when the typed length reaches 100.
- The visible clock ticks on an interval and is display-only. Elapsed time in the report is `end - start` in milliseconds.
- Characters per minute = `100 / (elapsedMs / 60000)`, rounded to a whole number.
- Accuracy = `(100 - wrongTally) / 100`, floored at 0, shown as a percentage with no decimals.
- The report is labelled "characters per minute", not WPM, because Chinese text has no word boundaries.

### Report screen (timed mode only)

Shows:

- Characters per minute (primary number)
- Accuracy percentage
- Total time, formatted `m:ss.t`
- Comparison with the stored personal best for this set, or "New best" when the run replaces it
- The list of target characters that were wrong at least once, in set order, deduplicated

Buttons: Retry (same order), Retry scrambled, Back to sets.

### Personal bests

- Stored in `localStorage` under one key, as a map from set index to `{ bestMs, accuracy, recordedAt }`.
- A run replaces the stored best only when its time is lower than the stored time and its accuracy is at least 90 percent. A set with no record accepts the first run that meets the 90 percent accuracy bar.
- The home screen shows each set's best time and accuracy, or a dash when no record exists.

### Home screen

- Grid of 10 set cards. Each card shows the set number, the rank range, the personal best, and two buttons: Timed and Free.

## Architecture

Single-page Vite + React + TypeScript app. No router. One top-level `screen` state selects between Home, Drill, and Report.

### Units

| Unit | Responsibility | Depends on |
|---|---|---|
| `src/data/sets.ts` | Exports `CHARACTERS` (string of 1000) and `SETS: string[][]` (10 arrays of 100). | nothing |
| `src/lib/scoring.ts` | Pure functions: `positionStates(target, typed)`, `countNewWrong(prevTyped, typed, target)`, `charsPerMinute(elapsedMs)`, `accuracy(wrongTally)`, `shuffle(array, rng?)`, `missedCharacters(target, wrongPositions)`. | nothing |
| `src/lib/storage.ts` | `loadBests(): Bests`, `saveBest(setIndex, record)`, `qualifiesAsBest(existing, candidate)`. Wraps every `localStorage` call in try/catch; validates shape on read; returns empty on any failure. | `localStorage` |
| `src/hooks/useDrill.ts` | State machine for one run. State: `order`, `typed`, `wrongTally`, `wrongPositions`, `startedAt`, `endedAt`. Actions: `onInput(value, isComposing)`, `scramble()`, `restart()`. Derived: `states`, `isDone`, `elapsedMs`. | `scoring` |
| `src/components/Home.tsx` | Set cards, mode selection. | `storage` |
| `src/components/Drill.tsx` | Owns `useDrill`, renders top bar, grid, input, hint. | `useDrill`, `CharacterGrid`, `DrillInput`, `Clock` |
| `src/components/CharacterGrid.tsx` | Renders 100 characters with state classes. Presentational. | nothing |
| `src/components/DrillInput.tsx` | The text input. Forwards `input` events with the `isComposing` flag from the native event; listens to `compositionend` and forwards the value again so the last committed character is never missed. | nothing |
| `src/components/Clock.tsx` | Display-only ticking timer given `startedAt`. | nothing |
| `src/components/Report.tsx` | Result numbers, missed list, buttons. Presentational. | nothing |
| `src/components/Button.tsx` | Shared button styles. | nothing |
| `src/App.tsx` | Screen switching and passing set index and mode between screens. Writes the personal best when a timed run ends. | all screens, `storage` |

### Data flow for one timed run

1. Home calls `onStart(setIndex, 'timed')`. App switches to Drill.
2. Drill initializes `useDrill(SETS[setIndex])`. `order` is the set in rank order.
3. Each committed input event calls `onInput(value, isComposing)`. If composing, return. Otherwise cap `value` at 100, compute newly wrong positions against the previous typed value, add to `wrongTally` and `wrongPositions`, store `typed`. If `startedAt` is null and `typed.length > 0`, set `startedAt = performance.now()`.
4. When `typed.length === 100`, set `endedAt`. Drill calls `onFinish(result)`. App stores the best if it qualifies and switches to Report.
5. Report renders numbers from `result`. Retry returns to Drill with the same order. Retry scrambled returns with `scramble` applied. Back returns to Home.

`useDrill` computes "newly wrong positions" by comparing only the suffix that changed between the previous and current typed values, so a backspace followed by a correct retype adds nothing, and a backspace followed by another wrong character adds one.

## Error handling

- `localStorage` unavailable or throwing: storage functions catch and return empty. The app runs without memory.
- Stored value not matching the expected shape: treated as no record, and overwritten on the next save.
- IME not active: characters show as wrong. The hint line explains.
- Input loses focus: clock continues. Clicking the drill area refocuses.
- No network calls exist, so there are no network errors.

## Testing

- **scoring.ts** (Vitest): position states for empty, partial, full, and wrong input; newly-wrong counting across backspace sequences; characters per minute and accuracy math; shuffle returns a permutation of the same length; missed-character deduplication.
- **storage.ts** (Vitest with a fake `localStorage`): load empty, round trip, corrupt JSON, wrong shape, throwing storage, `qualifiesAsBest` for faster-and-accurate, faster-but-sloppy, slower, and no-existing cases.
- **useDrill** (Vitest + React Testing Library `renderHook`): ignores composing events, starts clock on first commit, caps at 100, ends at 100, scramble resets state and changes order, restart resets state and keeps order.
- **Components** (light): Home renders 10 cards; Report shows the formatted numbers it is given.
- **Manual**: one pass with the macOS Cangjie IME to confirm composition handling and candidate window placement.

## Visual direction

A calm typing surface. Large CJK glyphs in the grid with generous line height, a single accent color for the current character, muted green for correct and muted red for wrong. Light and dark themes follow the system preference. Nothing distracting around the grid during a run. Detailed styling decisions are made during implementation with the frontend design skill.

## Out of scope

- Cangjie code hints or key-level feedback
- Simplified characters
- Accounts, sync, or any server
- Custom or user-defined sets
- A blank scratchpad mode
- Countdown timer mode
