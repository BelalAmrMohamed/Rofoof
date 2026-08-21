import { useEffect, useMemo, useState } from 'react'
import { MapPicker } from '../onboarding/components/MapPicker'
import type { GeoPoint } from '../onboarding/types/location'
import { SiteNavigation } from '../../components/SiteNavigation'
import { supabase } from '../../lib/supabase'
import { getUserAvatar, useAuth } from '../../lib/auth.ts'
import './ProfilePage.css'

type Profile = { fullname: string; email: string | null; role: 'visitor' | 'volunteer' | 'admin'; governorate: string | null; city: string | null; lat: number | null; lng: number | null; created_at: string }
type Activity = { id: string; title: string; author: string | null; category: string | null; mosque: string; city: string; governorate: string; action: 'viewed' | 'searched'; createdAt: string }
type Notice = { type: 'error' | 'success'; text: string } | null

const CITIES: Record<string, string[]> = { القاهرة: ['مدينة نصر', 'مصر الجديدة', 'المعادي', 'الزمالك', 'شبرا'], المنيا: ['مدينة المنيا', 'ملوي', 'سمالوط', 'مغاغة', 'بني مزار', 'أبو قرقاص'], الجيزة: ['الجيزة', 'أكتوبر', 'الشيخ زايد', 'الدقي', 'العجوزة'], الإسكندرية: ['الإسكندرية', 'سيدي بشر', 'العجمي', 'برج العرب'], أسيوط: ['أسيوط', 'ديروط', 'منفلوط', 'القوصية'], سوهاج: ['سوهاج', 'طهطا', 'جرجا', 'أخميم'], قنا: ['قنا', 'نجع حمادي', 'دشنا'], الأقصر: ['الأقصر', 'إسنا', 'الطود'], أسوان: ['أسوان', 'كوم أمبو', 'إدفو'] }
const GOVERNORATES = Object.keys(CITIES)

export default function ProfilePage() {
  const { user, loading: authLoading } = useAuth()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [activities, setActivities] = useState<Activity[]>([])
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<'all' | 'viewed' | 'searched'>('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [draftGov, setDraftGov] = useState('')
  const [draftCity, setDraftCity] = useState('')
  const [draftPoint, setDraftPoint] = useState<GeoPoint | null>(null)
  const [notice, setNotice] = useState<Notice>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      if (authLoading) return
      if (!supabase) { setNotice({ type: 'error', text: 'إعدادات Supabase غير موجودة.' }); setLoading(false); return }
      if (!user) { setNotice({ type: 'error', text: 'سجّل الدخول لعرض ملفك الشخصي.' }); setLoading(false); return }
      const result = await supabase.from('users').select('fullname, email, role, governorate, city, lat, lng, created_at').eq('user_id', user.id).single()
      if (result.error) {
        setNotice({ type: 'error', text: 'تعذر تحميل بيانات الحساب. طبّق آخر migrations على Supabase ثم أعد تسجيل الدخول.' })
        setLoading(false)
        return
      }
      const loadedProfile = result.data as Profile
      setProfile(loadedProfile)
      setDraftGov(loadedProfile.governorate ?? '')
      setDraftCity(loadedProfile.city ?? '')
      setDraftPoint(loadedProfile.lat !== null && loadedProfile.lng !== null ? { lat: loadedProfile.lat, lng: loadedProfile.lng } : null)
      try { setActivities(JSON.parse(localStorage.getItem(`mosque-shelves-activity:${user.id}`) ?? '[]') as Activity[]) } catch { setActivities([]) }
      setLoading(false)
    }
    void load()
  }, [authLoading, user])

  const visibleActivities = useMemo(() => activities.filter((item) => {
    const text = `${item.title} ${item.author ?? ''} ${item.category ?? ''} ${item.mosque} ${item.city} ${item.governorate}`.toLowerCase()
    return (filter === 'all' || item.action === filter) && (!query.trim() || text.includes(query.trim().toLowerCase()))
  }), [activities, filter, query])
  const viewed = activities.filter((item) => item.action === 'viewed').length
  const searched = activities.filter((item) => item.action === 'searched').length
  const saveLocation = async () => {
    if (!supabase || !profile || !draftGov || !draftCity) { setNotice({ type: 'error', text: 'يرجى اختيار المحافظة والمدينة.' }); return }
    const result = await supabase.from('users').update({ governorate: draftGov, city: draftCity, lat: draftPoint?.lat ?? null, lng: draftPoint?.lng ?? null, location_source: draftPoint ? 'manual_pin' : 'skipped' }).eq('user_id', user?.id ?? '')
    if (result.error) setNotice({ type: 'error', text: result.error.message })
    else { setProfile({ ...profile, governorate: draftGov, city: draftCity, lat: draftPoint?.lat ?? null, lng: draftPoint?.lng ?? null }); setModalOpen(false); setNotice({ type: 'success', text: 'تم تحديث موقعك بنجاح.' }) }
  }

  if (loading || authLoading) return <div className="site-layout" dir="rtl"><SiteNavigation active="profile" /><div className="site-content"><main className="profile-page"><p className="profile-message">جارٍ تحميل الملف الشخصي...</p></main></div></div>
  if (!profile) return <div className="site-layout" dir="rtl"><SiteNavigation active="profile" /><div className="site-content"><main className="profile-page"><div className="profile-message"><h1>الملف الشخصي</h1><p>{notice?.text}</p><a href="/login?redirect=/profile" className="profile-primary">تسجيل الدخول</a></div></main></div></div>

  return <div className="site-layout" dir="rtl"><SiteNavigation active="profile" /><div className="site-content"><main className="profile-page"><div className="profile-wrap">
    <section className="profile-hero"><div className="profile-identity"><div className="profile-avatar">{getUserAvatar(user) ? <img src={getUserAvatar(user) ?? ''} alt="" /> : profile.fullname[0] || 'م'}</div><span className="profile-role">{profile.role === 'admin' ? 'مدير' : profile.role === 'volunteer' ? 'متطوع' : 'زائر'}</span><h1>{profile.fullname}</h1><p>{profile.email}</p><small>عضو منذ {new Date(profile.created_at).toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' })}</small></div><div className="profile-welcome"><h2>أهلاً بعودتك</h2><p>راجع بياناتك وموقعك وسجل تفاعلك مع كتب ومساجد المنصة.</p><button className="profile-primary" onClick={() => setModalOpen(true)}>تعديل الموقع</button><div className="profile-stats"><div><strong>{activities.length}</strong><span>كتب في السجل</span></div><div><strong>{viewed}</strong><span>تمت المشاهدة</span></div><div><strong>{searched}</strong><span>عمليات البحث</span></div></div></div></section>
  <div className="profile-columns"><aside className="profile-aside"><section className="profile-info-card"><span>اسم العرض</span><strong>{profile.fullname}</strong><em>نشط</em></section><section className="profile-info-card profile-location"><span>الموقع الحالي</span><strong>{profile.governorate && profile.city ? `${profile.governorate} — ${profile.city}` : 'لم تحدد موقعاً بعد'}</strong><button onClick={() => setModalOpen(true)}>تغيير</button></section></aside><section className="profile-history"><header><div><h2>سجل الكتب</h2><p>يظهر هنا نشاط البحث والمشاهدة المحفوظ في هذا المتصفح.</p></div><span>{visibleActivities.length} سجل</span></header><div className="profile-controls"><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ابحث عن كتاب أو مسجد..." /> <div>{(['all', 'viewed', 'searched'] as const).map((item) => <button key={item} className={filter === item ? 'active' : ''} onClick={() => setFilter(item)}>{item === 'all' ? 'الكل' : item === 'viewed' ? 'المشاهدة' : 'البحث'}</button>)}</div></div>{visibleActivities.length ? <div className="activity-list">{visibleActivities.map((item) => <article key={item.id}><div><h3>{item.title}</h3><p>{item.author || 'مؤلف غير محدد'} · {item.category || 'بدون تصنيف'}</p><small>{item.mosque} — {item.city}، {item.governorate}</small></div><span className={item.action}>{item.action === 'viewed' ? 'مشاهدة' : 'بحث'}</span></article>)}</div> : <div className="profile-empty"><span>📚</span><strong>لا توجد سجلات بعد</strong><p>عند البحث أو مشاهدة تفاصيل كتاب سيظهر نشاطك هنا.</p></div>}</section></div>{notice && <p className={`profile-notice ${notice.type}`}>{notice.text}</p>}
  </div></main></div>{modalOpen && <div className="profile-modal-backdrop" onClick={(event) => { if (event.target === event.currentTarget) setModalOpen(false) }}><div className="profile-modal"><h2>تعديل الموقع</h2><label>المحافظة<select value={draftGov} onChange={(event) => { setDraftGov(event.target.value); setDraftCity(CITIES[event.target.value]?.[0] ?? '') }}><option value="">اختر المحافظة</option>{GOVERNORATES.map((item) => <option key={item}>{item}</option>)}</select></label><label>المدينة<select value={draftCity} onChange={(event) => setDraftCity(event.target.value)} disabled={!draftGov}><option value="">اختر المدينة</option>{(CITIES[draftGov] ?? []).map((item) => <option key={item}>{item}</option>)}</select></label><MapPicker point={draftPoint} onPick={setDraftPoint} className="h-56" /><div className="profile-modal-actions"><button onClick={() => setModalOpen(false)}>إلغاء</button><button className="profile-primary" onClick={() => void saveLocation()}>حفظ الموقع</button></div></div></div>}
  </div>
}
