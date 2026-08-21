import { useContext } from 'react'
import type { User } from '@supabase/supabase-js'
import { AuthContext } from './auth-context'

export function useAuth() {
  return useContext(AuthContext)
}

export function getUserName(user: User | null) {
  if (!user) return ''
  const metadata = user.user_metadata ?? {}
  return String(metadata.fullname ?? metadata.full_name ?? metadata.name ?? user.email?.split('@')[0] ?? 'مستخدم')
}

export function getUserAvatar(user: User | null) {
  if (!user) return null
  const metadata = user.user_metadata ?? {}
  return typeof metadata.avatar_url === 'string' ? metadata.avatar_url : typeof metadata.picture === 'string' ? metadata.picture : null
}
