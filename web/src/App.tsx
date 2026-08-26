// web/src/App.tsx
import BrowsePage from './features/browse/BrowsePage'
import LoginPage from './features/auth/LoginPage'
import SubmitPage from './features/submit/SubmitPage'
import RequestsPage from './features/requests/RequestsPage'
import ProfilePage from './features/profile/ProfilePage'
import AboutPage from './features/about/AboutPage'
import MosquePage from './features/mosque/MosquePage'
import BookPage from './features/book/BookPage'
import './App.css'

function App() {
  const { pathname } = window.location
  if (pathname === '/login') return <LoginPage />
  if (pathname === '/submit') return <SubmitPage />
  if (pathname === '/requests') return <RequestsPage />
  if (pathname === '/profile') return <ProfilePage />
  if (pathname === '/about') return <AboutPage />
  if (pathname.startsWith('/mosques/')) return <MosquePage />
  if (pathname.startsWith('/books/')) return <BookPage />
  return <BrowsePage />
}

export default App