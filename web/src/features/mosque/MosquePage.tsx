// web/src/features/mosque/MosquePage.tsx
import { useEffect, useMemo, useState } from 'react'
import { SiteNavigation } from '../../components/SiteNavigation'
import { MosqueMap } from '../../components/MosqueMap'
import { supabase } from '../../lib/supabase'
import { buildMosqueSchema, setPageMeta } from '../../lib/seo'

type Category = 'فقه' | 'حديث' | 'تفسير' | 'سيرة' | 'عقيدة' | 'تزكية' | 'أدب' | 'تاريخ' | 'أخرى'
const CATEGORIES: Category[] = ['فقه', 'حديث', 'تفسير', 'سيرة', 'عقيدة', 'تزكية', 'أدب', 'تاريخ', 'أخرى']
function catIdx(cat: Category | null) { return cat ? CATEGORIES.indexOf(cat) : -1 }
function catClass(cat: Category | null) { const i = catIdx(cat); return i >= 0 ? `category-${i}` : '' }

type MosqueDetail = {
  mosque_id: string
  mosque_name: string | null
  mosque_governorate: string
  mosque_city: string
  mosque_country: string
  mosque_lat: number
  mosque_lng: number
  images: string[]
}

type MosqueBook = {
  entry_id: string; title: string; author: string | null; category: Category | null
  edition: string | null
}

function mosqueLabel(name: string | null, city: string) { return name ?? `مسجد في ${city}` }

// Extracted from the URL path, e.g. /mosques/<uuid>
function getMosqueIdFromPath() {
  const match = window.location.pathname.match(/^\/mosques\/([^/]+)/)
  return match ? decodeURIComponent(match[1]) : null
}

export default function MosquePage() {
  const mosqueId = useMemo(getMosqueIdFromPath, [])
  const [mosque, setMosque] = useState<MosqueDetail | null>(null)
  const [books, setBooks] = useState<MosqueBook[]>([])
  const [activeImage, setActiveImage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!mosqueId || !supabase) { setLoading(false); setNotFound(true); return }
    let cancelled = false
    async function load() {
      if (!supabase) return
      const [mosqueRes, imagesRes, booksRes] = await Promise.all([
        supabase.from('mosques')
          .select('mosque_id, mosque_name, mosque_governorate, mosque_city, country, mosque_lat, mosque_lng, mosque_image')
          .eq('mosque_id', mosqueId)
          .maybeSingle(),
        supabase.from('mosque_images')
          .select('image_url')
          .eq('mosque_id', mosqueId)
          .order('sort_order', { ascending: true }),
        supabase.from('mosque_books')
          .select('id, edition, books!inner(title, author, category)')
          .eq('mosque_id', mosqueId)
          .eq('status', 'approved'),
      ])
      if (cancelled) return
      if (!mosqueRes.data) { setNotFound(true); setLoading(false); return }

      const m = mosqueRes.data as any
      const images = (imagesRes.data ?? []).map((r: any) => r.image_url as string)
      setMosque({
        mosque_id: m.mosque_id, mosque_name: m.mosque_name,
        mosque_governorate: m.mosque_governorate, mosque_city: m.mosque_city,
        mosque_country: m.country ?? 'مصر', mosque_lat: m.mosque_lat, mosque_lng: m.mosque_lng,
        images: images.length ? images : (m.mosque_image ? [m.mosque_image] : []),
      })
      setBooks((booksRes.data ?? []).map((row: any) => ({
        entry_id: row.id, title: row.books.title, author: row.books.author,
        category: row.books.category, edition: row.edition,
      })))
      setLoading(false)
    }
    void load()
    return () => { cancelled = true }
  }, [mosqueId])

  useEffect(() => {
    if (!mosque) return
    setPageMeta({
      title: `${mosqueLabel(mosque.mosque_name, mosque.mosque_city)} — على رفوف المساجد`,
      description: `${books.length} كتاب مُسجَّل في ${mosqueLabel(mosque.mosque_name, mosque.mosque_city)}، ${mosque.mosque_city}، ${mosque.mosque_governorate}.`,
      jsonLd: buildMosqueSchema({
        name: mosque.mosque_name, city: mosque.mosque_city, governorate: mosque.mosque_governorate,
        country: mosque.mosque_country, bookCount: books.length, lat: mosque.mosque_lat, lng: mosque.mosque_lng,
      }),
      canonical: `https://rofoof-almasajid.vercel.app/mosques/${mosque.mosque_id}`,
    })
  }, [mosque, books.length])

  return (
    <div className="mosque-page" dir="rtl">
      <SiteNavigation active="browse" />
      <div className="page-shell site-content mosque-page-content">
        <a href="/" className="back-link">
          <svg aria-hidden="true" width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
          العودة إلى التصفح
        </a>

        {loading && <div className="mosque-page-loading">جارٍ التحميل...</div>}

        {!loading && notFound && (
          <div className="mosque-page-not-found">
            <h1>لم يتم العثور على هذا المسجد</h1>
            <p>ربما تم حذفه أو أن الرابط غير صحيح.</p>
            <a className="primary-button" href="/">العودة إلى الصفحة الرئيسية</a>
          </div>
        )}

        {!loading && mosque && (
          <>
            {/* ── Gallery ── */}
            {mosque.images.length > 0 ? (
              <div className="mosque-gallery">
                <div className="mosque-gallery-main">
                  <img src={mosque.images[activeImage]} alt={mosqueLabel(mosque.mosque_name, mosque.mosque_city)} />
                </div>
                {mosque.images.length > 1 && (
                  <div className="mosque-gallery-thumbs">
                    {mosque.images.map((src, i) => (
                      <button
                        key={src + i}
                        className={i === activeImage ? 'active' : ''}
                        onClick={() => setActiveImage(i)}
                        aria-label={`صورة ${i + 1}`}
                      >
                        <img src={src} alt="" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="mosque-gallery mosque-gallery--empty">
                <svg aria-hidden="true" width={48} height={48} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2c-1.5 0-2.5 1.5-2.5 3v2H7a3 3 0 0 0-3 3v10h16V10a3 3 0 0 0-3-3h-2.5V5c0-1.5-1-3-2.5-3Z" />
                  <path d="M9 22v-7h6v7" />
                </svg>
                <p>لا توجد صور مضافة لهذا المسجد بعد</p>
              </div>
            )}

            {/* ── Header ── */}
            <div className="mosque-page-header">
              <h1>{mosqueLabel(mosque.mosque_name, mosque.mosque_city)}</h1>
              <p>{mosque.mosque_city}، {mosque.mosque_governorate} — {mosque.mosque_country}</p>
              <strong>{books.length} كتاب مُسجَّل</strong>
            </div>

            {/* ── Map ── */}
            <section className="mosque-page-section">
              <h2>الموقع على الخريطة</h2>
              <MosqueMap
                lat={mosque.mosque_lat}
                lng={mosque.mosque_lng}
                label={mosqueLabel(mosque.mosque_name, mosque.mosque_city)}
              />
            </section>

            {/* ── Books ── */}
            <section className="mosque-page-section">
              <h2>الكتب المتاحة ({books.length})</h2>
              {books.length ? (
                <div className="mosque-page-books-grid">
                  {books.map((book) => (
                    <a key={book.entry_id} className="mosque-page-book-card" href={`/books/${book.entry_id}`}>
                      <span className={`book-avatar ${catClass(book.category)}`}>{book.title[0]}</span>
                      <span>
                        <strong>{book.title}</strong>
                        <small>{book.author ?? 'مؤلف غير محدد'}{book.edition ? ` · ${book.edition}` : ''}</small>
                      </span>
                    </a>
                  ))}
                </div>
              ) : (
                <p className="mosque-page-empty-note">لم يُسجَّل أي كتاب لهذا المسجد بعد.</p>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  )
}