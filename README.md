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

The sets blend two corpora 50/50, each converted to per-million character rates:

- Written Chinese: 八、九十年代香港字頻統計 from the CUHK Chinese Character Frequency Statistics for Hong Kong, Mainland China and Taiwan, https://humanum.arts.cuhk.edu.hk/Lexis/chifreq/
- Spoken Cantonese: the Hong Kong Cantonese Corpus (HKCanCor), https://github.com/fcbond/hkcancor

Regenerate the list with:

    npm run build:characters

This runs two scripts. The first downloads both corpora (about 2.5 MB) into `data-sources/` (git-ignored), extracts the HKCanCor zip with the system `unzip` command, and rewrites `src/data/sets.ts`. The second downloads the Unicode Unihan database (about 8.5 MB) into the same cache and rewrites `src/data/cangjie.ts`. Downloads are skipped when the cached files exist; delete `data-sources/` to refresh them. It normalizes a few HKCanCor transcription conventions to the characters people type (for example 哩 to 呢, 揾 to 搵) and skips two paralinguistic fillers; the table is in the script.

HKCanCor is released under CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/). The character list is a derived work: the corpus was normalized as described above and blended with the written-Chinese counts. Citation: Luke, K. K. and Wong, M. L. Y. (2015). The Hong Kong Cantonese Corpus: Design and Uses. Journal of Chinese Linguistics.

Cangjie codes shown for missed characters are third-generation (倉頡三代) codes. Regenerate them with `npm run build:cangjie` (also run by `npm run build:characters`). Cangjie codes are from the Unicode Unihan database, © Unicode, Inc., used under the Unicode License v3 (https://www.unicode.org/license.txt).

## Notes

Switch your system keyboard to Cangjie before typing. The app only reads committed characters from the IME.
