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

const CATEGORIES: Category[] = ['فقه', 'حديث', 'تفسير', 'سيرة', 'عقيدة', 'تزكية', 'أدب', 'تاريخ', 'أخرى']

export const COUNTRIES = [
  'مصر', 'السعودية', 'الإمارات', 'المغرب', 'الجزائر', 'تونس', 'ليبيا', 'السودان',
  'الأردن', 'فلسطين', 'سوريا', 'لبنان', 'العراق', 'اليمن', 'الكويت', 'قطر',
  'البحرين', 'عُمان', 'باكستان', 'تركيا', 'إندونيسيا', 'ماليزيا', 'الصومال',
  'موريتانيا', 'مالي', 'النيجر', 'السنغال', 'جيبوتي',
]

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
  const [point, setPoint] = useState<GeoPoint | null>(null)

  // Derived: governorates and cities from live DB for Egypt
  const [liveGovs, setLiveGovs] = useState<string[]>([])
  const [liveCities, setLiveCities] = useState<string[]>([])

  // Photo upload
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const photoInputRef = useRef<HTMLInputElement>(null)

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
        // Derive Egypt governorates/cities for cascading dropdowns
        const govSet = new Set<string>()
        for (const m of list) if ((m.country ?? 'مصر') === 'مصر') govSet.add(m.mosque_governorate)
        setLiveGovs(Array.from(govSet).sort())
      })
  }, [])

  // When user selects a governorate, derive cities
  useEffect(() => {
    if (!governorate) { setLiveCities([]); return }
    const citySet = new Set<string>()
    for (const m of mosques) {
      if ((m.mosque_country ?? 'مصر') === country && m.mosque_governorate === governorate) citySet.add(m.mosque_city)
    }
    setLiveCities(Array.from(citySet).sort())
    setCity('')
  }, [governorate, country, mosques])

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
    if (result.state) setGovernorate(result.state)
    if (result.city) setCity(result.city)
  }

  // Photo file selection
  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null
    setPhotoFile(file)
    if (file) {
      const url = URL.createObjectURL(file)
      setPhotoPreview(url)
    } else {
      setPhotoPreview(null)
    }
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

      // Upload mosque photo if provided
      let mosqueImageUrl: string | null = null
      if (photoFile && supabase) {
        const ext = photoFile.name.split('.').pop() ?? 'jpg'
        const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('mosque-images')
          .upload(path, photoFile, { contentType: photoFile.type, upsert: false })
        if (uploadError) throw uploadError
        const { data: urlData } = supabase.storage.from('mosque-images').getPublicUrl(uploadData.path)
        mosqueImageUrl = urlData.publicUrl
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

      // Upsert book record
      const bookFields = {
        title,
        author: String(form.get('author') ?? '').trim() || null,
        category: String(form.get('category') ?? '') || null,
        extra_info: String(form.get('notes') ?? '').trim() || null,
      }
      const existingBook = await supabase.from('books').select('book_id').eq('title', title).maybeSingle()
      if (existingBook.error) throw existingBook.error
      let book = existingBook.data
      if (!book) {
        const insertedBook = await supabase.from('books').insert(bookFields).select('book_id').single()
        if (insertedBook.error) throw insertedBook.error
        book = insertedBook.data
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
      setPhotoFile(null); setPhotoPreview(null)
      setNotice({
        type: 'success',
        text: !user
          ? 'شكراً! تم إرسال الكتاب وسيظهر بعد مراجعة المشرف.'
          : submissionStatus === 'approved'
            ? 'تم تسجيل الكتاب وإضافته مباشرة إلى الفهرس.'
            : 'تم إرسال الطلب وسيظهر بعد موافقة المشرف.',
      })
    } catch (error: any) {
      const message = error?.message || 'تعذر حفظ التسجيل.'
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
                      <select value={country} onChange={(e) => { setCountry(e.target.value); setGovernorate(''); setCity('') }} className="submit-input">
                        {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </label>

                    <div className="submit-grid">
                      {isEgypt ? (
                        <>
                          <label className="submit-label">
                            المحافظة
                            <select value={governorate} onChange={(e) => setGovernorate(e.target.value)} className="submit-input">
                              <option value="">اختر المحافظة</option>
                              {liveGovs.map((g) => <option key={g}>{g}</option>)}
                            </select>
                          </label>
                          <label className="submit-label">
                            المدينة / المركز
                            <select value={city} onChange={(e) => setCity(e.target.value)} disabled={!liveCities.length} className="submit-input">
                              <option value="">اختر المدينة</option>
                              {liveCities.map((c) => <option key={c}>{c}</option>)}
                            </select>
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

                {/* ── Mosque Photo Upload ── */}
                <div className="submit-photo-section">
                  <label className="submit-label">
                    صورة المسجد (اختياري)
                    <div className="submit-photo-area" onClick={() => photoInputRef.current?.click()} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && photoInputRef.current?.click()}>
                      {photoPreview
                        ? <img src={photoPreview} alt="معاينة المسجد" className="submit-photo-preview" />
                        : (
                          <div className="submit-photo-placeholder">
                            <span>🖼️</span>
                            <strong>انقر لرفع صورة المسجد</strong>
                            <small>JPG أو PNG · حتى 5 ميغابايت</small>
                          </div>
                        )
                      }
                    </div>
                    <input
                      ref={photoInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handlePhoto}
                      style={{ display: 'none' }}
                    />
                  </label>
                  {photoFile && (
                    <button type="button" className="submit-change-link" style={{ marginTop: 6 }} onClick={() => { setPhotoFile(null); setPhotoPreview(null); if (photoInputRef.current) photoInputRef.current.value = '' }}>
                      إزالة الصورة
                    </button>
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