// web/src/App.tsx
import BrowsePage from './features/browse/BrowsePage'
import LoginPage from './features/auth/LoginPage'
import SubmitPage from './features/submit/SubmitPage'
import RequestsPage from './features/requests/RequestsPage'
import ProfilePage from './features/profile/ProfilePage'
import './App.css'

function App() {
  if (window.location.pathname === '/login') return <LoginPage />
  if (window.location.pathname === '/submit') return <SubmitPage />
  if (window.location.pathname === '/requests') return <RequestsPage />
  if (window.location.pathname === '/profile') return <ProfilePage />
  return <BrowsePage />
}

export default App
