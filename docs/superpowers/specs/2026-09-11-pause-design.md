# Pause for Timed Practice — Design Spec

Date: 2026-09-11
Status: Approved for planning
Extends: `2026-09-10-cangjie-trainer-design.md`; labels feed `2026-09-11-chinese-ui-design.md`

## Purpose

A timed run can be interrupted. The learner needs a way to stop the clock without losing the run, and the app needs to keep paused time out of the score without letting a pause become a free look at the upcoming characters.

## Requirements

### Timing model (`src/hooks/useDrill.ts`)

- New state: `pausedAt: number | null` and `pausedMs: number` (accumulated paused time, milliseconds).
- New actions: `pause()` and `resume()`.
  - `pause()` records `pausedAt = now()`. It is a no-op unless the clock has started (`startedAt !== null`), the run is not done, and the run is not already paused.
  - `resume()` adds `now() - pausedAt` to `pausedMs` and clears `pausedAt`. It is a no-op unless paused.
- `elapsedMs(): number` = `(endedAt ?? now()) - startedAt - pausedMs - (pausedAt !== null ? now() - pausedAt : 0)`, or 0 before the clock starts. It never goes negative.
- `isPaused: boolean` = `pausedAt !== null`.
- `onInput` is ignored while paused (the input is disabled, but the hook guards too).
- Finishing a run while paused cannot happen, since input is ignored while paused.
- `restart()` and `scramble()` clear `pausedAt` and `pausedMs` along with the rest of the run.
- `RunResult.elapsedMs` is `elapsedMs()` at the end, so paused time is excluded from the report and the personal best.

### Clock (`src/components/Clock.tsx`)

- Props change to `{ elapsedMs: () => number; running: boolean }`. The clock ticks on an interval only while `running`, and shows `formatTime(elapsedMs())`.
- `running` is true only when the clock has started, the run is not done, and the run is not paused. When it flips false the displayed value freezes at the last computed value.

### Drill screen (`src/components/Drill.tsx`)

- Timed mode only. The bar gets a pause button labelled 暫停, disabled until the clock has started. While paused the same button reads 繼續.
- While paused, an overlay covers the character grid. It shows 已暫停 and a 繼續 button. The grid content is not visible while paused.
- While paused the input is disabled. On resume the input is focused again.
- Escape toggles pause and resume. A `keydown` listener on `document` handles it so it works while the input is disabled. The listener ignores the event when `event.isComposing` is true or `event.keyCode === 229`, so cancelling an IME composition never pauses the run.
- Auto-pause: a `visibilitychange` listener on `document` calls `pause()` when `document.visibilityState === 'hidden'` and the clock is running. It never resumes automatically.
- Listeners are attached only in timed mode and removed on unmount.
- Free mode is unchanged: no clock, no pause control, no overlay.

### Strings

Added to the copy table in `2026-09-11-chinese-ui-design.md` and to `STRINGS`: `pause` 暫停, `resume` 繼續, `paused` 已暫停.

### Report

Unchanged. It receives the pause-excluded `elapsedMs`.

## Error handling

- Pausing before the clock starts, pausing twice, or resuming when not paused are no-ops by construction.
- A hidden-tab auto-pause while already paused is a no-op.
- If the page is hidden before the first character commits, nothing happens; the clock has not started.

## Testing

- `useDrill` (fake clock): pause then resume excludes the paused span from `elapsedMs()`; pause before the first commit is ignored; a second `pause()` while paused does not reset `pausedAt`; `resume()` when not paused is a no-op; `onInput` while paused is ignored; `restart()` clears pause state; finishing after a pause reports the pause-excluded time.
- `Clock`: shows the value from `elapsedMs`, ticks while `running`, freezes when `running` is false.
- `Drill` (timed): pause button disabled before the first commit; clicking 暫停 shows the overlay with 已暫停 and disables the input; clicking 繼續 hides the overlay, enables the input, and focuses it; Escape toggles; Escape with `isComposing: true` does nothing; a `visibilitychange` to hidden pauses; in free mode there is no pause button.
- `App`: a run with a pause reports the pause-excluded time (fake clock through Drill's `now` prop is not available at App level, so this is covered at Drill level with `onFinish` instead).

## Out of scope

- Auto-resume when the tab becomes visible.
- Showing the number or duration of pauses on the report.
- Pause in free mode.
