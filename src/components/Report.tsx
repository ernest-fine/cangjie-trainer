import { accuracy, charsPerMinute, formatTime } from '../lib/scoring'
import { STRINGS } from '../lib/strings'
import { CANGJIE } from '../data/cangjie'
import { radicalsFor } from '../lib/cangjie'
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
  const acc = Math.round(accuracy(result.wrongCount) * 100)

  let recordText: string
  let recordClass = styles.statValue
  if (isNewBest) {
    recordText = STRINGS.newBest
    recordClass = `${styles.statValue} ${styles.newBest}`
  } else if (previousBest) {
    recordText = STRINGS.best(formatTime(previousBest.bestMs))
  } else {
    recordText = STRINGS.noRecord
  }

  return (
    <main className={styles.screen}>
      <section className={styles.card} aria-labelledby="report-heading">
        <h1 id="report-heading" className={styles.heading}>
          {STRINGS.setComplete(result.setIndex + 1)}
        </h1>

        <div className={styles.hero}>
          <span className={styles.speed}>{cpm}</span>
          <span className={styles.speedLabel}>{STRINGS.charsPerMinute}</span>
        </div>

        <div className={styles.stats}>
          <div className={styles.stat}>
            <span className={styles.statValue}>{acc}%</span>
            <span className={styles.statLabel}>{STRINGS.accuracy}</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statValue}>{formatTime(result.elapsedMs)}</span>
            <span className={styles.statLabel}>{STRINGS.time}</span>
          </div>
          <div className={styles.stat}>
            <span className={recordClass}>{recordText}</span>
            <span className={styles.statLabel}>{STRINGS.record}</span>
          </div>
        </div>

        <div>
          <p className={styles.missedLabel} id="missed-label">
            {STRINGS.missed}
          </p>
          {result.missed.length === 0 ? (
            <p className={styles.none}>{STRINGS.noMistakes}</p>
          ) : (
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
          )}
        </div>

        <div className={styles.actions}>
          <Button variant="primary" onClick={onRetry}>
            {STRINGS.retry}
          </Button>
          <Button variant="secondary" onClick={onRetryScrambled}>
            {STRINGS.retryScrambled}
          </Button>
          <Button variant="ghost" onClick={onBack}>
            {STRINGS.backToSets}
          </Button>
        </div>
      </section>
    </main>
  )
}
