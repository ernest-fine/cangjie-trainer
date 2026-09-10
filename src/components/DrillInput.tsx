import type { CompositionEvent, FormEvent, RefObject } from 'react'
import { useRef } from 'react'
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

  const handleInput = (e: FormEvent<HTMLInputElement>) => {
    const native = e.nativeEvent as InputEvent
    onValue(e.currentTarget.value, native.isComposing === true)
  }

  const handleCompositionStart = () => {
    composing.current = true
  }

  const handleCompositionEnd = (e: CompositionEvent<HTMLInputElement>) => {
    composing.current = false
    const el = e.currentTarget
    onValue(el.value, false)
    // Some browsers fire compositionend before the committed text lands in
    // the DOM. Re-read on the next task, unless a new composition began or
    // the element was remounted meanwhile. Repeated values are idempotent.
    setTimeout(() => {
      if (el.isConnected && !composing.current) onValue(el.value, false)
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
      placeholder="在此輸入"
      lang="zh-Hant"
      aria-label="Type the characters shown above"
      onInput={handleInput}
      onCompositionStart={handleCompositionStart}
      onCompositionEnd={handleCompositionEnd}
    />
  )
}
