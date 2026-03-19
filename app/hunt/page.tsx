"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { AppShell } from "@/components/app-shell"
import { MapPin, Trophy, ChevronDown, Eye, EyeOff } from "lucide-react"
import api from "@/lib/apiClient"
import { Toast, useToast } from "@/components/Toast"
import { useLang } from "@/lib/languageContext"
import { getMonument, saveMonument, clearMonument } from "@/lib/monumentStore"
import { useAuth } from "@/lib/authContext"
import { addXP, computeAndSaveBadges } from "@/lib/authClient"
import dynamic from "next/dynamic"

// ─── Haversine distance (meters) ───
function getDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371000
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  return R * 2 * Math.asin(Math.sqrt(a))
}

// ─── Monument GPS coordinates ───
const MONUMENT_COORDS: Record<string, { lat: number; lng: number; radius: number }> = {
  "taj-mahal":         { lat: 27.1751, lng: 78.0421, radius: 500 },
  "red-fort":          { lat: 28.6562, lng: 77.2410, radius: 400 },
  "qutub-minar":       { lat: 28.5244, lng: 77.1855, radius: 300 },
  "hawa-mahal":        { lat: 26.9239, lng: 75.8267, radius: 300 },
  "india-gate":        { lat: 28.6129, lng: 77.2295, radius: 400 },
  "gateway-india":     { lat: 18.9220, lng: 72.8347, radius: 300 },
  "golden-temple":     { lat: 31.6200, lng: 74.8765, radius: 300 },
  "hampi":             { lat: 15.3350, lng: 76.4600, radius: 600 },
  "kedarnath":         { lat: 30.7352, lng: 79.0669, radius: 400 },
  "meenakshi":         { lat:  9.9195, lng: 78.1193, radius: 300 },
  "mysore-palace":     { lat: 12.3052, lng: 76.6552, radius: 400 },
  "charminar":         { lat: 17.3616, lng: 78.4747, radius: 300 },
  "victoria-memorial": { lat: 22.5448, lng: 88.3426, radius: 400 },
  "ajanta":            { lat: 20.5519, lng: 75.7033, radius: 600 },
  "konark":            { lat: 19.8876, lng: 86.0945, radius: 400 },
}

const MONUMENT_NAMES: Record<string, string> = {
  'taj-mahal': 'Taj Mahal', 'red-fort': 'Red Fort', 'qutub-minar': 'Qutub Minar',
  'gateway-india': 'Gateway of India', 'hampi': 'Hampi', 'golden-temple': 'Golden Temple Amritsar',
  'kedarnath': 'Kedarnath Temple', 'meenakshi': 'Meenakshi Amman Temple', 'mysore-palace': 'Mysore Palace',
  'hawa-mahal': 'Hawa Mahal Jaipur', 'charminar': 'Charminar Hyderabad', 'victoria-memorial': 'Victoria Memorial Kolkata',
  'ajanta': 'Ajanta Caves', 'konark': 'Konark Sun Temple', 'india-gate': 'India Gate Delhi',
}

// ─── Taj Mahal Predefined Riddles ───
const TAJ_MAHAL_RIDDLES = [
  {
    id: 1,
    riddle: "Shah Jahan whispered his grief into these curved walls — stand where sound travels in secrets. Where do whispers travel without being heard by others?",
    location_name: "Whispering Gallery",
    hint: "Look for the curved chambers inside the main mausoleum",
    target_lat: 27.17510, target_lng: 78.04215, radius_meters: 40,
    xp_rewards: { first: 50, second: 30, third: 20 }
  },
  {
    id: 2,
    riddle: "Four sentinels stand guard at the corners, tilted slightly outward so they never fall upon the tomb. Climb to where the muezzin once called the faithful.",
    location_name: "Northwest Minaret Base",
    hint: "Head to one of the four tall towers at the corners of the plinth",
    target_lat: 27.17498, target_lng: 78.04178, radius_meters: 35,
    xp_rewards: { first: 50, second: 30, third: 20 }
  },
  {
    id: 3,
    riddle: "Stand at the threshold where the Yamuna meets eternity. The river flows behind the marble throne — find the terrace where emperors once sat to grieve.",
    location_name: "River Terrace",
    hint: "Walk behind the main tomb toward the Yamuna riverbank",
    target_lat: 27.17535, target_lng: 78.04220, radius_meters: 45,
    xp_rewards: { first: 50, second: 30, third: 20 }
  },
  {
    id: 4,
    riddle: "Two mosques face each other in perfect symmetry — one faces Mecca, the other is just a mirror for balance. Find the one that cannot be used for prayer.",
    location_name: "Jawab (Echo Mosque)",
    hint: "Look to the east side — the mirror building of the mosque",
    target_lat: 27.17461, target_lng: 78.04268, radius_meters: 40,
    xp_rewards: { first: 50, second: 30, third: 20 }
  },
  {
    id: 5,
    riddle: "The great gate of paradise — stand at the point where the reflecting pool perfectly frames the white dome. This is where every photograph begins.",
    location_name: "Hauz-i-Kausar Reflecting Pool Center",
    hint: "Stand at the midpoint of the long rectangular pool in the garden",
    target_lat: 27.17390, target_lng: 78.04215, radius_meters: 50,
    xp_rewards: { first: 50, second: 30, third: 20 }
  }
]

// ─── Synthetic Players ───
const SYNTHETIC_PLAYERS = [
  {
    id: "player_priya", name: "Priya", color: "#FF6B9D", avatar: "👩",
    positions: [
      { lat: 27.17455, lng: 78.04190 },
      { lat: 27.17462, lng: 78.04178 },
      { lat: 27.17471, lng: 78.04182 },
    ],
    clueInterval: 45000,
  },
  {
    id: "player_arjun", name: "Arjun", color: "#4ECDC4", avatar: "👨",
    positions: [
      { lat: 27.17520, lng: 78.04240 },
      { lat: 27.17510, lng: 78.04225 },
      { lat: 27.17505, lng: 78.04218 },
    ],
    clueInterval: 75000,
  },
  {
    id: "player_diya", name: "Diya", color: "#FFE66D", avatar: "👧",
    positions: [
      { lat: 27.17440, lng: 78.04260 },
      { lat: 27.17450, lng: 78.04245 },
      { lat: 27.17460, lng: 78.04230 },
    ],
    clueInterval: 60000,
  }
]

type GeoStatus = 'idle' | 'checking' | 'inside' | 'outside' | 'error'

interface PlayerState {
  id: string; name: string; color: string; avatar: string;
  lat: number; lng: number; prevLat: number; prevLng: number;
  cluesCompleted: number; xp: number; posIndex: number;
}

// ─── Leaflet Map Component (dynamically imported, no SSR) ───
const HuntMap = dynamic(() => Promise.resolve(function HuntMapInner({
  riddles, activeClueIdx, completedClues, userLat, userLng,
  players, demoMode,
}: {
  riddles: typeof TAJ_MAHAL_RIDDLES; activeClueIdx: number;
  completedClues: Set<number>; userLat: number; userLng: number;
  players: PlayerState[]; demoMode: boolean;
}) {
  const mapRef = useRef<L.Map | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const markersRef = useRef<L.Layer[]>([])

  useEffect(() => {
    if (typeof window === 'undefined') return
    // Inject Leaflet CSS via CDN link (Turbopack doesn't support CSS require in components)
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link')
      link.id = 'leaflet-css'
      link.rel = 'stylesheet'
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
      document.head.appendChild(link)
    }
    const L = require('leaflet')

    if (!containerRef.current) return
    if (mapRef.current) {
      // Update existing map
      markersRef.current.forEach(m => mapRef.current!.removeLayer(m))
      markersRef.current = []
    } else {
      mapRef.current = L.map(containerRef.current, {
        center: [27.17490, 78.04215],
        zoom: 17,
        zoomControl: false,
        attributionControl: false,
      })
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
      }).addTo(mapRef.current)
      L.control.zoom({ position: 'topright' }).addTo(mapRef.current)
    }

    const map = mapRef.current!
    const newMarkers: L.Layer[] = []

    // Riddle target markers
    riddles.forEach((r, idx) => {
      const isActive = idx === activeClueIdx
      const isCompleted = completedClues.has(r.id)
      const isFuture = idx > activeClueIdx && !isCompleted

      let markerColor = '#555'
      let markerRadius = 6
      let markerOpacity = 0.5
      let fillColor = '#555'

      if (isActive) {
        markerColor = '#C9A84C'
        fillColor = '#C9A84C'
        markerRadius = 10
        markerOpacity = 0.9
      } else if (isCompleted) {
        markerColor = '#4B9B8E'
        fillColor = '#4B9B8E'
        markerRadius = 7
        markerOpacity = 0.8
      } else if (isFuture) {
        markerColor = '#666'
        fillColor = '#444'
        markerRadius = 5
        markerOpacity = 0.4
      }

      const cm = L.circleMarker([r.target_lat, r.target_lng], {
        radius: markerRadius,
        fillColor, color: markerColor,
        fillOpacity: markerOpacity, weight: 2, opacity: 1,
      }).addTo(map)

      const label = isCompleted ? `✓ ${r.location_name}` : isFuture ? `🔒 Clue ${idx + 1}` : `📍 ${r.location_name}`
      cm.bindPopup(`<div style="font-size:12px;color:#333;font-weight:600">${label}</div>`)

      // Active clue pulsing ring
      if (isActive) {
        const pulse = L.circleMarker([r.target_lat, r.target_lng], {
          radius: 18, fillColor: '#C9A84C', color: '#C9A84C',
          fillOpacity: 0.15, weight: 1, opacity: 0.4,
        }).addTo(map)
        newMarkers.push(pulse)
      }

      newMarkers.push(cm)
    })

    // User marker
    const userMarker = L.circleMarker([userLat, userLng], {
      radius: 8, fillColor: '#FFFFFF', color: '#C9A84C',
      fillOpacity: 1, weight: 3, opacity: 1,
    }).addTo(map)
    userMarker.bindPopup('<div style="font-size:12px;font-weight:700;color:#C9A84C">📍 You</div>')
    newMarkers.push(userMarker)

    // Synthetic player markers
    if (demoMode) {
      players.forEach(p => {
        // Trail dot (previous position)
        const trail = L.circleMarker([p.prevLat, p.prevLng], {
          radius: 3, fillColor: p.color, color: p.color,
          fillOpacity: 0.3, weight: 0, opacity: 0.3,
        }).addTo(map)
        newMarkers.push(trail)

        // Current position
        const pm = L.circleMarker([p.lat, p.lng], {
          radius: 7, fillColor: p.color, color: '#fff',
          fillOpacity: 0.9, weight: 2, opacity: 1,
        }).addTo(map)
        pm.bindPopup(`<div style="font-size:12px;font-weight:600">${p.avatar} ${p.name} — Clue ${Math.min(p.cluesCompleted + 1, 5)}</div>`)
        newMarkers.push(pm)
      })
    }

    markersRef.current = newMarkers

    return () => {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeClueIdx, completedClues.size, userLat, userLng, players, demoMode])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  }, [])

  return <div ref={containerRef} style={{ width: '100%', height: 220, borderRadius: 14, overflow: 'hidden' }} />
}), { ssr: false, loading: () => <div style={{ width: '100%', height: 220, background: 'rgba(28,22,56,0.9)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#C4A882', fontSize: 13 }}>Loading map...</div> })

// ─── Loading Spinner ───
function LoadingSpinner({ text }: { text?: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '40px', gap: 12 }}>
      <div style={{
        width: 40, height: 40,
        border: '3px solid rgba(201,168,76,0.2)',
        borderTop: '3px solid #C9A84C',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite'
      }} />
      {text && <p style={{ color: '#C4A882', fontSize: 14, margin: 0 }}>{text}</p>}
    </div>
  )
}

// ═══════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════
export default function HuntPage() {
  const lastMonument = getMonument()
  const { user, profile, setProfile } = useAuth()
  const { toast, showToast, hideToast } = useToast()
  const { t } = useLang()

  // ─── Selection state ───
  const [monumentSelected, setMonumentSelected] = useState(!!lastMonument)
  const [huntMonumentId, setHuntMonumentId] = useState(lastMonument?.id || 'taj-mahal')
  const [monuments, setMonuments] = useState<{id: string, name: string}[]>([])

  // ─── Geo state ───
  const [geoStatus, setGeoStatus] = useState<GeoStatus>('idle')
  const [demoMode, setDemoMode] = useState(true) // ON by default
  const [userDistance, setUserDistance] = useState<number | null>(null)

  // ─── Riddle state ───
  const [activeClueIdx, setActiveClueIdx] = useState(0)
  const [completedClues, setCompletedClues] = useState<Set<number>>(new Set())
  const [showHint, setShowHint] = useState(false)
  const [checkingGeo, setCheckingGeo] = useState(false)
  const [locationVerified, setLocationVerified] = useState(false)
  const [huntCompleted, setHuntCompleted] = useState(false)
  const [xpEarned, setXpEarned] = useState(0)
  const [huntStarted, setHuntStarted] = useState(false)

  // ─── Clue completion tracking (for XP tiers) ───
  const [clueCompletions, setClueCompletions] = useState<Record<number, string[]>>({})

  // ─── User GPS ───
  const [userLat, setUserLat] = useState(27.17480)
  const [userLng, setUserLng] = useState(78.04200)

  // ─── Synthetic players ───
  const [playerStates, setPlayerStates] = useState<PlayerState[]>(
    SYNTHETIC_PLAYERS.map(p => ({
      id: p.id, name: p.name, color: p.color, avatar: p.avatar,
      lat: p.positions[0].lat, lng: p.positions[0].lng,
      prevLat: p.positions[0].lat, prevLng: p.positions[0].lng,
      cluesCompleted: 0, xp: 0, posIndex: 0,
    }))
  )

  // ─── Leaderboard ───
  const [showLeaderboard, setShowLeaderboard] = useState(false)

  // ─── Celebration ───
  const [celebrateXp, setCelebrateXp] = useState<number | null>(null)
  const [celebrateMedal, setCelebrateMedal] = useState('')

  const monumentName = MONUMENT_NAMES[huntMonumentId] || huntMonumentId
  const activeRiddle = TAJ_MAHAL_RIDDLES[activeClueIdx]

  // ─── Load monument list ───
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

  // ─── Geo-fence entry check ───
  const checkMonumentGeo = useCallback((monumentId: string) => {
    const coords = MONUMENT_COORDS[monumentId]
    if (!coords) { setGeoStatus('inside'); return }
    setGeoStatus('checking')
    if (!navigator.geolocation) { setGeoStatus('error'); return }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const dist = getDistanceMeters(pos.coords.latitude, pos.coords.longitude, coords.lat, coords.lng)
        setUserDistance(Math.round(dist))
        setGeoStatus(dist <= coords.radius ? 'inside' : 'outside')
      },
      () => setGeoStatus('error'),
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }, [])

  // Trigger geo-check on monument selection
  useEffect(() => {
    if (monumentSelected && !demoMode) checkMonumentGeo(huntMonumentId)
    if (monumentSelected && demoMode) setGeoStatus('inside')
  }, [monumentSelected, huntMonumentId, demoMode, checkMonumentGeo])

  // Auto-start hunt when geo is inside or demo
  useEffect(() => {
    if (monumentSelected && (geoStatus === 'inside' || demoMode) && huntMonumentId === 'taj-mahal') {
      setHuntStarted(true)
    }
  }, [monumentSelected, geoStatus, demoMode, huntMonumentId])

  // ─── GPS tracking ───
  useEffect(() => {
    if (!huntStarted || demoMode) return
    const watchId = navigator.geolocation?.watchPosition(
      (pos) => { setUserLat(pos.coords.latitude); setUserLng(pos.coords.longitude) },
      () => {},
      { enableHighAccuracy: true, maximumAge: 5000 }
    )
    return () => { if (watchId !== undefined) navigator.geolocation?.clearWatch(watchId) }
  }, [huntStarted, demoMode])

  // ─── Synthetic player position cycling (every 4s) ───
  useEffect(() => {
    if (!huntStarted || !demoMode) return
    const interval = setInterval(() => {
      setPlayerStates(prev => prev.map(p => {
        const sp = SYNTHETIC_PLAYERS.find(s => s.id === p.id)!
        const nextIdx = (p.posIndex + 1) % sp.positions.length
        return {
          ...p,
          prevLat: p.lat, prevLng: p.lng,
          lat: sp.positions[nextIdx].lat,
          lng: sp.positions[nextIdx].lng,
          posIndex: nextIdx,
        }
      }))
    }, 4000)
    return () => clearInterval(interval)
  }, [huntStarted, demoMode])

  // ─── Synthetic player clue completion (auto-advance) ───
  useEffect(() => {
    if (!huntStarted || !demoMode) return
    const timers = SYNTHETIC_PLAYERS.map((sp) => {
      return setInterval(() => {
        setPlayerStates(prev => prev.map(p => {
          if (p.id !== sp.id || p.cluesCompleted >= 5) return p
          const newCompleted = p.cluesCompleted + 1
          const clueId = TAJ_MAHAL_RIDDLES[p.cluesCompleted]?.id
          if (clueId) {
            setClueCompletions(cc => {
              const arr = cc[clueId] || []
              if (!arr.includes(p.id)) return { ...cc, [clueId]: [...arr, p.id] }
              return cc
            })
          }
          // Determine XP for position
          const completersCount = (clueCompletions[clueId] || []).length
          let xpGain = 10
          if (completersCount === 0) xpGain = 50
          else if (completersCount === 1) xpGain = 30
          else if (completersCount === 2) xpGain = 20
          return { ...p, cluesCompleted: newCompleted, xp: p.xp + xpGain }
        }))
      }, sp.clueInterval)
    })
    return () => timers.forEach(clearInterval)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [huntStarted, demoMode])

  // ─── Verify current clue location ───
  const verifyClueLocation = () => {
    if (!activeRiddle) return

    if (demoMode) {
      onClueVerified()
      return
    }

    setCheckingGeo(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const dist = getDistanceMeters(pos.coords.latitude, pos.coords.longitude, activeRiddle.target_lat, activeRiddle.target_lng)
        if (dist <= activeRiddle.radius_meters) {
          onClueVerified()
        } else {
          showToast(`📍 Walk ~${Math.round(dist)}m closer`)
        }
        setCheckingGeo(false)
      },
      () => { onClueVerified(); setCheckingGeo(false) },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  // ─── On Clue Verified ───
  const onClueVerified = async () => {
    setLocationVerified(true)
    const clueId = activeRiddle.id
    const userName = user?.id || 'demo_user'

    // Determine placement
    const currentCompleters = clueCompletions[clueId] || []
    const position = currentCompleters.length // 0-indexed
    let xpAmount = 10
    let medal = ''
    if (position === 0) { xpAmount = 50; medal = '🥇 First to find it!' }
    else if (position === 1) { xpAmount = 30; medal = '🥈 Second place!' }
    else if (position === 2) { xpAmount = 20; medal = '🥉 Third place!' }
    else { xpAmount = 10; medal = '👏 Participation' }

    // Record completion
    setClueCompletions(prev => ({
      ...prev,
      [clueId]: [...(prev[clueId] || []), userName]
    }))

    // Award XP
    setXpEarned(prev => prev + xpAmount)
    showToast(`${medal} +${xpAmount} XP`)

    // Persist XP
    try {
      if (user?.id) {
        const newXP = await addXP(user.id, xpAmount, 'HUNT_STEP_DONE')
        setProfile((prev: Record<string, unknown> | null) => prev ? { ...prev, total_xp: newXP } : prev)
        window.dispatchEvent(new Event('xp-updated'))
        await computeAndSaveBadges(user.id, { ...profile, total_xp: newXP })
      }
    } catch { /* silent */ }

    // Update completed clues
    const newCompleted = new Set(completedClues)
    newCompleted.add(clueId)
    setCompletedClues(newCompleted)

    setCelebrateXp(xpAmount)
    setCelebrateMedal(medal)

    // Auto-advance after 2s
    setTimeout(() => {
      setCelebrateXp(null)
      setCelebrateMedal('')
      setLocationVerified(false)
      setShowHint(false)

      if (activeClueIdx < TAJ_MAHAL_RIDDLES.length - 1) {
        setActiveClueIdx(prev => prev + 1)
      } else {
        // Hunt completed!
        setHuntCompleted(true)
        try {
          if (user?.id) {
            addXP(user.id, 500, 'HUNT_COMPLETED').then(async (newXP) => {
              setProfile((prev: Record<string, unknown> | null) => prev ? { ...prev, total_xp: newXP } : prev)
              window.dispatchEvent(new Event('xp-updated'))
              await computeAndSaveBadges(user.id, { ...profile, total_xp: newXP })
            }).catch(() => {})
          }
        } catch { /* silent */ }
        showToast('+500 XP — Hunt Completed! 🏆')
      }
    }, 2000)
  }

  const activateDemo = () => { setDemoMode(true); setGeoStatus('inside') }

  // ─── Build leaderboard ───
  const leaderboard = [
    ...playerStates.map(p => ({
      name: p.name, avatar: p.avatar, clues: p.cluesCompleted,
      xp: p.xp, isUser: false, color: p.color,
    })),
    {
      name: profile?.full_name?.split(' ')[0] || 'You',
      avatar: '🧑', clues: completedClues.size, xp: xpEarned,
      isUser: true, color: '#C9A84C',
    }
  ].sort((a, b) => b.xp - a.xp || b.clues - a.clues)

  // ═══════════════
  // RENDER: Monument Selection
  // ═══════════════
  if (!monumentSelected) {
    const monumentList = monuments.length > 0
      ? monuments
      : Object.entries(MONUMENT_NAMES).map(([id, name]) => ({ id, name }))
    return (
      <AppShell>
        <div style={{ padding: 24 }}>
          <h1 style={{ fontFamily: 'Georgia,serif', fontSize: 32, color: '#C9A84C', fontWeight: 700 }}>{t('treasure_hunt')}</h1>
          <div style={{
            marginTop: 48, textAlign: 'center', background: 'rgba(28,22,56,0.9)',
            border: '1px solid rgba(201,168,76,0.3)', borderRadius: 20, padding: 56,
            maxWidth: 520, margin: '48px auto'
          }}>
            <div style={{ fontSize: 72, marginBottom: 16 }}>🗺️</div>
            <h2 style={{ color: '#C9A84C', fontFamily: 'Georgia,serif', fontSize: 26, margin: '0 0 12px' }}>{t('select_monument_hunt')}</h2>
            <p style={{ color: '#C4A882', fontSize: 16, marginBottom: 28, lineHeight: 1.6 }}>{t('choose_monument_hunt')}</p>
            <div style={{ position: 'relative', display: 'inline-block' }}>
              <select onChange={e => {
                const id = e.target.value
                const name = monumentList.find(m => m.id === id)?.name || id
                setHuntMonumentId(id); setMonumentSelected(true); saveMonument(id, name)
              }} defaultValue="" style={{
                padding: '12px 40px 12px 16px', background: 'rgba(28,22,56,0.9)',
                border: '1px solid #C9A84C', color: '#C9A84C', borderRadius: 10,
                fontSize: 16, cursor: 'pointer', minWidth: 260, marginBottom: 16, appearance: 'none' as const
              }}>
                <option value="" disabled>{t('choose_monument')}</option>
                {monumentList.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
              <ChevronDown style={{ position: 'absolute', right: 12, top: 14, width: 16, height: 16, color: '#C9A84C', pointerEvents: 'none' }} />
            </div>
            <div style={{ color: '#7A6E5C', fontSize: 13, marginTop: 8 }}>Note: Treasure hunt currently available for Taj Mahal</div>
          </div>
        </div>
      </AppShell>
    )
  }

  // ═══════════════
  // RENDER: Geo-checking
  // ═══════════════
  if (geoStatus === 'checking') {
    return <AppShell><div className="p-4 lg:p-8"><h1 className="font-serif text-3xl lg:text-4xl font-bold text-[#C9A84C] mb-2">{t('treasure_hunt')}</h1><LoadingSpinner text="📍 Checking your location..." /></div></AppShell>
  }

  // ═══════════════
  // RENDER: Outside geo-fence
  // ═══════════════
  if (geoStatus === 'outside' && !demoMode) {
    return (
      <AppShell>
        <div className="p-4 lg:p-8">
          <h1 className="font-serif text-3xl lg:text-4xl font-bold text-[#C9A84C] mb-2">{t('treasure_hunt')}</h1>
          <div style={{ background: 'rgba(28,22,56,0.9)', border: '1px solid rgba(201,168,76,0.3)', borderRadius: 20, padding: 40, maxWidth: 520, margin: '2rem auto', textAlign: 'center' }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>🔒</div>
            <h2 style={{ color: '#C9A84C', fontFamily: 'Georgia,serif', fontSize: 22, margin: '0 0 12px' }}>Location Required</h2>
            <p style={{ color: '#C4A882', fontSize: 15, lineHeight: 1.6, marginBottom: 16 }}>
              You must be physically present at <strong style={{ color: '#E8C97A' }}>{monumentName}</strong> to join this hunt.
            </p>
            {userDistance !== null && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 16px', background: 'rgba(212,137,63,0.12)', border: '1px solid rgba(212,137,63,0.3)', borderRadius: 10, color: '#D4893F', fontSize: 14, fontWeight: 600, marginBottom: 20 }}>
                📍 You are ~{userDistance >= 1000 ? `${(userDistance / 1000).toFixed(1)}km` : `${userDistance}m`} away
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
              <button onClick={() => checkMonumentGeo(huntMonumentId)} style={{ padding: '12px 24px', borderRadius: 12, background: 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.4)', color: '#C9A84C', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>🔄 Re-check Location</button>
              <button onClick={activateDemo} style={{ padding: '12px 24px', borderRadius: 12, background: 'linear-gradient(135deg, rgba(201,168,76,0.25), rgba(212,137,63,0.2))', border: '1px solid rgba(201,168,76,0.5)', color: '#E8C97A', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>🎮 Demo Mode</button>
            </div>
          </div>
        </div>
      </AppShell>
    )
  }

  // GPS error
  if (geoStatus === 'error' && !demoMode) {
    return (
      <AppShell>
        <div className="p-4 lg:p-8">
          <h1 className="font-serif text-3xl lg:text-4xl font-bold text-[#C9A84C] mb-2">{t('treasure_hunt')}</h1>
          <div style={{ background: 'rgba(28,22,56,0.9)', border: '1px solid rgba(196,91,58,0.4)', borderRadius: 20, padding: 40, maxWidth: 520, margin: '2rem auto', textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📍</div>
            <h2 style={{ color: '#E8A85C', fontFamily: 'Georgia,serif', fontSize: 20, margin: '0 0 12px' }}>Location Access Required</h2>
            <p style={{ color: '#C4A882', fontSize: 14, lineHeight: 1.6, marginBottom: 20 }}>Please enable GPS / location services.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button onClick={() => checkMonumentGeo(huntMonumentId)} style={{ padding: '12px 24px', borderRadius: 12, background: 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.4)', color: '#C9A84C', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>🔄 Try Again</button>
              <button onClick={activateDemo} style={{ padding: '12px 24px', borderRadius: 12, background: 'linear-gradient(135deg, rgba(201,168,76,0.25), rgba(212,137,63,0.2))', border: '1px solid rgba(201,168,76,0.5)', color: '#E8C97A', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>🎮 Demo Mode</button>
            </div>
          </div>
        </div>
      </AppShell>
    )
  }

  // ═══════════════
  // RENDER: Hunt Completed
  // ═══════════════
  if (huntCompleted) {
    return (
      <AppShell>
        <div className="p-4 lg:p-8 animate-fade-in">
          {demoMode && (
            <div style={{ background: 'linear-gradient(135deg, rgba(201,168,76,0.2), rgba(212,137,63,0.15))', border: '1px solid rgba(201,168,76,0.5)', borderRadius: 10, padding: '8px 16px', marginBottom: 16, textAlign: 'center', color: '#E8C97A', fontSize: 13, fontWeight: 700 }}>
              🎮 DEMO MODE — Geo-fence bypassed | Synthetic players active
            </div>
          )}
          <div className="glass-card rounded-xl p-8 text-center animate-fade-in">
            <div className="text-6xl mb-4">🏆</div>
            <h2 className="font-serif text-2xl font-bold text-[#C9A84C] mb-2">{t('heritage_hunter')}</h2>
            <p className="text-[#C4A882] mb-4">You completed the Taj Mahal Treasure Hunt!</p>
            <div className="inline-block px-4 py-2 bg-[#534AB7]/20 rounded-full mb-6 animate-xp-pulse">
              <span className="text-[#534AB7] font-bold">⚡ +500 XP Bonus + {xpEarned} XP Total</span>
            </div>
            <div className="glass-card rounded-lg p-4 inline-block mb-6">
              <Trophy className="w-12 h-12 text-[#C9A84C] mx-auto mb-2" />
              <p className="text-[#C9A84C] font-semibold">Heritage Hunter Badge Unlocked</p>
            </div>
            {/* Final leaderboard */}
            <div style={{ background: 'rgba(28,22,56,0.9)', border: '1px solid rgba(201,168,76,0.3)', borderRadius: 14, padding: 16, marginTop: 16, maxWidth: 400, margin: '16px auto', textAlign: 'left' }}>
              <h3 style={{ color: '#C9A84C', fontFamily: 'Georgia,serif', fontSize: 16, marginBottom: 12, textAlign: 'center' }}>🏆 Final Standings</h3>
              {leaderboard.map((p, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px',
                  borderRadius: 10, marginBottom: 4,
                  background: p.isUser ? 'rgba(201,168,76,0.12)' : 'transparent',
                  border: p.isUser ? '1px solid rgba(201,168,76,0.4)' : '1px solid transparent',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 14, width: 24 }}>{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i+1}.`}</span>
                    <span style={{ color: p.isUser ? '#C9A84C' : '#F5E6D3', fontSize: 14, fontWeight: p.isUser ? 700 : 500 }}>{p.avatar} {p.name}</span>
                  </div>
                  <div style={{ color: '#9B92F0', fontSize: 13, fontWeight: 700 }}>⚡ {p.xp} XP</div>
                </div>
              ))}
            </div>
            <div className="flex flex-col sm:flex-row gap-3 justify-center mt-6">
              <button className="px-6 py-3 border border-[#C9A84C]/50 text-[#C9A84C] font-semibold rounded-xl transition-all duration-300 hover:bg-[#C9A84C]/10">{t('share_achievement')}</button>
              <button className="px-6 py-3 gold-gradient text-[#0F0B1E] font-semibold rounded-xl transition-all duration-300 hover:scale-105">{t('explore_more')}</button>
            </div>
          </div>
        </div>
        {toast && <Toast message={toast} onDone={hideToast} />}
      </AppShell>
    )
  }

  // ═══════════════
  // RENDER: Active Hunt
  // ═══════════════
  return (
    <AppShell>
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes pulse-green{0%,100%{box-shadow:0 0 0 0 rgba(75,155,142,0.5)}70%{box-shadow:0 0 0 10px rgba(75,155,142,0)}}
        @keyframes pulse-gold{0%,100%{box-shadow:0 0 0 0 rgba(201,168,76,0.4)}70%{box-shadow:0 0 0 8px rgba(201,168,76,0)}}
        @keyframes slideIn{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}
      `}</style>
      <div className="p-4 lg:p-8 animate-fade-in">

        {/* ═══ Side-by-side wrapper ═══ */}
        <div className="flex flex-col md:flex-row gap-4 w-full" style={{ alignItems: 'flex-start' }}>

          {/* ── LEFT PANEL (60%) — Riddle + Controls ── */}
          <div className="flex flex-col gap-4 w-full md:w-[60%] order-2 md:order-1">

            {/* Demo Mode ribbon */}
            {demoMode && (
              <div style={{
                background: 'linear-gradient(135deg, rgba(201,168,76,0.2), rgba(212,137,63,0.15))',
                border: '1px solid rgba(201,168,76,0.5)', borderRadius: 10,
                padding: '8px 16px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                color: '#E8C97A', fontSize: 13, fontWeight: 700
              }}>
                <span>🎮 DEMO MODE — Geo-fence bypassed | Synthetic players active</span>
                <button onClick={() => setDemoMode(false)} style={{
                  background: 'rgba(201,168,76,0.2)', border: '1px solid rgba(201,168,76,0.4)',
                  borderRadius: 6, padding: '3px 8px', color: '#C9A84C', fontSize: 11,
                  fontWeight: 600, cursor: 'pointer'
                }}>Turn Off</button>
              </div>
            )}

            {/* Progress bar */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h1 style={{ fontFamily: 'Georgia,serif', fontSize: 24, color: '#C9A84C', fontWeight: 700, margin: 0 }}>
                {t('treasure_hunt')}
              </h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ color: '#F5E6D3', fontSize: 14, fontWeight: 600 }}>Clue {activeClueIdx + 1} of {TAJ_MAHAL_RIDDLES.length}</span>
                <span style={{ padding: '4px 10px', background: 'rgba(201,168,76,0.15)', borderRadius: 20, color: '#C9A84C', fontSize: 13, fontWeight: 700 }}>⚡ {xpEarned} XP</span>
              </div>
            </div>

            {/* Progress dots */}
            <div style={{ display: 'flex', gap: 6 }}>
              {TAJ_MAHAL_RIDDLES.map((r, idx) => (
                <div key={r.id} style={{
                  flex: 1, height: 4, borderRadius: 2,
                  background: completedClues.has(r.id) ? '#4B9B8E' : idx === activeClueIdx ? '#C9A84C' : 'rgba(201,168,76,0.15)',
                  transition: 'all 0.3s ease'
                }} />
              ))}
            </div>

            {/* Scoreboard toggle */}
            <div>
              <button onClick={() => setShowLeaderboard(!showLeaderboard)} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '6px 14px', borderRadius: 10,
                background: 'rgba(28,22,56,0.9)',
                border: '1px solid rgba(201,168,76,0.25)',
                color: '#C9A84C', fontSize: 13, fontWeight: 600, cursor: 'pointer'
              }}>
                🏆 Scoreboard {showLeaderboard ? '▲' : '▼'}
              </button>

              {showLeaderboard && (
                <div style={{
                  marginTop: 8, background: 'rgba(28,22,56,0.9)',
                  border: '1px solid rgba(201,168,76,0.2)', borderRadius: 14,
                  padding: 12, animation: 'slideIn 0.2s ease'
                }}>
                  {leaderboard.map((p, i) => (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '7px 10px', borderRadius: 8, marginBottom: 3,
                      background: p.isUser ? 'rgba(201,168,76,0.1)' : 'transparent',
                      border: p.isUser ? '1px solid rgba(201,168,76,0.35)' : '1px solid transparent',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 13, width: 22, textAlign: 'center' as const }}>{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i+1}.`}</span>
                        <span style={{ color: p.isUser ? '#C9A84C' : '#F5E6D3', fontSize: 13, fontWeight: p.isUser ? 700 : 500 }}>{p.avatar} {p.name}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 12 }}>
                        <span style={{ color: '#7A6E5C' }}>{p.clues} clue{p.clues !== 1 ? 's' : ''} ✓</span>
                        <span style={{ color: '#C9A84C', fontWeight: 700 }}>⚡ {p.xp} XP</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Active Riddle Card */}
            {activeRiddle && !locationVerified && (
              <div style={{
                background: 'rgba(28,22,56,0.9)', backdropFilter: 'blur(12px)',
                border: '2px solid rgba(212,137,63,0.4)',
                borderRadius: 20, padding: 24,
                backgroundImage: 'linear-gradient(135deg, rgba(212,137,63,0.08) 0%, transparent 60%)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <span style={{
                    display: 'inline-block', padding: '4px 12px',
                    background: 'rgba(201,168,76,0.2)', color: '#C9A84C',
                    fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const,
                    borderRadius: 20, letterSpacing: 1
                  }}>Clue {activeClueIdx + 1}</span>
                  <span style={{ color: '#7A6E5C', fontSize: 12 }}>📍 {activeRiddle.location_name}</span>
                </div>

                {/* Riddle text */}
                <p style={{
                  color: '#F5E6D3', fontSize: 18, lineHeight: 1.7,
                  fontFamily: 'Georgia, serif', marginBottom: 20,
                  fontStyle: 'italic'
                }}>
                  &ldquo;{activeRiddle.riddle}&rdquo;
                </p>

                {/* Hint toggle */}
                <button onClick={() => setShowHint(!showHint)} style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '6px 14px', borderRadius: 8, marginBottom: 16,
                  background: 'rgba(201,168,76,0.08)',
                  border: '1px solid rgba(201,168,76,0.2)',
                  color: '#C9A84C', fontSize: 13, fontWeight: 600, cursor: 'pointer'
                }}>
                  {showHint ? <EyeOff size={14} /> : <Eye size={14} />}
                  {showHint ? 'Hide Hint' : 'Show Hint'}
                </button>
                {showHint && (
                  <div style={{
                    padding: '10px 14px', marginBottom: 16,
                    background: 'rgba(201,168,76,0.06)',
                    border: '1px solid rgba(201,168,76,0.15)',
                    borderRadius: 10, color: '#E8C97A', fontSize: 14,
                    fontStyle: 'italic'
                  }}>
                    💡 {activeRiddle.hint}
                  </div>
                )}

                {/* I Am Here button */}
                <button
                  onClick={verifyClueLocation}
                  disabled={checkingGeo}
                  style={{
                    width: '100%', padding: '14px',
                    background: checkingGeo ? 'rgba(83,74,183,0.3)' : 'linear-gradient(135deg, #534AB7, #7C3AED)',
                    color: '#fff', border: 'none', borderRadius: 14,
                    fontSize: 16, fontWeight: 700, cursor: checkingGeo ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    transition: 'all 0.3s ease',
                  }}
                >
                  {checkingGeo ? (
                    <>📍 Verifying location...</>
                  ) : (
                    <><MapPin size={18} /> I Am Here</>
                  )}
                </button>
              </div>
            )}

            {/* Location verified transition */}
            {locationVerified && celebrateXp === null && (
              <div style={{
                textAlign: 'center', padding: 40,
                background: 'rgba(75,155,142,0.1)',
                border: '1px solid rgba(75,155,142,0.3)',
                borderRadius: 16, color: '#4B9B8E', fontSize: 16, fontWeight: 600
              }}>
                ✓ Location verified — Loading next clue...
              </div>
            )}
          </div>

          {/* ── RIGHT PANEL (40%) — Sticky Map ── */}
          <div className="w-full md:w-[40%] order-1 md:order-2"
            style={{ position: 'sticky', top: '80px', minHeight: '500px', display: 'flex', flexDirection: 'column' }}>

            {/* Map container */}
            <div style={{ flex: 1, minHeight: '460px', borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(201,168,76,0.2)' }}>
              <div className="h-[220px] md:h-full" style={{ width: '100%' }}>
                <HuntMap
                  riddles={TAJ_MAHAL_RIDDLES}
                  activeClueIdx={activeClueIdx}
                  completedClues={completedClues}
                  userLat={userLat}
                  userLng={userLng}
                  players={playerStates}
                  demoMode={demoMode}
                />
              </div>
            </div>

            {/* Player legend chips (below map) */}
            <div className="flex flex-row flex-wrap gap-2 mt-2">
              <span style={{ fontSize: 11, color: '#C9A84C', padding: '3px 8px', background: 'rgba(201,168,76,0.1)', borderRadius: 8 }}>🟡 Active</span>
              <span style={{ fontSize: 11, color: '#fff', padding: '3px 8px', background: 'rgba(255,255,255,0.06)', borderRadius: 8 }}>⚪ You</span>
              {demoMode && <>
                <span style={{ fontSize: 11, color: '#FF6B9D', padding: '3px 8px', background: 'rgba(255,107,157,0.1)', borderRadius: 8 }}>🔴 Priya</span>
                <span style={{ fontSize: 11, color: '#4ECDC4', padding: '3px 8px', background: 'rgba(78,205,196,0.1)', borderRadius: 8 }}>🟢 Arjun</span>
                <span style={{ fontSize: 11, color: '#FFE66D', padding: '3px 8px', background: 'rgba(255,230,109,0.1)', borderRadius: 8 }}>🟡 Diya</span>
              </>}
            </div>

            {/* Player status chips */}
            {demoMode && (
              <div className="flex flex-row flex-wrap gap-2 mt-2">
                {[
                  { avatar: '🧑', name: profile?.full_name?.split(' ')[0] || 'You', clue: activeClueIdx + 1, color: '#C9A84C', isUser: true },
                  ...playerStates.map(p => ({ avatar: p.avatar, name: p.name, clue: Math.min(p.cluesCompleted + 1, 5), color: p.color, isUser: false }))
                ].map((p, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '5px 10px', borderRadius: 20, whiteSpace: 'nowrap' as const, flexShrink: 0,
                    background: p.isUser ? 'rgba(201,168,76,0.15)' : 'rgba(28,22,56,0.9)',
                    border: `1px solid ${p.isUser ? 'rgba(201,168,76,0.4)' : 'rgba(255,255,255,0.08)'}`,
                    fontSize: 12, color: p.isUser ? '#C9A84C' : '#C4A882', fontWeight: 600
                  }}>
                    <span>{p.avatar}</span>
                    <span>{p.name}</span>
                    <span style={{ color: '#7A6E5C', fontSize: 10 }}>— Clue {p.clue}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>{/* end side-by-side wrapper */}

        {/* Celebration overlay (fixed, outside layout) */}
        {celebrateXp !== null && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-[#0F0B1E]/90 backdrop-blur-sm" />
            <div className="relative glass-card rounded-2xl p-8 max-w-sm w-full text-center animate-slide-up">
              <div className="text-6xl mb-4">📍</div>
              <h2 className="text-2xl font-bold text-[#4B9B8E] mb-2">Location Found!</h2>
              <p style={{ color: '#C4A882', marginBottom: 8, fontSize: 15 }}>{activeRiddle?.location_name}</p>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#534AB7]/20 rounded-full mb-4 animate-xp-pulse">
                <span className="text-[#534AB7] font-bold">{celebrateMedal} +{celebrateXp} XP</span>
              </div>
              <p style={{ color: '#7A6E5C', fontSize: 13 }}>Next clue loading...</p>
            </div>
          </div>
        )}

      </div>
      {toast && <Toast message={toast} onDone={hideToast} />}
    </AppShell>
  )
}
