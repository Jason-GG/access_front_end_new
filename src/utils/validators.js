const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function validateEmail(email) {
  if (!email.trim()) return 'Email is required.'
  if (!EMAIL_RE.test(email.trim())) return 'Enter a valid email address.'
  return null
}

export function validatePassword(password) {
  if (!password) return 'Password is required.'
  if (password.length < 6) return 'Password must be at least 6 characters.'
  return null
}

export function validateConfirmPassword(password, confirm) {
  if (!confirm) return 'Please confirm your password.'
  if (password !== confirm) return 'Passwords do not match.'
  return null
}
