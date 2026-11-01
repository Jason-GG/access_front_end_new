import { useState } from 'react'
import { Button } from '../../components/common/Button'
import { useAuth } from '../../hooks/useAuth'
import { initialPosts } from '../../data/posts'
import { cx, formatDateTime } from '../../utils/helpers'
import styles from './CommunityPage.module.css'

const COMMUNITY_STORAGE_KEY = 'achess_community_posts_v1'

function loadStoredPosts() {
  try {
    const raw = localStorage.getItem(COMMUNITY_STORAGE_KEY)
    if (!raw) return initialPosts
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : initialPosts
  } catch {
    return initialPosts
  }
}

function CommunityPost({ post, currentAuthor, onAddReply }) {
  const [replyOpen, setReplyOpen] = useState(false)
  const [replyDraft, setReplyDraft] = useState('')
  const commentsList = Array.isArray(post.comments) ? post.comments : []
  const totalReplies = (Number(post.replies) || 0) + commentsList.length

  function handleReplySubmit(event) {
    event.preventDefault()
    const body = replyDraft.trim()
    if (!body) return
    onAddReply(post.id, {
      id: `${post.id}-${Date.now()}`,
      author: currentAuthor,
      time: new Date().toISOString(),
      content: body,
    })
    setReplyDraft('')
  }

  return (
    <article className={styles.post}>
      <header className={styles.postMeta}>
        <span className={cx(styles.handle, 'notation')}>@{post.author}</span>
        <span className={cx(styles.time, 'notation')}>{formatDateTime(post.time)}</span>
      </header>
      <p className={styles.postBody}>{post.content}</p>
      <footer className={styles.postFooter}>
        <span className={cx(styles.replyCount, 'notation')}>
          {totalReplies} {totalReplies === 1 ? 'reply' : 'replies'}
        </span>
        <button
          type="button"
          className={styles.replyLink}
          onClick={() => setReplyOpen((open) => !open)}
        >
          {replyOpen ? 'Hide replies' : 'Reply'}
        </button>
      </footer>

      {(replyOpen || commentsList.length > 0) && (
        <div className={styles.repliesSection}>
          {commentsList.length > 0 && (
            <ul className={styles.repliesList}>
              {commentsList.map((reply) => (
                <li key={reply.id} className={styles.replyItem}>
                  <div className={styles.replyMeta}>
                    <span className={cx(styles.replyAuthor, 'notation')}>@{reply.author}</span>
                    <span className={cx(styles.time, 'notation')}>{formatDateTime(reply.time)}</span>
                  </div>
                  <p className={styles.replyText}>{reply.content}</p>
                </li>
              ))}
            </ul>
          )}

          {replyOpen && (
            <form className={styles.replyForm} onSubmit={handleReplySubmit}>
              <input
                type="text"
                className={styles.replyInput}
                maxLength={300}
                placeholder={`Reply as @${currentAuthor}…`}
                value={replyDraft}
                onChange={(event) => setReplyDraft(event.target.value)}
              />
              <Button type="submit" size="sm" disabled={!replyDraft.trim()}>
                Send
              </Button>
            </form>
          )}
        </div>
      )}
    </article>
  )
}

export function CommunityPage() {
  const { user } = useAuth()
  const [posts, setPosts] = useState(loadStoredPosts)
  const [draft, setDraft] = useState('')
  const [posted, setPosted] = useState(false)

  const currentAuthor = user?.username || user?.handle || 'guest'

  function updatePosts(updater) {
    setPosts((current) => {
      const next = updater(current)
      try {
        localStorage.setItem(COMMUNITY_STORAGE_KEY, JSON.stringify(next))
      } catch {
        // ignore storage quota errors
      }
      return next
    })
  }

  function handlePost(event) {
    event.preventDefault()
    const content = draft.trim()
    if (!content) return

    const newPost = {
      id: Date.now(),
      author: currentAuthor,
      time: new Date().toISOString(),
      content,
      replies: 0,
      comments: [],
    }
    updatePosts((current) => [newPost, ...current])
    setDraft('')
    setPosted(true)
    window.setTimeout(() => setPosted(false), 3000)
  }

  function handleAddReply(postId, reply) {
    updatePosts((current) =>
      current.map((item) =>
        item.id === postId
          ? {
              ...item,
              comments: [...(Array.isArray(item.comments) ? item.comments : []), reply],
            }
          : item,
      ),
    )
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
              Pin something to the board {user ? `(posting as @${currentAuthor})` : ''}
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
              <CommunityPost
                key={post.id}
                post={post}
                currentAuthor={currentAuthor}
                onAddReply={handleAddReply}
              />
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
