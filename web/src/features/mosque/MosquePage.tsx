// web/src/features/mosque/MosquePage.tsx
import { useEffect, useState } from 'react'
import { SiteNavigation } from '../../components/SiteNavigation'
import { MosqueMap } from '../../components/MosqueMap'
import { MapPicker } from '../onboarding/components/MapPicker'
import type { GeoPoint } from '../onboarding/types/location'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/auth.ts'
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

// Image rows carry their own `id` (mosque_images.id) so we can
// add/remove/reorder them individually, separate from the flat `images`
// URL list used for the public gallery display above.
type MosqueImageRow = { id: string; image_url: string; sort_order: number }

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
  const { user } = useAuth()
  const [mosqueId] = useState(getMosqueIdFromPath)
  const [mosque, setMosque] = useState<MosqueDetail | null>(null)
  const [books, setBooks] = useState<MosqueBook[]>([])
  const [activeImage, setActiveImage] = useState(0)
  const [loading, setLoading] = useState(!!mosqueId)
  const [notFound, setNotFound] = useState(!mosqueId)

  // Admin edit/delete (issue 2). isAdmin is checked once the user is known;
  // edit/delete controls only render for role = 'admin'.
  const [isAdmin, setIsAdmin] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState('')
  const [editGov, setEditGov] = useState('')
  const [editCity, setEditCity] = useState('')
  const [editPoint, setEditPoint] = useState<GeoPoint | null>(null)
  const [savingEdit, setSavingEdit] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [adminNotice, setAdminNotice] = useState<{ type: 'error' | 'success'; text: string } | null>(null)

  // Admin image management (issue 2): rows loaded straight from
  // mosque_images so each has an id to target for delete/reorder.
  const [imageRows, setImageRows] = useState<MosqueImageRow[]>([])
  const [uploadingImage, setUploadingImage] = useState(false)
  const [removingImageId, setRemovingImageId] = useState<string | null>(null)
  const [reorderingImage, setReorderingImage] = useState(false)
  // Requires an explicit confirm click before an image is actually deleted,
  // so a stray click on the ✕ icon can't remove a photo by accident.
  const [confirmingImageDeleteId, setConfirmingImageDeleteId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    if (!supabase || !user) { const t = window.setTimeout(() => setIsAdmin(false), 0); return () => window.clearTimeout(t) }
    supabase.from('users').select('role').eq('user_id', user.id).maybeSingle().then(({ data }) => {
      if (!cancelled) setIsAdmin(data?.role === 'admin')
    })
    return () => { cancelled = true }
  }, [user])

  function startEdit() {
    if (!mosque) return
    setEditName(mosque.mosque_name ?? '')
    setEditGov(mosque.mosque_governorate)
    setEditCity(mosque.mosque_city)
    setEditPoint({ lat: mosque.mosque_lat, lng: mosque.mosque_lng })
    setAdminNotice(null)
    setEditing(true)
  }

  async function saveEdit() {
    if (!supabase || !mosque) return
    setSavingEdit(true)
    const { error } = await supabase.from('mosques').update({
      mosque_name: editName.trim() || null,
      mosque_governorate: editGov.trim(),
      mosque_city: editCity.trim(),
      ...(editPoint ? { mosque_lat: editPoint.lat, mosque_lng: editPoint.lng } : {}),
    }).eq('mosque_id', mosque.mosque_id)
    setSavingEdit(false)
    if (error) { setAdminNotice({ type: 'error', text: 'تعذر حفظ التعديلات.' }); return }
    setMosque({
      ...mosque, mosque_name: editName.trim() || null, mosque_governorate: editGov.trim(), mosque_city: editCity.trim(),
      ...(editPoint ? { mosque_lat: editPoint.lat, mosque_lng: editPoint.lng } : {}),
    })
    setEditing(false)
    setAdminNotice({ type: 'success', text: 'تم تحديث بيانات المسجد.' })
  }

  function syncGalleryFromRows(rows: MosqueImageRow[]) {
    setMosque((m) => m ? { ...m, images: rows.map((r) => r.image_url) } : m)
  }

  // Extract the storage object path from a public URL returned by
  // getPublicUrl(), e.g. ".../object/public/mosque-images/171234-abc.jpg"
  // -> "171234-abc.jpg". Needed because .remove() takes a path, not a URL.
  function storagePathFromPublicUrl(bucket: string, url: string): string | null {
    const marker = `/object/public/${bucket}/`
    const idx = url.indexOf(marker)
    if (idx === -1) return null
    return decodeURIComponent(url.slice(idx + marker.length))
  }

  async function handleAddImage(file: File | null) {
    if (!file || !supabase || !mosque) return
    setUploadingImage(true)
    const ext = file.name.split('.').pop() ?? 'jpg'
    const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('mosque-images')
      .upload(path, file, { contentType: file.type, upsert: false })
    if (uploadError) { setUploadingImage(false); setAdminNotice({ type: 'error', text: 'تعذر رفع الصورة.' }); return }
    const { data: urlData } = supabase.storage.from('mosque-images').getPublicUrl(uploadData.path)
    const nextSortOrder = imageRows.length ? Math.max(...imageRows.map((r) => r.sort_order)) + 1 : 0
    const { data: inserted, error: insertError } = await supabase.from('mosque_images')
      .insert({ mosque_id: mosque.mosque_id, image_url: urlData.publicUrl, sort_order: nextSortOrder })
      .select('id, image_url, sort_order').single()
    setUploadingImage(false)
    if (insertError || !inserted) { setAdminNotice({ type: 'error', text: 'تعذر إضافة الصورة.' }); return }
    const nextRows = [...imageRows, inserted as MosqueImageRow]
    setImageRows(nextRows)
    syncGalleryFromRows(nextRows)
  }

  // Deletes both the mosque_images row AND the underlying storage file
  // (see 20260827140000_storage_delete_policies.sql — the storage delete
  // previously had no RLS grant at all and silently failed/was never
  // attempted, leaving orphaned files behind).
  async function handleRemoveImage(id: string) {
    if (!supabase) return
    const row = imageRows.find((r) => r.id === id)
    setRemovingImageId(id)
    const { error } = await supabase.from('mosque_images').delete().eq('id', id)
    if (error) { setRemovingImageId(null); setAdminNotice({ type: 'error', text: 'تعذر حذف الصورة.' }); return }
    if (row) {
      const path = storagePathFromPublicUrl('mosque-images', row.image_url)
      if (path) await supabase.storage.from('mosque-images').remove([path])
    }
    setRemovingImageId(null)
    const nextRows = imageRows.filter((r) => r.id !== id)
    setImageRows(nextRows)
    syncGalleryFromRows(nextRows)
    setActiveImage(0)
    setConfirmingImageDeleteId(null)
  }

  async function handleMoveImage(id: string, direction: -1 | 1) {
    if (!supabase) return
    const idx = imageRows.findIndex((r) => r.id === id)
    const swapIdx = idx + direction
    if (idx < 0 || swapIdx < 0 || swapIdx >= imageRows.length) return
    const reordered = [...imageRows]
    ;[reordered[idx], reordered[swapIdx]] = [reordered[swapIdx], reordered[idx]]
    const withSortOrder = reordered.map((r, i) => ({ ...r, sort_order: i }))
    setReorderingImage(true)
    const results = await Promise.all(withSortOrder.map((r) => supabase.from('mosque_images').update({ sort_order: r.sort_order }).eq('id', r.id)))
    setReorderingImage(false)
    if (results.some((r) => r.error)) { setAdminNotice({ type: 'error', text: 'تعذر إعادة ترتيب الصور.' }); return }
    setImageRows(withSortOrder)
    syncGalleryFromRows(withSortOrder)
  }

  async function deleteMosque() {
    if (!supabase || !mosque) return
    setDeleting(true)
    const { error } = await supabase.from('mosques').delete().eq('mosque_id', mosque.mosque_id)
    setDeleting(false)
    if (error) { setAdminNotice({ type: 'error', text: 'تعذر حذف المسجد.' }); return }
    window.location.assign('/')
  }

  useEffect(() => {
    if (!mosqueId || !supabase) return
    let cancelled = false
    async function load() {
      if (!supabase) return
      const [mosqueRes, imagesRes, booksRes] = await Promise.all([
        supabase.from('mosques')
          .select('mosque_id, mosque_name, mosque_governorate, mosque_city, country, mosque_lat, mosque_lng, mosque_image')
          .eq('mosque_id', mosqueId)
          .maybeSingle(),
        supabase.from('mosque_images')
          .select('id, image_url, sort_order')
          .eq('mosque_id', mosqueId)
          .order('sort_order', { ascending: true }),
        supabase.from('mosque_books')
          .select('id, edition, books!inner(title, author, category)')
          .eq('mosque_id', mosqueId)
          .eq('status', 'approved'),
      ])
      if (cancelled) return
      if (!mosqueRes.data) { setNotFound(true); setLoading(false); return }

      const m = mosqueRes.data as { mosque_id: string; mosque_name: string | null; mosque_governorate: string; mosque_city: string; country: string | null; mosque_lat: number; mosque_lng: number; mosque_image: string | null }
      const rows = (imagesRes.data ?? []) as MosqueImageRow[]
      const images = rows.map((r) => r.image_url)
      setImageRows(rows)
      setMosque({
        mosque_id: m.mosque_id, mosque_name: m.mosque_name,
        mosque_governorate: m.mosque_governorate, mosque_city: m.mosque_city,
        mosque_country: m.country ?? 'مصر', mosque_lat: m.mosque_lat, mosque_lng: m.mosque_lng,
        images: images.length ? images : (m.mosque_image ? [m.mosque_image] : []),
      })
      setBooks(((booksRes.data ?? []) as unknown as Array<{ id: string; edition: string | null; books: { title: string; author: string | null; category: Category | null } }>).map((row) => ({
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

            {/* ── Admin controls (issue 2) ── */}
            {isAdmin && (
              <section className="mosque-page-section">
                {adminNotice && <p className={`submit-notice ${adminNotice.type}`} role="alert">{adminNotice.text}</p>}

                {!editing ? (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button type="button" className="secondary-button" onClick={startEdit}>تعديل بيانات المسجد</button>
                    <button type="button" className="secondary-button" style={{ color: '#b52525' }} onClick={() => setConfirmingDelete(true)}>حذف المسجد</button>
                  </div>
                ) : (
                  <div className="submit-grid">
                    {/* Image manager — only reachable once "تعديل بيانات المسجد"
                        is pressed, so nothing is add/removable by a stray
                        click while just viewing the page. */}
                    <div className="submit-label" style={{ gridColumn: '1 / -1' }}>
                      <span>صور المسجد</span>
                      <div className="mosque-image-manager">
                        {imageRows.map((row, i) => (
                          <div key={row.id} className="mosque-image-manager-item">
                            <img src={row.image_url} alt="" />
                            {confirmingImageDeleteId === row.id ? (
                              <div className="mosque-image-manager-confirm">
                                <span>حذف الصورة؟</span>
                                <div>
                                  <button type="button" disabled={removingImageId === row.id} onClick={() => void handleRemoveImage(row.id)}>
                                    {removingImageId === row.id ? '...' : 'تأكيد'}
                                  </button>
                                  <button type="button" onClick={() => setConfirmingImageDeleteId(null)}>إلغاء</button>
                                </div>
                              </div>
                            ) : (
                              <div className="mosque-image-manager-controls">
                                <button type="button" disabled={i === 0 || reorderingImage} onClick={() => void handleMoveImage(row.id, -1)} aria-label="نقل لليمين" title="نقل لليمين">
                                  <svg aria-hidden="true" width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
                                </button>
                                <button type="button" onClick={() => setConfirmingImageDeleteId(row.id)} aria-label="حذف الصورة" title="حذف الصورة" className="danger">
                                  <svg aria-hidden="true" width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m6 6 12 12M18 6 6 18" /></svg>
                                </button>
                                <button type="button" disabled={i === imageRows.length - 1 || reorderingImage} onClick={() => void handleMoveImage(row.id, 1)} aria-label="نقل لليسار" title="نقل لليسار">
                                  <svg aria-hidden="true" width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                        <label className="mosque-image-manager-add">
                          {uploadingImage
                            ? <span>جارٍ الرفع...</span>
                            : <><svg aria-hidden="true" width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg><span>إضافة صورة</span></>
                          }
                          <input type="file" accept="image/*" disabled={uploadingImage} style={{ display: 'none' }} onChange={(e) => { void handleAddImage(e.target.files?.[0] ?? null); e.target.value = '' }} />
                        </label>
                      </div>
                    </div>

                    <label className="submit-label">
                      اسم المسجد
                      <input className="submit-input" value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="اسم المسجد (اختياري)" />
                    </label>
                    <label className="submit-label">
                      المحافظة
                      <input className="submit-input" value={editGov} onChange={(e) => setEditGov(e.target.value)} />
                    </label>
                    <label className="submit-label">
                      المدينة
                      <input className="submit-input" value={editCity} onChange={(e) => setEditCity(e.target.value)} />
                    </label>
                    <label className="submit-label" style={{ gridColumn: '1 / -1' }}>
                      الموقع على الخريطة
                      <MapPicker point={editPoint} onPick={setEditPoint} centerHint={{ lat: mosque.mosque_lat, lng: mosque.mosque_lng }} />
                    </label>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'end' }}>
                      <button type="button" className="primary-button" disabled={savingEdit} onClick={() => void saveEdit()}>{savingEdit ? 'جارٍ الحفظ...' : 'حفظ'}</button>
                      <button type="button" className="secondary-button" onClick={() => { setEditing(false); setConfirmingImageDeleteId(null) }}>إلغاء</button>
                    </div>
                  </div>
                )}
              </section>
            )}

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

      {confirmingDelete && mosque && (
        <div className="request-modal-backdrop" role="dialog" aria-modal="true" onClick={(e) => { if (e.target === e.currentTarget) setConfirmingDelete(false) }}>
          <div className="request-modal">
            <h2>حذف المسجد</h2>
            <p>سيتم حذف <strong>{mosqueLabel(mosque.mosque_name, mosque.mosque_city)}</strong> وكل الكتب والصور المرتبطة به. لا يمكن التراجع عن هذا الإجراء.</p>
            <div className="modal-actions">
              <button className="secondary-action" onClick={() => setConfirmingDelete(false)}>إلغاء</button>
              <button className="reject-action" disabled={deleting} onClick={() => void deleteMosque()}>{deleting ? 'جارٍ الحذف...' : 'تأكيد الحذف'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}