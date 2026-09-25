# Environment Setup (Dev & Prod)

This document explains the environment configuration setup for switching between **Development** and **Production** backend hosts.

---

## 1. Configured Backend Hosts

| Environment | Mode | API Base URL | Backend Host | WebSocket URL |
|---|---|---|---|---|
| **Development** | `development` | `/api` *(proxied)* | `https://achess-dev.wguan.dpdns.org` | `wss://achess-dev.wguan.dpdns.org` |
| **Production** | `production` | `https://achess.wguan.dpdns.org` | `https://achess.wguan.dpdns.org` | `wss://achess.wguan.dpdns.org` |

---

## 2. Files Configured

### Environment Files

- **[.env.development](file:///.env.development)**:
  ```env
  # Development Environment Configuration
  VITE_API_BASE_URL=/api
  VITE_BACKEND_URL=https://achess-dev.wguan.dpdns.org
  VITE_WS_BASE_URL=wss://achess-dev.wguan.dpdns.org
  ```

- **[.env.production](file:///.env.production)**:
  ```env
  # Production Environment Configuration
  VITE_API_BASE_URL=https://achess.wguan.dpdns.org
  VITE_BACKEND_URL=https://achess.wguan.dpdns.org
  VITE_WS_BASE_URL=wss://achess.wguan.dpdns.org
  ```

- **[.env.example](file:///.env.example)**:
  Template file tracking example environment variables for new checkouts.

- **[.gitignore](file:///.gitignore)**:
  Configured to track `.env.development`, `.env.production`, and `.env.example`, while still ignoring `.env.local` and private overrides:
  ```gitignore
  # Local env / config overrides
  *.local
  .env
  .env.*
  !.env.development
  !.env.production
  !.env.example
  ```

---

### Configuration & Code Files

#### 1. Vite Proxy ([vite.config.js](file:///vite.config.js))
Uses `loadEnv` to dynamically load environment variables based on the active mode (`development` vs `production`):
```javascript
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const defaultBackend = mode === 'production'
    ? 'https://achess.wguan.dpdns.org'
    : 'https://achess-dev.wguan.dpdns.org'
  const backend = env.VITE_BACKEND_URL || defaultBackend

  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api': {
          target: backend,
          changeOrigin: true,
          ws: true,
          rewrite: (path) => path.replace(/^\/api/, ''),
        },
      },
    },
  }
})
```

#### 2. HTTP & WebSocket Service ([src/services/request.js](file:///src/services/request.js))
- In **development**, API requests default to `/api` to leverage Vite's local dev server proxy (avoiding browser CORS issues), and WebSockets connect to `wss://achess-dev.wguan.dpdns.org`.
- In **production**, requests target `https://achess.wguan.dpdns.org`, and WebSockets connect to `wss://achess.wguan.dpdns.org`.
- Both can be overridden via `VITE_API_BASE_URL` and `VITE_WS_BASE_URL`.

---

## 3. NPM Scripts ([package.json](file:///package.json))

| Command | Mode | Backend Target | Description |
|---|---|---|---|
| `npm run dev` | `development` | `achess-dev.wguan.dpdns.org` | Starts local dev server pointing to **Dev** backend |
| `npm run dev:prod` | `production` | `achess.wguan.dpdns.org` | Starts local dev server pointing to **Prod** backend |
| `npm run build` | `production` | `achess.wguan.dpdns.org` | Builds production bundle pointing to **Prod** |
| `npm run build:dev` | `development` | `achess-dev.wguan.dpdns.org` | Builds staging bundle pointing to **Dev** |

---

## 4. How to Use & Customize

### Daily Development
Run the dev server against the dev backend:
```bash
npm run dev
```

### Local Testing Against Production
Run the dev server against the prod backend:
```bash
npm run dev:prod
```

### Direct API Calls (Bypassing Vite Dev Proxy)
If you want the browser's Network tab to call `https://achess-dev.wguan.dpdns.org` directly rather than through `http://localhost:5174/api`:
1. Create a `.env.local` file (git-ignored) or edit `.env.development`:
   ```env
   VITE_API_BASE_URL=https://achess-dev.wguan.dpdns.org
   ```
2. Restart the Vite dev server (`npm run dev`).
*(Note: Ensure the backend's CORS policy allows requests from `http://localhost:5174` when bypassing the proxy).*
