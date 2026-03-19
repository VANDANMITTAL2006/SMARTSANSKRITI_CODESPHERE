import { supabase } from './supabase'

export async function signUp(
  email: string,
  password: string,
  fullName: string,
  phone: string
) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        phone: phone
      }
    }
  })
  if (error) throw error

  // Manually create profile as backup in case trigger fails
  if (data.user) {
    try {
      const { error: profileError } = await supabase
        .from('user_profiles')
        .upsert({
          id: data.user.id,
          email: email,
          full_name: fullName,
          phone: phone,
          user_type: 'tourist',
          language: 'en',
          total_xp: 0,
          monuments_visited: [],
          quiz_scores: [],
          chat_history: []
        }, { onConflict: 'id' })
      
      if (profileError) {
        console.warn('Profile creation warning:', profileError.message)
      }
    } catch {
      // Silent — don't block signup for profile errors
    }
  }

  return data
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email, password
  })
  if (error) {
    if (error.message.includes('Email not confirmed')) {
      throw new Error('Please check your email and confirm your account first.')
    }
    if (error.message.includes('Invalid login credentials')) {
      throw new Error('Wrong email or password. Please try again.')
    }
    throw error
  }

  // Ensure profile exists on login
  if (data.user) {
    const existing = await getUserProfile(data.user.id)
    if (!existing) {
      await supabase.from('user_profiles').upsert({
        id: data.user.id,
        email: data.user.email,
        full_name: data.user.user_metadata?.full_name || '',
        phone: data.user.user_metadata?.phone || '',
        user_type: 'tourist',
        language: 'en',
        total_xp: 0,
        monuments_visited: [],
        quiz_scores: [],
        chat_history: []
      }, { onConflict: 'id' })
    }
  }

  return data
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function getUserProfile(userId: string) {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .single()
  if (error) return null
  return data
}

export async function updateUserProfile(
  userId: string,
  updates: Partial<{
    user_type: string
    language: string
    total_xp: number
    monuments_visited: string[]
    quiz_scores: Record<string, number>
    chat_history: object[]
  }>
) {
  const { error } = await supabase
    .from('user_profiles')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', userId)
  if (error) throw error
}

export async function addXP(
  userId: string,
  xpDelta: number,
  eventType: string
): Promise<number> {
  try {
    // READ current value from Supabase (not from state)
    const { data: current, error: selectErr } = await supabase
      .from('user_profiles')
      .select('total_xp')
      .eq('id', userId)
      .single()

    if (selectErr) {
      console.error('addXP SELECT failed:', selectErr.message)
      return 0
    }

    const currentXP = current?.total_xp ?? 0
    const newXP = currentXP + xpDelta

    // WRITE new value to Supabase
    const { error: updateErr } = await supabase
      .from('user_profiles')
      .update({ total_xp: newXP, updated_at: new Date().toISOString() })
      .eq('id', userId)

    if (updateErr) {
      console.error('addXP UPDATE failed:', updateErr.message)
      return 0
    }

    // Fire and forget to backend
    fetch('https://heritageai-backend.onrender.com/game/xp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, xp_delta: xpDelta, event_type: eventType })
    }).catch(() => {})

    // Tell all components to re-fetch profile from Supabase
    window.dispatchEvent(new Event('xp-updated'))

    console.log(`✅ XP saved: ${currentXP} + ${xpDelta} = ${newXP}`)
    return newXP
  } catch (err) {
    console.error('❌ addXP failed:', err)
    return 0
  }
}

export async function addMonumentVisited(
  userId: string,
  monumentName: string
): Promise<string[]> {
  try {
    const { data: current } = await supabase
      .from('user_profiles')
      .select('monuments_visited')
      .eq('id', userId)
      .single()

    const existing: string[] = current?.monuments_visited ?? []
    if (existing.includes(monumentName)) return existing

    const updated = [...existing, monumentName];
    await supabase
      .from('user_profiles')
      .update({
        monuments_visited: updated,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      
    return updated;
  } catch (err) {
    console.error('addMonumentVisited failed:', err)
    return []
  }
}

export async function addQuizScore(
  userId: string,
  score: number
): Promise<number[]> {
  try {
    const { data: current } = await supabase
      .from('user_profiles')
      .select('quiz_scores')
      .eq('id', userId)
      .single()

    let existing = current?.quiz_scores
    if (!Array.isArray(existing)) {
      existing = existing ? Object.values(existing) : []
    }
    
    const updated = [...existing, score];

    await supabase
      .from('user_profiles')
      .update({
        quiz_scores: updated,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      
    return updated;
  } catch (err) {
    console.error('addQuizScore failed:', err)
    return []
  }
}

export async function computeAndSaveBadges(
  userId: string,
  updatedState?: {
    total_xp?: number;
    monuments_visited?: string[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    quiz_scores?: any;
  }
): Promise<string[]> {
  try {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (!profile) return []

    const earned: string[] = []
    
    // Merge DB state with explicitly passed updated state to prevent read-replica lag race conditions
    const xp = updatedState?.total_xp ?? profile.total_xp ?? 0
    const visitedList = updatedState?.monuments_visited ?? profile.monuments_visited ?? []
    const visited = visitedList.length
    
    const rawQuiz = updatedState?.quiz_scores ?? profile.quiz_scores ?? {}
    const quizValues: number[] = Array.isArray(rawQuiz) ? rawQuiz : Object.values(rawQuiz as Record<string, number>)
    const quizTotal = quizValues.reduce((a: number, b: number) => a + b, 0)

    if (visited >= 1)     earned.push('first_scan')
    if (quizTotal >= 100) earned.push('quiz_master')
    if (visited >= 3)     earned.push('explorer')
    if (xp >= 500)        earned.push('hunter')
    if (xp >= 2000)       earned.push('legend')

    // Avoid unnecessary DB writes if badges haven't changed
    const currentBadges = profile.badges || []
    if (earned.length === currentBadges.length && earned.every(b => currentBadges.includes(b))) {
      return earned
    }

    const { error } = await supabase
      .from('user_profiles')
      .update({ badges: earned, updated_at: new Date().toISOString() })
      .eq('id', userId)

    if (error) console.error('computeAndSaveBadges error:', error)

    return earned
  } catch (err) {
    console.error('computeAndSaveBadges failed:', err)
    return []
  }
}

export async function saveChatMessage(
  userId: string,
  role: string,
  content: string,
  monument: string
) {
  const profile = await getUserProfile(userId)
  if (!profile) return
  const history: object[] = profile.chat_history || []
  const updated = [...history, { role, content, monument,
    timestamp: new Date().toISOString() }].slice(-50)
  await updateUserProfile(userId, { chat_history: updated })
}
