'use client'
import {
  createContext, useContext, useEffect,
  useState, useCallback, useRef, ReactNode
} from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from './supabase'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Profile = Record<string, any>

interface AuthContextType {
  user: User | null
  profile: Profile | null
  loading: boolean
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setProfile: (updater: any) => void
  refreshProfile: (uid?: string) => Promise<void>
  signIn: typeof signIn
  signOut: typeof signOut
  signUp: typeof signUp
}

// ─── Auth functions (outside component to avoid re-creation) ───
async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) {
    if (error.message.includes('Email not confirmed'))
      throw new Error('Please check your email and confirm your account first.')
    if (error.message.includes('Invalid login credentials'))
      throw new Error('Wrong email or password. Please try again.')
    throw error
  }
  return data
}

async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

async function signUp(email: string, password: string, fullName: string, phone: string) {
  const { data, error } = await supabase.auth.signUp({
    email, password,
    options: { data: { full_name: fullName, phone } }
  })
  if (error) throw error
  if (data.user) {
    try {
      await supabase.from('user_profiles').upsert({
        id: data.user.id, email, full_name: fullName, phone,
        user_type: 'tourist', language: 'en', total_xp: 0,
        monuments_visited: [], quiz_scores: [], badges: [],
        chat_history: []
      }, { onConflict: 'id' })
    } catch { /* silent */ }
  }
  return data
}

const AuthContext = createContext<AuthContextType>({
  user: null, profile: null, loading: true,
  setProfile: () => {},
  refreshProfile: async () => {},
  signIn, signOut, signUp
})

export function AuthProvider({ children }: { children: ReactNode }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [user, setUser] = useState<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const fetchProfile = async (userId: string) => {
    try {
      const { data } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single()
      if (data) setProfile(data)
    } catch (err) {
      console.error('fetchProfile error:', err)
    }
  }

  // CRITICAL: getSession on mount handles page refresh
  // Without this, profile never loads on refresh
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user)
        fetchProfile(session.user.id)
      }
      setLoading(false)
    })

    // This handles login/logout/token refresh
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setUser(session?.user ?? null)
        if (session?.user) {
          await fetchProfile(session.user.id)
        } else {
          setProfile(null)
        }
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  // Re-fetch when window gets focus (tab switch back)
  useEffect(() => {
    const handler = () => {
      if (user?.id) fetchProfile(user.id)
    }
    window.addEventListener('focus', handler)
    return () => window.removeEventListener('focus', handler)
  }, [user])

  // Re-fetch when xp-updated event fires from any page
  useEffect(() => {
    const handler = () => {
      if (user?.id) fetchProfile(user.id)
    }
    window.addEventListener('xp-updated', handler)
    return () => window.removeEventListener('xp-updated', handler)
  }, [user])

  // Safe setProfile that supports functional updates
  const safeSetProfile = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (updater: any) => {
      if (typeof updater === 'function') {
        setProfile((prev: Profile | null) => updater(prev))
      } else {
        setProfile(updater)
      }
    }, [])

  return (
    <AuthContext.Provider value={{
      user, profile, loading,
      setProfile: safeSetProfile,
      refreshProfile: (uid?: string) => user?.id ? fetchProfile(uid || user.id) : Promise.resolve(),
      signIn, signOut, signUp
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
