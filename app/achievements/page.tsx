'use client'
import { useEffect, useState } from 'react'
import { AppShell } from '@/components/app-shell'
import { useAuth } from '@/lib/authContext'
import api from '@/lib/apiClient'
import { useLang } from '@/lib/languageContext'

type BadgeId = 'first_steps' | 'explorer' | 'quiz_master' | 'hunter' | 'day_tripper'

type Badge = {
  id: BadgeId
  title: string
  icon: string
  hint: string
  xpRequired: number
}

const BADGES: Badge[] = [
  { id: 'first_steps', title: 'First Steps', icon: '👣', hint: 'Check in to your first monument zone', xpRequired: 25 },
  { id: 'explorer', title: 'Explorer', icon: '🧭', hint: 'Visit 3 different monuments', xpRequired: 100 },
  { id: 'quiz_master', title: 'Quiz Master', icon: '🧠', hint: 'Answer 10 quiz questions correctly', xpRequired: 200 },
  { id: 'hunter', title: 'Heritage Hunter', icon: '🏹', hint: 'Complete the Taj Mahal treasure hunt', xpRequired: 500 },
  { id: 'day_tripper', title: 'Day Tripper', icon: '🧳', hint: 'Earn 1000 XP through exploration', xpRequired: 1000 },
]

const MAX_XP = 1000

function unlockBadges(xp: number): BadgeId[] {
  return BADGES.filter(b => xp >= b.xpRequired).map(b => b.id)
}

interface LeaderboardEntry { user_id: string; total_xp: number }

function LoadingSpinner() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '3rem' }}>
      <div style={{ width: 40, height: 40, border: '3px solid rgba(201,168,76,0.2)', borderTop: '3px solid #C9A84C', borderRadius: '50%', animation: 'spin 1s linear infinite' }}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

export default function AchievementsPage() {
  const { user, profile } = useAuth()
  const { t } = useLang()
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'badges' | 'leaderboard'>('badges')
  const [refreshing, setRefreshing] = useState(false)

  const totalXp = profile?.total_xp || 0
  const earned = unlockBadges(totalXp)
  const xpPct = Math.min(100, Math.round((totalXp / MAX_XP) * 100))

  const fetchLeaderboard = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    try {
      const res = await api.getLeaderboard()
      setLeaderboard(res.data.leaderboard || [])
    } catch { console.error('Leaderboard fetch failed') }
    finally { setLoading(false); setRefreshing(false) }
  }

  useEffect(() => { fetchLeaderboard() }, [])

  const top3 = leaderboard.slice(0, 3)
  const podiumOrder = top3.length >= 3 ? [top3[1], top3[0], top3[2]] : top3
  const podiumStyles = [
    { height: '90px', color: '#A8A8A8', crown: '🥈', label: '2nd' },
    { height: '120px', color: '#C9A84C', crown: '🥇', label: '1st' },
    { height: '75px', color: '#CD7F32', crown: '🥉', label: '3rd' },
  ]
  const currentUserRank = leaderboard.findIndex(e => e.user_id === (user?.id || 'demo_user')) + 1

  return (
    <AppShell>
      <div style={{ padding: '24px', maxWidth: 860, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '1.5rem' }}>
          <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '2rem', color: '#C9A84C', fontWeight: 700, margin: '0 0 0.4rem' }}>{t('explorer_hub')}</h1>
          <p style={{ color: '#C4A882', margin: 0 }}>{t('achievements_subtitle')}</p>
        </div>

        {/* XP Progress card */}
        <div style={{ background: 'linear-gradient(135deg, rgba(28,22,56,0.95), rgba(20,15,45,0.9))', border: '1px solid rgba(201,168,76,0.4)', borderRadius: '18px', padding: '1.5rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
            <div>
              <div style={{ color: '#7A6E5C', fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '4px' }}>{t('explorer_progress')}</div>
              <div style={{ fontFamily: 'Georgia, serif', fontSize: '1.3rem', color: '#C9A84C', fontWeight: 700 }}>
                {totalXp >= 1000 ? t('level_legend') : totalXp >= 300 ? t('level_cultural') : totalXp >= 150 ? t('level_heritage') : t('level_beginner')}
              </div>
            </div>
            <div style={{ padding: '8px 18px', background: 'rgba(83,74,183,0.2)', border: '1px solid rgba(83,74,183,0.4)', borderRadius: '999px', color: '#9B92F0', fontSize: '20px', fontWeight: 800 }}>
              ⚡ {totalXp} XP
            </div>
          </div>
          <div style={{ height: 12, background: 'rgba(255,255,255,0.06)', borderRadius: '999px', overflow: 'hidden', marginBottom: '6px' }}>
            <div style={{ height: '100%', width: `${xpPct}%`, background: 'linear-gradient(90deg, #C9A84C, #E8C97A)', borderRadius: '999px', transition: 'width 1s ease' }}/>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#7A6E5C' }}>
            <span>0 XP</span>
            <span style={{ color: '#C9A84C', fontWeight: 600 }}>{xpPct}{t('to_max_level')}</span>
            <span>1000 XP</span>
          </div>
          {/* Stats row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginTop: '16px' }}>
            {[
              { label: t('monuments_visited'), value: profile?.monuments_visited?.length || 0, icon: '🏛️' },
              { label: t('badges_earned'), value: earned.length, icon: '🏅' },
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
              {BADGES.map(badge => {
                const isEarned = earned.includes(badge.id)
                return (
                  <div key={badge.id} style={{
                    background: isEarned ? 'rgba(201,168,76,0.08)' : 'rgba(28,22,56,0.7)',
                    border: isEarned ? '2px solid rgba(201,168,76,0.55)' : '2px solid rgba(201,168,76,0.1)',
                    borderRadius: '16px', padding: '18px', display: 'flex', gap: '14px', alignItems: 'flex-start',
                    transition: 'all 0.3s ease',
                    animation: isEarned ? 'goldGlow 2.5s ease-in-out infinite' : 'none'
                  }}>
                    <style>{`@keyframes goldGlow{0%,100%{box-shadow:0 0 10px rgba(201,168,76,0.2)}50%{box-shadow:0 0 24px rgba(201,168,76,0.5)}}`}</style>
                    <div style={{ fontSize: '38px', flexShrink: 0 }}>{isEarned ? badge.icon : '🔒'}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                        <div style={{ fontWeight: 800, color: isEarned ? '#C9A84C' : '#6B7280', fontSize: '15px' }}>{badge.title}</div>
                        <div style={{ padding: '3px 10px', borderRadius: '999px', fontSize: '10px', fontWeight: 700, background: isEarned ? 'rgba(75,155,142,0.2)' : 'rgba(28,22,56,0.8)', border: isEarned ? '1px solid #4B9B8E' : '1px solid rgba(107,114,128,0.3)', color: isEarned ? '#4B9B8E' : '#6B7280' }}>
                          {isEarned ? t('badge_earned') : t('badge_locked')}
                        </div>
                      </div>
                      <div style={{ color: isEarned ? '#C4A882' : '#6B7280', fontSize: '12px', marginBottom: '6px' }}>
                        {isEarned ? t('badge_unlocked') : badge.hint}
                      </div>
                      <div style={{ fontSize: '11px', color: '#534AB7', fontWeight: 600 }}>{t('requires_xp')} {badge.xpRequired} {t('xp')}{isEarned && ' ✓'}</div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Monuments visited */}
            {(profile?.monuments_visited?.length ?? 0) > 0 && (
              <div style={{ marginTop: '1.5rem' }}>
                <h3 style={{ color: '#C9A84C', fontFamily: 'Georgia, serif', fontSize: '1.1rem', margin: '0 0 1rem' }}>{t('monuments_explored')}</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '8px' }}>
                  {profile?.monuments_visited?.map((m: string) => (
                    <div key={m} style={{ padding: '8px 14px', background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.3)', borderRadius: '10px', color: '#E8C97A', fontSize: '13px', fontWeight: 600 }}>✅ {m}</div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* LEADERBOARD TAB */}
        {activeTab === 'leaderboard' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
              <button onClick={() => fetchLeaderboard(true)} disabled={refreshing} style={{ padding: '8px 16px', background: 'rgba(75,155,142,0.15)', border: '1px solid rgba(75,155,142,0.4)', borderRadius: '10px', color: '#4B9B8E', fontSize: '13px', fontWeight: 700, cursor: refreshing ? 'not-allowed' : 'pointer', transition: 'all 0.2s ease', display: 'flex', alignItems: 'center', gap: '6px' }}>
                {refreshing ? t('refreshing') : t('refresh')}
              </button>
            </div>

            {loading ? <LoadingSpinner /> : (
              <>
                {/* Podium */}
                {top3.length >= 3 && (
                  <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: '12px', marginBottom: '2rem', padding: '1rem 0' }}>
                    {podiumOrder.map((entry, idx) => {
                      if (!entry) return null
                      const style = podiumStyles[idx]
                      const isCurrentUser = entry.user_id === (user?.id || 'demo_user')
                      return (
                        <div key={entry.user_id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, maxWidth: '160px' }}>
                          <div style={{ fontSize: '24px', marginBottom: '6px' }}>{style.crown}</div>
                          <div style={{ width: 44, height: 44, borderRadius: '50%', background: `linear-gradient(135deg, ${style.color}, ${style.color}88)`, border: `2px solid ${style.color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0F0B1E', fontSize: '16px', fontWeight: 800, marginBottom: '8px', boxShadow: isCurrentUser ? `0 0 20px ${style.color}66` : 'none' }}>
                            {entry.user_id[0].toUpperCase()}
                          </div>
                          <div style={{ color: style.color, fontSize: '12px', fontWeight: 700, textAlign: 'center', marginBottom: '4px', maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {entry.user_id}{isCurrentUser && ` ${t('you')}`}
                          </div>
                          <div style={{ color: '#C4A882', fontSize: '11px', marginBottom: '8px', fontWeight: 600 }}>⚡ {entry.total_xp} XP</div>
                          <div style={{ width: '100%', height: style.height, background: `linear-gradient(180deg, ${style.color}33, ${style.color}11)`, border: `1px solid ${style.color}44`, borderRadius: '10px 10px 0 0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: 800, color: style.color }}>{style.label}</div>
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Rank list */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {leaderboard.map((entry, idx) => {
                    const isCurrentUser = entry.user_id === (user?.id || 'demo_user')
                    const rank = idx + 1
                    const rankColor = rank === 1 ? '#C9A84C' : rank === 2 ? '#A8A8A8' : rank === 3 ? '#CD7F32' : '#C4A882'
                    return (
                      <div key={entry.user_id} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '12px 16px', background: isCurrentUser ? 'rgba(201,168,76,0.1)' : 'rgba(28,22,56,0.7)', border: isCurrentUser ? '1px solid rgba(201,168,76,0.45)' : '1px solid rgba(255,255,255,0.04)', borderRadius: '12px', transition: 'all 0.2s ease' }}>
                        <div style={{ width: 32, textAlign: 'center', color: rankColor, fontWeight: 800, fontSize: rank <= 3 ? '18px' : '14px', flexShrink: 0 }}>
                          {rank <= 3 ? ['🥇','🥈','🥉'][rank - 1] : `#${rank}`}
                        </div>
                        <div style={{ width: 36, height: 36, borderRadius: '50%', background: isCurrentUser ? 'linear-gradient(135deg, #D4893F, #C9A84C)' : 'rgba(83,74,183,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: isCurrentUser ? '#0F0B1E' : '#C4A882', fontWeight: 800, fontSize: '14px', flexShrink: 0 }}>
                          {entry.user_id[0].toUpperCase()}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ color: isCurrentUser ? '#C9A84C' : '#F5E6D3', fontWeight: isCurrentUser ? 700 : 500, fontSize: '14px' }}>
                            {entry.user_id}{isCurrentUser && <span style={{ marginLeft: '6px', fontSize: '11px', color: '#C9A84C', fontWeight: 600 }}>{t('you')}</span>}
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
