import { lessons } from '../../data/lessons'
import { cx } from '../../utils/helpers'
import styles from './LearnPage.module.css'

function LessonCard({ lesson }) {
  return (
    <article className={styles.card}>
      <span className={cx(styles.difficulty, 'notation')}>{lesson.difficulty}</span>
      <h3 className={styles.cardTitle}>{lesson.title}</h3>
      <p className={styles.cardBody}>{lesson.description}</p>
      <footer className={cx(styles.meta, 'notation')}>
        <span>{lesson.minutes} min</span>
        <span className={styles.openLesson}>Open lesson →</span>
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
            Short lessons written like a coach talking at the analysis board. Start with the
            center, sharpen your tactics, then grind the endgames.
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
