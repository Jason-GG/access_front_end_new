import { useState } from 'react'
import { Button } from '../../components/common/Button'
import { useAuth } from '../../hooks/useAuth'
import { initialPosts } from '../../data/posts'
import { cx, formatDateTime } from '../../utils/helpers'
import styles from './CommunityPage.module.css'

function CommunityPost({ post }) {
  return (
    <article className={styles.post}>
      <header className={styles.postMeta}>
        <span className={cx(styles.handle, 'notation')}>@{post.author}</span>
        <span className={cx(styles.time, 'notation')}>{formatDateTime(post.time)}</span>
      </header>
      <p className={styles.postBody}>{post.content}</p>
      <footer className={styles.postFooter}>
        <span className={cx(styles.replyCount, 'notation')}>{post.replies} replies</span>
        <button type="button" className={styles.replyLink}>
          Reply
        </button>
      </footer>
    </article>
  )
}

export function CommunityPage() {
  const { user } = useAuth()
  const [posts, setPosts] = useState(initialPosts)
  const [draft, setDraft] = useState('')
  const [posted, setPosted] = useState(false)

  function handlePost(event) {
    event.preventDefault()
    const content = draft.trim()
    if (!content) return

    const newPost = {
      id: Date.now(),
      author: user?.handle ?? 'guest',
      time: new Date().toISOString(),
      content,
      replies: 0,
    }
    setPosts((current) => [newPost, ...current])
    setDraft('')
    setPosted(true)
    window.setTimeout(() => setPosted(false), 3000)
  }

  return (
    <>
      <section className={styles.hero}>
        <div className="container">
          <p className="eyebrow">The members’ hall</p>
          <h1 className={styles.title}>Community</h1>
          <p className={styles.lead}>
            Games, pairings, and ideas pinned to the bulletin board. New posts land at the top.
          </p>
        </div>
      </section>

      <section className={`band band--dim ${styles.board}`}>
        <div className="container">
          <form className={styles.composer} onSubmit={handlePost}>
            <label className={styles.composerLabel} htmlFor="post-draft">
              Pin something to the board
            </label>
            <textarea
              id="post-draft"
              className={styles.composerInput}
              rows="3"
              maxLength="500"
              placeholder="Share a game, a question, or a pairing request…"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
            />
            <div className={styles.composerFooter}>
              <span className={cx(styles.counter, 'notation')}>{draft.length}/500</span>
              <Button type="submit" size="sm" disabled={!draft.trim()}>
                Post
              </Button>
            </div>
            {posted && (
              <p className={styles.posted} role="status">
                Posted. It is now on the board.
              </p>
            )}
          </form>

          <div className={styles.feed}>
            {posts.map((post) => (
              <CommunityPost key={post.id} post={post} />
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
