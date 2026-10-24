import { NewsFeed } from '../../components/news/NewsFeed'
import styles from './NewsPage.module.css'

export function NewsPage() {
  return (
    <>
      <section className={styles.hero}>
        <div className="container">
          <p className="eyebrow">From the desk</p>
          <h1 className={styles.title}>News</h1>
          <p className={styles.lead}>
            Latest chess tournaments, grandmaster analysis, and breaking news regularly quoted
            from ChessBase and Chess.com. Click any story to read the full article on its
            source website.
          </p>
        </div>
      </section>

      <section className={`band band--dim ${styles.feedBand}`}>
        <div className="container">
          <NewsFeed />
        </div>
      </section>
    </>
  )
}
