import { useRef, useCallback, useEffect } from 'react'

/**
 * Returns a debounced version of the provided callback.
 * The callback is only invoked after `delay` ms of inactivity.
 *
 * @param callback - The function to debounce
 * @param delay - Debounce delay in milliseconds (default: 300)
 * @returns A stable debounced function
 *
 * @example
 * const debouncedSave = useDebounce((value: string) => {
 *   api.save(value)
 * }, 500)
 *
 * <input onChange={(e) => debouncedSave(e.target.value)} />
 */
export function useDebounce<T extends (...args: never[]) => void>(
  callback: T,
  delay = 300
): (...args: Parameters<T>) => void {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const callbackRef = useRef(callback)

  // Always keep the latest callback ref
  callbackRef.current = callback

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  return useCallback(
    (...args: Parameters<T>) => {
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        callbackRef.current(...args)
      }, delay)
    },
    [delay]
  )
}

/**
 * Returns a debounced value. Updates only after `delay` ms of inactivity.
 *
 * @param value - The value to debounce
 * @param delay - Debounce delay in milliseconds (default: 300)
 * @returns The debounced value
 *
 * @example
 * const [search, setSearch] = useState('')
 * const debouncedSearch = useDebouncedValue(search, 400)
 *
 * useEffect(() => { api.search(debouncedSearch) }, [debouncedSearch])
 */
import { useState } from 'react'

export function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])

  return debouncedValue
}
