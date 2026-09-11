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
/** Escape pressed this soon after a composition ended was cancelling that composition. */
const COMPOSITION_END_GRACE_MS = 100

export function Drill({ setIndex, mode, order, onFinish, onBack, now }: DrillProps) {
  const drill = useDrill(order, { now })
  const {
    isPaused,
    isRunning,
    isDone,
    startedAt,
    runId,
    states,
    pause,
    resume,
    scramble,
    restart,
    onInput,
    elapsedMs,
    wrongTally,
    wrongPositions,
    order: drillOrder,
  } = drill
  const inputRef = useRef<HTMLInputElement | null>(null)
  const resumeRef = useRef<HTMLButtonElement | null>(null)
  const reported = useRef(false)
  const composing = useRef(false)
  const compositionEndedAt = useRef(-Infinity)
  const timed = mode === 'timed'
  const canPause = startedAt !== null && !isDone

  useEffect(() => {
    reported.current = false
  }, [runId])

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

  // Pausing disables the input, so move focus to the overlay's resume button;
  // resuming hands it back to the input.
  useEffect(() => {
    if (isPaused) resumeRef.current?.focus()
    else inputRef.current?.focus()
  }, [isPaused])

  // Track IME composition at the document level so the Escape guard below
  // does not depend on how a browser orders compositionend and keydown.
  useEffect(() => {
    if (!timed) return
    const onStart = () => {
      composing.current = true
    }
    const onEnd = () => {
      composing.current = false
      compositionEndedAt.current = Date.now()
    }
    document.addEventListener('compositionstart', onStart)
    document.addEventListener('compositionend', onEnd)
    return () => {
      document.removeEventListener('compositionstart', onStart)
      document.removeEventListener('compositionend', onEnd)
    }
  }, [timed])

  // Escape toggles pause, except when it is cancelling an IME composition.
  useEffect(() => {
    if (!timed) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      const cancellingComposition =
        e.isComposing ||
        e.keyCode === IME_PROCESSING_KEY_CODE ||
        composing.current ||
        Date.now() - compositionEndedAt.current < COMPOSITION_END_GRACE_MS
      if (cancellingComposition) return
      if (isPaused) {
        e.preventDefault()
        resume()
      } else if (canPause) {
        e.preventDefault()
        pause()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [timed, isPaused, canPause, pause, resume])

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
        <Button variant="secondary" onClick={scramble}>
          {STRINGS.scramble}
        </Button>
        <Button variant="secondary" onClick={restart}>
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
          <div className={styles.pausedOverlay} role="dialog" aria-labelledby="paused-label">
            <p id="paused-label" className={styles.pausedLabel}>
              {STRINGS.paused}
            </p>
            <Button ref={resumeRef} variant="primary" onClick={resume}>
              {STRINGS.resume}
            </Button>
          </div>
        )}
      </div>

      <p className={styles.hint}>{STRINGS.hint}</p>

      <DrillInput key={runId} onValue={onInput} inputRef={inputRef} disabled={isDone || isPaused} />

      {mode === 'free' && isDone && <p className={styles.done}>{STRINGS.done}</p>}
    </main>
  )
}
