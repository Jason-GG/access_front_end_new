import { useFetchNews } from '../../hooks/useFetchNews'
import { Loader } from '../common/Loader'
import { NewsCard } from './NewsCard'
import styles from './NewsFeed.module.css'

export function NewsFeed() {
  const { news, loading, error, refetch } = useFetchNews()

  if (loading) {
    return <Loader label="Fetching news from the desk…" full />
  }

  if (error) {
    return (
      <div className={styles.state}>
        <p>Could not load the news feed.</p>
        <button type="button" className={styles.retry} onClick={refetch}>
          Try again
        </button>
      </div>
    )
  }

  const [featured, ...rest] = news

  return (
    <div className={styles.feed}>
      {featured && <NewsCard item={featured} featured />}
      <div className={styles.grid}>
        {rest.map((item) => (
          <NewsCard key={item.id} item={item} />
        ))}
      </div>
    </div>
  )
}
