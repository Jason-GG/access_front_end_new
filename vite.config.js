import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

const CHESSBASE_FEED_URL = 'https://en.chessbase.com/feed'
const CHESSBASE_HOME_URL = 'https://en.chessbase.com/'
const CHESSCOM_FEED_URL = 'https://www.chess.com/rss/news'
const CHESSCOM_NEWS_URL = 'https://www.chess.com/news'
const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

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

function decodeOnce(input = '') {
  return String(input)
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

function cleanRssText(raw = '') {
  if (!raw) return ''
  const withoutCdata = String(raw).replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
  return decodeOnce(decodeOnce(withoutCdata))
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function extractTag(block, tag) {
  const match = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, 'i').exec(block)
  return match ? cleanRssText(match[1]) : ''
}

function parseRssXml(xml, source, sourceUrl, max = 10) {
  const items = []
  const regex = /<item(?:\s[^>]*)?>([\s\S]*?)<\/item>/gi
  let match
  while ((match = regex.exec(xml)) !== null && items.length < max) {
    const block = match[1]
    const title = extractTag(block, 'title')
    if (!title) continue
    const summary = extractTag(block, 'description') || `Latest chess news from ${source}.`
    const link = extractTag(block, 'link') || extractTag(block, 'guid') || sourceUrl
    const pubDate = extractTag(block, 'pubDate')
    const parsed = pubDate ? new Date(pubDate) : new Date()
    const valid = Number.isNaN(parsed.getTime()) ? new Date() : parsed
    const iso = valid.toISOString()

    items.push({
      id: `${source.toLowerCase().replace(/[^a-z0-9]/g, '')}-${items.length}-${link}`,
      title,
      summary,
      url: /^https?:\/\//i.test(link) ? link : sourceUrl,
      source,
      sourceUrl,
      category: source === 'ChessBase' ? 'ChessBase' : 'Chess.com News',
      author: source,
      date: iso.slice(0, 10),
      publishedAt: iso,
    })
  }
  return items
}

function liveChessNewsPlugin() {
  let cache = { items: [], updatedAt: 0 }
  const TTL_MS = 5 * 60 * 1000

  return {
    name: 'achess-live-news-middleware',
    configureServer(server) {
      server.middlewares.use('/api/news', async (req, res, next) => {
        if (req.method !== 'GET') return next()
        try {
          const force = req.url?.includes('refresh=1') || req.url?.includes('refresh=true')
          if (force || Date.now() - cache.updatedAt > TTL_MS || cache.items.length === 0) {
            const fetchFeed = async (url) => {
              const r = await fetch(url, {
                headers: {
                  'User-Agent': BROWSER_UA,
                  Accept: 'application/rss+xml, application/xml, text/xml, */*',
                },
              })
              if (!r.ok) throw new Error(`HTTP ${r.status}`)
              return r.text()
            }

            const [cbRes, ccRes] = await Promise.allSettled([
              fetchFeed(CHESSBASE_FEED_URL),
              fetchFeed(CHESSCOM_FEED_URL),
            ])

            const cbItems =
              cbRes.status === 'fulfilled'
                ? parseRssXml(cbRes.value, 'ChessBase', CHESSBASE_HOME_URL, 10)
                : []
            const ccItems =
              ccRes.status === 'fulfilled'
                ? parseRssXml(ccRes.value, 'Chess.com', CHESSCOM_NEWS_URL, 10)
                : []

            const interleaved = []
            const maxLen = Math.max(cbItems.length, ccItems.length)
            for (let i = 0; i < maxLen; i += 1) {
              if (i < cbItems.length) interleaved.push(cbItems[i])
              if (i < ccItems.length) interleaved.push(ccItems[i])
            }

            if (interleaved.length > 0) {
              cache = { items: interleaved, updatedAt: Date.now() }
            }
          }

          if (cache.items.length > 0) {
            res.setHeader('Content-Type', 'application/json; charset=utf-8')
            res.end(
              JSON.stringify({
                items: cache.items,
                updatedAt: new Date(cache.updatedAt).toISOString(),
                sources: [
                  { name: 'ChessBase', url: CHESSBASE_HOME_URL },
                  { name: 'Chess.com', url: CHESSCOM_NEWS_URL },
                ],
              }),
            )
            return
          }
        } catch {
          // Fall through to backend proxy if local RSS fetch fails
        }
        return next()
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const defaultBackend =
    mode === 'production' ? 'http://139.159.186.80:3000' : 'https://achess-dev.wguan.dpdns.org'
  const backend = env.VITE_BACKEND_URL || defaultBackend

  return {
    plugins: [react(), liveChessNewsPlugin()],
    server: {
      proxy: {
        '/api': {
          target: backend,
          changeOrigin: true,
          ws: true,
          rewrite: (path) => path.replace(/^\/api/, ''),
        },
      },
    },
  }
})
