'use client'
import { useState } from 'react'
import { AppShell } from '@/components/app-shell'
import { useLang } from '@/lib/languageContext'

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

interface Activity { time: string; activity: string; tip: string }
interface Day { day: number; title: string; activities: Activity[] }
interface Itinerary { city?: string; monument?: string; days: Day[] }

const ACCENT_COLORS = ['#C9A84C', '#D4893F', '#4B9B8E', '#534AB7', '#C45B3A']

export default function ItineraryPage() {
  const { t } = useLang()
  const [selectedCity, setSelectedCity] = useState('')
  const [days, setDays] = useState(3)
  const [itinerary, setItinerary] = useState<Itinerary | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

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

  const generateItinerary = async () => {
    if (!selectedCity) { setError('Please select a city first'); return }
    setLoading(true); setError(''); setItinerary(null)
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
    } catch {
      const cityItinerary = generateLocalItinerary(selectedCity, selectedCityData?.highlights || '', days)
      setItinerary(cityItinerary)
    } finally { setLoading(false) }
  }

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
              </div>
            ))}

            <div style={{ textAlign: 'center', padding: '1rem', color: '#7A6E5C', fontSize: '12px' }}>{t('generated_by')}</div>
          </div>
        )}
      </div>
    </AppShell>
  )
}
