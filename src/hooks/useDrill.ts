import { useCallback, useMemo, useState } from 'react'
import { hanCharacters, positionStates, shuffle, wrongPositions as wrongPositionsOf } from '../lib/scoring'
import type { PositionState } from '../lib/types'

export interface UseDrillOptions {
  now?: () => number
  rng?: () => number
}

export interface DrillState {
  order: string[]
  typed: string
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
  /** Indices currently wrong; corrected mistakes drop out. */
  wrongPositions: number[]
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
        const startedAt = prev.startedAt ?? (capped.length > 0 ? t : null)
        const done = [...capped].length === prev.order.length
        return {
          ...prev,
          typed: capped,
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
    const t = now()
    const end = state.endedAt ?? t
    const openPause = state.pausedAt !== null ? t - state.pausedAt : 0
    return Math.max(0, end - state.startedAt - state.pausedMs - openPause)
  }, [state.startedAt, state.endedAt, state.pausedAt, state.pausedMs, now])

  const states = useMemo(() => positionStates(state.order, state.typed), [state.order, state.typed])
  const wrongPositions = useMemo(() => wrongPositionsOf(states), [states])

  return {
    ...state,
    states,
    wrongPositions,
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
