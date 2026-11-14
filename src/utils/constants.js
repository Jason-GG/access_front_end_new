export const ROUTES = {
  home: '/',
  play: '/play',
  foxPlay: '/play/fox',
  foxPlayRoom: '/play/fox/:roomId',
  playRoom: '/play/:roomId',
  learn: '/learn',
  rules: '/rules',
  community: '/community',
  news: '/news',
  donate: '/donate',
  login: '/login',
  signup: '/signup',
  verifyEmail: '/verify-email',
  profile: '/profile',
  admin: '/admin',
  adminUsers: '/admin/users',
}

export const STORAGE_KEYS = {
  users: 'access-chess:users',
  session: 'access-chess:session',
  accessToken: 'access-chess:access-token',
  refreshToken: 'access-chess:refresh-token',
  foxPracticeState: 'access-chess:fox-practice-state',
  chessPracticeState: 'access-chess:chess-practice-state',
  roomStatePrefix: 'access-chess:room-state:',
  soundMuted: 'access-chess:sound-muted',
}

export const GAME = {
  botDelayMs: 2600,
  defaultTimeSeconds: 600, // 10 minutes per side
}

export function getBotThinkDelayMs(difficulty = 'medium') {
  if (difficulty === 'easy') {
    return 2000 + Math.floor(Math.random() * 800) // 2.0s – 2.8s
  }
  if (difficulty === 'hard') {
    return 3300 + Math.floor(Math.random() * 1200) // 3.3s – 4.5s
  }
  return 2600 + Math.floor(Math.random() * 1000) // 2.6s – 3.6s
}

export const PIECE_GLYPHS = {
  p: '♟',
  n: '♞',
  b: '♝',
  r: '♜',
  rf: '🦊',
  f: '🦊',
  q: '♛',
  k: '♚',
  P: '♙',
  N: '♘',
  B: '♗',
  R: '♖',
  RF: '🦊',
  F: '🦊',
  Q: '♕',
  K: '♔',
}

export const PIECE_VALUES = { p: 1, n: 3, b: 3, rf: 4, r: 5, f: 7, q: 9, k: 0 }

export const TIME_CONTROL_CATEGORIES = [
  {
    key: 'Bullet',
    label: 'Bullet',
    rangeText: '1 or 2 min',
    description: 'Time 1 or 2 minutes',
    presets: [
      { category: 'Bullet', label: '1+1', minutesA: 1, minutesB: 1 },
      { category: 'Bullet', label: '2+1', minutesA: 2, minutesB: 1 },
      { category: 'Bullet', label: '2+2', minutesA: 2, minutesB: 2 },
    ],
  },
  {
    key: 'Blitz',
    label: 'Blitz',
    rangeText: '3 to 5 min',
    description: 'Time 3 to 5 minutes',
    presets: [
      { category: 'Blitz', label: '3+1', minutesA: 3, minutesB: 1 },
      { category: 'Blitz', label: '3+2', minutesA: 3, minutesB: 2 },
      { category: 'Blitz', label: '3+3', minutesA: 3, minutesB: 3 },
      { category: 'Blitz', label: '4+4', minutesA: 4, minutesB: 4 },
      { category: 'Blitz', label: '5+5', minutesA: 5, minutesB: 5 },
    ],
  },
  {
    key: 'Rapid',
    label: 'Rapid',
    rangeText: '10 to 15 min',
    description: 'Time 10 to 15 minutes',
    presets: [
      { category: 'Rapid', label: '10+10', minutesA: 10, minutesB: 10 },
      { category: 'Rapid', label: '12+10', minutesA: 12, minutesB: 10 },
      { category: 'Rapid', label: '15+10', minutesA: 15, minutesB: 10 },
      { category: 'Rapid', label: '15+15', minutesA: 15, minutesB: 15 },
    ],
  },
  {
    key: 'Classical',
    label: 'Classical',
    rangeText: '20 to 30 min',
    description: '20 to 30 minutes',
    presets: [
      { category: 'Classical', label: '20+20', minutesA: 20, minutesB: 20 },
      { category: 'Classical', label: '25+20', minutesA: 25, minutesB: 20 },
      { category: 'Classical', label: '30+20', minutesA: 30, minutesB: 20 },
      { category: 'Classical', label: '30+30', minutesA: 30, minutesB: 30 },
    ],
  },
  {
    key: 'Custom',
    label: 'Custom',
    rangeText: 'Players set time',
    description: 'Players set the time (minutes + minutes)',
    presets: [],
  },
]

export const DEFAULT_TIME_CONTROL = {
  category: 'Rapid',
  label: '10+10',
  minutesA: 10,
  minutesB: 10,
}

export function classifyTimeMinutes(minutesA, minutesB) {
  const maxMin = Math.max(minutesA, minutesB)
  const minMin = Math.min(minutesA, minutesB)
  if (maxMin <= 2 && minMin >= 1) return 'Bullet'
  if (maxMin >= 3 && maxMin <= 5 && minMin >= 1) return 'Blitz'
  if (maxMin >= 10 && maxMin <= 15 && minMin >= 1) return 'Rapid'
  if (maxMin >= 20 && maxMin <= 30 && minMin >= 1) return 'Classical'
  return 'Custom'
}

export function resolveRoomTimeControl(room) {
  if (!room || typeof room !== 'object') return null
  const candidates = [
    room.timeControl,
    room.game?.timeControl,
    room.game?.state?.timeControl,
    room.game?.state?.initialClientState?.timeControl,
    room.game?.state?.clientState?.timeControl,
    room.initialClientState?.timeControl,
    room.clientState?.timeControl,
    room.state?.timeControl,
  ]
  for (const tc of candidates) {
    if (tc && typeof tc === 'object' && typeof tc.minutesA === 'number' && typeof tc.minutesB === 'number') {
      const mA = tc.minutesA
      const mB = tc.minutesB
      const category = tc.category || classifyTimeMinutes(mA, mB)
      return {
        category,
        label: tc.label || `${mA}+${mB}`,
        minutesA: mA,
        minutesB: mB,
      }
    }
  }
  const wMs = Number(room.game?.whiteTimeMs ?? room.whiteTimeMs ?? room.white_time_ms)
  const bMs = Number(room.game?.blackTimeMs ?? room.blackTimeMs ?? room.black_time_ms ?? wMs)
  if (Number.isFinite(wMs) && wMs > 0) {
    const mA = Math.max(1, Math.round(wMs / 60000))
    const mB = Number.isFinite(bMs) && bMs > 0 ? Math.max(1, Math.round(bMs / 60000)) : mA
    const maxM = Math.max(mA, mB)
    const minM = Math.min(mA, mB)
    const category = classifyTimeMinutes(maxM, minM)
    return {
      category,
      label: `${maxM}+${minM}`,
      minutesA: maxM,
      minutesB: minM,
    }
  }
  return null
}

export function formatTimeControlSummary(tc) {
  if (!tc) return 'Rapid · 10+10 (10 min each)'
  const maxM = Math.max(tc.minutesA, tc.minutesB)
  const minM = Math.min(tc.minutesA, tc.minutesB)
  if (maxM !== minM) {
    return `${tc.category} · ${tc.label} (${maxM}m vs ${minM}m · higher score gets ${minM}m)`
  }
  return `${tc.category} · ${tc.label} (${maxM} min each)`
}

