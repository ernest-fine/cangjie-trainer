import { useEffect, useRef } from 'react'
import { useDrill } from '../hooks/useDrill'
import { missedCharacters } from '../lib/scoring'
import { STRINGS } from '../lib/strings'
import type { Mode, RunResult } from '../lib/types'
import { Button } from './Button'
import { CharacterGrid } from './CharacterGrid'
import { Clock } from './Clock'
import { DrillInput } from './DrillInput'
import styles from './Drill.module.css'

export interface DrillProps {
  setIndex: number
  mode: Mode
  order: string[]
  onFinish(result: RunResult): void
  onBack(): void
  now?: () => number
}

export function Drill({ setIndex, mode, order, onFinish, onBack, now }: DrillProps) {
  const drill = useDrill(order, { now })
  const inputRef = useRef<HTMLInputElement | null>(null)
  const reported = useRef(false)

  useEffect(() => {
    reported.current = false
  }, [drill.runId])

  useEffect(() => {
    if (mode !== 'timed' || !drill.isDone || reported.current) return
    reported.current = true
    onFinish({
      setIndex,
      order: drill.order,
      elapsedMs: (drill.endedAt ?? 0) - (drill.startedAt ?? 0),
      wrongTally: drill.wrongTally,
      missed: missedCharacters(drill.order, drill.wrongPositions),
    })
  }, [mode, drill.isDone, drill.order, drill.endedAt, drill.startedAt, drill.wrongTally, drill.wrongPositions, onFinish, setIndex])

  const focusInput = () => inputRef.current?.focus()

  return (
    <main className={styles.screen} onClick={focusInput}>
      <header className={styles.bar}>
        <div className={styles.title}>
          <span className={styles.setName}>{STRINGS.setName(setIndex + 1)}</span>
          <span className={styles.mode}>{mode === 'timed' ? STRINGS.timed : STRINGS.free}</span>
        </div>
        {mode === 'timed' && (
          <span className={styles.clock}>
            <Clock startedAt={drill.startedAt} endedAt={drill.endedAt} />
          </span>
        )}
        <Button variant="secondary" onClick={drill.scramble}>
          {STRINGS.scramble}
        </Button>
        <Button variant="secondary" onClick={drill.restart}>
          {STRINGS.restart}
        </Button>
        <Button variant="ghost" onClick={onBack}>
          {STRINGS.back}
        </Button>
      </header>

      <CharacterGrid order={drill.order} states={drill.states} />

      <p className={styles.hint}>{STRINGS.hint}</p>

      <DrillInput key={drill.runId} onValue={drill.onInput} inputRef={inputRef} disabled={drill.isDone} />

      {mode === 'free' && drill.isDone && <p className={styles.done}>{STRINGS.done}</p>}
    </main>
  )
}
