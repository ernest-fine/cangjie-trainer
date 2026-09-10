import { accuracy, charsPerMinute, formatTime } from '../lib/scoring'
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
  const acc = Math.round(accuracy(result.wrongTally) * 100)

  let recordText: string
  let recordClass = styles.statValue
  if (isNewBest) {
    recordText = 'New best'
    recordClass = `${styles.statValue} ${styles.newBest}`
  } else if (previousBest) {
    recordText = `Best ${formatTime(previousBest.bestMs)}`
  } else {
    recordText = 'No record yet'
  }

  return (
    <main className={styles.screen}>
      <section className={styles.card} aria-labelledby="report-heading">
        <h1 id="report-heading" className={styles.heading}>
          Set {result.setIndex + 1} complete
        </h1>

        <div className={styles.hero}>
          <span className={styles.speed}>{cpm}</span>
          <span className={styles.speedLabel}>characters per minute</span>
        </div>

        <div className={styles.stats}>
          <div className={styles.stat}>
            <span className={styles.statValue}>{acc}%</span>
            <span className={styles.statLabel}>Accuracy</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statValue}>{formatTime(result.elapsedMs)}</span>
            <span className={styles.statLabel}>Time</span>
          </div>
          <div className={styles.stat}>
            <span className={recordClass}>{recordText}</span>
            <span className={styles.statLabel}>Record</span>
          </div>
        </div>

        <div>
          <p className={styles.missedLabel} id="missed-label">
            Missed
          </p>
          {result.missed.length === 0 ? (
            <p className={styles.none}>No mistakes</p>
          ) : (
            <ul className={styles.missed} aria-labelledby="missed-label" lang="zh-Hant">
              {result.missed.map((ch) => (
                <li key={ch} className={styles.missedGlyph}>
                  {ch}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className={styles.actions}>
          <Button variant="primary" onClick={onRetry}>
            Retry
          </Button>
          <Button variant="secondary" onClick={onRetryScrambled}>
            Retry scrambled
          </Button>
          <Button variant="ghost" onClick={onBack}>
            Back to sets
          </Button>
        </div>
      </section>
    </main>
  )
}
