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

const IME_PROCESSING_KEY_CODE = 229

export function Drill({ setIndex, mode, order, onFinish, onBack, now }: DrillProps) {
  const drill = useDrill(order, { now })
  const { isPaused, isRunning, isDone, startedAt, runId, states, pause, resume, elapsedMs, wrongTally, wrongPositions, order: drillOrder } = drill
  const inputRef = useRef<HTMLInputElement | null>(null)
  const reported = useRef(false)
  const timed = mode === 'timed'

  useEffect(() => {
    reported.current = false
  }, [drill.runId])

  useEffect(() => {
    if (!timed || !isDone || reported.current) return
    reported.current = true
    onFinish({
      setIndex,
      order: drillOrder,
      elapsedMs: elapsedMs(),
      wrongTally,
      missed: missedCharacters(drillOrder, wrongPositions),
    })
  }, [timed, isDone, drillOrder, elapsedMs, wrongTally, wrongPositions, onFinish, setIndex])

  // Refocus the input whenever a pause ends.
  useEffect(() => {
    if (!isPaused) inputRef.current?.focus()
  }, [isPaused])

  // Escape toggles pause, except while the IME is composing.
  useEffect(() => {
    if (!timed) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.isComposing || e.keyCode === IME_PROCESSING_KEY_CODE) return
      e.preventDefault()
      if (isPaused) resume()
      else pause()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [timed, isPaused, pause, resume])

  // Auto-pause when the page is hidden. Never auto-resume.
  useEffect(() => {
    if (!timed) return
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') pause()
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [timed, pause])

  const focusInput = () => inputRef.current?.focus()
  const canPause = startedAt !== null && !isDone

  return (
    <main className={styles.screen} onClick={focusInput}>
      <header className={styles.bar}>
        <div className={styles.title}>
          <span className={styles.setName}>{STRINGS.setName(setIndex + 1)}</span>
          <span className={styles.mode}>{timed ? STRINGS.timed : STRINGS.free}</span>
        </div>
        {timed && (
          <span className={styles.clock}>
            <Clock elapsedMs={elapsedMs} running={isRunning} />
          </span>
        )}
        {timed && (
          <Button variant="secondary" onClick={isPaused ? resume : pause} disabled={!canPause}>
            {isPaused ? STRINGS.resume : STRINGS.pause}
          </Button>
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

      <div className={styles.gridArea}>
        {/* The grid keeps its layout box while paused so the page does not jump. */}
        <CharacterGrid order={drillOrder} states={states} concealed={isPaused} />
        {isPaused && (
          <div className={styles.pausedOverlay} role="dialog" aria-label={STRINGS.paused}>
            <p className={styles.pausedLabel}>{STRINGS.paused}</p>
            <Button variant="primary" onClick={resume}>
              {STRINGS.resume}
            </Button>
          </div>
        )}
      </div>

      <p className={styles.hint}>{STRINGS.hint}</p>

      <DrillInput key={runId} onValue={drill.onInput} inputRef={inputRef} disabled={isDone || isPaused} />

      {mode === 'free' && isDone && <p className={styles.done}>{STRINGS.done}</p>}
    </main>
  )
}
