export function cx(...classes) {
  return classes.filter(Boolean).join(' ')
}

export function handleFromEmail(email = '') {
  return email.split('@')[0].toLowerCase() || 'guest'
}

export function formatClock(totalSeconds) {
  const clamped = Math.max(0, totalSeconds)
  const minutes = Math.floor(clamped / 60)
  const seconds = clamped % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export function formatDateTime(isoString) {
  const date = new Date(isoString)
  if (Number.isNaN(date.getTime())) return isoString
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function randomItem(list) {
  return list[Math.floor(Math.random() * list.length)]
}

export function buildRoomInviteUrl(roomPath) {
  if (typeof window === 'undefined') return roomPath
  const cleanPath = String(roomPath || '').startsWith('/') ? roomPath : `/${roomPath}`
  const basePath = (window.location.pathname || '').replace(/\/+$/, '')
  return `${window.location.origin}${basePath}/#${cleanPath}`
}

export async function copyToClipboard(text) {
  const value = String(text ?? '')
  if (!value) return false

  if (
    typeof navigator !== 'undefined' &&
    navigator.clipboard &&
    typeof navigator.clipboard.writeText === 'function' &&
    (typeof window === 'undefined' || window.isSecureContext !== false)
  ) {
    try {
      await navigator.clipboard.writeText(value)
      return true
    } catch {
      // Fall through to legacy textarea copy fallback for HTTP / restricted contexts
    }
  }

  if (typeof document !== 'undefined') {
    try {
      const textarea = document.createElement('textarea')
      textarea.value = value
      textarea.setAttribute('readonly', '')
      textarea.style.position = 'fixed'
      textarea.style.top = '-9999px'
      textarea.style.left = '-9999px'
      textarea.style.opacity = '0'
      document.body.appendChild(textarea)
      textarea.focus()
      textarea.select()
      textarea.setSelectionRange(0, value.length)
      const ok = document.execCommand('copy')
      document.body.removeChild(textarea)
      if (ok) return true
    } catch {
      // Fall through
    }
  }

  if (typeof window !== 'undefined' && typeof window.prompt === 'function') {
    window.prompt('Copy invite link:', value)
    return true
  }

  return false
}

