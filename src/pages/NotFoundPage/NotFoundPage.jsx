import { useNavigate } from 'react-router-dom'
import { Button } from '../../components/common/Button'
import { ROUTES } from '../../utils/constants'
import styles from './NotFoundPage.module.css'

export function NotFoundPage() {
  const navigate = useNavigate()

  return (
    <section className={styles.page}>
      <div className="container">
        <p className="eyebrow">Off the board</p>
        <h1 className={styles.title}>404 — no legal move here</h1>
        <p className={styles.body}>
          This square does not exist. The arbiter suggests returning to the hall.
        </p>
        <Button size="lg" onClick={() => navigate(ROUTES.home)}>
          Back to the hall
        </Button>
      </div>
    </section>
  )
}
