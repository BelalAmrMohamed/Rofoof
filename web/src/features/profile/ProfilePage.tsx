import { useEffect, useMemo, useState } from 'react'
import { MapPicker } from '../onboarding/components/MapPicker'
import type { GeoPoint } from '../onboarding/types/location'
import type { GeocodedLocation } from '../../lib/geocode'
import { SiteNavigation } from '../../components/SiteNavigation'
import { supabase } from '../../lib/supabase'
import { getUserAvatar, useAuth } from '../../lib/auth.ts'
import { setPageMeta } from '../../lib/seo'
import { COUNTRIES } from '../../lib/locations'
import './ProfilePage.css'

type Profile = {
  fullname: string; email: string | null; role: 'visitor' | 'volunteer' | 'admin'
  governorate: string | null; city: string | null; country: string | null
  lat: number | null; lng: number | null; created_at: string
}
type Activity = {
  id: string; title: string; author: string | null; category: string | null
  mosque: string; city: string; governorate: string; action: 'viewed' | 'searched'; createdAt: string
}
type Notice = { type: 'error' | 'success'; text: string } | null

export default function ProfilePage() {
  const { user, loading: authLoading } = useAuth()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [avatarFailed, setAvatarFailed] = useState(false)
  const [activities, setActivities] = useState<Activity[]>([])
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<'all' | 'viewed' | 'searched'>('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [draftCountry, setDraftCountry] = useState('مصر')
  const [draftGov, setDraftGov] = useState('')
  const [draftCity, setDraftCity] = useState('')
  const [draftPoint, setDraftPoint] = useState<GeoPoint | null>(null)
  const [notice, setNotice] = useState<Notice>(null)
  const [loading, setLoading] = useState(true)

  // Live governorates and cities from DB for the selected draft country
  const [liveGovs, setLiveGovs] = useState<string[]>([])
  const [liveCities, setLiveCities] = useState<string[]>([])

  useEffect(() => {
    setPageMeta({
      title: 'الملف الشخصي',
      description: 'راجع حسابك وسجل تفاعلاتك مع كتب ومساجد المنصة.',
      canonical: 'https://rofoof-almasajid.vercel.app/profile',
    })
  }, [])

  useEffect(() => {
    async function load() {
      if (authLoading) return
      if (!supabase) { setNotice({ type: 'error', text: 'إعدادات Supabase غير موجودة.' }); setLoading(false); return }
      if (!user) { setNotice({ type: 'error', text: 'سجّل الدخول لعرض ملفك الشخصي.' }); setLoading(false); return }

      const result = await supabase.from('users')
        .select('fullname, email, role, governorate, city, country, lat, lng, created_at')
        .eq('user_id', user.id).single()
      if (result.error) {
        setNotice({ type: 'error', text: 'تعذر تحميل بيانات الحساب. طبّق آخر migrations على Supabase ثم أعد تسجيل الدخول.' })
        setLoading(false); return
      }
      const p = result.data as Profile
      setProfile(p)
      setDraftCountry(p.country ?? 'مصر')
      setDraftGov(p.governorate ?? '')
      setDraftCity(p.city ?? '')
      setDraftPoint(p.lat !== null && p.lng !== null ? { lat: p.lat, lng: p.lng } : null)

      // Load activity from localStorage — try user-keyed first, then guest key
      try {
        const keyed = JSON.parse(localStorage.getItem(`mosque-shelves-activity:${user.id}`) ?? 'null')
        const guest = JSON.parse(localStorage.getItem('mosque-shelves-activity:guest') ?? '[]')
        const merged: Activity[] = [...(keyed ?? []), ...(Array.isArray(guest) ? guest : [])]
        // De-duplicate by id, sort newest first
        const seen = new Set<string>()
        const deduped = merged.filter((a) => { if (seen.has(a.id)) return false; seen.add(a.id); return true })
        setActivities(deduped)
      } catch { setActivities([]) }

      // Load live governorates from mosques table
      const { data: mosqueData } = await supabase.from('mosques').select('mosque_governorate, mosque_city, country').limit(400)
      if (mosqueData) {
        const govSet = new Set<string>()
        for (const m of mosqueData) if ((m.country ?? 'مصر') === (p.country ?? 'مصر')) govSet.add(m.mosque_governorate)
        setLiveGovs(Array.from(govSet).sort())
        if (p.governorate) {
          const citySet = new Set<string>()
          for (const m of mosqueData) if (m.mosque_governorate === p.governorate) citySet.add(m.mosque_city)
          setLiveCities(Array.from(citySet).sort())
        }
      }

      setLoading(false)
    }
    void load()
  }, [authLoading, user])

  // When draft country or governorate changes, refresh city list
  useEffect(() => {
    if (!supabase) return
    supabase.from('mosques').select('mosque_governorate, mosque_city, country').limit(400).then(({ data }) => {
      if (!data) return
      const govSet = new Set<string>()
      for (const m of data) if ((m.country ?? 'مصر') === draftCountry) govSet.add(m.mosque_governorate)
      setLiveGovs(Array.from(govSet).sort())
      if (draftGov) {
        const citySet = new Set<string>()
        for (const m of data) if (m.mosque_governorate === draftGov) citySet.add(m.mosque_city)
        setLiveCities(Array.from(citySet).sort())
      } else {
        setLiveCities([])
      }
    })
  }, [draftCountry, draftGov])

  const visibleActivities = useMemo(() => activities.filter((item) => {
    const text = `${item.title} ${item.author ?? ''} ${item.category ?? ''} ${item.mosque} ${item.city} ${item.governorate}`.toLowerCase()
    return (filter === 'all' || item.action === filter) && (!query.trim() || text.includes(query.trim().toLowerCase()))
  }), [activities, filter, query])

  const viewed = activities.filter((a) => a.action === 'viewed').length
  const searched = activities.filter((a) => a.action === 'searched').length

  const saveLocation = async () => {
    if (!supabase || !profile || !draftCountry) { setNotice({ type: 'error', text: 'يرجى اختيار الدولة على الأقل.' }); return }
    const result = await supabase.from('users').update({
      country: draftCountry,
      governorate: draftGov || null,
      city: draftCity || null,
      lat: draftPoint?.lat ?? null,
      lng: draftPoint?.lng ?? null,
      location_source: draftPoint ? 'manual_pin' : 'skipped',
    }).eq('user_id', user?.id ?? '')
    if (result.error) setNotice({ type: 'error', text: result.error.message })
    else {
      setProfile({ ...profile, country: draftCountry, governorate: draftGov || null, city: draftCity || null, lat: draftPoint?.lat ?? null, lng: draftPoint?.lng ?? null })
      setModalOpen(false)
      setNotice({ type: 'success', text: 'تم تحديث موقعك بنجاح.' })
    }
  }

  if (loading || authLoading) return (
    <div className="site-layout" dir="rtl"><SiteNavigation active="profile" /><div className="site-content">
      <main className="profile-page"><p className="profile-message">جارٍ تحميل الملف الشخصي...</p></main>
    </div></div>
  )

  if (!profile) return (
    <div className="site-layout" dir="rtl"><SiteNavigation active="profile" /><div className="site-content">
      <main className="profile-page"><div className="profile-message">
        <h1>الملف الشخصي</h1><p>{notice?.text}</p>
        <a href="/login?redirect=/profile" className="profile-primary">تسجيل الدخول</a>
      </div></main>
    </div></div>
  )

  const locationDisplay = [profile.city, profile.governorate, profile.country].filter(Boolean).join('، ')

  return (
    <div className="site-layout" dir="rtl">
      <SiteNavigation active="profile" />
      <div className="site-content">
        <main className="profile-page">
          <div className="profile-wrap">
            <section className="profile-hero">
              <div className="profile-identity">
                <div className="profile-avatar">{!avatarFailed && getUserAvatar(user) ? <img src={getUserAvatar(user) ?? ''} alt="" onError={() => setAvatarFailed(true)} /> : profile.fullname[0] || 'م'}</div>
                <span className="profile-role">{profile.role === 'admin' ? 'مدير' : profile.role === 'volunteer' ? 'متطوع' : 'زائر'}</span>
                <h1>{profile.fullname}</h1>
                <p>{profile.email}</p>
                <small>عضو منذ {new Date(profile.created_at).toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' })}</small>
              </div>
              <div className="profile-welcome">
                <h2>أهلاً بعودتك</h2>
                <p>راجع بياناتك وموقعك وسجل تفاعلك مع كتب ومساجد المنصة.</p>
                <button className="profile-primary" onClick={() => setModalOpen(true)}>تعديل الموقع</button>
                <div className="profile-stats">
                  <div><strong>{activities.length}</strong><span>كتب في السجل</span></div>
                  <div><strong>{viewed}</strong><span>تمت المشاهدة</span></div>
                  <div><strong>{searched}</strong><span>عمليات البحث</span></div>
                </div>
              </div>
            </section>

            <div className="profile-columns">
              <aside className="profile-aside">
                <section className="profile-info-card">
                  <span>اسم العرض</span><strong>{profile.fullname}</strong><em>نشط</em>
                </section>
                <section className="profile-info-card profile-location">
                  <span>الموقع الحالي</span>
                  <strong>{locationDisplay || 'لم تحدد موقعاً بعد'}</strong>
                  <button onClick={() => setModalOpen(true)}>تغيير</button>
                </section>
              </aside>

              <section className="profile-history">
                <header>
                  <div>
                    <h2>سجل الكتب</h2>
                    <p>يظهر هنا نشاط البحث والمشاهدة المحفوظ في هذا المتصفح.</p>
                  </div>
                  <span>{visibleActivities.length} سجل</span>
                </header>
                <div className="profile-controls">
                  <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="ابحث عن كتاب أو مسجد..." />
                  <div>
                    {(['all', 'viewed', 'searched'] as const).map((item) => (
                      <button key={item} className={filter === item ? 'active' : ''} onClick={() => setFilter(item)}>
                        {item === 'all' ? 'الكل' : item === 'viewed' ? 'المشاهدة' : 'البحث'}
                      </button>
                    ))}
                  </div>
                </div>
                {visibleActivities.length
                  ? (
                    <div className="activity-list">
                      {visibleActivities.map((item) => (
                        <article key={item.id}>
                          {item.action === 'searched' ? (
                            <div>
                              <h3>بحث: {item.title}</h3>
                              <p>نطاق البحث: {item.city && item.city !== 'all' ? item.city : item.governorate && item.governorate !== 'all' ? item.governorate : 'عام'}</p>
                            </div>
                          ) : (
                            <div>
                              <h3>{item.title}</h3>
                              <p>{item.author || 'مؤلف غير محدد'} · {item.category || 'بدون تصنيف'}</p>
                              <small>{item.mosque} — {item.city}، {item.governorate}</small>
                            </div>
                          )}
                          <span className={item.action}>{item.action === 'viewed' ? 'مشاهدة' : 'بحث'}</span>
                        </article>
                      ))}
                    </div>
                  )
                  : (
                    <div className="profile-empty">
                      <span>📚</span>
                      <strong>لا توجد سجلات بعد</strong>
                      <p>عند مشاهدة تفاصيل كتاب من صفحة التصفح سيظهر نشاطك هنا.</p>
                      <a href="/" className="profile-primary" style={{ marginTop: 12, display: 'inline-block', textDecoration: 'none' }}>تصفح الكتب</a>
                    </div>
                  )
                }
              </section>
            </div>

            {notice && <p className={`profile-notice ${notice.type}`}>{notice.text}</p>}
          </div>
        </main>
      </div>

      {modalOpen && (
        <div className="profile-modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) setModalOpen(false) }}>
          <div className="profile-modal">
            <h2>تعديل الموقع</h2>
            <label>الدولة
              <select value={draftCountry} onChange={(e) => { setDraftCountry(e.target.value); setDraftGov(''); setDraftCity('') }}>
                {COUNTRIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </label>
            <label>المحافظة / الولاية
              {liveGovs.length > 0
                ? <select value={draftGov} onChange={(e) => { setDraftGov(e.target.value); setDraftCity('') }}>
                    <option value="">اختر المحافظة</option>
                    {liveGovs.map((g) => <option key={g}>{g}</option>)}
                  </select>
                : <input value={draftGov} onChange={(e) => setDraftGov(e.target.value)} placeholder="أدخل اسم المحافظة" className="profile-text-input" />
              }
            </label>
            <label>المدينة
              {liveCities.length > 0
                ? <select value={draftCity} onChange={(e) => setDraftCity(e.target.value)} disabled={!draftGov}>
                    <option value="">اختر المدينة</option>
                    {liveCities.map((c) => <option key={c}>{c}</option>)}
                  </select>
                : <input value={draftCity} onChange={(e) => setDraftCity(e.target.value)} placeholder="أدخل اسم المدينة" className="profile-text-input" />
              }
            </label>
            <MapPicker
              point={draftPoint}
              onPick={setDraftPoint}
              onGeocode={(r: GeocodedLocation) => {
                if (r.country) setDraftCountry(r.country)
                if (r.state) setDraftGov(r.state)
                if (r.city) setDraftCity(r.city)
              }}
              className="h-56"
            />
            <div className="profile-modal-actions">
              <button onClick={() => setModalOpen(false)}>إلغاء</button>
              <button className="profile-primary" onClick={() => void saveLocation()}>حفظ الموقع</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}