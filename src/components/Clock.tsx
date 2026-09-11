import { useEffect, useState } from 'react'
import { formatTime } from '../lib/scoring'

interface ClockProps {
  /** Elapsed milliseconds, excluding pauses. */
  elapsedMs: () => number
  /** Tick while true; freeze the displayed value while false. */
  running: boolean
}

const TICK_MS = 100

export function Clock({ elapsedMs, running }: ClockProps) {
  const [, setTick] = useState(0)

  useEffect(() => {
    if (!running) return
    const id = setInterval(() => setTick((t) => t + 1), TICK_MS)
    return () => clearInterval(id)
  }, [running])

  return (
    <span style={{ fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums' }} aria-live="off">
      {formatTime(elapsedMs())}
    </span>
  )
}
