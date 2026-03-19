'use client'
import { useState, useRef, useCallback, useEffect } from 'react'

export interface Message {
  role: 'user' | 'assistant' | 'zone'
  text: string
  timestamp: number
  zoneName?: string
}

export interface UseAudioGuideReturn {
  // TTS State
  isSpeaking: boolean
  speak: (text: string) => void
  stopSpeaking: () => void
  
  // STT State  
  isListening: boolean
  transcript: string
  startListening: () => void
  stopListening: () => void
  
  // AI State
  isThinking: boolean
  lastQuestion: string
  lastAnswer: string
  conversationHistory: Message[]
  
  // Zone State
  currentZone: string | null
  setCurrentZone: (zone: string | null) => void
  
  // Main action
  askQuestion: (question: string, monumentId: string) => Promise<void>
  announceZone: (zoneName: string, narration: string) => void
  
  // Settings
  lang: 'en' | 'hi'
  setLang: (lang: 'en' | 'hi') => void
  volume: number
  setVolume: (v: number) => void
  isMuted: boolean
  toggleMute: () => void
}

export function useAudioGuide(): UseAudioGuideReturn {

  // ── STATE ──────────────────────────────────────────────
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [isThinking, setIsThinking] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [lastQuestion, setLastQuestion] = useState('')
  const [lastAnswer, setLastAnswer] = useState('')
  const [conversationHistory, setConversationHistory] = useState<Message[]>([])
  const [currentZone, setCurrentZone] = useState<string | null>(null)
  const [lang, setLang] = useState<'en' | 'hi'>('en')
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<BlobPart[]>([])
  const currentZoneRef = useRef<string | null>(null)
  const askQuestionRef = useRef<((q: string, id: string) => Promise<void>) | null>(null)

  // Keep ref in sync with state
  useEffect(() => {
    currentZoneRef.current = currentZone
  }, [currentZone])

  // ── TEXT TO SPEECH ─────────────────────────────────────
  const speak = useCallback((text: string) => {
    if (isMuted) return
    if (!window.speechSynthesis) return
    
    window.speechSynthesis.cancel()
    
    const doSpeak = () => {
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = lang === 'hi' ? 'hi-IN' : 'en-US'
      utterance.rate = lang === 'hi' ? 0.85 : 0.88
      utterance.pitch = 1.0
      utterance.volume = isMuted ? 0 : volume

      const voices = window.speechSynthesis.getVoices()
      
      if (lang === 'hi') {
        const hindiVoice = voices.find(v => 
          v.lang.includes('hi') || 
          v.name.toLowerCase().includes('hindi')
        )
        if (hindiVoice) utterance.voice = hindiVoice
      } else {
        const englishVoice = voices.find(v =>
          v.lang.includes('en-US') ||
          v.lang.includes('en-GB') ||
          v.name.includes('Google') ||
          v.name.includes('Samantha') ||
          v.name.includes('Daniel')
        )
        if (englishVoice) utterance.voice = englishVoice
      }

      utterance.onstart = () => setIsSpeaking(true)
      utterance.onend = () => setIsSpeaking(false)
      utterance.onerror = () => setIsSpeaking(false)

      // Chrome chunking fix for long text
      const MAX_CHARS = 180
      if (text.length > MAX_CHARS) {
        const sentences = text.match(/[^.!?]+[.!?]+/g) || [text]
        let idx = 0
        const speakNext = () => {
          if (idx >= sentences.length) { setIsSpeaking(false); return }
          const chunk = new SpeechSynthesisUtterance(sentences[idx].trim())
          chunk.lang = utterance.lang
          chunk.rate = utterance.rate
          chunk.pitch = utterance.pitch
          chunk.volume = utterance.volume
          if (utterance.voice) chunk.voice = utterance.voice
          chunk.onend = () => { idx++; speakNext() }
          chunk.onerror = () => setIsSpeaking(false)
          if (idx === 0) chunk.onstart = () => setIsSpeaking(true)
          window.speechSynthesis.speak(chunk)
        }
        speakNext()
      } else {
        window.speechSynthesis.speak(utterance)
      }
    }

    if (window.speechSynthesis.getVoices().length === 0) {
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.onvoiceschanged = null
        doSpeak()
      }
    } else {
      doSpeak()
    }
  }, [lang, volume, isMuted])

  const stopSpeaking = useCallback(() => {
    window.speechSynthesis?.cancel()
    setIsSpeaking(false)
  }, [])

  // ── SPEECH TO TEXT ─────────────────────────────────────
  const startListening = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstart = () => {
        setIsListening(true)
        setTranscript('')
        stopSpeaking()
      }

      mediaRecorder.onstop = async () => {
        setIsListening(false)
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        
        stream.getTracks().forEach(track => track.stop())
        
        if (audioChunksRef.current.length === 0) return
        
        setIsThinking(true)
        
        try {
          const formData = new FormData()
          formData.append('file', audioBlob, 'recording.webm')
          formData.append('model', 'whisper-large-v3')
          formData.append('language', lang === 'hi' ? 'hi' : 'en')
          formData.append('temperature', '0')

          const groqKey = process.env.NEXT_PUBLIC_GROQ_API_KEY
          if (!groqKey) {
            console.error('Groq API key not found in environment variables')
            alert('Groq API configuration missing. Check .env.local')
            setIsThinking(false)
            return
          }

          const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${groqKey}`
            },
            body: formData
          })

          const data = await response.json()
          
          if (data.text && data.text.trim()) {
            setTranscript(data.text)
            const monumentId = currentZoneRef.current
              ? currentZoneRef.current.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
              : 'taj-mahal'
            askQuestionRef.current?.(data.text.trim(), monumentId)
          } else {
            setIsThinking(false)
            setTranscript('')
          }
        } catch (error) {
          console.error('Error transcribing audio:', error)
          setIsThinking(false)
          setTranscript('')
        }
      }

      mediaRecorder.start(100)
    } catch (err) {
      console.error('Error accessing microphone:', err)
      alert('Microphone access is required to use voice input.')
      setIsListening(false)
    }
  }, [lang, stopSpeaking])

  const stopListening = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop()
    } else {
      setIsListening(false)
    }
  }, [])

  // ── AI QUESTION ────────────────────────────────────────
  const askQuestion = useCallback(async (
    question: string, 
    monumentId: string
  ) => {
    if (!question.trim()) return
    
    setLastQuestion(question)
    setIsThinking(true)
    stopSpeaking()

    const userMessage: Message = {
      role: 'user',
      text: question,
      timestamp: Date.now()
    }
    setConversationHistory(prev => [...prev, userMessage])

    try {
      // Use the same API base as the rest of the app
      const apiBase = process.env.NEXT_PUBLIC_API_URL || 'https://heritageai-backend.onrender.com'
      const response = await fetch(
        apiBase + '/chat/ask',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question,
            monument_id: monumentId,
            lang: lang === 'hi' ? 'hi' : 'en'
          })
        }
      )
      const data = await response.json()
      const answer = data.answer || 'I could not get a response. Please try again.'
      
      setLastAnswer(answer)
      setIsThinking(false)

      const aiMessage: Message = {
        role: 'assistant',
        text: answer,
        timestamp: Date.now()
      }
      setConversationHistory(prev => [...prev, aiMessage])

      speak(answer)

    } catch {
      const fallback = `I am having trouble connecting right now. 
        But I can tell you that ${monumentId.replace(/-/g, ' ')} 
        is one of India's most magnificent heritage sites with 
        thousands of years of history.`
      setLastAnswer(fallback)
      setIsThinking(false)
      setConversationHistory(prev => [...prev, {
        role: 'assistant',
        text: fallback,
        timestamp: Date.now()
      }])
      speak(fallback)
    }
  }, [lang, speak, stopSpeaking])

  useEffect(() => {
    askQuestionRef.current = askQuestion
  }, [askQuestion])

  // ── ZONE ANNOUNCEMENT ──────────────────────────────────
  const announceZone = useCallback((
    zoneName: string, 
    narration: string
  ) => {
    setCurrentZone(zoneName)
    
    const zoneMessage: Message = {
      role: 'zone',
      text: narration,
      timestamp: Date.now(),
      zoneName
    }
    setConversationHistory(prev => [...prev, zoneMessage])

    speak(narration)
  }, [speak])

  // ── MUTE TOGGLE ────────────────────────────────────────
  const toggleMute = useCallback(() => {
    setIsMuted(prev => {
      if (!prev) window.speechSynthesis?.cancel()
      return !prev
    })
  }, [])

  // ── CLEANUP ────────────────────────────────────────────
  useEffect(() => {
    return () => {
      window.speechSynthesis?.cancel()
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop()
      }
    }
  }, [])

  return {
    isSpeaking, speak, stopSpeaking,
    isListening, transcript, startListening, stopListening,
    isThinking, lastQuestion, lastAnswer, conversationHistory,
    currentZone, setCurrentZone,
    askQuestion, announceZone,
    lang, setLang, volume, setVolume, isMuted, toggleMute
  }
}
