import { useCallback, useEffect, useState } from 'react'
import { newsItems } from '../data/news'
import { fetchNews, normalizeNewsItem } from '../services/newsService'

const DEFAULT_POLL_INTERVAL_MS = 5 * 60 * 1000 // Regularly refresh every 5 minutes

export function useFetchNews({ pollIntervalMs = DEFAULT_POLL_INTERVAL_MS } = {}) {
  const [news, setNews] = useState(() => newsItems.map((item, idx) => normalizeNewsItem(item, idx)))
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async ({ forceRefresh = false, silent = false } = {}) => {
    if (!silent) setLoading(true)
    setError(null)
    try {
      const items = await fetchNews({ forceRefresh })
      if (Array.isArray(items) && items.length > 0) {
        setNews(items)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      if (!silent) setLoading(false)
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    fetchNews()
      .then((items) => {
        if (!cancelled && Array.isArray(items) && items.length > 0) {
          setNews(items)
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err.message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    let intervalId = null
    if (pollIntervalMs && pollIntervalMs > 0) {
      intervalId = setInterval(() => {
        fetchNews({ forceRefresh: true })
          .then((items) => {
            if (!cancelled && Array.isArray(items) && items.length > 0) {
              setNews(items)
            }
          })
          .catch(() => {
            // Keep existing items on silent background poll failure
          })
      }, pollIntervalMs)
    }

    return () => {
      cancelled = true
      if (intervalId) clearInterval(intervalId)
    }
  }, [pollIntervalMs])

  return {
    news,
    loading,
    error,
    refetch: () => load({ forceRefresh: true }),
  }
}
