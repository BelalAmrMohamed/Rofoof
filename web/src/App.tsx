// web/src/App.tsx
import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import BrowsePage from './features/browse/BrowsePage'
import LoginPage from './features/auth/LoginPage'
import SubmitPage from './features/submit/SubmitPage'
import RequestsPage from './features/requests/RequestsPage'
import ProfilePage from './features/profile/ProfilePage'
import AboutPage from './features/about/AboutPage'
import MosquePage from './features/mosque/MosquePage'
import BookPage from './features/book/BookPage'
import AdminFeedbackPage from './features/admin/AdminFeedbackPage'
import { Onboarding } from './features/onboarding/Onboarding'
import type { OnboardingResult } from './features/onboarding/types/location'
import { useAuth } from './lib/auth.ts'
import { supabase } from './lib/supabase'
import { reverseGeocode } from './lib/geocode'
import './App.css'

// Onboarding is shown once per account, right after the very first login/
// signup — gated on users.location_source being NULL (see
// 20260819153229_initial-schema.sql: NULL means "never prompted"). It was
// previously built but never mounted anywhere, so it silently never ran.
function OnboardingGate({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth()
  // null = "don't know yet" (still checking), true/false = decided.
  const [needsOnboarding, setNeedsOnboarding] = useState<boolean | null>(null)
  const [completing, setCompleting] = useState(false)

  useEffect(() => {
    if (authLoading) return
    if (!user || !supabase) { setNeedsOnboarding(false); return }
    let cancelled = false
    supabase.from('users').select('location_source').eq('user_id', user.id).maybeSingle().then(({ data, error }) => {
      if (cancelled) return
      // Fail open (skip onboarding) on error so a transient DB hiccup
      // never blocks someone from using the site.
      setNeedsOnboarding(!error && data ? data.location_source === null : false)
    })
    return () => { cancelled = true }
  }, [user, authLoading])

  async function handleComplete(result: OnboardingResult) {
    setCompleting(true)
    if (user && supabase) {
      const { location } = result
      let governorate: string | null = null
      let city: string | null = null
      if (location.point) {
        const geocoded = await reverseGeocode(location.point.lat, location.point.lng)
        governorate = geocoded?.state ?? null
        city = geocoded?.city ?? null
      }
      await supabase.from('users').update({
        lat: location.point?.lat ?? null,
        lng: location.point?.lng ?? null,
        location_source: location.source,
        location_updated_at: new Date().toISOString(),
        ...(governorate ? { governorate } : {}),
        ...(city ? { city } : {}),
      }).eq('user_id', user.id)
    }
    setNeedsOnboarding(false)
    setCompleting(false)
  }

  // Don't gate the login page itself, or while we're still resolving
  // auth/profile state — avoids a flash of onboarding before we know.
  if (window.location.pathname === '/login') return <>{children}</>
  if (authLoading || needsOnboarding === null) return <>{children}</>
  if (needsOnboarding || completing) return <Onboarding onComplete={(r) => void handleComplete(r)} />
  return <>{children}</>
}

function Routes() {
  const { pathname } = window.location
  if (pathname === '/login') return <LoginPage />
  if (pathname === '/submit') return <SubmitPage />
  if (pathname === '/requests') return <RequestsPage />
  if (pathname === '/admin/feedback') return <AdminFeedbackPage />
  if (pathname === '/profile') return <ProfilePage />
  if (pathname === '/about') return <AboutPage />
  if (pathname.startsWith('/mosques/')) return <MosquePage />
  if (pathname.startsWith('/books/')) return <BookPage />
  return <BrowsePage />
}

function App() {
  return (
    <OnboardingGate>
      <Routes />
    </OnboardingGate>
  )
}

export default App