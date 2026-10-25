import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '../../components/common/Button'
import { Input } from '../../components/common/Input'
import { useAuth } from '../../hooks/useAuth'
import { ROUTES } from '../../utils/constants'
import {
  validateConfirmPassword,
  validateEmail,
  validatePassword,
  validateUsername,
  validateVerificationCode,
} from '../../utils/validators'
import styles from './SignupPage.module.css'

export function SignupPage() {
  const { signup, sendVerificationCode, login } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState(null)
  const [codeSentMessage, setCodeSentMessage] = useState(null)
  const [sendingCode, setSendingCode] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setInterval(() => {
      setCooldown((prev) => (prev > 1 ? prev - 1 : 0))
    }, 1000)
    return () => clearInterval(timer)
  }, [cooldown])

  async function handleSendVerifyCode() {
    const emailError = validateEmail(email)
    if (emailError) {
      setErrors((prev) => ({ ...prev, email: emailError }))
      return
    }

    setErrors((prev) => ({ ...prev, email: null }))
    setFormError(null)
    setCodeSentMessage(null)
    setSendingCode(true)
    try {
      const res = await sendVerificationCode(email.trim())
      setCodeSentMessage(res?.message || `Verification code sent to ${email.trim()}.`)
      setCooldown(60)
    } catch (err) {
      setErrors((prev) => ({
        ...prev,
        email: err.message || 'Failed to send verification code.',
      }))
    } finally {
      setSendingCode(false)
    }
  }

  async function handleSignup(event) {
    event.preventDefault()

    const nextErrors = {
      email: validateEmail(email),
      code: validateVerificationCode(code),
      username: validateUsername(username),
      password: validatePassword(password),
      confirm: validateConfirmPassword(password, confirm),
    }
    setErrors(nextErrors)
    if (
      nextErrors.email ||
      nextErrors.code ||
      nextErrors.username ||
      nextErrors.password ||
      nextErrors.confirm
    ) {
      return
    }

    setSubmitting(true)
    setFormError(null)
    try {
      const result = await signup({
        username: username.trim(),
        email: email.trim(),
        password,
        code: code.trim(),
      })

      if (result.authenticated) {
        navigate(ROUTES.play, { replace: true })
        return
      }

      try {
        await login(username.trim(), password)
        navigate(ROUTES.play, { replace: true })
      } catch {
        navigate(ROUTES.login, { replace: true })
      }
    } catch (err) {
      setFormError(err.message || 'Registration failed.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className={styles.card}>
      <p className="eyebrow">Member Registration</p>
      <h1 className={styles.title}>Sign Up</h1>
      <p className={styles.desc}>
        Enter your email address and click <strong>Verify Code</strong> to receive a verification
        code, then fill it in below to complete your sign up.
      </p>

      <form onSubmit={handleSignup} noValidate>
        <div className={styles.emailVerifyRow}>
          <Input
            id="signup-email"
            className={styles.emailInput}
            label="Email Address"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            error={errors.email}
            onChange={(event) => {
              setEmail(event.target.value)
              if (errors.email) setErrors((prev) => ({ ...prev, email: null }))
            }}
          />
          <Button
            type="button"
            variant="secondary"
            size="md"
            className={styles.verifyCodeBtn}
            onClick={handleSendVerifyCode}
            disabled={sendingCode || cooldown > 0 || !email.trim()}
          >
            {sendingCode
              ? 'Sending…'
              : cooldown > 0
                ? `Verify Code (${cooldown}s)`
                : 'Verify Code'}
          </Button>
        </div>

        {codeSentMessage && (
          <p className={styles.formSuccess} role="status">
            {codeSentMessage}
          </p>
        )}

        <Input
          id="signup-code"
          label="Verification Code"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="Enter verification code from email"
          value={code}
          error={errors.code}
          onChange={(event) => {
            setCode(event.target.value)
            if (errors.code) setErrors((prev) => ({ ...prev, code: null }))
          }}
        />

        <Input
          id="signup-username"
          label="Username"
          type="text"
          autoComplete="username"
          value={username}
          error={errors.username}
          hint="3–50 characters (letters, numbers, underscores)"
          onChange={(event) => {
            setUsername(event.target.value)
            if (errors.username) setErrors((prev) => ({ ...prev, username: null }))
          }}
        />

        <Input
          id="signup-password"
          label="Password"
          type="password"
          autoComplete="new-password"
          value={password}
          error={errors.password}
          hint="At least 8 characters."
          onChange={(event) => {
            setPassword(event.target.value)
            if (errors.password) setErrors((prev) => ({ ...prev, password: null }))
          }}
        />

        <Input
          id="signup-confirm"
          label="Confirm Password"
          type="password"
          autoComplete="new-password"
          value={confirm}
          error={errors.confirm}
          onChange={(event) => {
            setConfirm(event.target.value)
            if (errors.confirm) setErrors((prev) => ({ ...prev, confirm: null }))
          }}
        />

        {formError && (
          <p className={styles.formError} role="alert">
            {formError}
          </p>
        )}

        <Button type="submit" size="lg" className={styles.submit} disabled={submitting}>
          {submitting ? 'Signing up…' : 'Sign Up'}
        </Button>
      </form>

      <p className={styles.switch}>
        Already a member? <Link to={ROUTES.login}>Log in</Link>
      </p>
    </section>
  )
}
