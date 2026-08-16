import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Button } from '../../components/common/Button'
import { Input } from '../../components/common/Input'
import { useAuth } from '../../hooks/useAuth'
import { ROUTES } from '../../utils/constants'
import { validateEmail, validatePassword } from '../../utils/validators'
import styles from './LoginPage.module.css'

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const from = location.state?.from?.pathname || ROUTES.play

  async function handleSubmit(event) {
    event.preventDefault()

    const nextErrors = {
      email: validateEmail(email),
      password: validatePassword(password),
    }
    setErrors(nextErrors)
    if (nextErrors.email || nextErrors.password) return

    setSubmitting(true)
    setFormError(null)
    try {
      await login(email, password)
      navigate(from, { replace: true })
    } catch (err) {
      setFormError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className={styles.card}>
      <p className="eyebrow">Member entrance</p>
      <h1 className={styles.title}>Welcome back</h1>
      <form onSubmit={handleSubmit} noValidate>
        <Input
          id="login-email"
          label="Email"
          type="email"
          autoComplete="email"
          value={email}
          error={errors.email}
          onChange={(event) => setEmail(event.target.value)}
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
