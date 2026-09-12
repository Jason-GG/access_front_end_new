import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { GameProvider } from './context/GameContext.jsx'

// Migrate direct pathname to hash route if opened without hash
if (window.location.pathname && window.location.pathname !== '/' && !window.location.hash) {
  const normalized = `${window.location.origin}/#${window.location.pathname}${window.location.search}`
  window.history.replaceState(null, '', normalized)
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <HashRouter>
      <AuthProvider>
        <GameProvider>
          <App />
        </GameProvider>
      </AuthProvider>
    </HashRouter>
  </StrictMode>,
)
