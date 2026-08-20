// web/src/App.tsx
import BrowsePage from './features/browse/BrowsePage'
import LoginPage from './features/auth/LoginPage'
import './App.css'

function App() {
  return window.location.pathname === '/login' ? <LoginPage /> : <BrowsePage />
}

export default App
