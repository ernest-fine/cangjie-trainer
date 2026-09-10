import { SETS, SET_SIZE } from '../data/sets'
import { formatTime } from '../lib/scoring'
import type { Bests, Mode } from '../lib/types'
import { Button } from './Button'
import styles from './Home.module.css'

export interface HomeProps {
  bests: Bests
  onStart(setIndex: number, mode: Mode): void
}

export function Home({ bests, onStart }: HomeProps) {
  return (
    <main className={styles.screen}>
      <header className={styles.header}>
        <h1 className={styles.title}>Cangjie Trainer</h1>
        <p className={styles.subtitle}><span lang="zh-Hant">倉頡練習</span> · Retype the most common characters with your Cangjie keyboard.</p>
      </header>
      <div className={styles.grid}>
        {SETS.map((set, i) => {
          const best = bests[i]
          const rangeStart = i * SET_SIZE + 1
          const rangeEnd = (i + 1) * SET_SIZE
          return (
            <article key={i} className={styles.card} aria-labelledby={`set-${i + 1}-title`}>
              <div className={styles.cardHead}>
                <h2 id={`set-${i + 1}-title`} className={styles.setName}>Set {i + 1}</h2>
                <span className={styles.range}>
                  {rangeStart} to {rangeEnd}
                </span>
              </div>
              <div className={styles.preview} aria-hidden="true">
                {set.slice(0, 8).join('')}
              </div>
              <div className={styles.best}>
                <span className={styles.bestLabel}>Best</span>
                {best ? (
                  <>
                    <span>{formatTime(best.bestMs)}</span>
                    <span>{Math.round(best.accuracy * 100)}%</span>
                  </>
                ) : (
                  <span>—</span>
                )}
              </div>
              <div className={styles.actions}>
                <Button variant="primary" onClick={() => onStart(i, 'timed')}>
                  Timed
                </Button>
                <Button variant="secondary" onClick={() => onStart(i, 'free')}>
                  Free
                </Button>
              </div>
            </article>
          )
        })}
      </div>
    </main>
  )
}
