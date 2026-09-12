const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const USERNAME_RE = /^[a-zA-Z0-9_]+$/

export function validateUsername(username) {
  const trimmed = username?.trim() || ''
  if (!trimmed) return 'Username is required.'
  if (trimmed.length < 3) return 'Username must be at least 3 characters.'
  if (trimmed.length > 50) return 'Username must be at most 50 characters.'
  if (!USERNAME_RE.test(trimmed)) return 'Username can only contain letters, numbers, and underscores.'
  return null
}

export function validateEmail(email) {
  if (!email?.trim()) return 'Email is required.'
  if (!EMAIL_RE.test(email.trim())) return 'Enter a valid email address.'
  return null
}

export function validatePassword(password) {
  if (!password) return 'Password is required.'
  if (password.length < 8) return 'Password must be at least 8 characters.'
  if (password.length > 128) return 'Password cannot exceed 128 characters.'
  return null
}

export function validateConfirmPassword(password, confirm) {
  if (!confirm) return 'Please confirm your password.'
  if (password !== confirm) return 'Passwords do not match.'
  return null
}
