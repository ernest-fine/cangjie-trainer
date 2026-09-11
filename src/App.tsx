import { useCallback, useRef, useState } from 'react'
import { Drill } from './components/Drill'
import { Home } from './components/Home'
import { Report } from './components/Report'
import { SETS } from './data/sets'
import { accuracy, shuffle } from './lib/scoring'
import { loadBests, qualifiesAsBest, saveBest } from './lib/storage'
import type { BestRecord, Bests, Mode, RunResult } from './lib/types'

type Screen =
  | { name: 'home' }
  | { name: 'drill'; setIndex: number; mode: Mode; order: string[]; runKey: number }
  | { name: 'report'; result: RunResult; isNewBest: boolean; previousBest: BestRecord | undefined }

export default function App() {
  const [bests, setBests] = useState<Bests>(() => loadBests())
  const [screen, setScreen] = useState<Screen>({ name: 'home' })
  const runKeyCounter = useRef(0)

  const startDrill = useCallback((setIndex: number, mode: Mode, order: string[] = SETS[setIndex]) => {
    runKeyCounter.current += 1
    setScreen({ name: 'drill', setIndex, mode, order, runKey: runKeyCounter.current })
  }, [])

  const finishRun = useCallback(
    (result: RunResult) => {
      const previousBest = bests[result.setIndex]
      const acc = accuracy(result.wrongCount)
      const isNewBest = qualifiesAsBest(previousBest, { elapsedMs: result.elapsedMs, accuracy: acc })
      if (isNewBest) {
        const record: BestRecord = { bestMs: result.elapsedMs, accuracy: acc, recordedAt: new Date().toISOString() }
        saveBest(result.setIndex, record)
        setBests((prev) => ({ ...prev, [result.setIndex]: record }))
      }
      setScreen({ name: 'report', result, isNewBest, previousBest })
    },
    [bests],
  )

  const goHome = useCallback(() => setScreen({ name: 'home' }), [])

  switch (screen.name) {
    case 'home':
      return <Home bests={bests} onStart={startDrill} />
    case 'drill':
      return (
        <Drill
          key={screen.runKey}
          setIndex={screen.setIndex}
          mode={screen.mode}
          order={screen.order}
          onFinish={finishRun}
          onBack={goHome}
        />
      )
    case 'report':
      return (
        <Report
          result={screen.result}
          isNewBest={screen.isNewBest}
          previousBest={screen.previousBest}
          onRetry={() => startDrill(screen.result.setIndex, 'timed', screen.result.order)}
          onRetryScrambled={() => startDrill(screen.result.setIndex, 'timed', shuffle(screen.result.order))}
          onBack={goHome}
        />
      )
  }
}
