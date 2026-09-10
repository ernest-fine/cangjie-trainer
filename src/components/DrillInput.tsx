import type { CompositionEvent, FormEvent, RefObject } from 'react'
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
  const handleInput = (e: FormEvent<HTMLInputElement>) => {
    const native = e.nativeEvent as InputEvent
    onValue(e.currentTarget.value, native.isComposing === true)
  }

  const handleCompositionEnd = (e: CompositionEvent<HTMLInputElement>) => {
    onValue(e.currentTarget.value, false)
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
      aria-label="Type the characters shown above"
      onInput={handleInput}
      onCompositionEnd={handleCompositionEnd}
    />
  )
}
