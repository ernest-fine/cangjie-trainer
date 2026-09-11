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
  const inputRef = useRef<HTMLInputElement | null>(null)
  const reported = useRef(false)
  const timed = mode === 'timed'

  useEffect(() => {
    reported.current = false
  }, [drill.runId])

  useEffect(() => {
    if (!timed || !drill.isDone || reported.current) return
    reported.current = true
    onFinish({
      setIndex,
      order: drill.order,
      elapsedMs: drill.elapsedMs(),
      wrongTally: drill.wrongTally,
      missed: missedCharacters(drill.order, drill.wrongPositions),
    })
  }, [timed, drill.isDone, drill.order, drill.elapsedMs, drill.wrongTally, drill.wrongPositions, onFinish, setIndex])

  // Refocus the input whenever a pause ends.
  useEffect(() => {
    if (!drill.isPaused) inputRef.current?.focus()
  }, [drill.isPaused])

  // Escape toggles pause, except while the IME is composing.
  useEffect(() => {
    if (!timed) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.isComposing || e.keyCode === IME_PROCESSING_KEY_CODE) return
      e.preventDefault()
      if (drill.isPaused) drill.resume()
      else drill.pause()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [timed, drill.isPaused, drill.pause, drill.resume])

  // Auto-pause when the page is hidden. Never auto-resume.
  useEffect(() => {
    if (!timed) return
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') drill.pause()
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [timed, drill.pause])

  const focusInput = () => inputRef.current?.focus()
  const canPause = drill.startedAt !== null && !drill.isDone

  return (
    <main className={styles.screen} onClick={focusInput}>
      <header className={styles.bar}>
        <div className={styles.title}>
          <span className={styles.setName}>{STRINGS.setName(setIndex + 1)}</span>
          <span className={styles.mode}>{timed ? STRINGS.timed : STRINGS.free}</span>
        </div>
        {timed && (
          <span className={styles.clock}>
            <Clock elapsedMs={drill.elapsedMs} running={drill.isRunning} />
          </span>
        )}
        {timed && (
          <Button variant="secondary" onClick={drill.isPaused ? drill.resume : drill.pause} disabled={!canPause}>
            {drill.isPaused ? STRINGS.resume : STRINGS.pause}
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

      {drill.isPaused ? (
        <div className={styles.pausedOverlay} role="dialog" aria-label={STRINGS.paused}>
          <p className={styles.pausedLabel}>{STRINGS.paused}</p>
          <Button variant="primary" onClick={drill.resume}>
            {STRINGS.resume}
          </Button>
        </div>
      ) : (
        <CharacterGrid order={drill.order} states={drill.states} />
      )}

      <p className={styles.hint}>{STRINGS.hint}</p>

      <DrillInput key={drill.runId} onValue={drill.onInput} inputRef={inputRef} disabled={drill.isDone || drill.isPaused} />

      {mode === 'free' && drill.isDone && <p className={styles.done}>{STRINGS.done}</p>}
    </main>
  )
}
