import { Link, useNavigate } from 'react-router-dom'
import { Button } from '../../components/common/Button'
import { NewsRollingBand } from '../../components/news/NewsRollingBand'
import { useFetchNews } from '../../hooks/useFetchNews'
import { ROUTES } from '../../utils/constants'
import { cx } from '../../utils/helpers'
import styles from './HomePage.module.css'

const FEATURES = [
  {
    glyph: '♞',
    title: 'Standard Chess',
    body: 'Sit across from the house bot or a clubmate on the classic 8×8 board.',
    to: ROUTES.play,
  },
  {
    glyph: '🦊',
    title: 'Fox Chess (10×10)',
    body: 'Experience the expanded battlefield featuring the Red-eared Fox and Normal Fox.',
    to: ROUTES.foxPlay,
  },
  {
    glyph: '♟',
    title: 'Learn',
    body: 'Short lessons on openings, tactics, and endgames — built like training blocks.',
    to: ROUTES.learn,
  },
  {
    glyph: '♘',
    title: 'Compete',
    body: 'Post games, find pairings, and trade ideas in the members’ hall.',
    to: ROUTES.community,
  },
]

export function HomePage() {
  const navigate = useNavigate()
  const { news, loading, refetch } = useFetchNews()

  return (
    <>
      <NewsRollingBand items={news} variant="ticker" />

      <section className={styles.hero}>
        <div className="container">
          <p className={styles.heroEyebrow}>EST. MMXXVI · THE ACCESS CHESS CLUB</p>
          <h1 className={`display ${styles.heroTitle}`}>
            Play the <span className={styles.heroAccent}>game.</span>
          </h1>
          <p className={styles.heroLead}>
            A chess club for players who train like athletes. Every move logged, every game
            counted, every square yours to take.
          </p>
          <div className={styles.heroCtas}>
            <Button size="lg" variant="teal" onClick={() => navigate(ROUTES.play)}>
              Play Standard (8×8)
            </Button>
            <Button size="lg" variant="primary" onClick={() => navigate(ROUTES.foxPlay)}>
              Play Fox Chess (10×10)
            </Button>
            <Link to={ROUTES.learn} className={styles.heroLink}>
              Browse lessons
            </Link>
          </div>
        </div>
      </section>

      <section className={`band band--canvas ${styles.featureBand}`}>
        <div className="container">
          <p className="eyebrow">The hall</p>
          <h2 className="section-heading">Four doors. Your board.</h2>
          <div className={styles.featureGrid}>
            {FEATURES.map((feature, index) => (
              <Link key={feature.title} to={feature.to} className={styles.feature}>
                <span
                  className={cx(
                    styles.featureGlyph,
                    index === 1
                      ? styles.glyphOrange
                      : index % 2 === 0
                        ? styles.glyphPink
                        : styles.glyphTeal,
                  )}
                  aria-hidden="true"
                >
                  {feature.glyph}
                </span>
                <span className={styles.featureTitle}>{feature.title.toUpperCase()}</span>
                <span className={styles.featureBody}>{feature.body}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className={`band band--dim ${styles.newsBand}`}>
        <div className="container">
          <div className={styles.sectionHeader}>
            <div>
              <p className="eyebrow">Live wire · ChessBase &amp; Chess.com</p>
              <h2 className="section-heading">Latest news</h2>
            </div>
            <Link to={ROUTES.news} className={styles.underLink}>
              Read all news
            </Link>
          </div>
          <NewsRollingBand
            items={news}
            variant="cards"
            onRefresh={refetch}
            loading={loading}
          />
        </div>
      </section>

      <section className={`band band--dark ${styles.donateBand}`}>
        <div className="container">
          <div className={styles.donateRow}>
            <div>
              <p className="eyebrow">Keep the clocks ticking</p>
              <h2 className={styles.donateTitle}>Support the hall</h2>
              <p className={styles.donateBody}>
                Your support funds boards, books, and coaching hours. No urgency — just a
                quiet ask from one member to another.
              </p>
            </div>
            <Button size="lg" variant="teal" onClick={() => navigate(ROUTES.donate)}>
              Donate
            </Button>
          </div>
        </div>
      </section>
    </>
  )
}
