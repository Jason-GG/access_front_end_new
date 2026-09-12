import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Button } from '../../components/common/Button'
import { Input } from '../../components/common/Input'
import { useAuth } from '../../hooks/useAuth'
import { ROUTES } from '../../utils/constants'
import { validatePassword } from '../../utils/validators'
import styles from './LoginPage.module.css'

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState(null)
  const [isUnverified, setIsUnverified] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const from = location.state?.from?.pathname || ROUTES.play

  async function handleSubmit(event) {
    event.preventDefault()

    const trimmedUsername = username.trim()
    const nextErrors = {
      username: !trimmedUsername ? 'Username is required.' : null,
      password: validatePassword(password),
    }
    setErrors(nextErrors)
    if (nextErrors.username || nextErrors.password) return

    setSubmitting(true)
    setFormError(null)
    setIsUnverified(false)
    try {
      await login(trimmedUsername, password)
      navigate(from, { replace: true })
    } catch (err) {
      if (err.isEmailNotVerified || err.status === 403) {
        setIsUnverified(true)
      } else {
        setFormError(err.message || 'Incorrect username or password.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className={styles.card}>
      <p className="eyebrow">Member entrance</p>
      <h1 className={styles.title}>Welcome back</h1>

      {isUnverified && (
        <div className={styles.unverifiedNotice} role="alert">
          <p>
            <strong>Email Not Verified:</strong> You must verify your email address before signing
            in.
          </p>
          <Link to={ROUTES.verifyEmail} className={styles.unverifiedLink}>
            Enter verification token &rarr;
          </Link>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <Input
          id="login-username"
          label="Username"
          type="text"
          autoComplete="username"
          value={username}
          error={errors.username}
          onChange={(event) => setUsername(event.target.value)}
        />
        <Input
          id="login-password"
          label="Password"
          type="password"
          autoComplete="current-password"
          value={password}
          error={errors.password}
          onChange={(event) => setPassword(event.target.value)}
        />

        {formError && (
          <p className={styles.formError} role="alert">
            {formError}
          </p>
        )}

        <Button type="submit" size="lg" className={styles.submit} disabled={submitting}>
          {submitting ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>

      <p className={styles.switch}>
        New to the club? <Link to={ROUTES.signup}>Create an account</Link>
      </p>
    </section>
  )
}
