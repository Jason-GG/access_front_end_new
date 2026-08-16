import { NavLink } from 'react-router-dom'
import knightMark from '../../assets/knight-mark.svg'
import { useAuth } from '../../hooks/useAuth'
import { ROUTES } from '../../utils/constants'
import { cx } from '../../utils/helpers'
import { Button } from './Button'
import styles from './Navbar.module.css'

const NAV_LINKS = [
  { to: ROUTES.play, label: 'Play' },
  { to: ROUTES.learn, label: 'Learn' },
  { to: ROUTES.community, label: 'Community' },
  { to: ROUTES.news, label: 'News' },
  { to: ROUTES.donate, label: 'Donate' },
]

export function Navbar() {
  const { user, logout } = useAuth()

  return (
    <header className={styles.nav}>
      <div className={styles.inner}>
        <NavLink to={ROUTES.home} className={styles.brand}>
          <img src={knightMark} className={styles.mark} alt="Access Chess knight" />
          <span className={styles.brandName}>Access Chess</span>
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

        <div className={styles.auth}>
          {user ? (
            <>
              <span className={cx(styles.handle, 'notation')} title={user.email}>
                {user.handle}
              </span>
              <Button variant="secondaryDark" size="sm" onClick={logout}>
                Sign out
              </Button>
            </>
          ) : (
            <>
              <NavLink to={ROUTES.login} className={styles.authLink}>
                Log in
              </NavLink>
              <NavLink to={ROUTES.signup} className={styles.signupPill}>
                Sign up
              </NavLink>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
