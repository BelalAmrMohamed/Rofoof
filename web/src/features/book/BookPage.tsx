// web/src/features/book/BookPage.tsx
import { useEffect, useState } from 'react'
import { SiteNavigation } from '../../components/SiteNavigation'
import { supabase } from '../../lib/supabase'
import { buildBookSchema, setPageMeta } from '../../lib/seo'

type Category = 'فقه' | 'حديث' | 'تفسير' | 'سيرة' | 'عقيدة' | 'تزكية' | 'أدب' | 'تاريخ' | 'أخرى'
const CATEGORIES: Category[] = ['فقه', 'حديث', 'تفسير', 'سيرة', 'عقيدة', 'تزكية', 'أدب', 'تاريخ', 'أخرى']
function catIdx(cat: Category | null) { return cat ? CATEGORIES.indexOf(cat) : -1 }
function catClass(cat: Category | null) { const i = catIdx(cat); return i >= 0 ? `category-${i}` : '' }

type BookDetail = {
  entry_id: string; title: string; author: string | null; category: Category | null
  extra_info: string | null; edition: string | null; publisher: string | null; book_image: string | null
  mosque_id: string; mosque_name: string | null; mosque_governorate: string; mosque_city: string; mosque_country: string
}

type BookRow = {
  id: string; edition: string | null; publisher: string | null
  books: { title: string; author: string | null; category: Category | null; extra_info: string | null; book_image: string | null }
  mosques: { mosque_id: string; mosque_name: string | null; mosque_governorate: string; mosque_city: string; country: string | null }
}

function mosqueLabel(name: string | null, city: string) { return name ?? `مسجد في ${city}` }

// Extracted from the URL path, e.g. /books/<mosque_books.id>
function getEntryIdFromPath() {
  const match = window.location.pathname.match(/^\/books\/([^/]+)/)
  return match ? decodeURIComponent(match[1]) : null
}

export default function BookPage() {
  const [entryId] = useState(getEntryIdFromPath)
  const [book, setBook] = useState<BookDetail | null>(null)
  const [loading, setLoading] = useState(!!entryId)
  const [notFound, setNotFound] = useState(!entryId)

  useEffect(() => {
    if (!entryId || !supabase) return
    let cancelled = false
    async function load() {
      if (!supabase) return
      const { data, error } = await supabase
        .from('mosque_books')
        .select('id, edition, publisher, books!inner(title, author, category, extra_info, book_image), mosques!inner(mosque_id, mosque_name, mosque_governorate, mosque_city, country)')
        .eq('id', entryId)
        .eq('status', 'approved')
        .maybeSingle()
      if (cancelled) return
      if (error || !data) { setNotFound(true); setLoading(false); return }

      const row = data as unknown as BookRow
      setBook({
        entry_id: row.id, title: row.books.title, author: row.books.author,
        category: row.books.category, extra_info: row.books.extra_info,
        edition: row.edition, publisher: row.publisher, book_image: row.books.book_image ?? null,
        mosque_id: row.mosques.mosque_id, mosque_name: row.mosques.mosque_name,
        mosque_governorate: row.mosques.mosque_governorate, mosque_city: row.mosques.mosque_city,
        mosque_country: row.mosques.country ?? 'مصر',
      })
      setLoading(false)
    }
    void load()
    return () => { cancelled = true }
  }, [entryId])

  useEffect(() => {
    if (!book) return
    setPageMeta({
      title: `${book.title} — على رفوف المساجد`,
      description: `${book.title}${book.author ? ` | ${book.author}` : ''} — متاح في ${mosqueLabel(book.mosque_name, book.mosque_city)}، ${book.mosque_city}.`,
      jsonLd: buildBookSchema({
        title: book.title, author: book.author, category: book.category,
        mosqueName: book.mosque_name, mosqueCity: book.mosque_city,
        mosqueGovernorate: book.mosque_governorate, mosqueCountry: book.mosque_country,
      }),
      canonical: `https://rofoof-almasajid.vercel.app/books/${book.entry_id}`,
    })
  }, [book])

  return (
    <div className="book-page" dir="rtl">
      <SiteNavigation active="browse" />
      <div className="page-shell site-content book-page-content">
        <a href="/" className="back-link">
          <svg aria-hidden="true" width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
          العودة إلى التصفح
        </a>

        {loading && <div className="mosque-page-loading">جارٍ التحميل...</div>}

        {!loading && notFound && (
          <div className="mosque-page-not-found">
            <h1>لم يتم العثور على هذا الكتاب</h1>
            <p>ربما تم حذفه، أو أنه بانتظار المراجعة، أو أن الرابط غير صحيح.</p>
            <a className="primary-button" href="/">العودة إلى الصفحة الرئيسية</a>
          </div>
        )}

        {!loading && book && (
          <>
            <div className="book-page-hero">
              {book.book_image
                ? <div className="book-page-cover"><img src={book.book_image} alt={book.title} /></div>
                : <div className={`book-avatar book-page-avatar ${catClass(book.category)}`}>{book.title[0]}</div>
              }
              <div>
                {book.category && <span className={`category-badge ${catClass(book.category)}`}>{book.category}</span>}
                <h1>{book.title}</h1>
                <p>{book.author ?? 'مؤلف غير محدد'}</p>
                {book.edition && <small>{book.edition}</small>}
                {book.publisher && <small>دار النشر: {book.publisher}</small>}
              </div>
            </div>

            {book.extra_info && (
              <section className="mosque-page-section">
                <h2>عن الكتاب</h2>
                <p>{book.extra_info}</p>
              </section>
            )}

            <section className="mosque-page-section">
              <h2>متاح في</h2>
              <a className="detail-mosque" href={`/mosques/${book.mosque_id}`}>
                <span>🕌 <strong>{mosqueLabel(book.mosque_name, book.mosque_city)}</strong><small>{book.mosque_city}، {book.mosque_governorate} — {book.mosque_country}</small></span>
                <svg aria-hidden="true" width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 21s7-7.75 7-13a7 7 0 1 0-14 0c0 5.25 7 13 7 13Z" /><circle cx="12" cy="8" r="2.5" /></svg>
              </a>
            </section>
          </>
        )}
      </div>
    </div>
  )
}