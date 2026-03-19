"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { AppShell } from "@/components/app-shell"
import { Send, GraduationCap, Building, ChevronDown } from "lucide-react"
import api from "@/lib/apiClient"
import { Toast, useToast } from "@/components/Toast"
import { useAuth } from "@/lib/authContext"
import { saveChatMessage } from "@/lib/authClient"
import { useLang } from "@/lib/languageContext"
import { useVapi } from "@/hooks/useVapi"

interface Message { id: number; role: "assistant" | "user"; content: string }
interface Monument { id: string; name: string }

const MONUMENT_NAMES: Record<string, string> = {
  'taj-mahal': 'Taj Mahal', 'red-fort': 'Red Fort', 'qutub-minar': 'Qutub Minar',
  'gateway-india': 'Gateway of India', 'hampi': 'Hampi', 'golden-temple': 'Golden Temple Amritsar',
  'kedarnath': 'Kedarnath Temple', 'meenakshi': 'Meenakshi Amman Temple', 'mysore-palace': 'Mysore Palace',
  'hawa-mahal': 'Hawa Mahal Jaipur', 'charminar': 'Charminar Hyderabad',
  'victoria-memorial': 'Victoria Memorial Kolkata', 'ajanta': 'Ajanta Caves',
  'konark': 'Konark Sun Temple', 'india-gate': 'India Gate Delhi',
}

export default function ChatPage() {
  const { t, lang } = useLang()
  const suggestedQuestions = [t('when_built'), t('who_built'), t('what_legend'), t('best_time_visit'), t('entry_fee_q')]

  const [messages, setMessages] = useState<Message[]>([{ id: 1, role: "assistant", content: t('namaste_greeting') }])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [monumentId, setMonumentId] = useState("taj-mahal")
  const [monuments, setMonuments] = useState<Monument[]>([])
  const [listening, setListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const lastWasVoiceRef = useRef(false)
  const { toast, showToast, hideToast } = useToast()
  const { user } = useAuth()

  // ── Robust Browser TTS ─────────────────────────────────
  const speakText = useCallback((text: string) => {
    if (!window.speechSynthesis) return
    window.speechSynthesis.cancel()
    setIsSpeaking(true)

    const doSpeak = () => {
      const voices = window.speechSynthesis.getVoices()
      const targetLang = lang === 'hi' ? 'hi' : 'en'
      const voice = voices.find(v =>
        v.lang.includes(targetLang) &&
        (v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Daniel') || v.lang.includes(targetLang))
      ) || voices.find(v => v.lang.includes(targetLang))

      const sentences = text.match(/[^.!?]+[.!?]+/g) || [text]
      let idx = 0

      const speakNext = () => {
        if (idx >= sentences.length) { setIsSpeaking(false); return }
        const utterance = new SpeechSynthesisUtterance(sentences[idx].trim())
        utterance.lang = lang === 'hi' ? 'hi-IN' : 'en-US'
        utterance.rate = 0.9
        utterance.pitch = 1.0
        if (voice) utterance.voice = voice
        utterance.onend = () => { idx++; speakNext() }
        utterance.onerror = () => setIsSpeaking(false)
        window.speechSynthesis.speak(utterance)
      }
      speakNext()
    }

    if (window.speechSynthesis.getVoices().length === 0) {
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.onvoiceschanged = null
        doSpeak()
      }
      setTimeout(() => doSpeak(), 300)
    } else {
      doSpeak()
    }
  }, [lang])

  // ── Vapi voice call hook ───────────────────────────────
  const {
    isCallActive, isListening: vapiListening, isSpeaking: vapiSpeaking, isLoading: vapiLoading,
    transcript, messages: vapiMessages,
    startCall, endCall, error: vapiError
  } = useVapi()

  useEffect(() => {
    api.getNearby().then(res => {
      const list: Monument[] = (res.data.monuments || []).map((m: { id: string; name: string }) => ({ id: m.id, name: MONUMENT_NAMES[m.id] || m.name }))
      if (list.length > 0) setMonuments(list)
    }).catch(() => { setMonuments(Object.entries(MONUMENT_NAMES).map(([id, name]) => ({ id, name }))) })
  }, [])

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }) }, [messages, loading])

  // Reset greeting when language changes
  useEffect(() => {
    setMessages([{ id: 1, role: "assistant", content: t('namaste_greeting') }])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang])

  // Merge Vapi voice messages into the main chat thread
  useEffect(() => {
    if (vapiMessages.length > 0) {
      const last = vapiMessages[vapiMessages.length - 1]
      setMessages(prev => {
        const alreadyExists = prev.some(m => m.content === last.text)
        if (alreadyExists) return prev
        return [...prev, {
          id: prev.length + 1,
          role: last.role === 'user' ? 'user' : 'assistant',
          content: last.text
        }]
      })
    }
  }, [vapiMessages])

  // ── Send Message ───────────────────────────────────────
  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return
    const userMsg: Message = { id: messages.length + 1, role: "user", content: text }
    setMessages(prev => [...prev, userMsg]); setInput(""); setLoading(true)
    try {
      const res = await api.askChat(text, monumentId)
      const aiAnswer = res.data.answer

      // ✨ Voice in → voice out ONLY (no text bubble)
      if (lastWasVoiceRef.current) {
        speakText(aiAnswer)
        lastWasVoiceRef.current = false
      } else {
        // Text in → text out only
        setMessages(prev => [...prev, { id: prev.length + 1, role: "assistant", content: aiAnswer }])
      }

      if (user) { saveChatMessage(user.id, 'user', text, monumentId).catch(() => null); saveChatMessage(user.id, 'assistant', aiAnswer, monumentId).catch(() => null) }
    } catch {
      setMessages(prev => [...prev, { id: prev.length + 1, role: "assistant", content: t('sorry_trouble') }])
    } finally { setLoading(false) }
  }

  const handleSend = () => sendMessage(input.trim())

  // ── Voice Input (browser SpeechRecognition) ────────────
  const startVoice = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition
    if (!SR) { alert('Use Chrome for voice feature'); return }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recognition = new SR() as any
    recognition.lang = lang === 'hi' ? 'hi-IN' : 'en-IN'
    recognition.onstart = () => { setListening(true); showToast(t('listening')) }
    recognition.onend = () => setListening(false)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (e: any) => {
      const spokenText = e.results[0][0].transcript as string
      setInput(spokenText)
      lastWasVoiceRef.current = true
      sendMessage(spokenText)
    }
    try { recognition.start() } catch { setListening(false) }
  }

  // Cleanup TTS on unmount
  useEffect(() => {
    return () => { window.speechSynthesis?.cancel() }
  }, [])

  return (
    <AppShell>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}} @keyframes bounce{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-6px)}}`}</style>
      <div className="flex flex-col h-[calc(100vh-96px)] lg:h-screen">
        <div className="flex items-center justify-between p-4 border-b border-[#C9A84C]/20 flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#C9A84C]/20 flex items-center justify-center"><Building className="w-5 h-5 text-[#C9A84C]" /></div>
            <h1 className="font-serif text-xl font-bold text-[#C9A84C]">{t('ai_chatbot')}</h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-2 px-3 py-1 bg-[#534AB7]/20 text-[#534AB7] text-sm rounded-full"><GraduationCap className="w-4 h-4" />{t('student_mode')}</span>
            <div className="relative">
              <select value={monumentId} onChange={e => setMonumentId(e.target.value)} className="appearance-none pl-3 pr-8 py-1.5 bg-[#1C1638] border border-[#C9A84C]/40 text-[#C9A84C] text-sm rounded-lg focus:outline-none focus:border-[#C9A84C] cursor-pointer">
                {monuments.length > 0 ? monuments.map(m => <option key={m.id} value={m.id}>{m.name}</option>) : Object.entries(MONUMENT_NAMES).map(([id, name]) => <option key={id} value={id}>{name}</option>)}
              </select>
              <ChevronDown className="w-3 h-3 text-[#C9A84C] absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
            {/* Voice Call Button */}
            {!isCallActive ? (
              <button
                onClick={() => startCall(undefined, monumentId)}
                disabled={vapiLoading}
                style={{
                  background: 'linear-gradient(135deg, #C9A84C, #D4893F)',
                  borderRadius: '12px', padding: '10px 16px',
                  color: '#0F0B1E', fontWeight: '700', fontSize: '14px',
                  display: 'flex', alignItems: 'center', gap: '6px',
                  border: 'none', cursor: vapiLoading ? 'wait' : 'pointer',
                  opacity: vapiLoading ? 0.7 : 1
                }}
              >
                📞 {vapiLoading ? 'Connecting...' : 'Voice Call'}
              </button>
            ) : (
              <button
                onClick={endCall}
                style={{
                  background: '#DC2626', borderRadius: '12px',
                  padding: '10px 16px', color: 'white',
                  fontWeight: '700', fontSize: '14px',
                  display: 'flex', alignItems: 'center', gap: '6px',
                  border: 'none', cursor: 'pointer',
                  animation: 'pulse 2s infinite'
                }}
              >
                📵 End Call
              </button>
            )}
          </div>
          {vapiError && (
            <p style={{ color: '#DC2626', fontSize: '12px', marginTop: '4px', width: '100%', textAlign: 'right' }}>
              {vapiError}
            </p>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"} animate-fade-in`}>
              <div className={`max-w-[80%] p-4 rounded-xl ${message.role === "user" ? "bg-[#D4893F]/20 border-l-4 border-[#D4893F] text-[#F5E6D3]" : "glass-card border-l-4 border-[#4B9B8E] text-[#F5E6D3]"}`}>
                {message.role === "assistant" && (
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">🏛️</span>
                    <span className="text-sm text-[#4B9B8E] font-medium">{t('heritage_guide')}</span>
                  </div>
                )}
                <p className="leading-relaxed">{message.content}</p>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start animate-fade-in">
              <div className="glass-card border-l-4 border-[#4B9B8E] text-[#F5E6D3] p-4 rounded-xl">
                <div className="flex items-center gap-2 mb-2"><span className="text-lg">🏛️</span><span className="text-sm text-[#4B9B8E] font-medium">{t('heritage_guide')}</span></div>
                <div className="flex gap-1 items-center h-5">{[0,1,2].map(i => (<div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: '#4B9B8E', animation: 'bounce 1.2s infinite', animationDelay: `${i * 0.2}s` }} />))}</div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Suggested questions */}
        <div className="px-4 py-2 flex gap-2 overflow-x-auto">
          {suggestedQuestions.map((question) => (
            <button key={question} onClick={() => setInput(question)} className="flex-shrink-0 px-3 py-1 glass-card rounded-full text-sm text-[#C4A882] hover:text-[#C9A84C] hover:border-[#C9A84C] transition-colors">{question}</button>
          ))}
        </div>

        {/* Input bar */}
        <div className="p-4 border-t border-[#C9A84C]/20">
          {/* Active voice call status bar */}
          {isCallActive && (
            <div style={{
              background: 'rgba(201,168,76,0.1)', border: '1px solid #C9A84C',
              borderRadius: '12px', padding: '10px 16px',
              display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px'
            }}>
              <div style={{
                width: '10px', height: '10px', borderRadius: '50%',
                background: vapiSpeaking ? '#4B9B8E' : vapiListening ? '#C9A84C' : '#666',
                animation: (vapiSpeaking || vapiListening) ? 'pulse 1s infinite' : 'none'
              }}/>
              <span style={{ color: '#C9A84C', fontSize: '13px' }}>
                {vapiSpeaking ? '🔊 AI is speaking...'
                 : vapiListening ? '🎤 Listening...'
                 : '💬 Voice call active — speak your question'}
              </span>
              {transcript && (
                <span style={{ color: '#C4A882', fontSize: '12px', fontStyle: 'italic' }}>
                  &quot;{transcript}&quot;
                </span>
              )}
            </div>
          )}
          <div className="flex items-center gap-2">
            <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSend()} placeholder={t('ask_placeholder')} className="flex-1 bg-[#1C1638] border border-[#C9A84C]/30 rounded-xl px-4 py-3 text-[#F5E6D3] placeholder:text-[#C4A882] focus:outline-none focus:border-[#C9A84C] transition-colors" />
            <button onClick={startVoice} className={`px-3 py-3 rounded-xl transition-all duration-300 hover:scale-105 flex items-center gap-1.5 text-sm font-medium ${listening ? 'bg-[#4B9B8E] text-white animate-pulse' : 'purple-gradient text-white'}`}>
              {listening ? '🎙️' : '🎤'}<span className="hidden sm:inline">{listening ? t('listening') : t('ask_by_voice')}</span>
            </button>
            <button onClick={handleSend} disabled={loading} className="p-3 gold-gradient rounded-xl transition-all duration-300 hover:scale-105 disabled:opacity-50"><Send className="w-5 h-5 text-[#0F0B1E]" /></button>
          </div>
        </div>
      </div>
      {toast && <Toast message={toast} onDone={hideToast} />}
    </AppShell>
  )
}
