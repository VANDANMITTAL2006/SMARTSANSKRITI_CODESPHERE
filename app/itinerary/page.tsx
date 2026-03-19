'use client'
import { useState, useRef } from 'react'
import { AppShell } from '@/components/app-shell'
import { useLang } from '@/lib/languageContext'
import { useAuth } from '@/lib/authContext'
import { supabase } from '@/lib/supabase'

const INDIA_CITIES = [
  { city: 'Agra', state: 'Uttar Pradesh', emoji: '🕌', highlights: 'Taj Mahal, Agra Fort, Fatehpur Sikri', monuments: ['taj-mahal', 'agra-fort', 'fatehpur-sikri'] },
  { city: 'Delhi', state: 'Delhi', emoji: '🏙️', highlights: 'Red Fort, Qutub Minar, India Gate, Humayun Tomb', monuments: ['red-fort', 'qutub-minar', 'india-gate'] },
  { city: 'Jaipur', state: 'Rajasthan', emoji: '🌸', highlights: 'Hawa Mahal, Amer Fort, City Palace, Jantar Mantar', monuments: ['hawa-mahal', 'amer-fort'] },
  { city: 'Mumbai', state: 'Maharashtra', emoji: '🌊', highlights: 'Gateway of India, Elephanta Caves, Chhatrapati Shivaji Terminus', monuments: ['gateway-india'] },
  { city: 'Hyderabad', state: 'Telangana', emoji: '💎', highlights: 'Charminar, Golconda Fort, Qutb Shahi Tombs', monuments: ['charminar'] },
  { city: 'Mysuru', state: 'Karnataka', emoji: '👑', highlights: 'Mysore Palace, Chamundi Hills, Brindavan Gardens', monuments: ['mysore-palace'] },
  { city: 'Hampi', state: 'Karnataka', emoji: '🏛️', highlights: 'Virupaksha Temple, Vittala Temple, Stone Chariot', monuments: ['hampi'] },
  { city: 'Varanasi', state: 'Uttar Pradesh', emoji: '🙏', highlights: 'Kashi Vishwanath, Sarnath, Ghats of Ganga', monuments: [] },
  { city: 'Amritsar', state: 'Punjab', emoji: '✨', highlights: 'Golden Temple, Jallianwala Bagh, Wagah Border', monuments: ['golden-temple'] },
  { city: 'Kolkata', state: 'West Bengal', emoji: '🎭', highlights: 'Victoria Memorial, Howrah Bridge, Dakshineswar Temple', monuments: ['victoria-memorial'] },
  { city: 'Chennai', state: 'Tamil Nadu', emoji: '🌴', highlights: 'Kapaleeshwarar Temple, Marina Beach, Mahabalipuram', monuments: [] },
  { city: 'Madurai', state: 'Tamil Nadu', emoji: '🛕', highlights: 'Meenakshi Amman Temple, Thirumalai Nayak Palace', monuments: ['meenakshi'] },
  { city: 'Puri', state: 'Odisha', emoji: '🌊', highlights: 'Jagannath Temple, Konark Sun Temple, Chilika Lake', monuments: ['konark'] },
  { city: 'Aurangabad', state: 'Maharashtra', emoji: '🪨', highlights: 'Ajanta Caves, Ellora Caves, Bibi Ka Maqbara', monuments: ['ajanta'] },
  { city: 'Kedarnath', state: 'Uttarakhand', emoji: '⛰️', highlights: 'Kedarnath Temple, Valley of Flowers, Badrinath', monuments: ['kedarnath'] },
  { city: 'Goa', state: 'Goa', emoji: '🏖️', highlights: 'Basilica of Bom Jesus, Fort Aguada, Dudhsagar Falls', monuments: [] },
  { city: 'Khajuraho', state: 'Madhya Pradesh', emoji: '🗿', highlights: 'Khajuraho Temples, Raneh Falls, Panna National Park', monuments: [] },
  { city: 'Fatehpur Sikri', state: 'Uttar Pradesh', emoji: '🏯', highlights: 'Buland Darwaza, Panch Mahal, Jama Masjid', monuments: [] },
]

// ─── Hotel data per city ───
const HOTELS: Record<string, { name: string; address: string; phone: string; stars: number; price: number }[]> = {
  agra: [
    { name: "Hotel Taj Resorts", address: "Fatehabad Rd, Tajganj, Agra - 282001", phone: "+91-562-2330170", stars: 4, price: 3200 },
    { name: "Mansingh Palace Agra", address: "Fatehabad Road, Agra - 282001", phone: "+91-562-2331771", stars: 4, price: 2800 },
  ],
  delhi: [
    { name: "The Imperial New Delhi", address: "Janpath Lane, Connaught Place, Delhi - 110001", phone: "+91-11-23341234", stars: 5, price: 8500 },
    { name: "Hotel Broadway Delhi", address: "4/15A Asaf Ali Road, New Delhi - 110002", phone: "+91-11-23273821", stars: 3, price: 1800 },
  ],
  jaipur: [
    { name: "Samode Haveli", address: "Gangapole, Jaipur - 302002", phone: "+91-141-2632407", stars: 5, price: 6500 },
    { name: "Hotel Pearl Palace", address: "Hari Kishan Somani Marg, Jaipur - 302001", phone: "+91-141-2373700", stars: 3, price: 1400 },
  ],
  mumbai: [
    { name: "Residency Hotel Fort", address: "26 Rustom Sidhwa Marg, Fort, Mumbai - 400001", phone: "+91-22-22625525", stars: 3, price: 2200 },
    { name: "Hotel Suba Palace", address: "Apollo Bunder, Colaba, Mumbai - 400001", phone: "+91-22-22026636", stars: 4, price: 4500 },
  ],
  hampi: [
    { name: "Hampi's Boulders Resort", address: "Norekal Village, Hospet, Karnataka - 583239", phone: "+91-8394-241103", stars: 4, price: 5500 },
    { name: "Kishkinda Heritage Resort", address: "Kamalapura, Hampi - 583239", phone: "+91-8394-241121", stars: 3, price: 2500 },
  ],
  varanasi: [
    { name: "Hotel Ganges View", address: "Assi Ghat, Varanasi - 221005", phone: "+91-542-2313218", stars: 3, price: 2000 },
    { name: "BrijRama Palace", address: "Darbhanga Ghat, Varanasi - 221001", phone: "+91-542-2390320", stars: 5, price: 9000 },
  ],
  default: [
    { name: "Heritage Grand Hotel", address: "Near Monument Gate, Heritage Zone - 000001", phone: "+91-9800000001", stars: 3, price: 2000 },
    { name: "The Monument Inn", address: "Heritage Road, Cultural District - 000002", phone: "+91-9800000002", stars: 3, price: 1800 },
  ],
}

// Map city names to hotel keys
const CITY_TO_HOTEL_KEY: Record<string, string> = {
  'Agra': 'agra', 'Delhi': 'delhi', 'Jaipur': 'jaipur',
  'Mumbai': 'mumbai', 'Hampi': 'hampi', 'Varanasi': 'varanasi',
}

interface Activity { time: string; activity: string; tip: string }
interface Day { day: number; title: string; activities: Activity[] }
interface Itinerary { city?: string; monument?: string; days: Day[] }
interface Hotel { name: string; address: string; phone: string; stars: number; price: number }

const ACCENT_COLORS = ['#C9A84C', '#D4893F', '#4B9B8E', '#534AB7', '#C45B3A']

export default function ItineraryPage() {
  const { t } = useLang()
  const { user, profile } = useAuth()
  const [selectedCity, setSelectedCity] = useState('')
  const [days, setDays] = useState(3)
  const [itinerary, setItinerary] = useState<Itinerary | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedHotel, setSelectedHotel] = useState<Hotel | null>(null)
  const leadSentRef = useRef(false)

  const filteredCities = INDIA_CITIES.filter(c =>
    c.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.state.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.highlights.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const selectedCityData = INDIA_CITIES.find(c => c.city === selectedCity)

  const generateLocalItinerary = (
    city: string, highlights: string, numDays: number
  ): Itinerary => {
    const highlightList = highlights.split(',').map(h => h.trim())
    const daysList: Day[] = []
    for (let i = 1; i <= numDays; i++) {
      const dayHighlights = highlightList.slice((i - 1) * 2, i * 2)
      daysList.push({
        day: i,
        title: i === 1 ? `Arrival & First Impressions of ${city}`
          : i === numDays ? `Final Day — Hidden Gems of ${city}`
          : `Exploring ${dayHighlights[0] || city}`,
        activities: [
          { time: '8:00 AM', activity: `Morning visit to ${dayHighlights[0] || highlightList[0] || city + ' Heritage Site'}`, tip: 'Arrive early to avoid crowds and enjoy the best light for photos' },
          { time: '12:00 PM', activity: `Lunch at a local ${city} restaurant`, tip: `Try the local speciality — ${city} is famous for its unique cuisine` },
          { time: '2:30 PM', activity: `Afternoon exploration of ${dayHighlights[1] || highlightList[1] || 'local markets and bazaars'}`, tip: 'Perfect time for shopping — local handicrafts make great souvenirs' },
          { time: '5:30 PM', activity: 'Sunset viewing at a scenic viewpoint', tip: `${city} sunsets are spectacular — bring your camera` },
          { time: '7:30 PM', activity: 'Evening cultural experience', tip: 'Check for local cultural shows, music performances, or light shows' },
        ]
      })
    }
    return { city, days: daysList }
  }

  // Pick a hotel for the city
  const pickHotel = (city: string): Hotel => {
    const key = CITY_TO_HOTEL_KEY[city] || 'default'
    const hotelList = HOTELS[key] || HOTELS['default']
    return hotelList[Math.floor(Math.random() * hotelList.length)]
  }

  // ─── Silent lead capture ───
  const captureLead = (hotel: Hotel, city: string, monumentId: string, numDays: number) => {
    const leadData = {
      user_name: profile?.full_name || '',
      user_phone: profile?.phone || '',
      user_email: user?.email || '',
      hotel_name: hotel.name,
      hotel_phone: hotel.phone,
      city,
      monument: monumentId,
      days: numDays,
      timestamp: new Date().toISOString(),
    }

    // Step A — backend (fire-and-forget)
    fetch("https://heritageai-backend.onrender.com/leads/capture", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(leadData),
    }).catch(() => {})

    // Step B — Supabase (silent fail)
    try {
      supabase.from('leads').insert(leadData).then(() => {}).catch(() => {})
    } catch { /* silent */ }

    // Step C — console only
    console.log("Lead captured:", leadData.user_name, "→", hotel.name, hotel.phone)
  }

  const generateItinerary = async () => {
    if (!selectedCity) { setError('Please select a city first'); return }
    setLoading(true); setError(''); setItinerary(null)
    setSelectedHotel(null)
    leadSentRef.current = false

    // Pick hotel once
    const hotel = pickHotel(selectedCity)
    setSelectedHotel(hotel)

    try {
      const res = await fetch('https://heritageai-backend.onrender.com/tourism/itinerary', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          monument_id: selectedCityData?.monuments[0] || 'taj-mahal',
          days, city: selectedCity,
          city_highlights: selectedCityData?.highlights || ''
        })
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setItinerary({ ...data, city: selectedCity })

      // Silent lead gen after render
      if (!leadSentRef.current) {
        leadSentRef.current = true
        captureLead(hotel, selectedCity, selectedCityData?.monuments[0] || 'taj-mahal', days)
      }
    } catch {
      const cityItinerary = generateLocalItinerary(selectedCity, selectedCityData?.highlights || '', days)
      setItinerary(cityItinerary)

      // Silent lead gen even on fallback
      if (!leadSentRef.current) {
        leadSentRef.current = true
        captureLead(hotel, selectedCity, selectedCityData?.monuments[0] || 'taj-mahal', days)
      }
    } finally { setLoading(false) }
  }

  // ─── Hotel Card Component ───
  const HotelCard = ({ hotel }: { hotel: Hotel }) => (
    <div style={{
      background: 'rgba(28,22,56,0.7)',
      backdropFilter: 'blur(12px)',
      border: '1px solid rgba(201,168,76,0.35)',
      borderRadius: 14,
      padding: '16px 20px',
      marginTop: 12,
      transition: 'all 0.3s ease',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 18 }}>🏨</span>
          <span style={{ color: '#C4A882', fontSize: 12, fontWeight: 600 }}>Suggested Stay</span>
        </div>
        <div style={{ color: '#C9A84C', fontSize: 13, letterSpacing: 1 }}>
          {'★'.repeat(hotel.stars)}{'☆'.repeat(5 - hotel.stars)}
        </div>
      </div>
      <div style={{ color: '#E8C97A', fontSize: 15, fontWeight: 700, marginBottom: 6, fontFamily: 'Georgia, serif' }}>
        {hotel.name}
      </div>
      <div style={{ color: '#7A6E5C', fontSize: 12, marginBottom: 4, lineHeight: 1.4 }}>
        {hotel.address}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, color: '#7A6E5C', fontSize: 12 }}>
        <span>📞 {hotel.phone}</span>
        <span style={{ color: '#4B9B8E', fontWeight: 700 }}>~₹{hotel.price.toLocaleString('en-IN')}/night</span>
      </div>
    </div>
  )

  return (
    <AppShell>
      <div style={{ padding: '24px', maxWidth: 860, margin: '0 auto' }}>
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '2rem', color: '#C9A84C', fontWeight: 700, margin: '0 0 0.5rem' }}>
            {t('itinerary_title')}
          </h1>
          <p style={{ color: '#C4A882', margin: 0 }}>{t('itinerary_subtitle')}</p>
        </div>

        <div style={{ background: 'rgba(28,22,56,0.9)', border: '1px solid rgba(201,168,76,0.3)', borderRadius: '18px', padding: '1.5rem', marginBottom: '1.5rem' }}>
          {/* Days selector */}
          <div style={{ marginBottom: '1.2rem' }}>
            <label style={{ display: 'block', color: '#C4A882', fontSize: '13px', marginBottom: '8px', fontWeight: 600 }}>{t('num_days')}</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              {[1,2,3,4,5].map(d => (
                <button key={d} onClick={() => setDays(d)} style={{
                  width: 42, height: 42, borderRadius: '10px',
                  background: days === d ? 'linear-gradient(135deg, #D4893F, #C9A84C)' : 'rgba(28,22,56,0.8)',
                  color: days === d ? '#0F0B1E' : '#C4A882',
                  fontSize: '15px', fontWeight: 700, cursor: 'pointer',
                  border: days === d ? 'none' : '1px solid rgba(201,168,76,0.2)',
                  transition: 'all 0.2s ease'
                }}>{d}</button>
              ))}
              <span style={{ color: '#7A6E5C', fontSize: '13px', alignSelf: 'center', marginLeft: '4px' }}>{days === 1 ? t('day') : t('days_word')}</span>
            </div>
          </div>

          {/* City search */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', color: '#C4A882', fontSize: '13px', marginBottom: '8px', fontWeight: 600 }}>{t('search_city')}</label>
            <input type="text" placeholder={t('search_city_placeholder')} value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              style={{ width: '100%', padding: '10px 14px', background: 'rgba(15,11,30,0.8)', border: '1px solid rgba(201,168,76,0.25)', borderRadius: '10px', color: '#F5E6D3', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
          </div>

          {/* City grid */}
          <div style={{ marginBottom: '1.2rem' }}>
            <label style={{ display: 'block', color: '#C4A882', fontSize: '13px', marginBottom: '8px', fontWeight: 600 }}>
              {t('select_city')} {selectedCity && `— ${selectedCity} ${t('selected')}`}
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '8px', maxHeight: '280px', overflowY: 'auto', paddingRight: '4px' }}>
              {filteredCities.map(cityData => {
                const isSelected = selectedCity === cityData.city
                return (
                  <button key={cityData.city} onClick={() => setSelectedCity(cityData.city)} style={{
                    padding: '10px 12px', borderRadius: '10px',
                    background: isSelected ? 'linear-gradient(135deg, rgba(212,137,63,0.25), rgba(201,168,76,0.15))' : 'rgba(20,16,40,0.8)',
                    border: isSelected ? '1px solid rgba(201,168,76,0.6)' : '1px solid rgba(201,168,76,0.12)',
                    cursor: 'pointer', textAlign: 'left' as const, transition: 'all 0.2s ease'
                  }}>
                    <div style={{ fontSize: '18px', marginBottom: '3px' }}>{cityData.emoji}</div>
                    <div style={{ color: isSelected ? '#C9A84C' : '#F5E6D3', fontSize: '13px', fontWeight: isSelected ? 700 : 600 }}>{cityData.city}</div>
                    <div style={{ color: '#7A6E5C', fontSize: '10px', marginTop: '2px' }}>{cityData.state}</div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Selected city highlights */}
          {selectedCityData && (
            <div style={{ padding: '10px 14px', marginBottom: '1.2rem', background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: '10px' }}>
              <div style={{ color: '#E8C97A', fontSize: '13px', fontWeight: 700, marginBottom: '3px' }}>{selectedCityData.emoji} {selectedCityData.city} {t('city_highlights')}</div>
              <div style={{ color: '#C4A882', fontSize: '12px' }}>{selectedCityData.highlights}</div>
            </div>
          )}

          {/* Generate button */}
          <button onClick={generateItinerary} disabled={loading || !selectedCity} style={{
            width: '100%', padding: '14px',
            background: !selectedCity ? 'rgba(201,168,76,0.2)' : loading ? 'rgba(201,168,76,0.4)' : 'linear-gradient(135deg, #D4893F, #C9A84C)',
            color: (!selectedCity || loading) ? '#C4A882' : '#0F0B1E',
            border: 'none', borderRadius: '12px', fontSize: '15px', fontWeight: 700,
            cursor: (!selectedCity || loading) ? 'not-allowed' : 'pointer', transition: 'all 0.2s ease'
          }}>
            {loading ? t('generating') : !selectedCity ? t('select_city_first') : `✨ ${t('generate_itinerary')} — ${days} ${t('days_word')} ${selectedCity}`}
          </button>
        </div>

        {error && <div style={{ background: 'rgba(196,91,58,0.1)', border: '1px solid rgba(196,91,58,0.5)', borderRadius: '12px', padding: '14px', color: '#E8A85C', marginBottom: '1.5rem' }}>⚠️ {error}</div>}

        {loading && (
          <div style={{ textAlign: 'center', padding: '3rem' }}>
            <div style={{ width: 48, height: 48, margin: '0 auto 1rem', border: '4px solid rgba(201,168,76,0.2)', borderTop: '4px solid #C9A84C', borderRadius: '50%', animation: 'spin 1s linear infinite' }}/>
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            <p style={{ color: '#C4A882', margin: 0 }}>{t('planning_journey')}</p>
          </div>
        )}

        {itinerary && itinerary.days && (
          <div>
            <div style={{ background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.3)', borderRadius: '14px', padding: '1.2rem 1.5rem', marginBottom: '1.5rem', textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', marginBottom: '8px' }}>{selectedCityData?.emoji || '🗺️'}</div>
              <h2 style={{ fontFamily: 'Georgia, serif', color: '#C9A84C', margin: '0 0 0.3rem', fontSize: '1.4rem' }}>
                {days}-{t('day')} {selectedCity} {t('heritage_itinerary')}
              </h2>
              <p style={{ color: '#C4A882', margin: 0, fontSize: '0.88rem' }}>{selectedCityData?.highlights}</p>
            </div>

            {itinerary.days.map((day, dayIdx) => (
              <div key={dayIdx} style={{ background: 'rgba(28,22,56,0.9)', border: '1px solid rgba(201,168,76,0.15)', borderRadius: '16px', padding: '1.5rem', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.2rem' }}>
                  <div style={{
                    width: 38, height: 38, borderRadius: '50%',
                    background: `linear-gradient(135deg, ${ACCENT_COLORS[dayIdx % ACCENT_COLORS.length]}, ${ACCENT_COLORS[(dayIdx + 1) % ACCENT_COLORS.length]})`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#0F0B1E', fontWeight: 800, fontSize: '15px', flexShrink: 0
                  }}>{day.day}</div>
                  <h3 style={{ color: '#E8C97A', fontFamily: 'Georgia, serif', fontSize: '1.05rem', margin: 0 }}>{day.title}</h3>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {day.activities?.map((activity, actIdx) => (
                    <div key={actIdx} style={{ display: 'flex', gap: '12px', padding: '10px 14px', background: 'rgba(15,11,30,0.5)', borderRadius: '10px', borderLeft: `3px solid ${ACCENT_COLORS[dayIdx % ACCENT_COLORS.length]}55` }}>
                      <div style={{ color: ACCENT_COLORS[dayIdx % ACCENT_COLORS.length], fontSize: '11px', fontWeight: 700, minWidth: '62px', paddingTop: '2px', fontFamily: 'monospace', flexShrink: 0 }}>{activity.time}</div>
                      <div>
                        <div style={{ color: '#F5E6D3', fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>{activity.activity}</div>
                        {activity.tip && <div style={{ color: '#4B9B8E', fontSize: '12px', display: 'flex', gap: '4px', alignItems: 'flex-start' }}><span>💡</span><span>{activity.tip}</span></div>}
                      </div>
                    </div>
                  ))}
                </div>

                {/* ── Hotel Card ── */}
                {selectedHotel && <HotelCard hotel={selectedHotel} />}
              </div>
            ))}

            <div style={{ textAlign: 'center', padding: '1rem', color: '#7A6E5C', fontSize: '12px' }}>{t('generated_by')}</div>
          </div>
        )}
      </div>
    </AppShell>
  )
}
