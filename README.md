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
