import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Footer } from '../components/common/Footer'
import { Navbar } from '../components/common/Navbar'

const BUNDLE_RELOAD_GUARD_KEY = 'access-chess:bundle-reload'

async function reloadIfNewBundleDeployed() {
  if (!import.meta.env.PROD || typeof window === 'undefined' || typeof document === 'undefined') {
    return
  }
  try {
    const currentScript = Array.from(document.querySelectorAll('script[type="module"][src]'))
      .map((el) => el.getAttribute('src') || '')
      .find((src) => src.includes('/assets/index-'))
    if (!currentScript) return

    const res = await fetch(`./index.html?_t=${Date.now()}`, { cache: 'no-store' })
    if (!res.ok) return
    const html = await res.text()
    const match = html.match(/\/assets\/index-[A-Za-z0-9_-]+\.js/)
    const latestScript = match?.[0]
    if (!latestScript || currentScript.endsWith(latestScript)) return

    if (sessionStorage.getItem(BUNDLE_RELOAD_GUARD_KEY) === latestScript) return
    sessionStorage.setItem(BUNDLE_RELOAD_GUARD_KEY, latestScript)
    window.location.reload()
  } catch {
    // Ignore transient network errors
  }
}

export function AppLayout() {
  const location = useLocation()

  useEffect(() => {
    reloadIfNewBundleDeployed()
  }, [location.pathname])

  useEffect(() => {
    if (!import.meta.env.PROD || typeof document === 'undefined') return undefined
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        reloadIfNewBundleDeployed()
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [])

  return (
    <>
      <Navbar />
      <main>
        <Outlet />
      </main>
      <Footer />
    </>
  )
}
