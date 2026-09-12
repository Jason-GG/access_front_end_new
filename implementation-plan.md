# End-to-End Playable Chess Rooms Implementation Plan

Ensure players can start a room, wait for an opponent to join, have the game start immediately upon opponent arrival, and play moves back-and-forth in real-time with full timer, move history, chat, and game resolution support.

## User Review Required

> [!IMPORTANT]
> The remote backend is live at `https://achess.wguan.dpdns.org`. In development mode, WebSocket connections will point directly to `wss://achess.wguan.dpdns.org` (or Vite proxy fallback) with full authentication fallback (`Sec-WebSocket-Protocol` header and `?token=<jwt>` query parameter).

## Analysis & Root Causes Identified

1. **Room Creation Navigation Failure (`RoomLobby.jsx`):**
   - The backend `POST /play/rooms` returns `{ room: { id, gameId, createdAt }, seat: "white", status: 201 }`.
   - `RoomLobby.jsx` inspected `if (room?.id) onEnterRoom(room.id)`, which evaluated to `undefined` because the ID is nested in `room.room.id`. As a result, creating a room failed to enter the room.
   - Similarly, `handleJoin` did not resolve nested `room.room.id` or `room.id`.

2. **WebSocket Fallback Dropping Token (`usePlayRoom.js`):**
   - When `Sec-WebSocket-Protocol` subprotocol authentication failed, the fallback branch in `open()` invoked `new WebSocket(url)` with no query string and no token, instead of appending `?token=${encodeURIComponent(token)}`. The server immediately closed the socket with code `1008` (Authentication required).

3. **Move History Drop on WebSocket Events (`usePlayRoom.js`):**
   - When a move is broadcast, the server payload is `{ type: "move", move: result.rows[0], state }`.
   - The Postgres row `result.rows[0]` contains the column `move` which holds the JSON `{ color, from, to, san, ... }`.
   - `usePlayRoom` checked `if (move && (move.san || move.from))`, but `move.san` was inside `msg.move.move`, causing real-time moves to never append to `history`.

4. **Game Moves Parsing (`usePlayRoom.js`):**
   - Initial load moves from `playApi.getGameMoves(gameId)` returns `{ game: { moves: [...] } }`. `usePlayRoom` checked `moveList?.moves || moveList?.history`, missing `data?.game?.moves`.

5. **Waiting Opponent Detection Polling (`usePlayRoom.js`):**
   - When Player 2 joins (`POST /play/rooms/:id/join`), the backend updates the game status to `'active'`, but does not broadcast a WS event to existing sockets.
   - The creator's client must poll while waiting. The existing polling interval was 3000ms and could fail to register if `room` was initially null.
   - We will poll every 1500ms while waiting, trigger an immediate check on window focus, and instantly transition to active play when Black is detected.

6. **Move Execution Robustness & REST Fallback (`usePlayRoom.js`):**
   - `sendMove` only attempted WebSocket sending and would fail if the socket was momentarily reconnecting. We will add a REST fallback (`playApi.makeRoomMove`) so that moves can always be completed even during network blips.
   - Board orientation and drag permissions will strictly align with `mySeat` ('white' plays White from bottom; 'black' plays Black from bottom).

---

## Proposed Changes

### `src/components/chess/RoomLobby.jsx`

#### [MODIFY] [RoomLobby.jsx](file:///Users/sjian/Documents/projects/access_front_end_new/src/components/chess/RoomLobby.jsx)
- Fix `handleCreate`: inspect `res?.room?.id || res?.id` before calling `onEnterRoom`.
- Fix `handleJoin`: normalize `res?.room?.id || res?.id || target`.
- Update `hostName` and `timeControl` to safely read both raw backend formats (`whiteTimeMs`, `white_time_ms`, nested `user.username`, etc.).

---

### `src/hooks/usePlayRoom.js`

#### [MODIFY] [usePlayRoom.js](file:///Users/sjian/Documents/projects/access_front_end_new/src/hooks/usePlayRoom.js)
- Fix WebSocket fallback URL: ensure `?token=${encodeURIComponent(token)}` is appended when `usedFallback` is true.
- Fix `applyMove`: unpack `msg.move?.move ?? msg.move ?? msg` to extract SAN, from/to squares, and correctly append to `history`.
- Fix `applySnapshot`: support both camelCase and snake_case clocks (`white_time_ms`, `whiteTimeMs`, `clocks: { white, black }`), and extract seat from `msg.seat` or `room.seat`.
- Fix `mySeat` determination: match user ID case-insensitively, check `member.user?.id` / `member.userId`, and fallback to `joinedSeat` returned by `joinRoom`.
- Fix waiting polling: poll every 1500ms while `room?.status === 'waiting'` or when waiting for player 2; add window focus listener.
- Enhance `sendMove`: try WebSocket first; if socket is not open, use `playApi.makeRoomMove` REST API so gameplay never blocks.

---

### `src/services/request.js`

#### [MODIFY] [request.js](file:///Users/sjian/Documents/projects/access_front_end_new/src/services/request.js)
- Ensure `getWebSocketBaseUrl()` in dev mode points to `wss://achess.wguan.dpdns.org` or follows `VITE_WS_BASE_URL` so that WebSockets connect reliably to the live backend.

---

### `src/pages/PlayPage/PlayPage.jsx`

#### [MODIFY] [PlayPage.jsx](file:///Users/sjian/Documents/projects/access_front_end_new/src/pages/PlayPage/PlayPage.jsx)
- Fix `waiting` and `gameOver` booleans to handle `game.gameStatus` and `game.status?.kind`.
- Pass `game.sendMove` to `ChessBoard` and provide clear notifications when the opponent joins ("Opponent joined! Game started.").
- Ensure game over modal displays correct result labels.

---

## Verification Plan

### Automated Verification
1. Run `npm run build` or `npx vite build` to ensure zero compilation or bundling errors.
2. Verify with test script or simulation of room creation, room joining, snapshot parsing, and move sending.

### Manual Verification
1. Open `/play` in browser, click "Create a room". Verify room URL transitions to `/play/<roomId>`.
2. Confirm the room displays "Waiting for the second player. Share this room id: ...".
3. Join the room as Player 2 in an incognito window or second session.
4. Verify that Player 1 instantly transitions to "active" mode, clocks start, White's pieces unlock, and "Your move" appears.
5. Make moves from White (e.g. `e2 -> e4`) and Black (e.g. `e7 -> e5`). Confirm board updates in real time on both screens and move history updates with `1. e4 e5`.
