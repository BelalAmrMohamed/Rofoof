// web/src/App.tsx
import BrowsePage from './features/browse/BrowsePage'
import LoginPage from './features/auth/LoginPage'
import SubmitPage from './features/submit/SubmitPage'
import './App.css'

function App() {
  if (window.location.pathname === '/login') return <LoginPage />
  if (window.location.pathname === '/submit') return <SubmitPage />
  return <BrowsePage />
}

export default App
