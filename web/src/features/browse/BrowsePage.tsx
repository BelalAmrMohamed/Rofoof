import { useEffect, useMemo, useRef, useState } from 'react'
import { MapPicker } from '../onboarding/components/MapPicker'
import type { GeoPoint } from '../onboarding/types/location'
import { supabase } from '../../lib/supabase'
import { SiteNavigation } from '../../components/SiteNavigation'

// ── Types ──────────────────────────────────────────────────────────────────

type View = 'books' | 'mosques'
type Category = 'فقه' | 'حديث' | 'تفسير' | 'سيرة' | 'عقيدة' | 'تزكية' | 'أدب' | 'تاريخ' | 'أخرى'
type Location = { governorate: string; city: string }

type LiveBook = {
  entry_id: string
  book_id: string
  title: string
  author: string | null
  category: Category | null
  extra_info: string | null
  edition: string | null
  publisher: string | null
  mosque_id: string
  mosque_name: string | null
  mosque_governorate: string
  mosque_city: string
}

type LiveMosque = {
  mosque_id: string
  mosque_name: string | null
  mosque_governorate: string
  mosque_city: string
  book_count: number
}

const CATEGORIES: Category[] = ['فقه', 'حديث', 'تفسير', 'سيرة', 'عقيدة', 'تزكية', 'أدب', 'تاريخ', 'أخرى']

// ── Helpers ────────────────────────────────────────────────────────────────

function mosqueLabel(name: string | null, city: string) { return name ?? `مسجد في ${city}` }
function categoryIndex(cat: Category | null) { return cat ? CATEGORIES.indexOf(cat) : -1 }
function categoryClass(cat: Category | null) { const i = categoryIndex(cat); return i >= 0 ? `category-${i}` : '' }

function Icon({ name, size = 20 }: { name: 'book' | 'mosque' | 'search' | 'close' | 'location' | 'plus' | 'info' | 'filter' | 'user'; size?: number }) {
  const paths: Record<string, React.ReactNode> = {
    book: <><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" /></>,
    mosque: <><path d="M12 2c-1.5 0-2.5 1.5-2.5 3v2H7a3 3 0 0 0-3 3v10h16V10a3 3 0 0 0-3-3h-2.5V5c0-1.5-1-3-2.5-3Z" /><path d="M9 22v-7h6v7" /></>,
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
    close: <><path d="m6 6 12 12M18 6 6 18" /></>,
    location: <><path d="M12 21s7-7.75 7-13a7 7 0 1 0-14 0c0 5.25 7 13 7 13Z" /><circle cx="12" cy="8" r="2.5" /></>,
    plus: <><path d="M12 5v14M5 12h14" /></>,
    info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></>,
    filter: <><path d="M22 3H2l8 9.46V19l4 2V12.46L22 3z" /></>,
    user: <><circle cx="12" cy="8" r="3" /><path d="M5 21a7 7 0 0 1 14 0" /></>,
  }
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>
}

// ── Main Page ──────────────────────────────────────────────────────────────

export default function BrowsePage() {
  // ── Data state
  const [books, setBooks] = useState<LiveBook[]>([])
  const [mosquesRaw, setMosquesRaw] = useState<LiveMosque[]>([])
  const [loading, setLoading] = useState(true)
  const [dataError, setDataError] = useState<string | null>(null)

  // ── Filter state
  const [view, setView] = useState<View>('books')
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<Category | 'all'>('all')
  const [governorate, setGovernorate] = useState('all')
  const [city, setCity] = useState('all')

  // ── Location state
  const [location, setLocation] = useState<Location | null>(null)
  const [locationDraft, setLocationDraft] = useState<Location>({ governorate: 'المنيا', city: 'مدينة المنيا' })
  const [locationDraftPoint, setLocationDraftPoint] = useState<GeoPoint | null>(null)

  // ── Modal state
  const [modal, setModal] = useState<'location' | 'book' | 'mosque' | null>(null)
  const [selectedBook, setSelectedBook] = useState<LiveBook | null>(null)
  const [selectedMosque, setSelectedMosque] = useState<LiveMosque | null>(null)

  // ── Load live data from Supabase ───────────────────────────────────────
  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      setDataError('إعدادات Supabase غير موجودة.')
      return
    }

    let cancelled = false

    async function load() {
      if (!supabase) return
      try {
        // Books: join mosque_books → books → mosques, approved only
        const { data: booksData, error: booksError } = await supabase
          .from('mosque_books')
          .select(`
            id,
            edition,
            publisher,
            books!inner ( book_id, title, author, category, extra_info ),
            mosques!inner ( mosque_id, mosque_name, mosque_governorate, mosque_city )
          `)
          .eq('status', 'approved')
          .order('created_at', { ascending: false })
          .limit(500)

        if (booksError) throw booksError

        // Mosques with book counts
        const { data: mosquesData, error: mosquesError } = await supabase
          .from('mosques')
          .select('mosque_id, mosque_name, mosque_governorate, mosque_city')
          .order('created_at', { ascending: false })
          .limit(300)

        if (mosquesError) throw mosquesError

        if (cancelled) return

        // Flatten joined book rows
        const flatBooks: LiveBook[] = (booksData ?? []).map((row: any) => ({
          entry_id: row.id,
          book_id: row.books.book_id,
          title: row.books.title,
          author: row.books.author,
          category: row.books.category,
          extra_info: row.books.extra_info,
          edition: row.edition,
          publisher: row.publisher,
          mosque_id: row.mosques.mosque_id,
          mosque_name: row.mosques.mosque_name,
          mosque_governorate: row.mosques.mosque_governorate,
          mosque_city: row.mosques.mosque_city,
        }))

        // Build mosque list with approved book counts
        const bookCountByMosque: Record<string, number> = {}
        for (const b of flatBooks) {
          bookCountByMosque[b.mosque_id] = (bookCountByMosque[b.mosque_id] ?? 0) + 1
        }

        const flatMosques: LiveMosque[] = (mosquesData ?? []).map((m: any) => ({
          mosque_id: m.mosque_id,
          mosque_name: m.mosque_name,
          mosque_governorate: m.mosque_governorate,
          mosque_city: m.mosque_city,
          book_count: bookCountByMosque[m.mosque_id] ?? 0,
        }))

        setBooks(flatBooks)
        setMosquesRaw(flatMosques)
      } catch (err: any) {
        if (!cancelled) setDataError(err?.message ?? 'تعذر تحميل البيانات.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => { cancelled = true }
  }, [])

  // ── Derived geo filter data ────────────────────────────────────────────
  const governorates = useMemo(() => {
    const govSet = new Set<string>()
    for (const m of mosquesRaw) govSet.add(m.mosque_governorate)
    return Array.from(govSet).sort()
  }, [mosquesRaw])

  const cities = useMemo(() => {
    if (governorate === 'all') return []
    const citySet = new Set<string>()
    for (const m of mosquesRaw) {
      if (m.mosque_governorate === governorate) citySet.add(m.mosque_city)
    }
    return Array.from(citySet).sort()
  }, [mosquesRaw, governorate])

  // ── Stats ──────────────────────────────────────────────────────────────
  const stats = useMemo(() => ({
    books: books.length,
    mosques: mosquesRaw.length,
    governorates: new Set(mosquesRaw.map((m) => m.mosque_governorate)).size,
  }), [books, mosquesRaw])

  // ── Filtered results ───────────────────────────────────────────────────
  const filteredBooks = useMemo(() => books.filter((book) => {
    const matchesQuery = !query || book.title.includes(query) || (book.author ?? '').includes(query)
    const matchesCategory = category === 'all' || book.category === category
    const matchesGov = governorate === 'all' || book.mosque_governorate === governorate
    const matchesCity = city === 'all' || book.mosque_city === city
    return matchesQuery && matchesCategory && matchesGov && matchesCity
  }).sort((a, b) => location ? Number(b.mosque_governorate !== location.governorate) - Number(a.mosque_governorate !== location.governorate) : 0), [books, category, city, governorate, location, query])

  const filteredMosques = useMemo(() => mosquesRaw.filter((mosque) => {
    const matchesQuery = !query || (mosque.mosque_name ?? '').includes(query) || mosque.mosque_city.includes(query) || mosque.mosque_governorate.includes(query)
    return matchesQuery && (governorate === 'all' || mosque.mosque_governorate === governorate) && (city === 'all' || mosque.mosque_city === city)
  }).sort((a, b) => location ? Number(b.mosque_governorate !== location.governorate) - Number(a.mosque_governorate !== location.governorate) : 0), [mosquesRaw, city, governorate, location, query])

  const results = view === 'books' ? filteredBooks : filteredMosques

  // ── Books in the selected mosque (for mosque detail modal) ─────────────
  const selectedMosqueBooks = useMemo(() =>
    selectedMosque ? books.filter((b) => b.mosque_id === selectedMosque.mosque_id) : []
  , [books, selectedMosque])

  // ── Location modal city list derived from live data ────────────────────
  const locationDraftCities = useMemo(() => {
    if (!locationDraft.governorate) return []
    const citySet = new Set<string>()
    for (const m of mosquesRaw) {
      if (m.mosque_governorate === locationDraft.governorate) citySet.add(m.mosque_city)
    }
    return Array.from(citySet).sort()
  }, [mosquesRaw, locationDraft.governorate])

  // ── Handlers ───────────────────────────────────────────────────────────
  const updateGovernorate = (value: string) => { setGovernorate(value); setCity('all') }
  const resetFilters = () => { setQuery(''); setCategory('all'); setGovernorate('all'); setCity('all') }
  const openBook = (book: LiveBook) => { setSelectedBook(book); setModal('book') }
  const openMosque = (mosque: LiveMosque) => { setSelectedMosque(mosque); setModal('mosque') }

  // ── Filter bar sticky ref ──────────────────────────────────────────────
  const filterBarRef = useRef<HTMLDivElement>(null)

  return (
    <div className="browse-app" dir="rtl">
      <SiteNavigation active="browse" />
      <div className="page-shell site-content">

        {/* ── Hero Row: Stats/CTA left + Location right ── */}
        <div className="browse-hero">
          {/* Left: Stats + CTA */}
          <div className="browse-hero-start">
            <div className="hero-stats-card">
              <div className="hero-stats-row">
                <div className="hero-stat">
                  <strong>{loading ? '—' : stats.books}</strong>
                  <span>كتاب مُسجَّل</span>
                </div>
                <div className="hero-stat-divider" />
                <div className="hero-stat">
                  <strong>{loading ? '—' : stats.mosques}</strong>
                  <span>مسجد مُفهرَس</span>
                </div>
                <div className="hero-stat-divider" />
                <div className="hero-stat">
                  <strong>{loading ? '—' : stats.governorates}</strong>
                  <span>محافظات</span>
                </div>
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

          {/* Right: Location banner */}
          <div className="browse-hero-end">
            <div className={`location-hero-card ${location ? 'has-location' : ''}`}>
              <div className="location-hero-icon"><Icon name="location" size={26} /></div>
              <div className="location-hero-body">
                {location
                  ? <><strong>الكتب القريبة من:</strong><p>{location.city}، {location.governorate}</p></>
                  : <><strong>حدّد موقعك</strong><p>لعرض الكتب القريبة منك أولاً</p></>
                }
              </div>
              <button className="location-hero-btn" onClick={() => { setLocationDraft(location ?? locationDraft); setLocationDraftPoint(null); setModal('location') }}>
                {location ? 'تغيير' : 'تحديد الموقع'}
              </button>
            </div>
          </div>
        </div>

        {/* ── Unified Sticky Filter Bar ── */}
        <div className="filter-bar" ref={filterBarRef} role="search" aria-label="فلاتر البحث">
          <div className="filter-bar-inner">
            {/* View toggle */}
            <div className="view-toggle" role="group" aria-label="نوع العرض">
              <button className={view === 'books' ? 'active' : ''} onClick={() => { setView('books'); setCategory('all') }}>
                <Icon name="book" size={15} /> كتب
              </button>
              <button className={view === 'mosques' ? 'active' : ''} onClick={() => { setView('mosques'); setCategory('all') }}>
                <Icon name="mosque" size={15} /> مساجد
              </button>
            </div>

            {/* Search input */}
            <label className="filter-search-field">
              <Icon name="search" size={17} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={view === 'books' ? 'ابحث بعنوان الكتاب أو المؤلف...' : 'ابحث باسم المسجد أو المدينة...'}
                aria-label="بحث"
              />
            </label>

            {/* Governorate */}
            <select value={governorate} onChange={(e) => updateGovernorate(e.target.value)} aria-label="المحافظة" className="filter-select">
              <option value="all">كل المحافظات</option>
              {governorates.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>

            {/* City — only when a governorate is selected */}
            {governorate !== 'all' && (
              <select value={city} onChange={(e) => setCity(e.target.value)} aria-label="المدينة" className="filter-select">
                <option value="all">كل المدن</option>
                {cities.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            )}

            {/* Category pills — books view only */}
            {view === 'books' && (
              <div className="filter-category-strip" role="group" aria-label="تصفية حسب التصنيف">
                <button className={category === 'all' ? 'active' : ''} onClick={() => setCategory('all')}>الكل</button>
                {CATEGORIES.map((item) => (
                  <button key={item} className={category === item ? 'active' : ''} onClick={() => setCategory(item)}>{item}</button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Results Meta ── */}
        <div className="results-bar">
          <p className="results-meta">
            {loading ? 'جارٍ التحميل...' : <>عرض <strong>{results.length}</strong> {view === 'books' ? 'كتاب' : 'مسجد'}</>}
          </p>
        </div>

        {/* ── Content Grid ── */}
        <main className="browse-main">
          {dataError && (
            <div className="data-error-banner" role="alert">
              <Icon name="info" size={18} /> {dataError}
            </div>
          )}
          {loading
            ? <SkeletonGrid />
            : results.length
              ? (
                <div className="cards-grid">
                  {view === 'books'
                    ? filteredBooks.map((book) => <BookCard key={book.entry_id} book={book} location={location} onClick={() => openBook(book)} />)
                    : filteredMosques.map((mosque) => <MosqueCard key={mosque.mosque_id} mosque={mosque} location={location} onClick={() => openMosque(mosque)} />)
                  }
                </div>
              )
              : <EmptyState hasQuery={Boolean(query)} onReset={resetFilters} />
          }
        </main>

        <footer><strong>على رفوف المساجد</strong><br />مبادرة مجتمعية مفتوحة لرقمنة مكتبات المساجد في مصر</footer>
      </div>

      {/* ── Modals ── */}
      {modal === 'location' && (
        <Dialog title="تغيير موقعك" onClose={() => setModal(null)}>
          <p className="dialog-note">اختر موقعك على الخريطة أو حدّد المحافظة والمدينة. سيُطبّق الاختيار مباشرة على النتائج.</p>
          <MapPicker point={locationDraftPoint} onPick={setLocationDraftPoint} className="h-56" />
          <label>
            المحافظة
            <select value={locationDraft.governorate} onChange={(e) => setLocationDraft({ governorate: e.target.value, city: '' })}>
              {governorates.map((g) => <option key={g}>{g}</option>)}
            </select>
          </label>
          <label>
            المدينة / المركز
            <select value={locationDraft.city} onChange={(e) => setLocationDraft({ ...locationDraft, city: e.target.value })}>
              <option value="">اختر مدينة</option>
              {locationDraftCities.map((c) => <option key={c}>{c}</option>)}
            </select>
          </label>
          <div className="dialog-actions">
            <button className="secondary-button" onClick={() => setModal(null)}>إلغاء</button>
            <button className="primary-button" onClick={() => { setLocation(locationDraft); setGovernorate(locationDraft.governorate); setCity(locationDraft.city || 'all'); setModal(null) }}>حفظ الموقع</button>
          </div>
        </Dialog>
      )}
      {modal === 'book' && selectedBook && (
        <Dialog title="تفاصيل الكتاب" onClose={() => setModal(null)}>
          <DetailBook book={selectedBook} onMosque={() => { const m = filteredMosques.find((x) => x.mosque_id === selectedBook.mosque_id) ?? { mosque_id: selectedBook.mosque_id, mosque_name: selectedBook.mosque_name, mosque_governorate: selectedBook.mosque_governorate, mosque_city: selectedBook.mosque_city, book_count: 0 }; openMosque(m) }} />
        </Dialog>
      )}
      {modal === 'mosque' && selectedMosque && (
        <Dialog title={mosqueLabel(selectedMosque.mosque_name, selectedMosque.mosque_city)} onClose={() => setModal(null)}>
          <DetailMosque mosque={selectedMosque} books={selectedMosqueBooks} location={location} onBook={openBook} />
        </Dialog>
      )}
    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────

function distance(location: Location | null, governorate: string) {
  return !location ? governorate : governorate === location.governorate ? '● نفس محافظتك' : governorate
}

function BookCard({ book, location, onClick }: { book: LiveBook; location: Location | null; onClick: () => void }) {
  return (
    <article className="book-card" onClick={onClick} onKeyDown={(e) => { if (e.key === 'Enter') onClick() }} tabIndex={0}>
      <div className={`book-avatar ${categoryClass(book.category)}`}>{book.title[0]}</div>
      <div className="book-info">
        {book.category && <span className={`category-badge ${categoryClass(book.category)}`}>{book.category}</span>}
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
          {distance(location, book.mosque_governorate)}
        </em>
      </div>
    </article>
  )
}

function MosqueCard({ mosque, location, onClick }: { mosque: LiveMosque; location: Location | null; onClick: () => void }) {
  return (
    <article className="mosque-card" onClick={onClick} onKeyDown={(e) => { if (e.key === 'Enter') onClick() }} tabIndex={0}>
      <div className="mosque-card-top">
        <div className="mosque-icon">
          <svg aria-hidden="true" width={25} height={25} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2c-1.5 0-2.5 1.5-2.5 3v2H7a3 3 0 0 0-3 3v10h16V10a3 3 0 0 0-3-3h-2.5V5c0-1.5-1-3-2.5-3Z" />
            <path d="M9 22v-7h6v7" />
          </svg>
        </div>
        <div>
          <h3>{mosqueLabel(mosque.mosque_name, mosque.mosque_city)}</h3>
          <p>{mosque.mosque_city}، محافظة {mosque.mosque_governorate}</p>
        </div>
      </div>
      <div className="card-footer">
        <strong>{mosque.book_count} <small>كتاب مُسجَّل</small></strong>
        <em className={location && location.governorate === mosque.mosque_governorate ? 'same' : ''}>
          {distance(location, mosque.mosque_governorate)}
        </em>
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
      <div className="empty-circle">
        <svg aria-hidden="true" width={32} height={32} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" />
        </svg>
      </div>
      <h2>{hasQuery ? 'لم يُعثر على نتائج' : 'لا توجد بيانات بعد'}</h2>
      <p>{hasQuery ? 'لا يوجد هذا الكتاب في قاعدة بياناتنا بعد — هل تريد إضافته؟' : 'جرّب تغيير كلمات البحث أو إزالة بعض الفلاتر'}</p>
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
          <button className="icon-button" onClick={onClose} aria-label="إغلاق">
            <svg aria-hidden="true" width={17} height={17} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m6 6 12 12M18 6 6 18" />
            </svg>
          </button>
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
        <div className={`book-avatar ${categoryClass(book.category)}`}>{book.title[0]}</div>
        <div>
          {book.category && <span className={`category-badge ${categoryClass(book.category)}`}>{book.category}</span>}
          <h3>{book.title}</h3>
          <p>{book.author ?? 'مؤلف غير محدد'}</p>
          {book.edition && <small>{book.edition}</small>}
          {book.publisher && <small>دار النشر: {book.publisher}</small>}
        </div>
      </div>
      {book.extra_info && (
        <section className="detail-section">
          <b>عن الكتاب</b>
          <p>{book.extra_info}</p>
        </section>
      )}
      <section className="detail-section">
        <b>متاح في</b>
        <button className="detail-mosque" onClick={onMosque}>
          <span>
            🕌 <strong>{mosqueLabel(book.mosque_name, book.mosque_city)}</strong>
            <small>{book.mosque_city}، محافظة {book.mosque_governorate}</small>
          </span>
          <svg aria-hidden="true" width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 21s7-7.75 7-13a7 7 0 1 0-14 0c0 5.25 7 13 7 13Z" /><circle cx="12" cy="8" r="2.5" />
          </svg>
        </button>
      </section>
    </>
  )
}

function DetailMosque({ mosque, books: mosqueBooks, location, onBook }: { mosque: LiveMosque; books: LiveBook[]; location: Location | null; onBook: (b: LiveBook) => void }) {
  return (
    <>
      <div className="mosque-detail-hero">
        <div className="mosque-icon">
          <svg aria-hidden="true" width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2c-1.5 0-2.5 1.5-2.5 3v2H7a3 3 0 0 0-3 3v10h16V10a3 3 0 0 0-3-3h-2.5V5c0-1.5-1-3-2.5-3Z" />
            <path d="M9 22v-7h6v7" />
          </svg>
        </div>
        <div>
          <h3>{mosqueLabel(mosque.mosque_name, mosque.mosque_city)}</h3>
          <p>{mosque.mosque_city}، محافظة {mosque.mosque_governorate}</p>
          <strong>{mosque.book_count} كتاب مُسجَّل</strong>
        </div>
      </div>
      <div className="mosque-stat-row">
        <span><strong>{mosque.book_count}</strong><small>كتاب</small></span>
        <span><strong>{new Set(mosqueBooks.map((b) => b.category)).size || '—'}</strong><small>تصنيف</small></span>
        <em className={location && location.governorate === mosque.mosque_governorate ? 'same' : ''}>
          {distance(location, mosque.mosque_governorate)}
        </em>
      </div>
      <section className="detail-section">
        <b>الكتب المتاحة في هذا المسجد</b>
        <div className="detail-books-list">
          {mosqueBooks.length
            ? mosqueBooks.map((book) => (
              <button key={book.entry_id} onClick={() => onBook(book)}>
                <span className={`book-avatar ${categoryClass(book.category)}`}>{book.title[0]}</span>
                <span>
                  <strong>{book.title}</strong>
                  <small>{book.author ?? 'مؤلف غير محدد'}{book.edition ? ` · ${book.edition}` : ''}</small>
                </span>
              </button>
            ))
            : <p style={{ color: 'var(--stone-500)', fontSize: 13 }}>لم يُسجَّل أي كتاب لهذا المسجد بعد.</p>
          }
        </div>
      </section>
    </>
  )
}
