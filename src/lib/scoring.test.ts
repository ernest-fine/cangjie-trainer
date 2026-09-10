import { describe, expect, it } from 'vitest'
import {
  accuracy,
  hanCharacters,
  charsPerMinute,
  formatTime,
  missedCharacters,
  newlyWrongPositions,
  positionStates,
  shuffle,
} from './scoring'

const target = [...'的一是不了']

describe('positionStates', () => {
  it('marks everything pending except the first as current when nothing is typed', () => {
    expect(positionStates(target, '')).toEqual(['current', 'pending', 'pending', 'pending', 'pending'])
  })

  it('marks correct, wrong, current, pending', () => {
    expect(positionStates(target, '的X')).toEqual(['correct', 'wrong', 'current', 'pending', 'pending'])
  })

  it('has no current position when the run is complete', () => {
    expect(positionStates(target, '的一是不了')).toEqual(['correct', 'correct', 'correct', 'correct', 'correct'])
  })

  it('ignores typed characters beyond the target length', () => {
    expect(positionStates(target, '的一是不了多')).toHaveLength(5)
  })
})

describe('newlyWrongPositions', () => {
  it('reports a newly typed wrong character', () => {
    expect(newlyWrongPositions('的', '的X', target)).toEqual([1])
  })

  it('reports nothing for a correct character', () => {
    expect(newlyWrongPositions('的', '的一', target)).toEqual([])
  })

  it('reports nothing on backspace', () => {
    expect(newlyWrongPositions('的X', '的', target)).toEqual([])
  })

  it('reports again when a wrong character is retyped wrong', () => {
    expect(newlyWrongPositions('的', '的Y', target)).toEqual([1])
  })

  it('reports nothing when a wrong character is fixed', () => {
    expect(newlyWrongPositions('的X', '的一', target)).toEqual([])
  })

  it('handles several characters committed at once', () => {
    expect(newlyWrongPositions('', '的AB', target)).toEqual([1, 2])
  })

  it('ignores positions beyond the target', () => {
    expect(newlyWrongPositions('的一是不', '的一是不了Z', target)).toEqual([])
  })
})

describe('charsPerMinute', () => {
  it('computes 100 chars in one minute as 100', () => {
    expect(charsPerMinute(60_000)).toBe(100)
  })

  it('rounds to a whole number', () => {
    expect(charsPerMinute(90_000)).toBe(67)
  })

  it('returns 0 for a non-positive time', () => {
    expect(charsPerMinute(0)).toBe(0)
  })
})

describe('accuracy', () => {
  it('is 1 with no mistakes', () => {
    expect(accuracy(0)).toBe(1)
  })

  it('subtracts mistakes from the total', () => {
    expect(accuracy(10)).toBeCloseTo(0.9)
  })

  it('floors at 0', () => {
    expect(accuracy(150)).toBe(0)
  })
})

describe('shuffle', () => {
  it('returns a permutation of the same items', () => {
    const items = [...'的一是不了在人有我他']
    const result = shuffle(items)
    expect(result).toHaveLength(items.length)
    expect([...result].sort()).toEqual([...items].sort())
  })

  it('does not mutate the input', () => {
    const items = ['a', 'b', 'c']
    shuffle(items)
    expect(items).toEqual(['a', 'b', 'c'])
  })

  it('is deterministic with an injected rng', () => {
    const rng = () => 0
    expect(shuffle(['a', 'b', 'c'], rng)).toEqual(shuffle(['a', 'b', 'c'], rng))
  })

  it('tolerates an rng that returns exactly 1', () => {
    const items = ['a', 'b', 'c', 'd']
    const result = shuffle(items, () => 1)
    expect([...result].sort()).toEqual([...items].sort())
    expect(result).not.toContain(undefined)
  })
})

describe('missedCharacters', () => {
  it('returns wrong targets in set order without duplicates', () => {
    const t = [...'的一的是']
    expect(missedCharacters(t, [2, 0, 3])).toEqual(['的', '是'])
  })
})

describe('formatTime', () => {
  it('formats as m:ss.t', () => {
    expect(formatTime(65_340)).toBe('1:05.3')
    expect(formatTime(0)).toBe('0:00.0')
    expect(formatTime(599_990)).toBe('9:59.9')
  })

  it('clamps negative input to zero', () => {
    expect(formatTime(-500)).toBe('0:00.0')
  })
})

describe('hanCharacters', () => {
  it('keeps only Han characters', () => {
    expect(hanCharacters('的mgmmju一')).toBe('的一')
  })

  it('returns an empty string when nothing is Han', () => {
    expect(hanCharacters('abc ')).toBe('')
  })

  it('keeps the input unchanged when it is all Han', () => {
    expect(hanCharacters('倉頡')).toBe('倉頡')
  })
})
