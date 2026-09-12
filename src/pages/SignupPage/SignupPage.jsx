import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '../../components/common/Button'
import { Input } from '../../components/common/Input'
import { useAuth } from '../../hooks/useAuth'
import { ROUTES } from '../../utils/constants'
import { cx } from '../../utils/helpers'
import {
  validateConfirmPassword,
  validateEmail,
  validatePassword,
  validateUsername,
} from '../../utils/validators'
import styles from './SignupPage.module.css'

export function SignupPage() {
  const { signup, verifyEmail, login, resendVerification } = useAuth()
  const navigate = useNavigate()

  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  // Step 2 state: Email verification before account activation
  const [registeredData, setRegisteredData] = useState(null)
  const [token, setToken] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [verifySuccess, setVerifySuccess] = useState(null)
  const [verifyError, setVerifyError] = useState(null)
  const [resending, setResending] = useState(false)
  const [resendMessage, setResendMessage] = useState(null)

  async function handleRegisterStep(event) {
    event.preventDefault()

    const nextErrors = {
      username: validateUsername(username),
      email: validateEmail(email),
      password: validatePassword(password),
      confirm: validateConfirmPassword(password, confirm),
    }
    setErrors(nextErrors)
    if (nextErrors.username || nextErrors.email || nextErrors.password || nextErrors.confirm) return

    setSubmitting(true)
    setFormError(null)
    try {
      const result = await signup({
        username: username.trim(),
        email: email.trim(),
        password,
      })
      setRegisteredData({
        username: username.trim(),
        email: email.trim(),
        message: result.message,
      })
    } catch (err) {
      setFormError(err.message || 'Registration failed.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleVerifyStep(event) {
    event.preventDefault()
    if (!token.trim()) {
      setVerifyError('Please enter your email verification token.')
      return
    }

    setVerifying(true)
    setVerifyError(null)
    setVerifySuccess(null)
    try {
      // 1. Verify email address on backend
      await verifyEmail(token.trim())
      setVerifySuccess('Email verified successfully! Logging you into the platform…')

      // 2. Automatically log the newly verified user into the platform
      try {
        await login(registeredData.username, password)
        navigate(ROUTES.play, { replace: true })
      } catch {
        // If auto-login fails, redirect to manual login
        navigate(ROUTES.login, { replace: true })
      }
    } catch (err) {
      setVerifyError(
        err.message || 'Verification failed. Please ensure the token is correct and unexpired.',
      )
    } finally {
      setVerifying(false)
    }
  }

  async function handleResend() {
    if (!registeredData?.email) return
    setResending(true)
    setResendMessage(null)
    try {
      const res = await resendVerification(registeredData.email)
      setResendMessage(res.message || 'New verification email sent!')
    } catch (err) {
      setVerifyError(err.message || 'Could not resend verification email.')
    } finally {
      setResending(false)
    }
  }

  // Step 2: Email Verification (Mandatory before platform access)
  if (registeredData) {
    return (
      <section className={styles.card}>
        <div className={styles.stepsBar}>
          <div className={cx(styles.stepBadge, styles.stepBadgeCompleted)}>
            ✓ 1. Account Details
          </div>
          <div className={cx(styles.stepBadge, styles.stepBadgeActive)}>
            2. Verify Email (Required)
          </div>
        </div>

        <p className="eyebrow">Step 2 of 2: Email Verification</p>
        <h1 className={styles.title}>Verify Email Address</h1>

        {verifySuccess ? (
          <div>
            <p className={styles.formSuccess}>{verifySuccess}</p>
            <Button
              type="button"
              size="lg"
              className={styles.submit}
              onClick={() => navigate(ROUTES.login, { replace: true })}
            >
              Enter Platform
            </Button>
          </div>
        ) : (
          <div>
            <div className={styles.infoBox}>
              <p>
                Verification code sent to <strong>{registeredData.email}</strong>.
              </p>
              <p>
                To complete registration for <strong>{registeredData.username}</strong>, you must
                verify your email address before logging in.
              </p>
            </div>

            <form onSubmit={handleVerifyStep} className={styles.verifySection} noValidate>
              <Input
                id="signup-token"
                label="Verification Token"
                type="text"
                autoComplete="off"
                placeholder="Enter 32+ character verification token"
                value={token}
                error={verifyError}
                onChange={(e) => setToken(e.target.value)}
              />

              <Button
                type="submit"
                size="lg"
                className={styles.submit}
                disabled={verifying || !token.trim()}
              >
                {verifying ? 'Verifying & logging in…' : 'Verify Email & Complete Registration'}
              </Button>
            </form>

            <div className={styles.resendRow}>
              <span>Didn&apos;t receive the code?</span>
              <button
                type="button"
                className={styles.resendBtn}
                onClick={handleResend}
                disabled={resending}
              >
                {resending ? 'Sending…' : 'Resend Email'}
              </button>
            </div>
            {resendMessage && <p className={styles.formSuccess}>{resendMessage}</p>}

            <p className={styles.switch}>
              Already verified in another tab? <Link to={ROUTES.login}>Log in here</Link>
            </p>
          </div>
        )}
      </section>
    )
  }

  // Step 1: Initial Registration Form
  return (
    <section className={styles.card}>
      <div className={styles.stepsBar}>
        <div className={cx(styles.stepBadge, styles.stepBadgeActive)}>1. Account Details</div>
        <div className={styles.stepBadge}>2. Verify Email (Required)</div>
      </div>

      <p className="eyebrow">Member Registration</p>
      <h1 className={styles.title}>Create Account</h1>
      <p className={styles.desc}>
        Registration requires a valid email address. You will verify your email in Step 2 before
        accessing the platform.
      </p>

      <form onSubmit={handleRegisterStep} noValidate>
        <Input
          id="signup-email"
          label="Email Address"
          type="email"
          autoComplete="email"
          value={email}
          error={errors.email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <Input
          id="signup-username"
          label="Username"
          type="text"
          autoComplete="username"
          value={username}
          error={errors.username}
          hint="3–50 characters (letters, numbers, underscores)"
          onChange={(event) => setUsername(event.target.value)}
        />
        <Input
          id="signup-password"
          label="Password"
          type="password"
          autoComplete="new-password"
          value={password}
          error={errors.password}
          hint="At least 8 characters."
          onChange={(event) => setPassword(event.target.value)}
        />
        <Input
          id="signup-confirm"
          label="Confirm Password"
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
          {submitting ? 'Registering account…' : 'Continue to Email Verification →'}
        </Button>
      </form>

      <p className={styles.switch}>
        Already a member? <Link to={ROUTES.login}>Log in</Link>
      </p>
      <p className={styles.note}>
        Already have a verification code? <Link to={ROUTES.verifyEmail}>Verify email</Link>
      </p>
    </section>
  )
}
