import { useEffect, useMemo, useState } from 'react'
import { MapPicker } from '../onboarding/components/MapPicker'
import type { GeoPoint } from '../onboarding/types/location'

type View = 'books' | 'mosques'
type Category = 'فقه' | 'حديث' | 'تفسير' | 'سيرة' | 'عقيدة' | 'تزكية' | 'أدب' | 'تاريخ'

type Location = { governorate: string; city: string }
type Mosque = { id: number; name: string | null; city: string; governorate: string; count: number }
type Book = {
  id: number
  title: string
  author: string
  category: Category
  edition: string | null
  description: string
  mosque: Mosque
}

const CITIES: Record<string, string[]> = {
  المنيا: ['مدينة المنيا', 'ملوي', 'سمالوط', 'مغاغة', 'بني مزار', 'المطاهرة', 'أبو قرقاص'],
  القاهرة: ['مدينة نصر', 'المعادي', 'الزيتون', 'شبرا', 'حلوان', 'مصر الجديدة', 'العباسية'],
  الإسكندرية: ['المنتزه', 'سيدي بشر', 'اللبان', 'كرموز', 'العجمي', 'برج العرب'],
  أسيوط: ['مدينة أسيوط', 'ديروط', 'القوصية', 'البداري', 'أبو تيج', 'منفلوط'],
  سوهاج: ['مدينة سوهاج', 'أخميم', 'طهطا', 'جرجا', 'دار السلام', 'المراغة'],
  الجيزة: ['مدينة الجيزة', 'العياط', 'أطفيح', 'الصف', 'البدرشين', 'الحوامدية'],
}

const CATEGORIES: Category[] = ['فقه', 'حديث', 'تفسير', 'سيرة', 'عقيدة', 'تزكية', 'أدب', 'تاريخ']

const mosques: Mosque[] = [
  { id: 1, name: 'مسجد النور', city: 'مدينة المنيا', governorate: 'المنيا', count: 8 },
  { id: 2, name: 'مسجد الرحمة', city: 'ملوي', governorate: 'المنيا', count: 4 },
  { id: 3, name: 'مسجد الأنصار', city: 'مدينة أسيوط', governorate: 'أسيوط', count: 12 },
  { id: 4, name: 'مسجد التوحيد', city: 'مدينة نصر', governorate: 'القاهرة', count: 6 },
  { id: 5, name: 'مسجد السلام', city: 'المعادي', governorate: 'القاهرة', count: 3 },
  { id: 6, name: 'مسجد الهداية', city: 'سمالوط', governorate: 'المنيا', count: 15 },
  { id: 7, name: null, city: 'مدينة سوهاج', governorate: 'سوهاج', count: 5 },
  { id: 8, name: 'مسجد الإيمان', city: 'سيدي بشر', governorate: 'الإسكندرية', count: 7 },
]

const books: Book[] = [
  ['فقه السنة', 'السيد سابق', 'فقه', 'الطبعة الخامسة', 'من أشهر كتب الفقه الإسلامي المقارن، يشمل أبواب الطهارة والصلاة والصيام والحج والمعاملات.', 1],
  ['رياض الصالحين', 'الإمام النووي', 'حديث', null, 'جامع حديثي شامل يضم أحاديث النبي ﷺ في الآداب والأخلاق والأحكام.', 7],
  ['تفسير ابن كثير', 'ابن كثير الدمشقي', 'تفسير', 'طبعة دار طيبة', 'من أمهات كتب التفسير بالمأثور، يعتمد تفسير القرآن بالقرآن والسنة وأقوال الصحابة.', 2],
  ['السيرة النبوية', 'ابن هشام', 'سيرة', null, 'أشهر كتب السيرة، يُعدّ من أوثق المصادر التاريخية لسيرة النبي محمد ﷺ.', 3],
  ['العقيدة الطحاوية', 'الإمام الطحاوي', 'عقيدة', 'طبعة المكتب الإسلامي', 'متن مختصر في بيان اعتقاد أهل السنة والجماعة.', 4],
  ['إحياء علوم الدين', 'الإمام الغزالي', 'تزكية', null, 'موسوعة في الفقه والتصوف وعلم الأخلاق.', 5],
  ['ديوان المتنبي', 'أبو الطيب المتنبي', 'أدب', 'تحقيق عبد الوهاب عزام', 'الديوان الشعري الأشهر في تاريخ الأدب العربي.', 8],
  ['البداية والنهاية', 'ابن كثير الدمشقي', 'تاريخ', null, 'موسوعة تاريخية شاملة تركز على التاريخ الإسلامي.', 7],
  ['الموطأ', 'الإمام مالك بن أنس', 'حديث', 'رواية يحيى الليثي', 'أول كتاب في الحديث النبوي وُضع على وجه التبويب الفقهي.', 6],
  ['أسباب النزول', 'الواحدي النيسابوري', 'تفسير', 'تحقيق كمال بسيوني', 'الكتاب الأشمل في أسباب نزول آيات القرآن الكريم.', 8],
  ['زاد المعاد', 'ابن القيم الجوزية', 'تزكية', 'طبعة مؤسسة الرسالة', 'كتاب شامل في الطب النبوي والفقه والسلوك.', 4],
  ['مختصر القدوري', 'أبو الحسين القدوري', 'فقه', null, 'متن فقهي حنفي مختصر يُدرّس على نطاق واسع.', 3],
].map(([title, author, category, edition, description, mosqueId], index) => ({
  id: index + 1,
  title: title as string,
  author: author as string,
  category: category as Category,
  edition: edition as string | null,
  description: description as string,
  mosque: mosques.find((mosque) => mosque.id === mosqueId)!,
}))

function Icon({ name, size = 20 }: { name: 'book' | 'mosque' | 'user' | 'info' | 'search' | 'menu' | 'close' | 'location' | 'plus'; size?: number }) {
  const paths = {
    book: <><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" /></>,
    mosque: <><path d="M12 2c-1.5 0-2.5 1.5-2.5 3v2H7a3 3 0 0 0-3 3v10h16V10a3 3 0 0 0-3-3h-2.5V5c0-1.5-1-3-2.5-3Z" /><path d="M9 22v-7h6v7" /></>,
    user: <><circle cx="12" cy="8" r="3" /><path d="M5 21a7 7 0 0 1 14 0" /></>,
    info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></>,
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
    menu: <><path d="M4 6h16M4 12h16M4 18h16" /></>,
    close: <><path d="m6 6 12 12M18 6 6 18" /></>,
    location: <><path d="M12 21s7-7.75 7-13a7 7 0 1 0-14 0c0 5.25 7 13 7 13Z" /><circle cx="12" cy="8" r="2.5" /></>,
    plus: <><path d="M12 5v14M5 12h14" /></>,
  }
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>
}

function mosqueLabel(mosque: Mosque) {
  return mosque.name ?? `مسجد في ${mosque.city}`
}

function categoryClass(category: Category) {
  return `category-${CATEGORIES.indexOf(category)}`
}

export default function BrowsePage() {
  const [view, setView] = useState<View>('books')
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<Category | 'all'>('all')
  const [governorate, setGovernorate] = useState('all')
  const [city, setCity] = useState('all')
  const [location, setLocation] = useState<Location | null>(null)
  const [locationDraft, setLocationDraft] = useState<Location>({ governorate: 'المنيا', city: 'مدينة المنيا' })
  const [locationDraftPoint, setLocationDraftPoint] = useState<GeoPoint | null>(null)
  const [modal, setModal] = useState<'location' | 'book' | 'mosque' | null>(null)
  const [selectedBook, setSelectedBook] = useState<Book | null>(null)
  const [selectedMosque, setSelectedMosque] = useState<Mosque | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const timer = window.setTimeout(() => setLoading(false), 650)
    return () => window.clearTimeout(timer)
  }, [])

  const filteredBooks = useMemo(() => books.filter((book) => {
    const matchesQuery = !query || book.title.includes(query) || book.author.includes(query)
    const matchesCategory = category === 'all' || book.category === category
    const matchesGov = governorate === 'all' || book.mosque.governorate === governorate
    const matchesCity = city === 'all' || book.mosque.city === city
    return matchesQuery && matchesCategory && matchesGov && matchesCity
  }).sort((a, b) => location ? Number(b.mosque.governorate !== location.governorate) - Number(a.mosque.governorate !== location.governorate) : 0), [category, city, governorate, location, query])

  const filteredMosques = useMemo(() => mosques.filter((mosque) => {
    const matchesQuery = !query || mosque.name?.includes(query) || mosque.city.includes(query) || mosque.governorate.includes(query)
    return matchesQuery && (governorate === 'all' || mosque.governorate === governorate) && (city === 'all' || mosque.city === city)
  }).sort((a, b) => location ? Number(b.governorate !== location.governorate) - Number(a.governorate !== location.governorate) : 0), [city, governorate, location, query])

  const results = view === 'books' ? filteredBooks : filteredMosques
  const selectedMosqueBooks = selectedMosque ? books.filter((book) => book.mosque.id === selectedMosque.id) : []

  const updateGovernorate = (value: string) => {
    setGovernorate(value)
    setCity('all')
  }

  const resetFilters = () => {
    setQuery('')
    setCategory('all')
    setGovernorate('all')
    setCity('all')
  }

  const openBook = (book: Book) => { setSelectedBook(book); setModal('book') }
  const openMosque = (mosque: Mosque) => { setSelectedMosque(mosque); setModal('mosque') }

  return (
    <div className="browse-app" dir="rtl">
      <aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
        <div className="sidebar-header">
          <button className="icon-button sidebar-close" onClick={() => setSidebarOpen(false)} aria-label="إغلاق القائمة"><Icon name="close" /></button>
          <Brand />
        </div>
        <nav aria-label="روابط رئيسية">
          <NavItem icon="book" label="تصفح" active onClick={() => setSidebarOpen(false)} />
          <NavItem icon="plus" label="تسجيل كتاب" onClick={() => { window.location.assign('/submit') }} />
          <NavItem icon="info" label="طلبات التسجيل" onClick={() => { window.location.assign('/requests') }} />
          <NavItem icon="user" label="حسابي" onClick={() => undefined} />
          <NavItem icon="info" label="عن المنصة" onClick={() => undefined} />
        </nav>
      </aside>
      {sidebarOpen && <button className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} aria-label="إغلاق القائمة" />}

      <div className="page-shell">
        <header className="topbar">
          <div className="topbar-inner">
            <button className="icon-button menu-button" onClick={() => setSidebarOpen(true)} aria-label="فتح القائمة"><Icon name="menu" /></button>
            <Brand />
            <div className="topbar-actions"><a className="login-button" href="/login">تسجيل الدخول</a></div>
          </div>
        </header>

        <div className={`location-bar ${location ? '' : 'location-empty'}`} role="status" aria-live="polite">
          <div className="location-inner">
            <Icon name="location" size={17} />
            {location ? <p>الكتب المعروضة قريبة من: <strong>{location.city}، {location.governorate}</strong></p> : <p>حدّد موقعك لعرض الكتب القريبة منك أولاً</p>}
            <button className="location-action" onClick={() => { setLocationDraft(location ?? locationDraft); setLocationDraftPoint(null); setModal('location') }}>{location ? 'تغيير الموقع' : 'تحديد الموقع'}</button>
          </div>
        </div>

        <div className="stats-strip"><span><strong>{books.length}</strong> كتاب مُسجَّل</span><span><strong>{mosques.length}</strong> مسجد مُفهرَس</span><span><strong>{new Set(books.map((book) => book.mosque.governorate)).size}</strong> محافظات</span></div>

        <main className="browse-main">
          <section className="guest-banner">
            <div className="guest-icon"><Icon name="book" size={21} /></div>
            <div><strong>تعرف على كتاب في مسجد قريب؟</strong><p>ساهم في الفهرسة وأضف الكتب التي تراها على رفوف المساجد</p></div>
            <button className="primary-button compact" onClick={() => window.location.assign('/submit')}><Icon name="plus" size={16} /> تسجيل كتاب</button>
          </section>

          <div className="search-row">
            <label className="search-field"><Icon name="search" size={19} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={view === 'books' ? 'ابحث بعنوان الكتاب أو اسم المؤلف...' : 'ابحث باسم المسجد أو المدينة أو المحافظة...'} aria-label="بحث" /></label>
            <button className="primary-button search-button">بحث</button>
          </div>

          <div className={`category-tabs ${view === 'mosques' ? 'is-hidden' : ''}`} role="group" aria-label="تصفية حسب التصنيف">
            <button className={category === 'all' ? 'active' : ''} onClick={() => setCategory('all')}>الكل</button>
            {CATEGORIES.map((item) => <button key={item} className={category === item ? 'active' : ''} onClick={() => setCategory(item)}>{item}</button>)}
          </div>

          <div className="filter-row"><span className="filter-label">تصفية:</span><select value={governorate} onChange={(event) => updateGovernorate(event.target.value)} aria-label="المحافظة"><option value="all">كل المحافظات</option>{Object.keys(CITIES).map((item) => <option key={item} value={item}>{item}</option>)}</select><select value={city} onChange={(event) => setCity(event.target.value)} aria-label="المدينة"><option value="all">كل المدن</option>{(governorate === 'all' ? Object.values(CITIES).flat() : CITIES[governorate] ?? []).map((item) => <option key={item} value={item}>{item}</option>)}</select></div>

          <div className="toolbar"><div className="view-toggle"><button className={view === 'books' ? 'active' : ''} onClick={() => { setView('books'); setCategory('all') }}><Icon name="book" size={16} /> كتب</button><button className={view === 'mosques' ? 'active' : ''} onClick={() => { setView('mosques'); setCategory('all') }}><Icon name="mosque" size={16} /> مساجد</button></div><p className="results-meta">عرض <strong>{results.length}</strong> {view === 'books' ? 'كتاب' : 'مسجد'}</p></div>

          {loading ? <SkeletonGrid /> : results.length ? <div className="cards-grid">{view === 'books' ? filteredBooks.map((book) => <BookCard key={book.id} book={book} location={location} onClick={() => openBook(book)} />) : filteredMosques.map((mosque) => <MosqueCard key={mosque.id} mosque={mosque} location={location} onClick={() => openMosque(mosque)} />)}</div> : <EmptyState hasQuery={Boolean(query)} onReset={resetFilters} />}
        </main>

        <footer><strong>على رفوف المساجد</strong><br />مبادرة مجتمعية مفتوحة لرقمنة مكتبات المساجد في مصر</footer>
      </div>

      {modal === 'location' && <Dialog title="تغيير موقعك" onClose={() => setModal(null)}><p className="dialog-note">اختر موقعك على الخريطة أو حدّد المحافظة والمدينة. سيُطبّق الاختيار مباشرة على النتائج.</p><MapPicker point={locationDraftPoint} onPick={setLocationDraftPoint} className="h-56" /><label>المحافظة<select value={locationDraft.governorate} onChange={(event) => setLocationDraft({ governorate: event.target.value, city: CITIES[event.target.value]?.[0] ?? '' })}>{Object.keys(CITIES).map((item) => <option key={item}>{item}</option>)}</select></label><label>المدينة / المركز<select value={locationDraft.city} onChange={(event) => setLocationDraft({ ...locationDraft, city: event.target.value })}>{(CITIES[locationDraft.governorate] ?? []).map((item) => <option key={item}>{item}</option>)}</select></label><div className="dialog-actions"><button className="secondary-button" onClick={() => setModal(null)}>إلغاء</button><button className="primary-button" onClick={() => { setLocation(locationDraft); setGovernorate(locationDraft.governorate); setCity(locationDraft.city); setModal(null) }}>حفظ الموقع</button></div></Dialog>}
      {modal === 'book' && selectedBook && <Dialog title="تفاصيل الكتاب" onClose={() => setModal(null)}><DetailBook book={selectedBook} onMosque={() => openMosque(selectedBook.mosque)} /></Dialog>}
      {modal === 'mosque' && selectedMosque && <Dialog title={mosqueLabel(selectedMosque)} onClose={() => setModal(null)}><DetailMosque mosque={selectedMosque} books={selectedMosqueBooks} location={location} onBook={openBook} /></Dialog>}
    </div>
  )
}

function Brand() { return <a className="brand" href="/" aria-label="على رفوف المساجد"><span className="brand-mark"><Icon name="book" size={22} /></span><span><strong>على رفوف المساجد</strong><small>مكتبات المساجد في مكان واحد</small></span></a> }
function NavItem({ icon, label, active, onClick }: { icon: 'book' | 'plus' | 'user' | 'info'; label: string; active?: boolean; onClick: () => void }) { return <button className={`nav-item ${active ? 'active' : ''}`} onClick={onClick}><Icon name={icon} /><span>{label}</span></button> }
function distance(location: Location | null, governorate: string) { return !location ? governorate : governorate === location.governorate ? '● نفس محافظتك' : governorate }
function BookCard({ book, location, onClick }: { book: Book; location: Location | null; onClick: () => void }) { return <article className="book-card" onClick={onClick} onKeyDown={(event) => { if (event.key === 'Enter') onClick() }} tabIndex={0}><div className={`book-avatar ${categoryClass(book.category)}`}>{book.title[0]}</div><div className="book-info"><span className={`category-badge ${categoryClass(book.category)}`}>{book.category}</span><h3>{book.title}</h3><p>{book.author}</p>{book.edition && <small>{book.edition}</small>}</div><div className="card-footer"><span><strong>{mosqueLabel(book.mosque)}</strong><small>{book.mosque.city}، {book.mosque.governorate}</small></span><em className={location && location.governorate === book.mosque.governorate ? 'same' : ''}>{distance(location, book.mosque.governorate)}</em></div></article> }
function MosqueCard({ mosque, location, onClick }: { mosque: Mosque; location: Location | null; onClick: () => void }) { return <article className="mosque-card" onClick={onClick} onKeyDown={(event) => { if (event.key === 'Enter') onClick() }} tabIndex={0}><div className="mosque-card-top"><div className="mosque-icon"><Icon name="mosque" size={25} /></div><div><h3>{mosqueLabel(mosque)}</h3><p>{mosque.city}، محافظة {mosque.governorate}</p></div></div><div className="card-footer"><strong>{mosque.count} <small>كتاب مُسجَّل</small></strong><em className={location && location.governorate === mosque.governorate ? 'same' : ''}>{distance(location, mosque.governorate)}</em></div></article> }
function SkeletonGrid() { return <div className="cards-grid">{Array.from({ length: 6 }, (_, index) => <div className="skeleton-card" key={index}><div className="skeleton skeleton-large" /><div className="skeleton skeleton-line" /><div className="skeleton skeleton-line short" /><div className="skeleton skeleton-footer" /></div>)}</div> }
function EmptyState({ hasQuery, onReset }: { hasQuery: boolean; onReset: () => void }) { return <div className="empty-state"><div className="empty-circle"><Icon name="search" size={32} /></div><h2>{hasQuery ? 'لم يُعثر على نتائج' : 'لم يُعثر على نتائج'}</h2><p>{hasQuery ? 'لا يوجد هذا الكتاب في قاعدة بياناتنا بعد — هل تريد إضافته؟' : 'جرّب تغيير كلمات البحث أو إزالة بعض الفلاتر'}</p><button className="primary-button" onClick={onReset}>إعادة ضبط الفلاتر</button></div> }
function Dialog({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) { return <div className="dialog-backdrop" role="dialog" aria-modal="true" aria-label={title} onClick={(event) => { if (event.target === event.currentTarget) onClose() }}><div className="dialog"><div className="dialog-header"><h2>{title}</h2><button className="icon-button" onClick={onClose} aria-label="إغلاق"><Icon name="close" size={17} /></button></div><div className="dialog-body">{children}</div></div></div> }
function DetailBook({ book, onMosque }: { book: Book; onMosque: () => void }) { return <><div className="detail-hero"><div className={`book-avatar ${categoryClass(book.category)}`}>{book.title[0]}</div><div><span className={`category-badge ${categoryClass(book.category)}`}>{book.category}</span><h3>{book.title}</h3><p>{book.author}</p>{book.edition && <small>{book.edition}</small>}</div></div><section className="detail-section"><b>عن الكتاب</b><p>{book.description}</p></section><section className="detail-section"><b>متاح في</b><button className="detail-mosque" onClick={onMosque}><span>🕌 <strong>{mosqueLabel(book.mosque)}</strong><small>{book.mosque.city}، محافظة {book.mosque.governorate}</small></span><Icon name="location" size={18} /></button></section></> }
function DetailMosque({ mosque, books: mosqueBooks, location, onBook }: { mosque: Mosque; books: Book[]; location: Location | null; onBook: (book: Book) => void }) { return <><div className="mosque-detail-hero"><div className="mosque-icon"><Icon name="mosque" size={28} /></div><div><h3>{mosqueLabel(mosque)}</h3><p>{mosque.city}، محافظة {mosque.governorate}</p><strong>{mosque.count} كتاب مُسجَّل</strong></div></div><div className="mosque-stat-row"><span><strong>{mosque.count}</strong><small>كتاب</small></span><span><strong>{new Set(mosqueBooks.map((book) => book.category)).size || '—'}</strong><small>تصنيف</small></span><em className={location && location.governorate === mosque.governorate ? 'same' : ''}>{distance(location, mosque.governorate)}</em></div><section className="detail-section"><b>الكتب المتاحة في هذا المسجد</b><div className="detail-books-list">{mosqueBooks.map((book) => <button key={book.id} onClick={() => onBook(book)}><span className={`book-avatar ${categoryClass(book.category)}`}>{book.title[0]}</span><span><strong>{book.title}</strong><small>{book.author}{book.edition ? ` · ${book.edition}` : ''}</small></span></button>)}</div></section></> }
