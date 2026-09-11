import { useEffect, useRef } from 'react'
import { useDrill } from '../hooks/useDrill'
import { ROW_LENGTH, WINDOW_ROWS, windowStart } from '../lib/attack'
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
  /** Required when mode is 'attack'. */
  durationMs?: number
  onFinish(result: RunResult): void
  onBack(): void
  now?: () => number
}

const IME_PROCESSING_KEY_CODE = 229
/** Escape pressed this soon after a composition ended was cancelling that composition. */
const COMPOSITION_END_GRACE_MS = 100
const EXPIRE_TICK_MS = 100

export function Drill({ setIndex, mode, order, durationMs, onFinish, onBack, now }: DrillProps) {
  const attack = mode === 'attack'
  const drill = useDrill(order, { now, limitMs: attack ? durationMs : undefined })
  const {
    isPaused,
    isRunning,
    isDone,
    startedAt,
    runId,
    typed,
    states,
    pause,
    resume,
    scramble,
    restart,
    onInput,
    elapsedMs,
    remainingMs,
    expire,
    wrongPositions,
    order: drillOrder,
  } = drill
  const inputRef = useRef<HTMLInputElement | null>(null)
  const resumeRef = useRef<HTMLButtonElement | null>(null)
  const reported = useRef(false)
  const composing = useRef(false)
  const compositionEndedAt = useRef(-Infinity)
  const clocked = mode === 'timed' || attack
  const canPause = startedAt !== null && !isDone

  useEffect(() => {
    reported.current = false
  }, [runId])

  useEffect(() => {
    if (!clocked || !isDone || reported.current) return
    reported.current = true
    const typedCount = [...typed].length
    onFinish({
      kind: attack ? 'attack' : 'set',
      setIndex,
      durationMs: attack ? (durationMs ?? 0) : 0,
      order: drillOrder,
      elapsedMs: elapsedMs(),
      typedCount,
      correctCount: typedCount - wrongPositions.length,
      wrongCount: wrongPositions.length,
      missed: missedCharacters(drillOrder, wrongPositions),
    })
  }, [clocked, attack, durationMs, isDone, typed, drillOrder, elapsedMs, wrongPositions, onFinish, setIndex])

  // Time attack: end the run when the countdown reaches zero.
  useEffect(() => {
    if (!attack || !isRunning) return
    const id = setInterval(expire, EXPIRE_TICK_MS)
    return () => clearInterval(id)
  }, [attack, isRunning, expire])

  // Pausing disables the input, so move focus to the overlay's resume button;
  // resuming hands it back to the input.
  useEffect(() => {
    if (isPaused) resumeRef.current?.focus()
    else inputRef.current?.focus()
  }, [isPaused])

  // Track IME composition at the document level so the Escape guard below
  // does not depend on how a browser orders compositionend and keydown.
  useEffect(() => {
    if (!clocked) return
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
  }, [clocked])

  // Escape toggles pause, except when it is cancelling an IME composition.
  useEffect(() => {
    if (!clocked) return
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
  }, [clocked, isPaused, canPause, pause, resume])

  // Auto-pause when the page is hidden. Never auto-resume.
  useEffect(() => {
    if (!clocked) return
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') pause()
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [clocked, pause])

  const focusInput = () => inputRef.current?.focus()

  const handleInput = (value: string, isComposing: boolean) => {
    // End the run first so a character committed after zero is not scored.
    if (attack) expire()
    onInput(value, isComposing)
  }

  // Attack mode shows a rolling three-row window; sets show everything.
  const start = attack ? windowStart([...typed].length, drillOrder.length) : 0
  const end = attack ? start + ROW_LENGTH * WINDOW_ROWS : drillOrder.length
  const visibleOrder = drillOrder.slice(start, end)
  const visibleStates = states.slice(start, end)
  const minutes = Math.round((durationMs ?? 0) / 60_000)

  return (
    <main className={styles.screen} onClick={focusInput}>
      <header className={styles.bar}>
        <div className={styles.title}>
          {attack ? (
            <span className={styles.setName}>{STRINGS.attackTitle(minutes)}</span>
          ) : (
            <>
              <span className={styles.setName}>{STRINGS.setName(setIndex + 1)}</span>
              <span className={styles.mode}>{mode === 'timed' ? STRINGS.timed : STRINGS.free}</span>
            </>
          )}
        </div>
        {clocked && (
          <span className={styles.clock} role="timer" aria-label={attack ? STRINGS.remaining : STRINGS.time}>
            <Clock elapsedMs={attack ? remainingMs : elapsedMs} running={isRunning} />
          </span>
        )}
        {clocked && (
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
        <CharacterGrid order={visibleOrder} states={visibleStates} concealed={isPaused} />
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

      <DrillInput key={runId} onValue={handleInput} inputRef={inputRef} disabled={isDone || isPaused} />

      {mode === 'free' && isDone && <p className={styles.done}>{STRINGS.done}</p>}
    </main>
  )
}
