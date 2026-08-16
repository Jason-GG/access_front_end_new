# Access Chess — Tournament Hall

A React front end for a chess platform: play, learn, connect with the community, read chess
news, and support the club — styled around an editorial, commerce-grade design system:
photography speaks, the chrome doesn't. Pure black, pure white, one soft gray, pill
geometry, flat cards, and a towering uppercase display tier.

Built from the project plan in `docs/plan.md` (scaffold + auth + play + static tabs first,
backend integration later).

## Tech stack

- **React 19 + Vite** — fast dev server and builds
- **React Router v7** — routing with protected routes
- **Context API** — `AuthContext` (session) and `GameContext` (board settings)
- **chess.js** — full rules engine
- **react-chessboard** — board UI with drag-and-drop
- **CSS Modules** — component-scoped styles over a shared token file (`src/index.css`)

## Getting started

```bash
npm install
npm run dev
```

Open the printed local URL. `npm run build` produces a production bundle in `dist/`.

## What's implemented

| Tab | Route | Auth | Status |
|---|---|---|---|
| Home | `/` | No | Landing with hero + feature bands |
| Login | `/login` | No | Email/password, mock auth |
| Sign Up | `/signup` | No | Email/password/confirm with validation |
| Play | `/play` | Yes | Working chess: drag moves, bot or two-player, move list, clocks, captured pieces |
| Learn | `/learn` | No | Static lesson cards |
| Community | `/community` | Yes | Bulletin board with composer |
| News | `/news` | No | Feed rendered from a mock news service |
| Donate | `/donate` | No | Amount picker + demo payment flow |

## Project structure

```
src/
├── assets/          # images, icons, fonts (currently just the logo mark)
├── components/
│   ├── common/       # Button, Input, Modal, Loader, Navbar, Footer
│   ├── chess/        # ChessBoard, MoveHistory, GameTimer, CapturedPieces
│   └── news/         # NewsCard, NewsFeed
├── pages/            # one folder per route
├── layouts/          # AppLayout (navbar + outlet), AuthLayout
├── context/          # AuthContext, GameContext
├── hooks/            # useAuth, useChessGame, useFetchNews
├── services/         # api, authService, newsService, chessService
├── routes/           # AppRouter, ProtectedRoute
├── data/             # static lessons/news/posts content
└── utils/            # constants, helpers, validators
```

The rule of thumb from the plan: `components/` stays presentational, `pages/` compose
components and hooks, and `services/` isolate every outside-world call from the UI.

## Design system notes

- **Chrome palette:** `#111111` ink, `#ffffff` canvas, `#f5f5f5` soft-cloud carry the
  surfaces, with two brand accents on top — **pink** (`#ed1aa0`) for interactive moments
  (primary CTAs, active chips, links) and **teal** (`#0a7281`) for editorial moments
  (eyebrows, categories, lesson badges, on-image CTAs).
- Semantic color stays reserved: sale red for check/errors, success green for "your turn",
  info blue for member callouts.
- **Shape vocabulary:** every CTA, filter chip, and badge is a pill (`9999px`); every card,
  tile, and container is flat (`0px` radius, no shadow).
- **Typography:** Bebas Neue at 96px/0.9 line-height/uppercase for the single campaign
  display tier; Inter 400/500 for everything else — the "billboard above, catalog below"
  jump is intentional.
- **Chess data** (usernames, clocks, move lists, datelines) stays in the UI face, marked
  by weight and size rather than decoration.
- **The chessboard itself** keeps traditional square colors for legibility — the brand
  palette never touches the playing surface.
- **Spacing:** 8px base grid; sections breathe at 48px rhythm with no decorative dividers.
- Fonts load from Google Fonts with system fallbacks (Arial Narrow, Helvetica, Arial).

The design system mirrors the Nike-design-analysis reference in `docs/` — this is the
adapted "editorial chess club" build.

## Demo-mode decisions (the plan's open questions)

- **Auth:** mock/local only — accounts and passwords live in `localStorage` for now.
  Swap `src/services/authService.js` for real JWT/Firebase calls later; never ship
  plain-text passwords client-side.
- **Opponent:** a simple house bot (capture-preferring random) plus same-board
  two-player mode. No networking yet.
- **News:** static items served by a mock service. A backend cron/scheduled job would
  be the real source; the front end just fetches and renders.
- **Donations:** demo flow with a confirmation dialog. Stripe/PayPal connect when the
  backend exists.
- **Promotions:** pawns auto-promote to a queen in this first pass.
- **Campaign photography:** the hero uses a code-native board-grid texture today; real
  editorial photography can drop into `src/assets/` (see `HomePage`) when assets exist.

## Roadmap from the plan

1. ✅ Scaffold — Vite, router, layouts, design system
2. ✅ Auth — mock signup/login + protected routes
3. ✅ Play — chess.js + react-chessboard with basic move logic
4. ✅ Static tabs — Learn, News, Donate, Community UI
5. ⏳ Backend — real auth, real news source, real donation processing
6. ⏳ Polish — responsive pass, loading/error states, tests
