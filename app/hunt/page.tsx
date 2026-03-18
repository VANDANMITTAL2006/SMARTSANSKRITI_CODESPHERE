"use client"

import { useState, useEffect } from "react"
import { AppShell } from "@/components/app-shell"
import { MapPin, Check, Trophy, ChevronDown } from "lucide-react"
import api from "@/lib/apiClient"
import { Toast, useToast } from "@/components/Toast"
import { useLang } from "@/lib/languageContext"
import { getMonument, saveMonument, clearMonument } from "@/lib/monumentStore"

interface Clue {
  step: number
  clue_text: string
  puzzle_question: string
  options: string[]
  correct_index: number
  total_steps: number
}

interface CelebrateData {
  xp: number
  nextClue?: Clue
}

const MONUMENT_NAMES: Record<string, string> = {
  'taj-mahal': 'Taj Mahal', 'red-fort': 'Red Fort', 'qutub-minar': 'Qutub Minar',
  'gateway-india': 'Gateway of India', 'hampi': 'Hampi', 'golden-temple': 'Golden Temple Amritsar',
  'kedarnath': 'Kedarnath Temple', 'meenakshi': 'Meenakshi Amman Temple', 'mysore-palace': 'Mysore Palace',
  'hawa-mahal': 'Hawa Mahal Jaipur', 'charminar': 'Charminar Hyderabad', 'victoria-memorial': 'Victoria Memorial Kolkata',
  'ajanta': 'Ajanta Caves', 'konark': 'Konark Sun Temple', 'india-gate': 'India Gate Delhi',
}

function LoadingSpinner() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '40px' }}>
      <div style={{
        width: 40, height: 40,
        border: '3px solid rgba(201,168,76,0.2)',
        borderTop: '3px solid #C9A84C',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite'
      }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

export default function HuntPage() {
  const lastMonument = getMonument()
  const [clue, setClue] = useState<Clue | null>(null)
  const [showPuzzle, setShowPuzzle] = useState(false)
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null)
  const [celebrate, setCelebrate] = useState<CelebrateData | null>(null)
  const [completed, setCompleted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [xpEarned, setXpEarned] = useState(0)
  const [verifying, setVerifying] = useState(false)
  const [monumentSelected, setMonumentSelected] = useState(!!lastMonument)
  const [huntMonumentId, setHuntMonumentId] = useState(lastMonument?.id || 'taj-mahal')
  const [monuments, setMonuments] = useState<{id: string, name: string}[]>([])
  const { toast, showToast, hideToast } = useToast()
  const { t } = useLang()

  // Load monument list
  useEffect(() => {
    api.getNearby().then(res => {
      const list = (res.data.monuments || []).map((m: { id: string; name: string }) => ({
        id: m.id, name: MONUMENT_NAMES[m.id] || m.name,
      }))
      if (list.length > 0) setMonuments(list)
    }).catch(() => {
      setMonuments(Object.entries(MONUMENT_NAMES).map(([id, name]) => ({ id, name })))
    })
  }, [])

  const fetchClue = () => {
    setLoading(true)
    setError(null)
    api.getHuntClue('demo_user')
      .then(res => {
        setClue(res.data)
        setLoading(false)
      })
      .catch(() => {
        setError('Could not load hunt clue. Check your connection.')
        setLoading(false)
      })
  }

  useEffect(() => {
    if (monumentSelected) fetchClue()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monumentSelected])

  const handleVerify = async (answerIndex: number) => {
    if (verifying || selectedAnswer !== null) return
    setSelectedAnswer(answerIndex)
    setVerifying(true)

    try {
      const res = await api.verifyHunt('demo_user', answerIndex)
      if (res.data.correct) {
        const xp = res.data.xp_awarded || 150
        try {
          await api.awardXP('demo_user', xp, 'HUNT_STEP_DONE')
          showToast(`+${xp} XP for hunt step!`)
        } catch { /* silently fail */ }
        setXpEarned(prev => prev + xp)

        if (res.data.completed) {
          try {
            await api.awardXP('demo_user', 500, 'HUNT_COMPLETED')
            showToast('+500 XP — Hunt Completed! 🏆')
          } catch { /* silently fail */ }
          setCompleted(true)
        } else {
          setCelebrate({
            xp,
            nextClue: res.data.next_clue
          })
        }
      }
    } catch (err) {
      console.error('Verify failed:', err)
    } finally {
      setVerifying(false)
    }
  }

  const onCelebrateDone = () => {
    if (celebrate?.nextClue) {
      setClue(celebrate.nextClue)
      setShowPuzzle(false)
      setSelectedAnswer(null)
    }
    setCelebrate(null)
  }

  // Monument selection screen
  if (!monumentSelected) {
    const monumentList = monuments.length > 0
      ? monuments
      : Object.entries(MONUMENT_NAMES).map(([id, name]) => ({ id, name }))

    return (
      <AppShell>
        <div style={{ padding: 24 }}>
          <h1 style={{ fontFamily: 'Georgia,serif', fontSize: 32, color: '#C9A84C', fontWeight: 700 }}>
            {t('treasure_hunt')}
          </h1>
          <div style={{
            marginTop: 48, textAlign: 'center',
            background: 'rgba(28,22,56,0.9)',
            border: '1px solid rgba(201,168,76,0.3)',
            borderRadius: 20, padding: 56,
            maxWidth: 520, margin: '48px auto'
          }}>
            <div style={{ fontSize: 72, marginBottom: 16 }}>🗺️</div>
            <h2 style={{ color: '#C9A84C', fontFamily: 'Georgia,serif', fontSize: 26, margin: '0 0 12px' }}>
              {t('select_monument_hunt')}
            </h2>
            <p style={{ color: '#C4A882', fontSize: 16, marginBottom: 28, lineHeight: 1.6 }}>
              {t('choose_monument_hunt')}
            </p>
            <div style={{ position: 'relative', display: 'inline-block' }}>
              <select
                onChange={e => {
                  const selectedId = e.target.value
                  const selectedName = monumentList.find(m => m.id === selectedId)?.name || selectedId
                  setHuntMonumentId(selectedId)
                  setMonumentSelected(true)
                  saveMonument(selectedId, selectedName)
                }}
                defaultValue=""
                style={{
                  padding: '12px 40px 12px 16px',
                  background: 'rgba(28,22,56,0.9)',
                  border: '1px solid #C9A84C',
                  color: '#C9A84C', borderRadius: 10,
                  fontSize: 16, cursor: 'pointer',
                  minWidth: 260, marginBottom: 16,
                  appearance: 'none'
                }}
              >
                <option value="" disabled>{t('choose_monument')}</option>
                {monumentList.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
              <ChevronDown style={{ position: 'absolute', right: 12, top: 14, width: 16, height: 16, color: '#C9A84C', pointerEvents: 'none' }} />
            </div>
            <div style={{ color: '#7A6E5C', fontSize: 13, marginTop: 8 }}>
              Note: Treasure hunt currently available for Taj Mahal
            </div>
          </div>
        </div>
      </AppShell>
    )
  }

  if (loading) {
    return (
      <AppShell>
        <div className="p-4 lg:p-8">
          <h1 className="font-serif text-3xl lg:text-4xl font-bold text-[#C9A84C] mb-2">{t('treasure_hunt')}</h1>
          <LoadingSpinner />
        </div>
      </AppShell>
    )
  }

  if (error) {
    return (
      <AppShell>
        <div className="p-4 lg:p-8">
          <h1 className="font-serif text-3xl lg:text-4xl font-bold text-[#C9A84C] mb-2">{t('treasure_hunt')}</h1>
          <div style={{
            background: 'rgba(196,91,58,0.1)',
            border: '1px solid rgba(196,91,58,0.5)',
            borderRadius: 12, padding: 16,
            color: '#E8A85C', textAlign: 'center'
          }}>
            ⚠️ {error}
            <br />
            <button
              onClick={fetchClue}
              style={{ marginTop: 8, padding: '6px 16px', background: 'rgba(201,168,76,0.2)', border: '1px solid #C9A84C', borderRadius: 8, color: '#C9A84C', cursor: 'pointer' }}
            >
              {t('try_again')}
            </button>
          </div>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <div className="p-4 lg:p-8 animate-fade-in">

        {/* Celebrate overlay */}
        {celebrate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-[#0F0B1E]/90 backdrop-blur-sm" onClick={onCelebrateDone} />
            <div className="relative glass-card rounded-2xl p-8 max-w-sm w-full text-center animate-slide-up">
              <div className="text-6xl mb-4">🎊</div>
              <h2 className="text-2xl font-bold text-[#C9A84C] mb-2">Step Complete!</h2>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#534AB7]/20 rounded-full mb-6 animate-xp-pulse">
                <span className="text-[#534AB7] font-bold">⚡ +{celebrate.xp} XP</span>
              </div>
              <p className="text-[#C4A882] mb-6">Ready for the next clue?</p>
              <button
                onClick={onCelebrateDone}
                className="w-full py-3 gold-gradient text-[#0F0B1E] font-bold rounded-xl transition-all duration-300 hover:scale-105"
              >
                Next Clue →
              </button>
            </div>
          </div>
        )}

        {/* Completed state */}
        {completed ? (
          <div className="glass-card rounded-xl p-8 text-center animate-fade-in">
            <div className="text-6xl mb-4">🏆</div>
            <h2 className="font-serif text-2xl font-bold text-[#C9A84C] mb-2">{t('heritage_hunter')}</h2>
            <p className="text-[#C4A882] mb-4">You completed the Treasure Hunt!</p>
            <div className="inline-block px-4 py-2 bg-[#534AB7]/20 rounded-full mb-6 animate-xp-pulse">
              <span className="text-[#534AB7] font-bold">⚡ +500 XP Bonus + {xpEarned} XP Total</span>
            </div>
            <div className="glass-card rounded-lg p-4 inline-block mb-6">
              <Trophy className="w-12 h-12 text-[#C9A84C] mx-auto mb-2" />
              <p className="text-[#C9A84C] font-semibold">Hunter Badge Unlocked</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button className="px-6 py-3 border border-[#C9A84C]/50 text-[#C9A84C] font-semibold rounded-xl transition-all duration-300 hover:bg-[#C9A84C]/10">{t('share_achievement')}</button>
              <button className="px-6 py-3 gold-gradient text-[#0F0B1E] font-semibold rounded-xl transition-all duration-300 hover:scale-105">{t('explore_more')}</button>
            </div>
          </div>
        ) : clue ? (
          <>
            {/* Auto-loaded monument banner */}
            {lastMonument && (
              <div style={{
                background: 'rgba(75,155,142,0.1)',
                border: '1px solid rgba(75,155,142,0.4)',
                borderRadius: '12px', padding: '12px 16px',
                marginBottom: '1.5rem',
                display: 'flex', alignItems: 'center',
                justifyContent: 'space-between', gap: '12px'
              }}>
                <div style={{ color: '#4B9B8E', fontSize: '14px' }}>
                  🏛️ <strong>Auto-loaded:</strong> {lastMonument.name} — recognized just now
                </div>
                <button
                  onClick={() => {
                    setMonumentSelected(false)
                    clearMonument()
                  }}
                  style={{
                    background: 'none', border: 'none',
                    color: '#7A6E5C', cursor: 'pointer',
                    fontSize: '12px', flexShrink: 0
                  }}
                >
                  ✕ Change
                </button>
              </div>
            )}
            <h1 className="font-serif text-3xl lg:text-4xl font-bold text-[#C9A84C] mb-2">{t('treasure_hunt')}</h1>
            <p className="text-[#C4A882] mb-8">{t('follow_clues')}</p>
            <div className="flex items-center justify-between mb-8">
              <p className="text-[#F5E6D3]">{t('step_of')} {clue.step} {t('of')} {clue.total_steps}</p>
              <div className="flex gap-2">
                {Array.from({ length: clue.total_steps }).map((_, idx) => (
                  <div key={idx} className={`w-3 h-3 rounded-full transition-all ${idx < clue.step ? "bg-[#C9A84C]" : "bg-[#1C1638]"}`} />
                ))}
              </div>
              <span className="px-3 py-1 bg-[#534AB7]/20 text-[#534AB7] text-sm rounded-full animate-xp-pulse">⚡ {xpEarned} XP so far</span>
            </div>
            <div className="glass-card rounded-2xl p-6 border-2 border-[#D4893F]/50 bg-gradient-to-br from-[#D4893F]/10 to-transparent mb-8">
              <span className="inline-block px-3 py-1 bg-[#C9A84C]/20 text-[#C9A84C] text-xs font-bold uppercase rounded-full mb-4">Step {clue.step}</span>
              <p className="text-[#F5E6D3] text-xl leading-relaxed mb-4 font-serif">{clue.clue_text}</p>
              {!showPuzzle && (
                <button onClick={() => setShowPuzzle(true)} className="w-full py-4 purple-gradient text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all duration-300 hover:scale-[1.02]">
                  <MapPin className="w-5 h-5" /> {t('i_am_here')}
                </button>
              )}
            </div>
            {showPuzzle && (
              <div className="glass-card rounded-xl p-6 mb-8 animate-fade-in">
                <h3 className="font-serif text-xl font-bold text-[#F5E6D3] mb-4">{clue.puzzle_question}</h3>
                <div className="grid grid-cols-2 gap-3 mb-6">
                  {clue.options.map((option, idx) => {
                    const isSelected = selectedAnswer === idx
                    const isCorrect = idx === clue.correct_index
                    return (
                      <button key={idx} onClick={() => handleVerify(idx)} disabled={selectedAnswer !== null || verifying}
                        className={`p-4 rounded-xl border-2 transition-all duration-300 ${
                          isSelected ? isCorrect ? "bg-[#4B9B8E]/20 border-[#4B9B8E] text-[#F5E6D3]" : "bg-[#DC2626]/20 border-[#DC2626] text-[#F5E6D3]"
                          : selectedAnswer !== null && isCorrect ? "bg-[#4B9B8E]/20 border-[#4B9B8E] text-[#F5E6D3]"
                          : "border-[#C9A84C]/30 text-[#C4A882] hover:border-[#C9A84C]"
                        }`}
                      >
                        <span className="font-bold mr-2">{String.fromCharCode(65 + idx)}.</span>{option}
                        {isSelected && isCorrect && <Check className="inline-block w-5 h-5 ml-2 text-[#4B9B8E]" />}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </>
        ) : null}
      </div>
      {toast && <Toast message={toast} onDone={hideToast} />}
    </AppShell>
  )
}
