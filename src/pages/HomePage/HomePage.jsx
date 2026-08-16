import { useNavigate } from 'react-router-dom'
import { Button } from '../../components/common/Button'
import { NewsCard } from '../../components/news/NewsCard'
import { newsItems } from '../../data/news'
import { ROUTES } from '../../utils/constants'
import styles from './HomePage.module.css'

const FEATURES = [
  {
    glyph: '♞',
    title: 'Play',
    body: 'Sit across from a friendly bot or a clubmate on the same board. Every game keeps its moves on the scoresheet.',
    to: ROUTES.play,
  },
  {
    glyph: '♟',
    title: 'Learn',
    body: 'Short lessons on openings, tactics, and endgames — written the way a coach talks at the analysis board.',
    to: ROUTES.learn,
  },
  {
    glyph: '♘',
    title: 'Community',
    body: 'Post games, find pairings, and trade ideas in the members’ hall. The bulletin board never sleeps.',
    to: ROUTES.community,
  },
]

export function HomePage() {
  const navigate = useNavigate()

  return (
    <>
      <section className={styles.hero}>
        <div className="container">
          <p className="eyebrow">Est. MMXXVI · The Access Chess Club</p>
          <h1 className={styles.headline}>A quiet room built for the royal game.</h1>
          <p className={styles.lead}>
            Play a friendly game, study a lesson, and trade news with clubmates — all in a
            hall that feels like walnut, ivory, and brass.
          </p>
          <div className={styles.ctaRow}>
            <Button size="lg" onClick={() => navigate(ROUTES.play)}>
              Play now
            </Button>
            <Button
              variant="secondary"
              size="lg"
              onClick={() => navigate(ROUTES.learn)}
            >
              Browse lessons
            </Button>
          </div>
        </div>
      </section>

      <section className={`band band--dark ${styles.featureBand}`}>
        <div className="container">
          <p className="eyebrow">The hall</p>
          <h2 className={styles.featureHeading}>Three doors, one room</h2>
          <div className={styles.featureGrid}>
            {FEATURES.map((feature) => (
              <div key={feature.title} className={styles.feature}>
                <span className={styles.featureGlyph} aria-hidden="true">
                  {feature.glyph}
                </span>
                <h3 className={styles.featureTitle}>{feature.title}</h3>
                <p className={styles.featureBody}>{feature.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="band band--dim">
        <div className="container">
          <p className="eyebrow">From the desk</p>
          <h2>Latest from the bulletin board</h2>
          <div className={styles.newsGrid}>
            {newsItems.slice(0, 3).map((item) => (
              <NewsCard key={item.id} item={item} />
            ))}
          </div>
          <div className={styles.moreRow}>
            <Button variant="secondary" onClick={() => navigate(ROUTES.news)}>
              Read all news
            </Button>
          </div>
        </div>
      </section>

      <section className="band band--canvas">
        <div className={`container ${styles.donateRow}`}>
          <div>
            <p className="eyebrow">Keep the clocks ticking</p>
            <h2>Donations keep the hall open</h2>
            <p className={styles.donateBody}>
              Your support funds boards, books, and the occasional restored brass clock.
              No urgency, no red — just a quiet ask from one club member to another.
            </p>
          </div>
          <Button size="lg" onClick={() => navigate(ROUTES.donate)}>
            Support the hall
          </Button>
        </div>
      </section>
    </>
  )
}
