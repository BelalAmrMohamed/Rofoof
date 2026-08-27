import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { SiteNavigation } from '../../components/SiteNavigation'

type FeedbackItem = {
  id: string
  message: string
  email: string | null
  rating: number | null
  created_at: string
  user_id: string | null
  submitter_name: string | null
}
type Notice = { type: 'error' | 'success'; text: string } | null

export default function AdminFeedbackPage() {
  const [items, setItems] = useState<FeedbackItem[]>([])
  const [loading, setLoading] = useState(true)
  const [access, setAccess] = useState<'checking' | 'allowed' | 'denied'>('checking')
  const [notice, setNotice] = useState<Notice>(null)

  async function load() {
    if (!supabase) { setAccess('denied'); setNotice({ type: 'error', text: 'إعدادات Supabase غير موجودة.' }); setLoading(false); return }
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setAccess('denied'); setNotice({ type: 'error', text: 'يجب تسجيل الدخول بحساب مدير للوصول إلى الآراء.' }); setLoading(false); return }
    const profile = await supabase.from('users').select('role').eq('user_id', user.id).maybeSingle()
    if (profile.error || profile.data?.role !== 'admin') { setAccess('denied'); setNotice({ type: 'error', text: 'هذه الصفحة مخصصة للمديرين فقط.' }); setLoading(false); return }
    const result = await supabase.rpc('admin_get_all_feedback_with_submitter')
    if (result.error) { setNotice({ type: 'error', text: result.error.message }); setLoading(false); return }
    setItems((result.data ?? []) as FeedbackItem[])
    setAccess('allowed')
    setLoading(false)
  }

  useEffect(() => {
    const timer = window.setTimeout(() => { void load() }, 0)
    return () => window.clearTimeout(timer)
  }, [])

  if (loading || access === 'checking') return <div className="site-layout" dir="rtl"><SiteNavigation active="requests" /><div className="site-content"><main className="requests-page"><div className="requests-shell"><p className="requests-message">جارٍ التحميل...</p></div></main></div></div>
  if (access === 'denied') return <div className="site-layout" dir="rtl"><SiteNavigation active="requests" /><div className="site-content"><main className="requests-page"><div className="requests-shell"><a href="/browse" className="back-link">العودة إلى التصفح ←</a><div className="access-panel"><div className="access-icon">🔒</div><h1>آراء المستخدمين</h1><p>{notice?.text}</p><a href="/login?redirect=/admin/feedback" className="primary-action">تسجيل الدخول</a></div></div></main></div></div>

  return (
    <div className="site-layout" dir="rtl">
      <SiteNavigation active="requests" />
      <div className="site-content">
        <main className="requests-page">
          <div className="requests-shell">
            <header className="requests-header">
              <div>
                <a href="/requests" className="back-link">العودة إلى الطلبات ←</a>
                <h1>آراء المستخدمين</h1>
                <p>كل الآراء المُرسَلة من صفحة "عن المنصة"، الأحدث أولاً</p>
              </div>
            </header>
            {notice && <p className={`request-notice ${notice.type}`} role="status">{notice.text}</p>}
            {items.length ? (
              <div className="request-grid">
                {items.map((item) => (
                  <article key={item.id} className="request-card">
                    <div className="request-card-body">
                      <div className="request-card-top">
                        <div>
                          <h2>{item.submitter_name || 'زائر'}</h2>
                          <p>{item.email || 'بدون بريد إلكتروني'}</p>
                        </div>
                        {item.rating && <span className="category-tag">{'★'.repeat(item.rating)}{'☆'.repeat(5 - item.rating)}</span>}
                      </div>
                      <dl>
                        <div><dt>الرسالة</dt><dd>{item.message}</dd></div>
                        <div><dt>التاريخ</dt><dd>{new Date(item.created_at).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })}</dd></div>
                      </dl>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-request"><span>✓</span><h2>لا توجد آراء بعد</h2><p>ستظهر هنا الآراء المرسلة من صفحة "عن المنصة".</p></div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
