import { createContext, useContext } from 'react'
import type { Session } from '@supabase/supabase-js'

export interface AuthState {
  session: Session | null
  loading: boolean // true until we know whether a saved session exists
  // Step 1: email a 6-digit code. Returns an error message, or null on success.
  sendCode: (email: string) => Promise<string | null>
  // Step 2: check the code. Returns an error message, or null on success.
  verifyCode: (email: string, code: string) => Promise<string | null>
  signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthState | null>(null)

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
