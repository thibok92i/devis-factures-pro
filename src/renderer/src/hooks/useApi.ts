import { useState, useEffect, useCallback } from 'react'

/**
 * Generic hook for calling IPC API methods with loading/error state.
 */
export function useApiCall<T>() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const execute = useCallback(async (fn: () => Promise<T>): Promise<T> => {
    setLoading(true)
    setError(null)
    try {
      const result = await fn()
      // Detect backend validation errors ({ success: false, error: "..." })
      if (
        result != null &&
        typeof result === 'object' &&
        'success' in (result as object) &&
        (result as Record<string, unknown>).success === false
      ) {
        throw new Error(String((result as Record<string, unknown>).error || 'Erreur de validation'))
      }
      return result
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Une erreur est survenue'
      setError(message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  return { loading, error, execute }
}

/**
 * Hook for fetching data on mount with auto-refresh.
 */
export function useApiData<T>(fn: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await fn()
      setData(result)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Une erreur est survenue'
      setError(message)
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  useEffect(() => {
    refresh()
  }, [refresh])

  return { data, loading, error, refresh, setData }
}
