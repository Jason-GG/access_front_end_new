import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '../../components/common/Button'
import { Input } from '../../components/common/Input'
import { useAuth } from '../../hooks/useAuth'
import { ROUTES } from '../../utils/constants'
import {
  validateConfirmPassword,
  validateEmail,
  validatePassword,
} from '../../utils/validators'
import styles from './SignupPage.module.css'

export function SignupPage() {
  const { signup } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()

    const nextErrors = {
      email: validateEmail(email),
      password: validatePassword(password),
      confirm: validateConfirmPassword(password, confirm),
    }
    setErrors(nextErrors)
    if (nextErrors.email || nextErrors.password || nextErrors.confirm) return

    setSubmitting(true)
    setFormError(null)
    try {
      await signup(email, password)
      navigate(ROUTES.play, { replace: true })
    } catch (err) {
      setFormError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className={styles.card}>
      <p className="eyebrow">Member registration</p>
      <h1 className={styles.title}>Take a seat</h1>
      <form onSubmit={handleSubmit} noValidate>
        <Input
          id="signup-email"
          label="Email"
          type="email"
          autoComplete="email"
          value={email}
          error={errors.email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <Input
          id="signup-password"
          label="Password"
          type="password"
          autoComplete="new-password"
          value={password}
          error={errors.password}
          hint="At least 6 characters."
          onChange={(event) => setPassword(event.target.value)}
        />
        <Input
          id="signup-confirm"
          label="Confirm password"
          type="password"
          autoComplete="new-password"
          value={confirm}
          error={errors.confirm}
          onChange={(event) => setConfirm(event.target.value)}
        />

        {formError && (
          <p className={styles.formError} role="alert">
            {formError}
          </p>
        )}

        <Button type="submit" size="lg" className={styles.submit} disabled={submitting}>
          {submitting ? 'Creating account…' : 'Create account'}
        </Button>
      </form>

      <p className={styles.switch}>
        Already a member? <Link to={ROUTES.login}>Log in</Link>
      </p>
      <p className={styles.note}>
        Demo build: accounts are stored locally in your browser until a real backend is
        connected.
      </p>
    </section>
  )
}
