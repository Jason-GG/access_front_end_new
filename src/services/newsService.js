import { NEWS_SOURCES, newsItems } from '../data/news'
import { httpClient } from './request'

const NAMED_ENTITIES = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  ndash: '–',
  mdash: '—',
  euro: '€',
  rsquo: '’',
  lsquo: '‘',
  rdquo: '”',
  ldquo: '“',
  hellip: '…',
  frac12: '½',
}

function decodeEntitiesOnce(text = '') {
  return String(text)
    .replace(/&#x([0-9a-fA-F]+);/g, (_m, hex) => {
      const code = parseInt(hex, 16)
      return Number.isFinite(code) ? String.fromCodePoint(code) : _m
    })
    .replace(/&#(\d+);/g, (_m, dec) => {
      const code = parseInt(dec, 10)
      return Number.isFinite(code) ? String.fromCodePoint(code) : _m
    })
    .replace(/&([a-zA-Z0-9]+);/g, (full, name) => NAMED_ENTITIES[name] ?? full)
}

export function cleanNewsText(raw = '') {
  if (!raw) return ''
  const withoutCdata = String(raw).replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
  const decoded = decodeEntitiesOnce(decodeEntitiesOnce(withoutCdata))
  return decoded
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function normalizeNewsItem(item, index = 0) {
  const isChessCom =
    /chess\.com/i.test(item?.source || '') ||
    /chess\.com/i.test(item?.category || '') ||
    /chess\.com/i.test(item?.url || '') ||
    /chess\.com/i.test(item?.link || '')

  const source = isChessCom ? NEWS_SOURCES.chesscom.name : NEWS_SOURCES.chessbase.name
  const sourceUrl = isChessCom ? NEWS_SOURCES.chesscom.url : NEWS_SOURCES.chessbase.url
  const rawUrl = item?.url || item?.link || item?.guid || sourceUrl
  const url = /^https?:\/\//i.test(rawUrl) ? rawUrl : sourceUrl

  const rawDate = item?.publishedAt || item?.pubDate || item?.date || ''
  const parsedDate = rawDate ? new Date(rawDate) : null
  const validDate = parsedDate && !Number.isNaN(parsedDate.getTime()) ? parsedDate : null
  const dateStr =
    typeof item?.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(item.date)
      ? item.date
      : validDate
        ? validDate.toISOString().slice(0, 10)
        : new Date().toISOString().slice(0, 10)

  return {
    id: item?.id || `${source.toLowerCase()}-${index}-${url}`,
    title: cleanNewsText(item?.title || 'Latest Chess News'),
    summary: cleanNewsText(
      item?.summary || item?.description || `Read the latest chess coverage on ${source}.`,
    ),
    category: item?.category || (isChessCom ? 'Chess.com News' : 'ChessBase'),
    source,
    sourceUrl,
    url,
    date: dateStr,
    publishedAt: validDate ? validDate.toISOString() : dateStr,
    author: item?.author || source,
  }
}

function interleaveBySource(items) {
  const cb = items.filter((i) => i.source === 'ChessBase')
  const cc = items.filter((i) => i.source === 'Chess.com')
  const others = items.filter((i) => i.source !== 'ChessBase' && i.source !== 'Chess.com')

  const result = []
  const maxLen = Math.max(cb.length, cc.length)
  for (let i = 0; i < maxLen; i += 1) {
    if (i < cb.length) result.push(cb[i])
    if (i < cc.length) result.push(cc[i])
  }
  return [...result, ...others]
}

async function fetchRssViaPublicJson(feedUrl, sourceMeta) {
  const endpoint = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feedUrl)}`
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 6000)
  try {
    const res = await fetch(endpoint, { signal: controller.signal })
    if (!res.ok) throw new Error(`Status ${res.status}`)
    const data = await res.json()
    if (!Array.isArray(data?.items) || data.items.length === 0) {
      throw new Error('Empty RSS items')
    }
    return data.items.slice(0, 8).map((entry, idx) =>
      normalizeNewsItem(
        {
          id: `${sourceMeta.name.toLowerCase()}-${entry.guid || entry.link || idx}`,
          title: entry.title,
          summary: entry.description || entry.content,
          url: entry.link || sourceMeta.url,
          source: sourceMeta.name,
          sourceUrl: sourceMeta.url,
          category: sourceMeta.name === 'Chess.com' ? 'Chess.com News' : 'ChessBase',
          author: sourceMeta.name,
          pubDate: entry.pubDate,
        },
        idx,
      ),
    )
  } finally {
    clearTimeout(timer)
  }
}

export async function fetchNews({ forceRefresh = false } = {}) {
  // 1. Primary path: fetch from the achess backend /news endpoint
  try {
    const query = forceRefresh ? '/news?refresh=1' : '/news'
    const response = await httpClient.get(query, { skipAuth: true, retryOnAuthFailure: false })
    const rawList = Array.isArray(response) ? response : response?.items
    if (Array.isArray(rawList) && rawList.length > 0) {
      return rawList.map((item, idx) => normalizeNewsItem(item, idx))
    }
  } catch {
    // Fall through to live RSS / fallback
  }

  // 2. Secondary path: fetch live RSS feeds directly if backend /news is not reachable
  try {
    const [cbRes, ccRes] = await Promise.allSettled([
      fetchRssViaPublicJson(NEWS_SOURCES.chessbase.feedUrl, NEWS_SOURCES.chessbase),
      fetchRssViaPublicJson(NEWS_SOURCES.chesscom.feedUrl, NEWS_SOURCES.chesscom),
    ])

    const cbItems =
      cbRes.status === 'fulfilled' && cbRes.value.length > 0
        ? cbRes.value
        : newsItems.filter((i) => i.source === 'ChessBase').map(normalizeNewsItem)

    const ccItems =
      ccRes.status === 'fulfilled' && ccRes.value.length > 0
        ? ccRes.value
        : newsItems.filter((i) => i.source === 'Chess.com').map(normalizeNewsItem)

    const combined = interleaveBySource([...cbItems, ...ccItems])
    if (combined.length > 0) {
      return combined
    }
  } catch {
    // Fall through to curated latest news items
  }

  // 3. Fallback: latest curated items from ChessBase and Chess.com
  return newsItems.map((item, idx) => normalizeNewsItem(item, idx))
}
