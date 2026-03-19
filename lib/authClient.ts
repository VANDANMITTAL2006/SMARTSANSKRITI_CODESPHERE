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
          quiz_scores: {},
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
        quiz_scores: {},
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
    console.log('[addXP] called:', userId, xpDelta, eventType)

    const { data: current, error: selectErr } = await supabase
      .from('user_profiles')
      .select('total_xp')
      .eq('id', userId)
      .single()

    if (selectErr) {
      console.error('[addXP] SELECT failed:', selectErr.message, selectErr.details, selectErr.hint)
      return 0
    }

    const currentXP = current?.total_xp ?? 0
    const newXP = currentXP + xpDelta
    console.log('[addXP] currentXP:', currentXP, '→ newXP:', newXP)

    const { error: updateErr } = await supabase
      .from('user_profiles')
      .update({ total_xp: newXP, updated_at: new Date().toISOString() })
      .eq('id', userId)

    if (updateErr) {
      console.error('[addXP] UPDATE failed:', updateErr.message, updateErr.details, updateErr.hint)
      return 0
    }

    console.log('[addXP] ✅ Supabase updated. newXP =', newXP)

    fetch('https://heritageai-backend.onrender.com/game/xp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, xp_delta: xpDelta, event_type: eventType })
    }).catch(() => {})

    return newXP
  } catch (err) {
    console.error('[addXP] EXCEPTION:', err)
    return 0
  }
}

export async function addMonumentVisited(
  userId: string,
  monumentName: string
): Promise<void> {
  try {
    const { data: current } = await supabase
      .from('user_profiles')
      .select('monuments_visited')
      .eq('id', userId)
      .single()

    const existing: string[] = current?.monuments_visited ?? []
    if (existing.includes(monumentName)) return

    await supabase
      .from('user_profiles')
      .update({
        monuments_visited: [...existing, monumentName],
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
  } catch (err) {
    console.error('addMonumentVisited failed:', err)
  }
}

export async function addQuizScore(
  userId: string,
  score: number
): Promise<void> {
  try {
    const { data: current } = await supabase
      .from('user_profiles')
      .select('quiz_scores')
      .eq('id', userId)
      .single()

    const existing: number[] = current?.quiz_scores ?? []

    await supabase
      .from('user_profiles')
      .update({
        quiz_scores: [...existing, score],
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
  } catch (err) {
    console.error('addQuizScore failed:', err)
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function computeAndSaveBadges(
  userId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  profile: any
): Promise<string[]> {
  try {
    const earned: string[] = []
    const xp = profile.total_xp ?? 0
    const visited = profile.monuments_visited?.length ?? 0
    const quizTotal = (profile.quiz_scores ?? [])
      .reduce((a: number, b: number) => a + b, 0)

    if (visited >= 1)     earned.push('first_scan')
    if (quizTotal >= 100) earned.push('quiz_master')
    if (visited >= 3)     earned.push('explorer')
    if (xp >= 500)        earned.push('hunter')
    if (xp >= 2000)       earned.push('legend')

    await supabase
      .from('user_profiles')
      .update({ badges: earned, updated_at: new Date().toISOString() })
      .eq('id', userId)

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
