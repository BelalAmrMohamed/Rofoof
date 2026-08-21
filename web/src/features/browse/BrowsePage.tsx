import { useEffect, useMemo, useRef, useState } from 'react'
import { MapPicker } from '../onboarding/components/MapPicker'
import type { GeoPoint } from '../onboarding/types/location'
import type { GeocodedLocation } from '../../lib/geocode'
import { supabase } from '../../lib/supabase'
import { SiteNavigation } from '../../components/SiteNavigation'
import { useAuth } from '../../lib/auth.ts'
import { buildLibrarySchema, buildBookSchema, buildMosqueSchema, setPageMeta } from '../../lib/seo'
import { COUNTRIES } from '../submit/SubmitPage'

// ── Types ──────────────────────────────────────────────────────────────────

type View = 'books' | 'mosques'
type Category = 'فقه' | 'حديث' | 'تفسير' | 'سيرة' | 'عقيدة' | 'تزكية' | 'أدب' | 'تاريخ' | 'أخرى'
type Location = { country: string; governorate: string; city: string }

type LiveBook = {
  entry_id: string; book_id: string; title: string; author: string | null
  category: Category | null; extra_info: string | null; edition: string | null; publisher: string | null
  mosque_id: string; mosque_name: string | null; mosque_governorate: string; mosque_city: string; mosque_country: string
}

type LiveMosque = {
  mosque_id: string; mosque_name: string | null; mosque_governorate: string; mosque_city: string
  mosque_country: string; mosque_image: string | null; book_count: number
}

const CATEGORIES: Category[] = ['فقه', 'حديث', 'تفسير', 'سيرة', 'عقيدة', 'تزكية', 'أدب', 'تاريخ', 'أخرى']

function mosqueLabel(name: string | null, city: string) { return name ?? `مسجد في ${city}` }
function catIdx(cat: Category | null) { return cat ? CATEGORIES.indexOf(cat) : -1 }
function catClass(cat: Category | null) { const i = catIdx(cat); return i >= 0 ? `category-${i}` : '' }

// Write a "viewed" activity record to localStorage
function recordActivity(book: LiveBook) {
  try {
    const supabaseSession = Object.keys(localStorage).find((k) => k.includes('supabase.auth.token'))
    const rawSession = supabaseSession ? localStorage.getItem(supabaseSession) : null
    const userId: string | null = rawSession ? (JSON.parse(rawSession) as any)?.currentSession?.user?.id ?? null : null
    const key = userId ? `mosque-shelves-activity:${userId}` : 'mosque-shelves-activity:guest'
    const existing: unknown[] = JSON.parse(localStorage.getItem(key) ?? '[]')
    const record = {
      id: `${book.entry_id}-${Date.now()}`,
      title: book.title, author: book.author, category: book.category,
      mosque: mosqueLabel(book.mosque_name, book.mosque_city),
      city: book.mosque_city, governorate: book.mosque_governorate,
      action: 'viewed', createdAt: new Date().toISOString(),
    }
    const updated = [record, ...existing.filter((a: any) => a.title !== book.title)].slice(0, 100)
    localStorage.setItem(key, JSON.stringify(updated))
  } catch { /* localStorage unavailable */ }
}

// Write a "searched" activity record to localStorage
function recordSearchActivity(queryText: string, currentCity: string, currentGov: string) {
  try {
    const supabaseSession = Object.keys(localStorage).find((k) => k.includes('supabase.auth.token'))
    const rawSession = supabaseSession ? localStorage.getItem(supabaseSession) : null
    const userId: string | null = rawSession ? (JSON.parse(rawSession) as any)?.currentSession?.user?.id ?? null : null
    const key = userId ? `mosque-shelves-activity:${userId}` : 'mosque-shelves-activity:guest'
    const existing: unknown[] = JSON.parse(localStorage.getItem(key) ?? '[]')
    const record = {
      id: `search-${Date.now()}`,
      title: queryText, author: null, category: null,
      mosque: '', city: currentCity, governorate: currentGov,
      action: 'searched', createdAt: new Date().toISOString(),
    }
    // Remove exact duplicate searches to keep it clean
    const updated = [record, ...existing.filter((a: any) => a.action !== 'searched' || a.title !== queryText)].slice(0, 100)
    localStorage.setItem(key, JSON.stringify(updated))
  } catch { /* localStorage unavailable */ }
}

// ── Icon helper ───────────────────────────────────────────────────────────

function Icon({ name, size = 20 }: { name: 'book' | 'mosque' | 'search' | 'close' | 'location' | 'plus' | 'info' | 'globe'; size?: number }) {
  const paths: Record<string, React.ReactNode> = {
    book:     <><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" /></>,
    mosque:   <><path d="M12 2c-1.5 0-2.5 1.5-2.5 3v2H7a3 3 0 0 0-3 3v10h16V10a3 3 0 0 0-3-3h-2.5V5c0-1.5-1-3-2.5-3Z" /><path d="M9 22v-7h6v7" /></>,
    search:   <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
    close:    <><path d="m6 6 12 12M18 6 6 18" /></>,
    location: <><path d="M12 21s7-7.75 7-13a7 7 0 1 0-14 0c0 5.25 7 13 7 13Z" /><circle cx="12" cy="8" r="2.5" /></>,
    plus:     <><path d="M12 5v14M5 12h14" /></>,
    info:     <><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></>,
    globe:    <><circle cx="12" cy="12" r="10" /><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></>,
  }
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>
}

// ── Main Page ──────────────────────────────────────────────────────────────

export default function BrowsePage() {
  const { user } = useAuth()

  // Data
  const [books, setBooks] = useState<LiveBook[]>([])
  const [mosquesRaw, setMosquesRaw] = useState<LiveMosque[]>([])
  const [loading, setLoading] = useState(true)
  const [dataError, setDataError] = useState<string | null>(null)

  // Filters
  const [view, setView] = useState<View>('books')
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<Category | 'all'>('all')
  const [filterCountry, setFilterCountry] = useState('all')
  const [governorate, setGovernorate] = useState('all')
  const [city, setCity] = useState('all')

  // Location
  const [location, setLocation] = useState<Location | null>(null)
  const [locationDraft, setLocationDraft] = useState<Location>({ country: 'مصر', governorate: '', city: '' })
  const [locationDraftPoint, setLocationDraftPoint] = useState<GeoPoint | null>(null)

  // Modals
  const [modal, setModal] = useState<'location' | 'book' | 'mosque' | null>(null)
  const [selectedBook, setSelectedBook] = useState<LiveBook | null>(null)
  const [selectedMosque, setSelectedMosque] = useState<LiveMosque | null>(null)

  // SEO — set on mount
  useEffect(() => {
    setPageMeta({
      title: 'على رفوف المساجد — تصفح الكتب والمساجد',
      description: 'اكتشف الكتب المتاحة على رفوف المساجد القريبة منك وساهم في فهرستها. مبادرة مجتمعية مفتوحة.',
      jsonLd: buildLibrarySchema(),
      canonical: 'https://rofoof-almasajid.vercel.app/',
    })
  }, [])

  // Load live data
  useEffect(() => {
    if (!supabase) { setLoading(false); setDataError('إعدادات Supabase غير موجودة.'); return }
    let cancelled = false
    async function load() {
      if (!supabase) return
      try {
        const [booksRes, mosquesRes] = await Promise.all([
          supabase.from('mosque_books')
            .select('id, edition, publisher, books!inner(book_id, title, author, category, extra_info), mosques!inner(mosque_id, mosque_name, mosque_governorate, mosque_city, country, mosque_image)')
            .eq('status', 'approved')
            .order('created_at', { ascending: false })
            .limit(500),
          supabase.from('mosques')
            .select('mosque_id, mosque_name, mosque_governorate, mosque_city, country, mosque_image')
            .order('created_at', { ascending: false })
            .limit(400),
        ])
        if (booksRes.error) throw booksRes.error
        if (mosquesRes.error) throw mosquesRes.error
        if (cancelled) return

        const flatBooks: LiveBook[] = (booksRes.data ?? []).map((row: any) => ({
          entry_id: row.id, book_id: row.books.book_id, title: row.books.title,
          author: row.books.author, category: row.books.category, extra_info: row.books.extra_info,
          edition: row.edition, publisher: row.publisher,
          mosque_id: row.mosques.mosque_id, mosque_name: row.mosques.mosque_name,
          mosque_governorate: row.mosques.mosque_governorate, mosque_city: row.mosques.mosque_city,
          mosque_country: row.mosques.country ?? 'مصر',
        }))

        const bookCountByMosque: Record<string, number> = {}
        for (const b of flatBooks) bookCountByMosque[b.mosque_id] = (bookCountByMosque[b.mosque_id] ?? 0) + 1

        const flatMosques: LiveMosque[] = (mosquesRes.data ?? []).map((m: any) => ({
          mosque_id: m.mosque_id, mosque_name: m.mosque_name,
          mosque_governorate: m.mosque_governorate, mosque_city: m.mosque_city,
          mosque_country: m.country ?? 'مصر', mosque_image: m.mosque_image ?? null,
          book_count: bookCountByMosque[m.mosque_id] ?? 0,
        }))

        setBooks(flatBooks); setMosquesRaw(flatMosques)

        // Pre-fill location from user profile
        if (user && supabase) {
          const { data: profile } = await supabase.from('users')
            .select('governorate, city, country').eq('user_id', user.id).maybeSingle()
          if (profile?.governorate && profile?.city && !cancelled) {
            setLocation({ country: profile.country ?? 'مصر', governorate: profile.governorate, city: profile.city })
            setFilterCountry(profile.country ?? 'مصر')
            setGovernorate(profile.governorate)
            setCity(profile.city)
          }
        }
      } catch (err: any) {
        if (!cancelled) setDataError(err?.message ?? 'تعذر تحميل البيانات.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => { cancelled = true }
  }, [user])

  // Record search queries when the user pauses typing
  useEffect(() => {
    if (!query.trim()) return
    const timer = setTimeout(() => {
      recordSearchActivity(query.trim(), city, governorate)
    }, 1500)
    return () => clearTimeout(timer)
  }, [query, city, governorate])

  // ── Derived geo lists ──────────────────────────────────────────────────
  const countries = useMemo(() => {
    const s = new Set<string>(); for (const m of mosquesRaw) s.add(m.mosque_country); return Array.from(s).sort()
  }, [mosquesRaw])

  const governorates = useMemo(() => {
    const s = new Set<string>()
    for (const m of mosquesRaw) if (filterCountry === 'all' || m.mosque_country === filterCountry) s.add(m.mosque_governorate)
    return Array.from(s).sort()
  }, [mosquesRaw, filterCountry])

  const cities = useMemo(() => {
    if (governorate === 'all') return []
    const s = new Set<string>()
    for (const m of mosquesRaw) if (m.mosque_governorate === governorate) s.add(m.mosque_city)
    return Array.from(s).sort()
  }, [mosquesRaw, governorate])

  const locationDraftGovs = useMemo(() => {
    const s = new Set<string>()
    for (const m of mosquesRaw) if (m.mosque_country === locationDraft.country) s.add(m.mosque_governorate)
    return Array.from(s).sort()
  }, [mosquesRaw, locationDraft.country])

  const locationDraftCities = useMemo(() => {
    if (!locationDraft.governorate) return []
    const s = new Set<string>()
    for (const m of mosquesRaw) if (m.mosque_governorate === locationDraft.governorate) s.add(m.mosque_city)
    return Array.from(s).sort()
  }, [mosquesRaw, locationDraft.governorate])

  const stats = useMemo(() => ({
    books: books.length,
    mosques: mosquesRaw.length,
    countries: new Set(mosquesRaw.map((m) => m.mosque_country)).size,
  }), [books, mosquesRaw])

  // ── Filtered results ───────────────────────────────────────────────────
  const proximity = (g: string) => location && g !== location.governorate ? 1 : 0

  const filteredBooks = useMemo(() => books.filter((b) => {
    const q = !query || b.title.includes(query) || (b.author ?? '').includes(query)
    const cat = category === 'all' || b.category === category
    const ctry = filterCountry === 'all' || b.mosque_country === filterCountry
    const gov = governorate === 'all' || b.mosque_governorate === governorate
    const cty = city === 'all' || b.mosque_city === city
    return q && cat && ctry && gov && cty
  }).sort((a, b) => proximity(a.mosque_governorate) - proximity(b.mosque_governorate)), [books, category, city, filterCountry, governorate, location, query])

  const filteredMosques = useMemo(() => mosquesRaw.filter((m) => {
    const q = !query || (m.mosque_name ?? '').includes(query) || m.mosque_city.includes(query) || m.mosque_governorate.includes(query)
    const ctry = filterCountry === 'all' || m.mosque_country === filterCountry
    const gov = governorate === 'all' || m.mosque_governorate === governorate
    const cty = city === 'all' || m.mosque_city === city
    return q && ctry && gov && cty
  }).sort((a, b) => proximity(a.mosque_governorate) - proximity(b.mosque_governorate)), [mosquesRaw, city, filterCountry, governorate, location, query])

  const results = view === 'books' ? filteredBooks : filteredMosques
  const selectedMosqueBooks = useMemo(() => selectedMosque ? books.filter((b) => b.mosque_id === selectedMosque.mosque_id) : [], [books, selectedMosque])

  const updateCountry = (val: string) => { setFilterCountry(val); setGovernorate('all'); setCity('all') }
  const updateGovernorate = (val: string) => { setGovernorate(val); setCity('all') }
  const resetFilters = () => { setQuery(''); setCategory('all'); setFilterCountry('all'); setGovernorate('all'); setCity('all') }

  const openBook = (book: LiveBook) => {
    recordActivity(book)
    setSelectedBook(book)
    setModal('book')
    setPageMeta({
      title: `${book.title} — على رفوف المساجد`,
      description: `${book.title}${book.author ? ` | ${book.author}` : ''} — متاح في ${mosqueLabel(book.mosque_name, book.mosque_city)}، ${book.mosque_city}.`,
      jsonLd: buildBookSchema({ title: book.title, author: book.author, category: book.category, mosqueName: book.mosque_name, mosqueCity: book.mosque_city, mosqueGovernorate: book.mosque_governorate, mosqueCountry: book.mosque_country }),
    })
  }

  const openMosque = (mosque: LiveMosque) => {
    setSelectedMosque(mosque)
    setModal('mosque')
    setPageMeta({
      title: `${mosqueLabel(mosque.mosque_name, mosque.mosque_city)} — على رفوف المساجد`,
      description: `${mosque.book_count} كتاب مُسجَّل في ${mosqueLabel(mosque.mosque_name, mosque.mosque_city)}، ${mosque.mosque_city}، ${mosque.mosque_governorate}.`,
      jsonLd: buildMosqueSchema({ name: mosque.mosque_name, city: mosque.mosque_city, governorate: mosque.mosque_governorate, country: mosque.mosque_country, bookCount: mosque.book_count }),
    })
  }

  const closeModal = () => {
    setModal(null)
    setPageMeta({ title: 'على رفوف المساجد — تصفح الكتب والمساجد', description: 'اكتشف الكتب المتاحة على رفوف المساجد القريبة منك.', jsonLd: buildLibrarySchema() })
  }

  const filterBarRef = useRef<HTMLDivElement>(null)

  return (
    <div className="browse-app" dir="rtl">
      <SiteNavigation active="browse" />
      <div className="page-shell site-content">

        {/* ── Hero Row ── */}
        <div className="browse-hero">
          <div className="browse-hero-start">
            <div className="hero-stats-card">
              <div className="hero-stats-row">
                <div className="hero-stat"><strong>{loading ? '—' : stats.books}</strong><span>كتاب مُسجَّل</span></div>
                <div className="hero-stat-divider" />
                <div className="hero-stat"><strong>{loading ? '—' : stats.mosques}</strong><span>مسجد مُفهرَس</span></div>
                <div className="hero-stat-divider" />
                <div className="hero-stat"><strong>{loading ? '—' : stats.countries}</strong><span>دولة</span></div>
              </div>
            </div>
            <div className="hero-cta-card">
              <div className="hero-cta-icon"><Icon name="plus" size={22} /></div>
              <div className="hero-cta-body">
                <strong>هل لديك كتاب في مسجدك؟</strong>
                <p>ساهم في الفهرسة وساعد الآخرين على الوصول إليه</p>
              </div>
              <a href="/submit" className="primary-button compact">أضفه الآن</a>
            </div>
          </div>
          <div className="browse-hero-end">
            <div className={`location-hero-card ${location ? 'has-location' : ''}`}>
              <div className="location-hero-icon"><Icon name="location" size={26} /></div>
              <div className="location-hero-body">
                {location
                  ? <><strong>الكتب القريبة من:</strong><p>{location.city}، {location.governorate} — {location.country}</p></>
                  : <><strong>حدّد موقعك</strong><p>لعرض الكتب القريبة منك أولاً</p></>
                }
              </div>
              <button className="location-hero-btn" onClick={() => { setLocationDraft(location ?? { country: 'مصر', governorate: '', city: '' }); setLocationDraftPoint(null); setModal('location') }}>
                {location ? 'تغيير' : 'تحديد الموقع'}
              </button>
            </div>
          </div>
        </div>

        {/* ── Unified Sticky Filter Bar ── */}
        <div className="filter-bar" ref={filterBarRef} role="search" aria-label="فلاتر البحث">
          <div className="filter-bar-inner">
            <div className="view-toggle" role="group">
              <button className={view === 'books' ? 'active' : ''} onClick={() => { setView('books'); setCategory('all') }}>
                <Icon name="book" size={15} /> كتب
              </button>
              <button className={view === 'mosques' ? 'active' : ''} onClick={() => { setView('mosques'); setCategory('all') }}>
                <Icon name="mosque" size={15} /> مساجد
              </button>
            </div>
            <label className="filter-search-field">
              <Icon name="search" size={17} />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={view === 'books' ? 'ابحث بعنوان الكتاب أو المؤلف...' : 'ابحث باسم المسجد أو المدينة...'} aria-label="بحث" />
            </label>
            {/* Country filter — show only if we have >1 country in DB */}
            {countries.length > 1 && (
              <select value={filterCountry} onChange={(e) => updateCountry(e.target.value)} aria-label="الدولة" className="filter-select">
                <option value="all">كل الدول</option>
                {COUNTRIES.filter((c) => countries.includes(c)).map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            )}
            <select value={governorate} onChange={(e) => updateGovernorate(e.target.value)} aria-label="المحافظة" className="filter-select">
              <option value="all">كل المحافظات</option>
              {governorates.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
            {governorate !== 'all' && (
              <select value={city} onChange={(e) => setCity(e.target.value)} aria-label="المدينة" className="filter-select">
                <option value="all">كل المدن</option>
                {cities.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            )}
            {view === 'books' && (
              <div className="filter-category-strip" role="group" aria-label="التصنيف">
                <button className={category === 'all' ? 'active' : ''} onClick={() => setCategory('all')}>الكل</button>
                {CATEGORIES.map((item) => <button key={item} className={category === item ? 'active' : ''} onClick={() => setCategory(item)}>{item}</button>)}
              </div>
            )}
          </div>
        </div>

        {/* ── Results meta ── */}
        <div className="results-bar">
          <p className="results-meta">
            {loading ? 'جارٍ التحميل...' : <><strong>{results.length}</strong> {view === 'books' ? 'كتاب' : 'مسجد'}</>}
          </p>
        </div>

        {/* ── Content Grid ── */}
        <main className="browse-main">
          {dataError && <div className="data-error-banner" role="alert"><Icon name="info" size={18} /> {dataError}</div>}
          {loading
            ? <SkeletonGrid />
            : results.length
              ? <div className="cards-grid">
                  {view === 'books'
                    ? filteredBooks.map((book) => <BookCard key={book.entry_id} book={book} location={location} onClick={() => openBook(book)} />)
                    : filteredMosques.map((mosque) => <MosqueCard key={mosque.mosque_id} mosque={mosque} location={location} onClick={() => openMosque(mosque)} />)
                  }
                </div>
              : <EmptyState hasQuery={Boolean(query)} onReset={resetFilters} />
          }
        </main>

        <footer><strong>على رفوف المساجد</strong><br />مبادرة مجتمعية مفتوحة لرقمنة مكتبات المساجد في العالم الإسلامي</footer>
      </div>

      {/* ── Modals ── */}
      {modal === 'location' && (
        <Dialog title="تغيير موقعك" onClose={closeModal}>
          <p className="dialog-note">اختر موقعك على الخريطة أو حدّد الدولة والمحافظة والمدينة يدوياً.</p>
          <MapPicker
            point={locationDraftPoint}
            onPick={setLocationDraftPoint}
            onGeocode={(r: GeocodedLocation) => setLocationDraft((d) => ({ country: r.country || d.country, governorate: r.state || d.governorate, city: r.city || d.city }))}
            className="h-56"
          />
          <label>الدولة<select value={locationDraft.country} onChange={(e) => setLocationDraft((d) => ({ ...d, country: e.target.value, governorate: '', city: '' }))}>
            {COUNTRIES.map((c) => <option key={c}>{c}</option>)}
          </select></label>
          <label>المحافظة<select value={locationDraft.governorate} onChange={(e) => setLocationDraft((d) => ({ ...d, governorate: e.target.value, city: '' }))}>
            <option value="">اختر المحافظة</option>
            {locationDraftGovs.map((g) => <option key={g}>{g}</option>)}
          </select></label>
          <label>المدينة<select value={locationDraft.city} onChange={(e) => setLocationDraft((d) => ({ ...d, city: e.target.value }))}>
            <option value="">اختر المدينة</option>
            {locationDraftCities.map((c) => <option key={c}>{c}</option>)}
          </select></label>
          <div className="dialog-actions">
            <button className="secondary-button" onClick={closeModal}>إلغاء</button>
            <button className="primary-button" onClick={() => { 
              setLocation(locationDraft)
              setGovernorate(locationDraft.governorate || 'all')
              setCity(locationDraft.city || 'all')
              setFilterCountry(locationDraft.country)
              if (user && supabase) {
                supabase.from('users').update({
                  country: locationDraft.country,
                  governorate: locationDraft.governorate || null,
                  city: locationDraft.city || null,
                  lat: locationDraftPoint?.lat ?? null,
                  lng: locationDraftPoint?.lng ?? null,
                  location_source: locationDraftPoint ? 'manual_pin' : 'skipped',
                }).eq('user_id', user.id).then()
              }
              closeModal() 
            }}>حفظ الموقع</button>
          </div>
        </Dialog>
      )}
      {modal === 'book' && selectedBook && (
        <Dialog title="تفاصيل الكتاب" onClose={closeModal}>
          <DetailBook book={selectedBook} onMosque={() => { const m = filteredMosques.find((x) => x.mosque_id === selectedBook.mosque_id) ?? { mosque_id: selectedBook.mosque_id, mosque_name: selectedBook.mosque_name, mosque_governorate: selectedBook.mosque_governorate, mosque_city: selectedBook.mosque_city, mosque_country: selectedBook.mosque_country, mosque_image: null, book_count: 0 }; openMosque(m) }} />
        </Dialog>
      )}
      {modal === 'mosque' && selectedMosque && (
        <Dialog title={mosqueLabel(selectedMosque.mosque_name, selectedMosque.mosque_city)} onClose={closeModal}>
          <DetailMosque mosque={selectedMosque} books={selectedMosqueBooks} location={location} onBook={openBook} />
        </Dialog>
      )}
    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────

function proximity(location: Location | null, governorate: string) {
  return location && governorate === location.governorate ? '● نفس محافظتك' : governorate
}

function BookCard({ book, location, onClick }: { book: LiveBook; location: Location | null; onClick: () => void }) {
  return (
    <article className="book-card" onClick={onClick} onKeyDown={(e) => { if (e.key === 'Enter') onClick() }} tabIndex={0}>
      <div className={`book-avatar ${catClass(book.category)}`}>{book.title[0]}</div>
      <div className="book-info">
        {book.category && <span className={`category-badge ${catClass(book.category)}`}>{book.category}</span>}
        <h3>{book.title}</h3>
        <p>{book.author ?? 'مؤلف غير محدد'}</p>
        {book.edition && <small>{book.edition}</small>}
      </div>
      <div className="card-footer">
        <span>
          <strong>{mosqueLabel(book.mosque_name, book.mosque_city)}</strong>
          <small>{book.mosque_city}، {book.mosque_governorate}</small>
        </span>
        <em className={location && location.governorate === book.mosque_governorate ? 'same' : ''}>
          {proximity(location, book.mosque_governorate)}
        </em>
      </div>
    </article>
  )
}

function MosqueCard({ mosque, location, onClick }: { mosque: LiveMosque; location: Location | null; onClick: () => void }) {
  return (
    <article className="mosque-card" onClick={onClick} onKeyDown={(e) => { if (e.key === 'Enter') onClick() }} tabIndex={0}>
      {mosque.mosque_image
        ? <div className="mosque-card-image"><img src={mosque.mosque_image} alt={mosqueLabel(mosque.mosque_name, mosque.mosque_city)} /></div>
        : <div className="mosque-card-image mosque-card-image--placeholder">
            <svg aria-hidden="true" width={32} height={32} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2c-1.5 0-2.5 1.5-2.5 3v2H7a3 3 0 0 0-3 3v10h16V10a3 3 0 0 0-3-3h-2.5V5c0-1.5-1-3-2.5-3Z" />
              <path d="M9 22v-7h6v7" />
            </svg>
          </div>
      }
      <div className="mosque-card-body">
        <div className="mosque-card-top">
          <div className="mosque-icon">
            <svg aria-hidden="true" width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2c-1.5 0-2.5 1.5-2.5 3v2H7a3 3 0 0 0-3 3v10h16V10a3 3 0 0 0-3-3h-2.5V5c0-1.5-1-3-2.5-3Z" /><path d="M9 22v-7h6v7" />
            </svg>
          </div>
          <div>
            <h3>{mosqueLabel(mosque.mosque_name, mosque.mosque_city)}</h3>
            <p>{mosque.mosque_city}، {mosque.mosque_governorate}</p>
          </div>
        </div>
        <div className="card-footer">
          <strong>{mosque.book_count} <small>كتاب</small></strong>
          <em className={location && location.governorate === mosque.mosque_governorate ? 'same' : ''}>
            {proximity(location, mosque.mosque_governorate)}
          </em>
        </div>
      </div>
    </article>
  )
}

function SkeletonGrid() {
  return (
    <div className="cards-grid">
      {Array.from({ length: 8 }, (_, i) => (
        <div className="skeleton-card" key={i}>
          <div className="skeleton skeleton-large" />
          <div className="skeleton skeleton-line" />
          <div className="skeleton skeleton-line short" />
          <div className="skeleton skeleton-footer" />
        </div>
      ))}
    </div>
  )
}

function EmptyState({ hasQuery, onReset }: { hasQuery: boolean; onReset: () => void }) {
  return (
    <div className="empty-state">
      <div className="empty-circle"><svg aria-hidden="true" width={32} height={32} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></svg></div>
      <h2>{hasQuery ? 'لم يُعثر على نتائج' : 'لا توجد بيانات بعد'}</h2>
      <p>{hasQuery ? 'لا يوجد هذا الكتاب بعد — هل تريد إضافته؟' : 'جرّب تغيير الفلاتر'}</p>
      <button className="primary-button" onClick={onReset}>إعادة ضبط الفلاتر</button>
    </div>
  )
}

function Dialog({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="dialog-backdrop" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="dialog">
        <div className="dialog-header">
          <h2>{title}</h2>
          <button className="icon-button" onClick={onClose} aria-label="إغلاق"><svg aria-hidden="true" width={17} height={17} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 6 12 12M18 6 6 18" /></svg></button>
        </div>
        <div className="dialog-body">{children}</div>
      </div>
    </div>
  )
}

function DetailBook({ book, onMosque }: { book: LiveBook; onMosque: () => void }) {
  return (
    <>
      <div className="detail-hero">
        <div className={`book-avatar ${catClass(book.category)}`}>{book.title[0]}</div>
        <div>
          {book.category && <span className={`category-badge ${catClass(book.category)}`}>{book.category}</span>}
          <h3>{book.title}</h3>
          <p>{book.author ?? 'مؤلف غير محدد'}</p>
          {book.edition && <small>{book.edition}</small>}
          {book.publisher && <small>دار النشر: {book.publisher}</small>}
        </div>
      </div>
      {book.extra_info && <section className="detail-section"><b>عن الكتاب</b><p>{book.extra_info}</p></section>}
      <section className="detail-section">
        <b>متاح في</b>
        <button className="detail-mosque" onClick={onMosque}>
          <span>🕌 <strong>{mosqueLabel(book.mosque_name, book.mosque_city)}</strong><small>{book.mosque_city}، {book.mosque_governorate} — {book.mosque_country}</small></span>
          <svg aria-hidden="true" width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 21s7-7.75 7-13a7 7 0 1 0-14 0c0 5.25 7 13 7 13Z" /><circle cx="12" cy="8" r="2.5" /></svg>
        </button>
      </section>
    </>
  )
}

function DetailMosque({ mosque, books: mosqueBooks, location, onBook }: { mosque: LiveMosque; books: LiveBook[]; location: Location | null; onBook: (b: LiveBook) => void }) {
  return (
    <>
      {mosque.mosque_image && (
        <div className="detail-mosque-image">
          <img src={mosque.mosque_image} alt={mosqueLabel(mosque.mosque_name, mosque.mosque_city)} />
        </div>
      )}
      <div className="mosque-detail-hero">
        <div className="mosque-icon">
          <svg aria-hidden="true" width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2c-1.5 0-2.5 1.5-2.5 3v2H7a3 3 0 0 0-3 3v10h16V10a3 3 0 0 0-3-3h-2.5V5c0-1.5-1-3-2.5-3Z" /><path d="M9 22v-7h6v7" />
          </svg>
        </div>
        <div>
          <h3>{mosqueLabel(mosque.mosque_name, mosque.mosque_city)}</h3>
          <p>{mosque.mosque_city}، {mosque.mosque_governorate} — {mosque.mosque_country}</p>
          <strong>{mosque.book_count} كتاب مُسجَّل</strong>
        </div>
      </div>
      <div className="mosque-stat-row">
        <span><strong>{mosque.book_count}</strong><small>كتاب</small></span>
        <span><strong>{new Set(mosqueBooks.map((b) => b.category)).size || '—'}</strong><small>تصنيف</small></span>
        <em className={location && location.governorate === mosque.mosque_governorate ? 'same' : ''}>
          {proximity(location, mosque.mosque_governorate)}
        </em>
      </div>
      <section className="detail-section">
        <b>الكتب المتاحة</b>
        <div className="detail-books-list">
          {mosqueBooks.length
            ? mosqueBooks.map((book) => (
              <button key={book.entry_id} onClick={() => onBook(book)}>
                <span className={`book-avatar ${catClass(book.category)}`}>{book.title[0]}</span>
                <span><strong>{book.title}</strong><small>{book.author ?? 'مؤلف غير محدد'}{book.edition ? ` · ${book.edition}` : ''}</small></span>
              </button>
            ))
            : <p style={{ color: 'var(--stone-500)', fontSize: 13 }}>لم يُسجَّل أي كتاب لهذا المسجد بعد.</p>
          }
        </div>
      </section>
    </>
  )
}
