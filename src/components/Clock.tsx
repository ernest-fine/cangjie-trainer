import { useEffect, useState } from 'react'
import { formatTime } from '../lib/scoring'

interface ClockProps {
  startedAt: number | null
  endedAt: number | null
  now?: () => number
}

const TICK_MS = 100

export function Clock({ startedAt, endedAt, now = () => performance.now() }: ClockProps) {
  const [, setTick] = useState(0)
  const running = startedAt !== null && endedAt === null

  useEffect(() => {
    if (!running) return
    const id = setInterval(() => setTick((t) => t + 1), TICK_MS)
    return () => clearInterval(id)
  }, [running])

  const elapsed = startedAt === null ? 0 : (endedAt ?? now()) - startedAt

  return (
    <span style={{ fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums' }} aria-live="off">
      {formatTime(elapsed)}
    </span>
  )
}
