"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import dynamic from "next/dynamic"
import { useRouter } from "next/navigation"
import { AppShell } from "@/components/app-shell"
import { useAuth } from "@/lib/authContext"
import { addXP, computeAndSaveBadges } from "@/lib/authClient"
import { useVapi } from "@/hooks/useVapi"

import { ChevronDown } from "lucide-react"
import { getMonument, saveMonument } from "@/lib/monumentStore"

/* eslint-disable @typescript-eslint/no-explicit-any */

const MONUMENT_NAMES: Record<string, string> = {
  'taj-mahal': 'Taj Mahal', 'red-fort': 'Red Fort', 'qutub-minar': 'Qutub Minar',
  'gateway-india': 'Gateway of India', 'hampi': 'Hampi', 'golden-temple': 'Golden Temple Amritsar',
  'kedarnath': 'Kedarnath Temple', 'meenakshi': 'Meenakshi Amman Temple', 'mysore-palace': 'Mysore Palace',
  'hawa-mahal': 'Hawa Mahal Jaipur', 'charminar': 'Charminar Hyderabad', 'victoria-memorial': 'Victoria Memorial Kolkata',
  'ajanta': 'Ajanta Caves', 'konark': 'Konark Sun Temple', 'india-gate': 'India Gate Delhi',
}

// ── TAJ MAHAL ZONES ──────────────────────────────────────
const TAJ_ZONES = [
  {
    id: 1, name: "Main Gate (Darwaza-i-Rauza)", emoji: "🚪",
    lat: 27.17390, lng: 78.04215, radius: 50, xp: 50,
    arrival_fact: "You are standing at the Great Gate of the Taj Mahal, built entirely from red sandstone. This magnificent gateway stands 30 metres tall and is inscribed with verses from the Quran in black marble. As you pass through this gate, the Taj Mahal is revealed in perfect symmetry — exactly as Shah Jahan intended. The gate was designed to frame the entire mausoleum in a single breathtaking view.",
    direction_hint: "You are near the entrance of Taj Mahal complex. Walk straight ahead toward the large red sandstone archway.",
    mini_fact: "The gate has 11 small domed kiosks on top called chhatris."
  },
  {
    id: 2, name: "Reflecting Pool Center", emoji: "🌊",
    lat: 27.17420, lng: 78.04215, radius: 45, xp: 75,
    arrival_fact: "You are standing at the Hauz-i-Kausar — the Pool of Abundance. This rectangular reflecting pool stretches 162 metres long and perfectly mirrors the Taj Mahal in its waters. Shah Jahan believed water symbolized paradise in Islamic tradition. On a clear morning, you can see two Taj Mahals — one in the sky and one in the water below. Every photograph you have ever seen of the Taj Mahal was likely taken from exactly where you are standing.",
    direction_hint: "From the Main Gate, walk straight ahead about 100 metres. You will see a long rectangular pool stretching toward the Taj Mahal.",
    mini_fact: "The pool was designed so the Taj Mahal appears at its center when viewed from this exact spot."
  },
  {
    id: 3, name: "Whispering Gallery", emoji: "🔊",
    lat: 27.17510, lng: 78.04215, radius: 40, xp: 100,
    arrival_fact: "You have entered the main mausoleum chamber — the Whispering Gallery of the Taj Mahal. The inner dome rises 24 metres above you. Due to the perfect acoustic design, even the softest whisper travels along the curved walls and can be heard clearly on the opposite side. Shah Jahan's architects designed this intentionally — so that prayers for Mumtaz Mahal would echo eternally within these walls. At the center lie the cenotaphs of Mumtaz Mahal and Shah Jahan, surrounded by a screen of carved marble so fine it looks like lace.",
    direction_hint: "Walk past the reflecting pool and climb the marble plinth steps. Enter the main white marble mausoleum through the central arch.",
    mini_fact: "The actual tombs of Shah Jahan and Mumtaz are in a crypt directly below the cenotaphs."
  },
  {
    id: 4, name: "River Terrace (Yamuna View)", emoji: "🌅",
    lat: 27.17545, lng: 78.04215, radius: 45, xp: 125,
    arrival_fact: "You are standing on the River Terrace at the back of the Taj Mahal, overlooking the sacred Yamuna river. This is the most peaceful and least visited spot in the entire complex. Shah Jahan spent his final years imprisoned in Agra Fort across this very river, gazing at the Taj Mahal from a distance — never allowed to visit the tomb he built for his beloved wife. On full moon nights, the Taj Mahal glows silver from this terrace. You are standing where emperors once stood to grieve.",
    direction_hint: "Walk around to the back of the main mausoleum. Follow the marble pathway to the northern terrace overlooking the Yamuna river.",
    mini_fact: "Shah Jahan originally planned a black marble Taj Mahal for himself across the river, connected by a silver bridge."
  }
]

// ── RED FORT ZONES ──────────────────────────────────────
const RED_FORT_ZONES = [
  {
    id: 11, name: "Lahori Gate", emoji: "🚪",
    lat: 28.6558, lng: 77.2386, radius: 50, xp: 50,
    arrival_fact: "You are standing at the Lahori Gate, the main entrance to the Red Fort. Its name comes from its orientation towards the city of Lahore. Every Independence Day, the Prime Minister hoists the national flag from here.",
    direction_hint: "Walk straight towards the massive red sandstone gate.",
    mini_fact: "Aurangzeb added the barbican (outer wall) to make it more secure."
  },
  {
    id: 12, name: "Chatta Chowk", emoji: "🛍️",
    lat: 28.6559, lng: 77.2393, radius: 45, xp: 75,
    arrival_fact: "You have arrived at Chatta Chowk, the covered bazaar. Inspired by markets in Peshawar, Shah Jahan built this so the royal household could shop for silk, jewelry, and other exotic items without leaving the fort.",
    direction_hint: "Pass through Lahori gate into the arched corridor lined with shops.",
    mini_fact: "This is one of the very few covered markets from Mughal India."
  },
  {
    id: 13, name: "Diwan-i-Am", emoji: "👑",
    lat: 28.6561, lng: 77.2415, radius: 45, xp: 100,
    arrival_fact: "This is the Diwan-i-Am, the Hall of Public Audience. Emperor Shah Jahan sat on the ornate marble canopy (jharokha) to hear the grievances of commoners, separated by silver railings.",
    direction_hint: "Walk past the Naubat Khana to the large pillared red sandstone hall.",
    mini_fact: "The hall originally had ivory-colored polish that looked like white marble."
  },
  {
    id: 14, name: "Diwan-i-Khas", emoji: "💎",
    lat: 28.6565, lng: 77.2428, radius: 50, xp: 125,
    arrival_fact: "Welcome to the Diwan-i-Khas, the Hall of Private Audience. Here the Emperor met with VIPs. It once housed the legendary solid gold Peacock Throne, studded with precious gems including the Koh-i-Noor diamond.",
    direction_hint: "Head further east towards the intricately carved white marble pavilion.",
    mini_fact: "The Persian inscription here reads: 'If there is a paradise on earth, it is this'."
  }
]

// ── QUTUB MINAR ZONES ──────────────────────────────────────
const QUTUB_MINAR_ZONES = [
  {
    id: 21, name: "Qutub Minar Base", emoji: "🗼",
    lat: 28.5244, lng: 77.1855, radius: 50, xp: 50,
    arrival_fact: "You are looking up at the Qutub Minar, standing 72.5 meters tall. Built as a tower of victory by Qutb-ud-din Aibak in 1192, its five distinct stories feature intricate carvings and verses from the Quran.",
    direction_hint: "Walk straight up to the towering fluted brick minaret.",
    mini_fact: "It was struck by lightning multiple times and repaired by different rulers."
  },
  {
    id: 22, name: "Iron Pillar", emoji: "⚔️",
    lat: 28.5247, lng: 77.1849, radius: 40, xp: 75,
    arrival_fact: "You are standing before the Iron Pillar of Delhi. Dating back to the 4th century, it has amazed scientists for decades because it has barely rusted despite being exposed to the elements for over a millennium.",
    direction_hint: "Look for the metallic column standing in the center courtyard.",
    mini_fact: "It is composed of 98% wrought iron, utilizing an ancient anti-corrosion technique."
  },
  {
    id: 23, name: "Alai Darwaza", emoji: "🕌",
    lat: 28.5242, lng: 77.1852, radius: 45, xp: 100,
    arrival_fact: "You have reached the Alai Darwaza, the southern gateway of the Quwwat-ul-Islam Mosque built by Alauddin Khalji. It is considered a masterpiece of Indo-Islamic architecture, showcasing the first true dome and arches in India.",
    direction_hint: "It is the large domed gateway structure immediately south of the minaret.",
    mini_fact: "The gateway uses red sandstone alternating with white marble for a striking effect."
  },
  {
    id: 24, name: "Alai Minar", emoji: "🏗️",
    lat: 28.5256, lng: 77.1843, radius: 50, xp: 125,
    arrival_fact: "This massive pile of rubble is the Alai Minar. Alauddin Khalji intended to build a tower exactly twice the height of the Qutub Minar, but work stopped after his death when it was only 24.5 meters high.",
    direction_hint: "Walk to the northern side of the complex to find the wide, unfinished rubble base.",
    mini_fact: "The core is 24.5 meters high and was never given its outer facing of carved stone."
  }
]

const MONUMENT_ZONES: Record<string, typeof TAJ_ZONES> = {
  'taj-mahal': TAJ_ZONES,
  'red-fort': RED_FORT_ZONES,
  'qutub-minar': QUTUB_MINAR_ZONES,
}

function getBearing(from: { lat: number; lng: number }, to: { lat: number; lng: number }): number {
  const dLng = (to.lng - from.lng) * Math.PI / 180
  const lat1 = from.lat * Math.PI / 180
  const lat2 = to.lat * Math.PI / 180
  const y = Math.sin(dLng) * Math.cos(lat2)
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng)
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360
}

// ── Per-monument starting user position (Explore) ────────
const EXPLORE_USER_START: Record<string, { lat: number; lng: number }> = {
  'taj-mahal':   { lat: 27.17300, lng: 78.04215 },
  'red-fort':    { lat: 28.6545, lng: 77.2375 },
  'qutub-minar': { lat: 28.5235, lng: 77.1845 },
}

// ── LEAFLET MAP (dynamic, no SSR) ────────────────────────
const ExploreMap = dynamic(() => Promise.resolve(function ExploreMapInner({
  zones, currentZoneIndex, completedZones, userPos, isCallActive, isSpeaking, monumentId
}: {
  zones: typeof TAJ_ZONES; currentZoneIndex: number;
  completedZones: number[]; userPos: { lat: number; lng: number };
  isCallActive: boolean; isSpeaking: boolean; monumentId: string;
}) {
  const mapRef = useRef<any>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const markersRef = useRef<any[]>([])
  const lastMonumentRef = useRef<string>('')

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link')
      link.id = 'leaflet-css'
      link.rel = 'stylesheet'
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
      document.head.appendChild(link)
    }
    const L = require('leaflet')
    if (!containerRef.current) return

    // Destroy map if monument changed
    if (mapRef.current && lastMonumentRef.current !== monumentId) {
      mapRef.current.remove()
      mapRef.current = null
    }
    lastMonumentRef.current = monumentId

    // Use first zone as center
    const centerLat = zones[0]?.lat ?? 27.17460
    const centerLng = zones[0]?.lng ?? 78.04215

    if (mapRef.current) {
      markersRef.current.forEach(m => mapRef.current!.removeLayer(m))
      markersRef.current = []
    } else {
      mapRef.current = L.map(containerRef.current, {
        center: [centerLat, centerLng], zoom: 17,
        zoomControl: false, attributionControl: false,
      })
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(mapRef.current)
      L.control.zoom({ position: 'topright' }).addTo(mapRef.current)
    }
    // Pan to current zone
    const activeZone = zones[currentZoneIndex]
    if (activeZone) mapRef.current.panTo([activeZone.lat, activeZone.lng])

    const map = mapRef.current!
    const newMarkers: any[] = []

    // Path line connecting zones
    const pathCoords = zones.map(z => [z.lat, z.lng])
    const polyline = L.polyline(pathCoords, {
      color: '#C9A84C', weight: 2, dashArray: '8 6', opacity: 0.6
    }).addTo(map)
    newMarkers.push(polyline)

    // Zone markers
    zones.forEach((zone, i) => {
      const isActive = i === currentZoneIndex
      const isComplete = completedZones.includes(zone.id)
      const isFuture = !isActive && !isComplete

      const marker = L.circleMarker([zone.lat, zone.lng], {
        radius: isActive ? 14 : 10,
        fillColor: isComplete ? '#4B9B8E' : isActive ? '#C9A84C' : '#555',
        color: isComplete ? '#4B9B8E' : isActive ? '#C9A84C' : '#777',
        fillOpacity: isActive ? 0.9 : 0.7,
        weight: isActive ? 3 : 1,
        className: isActive ? 'pulse-marker' : ''
      }).addTo(map)

      marker.bindPopup(`<b style="color:#333">${zone.emoji} ${zone.name}</b><br/><span style="color:#666">${isComplete ? '✅ Completed' : isFuture ? '🔒 Locked' : '📍 Current'}</span>`)
      newMarkers.push(marker)

      // Label
      const label = L.marker([zone.lat, zone.lng], {
        icon: L.divIcon({
          className: '',
          html: `<div style="font-size:18px;text-align:center;margin-top:-30px">${isComplete ? '✅' : zone.emoji}</div>`,
          iconSize: [30, 30],
        })
      }).addTo(map)
      newMarkers.push(label)
    })

    // User marker
    const userMarker = L.circleMarker([userPos.lat, userPos.lng], {
      radius: 8, fillColor: '#fff', color: '#C9A84C',
      fillOpacity: 1, weight: 3
    }).addTo(map)
    userMarker.bindPopup('<b style="color:#333">📍 You</b>')
    newMarkers.push(userMarker)

    const youLabel = L.marker([userPos.lat, userPos.lng], {
      icon: L.divIcon({
        className: '',
        html: '<div style="font-size:11px;color:#C9A84C;font-weight:700;text-align:center;margin-top:8px">You</div>',
        iconSize: [40, 20],
      })
    }).addTo(map)
    newMarkers.push(youLabel)

    markersRef.current = newMarkers
  }, [zones, currentZoneIndex, completedZones, userPos, isCallActive, isSpeaking, monumentId])

  return (
    <div style={{ position: 'relative' }}>
      <div ref={containerRef} style={{ height: '350px', borderRadius: '16px', overflow: 'hidden', border: '1px solid rgba(201,168,76,0.3)' }} />
      {/* Vapi status overlay */}
      <div style={{
        position: 'absolute', bottom: '12px', left: '50%', transform: 'translateX(-50%)',
        background: 'rgba(15,11,30,0.9)', borderRadius: '20px', padding: '6px 16px',
        color: isCallActive ? (isSpeaking ? '#4B9B8E' : '#C9A84C') : '#C4A882',
        fontSize: '12px', fontWeight: 600, border: '1px solid rgba(201,168,76,0.3)',
        backdropFilter: 'blur(8px)', zIndex: 1000
      }}>
        {isCallActive ? (isSpeaking ? '🔊 Guide speaking' : '🎤 Listening') : '📞 Voice Guide Off'}
      </div>
      <style>{`.pulse-marker { animation: markerPulse 1.5s ease infinite; } @keyframes markerPulse { 0%,100% { opacity: 0.9; } 50% { opacity: 0.5; } }`}</style>
    </div>
  )
}), { ssr: false })

// ── MAIN EXPLORER PAGE ───────────────────────────────────
export default function ExplorePage() {
  const router = useRouter()
  const { user, profile, setProfile } = useAuth()
  const { isCallActive, isSpeaking, startCall, endCall, sendZoneContext } = useVapi()

  const [currentZoneIndex, setCurrentZoneIndex] = useState(0)
  const [arrivedAtZone, setArrivedAtZone] = useState(false)
  const [completedZones, setCompletedZones] = useState<number[]>([])
  const [showFact, setShowFact] = useState(false)
  const [xpEarned, setXpEarned] = useState(0)
  const [explorerComplete, setExplorerComplete] = useState(false)
  const [demoDistance, setDemoDistance] = useState(280)
  const [demoMode] = useState(true)
  const [userPos, setUserPos] = useState(() => EXPLORE_USER_START[getMonument()?.id || 'taj-mahal'] || EXPLORE_USER_START['taj-mahal'])
  const [isTTSSpeaking, setIsTTSSpeaking] = useState(false)

  const [exploreMonumentId, setExploreMonumentId] = useState(() => {
    const stored = getMonument()?.id
    return stored && MONUMENT_ZONES[stored] ? stored : 'taj-mahal'
  })
  const monumentSelected = true // always start directly into explore
  const [monumentsList, setMonumentsList] = useState<{id: string; name: string}[]>([])
  
  const activeZones = MONUMENT_ZONES[exploreMonumentId] || TAJ_ZONES

  const zone = activeZones[currentZoneIndex]
  const bearing = getBearing(userPos, { lat: zone.lat, lng: zone.lng })

  useEffect(() => {
    // Fill the monument dropdown
    setMonumentsList([
      { id: 'taj-mahal', name: 'Taj Mahal' },
      { id: 'red-fort', name: 'Red Fort' },
      { id: 'qutub-minar', name: 'Qutub Minar' }
    ])
  }, [])

  // ── SPEAK FACT (browser TTS with voice selection) ────────
  const speakFact = useCallback((text: string) => {
    if (!window.speechSynthesis) return
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'en-US'
    utterance.rate = 0.88
    utterance.pitch = 1.0
    const voices = window.speechSynthesis.getVoices()
    const preferred = voices.find(v =>
      v.name.includes('Google') ||
      v.name.includes('Samantha') ||
      v.name.includes('Daniel') ||
      v.lang.includes('en-US')
    )
    if (preferred) utterance.voice = preferred
    utterance.onstart = () => setIsTTSSpeaking(true)
    utterance.onend = () => setIsTTSSpeaking(false)
    utterance.onerror = () => setIsTTSSpeaking(false)
    window.speechSynthesis.speak(utterance)
  }, [])

  // ── DEMO: simulate walking toward zone ──────────────────
  useEffect(() => {
    if (!demoMode || arrivedAtZone) return
    const z = activeZones[currentZoneIndex]
    const interval = setInterval(() => {
      setDemoDistance(prev => {
        if (prev <= 15) { clearInterval(interval); return 0 }
        return prev - 12
      })
      setUserPos(prev => ({
        lat: prev.lat + (z.lat - prev.lat) * 0.15,
        lng: prev.lng + (z.lng - prev.lng) * 0.15
      }))
    }, 1500)
    return () => clearInterval(interval)
  }, [currentZoneIndex, arrivedAtZone, demoMode, exploreMonumentId])

  // Reset distance when zone changes + auto-speak direction hint
  useEffect(() => {
    setDemoDistance(Math.floor(Math.random() * 150) + 150)
    setArrivedAtZone(false)
    setShowFact(false)
    // Auto-narrate direction hint after short delay
    const timer = setTimeout(() => {
      speakFact(activeZones[currentZoneIndex].direction_hint)
    }, 1000)
    return () => { clearTimeout(timer); window.speechSynthesis?.cancel() }
  }, [currentZoneIndex, speakFact, exploreMonumentId])

  // ── HANDLE ARRIVAL ──────────────────────────────────────
  const handleArrival = useCallback(async () => {
    if (arrivedAtZone) return
    setArrivedAtZone(true)
    setShowFact(true)
    setDemoDistance(0)

    const z = activeZones[currentZoneIndex]

    // Write XP to Supabase
    if (user) {
      try {
        const newXP = await addXP(user.id, z.xp, 'ZONE_EXPLORE')
        setProfile((prev: any) => ({ ...prev, total_xp: newXP }))
        await computeAndSaveBadges(user.id, { total_xp: newXP })
        window.dispatchEvent(new Event('xp-updated'))
      } catch (err) { console.warn('XP award failed:', err) }
    }
    setXpEarned(z.xp)
    setCompletedZones(prev => [...prev, z.id])

    // Auto-narrate the arrival fact
    if (isCallActive) {
      sendZoneContext(z.name, z.arrival_fact, exploreMonumentId)
    }
    speakFact(z.arrival_fact)
  }, [arrivedAtZone, currentZoneIndex, user, profile, isCallActive, sendZoneContext, setProfile, speakFact])

  const stopNarration = useCallback(() => {
    window.speechSynthesis?.cancel()
    setIsTTSSpeaking(false)
    if (isCallActive) endCall()
  }, [isCallActive, endCall])

  // ── COMPLETION SCREEN ───────────────────────────────────
  if (explorerComplete) {
    const totalXP = activeZones.reduce((sum, z) => sum + z.xp, 0)
    return (
      <AppShell>
        <style>{`@keyframes confetti { 0% { transform: translateY(-20px) scale(0.8); opacity: 0; } 50% { opacity: 1; } 100% { transform: translateY(0) scale(1); opacity: 1; } }`}</style>
        <div style={{ textAlign: 'center', padding: '40px 20px', animation: 'confetti 0.6s ease' }}>
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>🏛️</div>
          <h1 style={{ color: '#C9A84C', fontFamily: 'Georgia,serif', fontSize: '32px', marginBottom: '8px' }}>
            Explorer Complete!
          </h1>
          <p style={{ color: '#F5E6D3', fontSize: '16px', marginBottom: '24px' }}>
            You have explored all {activeZones.length} historic zones of the {MONUMENT_NAMES[exploreMonumentId] || 'Monument'}
          </p>
          <div style={{ fontSize: '48px', fontWeight: '700', color: '#C9A84C', marginBottom: '8px' }}>
            +{totalXP} XP
          </div>
          <p style={{ color: '#C4A882', marginBottom: '32px' }}>Total XP earned this exploration</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'center', marginBottom: '32px' }}>
            {activeZones.map(z => (
              <div key={z.id} style={{
                background: 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.3)',
                borderRadius: '20px', padding: '8px 16px', color: '#C9A84C', fontSize: '14px'
              }}>
                ✅ {z.emoji} {z.name}
              </div>
            ))}
          </div>
          <button onClick={() => router.push('/')} style={{
            background: 'linear-gradient(135deg,#C9A84C,#D4893F)', borderRadius: '16px',
            padding: '14px 32px', color: '#0F0B1E', fontWeight: '700', fontSize: '16px',
            border: 'none', cursor: 'pointer'
          }}>
            🏠 Back to Home
          </button>
        </div>
      </AppShell>
    )
  }

  // No blocking gate — always go directly into explore
  return (
    <AppShell>
      <style>{`
        @keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:0.5 } }
        @keyframes fadeIn { from { opacity:0; transform:translateY(10px) } to { opacity:1; transform:translateY(0) } }
        @keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
      `}</style>

      {/* Demo mode banner */}
      {demoMode && (
        <div style={{
          background: 'rgba(201,168,76,0.15)', borderBottom: '1px solid rgba(201,168,76,0.3)',
          padding: '8px 16px', textAlign: 'center', color: '#C9A84C', fontSize: '12px', fontWeight: 600
        }}>
          🎮 DEMO MODE — Synthetic GPS active | Press &quot;I&apos;ve Arrived&quot; at any distance to explore
        </div>
      )}

  <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              {/* Monument Switcher */}
              <div style={{ position: 'relative', display: 'inline-block', marginBottom: 4 }}>
                <select
                  value={exploreMonumentId}
                  onChange={e => {
                    const id = e.target.value
                    const name = monumentsList.find(m => m.id === id)?.name || id
                    // Cancel any ongoing narration first
                    window.speechSynthesis?.cancel()
                    setIsTTSSpeaking(false)
                    if (isCallActive) endCall()
                    // Reset all zone state
                    setExploreMonumentId(id); saveMonument(id, name)
                    setCurrentZoneIndex(0); setCompletedZones([]); setXpEarned(0)
                    setExplorerComplete(false); setArrivedAtZone(false); setShowFact(false)
                    const newStart = EXPLORE_USER_START[id] || EXPLORE_USER_START['taj-mahal']
                    setUserPos(newStart)
                    setDemoDistance(Math.floor(Math.random() * 150) + 150)
                  }}
                  style={{
                    fontFamily: 'Georgia,serif', fontSize: '22px', fontWeight: 700,
                    color: '#C9A84C', background: 'transparent', border: 'none',
                    paddingRight: 24, cursor: 'pointer', appearance: 'none' as const,
                    outline: 'none'
                  }}
                >
                  {monumentsList.map(m => <option key={m.id} value={m.id} style={{ background: '#1C1638', color: '#C9A84C' }}>🏛️ {m.name} Explorer</option>)}
                </select>
                <ChevronDown style={{ position: 'absolute', right: 0, top: 6, width: 14, height: 14, color: '#C9A84C', pointerEvents: 'none' }} />
              </div>
              <p style={{ color: '#C4A882', fontSize: '13px', margin: '4px 0 0' }}>
                Zone {currentZoneIndex + 1} of {activeZones.length}
              </p>
            </div>

            {/* Voice guide toggle */}
            {!isCallActive ? (
              <button onClick={() => startCall(`${MONUMENT_NAMES[exploreMonumentId] || 'Monument'} Entrance`, exploreMonumentId)} style={{
                background: 'linear-gradient(135deg,#C9A84C,#D4893F)', borderRadius: '12px',
                padding: '10px 16px', color: '#0F0B1E', fontWeight: '700', fontSize: '13px',
                border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px'
              }}>
                📞 Start Voice Guide
              </button>
            ) : (
              <button onClick={endCall} style={{
                background: '#DC2626', borderRadius: '12px', padding: '10px 16px',
                color: 'white', fontWeight: '700', fontSize: '13px', border: 'none',
                cursor: 'pointer', animation: 'pulse 2s infinite'
              }}>
                📵 End Voice Guide
              </button>
            )}
          </div>

          {/* Breadcrumb */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '20px' }}>
            {activeZones.map((z, i) => (
              <div key={z.id} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: 12, height: 12, borderRadius: '50%',
                  background: completedZones.includes(z.id) ? '#4B9B8E'
                    : i === currentZoneIndex ? '#C9A84C' : '#444',
                  animation: i === currentZoneIndex ? 'pulse 1.5s infinite' : 'none',
                  border: i === currentZoneIndex ? '2px solid #C9A84C' : 'none'
                }} />
                {i < activeZones.length - 1 && (
                  <div style={{ width: 24, height: 2, background: completedZones.includes(z.id) ? '#4B9B8E' : '#333' }} />
                )}
              </div>
            ))}
          </div>

          {/* Map */}
          <div style={{ marginBottom: '16px' }}>
            <ExploreMap
              zones={activeZones} currentZoneIndex={currentZoneIndex}
              completedZones={completedZones} userPos={userPos}
              isCallActive={isCallActive} isSpeaking={isSpeaking}
              monumentId={exploreMonumentId}
            />
          </div>

          {/* ── DIRECTION CARD (before arrival) ──────── */}
          {!showFact && (
            <div style={{
              background: 'rgba(28,22,56,0.9)', border: '1px solid rgba(201,168,76,0.2)',
              borderRadius: '16px', padding: '24px', animation: 'fadeIn 0.4s ease'
            }}>
              <h2 style={{ color: '#C9A84C', fontFamily: 'Georgia,serif', fontSize: '22px', marginBottom: '4px' }}>
                {zone.emoji} {zone.name}
              </h2>
              <p style={{ color: '#C4A882', fontSize: '12px', marginBottom: '16px' }}>
                Zone {currentZoneIndex + 1} of {activeZones.length} • +{zone.xp} XP on arrival
              </p>

              {/* Direction hint */}
              <div style={{
                background: 'rgba(201,168,76,0.08)', borderLeft: '3px solid #C9A84C',
                borderRadius: '8px', padding: '12px 14px', marginBottom: '20px'
              }}>
                <p style={{ color: '#F5E6D3', fontSize: '14px', lineHeight: '1.6', margin: 0 }}>
                  🧭 {zone.direction_hint}
                </p>
              </div>

              {/* Distance + Compass */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '24px', marginBottom: '20px' }}>
                {/* Compass arrow */}
                <div style={{ width: 60, height: 60, position: 'relative' }}>
                  <svg width="60" height="60" viewBox="0 0 60 60" style={{ transform: `rotate(${bearing}deg)`, transition: 'transform 0.5s ease' }}>
                    <circle cx="30" cy="30" r="28" fill="none" stroke="rgba(201,168,76,0.3)" strokeWidth="2" />
                    <polygon points="30,6 24,26 36,26" fill="#C9A84C" />
                    <circle cx="30" cy="30" r="4" fill="#C9A84C" />
                  </svg>
                </div>

                {/* Distance */}
                <div style={{ textAlign: 'center' }}>
                  <div style={{
                    fontSize: '48px', fontWeight: '700',
                    color: demoDistance < 30 ? '#4B9B8E' : '#C9A84C',
                    fontFamily: 'Georgia,serif', lineHeight: 1
                  }}>
                    {demoDistance}m
                  </div>
                  <div style={{ color: '#C4A882', fontSize: '14px', marginTop: '4px' }}>
                    {demoDistance > 100 ? '🚶 Keep walking...' : demoDistance > 30 ? '📍 Getting close!' : '✅ You are here!'}
                  </div>
                </div>
              </div>

              {/* I've Arrived button */}
              <button
                onClick={handleArrival}
                disabled={arrivedAtZone}
                style={{
                  background: arrivedAtZone ? 'rgba(75,155,142,0.3)' : 'linear-gradient(135deg,#4B9B8E,#3a7a6e)',
                  borderRadius: '16px', padding: '16px 32px', color: 'white',
                  fontWeight: '700', fontSize: '18px', width: '100%',
                  border: 'none', cursor: arrivedAtZone ? 'default' : 'pointer',
                }}
              >
                {arrivedAtZone ? '✅ Arrived!' : "📍 I've Arrived!"}
              </button>
            </div>
          )}

          {/* ── FACT REVEAL CARD (after arrival) ─────── */}
          {showFact && (
            <div style={{
              background: 'rgba(28,22,56,0.95)', border: '1px solid #C9A84C',
              borderRadius: '16px', padding: '24px', animation: 'fadeIn 0.5s ease'
            }}>
              {/* XP Badge */}
              <div style={{
                background: 'linear-gradient(135deg,#C9A84C,#D4893F)', borderRadius: '20px',
                padding: '6px 16px', display: 'inline-flex', alignItems: 'center',
                gap: '6px', marginBottom: '16px'
              }}>
                <span style={{ fontSize: '16px' }}>⚡</span>
                <span style={{ color: '#0F0B1E', fontWeight: '700' }}>+{xpEarned} XP Earned!</span>
              </div>

              <h3 style={{ color: '#C9A84C', fontFamily: 'Georgia,serif', fontSize: '20px', marginBottom: '12px' }}>
                {zone.emoji} {zone.name}
              </h3>

              <p style={{ color: '#F5E6D3', lineHeight: '1.7', fontSize: '15px', marginBottom: '16px' }}>
                {zone.arrival_fact}
              </p>

              {/* Mini fact chip */}
              <div style={{
                background: 'rgba(75,155,142,0.15)', border: '1px solid rgba(75,155,142,0.2)',
                borderRadius: '10px', padding: '10px 14px', color: '#4B9B8E', fontSize: '13px',
                marginBottom: '16px'
              }}>
                💡 {zone.mini_fact}
              </div>

              {/* Speaking indicator + stop button */}
              {(isSpeaking || isTTSSpeaking) && (
                <div style={{
                  background: 'rgba(201,168,76,0.1)',
                  border: '1px solid #C9A84C44',
                  borderRadius: '10px',
                  padding: '8px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '12px'
                }}>
                  <div style={{
                    width: '8px', height: '8px',
                    borderRadius: '50%',
                    background: '#C9A84C',
                    animation: 'pulse 1s infinite'
                  }}/>
                  <span style={{ color: '#C9A84C', fontSize: '13px' }}>
                    🔊 Audio guide narrating...
                  </span>
                  <button
                    onClick={stopNarration}
                    style={{
                      marginLeft: 'auto',
                      background: 'none',
                      border: 'none',
                      color: '#C4A882',
                      cursor: 'pointer',
                      fontSize: '12px'
                    }}
                  >
                    ⏹ Stop
                  </button>
                </div>
              )}

              {/* Next zone or complete */}
              {currentZoneIndex < activeZones.length - 1 ? (
                <button
                  onClick={() => {
                    window.speechSynthesis?.cancel()
                    setCurrentZoneIndex(prev => prev + 1)
                  }}
                  style={{
                    background: 'linear-gradient(135deg,#C9A84C,#D4893F)', borderRadius: '12px',
                    padding: '12px 24px', color: '#0F0B1E', fontWeight: '700', fontSize: '15px',
                    border: 'none', cursor: 'pointer', width: '100%'
                  }}
                >
                  Next Zone: {activeZones[currentZoneIndex + 1].emoji} {activeZones[currentZoneIndex + 1].name} →
                </button>
              ) : (
                <button
                  onClick={() => setExplorerComplete(true)}
                  style={{
                    background: 'linear-gradient(135deg,#534AB7,#3d35a0)', borderRadius: '12px',
                    padding: '12px 24px', color: 'white', fontWeight: '700', fontSize: '15px',
                    border: 'none', cursor: 'pointer', width: '100%'
                  }}
                >
                  🎉 Complete Explorer!
                </button>
              )}
            </div>
          )}
      </div>
    </AppShell>
  )
}
