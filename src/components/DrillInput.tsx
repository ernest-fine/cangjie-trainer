import type { CompositionEvent, FormEvent, RefObject } from 'react'
import { useRef } from 'react'
import { hanCharacters } from '../lib/scoring'
import { STRINGS } from '../lib/strings'
import styles from './DrillInput.module.css'

interface DrillInputProps {
  onValue(value: string, isComposing: boolean): void
  inputRef: RefObject<HTMLInputElement | null>
  disabled?: boolean
}

/**
 * Uncontrolled on purpose: React controlled inputs interfere with IME
 * composition. The owner remounts this component (via `key`) to clear it.
 */
export function DrillInput({ onValue, inputRef, disabled }: DrillInputProps) {
  const composing = useRef(false)

  /**
   * Report a committed value. Non-Han text (raw key letters the IME commits
   * for an invalid Cangjie code, or letters typed with the IME off) can never
   * match a target, so it is removed from the field and never scored.
   */
  const commit = (el: HTMLInputElement) => {
    const clean = hanCharacters(el.value)
    if (clean !== el.value) el.value = clean
    onValue(clean, false)
  }

  const handleInput = (e: FormEvent<HTMLInputElement>) => {
    const native = e.nativeEvent as InputEvent
    if (native.isComposing === true) {
      onValue(e.currentTarget.value, true)
      return
    }
    commit(e.currentTarget)
  }

  const handleCompositionStart = () => {
    composing.current = true
  }

  const handleCompositionEnd = (e: CompositionEvent<HTMLInputElement>) => {
    composing.current = false
    const el = e.currentTarget
    commit(el)
    // Some browsers fire compositionend before the committed text lands in
    // the DOM. Re-read on the next task, unless a new composition began or
    // the element was remounted meanwhile. Repeated values are idempotent.
    setTimeout(() => {
      if (el.isConnected && !composing.current) commit(el)
    }, 0)
  }

  return (
    <input
      ref={inputRef}
      className={styles.input}
      type="text"
      autoFocus
      autoComplete="off"
      autoCorrect="off"
      autoCapitalize="off"
      spellCheck={false}
      disabled={disabled}
      placeholder={STRINGS.placeholder}
      aria-label={STRINGS.inputLabel}
      onInput={handleInput}
      onCompositionStart={handleCompositionStart}
      onCompositionEnd={handleCompositionEnd}
    />
  )
}
