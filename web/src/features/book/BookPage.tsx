// web/src/features/book/BookPage.tsx
import { useEffect, useState } from 'react'
import { SiteNavigation } from '../../components/SiteNavigation'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/auth.ts'
import { buildBookSchema, setPageMeta } from '../../lib/seo'

type Category = 'فقه' | 'حديث' | 'تفسير' | 'سيرة' | 'عقيدة' | 'تزكية' | 'أدب' | 'تاريخ' | 'أخرى'
const CATEGORIES: Category[] = ['فقه', 'حديث', 'تفسير', 'سيرة', 'عقيدة', 'تزكية', 'أدب', 'تاريخ', 'أخرى']
function catIdx(cat: Category | null) { return cat ? CATEGORIES.indexOf(cat) : -1 }
function catClass(cat: Category | null) { const i = catIdx(cat); return i >= 0 ? `category-${i}` : '' }

type BookDetail = {
  entry_id: string; book_id: string; title: string; author: string | null; category: Category | null
  extra_info: string | null; edition: string | null; publisher: string | null; book_image: string | null
  mosque_id: string; mosque_name: string | null; mosque_governorate: string; mosque_city: string; mosque_country: string
}

type BookRow = {
  id: string; edition: string | null; publisher: string | null
  books: { book_id: string; title: string; author: string | null; category: Category | null; extra_info: string | null; book_image: string | null }
  mosques: { mosque_id: string; mosque_name: string | null; mosque_governorate: string; mosque_city: string; country: string | null }
}

function mosqueLabel(name: string | null, city: string) { return name ?? `مسجد في ${city}` }

// Extracted from the URL path, e.g. /books/<mosque_books.id>
function getEntryIdFromPath() {
  const match = window.location.pathname.match(/^\/books\/([^/]+)/)
  return match ? decodeURIComponent(match[1]) : null
}

export default function BookPage() {
  const { user } = useAuth()
  const [entryId] = useState(getEntryIdFromPath)
  const [book, setBook] = useState<BookDetail | null>(null)
  const [loading, setLoading] = useState(!!entryId)
  const [notFound, setNotFound] = useState(!entryId)

  // Admin edit/delete (issue 2).
  const [isAdmin, setIsAdmin] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editAuthor, setEditAuthor] = useState('')
  const [editCategory, setEditCategory] = useState<Category | ''>('')
  const [editEdition, setEditEdition] = useState('')
  const [editPublisher, setEditPublisher] = useState('')
  const [editExtraInfo, setEditExtraInfo] = useState('')
  const [editImageFile, setEditImageFile] = useState<File | null>(null)
  const [editImagePreview, setEditImagePreview] = useState<string | null>(null)
  const [removeImage, setRemoveImage] = useState(false)
  const [savingEdit, setSavingEdit] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [adminNotice, setAdminNotice] = useState<{ type: 'error' | 'success'; text: string } | null>(null)

  useEffect(() => {
    let cancelled = false
    if (!supabase || !user) { const t = window.setTimeout(() => setIsAdmin(false), 0); return () => window.clearTimeout(t) }
    supabase.from('users').select('role').eq('user_id', user.id).maybeSingle().then(({ data }) => {
      if (!cancelled) setIsAdmin(data?.role === 'admin')
    })
    return () => { cancelled = true }
  }, [user])

  function startEdit() {
    if (!book) return
    setEditTitle(book.title)
    setEditAuthor(book.author ?? '')
    setEditCategory(book.category ?? '')
    setEditEdition(book.edition ?? '')
    setEditPublisher(book.publisher ?? '')
    setEditExtraInfo(book.extra_info ?? '')
    setEditImageFile(null)
    setEditImagePreview(null)
    setRemoveImage(false)
    setAdminNotice(null)
    setEditing(true)
  }

  function handleImagePick(file: File | null) {
    setEditImageFile(file)
    setRemoveImage(false)
    setEditImagePreview(file ? URL.createObjectURL(file) : null)
  }

  async function saveEdit() {
    if (!supabase || !book) return
    setSavingEdit(true)

    // Upload a new cover, if one was picked, to the book-images bucket —
    // same bucket/path pattern used on the Submit page.
    let newImageUrl: string | null | undefined
    if (editImageFile) {
      const ext = editImageFile.name.split('.').pop() ?? 'jpg'
      const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('book-images')
        .upload(path, editImageFile, { contentType: editImageFile.type, upsert: false })
      if (uploadError) { setSavingEdit(false); setAdminNotice({ type: 'error', text: 'تعذر رفع الصورة.' }); return }
      const { data: urlData } = supabase.storage.from('book-images').getPublicUrl(uploadData.path)
      newImageUrl = urlData.publicUrl
    } else if (removeImage) {
      newImageUrl = null
    }

    const [booksResult, entryResult] = await Promise.all([
      supabase.from('books').update({
        title: editTitle.trim(),
        author: editAuthor.trim() || null,
        category: editCategory || null,
        extra_info: editExtraInfo.trim() || null,
        ...(newImageUrl !== undefined ? { book_image: newImageUrl } : {}),
      }).eq('book_id', book.book_id),
      supabase.from('mosque_books').update({
        edition: editEdition.trim() || null,
        publisher: editPublisher.trim() || null,
      }).eq('id', book.entry_id),
    ])
    setSavingEdit(false)
    if (booksResult.error || entryResult.error) { setAdminNotice({ type: 'error', text: 'تعذر حفظ التعديلات.' }); return }
    setBook({
      ...book,
      title: editTitle.trim(), author: editAuthor.trim() || null,
      category: (editCategory || null) as Category | null,
      extra_info: editExtraInfo.trim() || null,
      edition: editEdition.trim() || null, publisher: editPublisher.trim() || null,
      ...(newImageUrl !== undefined ? { book_image: newImageUrl } : {}),
    })
    setEditing(false)
    setEditImageFile(null)
    setEditImagePreview(null)
    setRemoveImage(false)
    setAdminNotice({ type: 'success', text: 'تم تحديث بيانات الكتاب.' })
  }

  async function deleteEntry() {
    if (!supabase || !book) return
    setDeleting(true)
    const { error } = await supabase.from('mosque_books').delete().eq('id', book.entry_id)
    setDeleting(false)
    if (error) { setAdminNotice({ type: 'error', text: 'تعذر حذف هذا التسجيل.' }); return }
    window.location.assign(`/mosques/${book.mosque_id}`)
  }

  useEffect(() => {
    if (!entryId || !supabase) return
    let cancelled = false
    async function load() {
      if (!supabase) return
      const { data, error } = await supabase
        .from('mosque_books')
        .select('id, edition, publisher, books!inner(book_id, title, author, category, extra_info, book_image), mosques!inner(mosque_id, mosque_name, mosque_governorate, mosque_city, country)')
        .eq('id', entryId)
        .eq('status', 'approved')
        .maybeSingle()
      if (cancelled) return
      if (error || !data) { setNotFound(true); setLoading(false); return }

      const row = data as unknown as BookRow
      setBook({
        entry_id: row.id, book_id: row.books.book_id, title: row.books.title, author: row.books.author,
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

            {/* ── Admin controls (issue 2) ── */}
            {isAdmin && (
              <section className="mosque-page-section">
                {adminNotice && <p className={`submit-notice ${adminNotice.type}`} role="alert">{adminNotice.text}</p>}
                {!editing ? (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button type="button" className="secondary-button" onClick={startEdit}>تعديل بيانات الكتاب</button>
                    <button type="button" className="secondary-button" style={{ color: '#b52525' }} onClick={() => setConfirmingDelete(true)}>حذف هذا التسجيل</button>
                  </div>
                ) : (
                  <div className="submit-grid">
                    <label className="submit-label" style={{ gridColumn: '1 / -1' }}>
                      صورة الغلاف
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        {(editImagePreview ?? (!removeImage ? book.book_image : null)) ? (
                          <img
                            src={editImagePreview ?? book.book_image ?? ''}
                            alt=""
                            style={{ width: 64, height: 64, borderRadius: 10, objectFit: 'cover', border: '1.5px solid var(--stone-200)' }}
                          />
                        ) : (
                          <div className={`book-avatar ${catClass(book.category)}`} style={{ width: 64, height: 64, fontSize: 26 }}>{book.title[0]}</div>
                        )}
                        <input type="file" accept="image/*" onChange={(e) => handleImagePick(e.target.files?.[0] ?? null)} />
                        {(book.book_image || editImageFile) && !removeImage && (
                          <button type="button" className="secondary-button" onClick={() => { setRemoveImage(true); setEditImageFile(null); setEditImagePreview(null) }}>
                            إزالة الصورة
                          </button>
                        )}
                      </div>
                    </label>
                    <label className="submit-label">
                      عنوان الكتاب
                      <input className="submit-input" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
                    </label>
                    <label className="submit-label">
                      اسم المؤلف
                      <input className="submit-input" value={editAuthor} onChange={(e) => setEditAuthor(e.target.value)} />
                    </label>
                    <label className="submit-label">
                      رقم الطبعة
                      <input className="submit-input" value={editEdition} onChange={(e) => setEditEdition(e.target.value)} />
                    </label>
                    <label className="submit-label">
                      دار النشر
                      <input className="submit-input" value={editPublisher} onChange={(e) => setEditPublisher(e.target.value)} />
                    </label>
                    <label className="submit-label">
                      التصنيف
                      <select className="submit-input" value={editCategory} onChange={(e) => setEditCategory(e.target.value as Category | '')}>
                        <option value="">بدون تصنيف</option>
                        {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </label>
                    <label className="submit-label" style={{ gridColumn: '1 / -1' }}>
                      ملاحظات إضافية
                      <textarea className="submit-input submit-textarea" value={editExtraInfo} onChange={(e) => setEditExtraInfo(e.target.value)} />
                    </label>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'end' }}>
                      <button type="button" className="primary-button" disabled={savingEdit} onClick={() => void saveEdit()}>{savingEdit ? 'جارٍ الحفظ...' : 'حفظ'}</button>
                      <button type="button" className="secondary-button" onClick={() => setEditing(false)}>إلغاء</button>
                    </div>
                  </div>
                )}
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

      {confirmingDelete && book && (
        <div className="request-modal-backdrop" role="dialog" aria-modal="true" onClick={(e) => { if (e.target === e.currentTarget) setConfirmingDelete(false) }}>
          <div className="request-modal">
            <h2>حذف تسجيل الكتاب</h2>
            <p>سيتم حذف <strong>{book.title}</strong> من هذا المسجد. لا يمكن التراجع عن هذا الإجراء.</p>
            <div className="modal-actions">
              <button className="secondary-action" onClick={() => setConfirmingDelete(false)}>إلغاء</button>
              <button className="reject-action" disabled={deleting} onClick={() => void deleteEntry()}>{deleting ? 'جارٍ الحذف...' : 'تأكيد الحذف'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}