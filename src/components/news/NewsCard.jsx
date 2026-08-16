import { cx } from '../../utils/helpers'
import styles from './NewsCard.module.css'

export function NewsCard({ item, featured = false }) {
  return (
    <article className={cx(styles.card, featured && styles.cardFeatured)}>
      <span className={styles.category}>{item.category}</span>
      <h3 className={styles.title}>{item.title}</h3>
      <div className={styles.rule} aria-hidden="true" />
      <p className={styles.summary}>{item.summary}</p>
      <footer className={cx(styles.meta, 'notation')}>
        <span>{item.date}</span>
        <span>{item.author}</span>
      </footer>
    </article>
  )
}
