'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import Vapi from '@vapi-ai/web'

interface Message {
  role: 'user' | 'assistant' | 'zone'
  text: string
  timestamp: number
  zoneName?: string
}

interface UseVapiReturn {
  isCallActive: boolean
  isListening: boolean
  isSpeaking: boolean
  isLoading: boolean
  transcript: string
  messages: Message[]
  currentZoneName: string | null
  startCall: (zoneName?: string, monumentId?: string) => void
  endCall: () => void
  sendZoneContext: (zoneName: string, narration: string, monumentId: string) => void
  error: string | null
  volumeLevel: number
}

export function useVapi(): UseVapiReturn {
  const vapiRef = useRef<Vapi | null>(null)
  
  const [isCallActive, setIsCallActive] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [currentZoneName, setCurrentZoneName] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [volumeLevel, setVolumeLevel] = useState(0)

  // Initialize Vapi once
  useEffect(() => {
    const publicKey = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY
    if (!publicKey) {
      setError('Vapi public key not found in environment variables')
      return
    }

    const vapi = new Vapi(publicKey)
    vapiRef.current = vapi

    // ── EVENT LISTENERS ──────────────────────────────────

    vapi.on('call-start', () => {
      setIsCallActive(true)
      setIsLoading(false)
      setError(null)
      console.log('Vapi call started')
    })

    vapi.on('call-end', () => {
      setIsCallActive(false)
      setIsListening(false)
      setIsSpeaking(false)
      setIsLoading(false)
      setVolumeLevel(0)
      console.log('Vapi call ended')
    })

    vapi.on('speech-start', () => {
      setIsSpeaking(true)
      setIsListening(false)
    })

    vapi.on('speech-end', () => {
      setIsSpeaking(false)
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vapi.on('message', (message: any) => {
      // Handle transcript messages
      if (message.type === 'transcript') {
        if (message.transcriptType === 'partial') {
          setTranscript(message.transcript)
        }
        if (message.transcriptType === 'final') {
          setTranscript('')
          if (message.role === 'user' && message.transcript.trim()) {
            setIsListening(false)
            setMessages(prev => [...prev, {
              role: 'user',
              text: message.transcript,
              timestamp: Date.now()
            }])
          }
        }
      }

      // Handle assistant responses
      if (
        message.type === 'transcript' &&
        message.role === 'assistant' &&
        message.transcriptType === 'final' &&
        message.transcript.trim()
      ) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          text: message.transcript,
          timestamp: Date.now()
        }])
      }

      // Handle conversation updates
      if (message.type === 'conversation-update') {
        const lastMsg = message.conversation?.[message.conversation.length - 1]
        if (lastMsg?.role === 'assistant' && lastMsg?.content) {
          setMessages(prev => {
            const alreadyExists = prev.some(
              m => m.role === 'assistant' && 
              m.text === lastMsg.content &&
              Date.now() - m.timestamp < 3000
            )
            if (alreadyExists) return prev
            return [...prev, {
              role: 'assistant',
              text: lastMsg.content,
              timestamp: Date.now()
            }]
          })
        }
      }
    })

    vapi.on('volume-level', (level: number) => {
      setVolumeLevel(level)
      if (level > 0.02) {
        setIsListening(true)
      }
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vapi.on('error', (err: any) => {
      console.error('Vapi error raw trace:', err)
      let errorStr = 'Voice connection error. Please try again.'
      if (typeof err === 'string') {
        errorStr = err
      } else if (err?.message) {
        errorStr = err.message
      } else if (err?.error?.message) {
        errorStr = err.error.message
      } else if (err?.errorMsg) {
        errorStr = err.errorMsg
      } else {
        try {
          errorStr = JSON.stringify(err)
        } catch { /* ignore */ }
      }

      setError(errorStr)
      setIsLoading(false)
      setIsCallActive(false)
    })

    return () => {
      vapi.stop()
    }
  }, [])

  // ── START CALL ───────────────────────────────────────────
  const startCall = useCallback((
    zoneName?: string,
    monumentId?: string
  ) => {
    const vapi = vapiRef.current
    if (!vapi) {
      setError('Vapi not initialized')
      return
    }

    const assistantId = process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID
    if (!assistantId) {
      setError('Vapi assistant ID not found')
      return
    }

    setIsLoading(true)
    setError(null)

    const zoneContext = zoneName
      ? `The visitor is currently at: ${zoneName}. Monument: ${
          monumentId?.replace(/-/g, ' ') || 'Indian heritage site'
        }. Greet them and tell them something fascinating about 
        where they are standing right now.`
      : `The visitor has just opened the heritage guide app. 
        Welcome them warmly and ask which monument they would 
        like to learn about today.`

    vapi.start(assistantId, {
      variableValues: {
        zone_context: zoneContext,
        monument_id: monumentId || 'general',
        zone_name: zoneName || 'Heritage Explorer'
      }
    })

  }, [])

  // ── END CALL ─────────────────────────────────────────────
  const endCall = useCallback(() => {
    vapiRef.current?.stop()
    setIsCallActive(false)
    setIsListening(false)
    setIsSpeaking(false)
    setIsLoading(false)
    setVolumeLevel(0)
  }, [])

  // ── SEND ZONE CONTEXT ────────────────────────────────────
  const sendZoneContext = useCallback((
    zoneName: string,
    narration: string,
    monumentId: string
  ) => {
    const vapi = vapiRef.current
    if (!vapi || !isCallActive) return

    setCurrentZoneName(zoneName)

    setMessages(prev => [...prev, {
      role: 'zone',
      text: narration,
      timestamp: Date.now(),
      zoneName
    }])

    vapi.send({
      type: 'add-message',
      message: {
        role: 'system',
        content: `ZONE CHANGE: The visitor has just entered a new zone.
          Zone name: ${zoneName}
          Monument: ${monumentId.replace(/-/g, ' ')}
          Please acknowledge this zone change naturally and share 
          the most interesting fact about where they are now: 
          ${narration}`
      }
    })
  }, [isCallActive])

  return {
    isCallActive,
    isListening,
    isSpeaking,
    isLoading,
    transcript,
    messages,
    currentZoneName,
    startCall,
    endCall,
    sendZoneContext,
    error,
    volumeLevel
  }
}
