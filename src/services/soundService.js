import { STORAGE_KEYS } from '../utils/constants'

let audioCtx = null
let noiseBuffer = null
let lastPlayedSignature = null
let lastPlayedAt = 0

const listeners = new Set()

function getAudioContext() {
  if (typeof window === 'undefined') return null
  const AudioCtx = window.AudioContext || window.webkitAudioContext
  if (!AudioCtx) return null
  if (!audioCtx) {
    try {
      audioCtx = new AudioCtx()
    } catch {
      return null
    }
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {})
  }
  return audioCtx
}

function getNoiseBuffer(ctx) {
  if (noiseBuffer && noiseBuffer.sampleRate === ctx.sampleRate) {
    return noiseBuffer
  }
  const duration = 0.08
  const length = Math.max(1, Math.floor(ctx.sampleRate * duration))
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < length; i++) {
    // Exponentially decaying white noise for crisp wooden contact transient
    const decay = Math.exp((-i / length) * 7)
    data[i] = (Math.random() * 2 - 1) * decay
  }
  noiseBuffer = buffer
  return buffer
}

export function isSoundMuted() {
  if (typeof window === 'undefined') return false
  try {
    return window.localStorage.getItem(STORAGE_KEYS.soundMuted) === 'true'
  } catch {
    return false
  }
}

export function setSoundMuted(muted) {
  const next = Boolean(muted)
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(STORAGE_KEYS.soundMuted, next ? 'true' : 'false')
    } catch {
      // ignore storage errors
    }
  }
  listeners.forEach((fn) => {
    try {
      fn(next)
    } catch {
      // ignore listener errors
    }
  })
  return next
}

export function toggleSoundMuted() {
  const next = !isSoundMuted()
  setSoundMuted(next)
  if (!next) {
    // Play a subtle wooden tap when unmuting to confirm audio is active
    playMoveSound({ san: 'e4', from: 'e2', to: 'e4' }, { force: true })
  }
  return next
}

export function subscribeSoundMuted(listener) {
  if (typeof listener !== 'function') return () => {}
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/**
 * Synthesizes a tactile wooden chess piece placement sound at `startTime`.
 */
function scheduleWoodImpact(ctx, startTime, { pitch = 165, endPitch = 68, gain = 0.28, filterFreq = 950 } = {}) {
  // 1. Low-mid wooden board body thud
  const osc = ctx.createOscillator()
  const oscGain = ctx.createGain()
  osc.type = 'triangle'
  osc.frequency.setValueAtTime(pitch, startTime)
  osc.frequency.exponentialRampToValueAtTime(Math.max(30, endPitch), startTime + 0.065)

  oscGain.gain.setValueAtTime(0.001, startTime)
  oscGain.gain.linearRampToValueAtTime(gain, startTime + 0.005)
  oscGain.gain.exponentialRampToValueAtTime(0.0008, startTime + 0.075)

  osc.connect(oscGain)
  oscGain.connect(ctx.destination)
  osc.start(startTime)
  osc.stop(startTime + 0.08)

  // 2. Crisp transient surface tap (bandpass-filtered noise)
  const noise = ctx.createBufferSource()
  noise.buffer = getNoiseBuffer(ctx)

  const filter = ctx.createBiquadFilter()
  filter.type = 'bandpass'
  filter.frequency.setValueAtTime(filterFreq, startTime)
  filter.Q.setValueAtTime(2.2, startTime)

  const noiseGain = ctx.createGain()
  noiseGain.gain.setValueAtTime(0.001, startTime)
  noiseGain.gain.linearRampToValueAtTime(gain * 0.75, startTime + 0.002)
  noiseGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.038)

  noise.connect(filter)
  filter.connect(noiseGain)
  noiseGain.connect(ctx.destination)
  noise.start(startTime)
  noise.stop(startTime + 0.042)
}

/**
 * Synthesizes a resonant musical tone (used for check, promotion, and game-over chimes).
 */
function scheduleTone(ctx, startTime, { freq = 587.33, duration = 0.16, gain = 0.12, type = 'sine' } = {}) {
  const osc = ctx.createOscillator()
  const toneGain = ctx.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, startTime)

  toneGain.gain.setValueAtTime(0.0008, startTime)
  toneGain.gain.linearRampToValueAtTime(gain, startTime + 0.01)
  toneGain.gain.exponentialRampToValueAtTime(0.0008, startTime + duration)

  osc.connect(toneGain)
  toneGain.connect(ctx.destination)
  osc.start(startTime)
  osc.stop(startTime + duration + 0.01)
}

/**
 * Determines the sound category for a chess move (works for both 8x8 standard and 10x10 Fox Chess).
 */
export function classifyMoveSound(move, context = {}) {
  if (!move && !context) return 'move'
  const san = typeof move === 'string' ? move : String(move?.san || '')

  const isCheckmate =
    Boolean(context.isCheckmate) ||
    san.includes('#') ||
    String(context.result || '').includes('checkmate')
  if (isCheckmate) return 'gameEnd'

  const isGameOver =
    Boolean(context.isGameOver) ||
    Boolean(context.isStalemate) ||
    Boolean(context.isDraw)
  if (isGameOver) return 'gameEnd'

  const inCheck = Boolean(context.inCheck) || san.includes('+')
  if (inCheck) return 'check'

  const isPromotion =
    Boolean(move?.promotion) ||
    san.includes('=')
  if (isPromotion) return 'promote'

  const isCastle =
    Boolean(move?.isCastle) ||
    san.startsWith('O-O') ||
    san.startsWith('0-0') ||
    (typeof move?.flags === 'string' && (move.flags.includes('k') || move.flags.includes('q')))
  if (isCastle) return 'castle'

  const isCapture =
    Boolean(move?.captured) ||
    Boolean(move?.enPassant) ||
    san.includes('x') ||
    (typeof move?.flags === 'string' && (move.flags.includes('c') || move.flags.includes('e')))
  if (isCapture) return 'capture'

  return 'move'
}

/**
 * Plays a synthesized chess move sound based on the move and board state.
 */
export function playMoveSound(move, context = {}) {
  if (!context.force && isSoundMuted()) return false

  const nowMs = Date.now()
  const sig =
    context.signature ||
    (move && typeof move === 'object'
      ? `${move.ply ?? ''}:${move.from ?? ''}:${move.to ?? ''}:${move.san ?? ''}`
      : String(move || ''))

  if (!context.force && sig && sig === lastPlayedSignature && nowMs - lastPlayedAt < 180) {
    return false
  }
  lastPlayedSignature = sig
  lastPlayedAt = nowMs

  const ctx = getAudioContext()
  if (!ctx) return false

  const now = ctx.currentTime + 0.005
  const kind = classifyMoveSound(move, context)

  switch (kind) {
    case 'capture': {
      // Sharp initial knock + firm placement thud
      scheduleWoodImpact(ctx, now, { pitch: 260, endPitch: 95, gain: 0.24, filterFreq: 1450 })
      scheduleWoodImpact(ctx, now + 0.032, { pitch: 150, endPitch: 58, gain: 0.32, filterFreq: 1100 })
      break
    }
    case 'castle': {
      // Two distinct wooden steps: King placement then Rook placement
      scheduleWoodImpact(ctx, now, { pitch: 170, endPitch: 70, gain: 0.27, filterFreq: 950 })
      scheduleWoodImpact(ctx, now + 0.105, { pitch: 195, endPitch: 78, gain: 0.25, filterFreq: 1080 })
      break
    }
    case 'promote': {
      // Piece placement + bright ascending two-note chime
      scheduleWoodImpact(ctx, now, { pitch: 180, endPitch: 72, gain: 0.26, filterFreq: 1050 })
      scheduleTone(ctx, now + 0.03, { freq: 523.25, duration: 0.14, gain: 0.11, type: 'triangle' }) // C5
      scheduleTone(ctx, now + 0.12, { freq: 783.99, duration: 0.22, gain: 0.13, type: 'triangle' }) // G5
      break
    }
    case 'check': {
      // Crisp impact + urgent resonant alert bell
      scheduleWoodImpact(ctx, now, { pitch: 210, endPitch: 78, gain: 0.28, filterFreq: 1250 })
      scheduleTone(ctx, now + 0.015, { freq: 659.25, duration: 0.12, gain: 0.12, type: 'sine' }) // E5
      scheduleTone(ctx, now + 0.095, { freq: 880.0, duration: 0.22, gain: 0.14, type: 'sine' }) // A5
      break
    }
    case 'gameEnd': {
      // Decisive final move impact + three-note resolution chord
      scheduleWoodImpact(ctx, now, { pitch: 155, endPitch: 55, gain: 0.32, filterFreq: 1100 })
      scheduleTone(ctx, now + 0.04, { freq: 523.25, duration: 0.18, gain: 0.11, type: 'triangle' }) // C5
      scheduleTone(ctx, now + 0.13, { freq: 659.25, duration: 0.2, gain: 0.11, type: 'triangle' }) // E5
      scheduleTone(ctx, now + 0.22, { freq: 783.99, duration: 0.34, gain: 0.14, type: 'triangle' }) // G5
      break
    }
    case 'move':
    default: {
      // Classic warm wooden piece placement
      scheduleWoodImpact(ctx, now, { pitch: 170, endPitch: 68, gain: 0.27, filterFreq: 920 })
      break
    }
  }

  return true
}
