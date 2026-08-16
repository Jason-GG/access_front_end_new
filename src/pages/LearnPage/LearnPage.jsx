import { lessons } from '../../data/lessons'
import { cx } from '../../utils/helpers'
import styles from './LearnPage.module.css'

const GLYPHS = ['♟', '♞', '♜', '♝', '♛', '♘']

function LessonCard({ lesson }) {
  const glyph = GLYPHS[(lesson.id - 1) % GLYPHS.length]
  const badgeTone =
    lesson.difficulty === 'Beginner'
      ? styles.badgeTeal
      : lesson.difficulty === 'Intermediate'
        ? styles.badgePink
        : styles.badgeInk

  return (
    <article className={styles.card}>
      <div className={styles.image}>
        <span className={styles.glyph} aria-hidden="true">
          {glyph}
        </span>
        <span className={cx(styles.badge, badgeTone, 'notation')}>{lesson.difficulty}</span>
      </div>
      <h3 className={styles.cardTitle}>{lesson.title}</h3>
      <p className={styles.cardBody}>{lesson.description}</p>
      <footer className={cx(styles.meta, 'notation')}>
        <span>{lesson.minutes} min</span>
        <span className={styles.openLesson}>Open lesson</span>
      </footer>
    </article>
  )
}

export function LearnPage() {
  return (
    <>
      <section className={styles.hero}>
        <div className="container">
          <p className="eyebrow">The study room</p>
          <h1 className={styles.title}>Learn</h1>
          <p className={styles.lead}>
            Training blocks for the board: openings, tactics, and endgames written like a
            coach talks at the analysis table.
          </p>
        </div>
      </section>

      <section className={`band band--dim ${styles.listBand}`}>
        <div className="container">
          <div className={styles.grid}>
            {lessons.map((lesson) => (
              <LessonCard key={lesson.id} lesson={lesson} />
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
