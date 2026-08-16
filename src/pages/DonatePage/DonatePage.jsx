import { useState } from 'react'
import { Button } from '../../components/common/Button'
import { Modal } from '../../components/common/Modal'
import { cx } from '../../utils/helpers'
import styles from './DonatePage.module.css'

const PRESETS = [10, 25, 50, 100]

const USES = [
  {
    glyph: '♟',
    title: 'Boards and pieces',
    body: 'Replacing worn sets so every board in the hall plays true.',
  },
  {
    glyph: '♞',
    title: 'Coaching hours',
    body: 'Funding free beginner sessions and the weekend juniors club.',
  },
  {
    glyph: '♜',
    title: 'The building itself',
    body: 'Keeping the lights on, the clocks ticking, and the coffee warm.',
  },
]

export function DonatePage() {
  const [amount, setAmount] = useState(25)
  const [custom, setCustom] = useState('')
  const [confirmOpen, setConfirmOpen] = useState(false)

  const effectiveAmount = custom ? Number(custom) : amount

  function openConfirm() {
    if (Number.isFinite(effectiveAmount) && effectiveAmount > 0) {
      setConfirmOpen(true)
    }
  }

  return (
    <>
      <section className={styles.hero}>
        <div className="container">
          <p className="eyebrow">The committee’s quiet ask</p>
          <h1 className={styles.title}>Support the hall</h1>
          <p className={styles.lead}>
            Every donation goes straight to boards, books, and coaching. No urgency, no red —
            just a calm ask from one club member to another.
          </p>
        </div>
      </section>

      <section className={`band band--dim ${styles.giveBand}`}>
        <div className="container">
          <div className={styles.grid}>
            <form
              className={styles.card}
              onSubmit={(event) => {
                event.preventDefault()
                openConfirm()
              }}
            >
              <h2 className={styles.cardTitle}>Choose an amount</h2>

              <div className={styles.presets} role="group" aria-label="Donation amount">
                {PRESETS.map((value) => (
                  <button
                    key={value}
                    type="button"
                    className={cx(styles.preset, amount === value && styles.presetActive)}
                    onClick={() => {
                      setAmount(value)
                      setCustom('')
                    }}
                  >
                    ${value}
                  </button>
                ))}
              </div>

              <div className={styles.customField}>
                <label className={styles.customLabel} htmlFor="donate-custom">
                  Or enter your own
                </label>
                <input
                  id="donate-custom"
                  className={styles.customInput}
                  type="number"
                  min="1"
                  placeholder="USD"
                  value={custom}
                  onChange={(event) => setCustom(event.target.value)}
                />
              </div>

              <Button type="submit" size="lg" className={styles.donateButton}>
                Donate ${effectiveAmount || 0}
              </Button>

              <div className={styles.paymentRow}>
                <button type="button" className={styles.paymentButton} onClick={openConfirm}>
                  Stripe
                </button>
                <button type="button" className={styles.paymentButton} onClick={openConfirm}>
                  PayPal
                </button>
              </div>
              <p className={styles.note}>
                Demo build — payment providers connect once the backend is live.
              </p>
            </form>

            <div className={styles.uses}>
              <p className="eyebrow">Where it goes</p>
              <h2 className={styles.usesTitle}>Every dollar, accounted for</h2>
              <div className={styles.usesList}>
                {USES.map((use) => (
                  <div key={use.title} className={styles.use}>
                    <span className={styles.useGlyph} aria-hidden="true">
                      {use.glyph}
                    </span>
                    <div>
                      <h3 className={styles.useTitle}>{use.title}</h3>
                      <p className={styles.useBody}>{use.body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <Modal open={confirmOpen} title="Thank you" onClose={() => setConfirmOpen(false)}>
        <p className={styles.modalLine}>
          A <span className="notation">${effectiveAmount || 0} USD</span> gift has been noted
          in the ledger.
        </p>
        <p className={styles.modalBody}>
          In the demo build this is where Stripe or PayPal takes over. The board appreciates
          it all the same.
        </p>
        <Button className={styles.modalButton} onClick={() => setConfirmOpen(false)}>
          Back to the hall
        </Button>
      </Modal>
    </>
  )
}
