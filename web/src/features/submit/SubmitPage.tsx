import { useEffect, useMemo, useState } from 'react'
import type { FormEvent, InputHTMLAttributes } from 'react'
import { MapPicker } from '../onboarding/components/MapPicker'
import type { GeoPoint } from '../onboarding/types/location'
import { supabase } from '../../lib/supabase'
import { SiteNavigation } from '../../components/SiteNavigation'
import { useAuth } from '../../lib/auth.ts'

type Category = 'فقه' | 'حديث' | 'تفسير' | 'سيرة' | 'عقيدة' | 'تزكية' | 'أدب' | 'تاريخ' | 'أخرى'
type Mosque = { mosque_id: string; mosque_name: string | null; mosque_governorate: string; mosque_city: string; mosque_lat: number; mosque_lng: number }
type Notice = { type: 'error' | 'success'; text: string } | null

const CITIES: Record<string, string[]> = {
  القاهرة: ['مدينة نصر', 'المعادي', 'الزيتون', 'شبرا', 'حلوان', 'مصر الجديدة'], الجيزة: ['مدينة الجيزة', 'العياط', 'أطفيح', 'الصف', 'البدرشين'], الإسكندرية: ['المنتزه', 'سيدي بشر', 'اللبان', 'كرموز', 'العجمي'], المنيا: ['مدينة المنيا', 'ملوي', 'سمالوط', 'مغاغة', 'بني مزار', 'أبو قرقاص'], أسيوط: ['مدينة أسيوط', 'ديروط', 'القوصية', 'البداري', 'أبو تيج', 'منفلوط'], سوهاج: ['مدينة سوهاج', 'أخميم', 'طهطا', 'جرجا', 'دار السلام'], قنا: ['مدينة قنا', 'نجع حمادي', 'دشنا', 'قوص'], الأقصر: ['مدينة الأقصر', 'أرمنت', 'إسنا'], أسوان: ['مدينة أسوان', 'كوم أمبو', 'إدفو'],
}
const CATEGORIES: Category[] = ['فقه', 'حديث', 'تفسير', 'سيرة', 'عقيدة', 'تزكية', 'أدب', 'تاريخ', 'أخرى']

function label(mosque: Mosque) { return mosque.mosque_name || `مسجد في ${mosque.mosque_city}` }

export default function SubmitPage() {
  const { user, loading: authLoading } = useAuth()
  const [mosques, setMosques] = useState<Mosque[]>([])
  const [query, setQuery] = useState('')
  const [selectedMosque, setSelectedMosque] = useState<Mosque | null>(null)
  const [point, setPoint] = useState<GeoPoint | null>(null)
  const [governorate, setGovernorate] = useState('')
  const [city, setCity] = useState('')
  const [notice, setNotice] = useState<Notice>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!supabase) return
    // SELECT on mosques is publicly accessible (anon RLS policy) — no auth required
    supabase.from('mosques').select('mosque_id, mosque_name, mosque_governorate, mosque_city, mosque_lat, mosque_lng').order('created_at', { ascending: false }).limit(100).then(({ data, error }) => {
      if (error) setNotice({ type: 'error', text: 'تعذر تحميل المساجد. طبّق آخر migrations على Supabase ثم أعد المحاولة.' })
      else setMosques((data ?? []) as Mosque[])
    })
  }, [])

  const matches = useMemo(() => {
    const text = query.trim()
    if (!text) return mosques.slice(0, 8)
    return mosques.filter((mosque) => `${mosque.mosque_name ?? ''} ${mosque.mosque_city} ${mosque.mosque_governorate}`.includes(text)).slice(0, 8)
  }, [mosques, query])
  const cities = CITIES[governorate] ?? []

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setNotice(null)
    const formElement = event.currentTarget
    const form = new FormData(formElement)
    const title = String(form.get('title') ?? '').trim()
    if (!title) { setNotice({ type: 'error', text: 'يرجى إدخال عنوان الكتاب.' }); return }
    if (!supabase) { setNotice({ type: 'error', text: 'إعدادات Supabase غير موجودة في ملف البيئة.' }); return }
    if (!selectedMosque && (!governorate || !city || !point)) {
      setNotice({ type: 'error', text: 'اختر مسجداً موجوداً أو أدخل المحافظة والمدينة وحدد موقع المسجد على الخريطة.' }); return
    }
    setSubmitting(true)
    try {
      // Determine submission status based on authenticated user's role.
      // Guests (user === null) always submit as 'pending'.
      let submissionStatus: 'pending' | 'approved' = 'pending'
      let submittedBy: string | null = null

      if (user) {
        submittedBy = user.id
        const profileResult = await supabase.from('users').select('role').eq('user_id', user.id).maybeSingle()
        if (profileResult.error) throw profileResult.error
        const role = profileResult.data?.role
        if (role === 'volunteer' || role === 'admin') submissionStatus = 'approved'
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
        }
        // Only attach submitted_by if user is logged in (column is nullable)
        if (submittedBy) mosqueFields.submitted_by = submittedBy
        const mosque = await supabase.from('mosques').insert(mosqueFields).select('mosque_id').single()
        if (mosque.error) throw mosque.error
        mosqueId = mosque.data.mosque_id
      }

      // Upsert book (find by title or create)
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

      // Insert the mosque_books entry (junction record)
      const entryFields: Record<string, unknown> = {
        book_id: book.book_id,
        mosque_id: mosqueId,
        edition: String(form.get('edition') ?? '').trim() || null,
        publisher: String(form.get('publisher') ?? '').trim() || null,
        status: submissionStatus,
      }
      // Only attach submitted_by if the user is logged in
      if (submittedBy) entryFields.submitted_by = submittedBy
      const entry = await supabase.from('mosque_books').insert(entryFields).select('id').single()
      if (entry.error) throw entry.error

      formElement.reset(); setSelectedMosque(null); setPoint(null); setGovernorate(''); setCity('')
      const isGuest = !user
      setNotice({
        type: 'success',
        text: isGuest
          ? 'شكراً! تم إرسال الكتاب وسيظهر بعد مراجعة المشرف. يمكنك المتابعة دون حساب.'
          : submissionStatus === 'approved'
            ? 'تم تسجيل الكتاب وإضافته مباشرة إلى الفهرس.'
            : 'تم إرسال الطلب وسيظهر بعد موافقة المشرف.',
      })
    } catch (error: any) {
      const message = error?.message || 'تعذر حفظ التسجيل.'
      setNotice({ type: 'error', text: message.includes('duplicate') || message.includes('unique') ? 'هذا الكتاب بهذه الطبعة مسجل بالفعل في المسجد.' : message })
    } finally { setSubmitting(false) }
  }

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
              {/* Guest info banner — shown only when not logged in and auth is done loading */}
              {!authLoading && !user && (
                <div className="submit-guest-notice" role="note">
                  <span>🌐</span>
                  <span>تسجيل الدخول غير مطلوب — يمكنك إضافة كتاب مباشرة وسيراجعه المشرف قبل نشره.</span>
                  <a href="/login?redirect=/submit">تسجيل الدخول</a>
                </div>
              )}
            </header>

            <form onSubmit={submit} className="submit-form">
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

              <section className="submit-section">
                <h2 className="submit-section-title">المسجد وموقعه</h2>
                <p className="submit-section-desc">ابحث عن مسجد موجود، أو أضف مسجداً جديداً وحدد موقعه على الخريطة.</p>

                {!selectedMosque ? (
                  <>
                    <label className="submit-label">
                      البحث عن مسجد
                      <input value={query} onChange={(event) => setQuery(event.target.value)} className="submit-input" placeholder="الاسم أو المدينة أو المحافظة" />
                    </label>
                    {matches.length > 0 && (
                      <div className="submit-mosque-list">
                        {matches.map((mosque) => (
                          <button type="button" key={mosque.mosque_id} onClick={() => { setSelectedMosque(mosque); setPoint({ lat: mosque.mosque_lat, lng: mosque.mosque_lng }) }} className="submit-mosque-item">
                            <strong>{label(mosque)}</strong>
                            <span className="submit-mosque-loc">{mosque.mosque_city}، {mosque.mosque_governorate}</span>
                          </button>
                        ))}
                      </div>
                    )}
                    <div className="submit-divider">أو أضف مسجداً جديداً</div>
                    <div className="submit-grid">
                      <label className="submit-label">
                        المحافظة
                        <select value={governorate} onChange={(event) => { setGovernorate(event.target.value); setCity(CITIES[event.target.value]?.[0] ?? '') }} className="submit-input">
                          <option value="">اختر المحافظة</option>
                          {Object.keys(CITIES).map((item) => <option key={item}>{item}</option>)}
                        </select>
                      </label>
                      <label className="submit-label">
                        المدينة / المركز
                        <select value={city} onChange={(event) => setCity(event.target.value)} disabled={!cities.length} className="submit-input">
                          <option value="">اختر المدينة</option>
                          {cities.map((item) => <option key={item}>{item}</option>)}
                        </select>
                      </label>
                    </div>
                    <label className="submit-label">
                      اسم المسجد (اختياري)
                      <input name="mosqueName" className="submit-input" placeholder="مثال: مسجد النور" />
                    </label>
                    <MapPicker point={point} onPick={setPoint} className="submit-map" />
                    <p className="submit-map-hint">تحديد الموقع على الخريطة مطلوب عند إضافة مسجد جديد.</p>
                  </>
                ) : (
                  <div className="submit-mosque-selected">
                    <div>
                      <strong>{label(selectedMosque)}</strong>
                      <p>{selectedMosque.mosque_city}، {selectedMosque.mosque_governorate}</p>
                    </div>
                    <button type="button" onClick={() => { setSelectedMosque(null); setPoint(null) }} className="submit-change-link">تغيير</button>
                  </div>
                )}
              </section>

              {notice && (
                <p role="alert" className={`submit-notice ${notice.type}`}>{notice.text}</p>
              )}

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
      {fieldLabel}
      {props.required && <span className="submit-required">*</span>}
      <input {...props} className="submit-input" />
    </label>
  )
}