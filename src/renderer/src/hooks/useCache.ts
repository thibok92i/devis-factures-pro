/**
 * Simple in-memory cache with TTL for frequently used data.
 * Avoids repetitive IPC/SQL calls for catalogue, clients, settings, etc.
 */

interface CacheEntry<T = unknown> {
  data: T
  expiry: number
}

const cache = new Map<string, CacheEntry>()

/**
 * Get a cached value by key. Returns null if expired or not found.
 */
export function getCached<T>(key: string): T | null {
  const entry = cache.get(key)
  if (!entry) return null
  if (Date.now() > entry.expiry) {
    cache.delete(key)
    return null
  }
  return entry.data as T
}

/**
 * Set a value in the cache with a TTL.
 * @param key - Cache key
 * @param data - Data to cache
 * @param ttlMs - Time-to-live in milliseconds (default: 30s)
 */
export function setCache<T>(key: string, data: T, ttlMs = 30000): void {
  cache.set(key, { data, expiry: Date.now() + ttlMs })
}

/**
 * Invalidate (delete) cache entries.
 * @param prefix - If provided, only entries with keys starting with this prefix are deleted.
 *                 If omitted, ALL cache entries are cleared.
 */
export function invalidateCache(prefix?: string): void {
  if (!prefix) {
    cache.clear()
    return
  }
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) {
      cache.delete(key)
    }
  }
}

/**
 * React hook for cached async data fetching.
 * Wraps a fetch function with automatic caching.
 *
 * @example
 * const { data: clients, refresh } = useCachedData('clients', () => api.getClients())
 */
import { useState, useEffect, useCallback } from 'react'

interface UseCachedDataResult<T> {
  data: T | null
  loading: boolean
  error: string | null
  refresh: () => void
}

export function useCachedData<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlMs = 30000
): UseCachedDataResult<T> {
  const [data, setData] = useState<T | null>(() => getCached<T>(key))
  const [loading, setLoading] = useState(!getCached<T>(key))
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    // Check cache first
    const cached = getCached<T>(key)
    if (cached) {
      setData(cached)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const result = await fetcher()
      setCache(key, result, ttlMs)
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }, [key, fetcher, ttlMs])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const refresh = useCallback(() => {
    invalidateCache(key)
    fetchData()
  }, [key, fetchData])

  return { data, loading, error, refresh }
}
