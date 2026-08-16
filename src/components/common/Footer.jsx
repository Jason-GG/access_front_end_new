import { Link } from 'react-router-dom'
import knightMark from '../../assets/knight-mark.svg'
import { ROUTES } from '../../utils/constants'
import styles from './Footer.module.css'

const COLUMNS = [
  {
    heading: 'Explore',
    links: [
      { to: ROUTES.play, label: 'Play' },
      { to: ROUTES.learn, label: 'Learn' },
      { to: ROUTES.news, label: 'News' },
    ],
  },
  {
    heading: 'Club',
    links: [
      { to: ROUTES.community, label: 'Community' },
      { to: ROUTES.community, label: 'Find a club' },
      { to: ROUTES.learn, label: 'Help' },
    ],
  },
  {
    heading: 'Support',
    links: [
      { to: ROUTES.donate, label: 'Donate' },
      { to: ROUTES.signup, label: 'Join us' },
      { to: ROUTES.login, label: 'Sign in' },
    ],
  },
  {
    heading: 'About',
    links: [
      { to: ROUTES.home, label: 'The club' },
      { to: ROUTES.news, label: 'Announcements' },
      { to: ROUTES.donate, label: 'Support the hall' },
    ],
  },
]

export function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.brandCol}>
          <p className={styles.brand}>
            <img src={knightMark} className={styles.mark} alt="" />
            <span className={styles.brandName}>ACCESS CHESS</span>
          </p>
          <p className={styles.tagline}>
            A chess club for players who train like athletes. Play, learn, compete.
          </p>
        </div>

        {COLUMNS.map((column) => (
          <nav key={column.heading} className={styles.col} aria-label={column.heading}>
            <p className={styles.colHeading}>{column.heading.toUpperCase()}</p>
            {column.links.map((link) => (
              <Link key={link.label} to={link.to} className={styles.link}>
                {link.label}
              </Link>
            ))}
          </nav>
        ))}
      </div>

      <div className={styles.finePrint}>
        <div className={styles.fineInner}>
          <span>© 2026 Access Chess</span>
          <span>Terms of Use · Privacy Policy · Supply Chain Act</span>
          <span>Shanghai, CN</span>
        </div>
      </div>
    </footer>
  )
}
