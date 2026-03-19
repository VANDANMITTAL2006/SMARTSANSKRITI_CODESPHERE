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
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  // Use ref so event handlers always have latest user
  const userRef = useRef<User | null>(null)
  useEffect(() => { userRef.current = user }, [user])

  // Fetch profile from Supabase
  const fetchProfile = useCallback(async (uid?: string) => {
    const id = uid || userRef.current?.id
    if (!id) {
      console.warn('[fetchProfile] No user id available, skipping')
      return
    }
    try {
      console.log('[fetchProfile] Fetching profile for:', id)
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', id)
        .single()
      if (error) {
        console.error('[fetchProfile] Supabase error:', error.message, error.details, error.hint)
        return
      }
      console.log('[fetchProfile] ✅ Got profile, total_xp =', data?.total_xp)
      if (data) setProfile(data)
    } catch (err) {
      console.error('[fetchProfile] Exception:', err)
    }
  }, [])

  // Safe setProfile that supports functional updates
  const safeSetProfile = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (updater: any) => {
      if (typeof updater === 'function') {
        setProfile(prev => updater(prev))
      } else {
        setProfile(updater)
      }
    }, [])

  // ─── Initial session + auth state changes ───
  useEffect(() => {
    let mounted = true

    const timeout = setTimeout(() => {
      if (mounted && loading) {
        console.warn('Auth session check timed out')
        setLoading(false)
      }
    }, 5000)

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return
      console.log('[AuthProvider] getSession →', session?.user?.id ?? 'no session')
      setUser(session?.user ?? null)
      if (session?.user) {
        console.log('[AuthProvider] Calling fetchProfile from getSession')
        fetchProfile(session.user.id)
      }
      setLoading(false)
    }).catch(() => {
      if (mounted) setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!mounted) return
        setUser(session?.user ?? null)
        if (session?.user) {
          await fetchProfile(session.user.id)
        } else {
          setProfile(null)
        }
        setLoading(false)
      }
    )

    return () => {
      mounted = false
      clearTimeout(timeout)
      subscription.unsubscribe()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ─── Listen for 'xp-updated' + 'focus' → re-fetch profile ───
  useEffect(() => {
    const handler = () => {
      const id = userRef.current?.id
      console.log('[AuthProvider] xp-updated/focus event → refetching for:', id)
      if (id) fetchProfile(id)
    }
    window.addEventListener('xp-updated', handler)
    window.addEventListener('focus', handler)
    return () => {
      window.removeEventListener('xp-updated', handler)
      window.removeEventListener('focus', handler)
    }
  }, [fetchProfile])

  return (
    <AuthContext.Provider value={{
      user, profile, loading,
      setProfile: safeSetProfile,
      refreshProfile: fetchProfile,
      signIn, signOut, signUp
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
