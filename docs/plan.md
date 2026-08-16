# Chess Web App — Project Plan

## 1. Overview
A React front-end for a chess platform where users can sign up, play chess, learn, engage with a community, read chess news, and donate.

## 2. Tech Stack
- **Framework:** React (Vite recommended over CRA for speed)
- **Routing:** React Router v6
- **State management:** Context API to start; consider Redux Toolkit only if state grows complex
- **Styling:** CSS Modules or Tailwind CSS (pick one, stay consistent)
- **Chess logic:** `chess.js` (rules engine) + `react-chessboard` (board UI)
- **Auth:** Firebase Auth or a custom backend with JWT (email/password sign-up)
- **Backend (future):** Node/Express or Firebase, needed for auth, user data, news storage, donations
- **HTTP client:** `axios` or native `fetch` wrapped in a service layer

## 3. Folder Structure (component-first, clearly separated)
```
src/
├── assets/                # images, icons, fonts
├── components/             # small, reusable, dumb UI pieces
│   ├── common/              # Button, Input, Modal, Loader, Navbar, Footer
│   ├── chess/                # ChessBoard, MoveHistory, GameTimer, CapturedPieces
│   └── news/                 # NewsCard, NewsFeed
├── pages/                  # route-level components (one per tab/page)
│   ├── LoginPage/
│   ├── SignupPage/
│   ├── PlayPage/
│   ├── LearnPage/
│   ├── CommunityPage/
│   ├── DonatePage/
│   └── NewsPage/
├── layouts/                # AppLayout (navbar + outlet), AuthLayout
├── context/                 # AuthContext, GameContext
├── hooks/                   # useAuth, useChessGame, useFetchNews
├── services/                 # api.js, authService.js, newsService.js, chessService.js
├── routes/                  # AppRouter.jsx, ProtectedRoute.jsx
├── utils/                   # helpers, constants, validators
├── App.jsx
└── main.jsx
```

**Principle:** `components/` = presentational/reusable, no route logic. `pages/` = compose components + hooks for a specific route. `services/` = all outside-world calls isolated from UI.

## 4. Pages / Tabs (Navigation)
| Tab | Route | Auth required? | Purpose |
|---|---|---|---|
| Login | `/login` | No | Email/password sign-in |
| Sign Up | `/signup` | No | Email/password registration |
| Play | `/play` | Yes | Chess board, play vs friend/bot |
| Learn | `/learn` | No (or optional) | Lessons, puzzles, tutorials |
| Community | `/community` | Yes | Forums, friend lists, leaderboards |
| News | `/news` | No | Auto/random posted chess news feed |
| Donate | `/donate` | No | Donation form/links |

## 5. Feature Breakdown

### Auth (email sign-up)
- Signup form: email, password, confirm password, validation
- Login form: email, password
- `AuthContext` to hold current user + auth status app-wide
- `ProtectedRoute` wrapper component to guard Play/Community tabs

### Play Tab
- `ChessBoard` component wrapping `react-chessboard`
- Game logic handled via `chess.js` inside a `useChessGame` hook
- `MoveHistory`, `GameTimer`, `CapturedPieces` as separate small components

### Learn Tab
- List of lessons/puzzles (`LessonCard` component)
- Could start as static JSON content, later pulled from backend

### Community Tab
- User posts/forum thread list (`CommunityPost` component)
- Optional: friend list, chat, leaderboard components

### News Tab
- `NewsFeed` pulls from `newsService.js`
- "Randomly post" news = backend cron job or scheduled function that pushes items to a news DB/API; front end just polls/fetches and renders via `NewsCard`
- Front end itself doesn't generate news — it displays what the backend posts

### Donate Tab
- Simple form or embedded payment link (Stripe/PayPal button component)

## 6. Suggested Build Order (Phases)
1. **Scaffold:** Vite + React Router + folder structure + Navbar/Footer layout
2. **Auth:** Signup/Login pages + AuthContext + protected routes (start with mock/local auth, swap in real backend later)
3. **Play Tab:** integrate chess.js + react-chessboard, basic move logic
4. **Static tabs:** Learn, News (static/dummy data), Donate
5. **Community Tab:** posts UI, wire to backend once ready
6. **Backend integration:** real auth, real news source, real donation processing
7. **Polish:** responsive design, loading/error states, tests

## 7. UI Style — "Tournament Hall" Design System

Chess's own materials — walnut boards, ivory and ebony pieces, brass clocks, felt-lined tables, and the precise language of algebraic notation — are the source for this palette, rather than a generic SaaS look. The interface should feel like a well-kept club room: warm, quiet, high-contrast where it counts, with exactly one metal accent doing all the "interactive" signaling.

```yaml
colors:
  ink: "#1b140f"          # near-black walnut/ebony — headlines, body text
  canvas: "#faf6ee"        # ivory — primary background
  canvas-dim: "#f1e9d8"     # warm parchment — alternating section band, card fill
  board-dark: "#3c2a1a"     # dark walnut — dark tiles, footer, nav bar
  accent-gold: "#b8863b"    # brass/notation gold — the ONE interactive color: buttons, links, active states
  accent-gold-hover: "#a5762f"
  felt-green: "#2f4a3d"     # tournament felt — success/online/"your turn" states only
  garnet: "#7a2e2e"         # check/error/urgent states only — used sparingly
  hairline: "#d9c8a0"       # borders on ivory surfaces
  hairline-dark: "#4a3624"  # borders on walnut surfaces
  text-muted: "#6b5d4a"     # secondary copy on ivory
  text-on-dark: "#f1e9d8"   # body text on walnut surfaces

typography:
  display:
    fontFamily: "Fraunces, Georgia, serif"     # a serif with real ink-trap character — reads like an engraved brass nameplate
    weight: 600
    use: "Headlines, page titles, section heads"
  body:
    fontFamily: "Inter, system-ui, sans-serif"
    weight: 400
    use: "Paragraphs, nav labels, form fields, buttons"
  notation:
    fontFamily: "IBM Plex Mono, monospace"
    weight: 400
    use: "Move lists (e4, Nf3), usernames/handles, timestamps, ratings, ECO codes, clocks — the signature typographic device: anything that is literally chess data is set in notation face"
```

**Signature element:** move/game data (usernames, ratings, clocks, PGN move lists, ECO codes) is always rendered in `notation` monospace, everywhere in the app — profile headers, community post bylines, news datelines. This is the one consistent "tell" that ties every tab back to the chessboard itself, the way a scoresheet ties a game together.

### Layout concept
Sections alternate between `canvas` (ivory) and `board-dark` (walnut) the way ranks alternate on a board — not literally checkered, just a slow light/dark pulse between page sections, so it never feels like a flat form-heavy admin tool.

```
┌─────────────────────────────┐
│ NAV (board-dark, gold logo)  │  ← clock-bar nav, always walnut
├─────────────────────────────┤
│ HERO (canvas)                 │
│  headline in Fraunces         │
│  gold pill CTA "Play now"      │
├─────────────────────────────┤
│ FEATURE BAND (board-dark)      │  ← e.g. Learn tab teaser
├─────────────────────────────┤
│ CONTENT (canvas-dim)           │
└─────────────────────────────┘
```

### Component styling by tab
| Component | Notes |
|---|---|
| `NavBar` | `board-dark` background, ivory text, gold underline on active tab — reads like a clock bar |
| `AuthCard` (Login/Signup) | Centered ivory card, square (not pill) corners with a thin gold top border — echoes a scorecard header; inputs have a simple hairline underline, no heavy boxes |
| `ChessBoard` (Play tab) | The board itself keeps traditional light/dark squares (not the app palette) so it stays legible; surrounding chrome (move list, timer, captured pieces) uses `canvas-dim` + notation mono |
| `MoveList` | Notation mono, two-column (White/Black), garnet highlight only on check/checkmate |
| `LessonCard` (Learn tab) | Ivory card, Fraunces title, felt-green "difficulty" tag |
| `CommunityPost` | Ivory card, notation-mono username + timestamp, gold "reply" link |
| `NewsCard` | Walnut band or ivory card with a small gold rule under the headline, notation-mono dateline |
| `DonateCard` | Single gold `button-primary` pill CTA, no urgency-red — donation asks stay calm, not aggressive |
| `PrimaryButton` | Gold fill, ivory text, pill radius, `scale(0.96)` on press |
| `SecondaryButton` | Transparent, 1px gold border, gold text |

### Do's and Don'ts
**Do**
- Keep `accent-gold` as the only interactive/clickable color across every tab.
- Set all chess-specific data (usernames, ratings, moves, timestamps) in notation mono — it's the app's signature.
- Alternate ivory/walnut section bands for rhythm instead of adding shadows or gradients.

**Don't**
- Don't skin the chessboard itself in the brand palette — traditional board contrast must stay legible for play.
- Don't use garnet/red anywhere except check, checkmate, errors, or account warnings — it should stay rare and meaningful.
- Don't mix in a second display typeface; Fraunces carries all headline personality.

## 8. Open Questions to Resolve Before Coding
- Real backend now, or start with mocked data/local storage and add backend later?
- Play vs. bot, vs. friend (multiplayer/websockets), or both?
- Where does "news" come from — manual admin posts, or auto-pulled from a chess news API (e.g. chess.com/lichess blogs)?
- Payment provider for Donate tab (Stripe, PayPal, etc.)?