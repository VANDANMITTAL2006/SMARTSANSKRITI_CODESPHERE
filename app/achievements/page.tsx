'use client'
import { useEffect, useState } from 'react'
import { AppShell } from '@/components/app-shell'
import { useAuth } from '@/lib/authContext'
import api from '@/lib/apiClient'
import { useLang } from '@/lib/languageContext'

// ─── Level System ───
const LEVELS = [
  { min: 0,     max: 499,   title: 'Heritage Explorer',  next: 500   },
  { min: 500,   max: 999,   title: 'Monument Seeker',    next: 1000  },
  { min: 1000,  max: 1999,  title: 'Culture Guardian',   next: 2000  },
  { min: 2000,  max: 3499,  title: 'History Keeper',     next: 3500  },
  { min: 3500,  max: 99999, title: 'Sanskriti Master',   next: null  },
]

function getLevel(xp: number) {
  return LEVELS.find(l => xp >= l.min && xp <= l.max) || LEVELS[0]
}

// ─── Badge definitions ───
const ALL_BADGES = [
  { id: 'first_scan',  name: 'First Glimpse',   icon: '🏛️', desc: 'Identify your first monument'  },
  { id: 'quiz_master', name: 'Quiz Master',      icon: '🎓', desc: 'Score 100+ XP from quizzes'    },
  { id: 'explorer',    name: 'Explorer',         icon: '🗺️', desc: 'Visit 3 or more monuments'     },
  { id: 'hunter',      name: 'Treasure Hunter',  icon: '🏆', desc: 'Complete a treasure hunt'      },
  { id: 'legend',      name: 'Sanskriti Legend',  icon: '👑', desc: 'Earn 2000+ total XP'           },
]

interface LeaderboardEntry { user_id: string; total_xp: number; full_name?: string }

function LoadingSpinner() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '3rem' }}>
      <div style={{ width: 40, height: 40, border: '3px solid rgba(201,168,76,0.2)', borderTop: '3px solid #C9A84C', borderRadius: '50%', animation: 'spin 1s linear infinite' }}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

export default function AchievementsPage() {
  const { user, profile, refreshProfile } = useAuth()
  const { t } = useLang()
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'badges' | 'leaderboard'>('badges')
  const [refreshing, setRefreshing] = useState(false)

  const totalXp = profile?.total_xp ?? 0
  const level = getLevel(totalXp)
  const nextLevel = LEVELS.find(l => l.min > level.min)
  const progress = level.next
    ? Math.min(100, Math.round(((totalXp - level.min) / (level.next - level.min)) * 100))
    : 100
  const earnedBadgeIds: string[] = profile?.badges ?? []
  const monumentsVisited: string[] = profile?.monuments_visited ?? []

  // Refresh profile on mount
  useEffect(() => { refreshProfile() }, [refreshProfile])

  const fetchLeaderboard = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    try {
      // Fetch directly from Supabase so we get full_name (backend API only returns user_id)
      const { data, error } = await (await import('@/lib/supabase')).supabase
        .from('user_profiles')
        .select('id, full_name, total_xp')
        .order('total_xp', { ascending: false })
        .limit(50)
      if (!error && data) {
        setLeaderboard(data.map(row => ({
          user_id: row.id,
          full_name: row.full_name || 'Anonymous',
          total_xp: row.total_xp ?? 0
        })))
      } else {
        // Fallback to backend API
        const res = await api.getLeaderboard()
        setLeaderboard(res.data.leaderboard || [])
      }
    } catch { console.error('Leaderboard fetch failed') }
    finally { setLoading(false); setRefreshing(false) }
  }

  useEffect(() => { fetchLeaderboard() }, [])

  const handleRefresh = async () => {
    setRefreshing(true)
    await refreshProfile()
    await fetchLeaderboard(true)
  }

  const top3 = leaderboard.slice(0, 3)
  const podiumOrder = top3.length >= 3 ? [top3[1], top3[0], top3[2]] : top3
  const podiumStyles = [
    { height: '90px', color: '#A8A8A8', crown: '🥈', label: '2nd' },
    { height: '120px', color: '#C9A84C', crown: '🥇', label: '1st' },
    { height: '75px', color: '#CD7F32', crown: '🥉', label: '3rd' },
  ]
  const currentUserRank = leaderboard.findIndex(e =>
    e.user_id === user?.id || (profile?.full_name && (e.full_name === profile.full_name || e.user_id === profile.full_name))
  ) + 1

  return (
    <AppShell>
      <style>{`@keyframes goldGlow{0%,100%{box-shadow:0 0 10px rgba(201,168,76,0.2)}50%{box-shadow:0 0 24px rgba(201,168,76,0.5)}}`}</style>
      <div style={{ padding: '24px', maxWidth: 860, margin: '0 auto' }}>
        {/* Header + Refresh */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '2rem', color: '#C9A84C', fontWeight: 700, margin: '0 0 0.4rem' }}>{t('explorer_hub')}</h1>
            <p style={{ color: '#C4A882', margin: 0 }}>{t('achievements_subtitle')}</p>
          </div>
          <button onClick={handleRefresh} disabled={refreshing} style={{
            padding: '8px 16px', background: 'rgba(75,155,142,0.15)',
            border: '1px solid rgba(75,155,142,0.4)', borderRadius: '10px',
            color: '#4B9B8E', fontSize: '13px', fontWeight: 700,
            cursor: refreshing ? 'not-allowed' : 'pointer'
          }}>
            {refreshing ? '⏳ Refreshing...' : '🔄 Refresh'}
          </button>
        </div>

        {/* XP + Level Progress card */}
        <div style={{ background: 'linear-gradient(135deg, rgba(28,22,56,0.95), rgba(20,15,45,0.9))', border: '1px solid rgba(201,168,76,0.4)', borderRadius: '18px', padding: '1.5rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
            <div>
              <div style={{ color: '#7A6E5C', fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '4px' }}>{t('explorer_progress')}</div>
              <div style={{ fontFamily: 'Georgia, serif', fontSize: '1.3rem', color: '#C9A84C', fontWeight: 700 }}>{level.title}</div>
              {profile?.full_name && <div style={{ color: '#C4A882', fontSize: '13px', marginTop: '2px' }}>{profile.full_name}</div>}
            </div>
            <div style={{ padding: '8px 18px', background: 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.35)', borderRadius: '999px', color: '#C9A84C', fontSize: '20px', fontWeight: 800 }}>
              ⚡ {totalXp.toLocaleString()} XP
            </div>
          </div>
          <div style={{ height: 12, background: 'rgba(255,255,255,0.06)', borderRadius: '999px', overflow: 'hidden', marginBottom: '6px' }}>
            <div style={{ height: '100%', width: `${progress}%`, background: 'linear-gradient(90deg, #C9A84C, #E8C97A)', borderRadius: '999px', transition: 'width 1s ease' }}/>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#7A6E5C' }}>
            <span>{level.min.toLocaleString()} XP</span>
            <span style={{ color: '#C9A84C', fontWeight: 600 }}>
              {level.next ? `${totalXp.toLocaleString()} / ${level.next.toLocaleString()} XP → ${nextLevel?.title || 'Max'}` : '🎉 Max Level!'}
            </span>
            <span>{level.next ? `${level.next.toLocaleString()} XP` : '∞'}</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginTop: '16px' }}>
            {[
              { label: t('monuments_visited'), value: monumentsVisited.length, icon: '🏛️' },
              { label: t('badges_earned'), value: earnedBadgeIds.length, icon: '🏅' },
              { label: t('leaderboard_rank'), value: currentUserRank > 0 ? `#${currentUserRank}` : '—', icon: '📊' },
            ].map((stat, i) => (
              <div key={i} style={{ background: 'rgba(15,11,30,0.5)', borderRadius: '12px', padding: '12px', textAlign: 'center', border: '1px solid rgba(201,168,76,0.1)' }}>
                <div style={{ fontSize: '20px', marginBottom: '4px' }}>{stat.icon}</div>
                <div style={{ color: '#C9A84C', fontSize: '20px', fontWeight: 800 }}>{stat.value}</div>
                <div style={{ color: '#7A6E5C', fontSize: '10px', marginTop: '2px' }}>{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Tab switcher */}
        <div style={{ display: 'flex', background: 'rgba(15,11,30,0.6)', borderRadius: '14px', padding: '4px', marginBottom: '1.5rem', border: '1px solid rgba(201,168,76,0.15)' }}>
          {(['badges', 'leaderboard'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{
              flex: 1, padding: '10px', borderRadius: '11px', border: 'none',
              background: activeTab === tab ? 'linear-gradient(135deg, #D4893F, #C9A84C)' : 'transparent',
              color: activeTab === tab ? '#0F0B1E' : '#C4A882',
              fontWeight: 700, fontSize: '14px', cursor: 'pointer', transition: 'all 0.2s ease', textTransform: 'capitalize'
            }}>
              {tab === 'badges' ? t('my_badges') : t('leaderboard')}
            </button>
          ))}
        </div>

        {/* BADGES TAB */}
        {activeTab === 'badges' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
              {ALL_BADGES.map(badge => {
                const isEarned = earnedBadgeIds.includes(badge.id)
                return (
                  <div key={badge.id} style={{
                    background: isEarned ? 'rgba(201,168,76,0.08)' : 'rgba(28,22,56,0.7)',
                    border: isEarned ? '2px solid rgba(201,168,76,0.55)' : '2px solid rgba(201,168,76,0.1)',
                    borderRadius: '16px', padding: '18px', display: 'flex', gap: '14px', alignItems: 'flex-start',
                    transition: 'all 0.3s ease',
                    animation: isEarned ? 'goldGlow 2.5s ease-in-out infinite' : 'none'
                  }}>
                    <div style={{ fontSize: '38px', flexShrink: 0 }}>{isEarned ? badge.icon : '🔒'}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                        <div style={{ fontWeight: 800, color: isEarned ? '#C9A84C' : '#6B7280', fontSize: '15px' }}>{badge.name}</div>
                        <div style={{ padding: '3px 10px', borderRadius: '999px', fontSize: '10px', fontWeight: 700, background: isEarned ? 'rgba(75,155,142,0.2)' : 'rgba(28,22,56,0.8)', border: isEarned ? '1px solid #4B9B8E' : '1px solid rgba(107,114,128,0.3)', color: isEarned ? '#4B9B8E' : '#6B7280' }}>
                          {isEarned ? '✓ Earned' : '🔒 Locked'}
                        </div>
                      </div>
                      <div style={{ color: isEarned ? '#C4A882' : '#6B7280', fontSize: '12px' }}>{badge.desc}</div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Monuments explored */}
            <div style={{ marginTop: '1.5rem' }}>
              <h3 style={{ color: '#C9A84C', fontFamily: 'Georgia, serif', fontSize: '1.1rem', margin: '0 0 1rem' }}>{t('monuments_explored')}</h3>
              {monumentsVisited.length > 0 ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {monumentsVisited.map((m: string) => (
                    <div key={m} style={{ padding: '8px 14px', background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.3)', borderRadius: '10px', color: '#E8C97A', fontSize: '13px', fontWeight: 600 }}>🏛️ {m}</div>
                  ))}
                </div>
              ) : (
                <div style={{ padding: '20px', background: 'rgba(28,22,56,0.6)', border: '1px solid rgba(201,168,76,0.1)', borderRadius: '12px', textAlign: 'center', color: '#7A6E5C', fontSize: '14px' }}>
                  No monuments explored yet — scan one to begin! 📷
                </div>
              )}
            </div>
          </div>
        )}

        {/* LEADERBOARD TAB */}
        {activeTab === 'leaderboard' && (
          <div>
            {loading ? <LoadingSpinner /> : (
              <>
                {top3.length >= 3 && (
                  <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: '12px', marginBottom: '2rem', padding: '1rem 0' }}>
                    {podiumOrder.map((entry, idx) => {
                      if (!entry) return null
                      const style = podiumStyles[idx]
                      const displayName = entry.full_name || entry.user_id
                      const isCurrentUser = entry.user_id === user?.id || (profile?.full_name && displayName === profile.full_name)
                      return (
                        <div key={entry.user_id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, maxWidth: '160px' }}>
                          <div style={{ fontSize: '24px', marginBottom: '6px' }}>{style.crown}</div>
                          <div style={{ width: 44, height: 44, borderRadius: '50%', background: `linear-gradient(135deg, ${style.color}, ${style.color}88)`, border: `2px solid ${style.color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0F0B1E', fontSize: '16px', fontWeight: 800, marginBottom: '8px', boxShadow: isCurrentUser ? `0 0 20px ${style.color}66` : 'none' }}>
                            {displayName[0].toUpperCase()}
                          </div>
                          <div style={{ color: style.color, fontSize: '12px', fontWeight: 700, textAlign: 'center', marginBottom: '4px', maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {displayName}{isCurrentUser && ` ${t('you')}`}
                          </div>
                          <div style={{ color: '#C4A882', fontSize: '11px', marginBottom: '8px', fontWeight: 600 }}>⚡ {entry.total_xp} XP</div>
                          <div style={{ width: '100%', height: style.height, background: `linear-gradient(180deg, ${style.color}33, ${style.color}11)`, border: `1px solid ${style.color}44`, borderRadius: '10px 10px 0 0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: 800, color: style.color }}>{style.label}</div>
                        </div>
                      )
                    })}
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {leaderboard.map((entry, idx) => {
                    const rank = idx + 1
                    const displayName = entry.full_name || entry.user_id
                    const isCurrentUser = entry.user_id === user?.id || (profile?.full_name && displayName === profile.full_name)
                    const rankColor = rank === 1 ? '#C9A84C' : rank === 2 ? '#A8A8A8' : rank === 3 ? '#CD7F32' : '#C4A882'
                    return (
                      <div key={entry.user_id} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '12px 16px', background: isCurrentUser ? 'rgba(201,168,76,0.1)' : 'rgba(28,22,56,0.7)', border: isCurrentUser ? '1px solid rgba(201,168,76,0.45)' : '1px solid rgba(255,255,255,0.04)', borderRadius: '12px', transition: 'all 0.2s ease' }}>
                        <div style={{ width: 32, textAlign: 'center', color: rankColor, fontWeight: 800, fontSize: rank <= 3 ? '18px' : '14px', flexShrink: 0 }}>
                          {rank <= 3 ? ['🥇','🥈','🥉'][rank - 1] : `#${rank}`}
                        </div>
                        <div style={{ width: 36, height: 36, borderRadius: '50%', background: isCurrentUser ? 'linear-gradient(135deg, #D4893F, #C9A84C)' : 'rgba(83,74,183,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: isCurrentUser ? '#0F0B1E' : '#C4A882', fontWeight: 800, fontSize: '14px', flexShrink: 0 }}>
                          {displayName[0].toUpperCase()}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ color: isCurrentUser ? '#C9A84C' : '#F5E6D3', fontWeight: isCurrentUser ? 700 : 500, fontSize: '14px' }}>
                            {displayName}{isCurrentUser && <span style={{ marginLeft: '6px', fontSize: '11px', color: '#C9A84C', fontWeight: 600 }}>{t('you')}</span>}
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                          <div style={{ width: '80px', height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: '999px', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${Math.min(100, (entry.total_xp / (leaderboard[0]?.total_xp || 1)) * 100)}%`, background: rankColor, borderRadius: '999px', transition: 'width 0.5s ease' }}/>
                          </div>
                          <div style={{ color: rankColor, fontWeight: 700, fontSize: '13px', minWidth: '70px', textAlign: 'right' as const }}>⚡ {entry.total_xp}</div>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {currentUserRank > 0 && (
                  <div style={{ textAlign: 'center', marginTop: '1rem', color: '#C4A882', fontSize: '13px' }}>
                    {t('you_are_ranked')} <span style={{ color: '#C9A84C', fontWeight: 700 }}>#{currentUserRank}</span> {t('out_of')} {leaderboard.length} {t('explorers')}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </AppShell>
  )
}
