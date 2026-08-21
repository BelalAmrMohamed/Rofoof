import { useState } from 'react'
import type { FormEvent, InputHTMLAttributes } from 'react'
import { supabase } from '../../lib/supabase'
import { getUserAvatar, getUserName, useAuth } from '../../lib/auth.ts'

type Mode = 'login' | 'register'
type Notice = { type: 'error' | 'success'; text: string } | null

const governorates = ['القاهرة', 'الجيزة', 'الإسكندرية', 'المنيا', 'أسيوط', 'سوهاج', 'قنا', 'الأقصر', 'أسوان']
const cities: Record<string, string[]> = {
  القاهرة: ['القاهرة', 'مدينة نصر', 'مصر الجديدة', 'المعادي'],
  الجيزة: ['الجيزة', '6 أكتوبر', 'الشيخ زايد', 'البدرشين'],
  الإسكندرية: ['الإسكندرية', 'المنتزه', 'العامرية', 'برج العرب'],
  المنيا: ['المنيا', 'ملوي', 'بني مزار', 'سمالوط'],
  أسيوط: ['أسيوط', 'ديروط', 'منفلوط', 'القوصية'],
  سوهاج: ['سوهاج', 'طهطا', 'جرجا', 'أخميم'],
  قنا: ['قنا', 'نجع حمادي', 'دشنا', 'أبو تشت'],
  الأقصر: ['الأقصر', 'إسنا', 'الطود'],
  أسوان: ['أسوان', 'كوم أمبو', 'إدفو'],
}

function BrandPanel() {
  return (
    <aside className="relative order-1 flex min-h-[180px] w-full items-center justify-center overflow-hidden bg-[#0b1f14] px-6 py-8 text-center text-[#edd898] md:order-2 md:min-h-screen md:w-[44%] md:px-12">
      <div className="absolute inset-0 opacity-15 [background-image:linear-gradient(45deg,transparent_45%,#c49a3c_46%,#c49a3c_47%,transparent_48%),linear-gradient(-45deg,transparent_45%,#c49a3c_46%,#c49a3c_47%,transparent_48%)] [background-size:70px_70px]" aria-hidden="true" />
      <div className="relative flex items-center gap-4 md:flex-col md:gap-0">
        <div className="mb-0 grid size-12 place-items-center rounded-2xl border border-[#d4b060]/50 md:mb-7 md:size-[72px]"><img src="/favicon.svg" alt="" className="size-8 md:size-12" /></div>
        <div className="font-serif text-2xl font-bold leading-[1.55] md:text-[42px]">على رفوف<br />المساجد</div>
        <div className="my-4 hidden h-px w-14 bg-[#d4b060] md:block" />
        <p className="hidden max-w-[280px] text-sm italic leading-8 text-white/40 md:block">معظم المساجد يكون بها مكتبة ثرية بالكتب —<br />ولا يكاد يقرأها أحد</p>
      </div>
      <a href="/browse" className="absolute bottom-8 hidden text-sm text-white/40 transition hover:text-[#d4b060] md:block">تصفح بدون تسجيل ←</a>
    </aside>
  )
}

function GoogleIcon() {
  return <svg aria-hidden="true" className="size-[18px]" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="#FBBC05" d="M5.84 14.09A7.96 7.96 0 0 1 5.49 12c0-.73.13-1.43.35-2.09V7.07H2.18A11.98 11.98 0 0 0 1 12c0 1.78.43 3.45 1.18 4.93l3.66-2.84z" /><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>
}

function Field({ label, ...props }: { label: string } & InputHTMLAttributes<HTMLInputElement>) {
  return <label className="block text-sm font-bold text-[#2a1e0c]">{label}<span className="mr-1 text-[#c49a3c]">*</span><input {...props} className="mt-2 h-12 w-full rounded-[10px] border-[1.5px] border-[#d8cbaa] bg-white px-3.5 font-normal outline-none transition focus:border-[#c49a3c] focus:ring-4 focus:ring-[#c49a3c]/15" /></label>
}

export default function LoginPage() {
  const { user, loading: authLoading } = useAuth()
  const [mode, setMode] = useState<Mode>('login')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [notice, setNotice] = useState<Notice>(null)
  const [governorate, setGovernorate] = useState('')

  async function handleSignOut() {
    if (!supabase) return
    await supabase.auth.signOut()
  }

  async function handleGoogle() {
    setNotice(null)
    if (!supabase) { setNotice({ type: 'error', text: 'أضف إعدادات Supabase إلى ملف البيئة أولاً.' }); return }
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${window.location.origin}/` } })
    if (error) setNotice({ type: 'error', text: error.message })
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setNotice(null)
    const data = new FormData(event.currentTarget)
    const email = String(data.get('email') ?? '')
    const password = String(data.get('password') ?? '')
    setSubmitting(true)
    if (!supabase) {
      setNotice({ type: 'error', text: 'أضف VITE_SUPABASE_URL و VITE_SUPABASE_PUBLISHABLE_KEY إلى ملف البيئة.' })
    } else if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setNotice({ type: 'error', text: error.message })
      else window.location.assign(new URLSearchParams(window.location.search).get('redirect') || '/')
    } else {
      const { error } = await supabase.auth.signUp({ email, password, options: { data: { fullname: data.get('name') } } })
      if (error) setNotice({ type: 'error', text: error.message })
      else setNotice({ type: 'success', text: 'تم إنشاء الحساب. تحقق من بريدك الإلكتروني لتفعيله.' })
    }
    setSubmitting(false)
  }

  const availableCities = cities[governorate] ?? []
  if (authLoading) return <main dir="rtl" className="grid min-h-screen place-items-center bg-[#fdf8ee] font-[Tajawal,sans-serif] text-[#2a1e0c]">جارٍ التحقق من الجلسة...</main>
  if (user) {
    const avatar = getUserAvatar(user)
    const name = getUserName(user)
    return <main dir="rtl" className="grid min-h-screen place-items-center bg-[#fdf8ee] px-5 font-[Tajawal,sans-serif] text-[#2a1e0c]"><section className="w-full max-w-[420px] rounded-2xl border border-[#d8cbaa] bg-white p-8 text-center shadow-sm"><div className="mx-auto mb-4 grid size-16 place-items-center overflow-hidden rounded-full bg-[#f5edd8] text-2xl font-bold text-[#2c5a3c]">{avatar ? <img src={avatar} alt="" className="size-full object-cover" /> : name[0]}</div><h1 className="font-serif text-2xl font-bold">أنت مسجّل الدخول بالفعل</h1><p className="mt-2 text-sm text-[#8a7a5c]">{name} · {user.email}</p><div className="mt-6 flex gap-3"><a href="/profile" className="flex-1 rounded-[10px] bg-[#0b1f14] py-3 font-bold text-white">الملف الشخصي</a><button type="button" onClick={() => void handleSignOut()} className="flex-1 rounded-[10px] border border-[#d8cbaa] py-3 font-bold">تسجيل الخروج</button></div></section></main>
  }
  return <main dir="rtl" className="flex min-h-screen flex-col bg-[#fdf8ee] font-[Tajawal,sans-serif] text-[#2a1e0c] md:flex-row">
    <section className="order-2 flex flex-1 items-center justify-center overflow-y-auto bg-[#fdf8ee] px-5 py-8 md:order-1 md:px-8">
      <div className="w-full max-w-[420px]">
        <div className="mb-8 flex gap-1 rounded-2xl border border-[#d8cbaa] bg-[#f5edd8] p-1" role="tablist">
          {(['login', 'register'] as Mode[]).map((tab) => <button key={tab} type="button" role="tab" aria-selected={mode === tab} onClick={() => { setMode(tab); setNotice(null) }} className={`flex-1 rounded-xl py-2.5 text-sm transition ${mode === tab ? 'bg-white font-bold text-[#2a1e0c] shadow-sm' : 'text-[#8a7a5c]'}`}>{tab === 'login' ? 'تسجيل الدخول' : 'إنشاء حساب'}</button>)}
        </div>
        <h1 className="font-serif text-3xl font-bold leading-snug">{mode === 'login' ? 'أهلاً بعودتك' : 'انضم إلينا'}</h1>
        <p className="mb-7 mt-1 text-sm leading-8 text-[#8a7a5c]">{mode === 'login' ? 'سجّل دخولك للمساهمة في فهرسة كتب مساجد مصر' : 'أنشئ حساباً للمساهمة في فهرسة كتب مساجد مصر'}</p>
        <button type="button" onClick={handleGoogle} className="flex h-12 w-full items-center justify-center gap-2.5 rounded-[10px] border-[1.5px] border-[#d8cbaa] bg-white text-sm font-bold transition hover:border-[#b8a880] hover:shadow-sm"><GoogleIcon />{mode === 'login' ? 'الدخول عبر Google' : 'التسجيل عبر Google'}</button>
        <div className="my-5 flex items-center gap-3 text-xs text-[#8a7a5c] before:h-px before:flex-1 before:bg-[#d8cbaa] after:h-px after:flex-1 after:bg-[#d8cbaa]">أو بالبريد الإلكتروني</div>
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && <Field label="الاسم الكامل" name="name" type="text" placeholder="مثال: محمد أحمد" autoComplete="name" required />}
          <Field label="البريد الإلكتروني" name="email" type="email" placeholder="name@example.com" autoComplete="email" dir="ltr" required />
          <label className="block text-sm font-bold">كلمة المرور<span className="mr-1 text-[#c49a3c]">*</span><div className="relative"><input name="password" type={showPassword ? 'text' : 'password'} minLength={mode === 'register' ? 8 : undefined} placeholder={mode === 'register' ? '٨ أحرف على الأقل' : '••••••••'} autoComplete={mode === 'register' ? 'new-password' : 'current-password'} required className="mt-2 h-12 w-full rounded-[10px] border-[1.5px] border-[#d8cbaa] bg-white px-3.5 pl-12 font-normal outline-none transition focus:border-[#c49a3c] focus:ring-4 focus:ring-[#c49a3c]/15" /><button type="button" aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'} onClick={() => setShowPassword(!showPassword)} className="absolute left-3 top-1/2 mt-1 -translate-y-1/2 p-1 text-[#8a7a5c]">{showPassword ? '◉' : '◌'}</button></div></label>
          {mode === 'register' && <div className="grid grid-cols-1 gap-3 sm:grid-cols-2"><label className="text-sm font-bold">المحافظة<span className="mr-1 text-[#c49a3c]">*</span><select name="governorate" value={governorate} onChange={(event) => setGovernorate(event.target.value)} required className="mt-2 h-12 w-full rounded-[10px] border-[1.5px] border-[#d8cbaa] bg-white px-3 text-sm font-normal outline-none focus:border-[#c49a3c]"><option value="">اختر المحافظة</option>{governorates.map((item) => <option key={item}>{item}</option>)}</select></label><label className="text-sm font-bold">المدينة<span className="mr-1 text-[#c49a3c]">*</span><select name="city" required disabled={!availableCities.length} className="mt-2 h-12 w-full rounded-[10px] border-[1.5px] border-[#d8cbaa] bg-white px-3 text-sm font-normal outline-none focus:border-[#c49a3c]"><option value="">{availableCities.length ? 'اختر المدينة' : 'اختر المحافظة أولاً'}</option>{availableCities.map((item) => <option key={item}>{item}</option>)}</select></label></div>}
          {notice && <p role="alert" className={`rounded-lg px-3 py-2 text-sm ${notice.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>{notice.text}</p>}
          <button type="submit" disabled={submitting} className="mt-2 h-[52px] w-full rounded-[10px] bg-[#0b1f14] text-base font-bold text-white transition hover:bg-[#1c3d28] disabled:cursor-wait disabled:opacity-70">{submitting ? 'جارٍ المعالجة...' : mode === 'login' ? 'تسجيل الدخول' : 'إنشاء الحساب'}</button>
        </form>
        <p className="mt-5 text-center text-sm text-[#8a7a5c]">{mode === 'login' ? 'ليس لديك حساب؟' : 'لديك حساب بالفعل؟'} <button type="button" onClick={() => setMode(mode === 'login' ? 'register' : 'login')} className="font-bold text-[#2c5a3c] hover:text-[#2a1e0c]">{mode === 'login' ? 'إنشاء حساب جديد' : 'تسجيل الدخول'}</button></p>
      </div>
    </section>
    <BrandPanel />
  </main>
}
