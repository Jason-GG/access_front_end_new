import { useEffect, useRef, useState } from 'react'
import { Button } from '../common/Button'
import styles from './RoomChat.module.css'

export function RoomChat({ comments = [], onSend, error, disabled = false }) {
  const [value, setValue] = useState('')
  const listRef = useRef(null)

  useEffect(() => {
    const list = listRef.current
    if (list) list.scrollTop = list.scrollHeight
  }, [comments.length])

  async function handleSubmit(event) {
    event.preventDefault()
    const text = value.trim()
    if (!text || disabled) return
    const sent = await onSend(text)
    if (sent) setValue('')
  }

  return (
    <div className={styles.panel}>
      <div className={styles.head}>Room chat</div>

      <div className={styles.list} ref={listRef}>
        {comments.length === 0 ? (
          <p className={styles.empty}>Say hello to your opponent.</p>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className={styles.message}>
              <span className={styles.author}>{comment.user?.username || 'Player'}</span>
              <span className={styles.body}>{comment.body}</span>
            </div>
          ))
        )}
      </div>

      <form className={styles.form} onSubmit={handleSubmit}>
        <input
          className={styles.input}
          value={value}
          maxLength={500}
          onChange={(event) => setValue(event.target.value)}
          placeholder="Message"
          aria-label="Chat message"
          disabled={disabled}
        />
        <Button type="submit" size="sm" disabled={disabled || !value.trim()}>
          Send
        </Button>
      </form>

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
