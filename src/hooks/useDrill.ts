import { useCallback, useMemo, useState } from 'react'
import { newlyWrongPositions, positionStates, shuffle } from '../lib/scoring'
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
  runId: number
}

export interface Drill extends DrillState {
  states: PositionState[]
  isDone: boolean
  onInput(value: string, isComposing: boolean): void
  scramble(): void
  restart(): void
}

function freshState(order: string[], runId: number): DrillState {
  return { order, typed: '', wrongTally: 0, wrongPositions: [], startedAt: null, endedAt: null, runId }
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
        if (prev.endedAt !== null) return prev
        const capped = [...value].slice(0, prev.order.length).join('')
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

  const restart = useCallback(() => {
    setState((prev) => freshState(prev.order, prev.runId + 1))
  }, [])

  const scramble = useCallback(() => {
    setState((prev) => freshState(shuffle(prev.order, rng), prev.runId + 1))
  }, [rng])

  const states = useMemo(() => positionStates(state.order, state.typed), [state.order, state.typed])

  return {
    ...state,
    states,
    isDone: state.endedAt !== null,
    onInput,
    scramble,
    restart,
  }
}
