import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import knightMark from '../../assets/knight-mark.svg'
import { useAuth } from '../../hooks/useAuth'
import { ROUTES } from '../../utils/constants'
import { cx } from '../../utils/helpers'
import { Button } from './Button'
import styles from './Navbar.module.css'

const NAV_LINKS = [
  { to: ROUTES.play, label: 'Play' },
  { to: ROUTES.foxPlay, label: 'Fox Chess' },
  { to: ROUTES.learn, label: 'Learn' },
  { to: ROUTES.community, label: 'Community' },
  { to: ROUTES.news, label: 'News' },
  { to: ROUTES.donate, label: 'Donate' },
]

export function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')

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
              <button type="button" className={styles.utilityLink} onClick={logout}>
                Sign out
              </button>
            ) : (
              <>
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
          <NavLink to={ROUTES.home} className={styles.brand} aria-label="Access Chess home">
            <img src={knightMark} className={styles.mark} alt="" />
            <span className={styles.brandName}>ACCESS CHESS</span>
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
              <span className={cx(styles.handle, 'notation')} title={user.email}>
                {user.handle}
              </span>
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
