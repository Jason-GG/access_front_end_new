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
