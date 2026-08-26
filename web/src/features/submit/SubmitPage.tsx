import { useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent, InputHTMLAttributes } from 'react'
import { MapPicker } from '../onboarding/components/MapPicker'
import type { GeoPoint } from '../onboarding/types/location'
import type { GeocodedLocation } from '../../lib/geocode'
import { supabase } from '../../lib/supabase'
import { SiteNavigation } from '../../components/SiteNavigation'
import { useAuth } from '../../lib/auth.ts'
import { setPageMeta } from '../../lib/seo'

// ── Constants ─────────────────────────────────────────────────────────────

type Category = 'فقه' | 'حديث' | 'تفسير' | 'سيرة' | 'عقيدة' | 'تزكية' | 'أدب' | 'تاريخ' | 'أخرى'
type Mosque = { mosque_id: string; mosque_name: string | null; mosque_governorate: string; mosque_city: string; mosque_country: string; mosque_lat: number; mosque_lng: number }
type Notice = { type: 'error' | 'success'; text: string } | null

// A caption tag lets the user visually group "exterior" vs "library interior"
// shots without forcing a choice — 'أخرى' covers anything else.
type PhotoTag = 'خارجي' | 'مكتبة/رفوف الكتب' | 'أخرى'
const PHOTO_TAGS: PhotoTag[] = ['خارجي', 'مكتبة/رفوف الكتب', 'أخرى']

type MosquePhoto = { id: string; file: File; preview: string; tag: PhotoTag }

const CATEGORIES: Category[] = ['فقه', 'حديث', 'تفسير', 'سيرة', 'عقيدة', 'تزكية', 'أدب', 'تاريخ', 'أخرى']

import { COUNTRIES, EGYPT_GOVERNORATES } from '../../lib/locations'

function mosqueLabel(m: Mosque) { return m.mosque_name || `مسجد في ${m.mosque_city}` }

// ── Component ─────────────────────────────────────────────────────────────

export default function SubmitPage() {
  const { user, loading: authLoading } = useAuth()

  // Mosque search state
  const [mosques, setMosques] = useState<Mosque[]>([])
  const [query, setQuery] = useState('')
  const [selectedMosque, setSelectedMosque] = useState<Mosque | null>(null)

  // New mosque location state
  const [country, setCountry] = useState('مصر')
  const [governorate, setGovernorate] = useState('')
  const [city, setCity] = useState('')
  const [cityIsOther, setCityIsOther] = useState(false)
  const [point, setPoint] = useState<GeoPoint | null>(null)

  // Derived: cities from live DB for Egypt, cascaded from the selected governorate.
  // Governorates themselves use the static EGYPT_GOVERNORATES list below, not
  // live data — see the note on that constant. Derived via useMemo below.

  // Mosque photos — multiple images (exterior angles + library interior),
  // each independently tagged, previewed, and removable. See 2.5.
  const [mosquePhotos, setMosquePhotos] = useState<MosquePhoto[]>([])
  const mosquePhotoInputRef = useRef<HTMLInputElement>(null)

  // Book cover photo — single image, mirrors the old mosque photo pattern. See 2.4.
  const [bookCoverFile, setBookCoverFile] = useState<File | null>(null)
  const [bookCoverPreview, setBookCoverPreview] = useState<string | null>(null)
  const bookCoverInputRef = useRef<HTMLInputElement>(null)

  // Form status
  const [notice, setNotice] = useState<Notice>(null)
  const [submitting, setSubmitting] = useState(false)

  // SEO
  useEffect(() => {
    setPageMeta({
      title: 'تسجيل كتاب جديد',
      description: 'أضف كتاباً وجدته على رفوف مسجد وساعد الآخرين على الوصول إليه — بدون حساب.',
      canonical: 'https://rofoof-almasajid.vercel.app/submit',
    })
  }, [])

  // Load mosques (public SELECT, no auth needed)
  useEffect(() => {
    if (!supabase) return
    supabase.from('mosques')
      .select('mosque_id, mosque_name, mosque_governorate, mosque_city, country, mosque_lat, mosque_lng')
      .order('created_at', { ascending: false })
      .limit(200)
      .then(({ data, error }) => {
        if (error) { setNotice({ type: 'error', text: 'تعذر تحميل المساجد.' }); return }
        const list = (data ?? []) as Array<Mosque & { country?: string }>
        setMosques(list.map((m) => ({ ...m, mosque_country: m.country ?? 'مصر' })))
      })
  }, [])

  // When user selects a governorate, derive cities. Pure derivation from
  // governorate/country/mosques — a useMemo, not an effect, since nothing
  // here needs to synchronize with an external system.
  const liveCities = useMemo(() => {
    if (!governorate) return []
    const citySet = new Set<string>()
    for (const m of mosques) {
      if ((m.mosque_country ?? 'مصر') === country && m.mosque_governorate === governorate) citySet.add(m.mosque_city)
    }
    return Array.from(citySet).sort()
  }, [governorate, country, mosques])

  // Governorate changed (via the dropdown or a map reverse-geocode) — reset
  // the dependent city fields so a stale city from the previous governorate
  // doesn't linger.
  const changeGovernorate = (value: string) => {
    setGovernorate(value)
    setCity('')
    setCityIsOther(false)
  }

  const matches = useMemo(() => {
    const text = query.trim()
    if (!text) return mosques.slice(0, 8)
    return mosques.filter((m) =>
      `${m.mosque_name ?? ''} ${m.mosque_city} ${m.mosque_governorate} ${m.mosque_country}`.includes(text)
    ).slice(0, 8)
  }, [mosques, query])

  // Reverse geocode callback from MapPicker
  const handleGeocode = (result: GeocodedLocation) => {
    if (result.country) setCountry(result.country)
    if (result.state) changeGovernorate(result.state)
    if (result.city) setCity(result.city)
  }

  // Add one or more mosque photos (multi-select), each gets a preview + default tag.
  const handleMosquePhotos = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return
    const added: MosquePhoto[] = files.map((file) => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      file,
      preview: URL.createObjectURL(file),
      tag: 'خارجي',
    }))
    setMosquePhotos((prev) => [...prev, ...added])
    e.target.value = ''
  }

  const removeMosquePhoto = (id: string) => {
    setMosquePhotos((prev) => {
      const target = prev.find((p) => p.id === id)
      if (target) URL.revokeObjectURL(target.preview)
      return prev.filter((p) => p.id !== id)
    })
  }

  const setMosquePhotoTag = (id: string, tag: PhotoTag) => {
    setMosquePhotos((prev) => prev.map((p) => (p.id === id ? { ...p, tag } : p)))
  }

  // Book cover selection — single file, mirrors the old single mosque-photo pattern.
  const handleBookCover = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null
    setBookCoverFile(file)
    setBookCoverPreview(file ? URL.createObjectURL(file) : null)
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setNotice(null)
    const formElement = event.currentTarget
    const form = new FormData(formElement)
    const title = String(form.get('title') ?? '').trim()
    if (!title) { setNotice({ type: 'error', text: 'يرجى إدخال عنوان الكتاب.' }); return }
    if (!supabase) { setNotice({ type: 'error', text: 'إعدادات Supabase غير موجودة في ملف البيئة.' }); return }
    if (!selectedMosque && (!country || !governorate || !city || !point)) {
      setNotice({ type: 'error', text: 'اختر مسجداً موجوداً أو أدخل الدولة والمحافظة والمدينة وحدد موقعه على الخريطة.' }); return
    }
    setSubmitting(true)
    try {
      // Determine role / status
      let submissionStatus: 'pending' | 'approved' = 'pending'
      let submittedBy: string | null = null
      if (user) {
        submittedBy = user.id
        const profileResult = await supabase.from('users').select('role').eq('user_id', user.id).maybeSingle()
        if (!profileResult.error) {
          const role = profileResult.data?.role
          if (role === 'volunteer' || role === 'admin') submissionStatus = 'approved'
        }
      }

      // Upload all mosque photos (0..n) to the mosque-images bucket, keeping
      // each one's tag as its mosque_images.caption. The first uploaded photo
      // also becomes the legacy mosques.mosque_image for backward-compat with
      // any code path that still reads that single column.
      const uploadedMosqueImages: Array<{ image_url: string; caption: string }> = []
      for (const photo of mosquePhotos) {
        const ext = photo.file.name.split('.').pop() ?? 'jpg'
        const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('mosque-images')
          .upload(path, photo.file, { contentType: photo.file.type, upsert: false })
        if (uploadError) throw uploadError
        const { data: urlData } = supabase.storage.from('mosque-images').getPublicUrl(uploadData.path)
        uploadedMosqueImages.push({ image_url: urlData.publicUrl, caption: photo.tag })
      }
      const mosqueImageUrl = uploadedMosqueImages[0]?.image_url ?? null

      // Upload the book cover, if provided, to the book-images bucket.
      let bookImageUrl: string | null = null
      if (bookCoverFile) {
        const ext = bookCoverFile.name.split('.').pop() ?? 'jpg'
        const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('book-images')
          .upload(path, bookCoverFile, { contentType: bookCoverFile.type, upsert: false })
        if (uploadError) throw uploadError
        const { data: urlData } = supabase.storage.from('book-images').getPublicUrl(uploadData.path)
        bookImageUrl = urlData.publicUrl
      }

      // Resolve or create mosque
      let mosqueId = selectedMosque?.mosque_id
      if (!mosqueId) {
        const mosqueFields: Record<string, unknown> = {
          mosque_name: String(form.get('mosqueName') ?? '').trim() || null,
          mosque_governorate: governorate,
          mosque_city: city,
          mosque_lat: point!.lat,
          mosque_lng: point!.lng,
          country,
          ...(mosqueImageUrl ? { mosque_image: mosqueImageUrl } : {}),
          ...(submittedBy ? { submitted_by: submittedBy } : {}),
        }
        const mosque = await supabase.from('mosques').insert(mosqueFields).select('mosque_id').single()
        if (mosque.error) throw mosque.error
        mosqueId = mosque.data.mosque_id
      } else if (mosqueImageUrl && selectedMosque) {
        // If user uploaded a photo for an existing mosque, update its image
        await supabase.from('mosques').update({ mosque_image: mosqueImageUrl }).eq('mosque_id', selectedMosque.mosque_id)
      }

      // Insert every uploaded mosque photo into the gallery table, ordered
      // by upload order.
      if (uploadedMosqueImages.length && mosqueId) {
        const rows = uploadedMosqueImages.map((img, i) => ({
          mosque_id: mosqueId,
          image_url: img.image_url,
          caption: img.caption,
          sort_order: i,
          ...(submittedBy ? { submitted_by: submittedBy } : {}),
        }))
        const { error: imagesError } = await supabase.from('mosque_images').insert(rows)
        if (imagesError) throw imagesError
      }

      // Upsert book record
      const bookFields = {
        title,
        author: String(form.get('author') ?? '').trim() || null,
        category: String(form.get('category') ?? '') || null,
        extra_info: String(form.get('notes') ?? '').trim() || null,
        ...(bookImageUrl ? { book_image: bookImageUrl } : {}),
      }
      const existingBook = await supabase.from('books').select('book_id').eq('title', title).maybeSingle()
      if (existingBook.error) throw existingBook.error
      let book = existingBook.data
      if (!book) {
        const insertedBook = await supabase.from('books').insert(bookFields).select('book_id').single()
        if (insertedBook.error) throw insertedBook.error
        book = insertedBook.data
      } else if (bookImageUrl) {
        // Existing book title matched — attach the newly uploaded cover if it didn't have one.
        await supabase.from('books').update({ book_image: bookImageUrl }).eq('book_id', book.book_id)
      }
      if (!book) throw new Error('تعذر إنشاء سجل الكتاب.')

      // Insert mosque_books junction (no .select() to avoid RETURNING RLS issue for guests)
      const entryFields: Record<string, unknown> = {
        book_id: book.book_id,
        mosque_id: mosqueId,
        edition: String(form.get('edition') ?? '').trim() || null,
        publisher: String(form.get('publisher') ?? '').trim() || null,
        status: submissionStatus,
        ...(submittedBy ? { submitted_by: submittedBy } : {}),
      }
      const { error: entryError } = await supabase.from('mosque_books').insert(entryFields)
      if (entryError) throw entryError

      formElement.reset()
      setSelectedMosque(null); setPoint(null); setGovernorate(''); setCity(''); setCountry('مصر')
      mosquePhotos.forEach((p) => URL.revokeObjectURL(p.preview))
      setMosquePhotos([])
      if (bookCoverPreview) URL.revokeObjectURL(bookCoverPreview)
      setBookCoverFile(null); setBookCoverPreview(null)
      setNotice({
        type: 'success',
        text: !user
          ? 'شكراً! تم إرسال الكتاب وسيظهر بعد مراجعة المشرف.'
          : submissionStatus === 'approved'
            ? 'تم تسجيل الكتاب وإضافته مباشرة إلى الفهرس.'
            : 'تم إرسال الطلب وسيظهر بعد موافقة المشرف.',
      })
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'تعذر حفظ التسجيل.'
      setNotice({ type: 'error', text: message.includes('duplicate') || message.includes('unique') ? 'هذا الكتاب بهذه الطبعة مسجل بالفعل في المسجد.' : message })
    } finally { setSubmitting(false) }
  }

  const isEgypt = country === 'مصر'

  return (
    <div className="site-layout" dir="rtl">
      <SiteNavigation active="submit" />
      <div className="site-content">
        <main className="submit-page-main">
          <div className="submit-shell">
            <header className="submit-header">
              <a href="/browse" className="submit-back-link">← العودة إلى التصفح</a>
              <h1 className="submit-title">تسجيل كتاب جديد</h1>
              <p className="submit-subtitle">أضف كتاباً وجدته على رفوف مسجد وساعد الآخرين على الوصول إليه.</p>
              {!authLoading && !user && (
                <div className="submit-guest-notice" role="note">
                  <span>🌐</span>
                  <span>تسجيل الدخول غير مطلوب — يمكنك إضافة كتاب مباشرة وسيراجعه المشرف.</span>
                  <a href="/login?redirect=/submit">تسجيل الدخول</a>
                </div>
              )}
            </header>

            <form onSubmit={submit} className="submit-form">
              {/* ── Book Info ── */}
              <section className="submit-section">
                <h2 className="submit-section-title">معلومات الكتاب</h2>
                <div className="submit-grid">
                  <Field name="title" label="عنوان الكتاب" required placeholder="مثال: فقه السنة" />
                  <Field name="author" label="اسم المؤلف" placeholder="مثال: السيد سابق" />
                  <Field name="edition" label="رقم الطبعة" placeholder="مثال: الطبعة الثالثة" />
                  <Field name="publisher" label="دار النشر" placeholder="مثال: دار الفكر" />
                </div>
                <label className="submit-label">
                  التصنيف
                  <select name="category" className="submit-input">
                    <option value="">اختر تصنيفاً</option>
                    {CATEGORIES.map((item) => <option key={item}>{item}</option>)}
                  </select>
                </label>
                <label className="submit-label">
                  ملاحظات إضافية
                  <textarea name="notes" className="submit-input submit-textarea" placeholder="حالة الكتاب أو أي معلومات مفيدة للقراء" />
                </label>

                {/* ── Book Cover Upload (2.4) ── */}
                <div className="submit-photo-section">
                  <label className="submit-label">
                    صورة غلاف الكتاب (اختياري)
                    <div className="submit-photo-area" onClick={() => bookCoverInputRef.current?.click()} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && bookCoverInputRef.current?.click()}>
                      {bookCoverPreview
                        ? <img src={bookCoverPreview} alt="معاينة غلاف الكتاب" className="submit-photo-preview" />
                        : (
                          <div className="submit-photo-placeholder">
                            <span>📕</span>
                            <strong>انقر لرفع صورة الغلاف</strong>
                            <small>JPG أو PNG · حتى 5 ميغابايت</small>
                          </div>
                        )
                      }
                    </div>
                    <input
                      ref={bookCoverInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleBookCover}
                      style={{ display: 'none' }}
                    />
                  </label>
                  {bookCoverFile && (
                    <button type="button" className="submit-change-link" style={{ marginTop: 6 }} onClick={() => { if (bookCoverPreview) URL.revokeObjectURL(bookCoverPreview); setBookCoverFile(null); setBookCoverPreview(null); if (bookCoverInputRef.current) bookCoverInputRef.current.value = '' }}>
                      إزالة الصورة
                    </button>
                  )}
                </div>
              </section>

              {/* ── Mosque & Location ── */}
              <section className="submit-section">
                <h2 className="submit-section-title">المسجد وموقعه</h2>
                <p className="submit-section-desc">ابحث عن مسجد موجود، أو أضف مسجداً جديداً وحدد موقعه على الخريطة.</p>

                {!selectedMosque ? (
                  <>
                    <label className="submit-label">
                      البحث عن مسجد
                      <input value={query} onChange={(e) => setQuery(e.target.value)} className="submit-input" placeholder="الاسم أو المدينة أو المحافظة" />
                    </label>
                    {matches.length > 0 && (
                      <div className="submit-mosque-list">
                        {matches.map((mosque) => (
                          <button type="button" key={mosque.mosque_id} onClick={() => { setSelectedMosque(mosque); setPoint({ lat: mosque.mosque_lat, lng: mosque.mosque_lng }) }} className="submit-mosque-item">
                            <strong>{mosqueLabel(mosque)}</strong>
                            <span className="submit-mosque-loc">{mosque.mosque_city}، {mosque.mosque_governorate} — {mosque.mosque_country}</span>
                          </button>
                        ))}
                      </div>
                    )}

                    <div className="submit-divider">أو أضف مسجداً جديداً</div>

                    {/* Country selector */}
                    <label className="submit-label">
                      الدولة
                      <select value={country} onChange={(e) => { setCountry(e.target.value); setGovernorate(''); setCity(''); setCityIsOther(false) }} className="submit-input">
                        {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </label>

                    <div className="submit-grid">
                      {isEgypt ? (
                        <>
                          <label className="submit-label">
                            المحافظة
                            <select value={governorate} onChange={(e) => changeGovernorate(e.target.value)} className="submit-input">
                              <option value="">اختر المحافظة</option>
                              {EGYPT_GOVERNORATES.map((g) => <option key={g}>{g}</option>)}
                            </select>
                          </label>
                          <label className="submit-label">
                            المدينة / المركز
                            {liveCities.length && !cityIsOther ? (
                              <select
                                value={city}
                                onChange={(e) => {
                                  if (e.target.value === '__other__') { setCityIsOther(true); setCity('') }
                                  else setCity(e.target.value)
                                }}
                                className="submit-input"
                              >
                                <option value="">اختر المدينة</option>
                                {liveCities.map((c) => <option key={c}>{c}</option>)}
                                <option value="__other__">مدينة أخرى...</option>
                              </select>
                            ) : (
                              <input autoFocus={cityIsOther} value={city} onChange={(e) => setCity(e.target.value)} className="submit-input" placeholder="مثال: بني مزار" />
                            )}
                          </label>
                        </>
                      ) : (
                        <>
                          <label className="submit-label">
                            المحافظة / الولاية
                            <input value={governorate} onChange={(e) => setGovernorate(e.target.value)} className="submit-input" placeholder="مثال: الرياض" />
                          </label>
                          <label className="submit-label">
                            المدينة
                            <input value={city} onChange={(e) => setCity(e.target.value)} className="submit-input" placeholder="مثال: الرياض" />
                          </label>
                        </>
                      )}
                    </div>
                    <label className="submit-label">
                      اسم المسجد (اختياري)
                      <input name="mosqueName" className="submit-input" placeholder="مثال: مسجد النور" />
                    </label>
                    <MapPicker point={point} onPick={setPoint} onGeocode={handleGeocode} className="submit-map" />
                    <p className="submit-map-hint">اضغط على الخريطة لتحديد الموقع — سيُحدَّث الحقل تلقائياً عبر الموقع الجغرافي.</p>
                  </>
                ) : (
                  <div className="submit-mosque-selected">
                    <div>
                      <strong>{mosqueLabel(selectedMosque)}</strong>
                      <p>{selectedMosque.mosque_city}، {selectedMosque.mosque_governorate} — {selectedMosque.mosque_country}</p>
                    </div>
                    <button type="button" onClick={() => { setSelectedMosque(null); setPoint(null) }} className="submit-change-link">تغيير</button>
                  </div>
                )}

                {/* ── Mosque Photos Upload (2.5: multiple images) ── */}
                <div className="submit-photo-section">
                  <label className="submit-label">
                    صور المسجد (اختياري) — يمكن إضافة أكثر من صورة، مثل صور خارجية وصورة لرفوف الكتب
                    <div className="submit-photo-area" onClick={() => mosquePhotoInputRef.current?.click()} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && mosquePhotoInputRef.current?.click()}>
                      <div className="submit-photo-placeholder">
                        <span>🖼️</span>
                        <strong>انقر لرفع صورة أو أكثر</strong>
                        <small>JPG أو PNG · حتى 5 ميغابايت لكل صورة</small>
                      </div>
                    </div>
                    <input
                      ref={mosquePhotoInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      multiple
                      onChange={handleMosquePhotos}
                      style={{ display: 'none' }}
                    />
                  </label>
                  {mosquePhotos.length > 0 && (
                    <div className="submit-photo-grid">
                      {mosquePhotos.map((photo) => (
                        <div key={photo.id} className="submit-photo-item">
                          <img src={photo.preview} alt="معاينة صورة المسجد" />
                          <select
                            className="submit-photo-tag-select"
                            value={photo.tag}
                            onChange={(e) => setMosquePhotoTag(photo.id, e.target.value as PhotoTag)}
                          >
                            {PHOTO_TAGS.map((tag) => <option key={tag} value={tag}>{tag}</option>)}
                          </select>
                          <button type="button" className="submit-photo-remove" onClick={() => removeMosquePhoto(photo.id)} aria-label="إزالة الصورة">✕</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>

              {notice && <p role="alert" className={`submit-notice ${notice.type}`}>{notice.text}</p>}

              <button disabled={submitting} className="submit-cta">
                {submitting ? 'جارٍ الحفظ...' : 'تسجيل الكتاب'}
              </button>
            </form>
          </div>
        </main>
      </div>
    </div>
  )
}

function Field({ label: fieldLabel, ...props }: { label: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="submit-label">
      {fieldLabel}{props.required && <span className="submit-required">*</span>}
      <input {...props} className="submit-input" />
    </label>
  )
}