export const ROUTES = {
  home: '/',
  play: '/play',
  playRoom: '/play/:roomId',
  learn: '/learn',
  community: '/community',
  news: '/news',
  donate: '/donate',
  login: '/login',
  signup: '/signup',
  verifyEmail: '/verify-email',
}

export const STORAGE_KEYS = {
  users: 'access-chess:users',
  session: 'access-chess:session',
  accessToken: 'access-chess:access-token',
  refreshToken: 'access-chess:refresh-token',
}

export const GAME = {
  botDelayMs: 700,
  defaultTimeSeconds: 600, // 10 minutes per side
}

export const PIECE_GLYPHS = {
  p: '♟',
  n: '♞',
  b: '♝',
  r: '♜',
  q: '♛',
  k: '♚',
  P: '♙',
  N: '♘',
  B: '♗',
  R: '♖',
  Q: '♕',
  K: '♔',
}

export const PIECE_VALUES = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 }
