import { createContext } from 'react'
import type { Session } from '@supabase/supabase-js'

export type AuthContextValue = {
  session: Session | null
  user: Session['user'] | null
  loading: boolean
}

export const AuthContext = createContext<AuthContextValue>({ session: null, user: null, loading: true })
