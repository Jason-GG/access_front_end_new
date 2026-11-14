import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import knightMark from '../../assets/knight-mark.svg'
import { useAuth } from '../../hooks/useAuth'
import { ROUTES } from '../../utils/constants'
import { cx, isAdminUser } from '../../utils/helpers'
import { Button } from './Button'
import styles from './Navbar.module.css'

const NAV_LINKS = [
  { to: ROUTES.play, label: 'Play' },
  { to: ROUTES.foxPlay, label: 'Fox Chess' },
  { to: ROUTES.learn, label: 'Rules & Learn' },
  { to: ROUTES.community, label: 'Community' },
  { to: ROUTES.news, label: 'News' },
  { to: ROUTES.donate, label: 'Donate' },
]

export function Navbar() {
  const { user, score, logout } = useAuth()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const numericScore = typeof score === 'number' ? score : 500
  const isZeroScore = numericScore <= 0

  const displayName =
    user?.username ||
    user?.handle ||
    (user?.email ? String(user.email).split('@')[0] : null) ||
    'Player'
  const userInitial = String(displayName).trim().charAt(0).toUpperCase() || 'P'
  const isAdmin = isAdminUser(user)

  function handleSearch(event) {
    event.preventDefault()
    navigate(ROUTES.news)
    setQuery('')
  }

  return (
    <header className={styles.header}>
      <div className={styles.utility}>
        <div className={styles.utilityInner}>
          <span className={styles.utilityLead}>Free to join · Always</span>
          <nav className={styles.utilityLinks} aria-label="Utility">
            <NavLink to={ROUTES.community} className={styles.utilityLink}>
              Find a club
            </NavLink>
            <NavLink to={ROUTES.learn} className={styles.utilityLink}>
              Help
            </NavLink>
            {user ? (
              <>
                {isAdmin && (
                  <NavLink to={ROUTES.adminUsers} className={styles.utilityLink}>
                    Admin Users
                  </NavLink>
                )}
                <NavLink
                  to={ROUTES.profile}
                  className={styles.utilityUser}
                  title="Click to view and edit your profile"
                >
                  Signed in as <strong className={styles.utilityUserName}>{displayName}</strong>
                  <span
                    className={cx(
                      styles.utilityScoreBadge,
                      isZeroScore && styles.utilityScoreZero,
                    )}
                    title={
                      isZeroScore
                        ? '0 score — play vs Computer to win +5 score per game'
                        : 'Win: +5 score · Loss: -5 score (New user default: 500)'
                    }
                  >
                    ★ {numericScore} pts
                  </span>
                  {isAdmin && <span className={styles.utilityRoleBadge}>Admin</span>}
                </NavLink>
                <button type="button" className={styles.utilityLink} onClick={logout}>
                  Sign out
                </button>
              </>
            ) : (
              <>
                <span
                  className={cx(
                    styles.utilityScoreBadge,
                    isZeroScore && styles.utilityScoreZero,
                  )}
                  title="Guest score (Default: 500 · Win: +5 · Loss: -5)"
                >
                  ★ {numericScore} pts
                </span>
                <NavLink to={ROUTES.signup} className={styles.utilityLink}>
                  Join us
                </NavLink>
                <NavLink to={ROUTES.login} className={styles.utilityLink}>
                  Sign in
                </NavLink>
              </>
            )}
          </nav>
        </div>
      </div>

      <div className={styles.nav}>
        <div className={styles.navInner}>
          <NavLink to={ROUTES.home} className={styles.brand} aria-label="Achess home">
            <img src={knightMark} className={styles.mark} alt="" />
            <span className={styles.brandName}>Achess</span>
          </NavLink>

          <nav className={styles.links} aria-label="Primary">
            {NAV_LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) => cx(styles.link, isActive && styles.linkActive)}
              >
                {link.label}
              </NavLink>
            ))}
            {isAdmin && (
              <NavLink
                to={ROUTES.adminUsers}
                className={({ isActive }) => cx(styles.link, isActive && styles.linkActive)}
              >
                Admin Users
              </NavLink>
            )}
          </nav>

          <div className={styles.cluster}>
            <form className={styles.search} onSubmit={handleSearch} role="search">
              <span className={styles.searchIcon} aria-hidden="true">
                ⌕
              </span>
              <input
                className={styles.searchInput}
                type="search"
                placeholder="Search"
                aria-label="Search the club"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </form>

            {user && (
              <NavLink
                to={ROUTES.profile}
                className={styles.userBadge}
                title="View and edit your profile"
                aria-label={`View profile for ${displayName}, score ${numericScore}`}
              >
                <span className={styles.userAvatar} aria-hidden="true">
                  {userInitial}
                </span>
                <span className={cx(styles.handle, 'notation')}>{displayName}</span>
                <span
                  className={cx(styles.scoreTag, isZeroScore && styles.scoreTagZero)}
                  title={
                    isZeroScore
                      ? '0 score — beat the Computer (+5 pts) to unlock PvP rooms'
                      : `Current score: ${numericScore} pts (+5 win / -5 loss)`
                  }
                >
                  ★ {numericScore}
                </span>
                {isAdmin && <span className={styles.roleTag}>Admin</span>}
              </NavLink>
            )}

            {user ? (
              <Button variant="secondary" size="sm" onClick={logout}>
                Sign out
              </Button>
            ) : (
              <NavLink to={ROUTES.signup} className={styles.joinPill}>
                Join us
              </NavLink>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
