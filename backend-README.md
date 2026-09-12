# achess backend

TypeScript + Express backend for an international chess game, with JWT authentication, PostgreSQL persistence, and server-side role authorization.

Business data access uses Prisma ORM for type-safe queries, relations, and ordinary transactions. PostgreSQL-native SQL remains only where it is intentional: ordered migration execution, advisory locks, `LISTEN/NOTIFY`, and row locks required for multi-Pod chess concurrency.

The game rules use `chess.js` and standard chess FEN. Supported rules include legal piece movement, alternating turns, check, checkmate, stalemate, draw detection, castling, en passant, and pawn promotion.

Automatic game endings are detected precisely and persisted on the `games.result` column:

- `white_checkmate` / `black_checkmate` — the side that just moved delivered the mate;
- `stalemate`, `insufficient_material`, `fifty_move_rule`, `threefold_repetition` — automatic draws.

A move that ends the game (checkmate or any automatic draw) sets the game to `finished` with the matching `result`, so a finished game always records *why* it ended. The move event also reports a `gameOverReason` so clients can render the correct outcome without re-deriving it. A player who runs out of time is recorded as `white_timeout`/`black_timeout` by the optional chess clock, a resignation is recorded as `white_resigned`/`black_resigned`, a mutually agreed draw is `agreed_draw`, and a game cancelled before any moves were made is `aborted`.

## Structure

```text
src/
 config/                  environment configuration
 domain/                  domain types
 dto/                     request DTOs
 controllers/             all HTTP controllers
 routes/                  all HTTP routes
 services/                all application services
 middleware/              authentication and shared HTTP middleware
 gateways/                WebSocket gateways
 infrastructure/database/ PostgreSQL client and SQL migrations
 infrastructure/realtime/ Redis and PostgreSQL event transports
 app.ts                   Express application and route composition
 main.ts                  database migration and process startup
```

The core data model keeps responsibilities separate:

```text
User              identity, credentials, role, email verification
Game              match lifecycle, result, timestamps, retention
GameParticipant   user-to-game membership and color (white/black)
GameState         current FEN and monotonic board version
GameMove          immutable move history and resulting FEN
PlayRoom          online room for a game
RoomMember        room presence and seat (player/spectator)
RoomComment       chat message posted by any room participant or spectator
```

`User` has no chessboard or color fields. A user can participate in many games, and color belongs to the relationship between a user and a specific game, not to the user itself.

Database schema is maintained in `src/infrastructure/database/migrations/*.sql`. Before the first release the schema lives in a single consolidated baseline migration (`001_initial.sql`); startup runs migrations before opening the HTTP listener.

The Prisma model mapping is split under `prisma/schema/` by responsibility: identity, game, room, security, and notification. It maps the existing SQL-managed tables; Prisma is not used to silently mutate production schema at application startup.

### Migration execution

Migration files are executed in lexicographic order. The service creates `schema_migrations` and records each completed filename, so later releases can add incremental migrations as new files (`002_...`) without touching the baseline. PostgreSQL advisory locking ensures that when several Pods start at the same time, only one Pod runs the pending migrations; the others wait and then continue. Each migration runs in a transaction, so a failed migration is not recorded as completed.

The application must connect to the same shared PostgreSQL instance from every Pod. Do not use a separate PostgreSQL container inside each application Pod. For Kubernetes, run migrations before marking the application ready, and configure the deployment with a startup/readiness probe against `/health`.

For production, migrations are commonly run by a one-off release Job using the same image and `DATABASE_URL`; the built-in startup migration is still protected by the advisory lock and is suitable for simple deployments.

## Roles

- New registrations always receive `guest`.
- Registration requires an email address and does not issue a JWT until the email is verified.
- `guest` can view their own games and create games.
- `admin` can list all users, view all games, and update game status.
- The first startup creates the admin account from `ADMIN_USERNAME` and `ADMIN_PASSWORD`.

> **Role authorization is database-authoritative.** The server reads the user's current role and email-verification status from the database instead of trusting the role embedded in the (potentially stale) access token. Positive results are cached in memory for a short window (`AUTH_CACHE_TTL_MS`, default 30 seconds) to avoid a DB round trip per request; unverified or deactivated accounts always hit the database, so rejection takes effect immediately.

> **Production configuration safety.** When `NODE_ENV=production`, startup refuses to run if
> `JWT_SECRET` is a default/short value (must be ≥ 32 characters), `ADMIN_PASSWORD` is a
> default/short value (must be ≥ 16 characters), or `ADMIN_USERNAME` is still `admin`. Always
> override `JWT_SECRET` and `ADMIN_PASSWORD` (and consider changing `ADMIN_USERNAME`) in production.

## Email verification

Registration:

```text
POST /auth/register
{"username":"player1","email":"player1@example.com","password":"password123"}
```

The server stores only a SHA-256 hash of the one-time verification token. The token expires after `EMAIL_VERIFICATION_TTL_MINUTES` (15 minutes by default) and cannot be reused.

Verify or resend:

```text
GET  /auth/verify-email?token=<token-from-email>
POST /auth/verify-email       {"token":"<token-from-email>"}
POST /auth/resend-verification {"email":"player1@example.com"}
```

Configure `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`, and `PUBLIC_APP_URL` for production email delivery. In development without SMTP, the verification URL is printed to the server log. Production startup refuses to send verification mail without SMTP configuration. The bootstrap admin is marked verified so it can log in immediately.

## Run locally

Requirements: Node.js 20+ and Docker Desktop, or Node.js 20+ with PostgreSQL 14+ and Redis 7+.

```bash
cp .env.example .env
npm install
npm run dev
```

When using Prisma commands locally, set `DATABASE_URL` first. For example:

```bash
DATABASE_URL='postgres://achess:achess@localhost:5432/achess' npm run prisma:generate
```

To build and run the complete stack with Docker Compose:

```bash
npm run build
docker compose up --build
```

Compose starts the `app`, `postgres`, and `redis` services. The app waits for both health checks, runs ordered SQL migrations, and listens on `http://localhost:3000`. Check database connectivity with `GET /health`.

## API examples

Interactive API documentation is available while the server is running:

- **Swagger UI:** [`http://localhost:3000/docs`](http://localhost:3000/docs) — browse and call every endpoint interactively, including role-based auth via the `Authorize` button.
- **Raw OpenAPI 3 spec:** `http://localhost:3000/docs.json` — useful for code generation and external tooling.

Swagger is enabled in development by default and hidden in production to avoid exposing the full API schema publicly (set `ENABLE_SWAGGER=true` to force it on in any environment).

Request body schemas are generated from the same Zod schemas used for runtime validation, so the documented field constraints (types, enums, min/max lengths, regexes) always match what the server actually enforces. Sensitive admin endpoints (such as `PATCH /games/:id/status`) validate in strict mode, rejecting unexpected fields instead of silently dropping them.

Key environment configuration:

| Variable | Default | Description |
| --- | --- | --- |
| `PORT` | `3000` | HTTP listener port |
| `DATABASE_URL` | local dev URL | PostgreSQL connection string |
| `PG_POOL_MAX` | `10` | Max connections for the raw-SQL gameplay pool (separate from Prisma's pool) |
| `REDIS_URL` | *(unset → NOTIFY fallback)* | Event/snapshot transport for multi-Pod real-time |
| `ROOM_SNAPSHOT_TTL_SECONDS` | `3600` | Redis room snapshot TTL |
| `HISTORY_RETENTION_DAYS` | `30` | Lifetime of newly created games and moves |
| `JWT_SECRET` | `development-secret` | **Required strong (≥32 chars) in production** |
| `ADMIN_USERNAME` | `admin` | Bootstrap admin login; change in production |
| `ADMIN_PASSWORD` | `change-me-now` | **Required strong (≥16 chars) in production** |
| `PUBLIC_APP_URL` | `http://localhost:3000` | Base URL used in verification/reset email links |
| `EMAIL_VERIFICATION_TTL_MINUTES` | `15` | Verification token lifetime |
| `SMTP_*` | *(unset)* | Production email delivery (required when `NODE_ENV=production`) |
| `ACCESS_TOKEN_TTL` | `15m` | Short-lived JWT lifetime |
| `REFRESH_TOKEN_TTL_DAYS` | `30` | Refresh token lifetime |
| `MAX_WEBSOCKET_CONNECTIONS` | `10000` | Global WebSocket client ceiling |
| `AUTH_CACHE_TTL_MS` | `30000` | TTL for the in-memory role/verification check cache (`0` disables caching) |
| `CHESS_CLOCK_ENABLED` | `false` | Enable optional per-player move clock |
| `CHESS_CLOCK_DEFAULT_SECONDS` | `600` | Starting time budget per player (seconds) |
| `CHESS_CLOCK_INCREMENT_SECONDS` | `0` | Bonus seconds added after each move |
| `ENABLE_SWAGGER` | dev `true` / prod `false` | Expose the interactive docs at `/docs` and `/docs.json` |
| `CORS_ORIGINS` | *(empty)* | Comma-separated allowed origins |

Health endpoints:

```text
GET /health/live   process liveness only
GET /health/ready  PostgreSQL and Redis readiness
```

Authentication sessions use a short-lived access token and a rotating refresh token:

```text
POST /auth/refresh
POST /auth/logout
POST /auth/request-password-reset
POST /auth/reset-password
```

Set `CORS_ORIGINS` to a comma-separated allowlist in production. Authentication endpoints are rate-limited, request bodies are schema-validated, security headers are enabled, and every response includes an `x-request-id`.

Register a guest:

```bash
curl -X POST http://localhost:3000/auth/register \
 -H 'Content-Type: application/json' \
 -d '{"username":"player1","password":"password123"}'
```

Use the returned JWT as `Authorization: Bearer <token>` for `/auth/me` and game endpoints. Admin-only endpoints return `403` for guests.

## Player profiles and statistics

Authenticated players can access comprehensive personal statistics and leaderboards:

```text
GET /users/profile           authenticated user's full profile with analytics
GET /users/leaderboard       top 10 ranked players globally
GET /users/{id}/stats        any player's public stats (wins, losses, draws, games)
```

### Profile endpoint

`GET /users/profile` returns a complete analytics package for the authenticated user:

- **User info**: username, email, role, account creation date.
- **Stats**: win/loss/draw counts and total games.
- **Recent games**: up to 10 finished games with opponent names, colors, and outcomes.
- **Dashboard summary**: quick-glance metrics:
  - Win rate percentage
  - Recent form (last 8 games as W/L/D)
  - Current/max win streak
  - Streak label (Hot streak / On the rise / Steady / No streak)
- **Insights**: head-to-head analysis across opponents and piece colors:
  - Favorite piece color (white/black/balanced)
  - Win rate by color
  - Best opponent (by score)
  - Top 5 recent opponents by game count
- **Trend**: performance trajectory over last 30 games:
  - Cumulative win rate progression
  - Win/loss streaks and maximums
  - Trend points for chart rendering

### Leaderboard

`GET /users/leaderboard` returns the top 10 players ranked by:

1. Score: `wins * 3 + draws` (wins weighted higher than draws)
2. Total games (tiebreaker)
3. Username (final tiebreaker, alphabetical)

Each entry includes rank, username, stats, and score.

## Playchess rooms

Browse open rooms (rooms waiting for a second player):

```text
GET /play/rooms?status=waiting&limit=20
```

Returns `{ rooms, nextCursor }`. Each item includes the game status, time control, and current members. `status` defaults to all rooms; use `status=waiting` to find joinable games.

Create a room (without `gameId` to create a new game):

```bash
curl -X POST http://localhost:3000/play/rooms \
 -H "Authorization: Bearer <token>" \
 -H 'Content-Type: application/json' \
 -d '{}'
```

The room creator receives the `white` seat. The next user who joins receives `black`; every later user joins as a `spectator`. All users must authenticate independently and can call `POST /play/rooms/:id/join` before reading `GET /play/rooms/:id`.

Connect to the real-time room (JWT supplied as the `Sec-WebSocket-Protocol` value, keeping it out of the URL):

```text
ws://localhost:3000/play/rooms/<roomId>   with header "Sec-WebSocket-Protocol: <jwt>"
```

For backward compatibility the JWT may also be passed as a query parameter: `ws://localhost:3000/play/rooms/<roomId>?token=<jwt>`.

Send a move from the white or black player:

```json
{ "type": "move", "from": "e2", "to": "e4" }
```

The server validates the turn and chess legality, persists the move, and broadcasts a `move` event to every member, including spectators. Spectators receive room snapshots and move events but cannot move.

Draw offers follow a real-time contract:

```text
POST /play/rooms/:id/draw   {"action":"offer"|"accept"|"decline"}
```

- `draw.offered` is broadcast when a player offers a draw.
- Accepting ends the game with result `agreed_draw`; declining clears the offer.
- Because every move clears a pending offer, moving instead of responding implicitly declines — the server broadcasts a `draw.withdrawn` event so every client drops the draw prompt immediately.
- `resign` and draw operations run inside a row-locked transaction (`FOR UPDATE`), so they cannot interleave with a concurrent move and corrupt the result.

Takeback (悔棋):

```text
POST /play/rooms/:id/takeback   {"action":"request"|"accept"|"decline"}
```

- Only the player who made the last move can request a takeback.
- Only the other player can accept or decline.
- `accept` deletes the last move from `game_moves`, restores the previous FEN in `game_states`, and broadcasts `takeback.accepted` with the restored FEN.
- `decline` clears the pending request and broadcasts `takeback.declined`.
- A takeback request expires after **60 seconds**. If the opponent tries to accept after the window, the server auto-declines and broadcasts `takeback.declined` with `reason: "expired"`.
- Making a move implicitly declines any pending takeback request.
- At most one pending takeback request is held at a time.

Aborting a game:

```text
POST /play/rooms/:id/abort
```

Either player can abort the game while it is still in `waiting` status (no moves made). The result is recorded as `aborted` and a `game.finished` event is broadcast.

## Room chat

Any authenticated user — players and spectators alike — can post comments in a room:

```text
POST /play/rooms/:id/comments   {"body":"Good move!"}
GET  /play/rooms/:id/comments?cursor=<lastId>&limit=50
```

- Comments are limited to 500 characters.
- Every posted comment is broadcast as a `comment.posted` WebSocket event (carrying `id`, `body`, `createdAt`, and `user: { id, username }`) so all connected clients receive it in real time.
- `GET /play/rooms/:id/comments` returns cursor-paginated results ordered oldest-first. Pass the returned `nextCursor` to fetch the next page.
- Rate limited to **5 comments per 30 seconds** per user to prevent spam.

## Chess clock (optional)

Set `CHESS_CLOCK_ENABLED=true` to give every new game a per-player move clock. Each player starts with `CHESS_CLOCK_DEFAULT_SECONDS` (default `600`); after each move `CHESS_CLOCK_INCREMENT_SECONDS` (default `0`) is added back. When a player's clock runs out, the game is finalized with result `white_timeout`/`black_timeout`.

- The clock is consumed on each move inside the same row-locked transaction, so it cannot be double-spent or corrupted by concurrent moves.
- A background sweeper (every 15s) finalizes games whose player has run out of time even if nobody is connected — the game stores a precise `result` and every client receives a `game.finished` event with `action: "timeout"`.
- Room snapshots include a live `clocks: { white, black }` object (remaining milliseconds) so clients can render a countdown without a per-tick push.

When the clock is disabled, games use the previous unlimited-time behavior; existing games without a clock are unaffected.

## API response shape

All JSON responses normalize keys to camelCase, so raw database rows (`game_id`, `created_at`, `draw_offer_by`, `white_time_ms`, …) are returned as `gameId`, `createdAt`, `drawOfferBy`, `whiteTimeMs`, and so on. No strings are rewritten — move SAN/FEN values pass through unchanged.

Live connections are constrained: each user keeps at most one socket per room (a reconnect replaces the previous socket), and the global WebSocket client count is capped by `MAX_WEBSOCKET_CONNECTIONS` (default `10000`) — exceeding the cap returns a `1013` busy code.

> **WebSocket auth.** Clients authenticate by sending the JWT as the `Sec-WebSocket-Protocol` subprotocol value. This keeps the credential out of the URL (which proxies/load-balancers may log). The legacy `?token=<jwt>` query parameter remains supported for backward compatibility. On every connection the server re-verifies that the account still exists and that its email is verified.

## User management (admin)

Admin users can list, inspect, change role, and delete any non-admin account:

```text
GET    /users/me               own profile + lifetime stats
GET    /users/:id/stats        public stats for any player (authenticated)
GET    /users                  list all users (admin, cursor-paginated)
GET    /users/:id              get one user (admin)
PATCH  /users/:id/role         change role: {"role":"guest"|"admin"} (admin)
DELETE /users/:id              delete a non-admin user account (admin)
DELETE /users/me               delete own account (any authenticated user)
```

The `GET /users/me` and `GET /users/:id/stats` responses include a `stats` object:

```json
{ "wins": 12, "losses": 8, "draws": 3, "games": 23 }
```

Wins, losses, and draws are counted from all finished games (excluding aborted ones). Admin accounts are protected: `DELETE /users/:id` and `PATCH /users/:id/role` return `403` when the target is an admin.

Historical records are available from `GET /history`. Admin users can review all unexpired games; other authenticated users can review games in which they played. `GET /games` applies the same retention filter so an expired game never reappears after it should have been removed. Set `HISTORY_RETENTION_DAYS` to control the lifetime of newly created games and moves. Expired games are deleted by the hourly cleanup task, with related moves and room data removed by foreign-key cascade.

Large list endpoints are paginated with stable cursor-based pagination to bound response size and database load: `GET /history?limit=50&cursor=<lastId>` returns `{ history, nextCursor }`, `GET /games?limit=50&cursor=<lastId>` returns `{ games, nextCursor }`, and `GET /users` (admin) returns `{ users, nextCursor }`. `limit` is capped at `100` (default `50`); `cursor` should be the `nextCursor` value from the previous page.

Email delivery uses a database outbox. Registration and password reset write an email job atomically with their token, and every Pod can safely process pending jobs with `FOR UPDATE SKIP LOCKED`; failed deliveries retry with backoff and eventually become `failed` for operational review.

The outbox self-heals: when a Pod picks up a job it records a `started_at` timestamp, and jobs that were left stuck in `processing` for more than 10 minutes (because their owning Pod crashed between pickup and send) are automatically reclaimed as `pending` and retried by another Pod. Use `RUN_DB_TESTS=1` with a `DATABASE_URL` to exercise this recovery path via `npm run test:outbox`.

## Google OIDC login

Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` to enable Google sign-in. Register `GOOGLE_CALLBACK_URL` as an **Authorized redirect URI** in Google Cloud Console → OAuth 2.0.

```text
GET /auth/oidc/google/authorize   redirect the user to Google's consent screen
GET /auth/oidc/google/callback    handle the OAuth code exchange (redirect only)
```

After a successful login the server redirects to `OAUTH_SUCCESS_URL` with `accessToken`, `refreshToken`, and `expiresIn` as URL hash fragments. Three account states are handled:

1. **New user** — account created automatically with a verified email and no password (Google is the only credential).
2. **Existing email** — the Google identity is linked to the existing account; future logins via Google or password both work.
3. **Returning OIDC user** — a new session is issued directly.

When `GOOGLE_CLIENT_ID` is not set, both endpoints return `501 Not Implemented`.

## High availability

WebSocket connections are local to each Pod, while room snapshots and events use Redis when `REDIS_URL` is configured. Redis Pub/Sub forwards a move to clients on every Pod, and Redis stores room snapshots with `ROOM_SNAPSHOT_TTL_SECONDS`. PostgreSQL remains the source of truth and the existing `NOTIFY` path is used as a fallback when Redis is unavailable. Use a load balancer with WebSocket upgrade support and enable connection draining during rolling deployments.

For container deployments, send `SIGTERM` during rollout. The service stops accepting work, closes WebSocket clients, stops the email worker, and closes database connections gracefully.

## Testing

```bash
npm test               # rules + config validation + outbox (outbox skips without a DB)
npm run test:rules     # international chess rule checks (chess.js)
npm run test:config    # production config credential hardening
npm run test:outbox    # email outbox recovery — set RUN_DB_TESTS=1 and DATABASE_URL to enable
```

`test:outbox` verifies that orphaned `processing` jobs are reclaimed, that an in-flight job on another Pod is never stolen, and that picked-up jobs record a `started_at` timestamp.
