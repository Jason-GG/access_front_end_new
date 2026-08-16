import { Link } from 'react-router-dom'
import knightMark from '../../assets/knight-mark.svg'
import { ROUTES } from '../../utils/constants'
import styles from './Footer.module.css'

const FOOTER_LINKS = [
  { to: ROUTES.learn, label: 'Lessons' },
  { to: ROUTES.community, label: 'Community' },
  { to: ROUTES.news, label: 'News' },
  { to: ROUTES.donate, label: 'Support the hall' },
]

export function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.col}>
          <p className={styles.brand}>
            <img src={knightMark} className={styles.mark} alt="Access Chess knight" />
            <span className={styles.brandName}>Access Chess</span>
          </p>
          <p className={styles.tagline}>
            A quiet tournament hall for playing, learning, and community.
          </p>
        </div>
        <nav className={styles.col} aria-label="Footer">
          {FOOTER_LINKS.map((link) => (
            <Link key={link.to} to={link.to} className={styles.link}>
              {link.label}
            </Link>
          ))}
        </nav>
        <div className={styles.col}>
          <p className={styles.dateline}>
            <span className="notation">EST. MMXXVI · SHANGHAI</span>
          </p>
          <p className={styles.tagline}>Built for the love of the game.</p>
        </div>
      </div>
      <div className={styles.base}>
        <div className={styles.baseInner}>
          <span className="notation">© 2026 Access Chess</span>
          <span className="notation">64 squares · 32 pieces · 1 game</span>
        </div>
      </div>
    </footer>
  )
}
