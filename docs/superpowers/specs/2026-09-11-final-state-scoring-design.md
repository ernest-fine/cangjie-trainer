# Final-State Scoring — Design Spec

Date: 2026-09-11
Status: Approved (user chose this rule over per-commit tallying)
Amends: `2026-09-10-cangjie-trainer-design.md`, sections "Drill behavior", "Timing and scoring", "Report screen"

## Purpose

The original rule counted every wrong character ever committed and never decremented, so a corrected mistake still cost a point and a slip that shifted the text by one position cost a point for every character typed until it was noticed. A learner who typed every character correctly after corrections could see 76%. The user chose to score the final grid instead: accuracy reflects what is on screen when the run ends, and corrected mistakes are forgiven.

## Rule

- When the run ends, `wrongPositions` = the indices whose typed character differs from the target, taken from `positionStates(order, typed)`.
- `RunResult.wrongCount` = `wrongPositions.length`. The former `wrongTally` field is removed.
- Accuracy = `(100 - wrongCount) / 100`, shown as a whole percent.
- The report's missed list = target characters at `wrongPositions`, in set order, deduplicated.
- No per-commit tally is kept. `newlyWrongPositions` is removed from `src/lib/scoring.ts`.
- The hook exposes `wrongPositions` as a derived value (from `states`) at all times, so the Drill can report it at the end.

## Consequences

- A learner who corrects every mistake before finishing scores 100%. Speed still suffers from the time spent correcting, so the characters-per-minute number and the personal best carry that cost.
- Personal-best qualification is unchanged: accuracy at least 90% and a faster time.

## Testing

- `scoring`: `wrongPositions(states)` returns the indices of `'wrong'` entries.
- `useDrill`: a wrong character then a fix leaves `wrongPositions` empty; an unfixed wrong character is reported.
- `Drill`: a run with a corrected mistake reports `wrongCount` 0 and an empty `missed`; a run ending with a wrong character reports it.
