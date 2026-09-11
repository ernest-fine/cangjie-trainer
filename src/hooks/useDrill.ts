import { useCallback, useMemo, useState } from 'react'
import { hanCharacters, newlyWrongPositions, positionStates, shuffle } from '../lib/scoring'
import type { PositionState } from '../lib/types'

export interface UseDrillOptions {
  now?: () => number
  rng?: () => number
}

export interface DrillState {
  order: string[]
  typed: string
  wrongTally: number
  wrongPositions: number[]
  startedAt: number | null
  endedAt: number | null
  /** Timestamp of the current pause, or null when not paused. */
  pausedAt: number | null
  /** Total time spent in earlier pauses. */
  pausedMs: number
  runId: number
}

export interface Drill extends DrillState {
  states: PositionState[]
  isDone: boolean
  isPaused: boolean
  /** Clock started, not done, not paused. */
  isRunning: boolean
  /** Elapsed time excluding pauses; 0 before the clock starts. */
  elapsedMs(): number
  onInput(value: string, isComposing: boolean): void
  scramble(): void
  restart(): void
  pause(): void
  resume(): void
}

function freshState(order: string[], runId: number): DrillState {
  return {
    order,
    typed: '',
    wrongTally: 0,
    wrongPositions: [],
    startedAt: null,
    endedAt: null,
    pausedAt: null,
    pausedMs: 0,
    runId,
  }
}

export function useDrill(initialOrder: string[], options: UseDrillOptions = {}): Drill {
  const now = useMemo(() => options.now ?? (() => performance.now()), [options.now])
  const rng = useMemo(() => options.rng ?? Math.random, [options.rng])
  const [state, setState] = useState<DrillState>(() => freshState(initialOrder, 0))

  const onInput = useCallback(
    (value: string, isComposing: boolean) => {
      if (isComposing) return
      const t = now()
      setState((prev) => {
        if (prev.endedAt !== null || prev.pausedAt !== null) return prev
        const capped = [...hanCharacters(value)].slice(0, prev.order.length).join('')
        const wrong = newlyWrongPositions(prev.typed, capped, prev.order)
        const startedAt = prev.startedAt ?? (capped.length > 0 ? t : null)
        const done = [...capped].length === prev.order.length
        return {
          ...prev,
          typed: capped,
          wrongTally: prev.wrongTally + wrong.length,
          wrongPositions: wrong.length ? [...prev.wrongPositions, ...wrong] : prev.wrongPositions,
          startedAt,
          endedAt: done ? t : null,
        }
      })
    },
    [now],
  )

  const pause = useCallback(() => {
    const t = now()
    setState((prev) => {
      if (prev.startedAt === null || prev.endedAt !== null || prev.pausedAt !== null) return prev
      return { ...prev, pausedAt: t }
    })
  }, [now])

  const resume = useCallback(() => {
    const t = now()
    setState((prev) => {
      if (prev.pausedAt === null) return prev
      return { ...prev, pausedMs: prev.pausedMs + (t - prev.pausedAt), pausedAt: null }
    })
  }, [now])

  const restart = useCallback(() => {
    setState((prev) => freshState(prev.order, prev.runId + 1))
  }, [])

  const scramble = useCallback(() => {
    setState((prev) => freshState(shuffle(prev.order, rng), prev.runId + 1))
  }, [rng])

  const elapsedMs = useCallback(() => {
    if (state.startedAt === null) return 0
    const end = state.endedAt ?? now()
    const openPause = state.pausedAt !== null ? now() - state.pausedAt : 0
    return Math.max(0, end - state.startedAt - state.pausedMs - openPause)
  }, [state.startedAt, state.endedAt, state.pausedAt, state.pausedMs, now])

  const states = useMemo(() => positionStates(state.order, state.typed), [state.order, state.typed])

  return {
    ...state,
    states,
    isDone: state.endedAt !== null,
    isPaused: state.pausedAt !== null,
    isRunning: state.startedAt !== null && state.endedAt === null && state.pausedAt === null,
    elapsedMs,
    onInput,
    scramble,
    restart,
    pause,
    resume,
  }
}
