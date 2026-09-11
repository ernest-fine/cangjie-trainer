import { SETS, SET_SIZE } from '../data/sets'
import { ATTACK_MINUTES } from '../lib/attack'
import { formatTime } from '../lib/scoring'
import { STRINGS } from '../lib/strings'
import type { AttackBests, AttackMinutes, Bests, Mode } from '../lib/types'
import { Button } from './Button'
import styles from './Home.module.css'

export interface HomeProps {
  bests: Bests
  attackBests: AttackBests
  onStart(setIndex: number, mode: Mode): void
  onStartAttack(minutes: AttackMinutes): void
}

export function Home({ bests, attackBests, onStart, onStartAttack }: HomeProps) {
  return (
    <main className={styles.screen}>
      <header className={styles.header}>
        <h1 className={styles.title}>{STRINGS.appTitle}</h1>
        <p className={styles.subtitle}>{STRINGS.subtitle}</p>
      </header>

      <article className={`${styles.card} ${styles.attackCard}`} aria-labelledby="attack-title">
        <div className={styles.cardHead}>
          <h2 id="attack-title" className={styles.setName}>
            {STRINGS.attack}
          </h2>
        </div>
        <ul className={styles.attackList}>
          {ATTACK_MINUTES.map((minutes) => {
            const best = attackBests[minutes]
            return (
              <li key={minutes} className={styles.attackRow}>
                <Button variant="primary" onClick={() => onStartAttack(minutes)}>
                  {STRINGS.minutes(minutes)}
                </Button>
                <span className={styles.best}>
                  <span className={styles.bestLabel}>{STRINGS.bestLabel}</span>
                  <span>{best ? `${best.cpm} ${STRINGS.charsPerMinute} · ${Math.round(best.accuracy * 100)}%` : STRINGS.noBest}</span>
                </span>
              </li>
            )
          })}
        </ul>
      </article>

      <div className={styles.grid}>
        {SETS.map((set, i) => {
          const best = bests[i]
          return (
            <article key={i} className={styles.card} aria-labelledby={`set-${i + 1}-title`}>
              <div className={styles.cardHead}>
                <h2 id={`set-${i + 1}-title`} className={styles.setName}>
                  {STRINGS.setName(i + 1)}
                </h2>
                <span className={styles.range}>{STRINGS.setRange(i * SET_SIZE + 1, (i + 1) * SET_SIZE)}</span>
              </div>
              <div className={styles.preview} aria-hidden="true">
                {set.slice(0, 8).join('')}
              </div>
              <div className={styles.best}>
                <span className={styles.bestLabel}>{STRINGS.bestLabel}</span>
                {best ? (
                  <>
                    <span>{formatTime(best.bestMs)}</span>
                    <span>{Math.round(best.accuracy * 100)}%</span>
                  </>
                ) : (
                  <span>{STRINGS.noBest}</span>
                )}
              </div>
              <div className={styles.actions}>
                <Button variant="primary" onClick={() => onStart(i, 'timed')}>
                  {STRINGS.timed}
                </Button>
                <Button variant="secondary" onClick={() => onStart(i, 'free')}>
                  {STRINGS.free}
                </Button>
              </div>
            </article>
          )
        })}
      </div>
    </main>
  )
}
