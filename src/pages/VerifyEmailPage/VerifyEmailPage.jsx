import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '../../components/common/Button'
import { Input } from '../../components/common/Input'
import { useAuth } from '../../hooks/useAuth'
import { ROUTES } from '../../utils/constants'
import { validateEmail } from '../../utils/validators'
import styles from './VerifyEmailPage.module.css'

export function VerifyEmailPage() {
  const [searchParams] = useSearchParams()
  const tokenFromUrl = searchParams.get('token') || ''
  const emailFromUrl = searchParams.get('email') || ''

  const { verifyEmail, resendVerification } = useAuth()
  const navigate = useNavigate()

  const [token, setToken] = useState(tokenFromUrl)
  const [resendEmail, setResendEmail] = useState(emailFromUrl)
  const [verifying, setVerifying] = useState(false)
  const [resending, setResending] = useState(false)
  const [verifySuccess, setVerifySuccess] = useState(null)
  const [verifyError, setVerifyError] = useState(null)
  const [resendSuccess, setResendSuccess] = useState(null)
  const [resendError, setResendError] = useState(null)

  // Auto-verify if token is provided via query parameter in URL
  useEffect(() => {
    if (!tokenFromUrl) return

    let cancelled = false
    async function autoVerify() {
      setVerifying(true)
      setVerifyError(null)
      try {
        const res = await verifyEmail(tokenFromUrl)
        if (!cancelled) {
          setVerifySuccess(res.message || 'Email verified successfully! You can now log in.')
        }
      } catch (err) {
        if (!cancelled) {
          setVerifyError(err.message || 'Failed to verify email token.')
        }
      } finally {
        if (!cancelled) {
          setVerifying(false)
        }
      }
    }

    autoVerify()
    return () => {
      cancelled = true
    }
  }, [tokenFromUrl, verifyEmail])

  async function handleVerifySubmit(event) {
    event.preventDefault()
    if (!token.trim()) {
      setVerifyError('Please enter a verification token.')
      return
    }

    setVerifying(true)
    setVerifyError(null)
    setVerifySuccess(null)
    try {
      const res = await verifyEmail(token.trim())
      setVerifySuccess(res.message || 'Email verified successfully! You can now log in.')
    } catch (err) {
      setVerifyError(err.message || 'Verification failed. The token may be expired or invalid.')
    } finally {
      setVerifying(false)
    }
  }

  async function handleResendSubmit(event) {
    event.preventDefault()
    const emailErr = validateEmail(resendEmail)
    if (emailErr) {
      setResendError(emailErr)
      return
    }

    setResending(true)
    setResendError(null)
    setResendSuccess(null)
    try {
      const res = await resendVerification(resendEmail.trim())
      setResendSuccess(
        res.message || 'A new verification email has been sent. Please check your inbox.',
      )
    } catch (err) {
      setResendError(err.message || 'Failed to resend verification email.')
    } finally {
      setResending(false)
    }
  }

  return (
    <section className={styles.card}>
      <p className="eyebrow">Account Activation</p>
      <h1 className={styles.title}>Verify Email</h1>

      {verifySuccess ? (
        <div>
          <p className={styles.formSuccess}>{verifySuccess}</p>
          <Button
            type="button"
            size="lg"
            className={styles.submit}
            onClick={() => navigate(ROUTES.login, { replace: true })}
          >
            Proceed to Sign In
          </Button>
        </div>
      ) : (
        <>
          <p className={styles.desc}>
            Please enter the verification token received in your email to activate your account.
          </p>

          <form onSubmit={handleVerifySubmit} noValidate>
            <Input
              id="verify-token"
              label="Verification Token"
              type="text"
              autoComplete="off"
              value={token}
              error={verifyError}
              hint="32+ character code from your activation email"
              onChange={(e) => setToken(e.target.value)}
            />

            <Button
              type="submit"
              size="lg"
              className={styles.submit}
              disabled={verifying || !token.trim()}
            >
              {verifying ? 'Verifying token…' : 'Verify Account'}
            </Button>
          </form>

          <div className={styles.resendSection}>
            <h2 className={styles.resendHeading}>Need a new verification link?</h2>
            {resendSuccess && <p className={styles.formSuccess}>{resendSuccess}</p>}
            {resendError && <p className={styles.formError}>{resendError}</p>}
            <form onSubmit={handleResendSubmit} className={styles.resendForm} noValidate>
              <Input
                id="resend-email"
                label="Email"
                type="email"
                autoComplete="email"
                value={resendEmail}
                onChange={(e) => setResendEmail(e.target.value)}
              />
              <Button type="submit" variant="secondary" size="md" disabled={resending}>
                {resending ? 'Sending…' : 'Resend Verification Email'}
              </Button>
            </form>
          </div>
        </>
      )}

      <p className={styles.switch}>
        Back to <Link to={ROUTES.login}>Sign in</Link> or{' '}
        <Link to={ROUTES.signup}>Create another account</Link>
      </p>
    </section>
  )
}

