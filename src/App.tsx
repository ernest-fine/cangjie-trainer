import { useCallback, useRef, useState } from 'react'
import { Drill } from './components/Drill'
import { Home } from './components/Home'
import { Report } from './components/Report'
import { SETS } from './data/sets'
import { attackCpm, randomOrder } from './lib/attack'
import { accuracy, formatTime, shuffle } from './lib/scoring'
import {
  loadAttackBests,
  loadBests,
  qualifiesAsAttackBest,
  qualifiesAsBest,
  saveAttackBest,
  saveBest,
} from './lib/storage'
import { STRINGS } from './lib/strings'
import type { AttackBestRecord, AttackBests, AttackMinutes, BestRecord, Bests, Mode, RunResult } from './lib/types'

type Screen =
  | { name: 'home' }
  | { name: 'drill'; setIndex: number; mode: Mode; order: string[]; durationMs: number; runKey: number }
  | { name: 'report'; result: RunResult; isNewBest: boolean; previousBestText: string | undefined }

const ALL_CHARACTERS = SETS.flat()

export default function App() {
  const [bests, setBests] = useState<Bests>(() => loadBests())
  const [attackBests, setAttackBests] = useState<AttackBests>(() => loadAttackBests())
  const [screen, setScreen] = useState<Screen>({ name: 'home' })
  const runKeyCounter = useRef(0)

  const startDrill = useCallback((setIndex: number, mode: Mode, order: string[] = SETS[setIndex]) => {
    runKeyCounter.current += 1
    setScreen({ name: 'drill', setIndex, mode, order, durationMs: 0, runKey: runKeyCounter.current })
  }, [])

  const startAttack = useCallback((minutes: AttackMinutes) => {
    runKeyCounter.current += 1
    setScreen({
      name: 'drill',
      setIndex: -1,
      mode: 'attack',
      order: randomOrder(ALL_CHARACTERS),
      durationMs: minutes * 60_000,
      runKey: runKeyCounter.current,
    })
  }, [])

  const finishRun = useCallback(
    (result: RunResult) => {
      if (result.kind === 'attack') {
        const minutes = Math.round(result.durationMs / 60_000)
        const previous = attackBests[minutes]
        const cpm = attackCpm(result)
        const acc = accuracy(result.wrongCount, result.typedCount)
        const isNewBest = qualifiesAsAttackBest(previous, { cpm, accuracy: acc, typedCount: result.typedCount })
        if (isNewBest) {
          const record: AttackBestRecord = { cpm, accuracy: acc, recordedAt: new Date().toISOString() }
          saveAttackBest(minutes, record)
          setAttackBests((prev) => ({ ...prev, [minutes]: record }))
        }
        const previousBestText = previous ? STRINGS.best(`${previous.cpm} ${STRINGS.charsPerMinute}`) : undefined
        setScreen({ name: 'report', result, isNewBest, previousBestText })
        return
      }
      const previousBest = bests[result.setIndex]
      const acc = accuracy(result.wrongCount, result.typedCount)
      const isNewBest = qualifiesAsBest(previousBest, { elapsedMs: result.elapsedMs, accuracy: acc })
      if (isNewBest) {
        const record: BestRecord = { bestMs: result.elapsedMs, accuracy: acc, recordedAt: new Date().toISOString() }
        saveBest(result.setIndex, record)
        setBests((prev) => ({ ...prev, [result.setIndex]: record }))
      }
      const previousBestText = previousBest ? STRINGS.best(formatTime(previousBest.bestMs)) : undefined
      setScreen({ name: 'report', result, isNewBest, previousBestText })
    },
    [bests, attackBests],
  )

  const goHome = useCallback(() => setScreen({ name: 'home' }), [])

  switch (screen.name) {
    case 'home':
      return <Home bests={bests} attackBests={attackBests} onStart={startDrill} onStartAttack={startAttack} />
    case 'drill':
      return (
        <Drill
          key={screen.runKey}
          setIndex={screen.setIndex}
          mode={screen.mode}
          order={screen.order}
          durationMs={screen.durationMs}
          onFinish={finishRun}
          onBack={goHome}
        />
      )
    case 'report': {
      const { result } = screen
      if (result.kind === 'attack') {
        const minutes = Math.round(result.durationMs / 60_000) as AttackMinutes
        return (
          <Report
            result={result}
            isNewBest={screen.isNewBest}
            previousBestText={screen.previousBestText}
            onRetry={() => startAttack(minutes)}
            onBack={goHome}
          />
        )
      }
      return (
        <Report
          result={result}
          isNewBest={screen.isNewBest}
          previousBestText={screen.previousBestText}
          onRetry={() => startDrill(result.setIndex, 'timed', result.order)}
          onRetryScrambled={() => startDrill(result.setIndex, 'timed', shuffle(result.order))}
          onBack={goHome}
        />
      )
    }
  }
}
