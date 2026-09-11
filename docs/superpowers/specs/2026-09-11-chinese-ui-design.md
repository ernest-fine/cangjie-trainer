# Chinese Interface — Design Spec

Date: 2026-09-11
Status: Approved for planning
Extends: `2026-09-10-cangjie-trainer-design.md`

## Purpose

An app for learning a Chinese input method should not present an English interface. Every user-facing string becomes standard written Chinese in Hong Kong usage (書面語, traditional characters). Numbers, times, and percentages keep their numeric form.

## Requirements

### Register and copy

Standard written Chinese, Hong Kong usage. Not colloquial Cantonese. The exact strings:

| Where | English today | Chinese |
|---|---|---|
| `index.html` title, Home heading | Cangjie Trainer | 倉頡練習 |
| Home subtitle | 倉頡練習 · Retype the most common characters of Hong Kong written Chinese and Cantonese. | 以倉頡輸入法練習香港書面語及粵語最常用的字 |
| Set card name | Set 1 | 第 1 組 |
| Set card range | 1 to 100 | 第 1 至 100 字 |
| Set card best label | Best | 最佳 |
| Set card no best | — | — |
| Set card buttons | Timed / Free | 計時 / 自由練習 |
| Drill mode label | Timed / Free | 計時 / 自由練習 |
| Drill buttons | Scramble / Restart / Back | 打亂次序 / 重新開始 / 返回 |
| Drill hint | Switch your keyboard to Cangjie | 請切換至倉頡輸入法 |
| Drill input placeholder | 在此輸入 | 在此輸入 |
| Drill input accessible label | Type the characters shown above | 請輸入上方顯示的字 |
| Drill done mark (free mode) | Done | 完成 |
| Report heading | Set 1 complete | 第 1 組完成 |
| Report speed label | characters per minute | 每分鐘字數 |
| Report stat labels | Accuracy / Time / Record | 準確度 / 時間 / 紀錄 |
| Report record values | New best / Best 1:20.0 / No record yet | 新紀錄 / 最佳 1:20.0 / 未有紀錄 |
| Report missed label | Missed | 錯字 |
| Report no mistakes | No mistakes | 全部正確 |
| Report buttons | Retry / Retry scrambled / Back to sets | 再試一次 / 打亂再試 / 返回字組 |
| Drill pause button (see the pause spec) | Pause / Resume | 暫停 / 繼續 |
| Drill paused overlay (see the pause spec) | Paused | 已暫停 |

Numbers are inserted with the same spacing as above: a space on each side of an Arabic numeral inside Chinese text (第 1 組, 第 1 至 100 字), no space before `%`.

### Structure

- `src/lib/strings.ts` exports a single frozen object `STRINGS`. Strings that embed a number are functions: `setName(n: number)`, `setRange(from: number, to: number)`, `setComplete(n: number)`, `best(time: string)`. Everything else is a string constant.
- Components import `STRINGS` and contain no user-facing literals of their own.
- Tests import `STRINGS` for role names and text assertions, so copy and tests cannot drift.
- `index.html`: `<html lang="zh-Hant">`, `<title>倉頡練習</title>`.
- Per-element `lang="zh-Hant"` attributes added earlier (Home subtitle span, grid, missed list, input) are removed; the document language covers them.
- README stays in English. It is developer documentation and carries the license credit.

### Out of scope

- Language switching or an i18n library.
- Simplified Chinese.
- Changing the README or the specs to Chinese.

## Error handling

No new failure modes. Missing a string is a TypeScript error, since components reference `STRINGS` members.

## Testing

- Existing component and App tests are updated to query by the Chinese names via `STRINGS`.
- A small test for `strings.ts` checks the number-embedding functions: `setName(1) === '第 1 組'`, `setRange(1, 100) === '第 1 至 100 字'`, `setComplete(3) === '第 3 組完成'`, `best('1:20.0') === '最佳 1:20.0'`.
- The Home subtitle test asserts the new sentence.
