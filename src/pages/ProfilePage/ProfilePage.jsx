import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { WhiteRedEaredFox } from '../../components/chess/pieces/FoxPieceIcons'
import { Button } from '../../components/common/Button'
import { useAuth } from '../../hooks/useAuth'
import * as authService from '../../services/authService'
import { ROUTES } from '../../utils/constants'
import { cx, formatDateTime, isAdminUser, normalizeUserRole } from '../../utils/helpers'
import styles from './ProfilePage.module.css'

export function ProfilePage() {
  const { user, score, updateProfile, refreshUser } = useAuth()
  const navigate = useNavigate()

  const [profileData, setProfileData] = useState(null)
  const [loadingProfile, setLoadingProfile] = useState(true)

  const [username, setUsername] = useState(user?.username || '')
  const [email, setEmail] = useState(user?.email || '')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [saving, setSaving] = useState(false)
  const [statusMessage, setStatusMessage] = useState(null)
  const [errorMessage, setErrorMessage] = useState(null)

  useEffect(() => {
    if (user) {
      setUsername((prev) => prev || user.username || '')
      setEmail((prev) => prev || user.email || '')
    }
  }, [user])

  useEffect(() => {
    let active = true
    async function loadProfile() {
      setLoadingProfile(true)
      try {
        const full = await authService.fetchFullProfile()
        if (!active) return
        setProfileData(full)
        if (full?.user) {
          setUsername(full.user.username || '')
          setEmail(full.user.email || '')
        }
      } catch {
        try {
          const fallbackUser = await refreshUser()
          if (active && fallbackUser) {
            setUsername(fallbackUser.username || '')
            setEmail(fallbackUser.email || '')
          }
        } catch {
          // ignore
        }
      } finally {
        if (active) setLoadingProfile(false)
      }
    }
    loadProfile()
    return () => {
      active = false
    }
  }, [refreshUser])

  const displayUser = profileData?.user || user || {}
  const displayName = displayUser.username || user?.username || 'Player'
  const userInitial = String(displayName).trim().charAt(0).toUpperCase() || 'P'
  const numericScore =
    typeof displayUser.score === 'number'
      ? displayUser.score
      : typeof score === 'number'
        ? score
        : 500
  const isZeroScore = numericScore <= 0
  const stats = displayUser.stats || user?.stats || { wins: 0, losses: 0, draws: 0, games: 0 }
  const totalGames = stats.games ?? (stats.wins || 0) + (stats.losses || 0) + (stats.draws || 0)
  const winRate =
    profileData?.dashboard?.winRate ??
    (totalGames > 0 ? Math.round(((stats.wins || 0) / totalGames) * 100) : 0)
  const recentGames = Array.isArray(profileData?.recentGames) ? profileData.recentGames : []

  async function handleSubmit(event) {
    event.preventDefault()
    setStatusMessage(null)
    setErrorMessage(null)

    const trimmedUsername = username.trim()
    const trimmedEmail = email.trim().toLowerCase()

    if (trimmedUsername.length < 3) {
      setErrorMessage('Username must be at least 3 characters.')
      return
    }
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      setErrorMessage('Please enter a valid email address.')
      return
    }
    if (newPassword || confirmPassword) {
      if (newPassword.length < 8) {
        setErrorMessage('New password must be at least 8 characters.')
        return
      }
      if (newPassword !== confirmPassword) {
        setErrorMessage('New password and confirmation do not match.')
        return
      }
      if (!currentPassword) {
        setErrorMessage('Please enter your current password to set a new password.')
        return
      }
    }

    setSaving(true)
    try {
      const payload = {
        username: trimmedUsername,
        email: trimmedEmail,
      }
      if (newPassword) {
        payload.currentPassword = currentPassword
        payload.newPassword = newPassword
      }

      const result = await updateProfile(payload)
      setStatusMessage(result?.message || 'Profile updated successfully.')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')

      if (result?.user) {
        setProfileData((prev) =>
          prev ? { ...prev, user: { ...prev.user, ...result.user } } : { user: result.user },
        )
      }
    } catch (err) {
      setErrorMessage(err?.message || 'Failed to update profile. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  function handleResetForm() {
    setUsername(displayUser.username || user?.username || '')
    setEmail(displayUser.email || user?.email || '')
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setStatusMessage(null)
    setErrorMessage(null)
  }

  return (
    <div className={styles.page}>
      <section className={styles.heroBand}>
        <div className="container">
          <div className={styles.heroHeader}>
            <div className={styles.identityCluster}>
              <div className={styles.avatarLarge} aria-hidden="true">
                {userInitial}
              </div>
              <div>
                <p className="eyebrow">Member Profile</p>
                <div className={styles.nameRow}>
                  <h1 className={styles.title}>{displayName}</h1>
                  <span className={styles.roleBadge}>
                    {normalizeUserRole(displayUser.role)}
                  </span>
                  {displayUser.emailVerifiedAt && (
                    <span className={styles.verifiedBadge}>✓ Verified</span>
                  )}
                </div>
                <p className={styles.metaLine}>
                  {displayUser.email || 'No email on file'}
                  {displayUser.createdAt
                    ? ` · Joined ${new Date(displayUser.createdAt).toLocaleDateString()}`
                    : ''}
                </p>
              </div>
            </div>

            <div className={cx(styles.scoreCard, isZeroScore && styles.scoreCardZero)}>
              <div className={styles.scoreHeader}>
                <WhiteRedEaredFox svgStyle={{ width: 24, height: 24 }} />
                <span className={styles.scoreLabel}>Achess Score</span>
              </div>
              <p className={styles.scoreValue}>★ {numericScore} pts</p>
              <p className={styles.scoreHint}>
                {isZeroScore
                  ? '0 score — beat the Computer (+5 pts) to unlock PvP rooms'
                  : 'Default: 500 · Win: +5 pts · Loss: -5 pts'}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="band band--canvas">
        <div className="container">
          <div className={styles.grid}>
            {/* Left Column: Edit Profile Form */}
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}>Edit Profile</h2>
                <p className={styles.cardSubtitle}>
                  Update your username, email address, or account password.
                </p>
              </div>

              {statusMessage && (
                <div className={styles.successBanner} role="status">
                  ✓ {statusMessage}
                </div>
              )}
              {errorMessage && (
                <div className={styles.errorBanner} role="alert">
                  {errorMessage}
                </div>
              )}

              <form className={styles.form} onSubmit={handleSubmit}>
                <label className={styles.field}>
                  <span className={styles.fieldLabel}>Username</span>
                  <input
                    className={styles.input}
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Your club handle"
                    minLength={3}
                    maxLength={50}
                    required
                  />
                  <span className={styles.fieldHint}>
                    Displayed on the leaderboard, rooms, and game history (3–50 characters).
                  </span>
                </label>

                <label className={styles.field}>
                  <span className={styles.fieldLabel}>Email Address</span>
                  <input
                    className={styles.input}
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                  />
                </label>

                <div className={styles.divider} />

                <div className={styles.passwordSection}>
                  <p className={styles.sectionTitle}>Change Password (Optional)</p>
                  <p className={styles.fieldHint}>
                    Leave blank if you want to keep your current password.
                  </p>

                  <label className={styles.field}>
                    <span className={styles.fieldLabel}>Current Password</span>
                    <input
                      className={styles.input}
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Enter current password"
                      autoComplete="current-password"
                    />
                  </label>

                  <div className={styles.twoCol}>
                    <label className={styles.field}>
                      <span className={styles.fieldLabel}>New Password</span>
                      <input
                        className={styles.input}
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="At least 8 characters"
                        autoComplete="new-password"
                      />
                    </label>

                    <label className={styles.field}>
                      <span className={styles.fieldLabel}>Confirm New Password</span>
                      <input
                        className={styles.input}
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Repeat new password"
                        autoComplete="new-password"
                      />
                    </label>
                  </div>
                </div>

                <div className={styles.formActions}>
                  <Button type="submit" variant="primary" disabled={saving}>
                    {saving ? 'Saving changes…' : 'Save Profile'}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleResetForm}
                    disabled={saving}
                  >
                    Reset
                  </Button>
                </div>
              </form>
            </div>

            {/* Right Column: Stats & Recent Matches */}
            <div className={styles.sideCol}>
              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <h2 className={styles.cardTitle}>Match Record</h2>
                  <p className={styles.cardSubtitle}>
                    Your performance across Standard (8×8) and Fox Chess (10×10).
                  </p>
                </div>

                <div className={styles.statsGrid}>
                  <div className={styles.statBox}>
                    <span className={styles.statNum}>{totalGames}</span>
                    <span className={styles.statLabel}>Games</span>
                  </div>
                  <div className={styles.statBox}>
                    <span className={cx(styles.statNum, styles.statWin)}>{stats.wins || 0}</span>
                    <span className={styles.statLabel}>Wins</span>
                  </div>
                  <div className={styles.statBox}>
                    <span className={cx(styles.statNum, styles.statLoss)}>{stats.losses || 0}</span>
                    <span className={styles.statLabel}>Losses</span>
                  </div>
                  <div className={styles.statBox}>
                    <span className={styles.statNum}>{stats.draws || 0}</span>
                    <span className={styles.statLabel}>Draws</span>
                  </div>
                  <div className={styles.statBox}>
                    <span className={styles.statNum}>{winRate}%</span>
                    <span className={styles.statLabel}>Win Rate</span>
                  </div>
                </div>

                <div className={styles.quickPlayRow}>
                  <Button size="sm" variant="teal" onClick={() => navigate(ROUTES.play)}>
                    Play Standard (8×8)
                  </Button>
                  <Button size="sm" variant="primary" onClick={() => navigate(ROUTES.foxPlay)}>
                    Play Fox Chess (10×10)
                  </Button>
                  {isAdminUser(displayUser) && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => navigate(ROUTES.adminUsers)}
                    >
                      Admin User Management
                    </Button>
                  )}
                </div>
              </div>

              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <h2 className={styles.cardTitle}>Recent Games</h2>
                </div>

                {loadingProfile ? (
                  <p className={styles.emptyState}>Loading recent games…</p>
                ) : recentGames.length === 0 ? (
                  <p className={styles.emptyState}>
                    No finished games recorded yet. Jump into a room or play vs Computer to start your record!
                  </p>
                ) : (
                  <div className={styles.recentList}>
                    {recentGames.map((g) => (
                      <div key={g.gameId} className={styles.recentRow}>
                        <div className={styles.recentMain}>
                          <span
                            className={cx(
                              styles.resultPill,
                              g.result === 'win' && styles.resultWin,
                              g.result === 'loss' && styles.resultLoss,
                              g.result === 'draw' && styles.resultDraw,
                            )}
                          >
                            {g.resultLabel || g.result?.toUpperCase()}
                          </span>
                          <span className={styles.opponentName}>vs {g.opponent || 'Opponent'}</span>
                          <span className={styles.colorTag}>({g.color})</span>
                        </div>
                        <span className={styles.recentDate}>
                          {g.playedAt ? formatDateTime(g.playedAt) : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
