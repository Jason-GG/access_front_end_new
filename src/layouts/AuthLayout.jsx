import { Link, Outlet } from 'react-router-dom'
import knightMark from '../assets/knight-mark.svg'
import { ROUTES } from '../utils/constants'
import styles from './AuthLayout.module.css'

export function AuthLayout() {
  return (
    <div className={styles.page}>
      <Link to={ROUTES.home} className={styles.brand}>
        <img src={knightMark} className={styles.mark} alt="Access Chess knight" />
        <span className={styles.brandName}>Access Chess</span>
      </Link>
      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  )
}
