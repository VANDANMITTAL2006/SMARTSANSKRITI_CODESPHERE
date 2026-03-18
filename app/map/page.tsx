"use client"
import { useEffect, useState } from "react"
import { AppShell } from "@/components/app-shell"
import { MapView } from "@/components/map/map-view"
import { ZoneSelector } from "@/components/map/zone-selector"
import { XpPopup } from "@/components/map/xp-popup"
import api from "@/lib/apiClient"
import { Toast, useToast } from "@/components/Toast"
import { useAuth } from "@/lib/authContext"
import { addXP } from "@/lib/authClient"
import { useLang } from "@/lib/languageContext"

interface Monument { id: string; name: string; lat: number; lng: number; description_en?: string; city: string; state: string }
interface XpPopupData { zoneName: string; xp: number }

function LoadingSpinner() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '40px' }}>
      <div style={{ width: 40, height: 40, border: '3px solid rgba(201,168,76,0.2)', borderTop: '3px solid #C9A84C', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

export default function MapPage() {
  const { t } = useLang()
  const [monuments, setMonuments] = useState<Monument[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [xpPopup, setXpPopup] = useState<XpPopupData | null>(null)
  const [selectedMonument, setSelectedMonument] = useState<Monument | null>(null)
  const { toast, showToast, hideToast } = useToast()
  const { user } = useAuth()

  const fetchMonuments = () => {
    setLoading(true); setError(null)
    api.getNearby().then(res => {
      setMonuments(res.data.monuments)
      if (res.data.monuments.length > 0) setSelectedMonument(res.data.monuments[0])
      setLoading(false)
    }).catch(() => { setError(t('could_not_load')); setLoading(false) })
  }

  useEffect(() => { fetchMonuments() }, [])

  const handleSimulateArrival = async (monument: Monument) => {
    try {
      const res = await api.checkin(monument.lat, monument.lng)
      if (res.data.triggered_zones && res.data.triggered_zones.length > 0) {
        const triggered = res.data.triggered_zones[0]
        setXpPopup({ zoneName: triggered.zone_name, xp: triggered.xp_awarded })
        await api.awardXP('demo_user', triggered.xp_awarded, 'ZONE_CHECKIN')
        showToast(`+${triggered.xp_awarded} XP!`)
        if (user) addXP(user.id, triggered.xp_awarded).catch(() => null)
      } else {
        setXpPopup({ zoneName: monument.name, xp: 50 })
        await api.awardXP('demo_user', 50, 'ZONE_CHECKIN')
        showToast('+50 XP!')
        if (user) addXP(user.id, 50).catch(() => null)
      }
    } catch (err) { console.error('Checkin failed:', err) }
  }

  return (
    <AppShell>
      <div className="relative h-[calc(100vh-96px)] lg:h-screen">
        {loading ? (
          <div className="absolute inset-0 bg-[#0F0B1E] flex items-center justify-center"><LoadingSpinner /></div>
        ) : error ? (
          <div className="absolute inset-0 bg-[#0F0B1E] flex items-center justify-center p-8">
            <div style={{ background: 'rgba(196,91,58,0.1)', border: '1px solid rgba(196,91,58,0.5)', borderRadius: 12, padding: 16, color: '#E8A85C', textAlign: 'center' }}>
              ⚠️ {error}<br />
              <button onClick={fetchMonuments} style={{ marginTop: 8, padding: '6px 16px', background: 'rgba(201,168,76,0.2)', border: '1px solid #C9A84C', borderRadius: 8, color: '#C9A84C', cursor: 'pointer' }}>{t('try_again')}</button>
            </div>
          </div>
        ) : (<><MapView monuments={monuments} /><ZoneSelector monuments={monuments} selectedMonument={selectedMonument} onMonumentChange={setSelectedMonument} onSimulate={() => selectedMonument && handleSimulateArrival(selectedMonument)} /></>)}
        {xpPopup && <XpPopup zoneName={xpPopup.zoneName} xp={xpPopup.xp} onClose={() => setXpPopup(null)} />}
      </div>
      {toast && <Toast message={toast} onDone={hideToast} />}
    </AppShell>
  )
}
