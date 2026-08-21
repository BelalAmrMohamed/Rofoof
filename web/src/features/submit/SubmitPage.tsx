import { useEffect, useMemo, useState } from 'react'
import type { FormEvent, InputHTMLAttributes } from 'react'
import { MapPicker } from '../onboarding/components/MapPicker'
import type { GeoPoint } from '../onboarding/types/location'
import { supabase } from '../../lib/supabase'
import { SiteNavigation } from '../../components/SiteNavigation'

type Category = 'فقه' | 'حديث' | 'تفسير' | 'سيرة' | 'عقيدة' | 'تزكية' | 'أدب' | 'تاريخ' | 'أخرى'
type Mosque = { mosque_id: string; mosque_name: string | null; mosque_governorate: string; mosque_city: string; mosque_lat: number; mosque_lng: number }
type Notice = { type: 'error' | 'success'; text: string } | null

const CITIES: Record<string, string[]> = {
  القاهرة: ['مدينة نصر', 'المعادي', 'الزيتون', 'شبرا', 'حلوان', 'مصر الجديدة'], الجيزة: ['مدينة الجيزة', 'العياط', 'أطفيح', 'الصف', 'البدرشين'], الإسكندرية: ['المنتزه', 'سيدي بشر', 'اللبان', 'كرموز', 'العجمي'], المنيا: ['مدينة المنيا', 'ملوي', 'سمالوط', 'مغاغة', 'بني مزار', 'أبو قرقاص'], أسيوط: ['مدينة أسيوط', 'ديروط', 'القوصية', 'البداري', 'أبو تيج', 'منفلوط'], سوهاج: ['مدينة سوهاج', 'أخميم', 'طهطا', 'جرجا', 'دار السلام'], قنا: ['مدينة قنا', 'نجع حمادي', 'دشنا', 'قوص'], الأقصر: ['مدينة الأقصر', 'أرمنت', 'إسنا'], أسوان: ['مدينة أسوان', 'كوم أمبو', 'إدفو'],
}
const CATEGORIES: Category[] = ['فقه', 'حديث', 'تفسير', 'سيرة', 'عقيدة', 'تزكية', 'أدب', 'تاريخ', 'أخرى']

function label(mosque: Mosque) { return mosque.mosque_name || `مسجد في ${mosque.mosque_city}` }

export default function SubmitPage() {
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
    const form = new FormData(formElement); const title = String(form.get('title') ?? '').trim()
    if (!title) { setNotice({ type: 'error', text: 'يرجى إدخال عنوان الكتاب.' }); return }
    if (!supabase) { setNotice({ type: 'error', text: 'إعدادات Supabase غير موجودة في ملف البيئة.' }); return }
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { window.location.assign('/login?redirect=/submit'); return }
    if (!selectedMosque && (!governorate || !city || !point)) { setNotice({ type: 'error', text: 'اختر مسجداً موجوداً أو أدخل المحافظة والمدينة وحدد موقع المسجد على الخريطة.' }); return }
    setSubmitting(true)
    try {
      const profileResult = await supabase.from('users').select('role').eq('user_id', user.id).maybeSingle()
      if (profileResult.error) throw profileResult.error
      const profile = profileResult.data
      const submissionStatus = profile?.role === 'volunteer' || profile?.role === 'admin' ? 'approved' : 'pending'
      let mosqueId = selectedMosque?.mosque_id
      if (!mosqueId) {
        const mosque = await supabase.from('mosques').insert({ mosque_name: String(form.get('mosqueName') ?? '').trim() || null, mosque_governorate: governorate, mosque_city: city, mosque_lat: point!.lat, mosque_lng: point!.lng, submitted_by: user.id }).select('mosque_id').single()
        if (mosque.error) throw mosque.error
        mosqueId = mosque.data.mosque_id
      }
      const bookFields = { title, author: String(form.get('author') ?? '').trim() || null, category: String(form.get('category') ?? '') || null, extra_info: String(form.get('notes') ?? '').trim() || null }
      const existingBook = await supabase.from('books').select('book_id').eq('title', title).maybeSingle()
      if (existingBook.error) throw existingBook.error
      let book = existingBook.data
      if (!book) {
        const insertedBook = await supabase.from('books').insert(bookFields).select('book_id').single()
        if (insertedBook.error) throw insertedBook.error
        book = insertedBook.data
      }
      if (!book) throw new Error('تعذر إنشاء سجل الكتاب.')
      const entry = await supabase.from('mosque_books').insert({ book_id: book.book_id, mosque_id: mosqueId, edition: String(form.get('edition') ?? '').trim() || null, publisher: String(form.get('publisher') ?? '').trim() || null, submitted_by: user.id, status: submissionStatus }).select('id').single()
      if (entry.error) throw entry.error
      formElement.reset(); setSelectedMosque(null); setPoint(null); setGovernorate(''); setCity('')
      setNotice({ type: 'success', text: 'تم تسجيل الكتاب وإرساله بنجاح. سيظهر بعد الموافقة إذا كان حسابك زائراً.' })
    } catch (error: any) {
      const message = error?.message || 'تعذر حفظ التسجيل.'
      setNotice({ type: 'error', text: message.includes('duplicate') || message.includes('unique') ? 'هذا الكتاب بهذه الطبعة مسجل بالفعل في المسجد.' : message })
    } finally { setSubmitting(false) }
  }

  return <div className="site-layout" dir="rtl"><SiteNavigation active="submit" /><div className="site-content"><main className="min-h-screen bg-[#f9f6f1] px-4 py-8 font-[Tajawal,sans-serif] text-[#1c1814] md:px-8"><div className="mx-auto max-w-3xl">
    <header className="mb-6"><a href="/browse" className="text-sm font-bold text-[#146654]">← العودة إلى التصفح</a><h1 className="mt-5 font-serif text-3xl font-black text-[#0e5040]">تسجيل كتاب جديد</h1><p className="mt-2 text-sm text-[#695f56]">أضف كتاباً وجدته على رفوف مسجد وساعد الآخرين على الوصول إليه.</p></header>
    <form onSubmit={submit} className="space-y-5"><section className="rounded-2xl border border-[#e8e4de] bg-white p-5 shadow-sm md:p-7"><h2 className="mb-5 text-lg font-black">معلومات الكتاب</h2><div className="grid gap-4 md:grid-cols-2"><Field name="title" label="عنوان الكتاب" required placeholder="مثال: فقه السنة" /><Field name="author" label="اسم المؤلف" placeholder="مثال: السيد سابق" /><Field name="edition" label="رقم الطبعة" placeholder="مثال: الطبعة الثالثة" /><Field name="publisher" label="دار النشر" placeholder="مثال: دار الفكر" /></div><label className="mt-4 block text-sm font-bold">التصنيف<select name="category" className="form-input mt-2"><option value="">اختر تصنيفاً</option>{CATEGORIES.map((item) => <option key={item}>{item}</option>)}</select></label><label className="mt-4 block text-sm font-bold">ملاحظات إضافية<textarea name="notes" className="form-input mt-2 min-h-24 py-3" placeholder="حالة الكتاب أو أي معلومات مفيدة للقراء" /></label></section>
      <section className="rounded-2xl border border-[#e8e4de] bg-white p-5 shadow-sm md:p-7"><h2 className="mb-1 text-lg font-black">المسجد وموقعه</h2><p className="mb-5 text-sm text-[#695f56]">ابحث عن مسجد موجود، أو أضف مسجداً جديداً وحدد موقعه على الخريطة.</p>{!selectedMosque ? <><label className="block text-sm font-bold">البحث عن مسجد<input value={query} onChange={(event) => setQuery(event.target.value)} className="form-input mt-2" placeholder="الاسم أو المدينة أو المحافظة" /></label>{matches.length > 0 && <div className="mt-2 overflow-hidden rounded-xl border border-[#e8e4de]">{matches.map((mosque) => <button type="button" key={mosque.mosque_id} onClick={() => { setSelectedMosque(mosque); setPoint({ lat: mosque.mosque_lat, lng: mosque.mosque_lng }) }} className="block w-full border-b border-[#f2ede8] px-4 py-3 text-right last:border-0 hover:bg-[#edfaf4]"><strong>{label(mosque)}</strong><span className="block text-xs text-[#695f56]">{mosque.mosque_city}، {mosque.mosque_governorate}</span></button>)}</div>}<div className="my-5 flex items-center gap-3 text-xs text-[#9a8f84] before:h-px before:flex-1 before:bg-[#e8e4de] after:h-px after:flex-1 after:bg-[#e8e4de]">أو أضف مسجداً جديداً</div><div className="grid gap-4 md:grid-cols-2"><label className="text-sm font-bold">المحافظة<select value={governorate} onChange={(event) => { setGovernorate(event.target.value); setCity(CITIES[event.target.value]?.[0] ?? '') }} className="form-input mt-2"><option value="">اختر المحافظة</option>{Object.keys(CITIES).map((item) => <option key={item}>{item}</option>)}</select></label><label className="text-sm font-bold">المدينة / المركز<select value={city} onChange={(event) => setCity(event.target.value)} disabled={!cities.length} className="form-input mt-2"><option value="">اختر المدينة</option>{cities.map((item) => <option key={item}>{item}</option>)}</select></label></div><label className="mt-4 block text-sm font-bold">اسم المسجد (اختياري)<input name="mosqueName" className="form-input mt-2" placeholder="مثال: مسجد النور" /></label></> : <div className="flex items-center justify-between rounded-xl border border-[#d3f2e8] bg-[#edfaf4] p-4"><div><strong>{label(selectedMosque)}</strong><p className="text-sm text-[#146654]">{selectedMosque.mosque_city}، {selectedMosque.mosque_governorate}</p></div><button type="button" onClick={() => { setSelectedMosque(null); setPoint(null) }} className="text-sm font-bold text-[#146654]">تغيير</button></div>}{!selectedMosque && <><MapPicker point={point} onPick={setPoint} className="mt-5 h-72" /><p className="mt-2 text-xs text-[#695f56]">تحديد الموقع على الخريطة مطلوب عند إضافة مسجد جديد.</p></>}</section>
      {notice && <p role="alert" className={`rounded-xl px-4 py-3 text-sm font-bold ${notice.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-[#edfaf4] text-[#146654]'}`}>{notice.text}</p>}<button disabled={submitting} className="h-14 w-full rounded-xl bg-gradient-to-l from-[#0e5040] to-[#229670] text-base font-black text-white shadow-md transition hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-60">{submitting ? 'جارٍ الحفظ...' : 'تسجيل الكتاب'}</button>
    </form></div></main></div></div>
}

function Field({ label, ...props }: { label: string } & InputHTMLAttributes<HTMLInputElement>) { return <label className="block text-sm font-bold">{label}{props.required && <span className="mr-1 text-[#c49a3c]">*</span>}<input {...props} className="form-input mt-2" /></label> }