import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { SiteNavigation } from '../../components/SiteNavigation'

type Status = 'pending' | 'approved' | 'rejected'
type Section = 'books' | 'volunteers'

type BookRequest = {
  entry_id: string; status: Status; rejection_note: string | null; submitted_at: string; reviewed_at: string | null
  title: string; author: string | null; category: string | null; edition: string | null; publisher: string | null
  mosque_name: string | null; mosque_governorate: string; mosque_city: string; submitted_by_name: string | null
}

type VolunteerRequest = {
  id: string; status: Status; message: string | null; rejection_note: string | null
  created_at: string; reviewed_at: string | null
  user_id: string; fullname: string; email: string | null; reviewed_by_name: string | null
}

type Notice = { type: 'error' | 'success'; text: string } | null

const statusTabs: { key: Status; label: string }[] = [{ key: 'pending', label: 'في الانتظار' }, { key: 'approved', label: 'موافق عليه' }, { key: 'rejected', label: 'مرفوض' }]
const filters = ['الكل', 'المنيا', 'القاهرة', 'الإسكندرية', 'أسيوط', 'فقه', 'حديث']

export default function RequestsPage() {
  const [section, setSection] = useState<Section>('books')

  // Book submissions
  const [requests, setRequests] = useState<BookRequest[]>([])
  const [tab, setTab] = useState<Status>('pending')
  const [filter, setFilter] = useState('الكل')
  const [rejecting, setRejecting] = useState<BookRequest | null>(null)
  const [reason, setReason] = useState('')

  // Volunteer requests
  const [volRequests, setVolRequests] = useState<VolunteerRequest[]>([])
  const [volTab, setVolTab] = useState<Status>('pending')
  const [rejectingVol, setRejectingVol] = useState<VolunteerRequest | null>(null)
  const [volReason, setVolReason] = useState('')

  const [loading, setLoading] = useState(true)
  const [access, setAccess] = useState<'checking' | 'allowed' | 'denied'>('checking')
  const [notice, setNotice] = useState<Notice>(null)

  async function loadAll() {
    if (!supabase) { setAccess('denied'); setNotice({ type: 'error', text: 'إعدادات Supabase غير موجودة.' }); setLoading(false); return }
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setAccess('denied'); setNotice({ type: 'error', text: 'يجب تسجيل الدخول بحساب مدير للوصول إلى الطلبات.' }); setLoading(false); return }
    const profile = await supabase.from('users').select('role').eq('user_id', user.id).maybeSingle()
    if (profile.error || profile.data?.role !== 'admin') { setAccess('denied'); setNotice({ type: 'error', text: 'هذه الصفحة مخصصة للمديرين فقط.' }); setLoading(false); return }

    const [subsResult, volResult] = await Promise.all([
      supabase.rpc('admin_get_all_submissions'),
      supabase.rpc('admin_get_all_volunteer_requests'),
    ])
    if (subsResult.error) { setNotice({ type: 'error', text: subsResult.error.message }); setLoading(false); return }
    if (volResult.error) { setNotice({ type: 'error', text: volResult.error.message }); setLoading(false); return }

    setRequests((subsResult.data ?? []) as BookRequest[])
    setVolRequests((volResult.data ?? []) as VolunteerRequest[])
    setAccess('allowed'); setLoading(false)
  }

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadAll() }, 0)
    return () => window.clearTimeout(timer)
  }, [])

  const counts = useMemo(() => ({ pending: requests.filter((item) => item.status === 'pending').length, approved: requests.filter((item) => item.status === 'approved').length, rejected: requests.filter((item) => item.status === 'rejected').length }), [requests])
  const visible = useMemo(() => requests.filter((item) => item.status === tab && (filter === 'الكل' || item.mosque_governorate === filter || item.category === filter)), [filter, requests, tab])

  const volCounts = useMemo(() => ({ pending: volRequests.filter((item) => item.status === 'pending').length, approved: volRequests.filter((item) => item.status === 'approved').length, rejected: volRequests.filter((item) => item.status === 'rejected').length }), [volRequests])
  const volVisible = useMemo(() => volRequests.filter((item) => item.status === volTab), [volRequests, volTab])

  async function review(request: BookRequest, status: 'approved' | 'rejected', rejectionNote: string | null = null) {
    if (!supabase) return
    const result = await supabase.rpc('admin_review_submission', { p_entry_id: request.entry_id, p_status: status, p_rejection_note: rejectionNote })
    if (result.error) { setNotice({ type: 'error', text: result.error.message }); return }
    setRequests((current) => current.map((item) => item.entry_id === request.entry_id ? { ...item, status, rejection_note: rejectionNote, reviewed_at: new Date().toISOString() } : item))
    setNotice({ type: 'success', text: status === 'approved' ? 'تمت الموافقة على الطلب.' : 'تم رفض الطلب.' })
  }

  async function reviewVolunteer(request: VolunteerRequest, status: 'approved' | 'rejected', rejectionNote: string | null = null) {
    if (!supabase) return
    const result = await supabase.rpc('admin_review_volunteer_request', { p_request_id: request.id, p_status: status, p_rejection_note: rejectionNote })
    if (result.error) { setNotice({ type: 'error', text: result.error.message }); return }
    setVolRequests((current) => current.map((item) => item.id === request.id ? { ...item, status, rejection_note: rejectionNote, reviewed_at: new Date().toISOString() } : item))
    setNotice({ type: 'success', text: status === 'approved' ? 'تمت الموافقة — أصبح المستخدم متطوعاً.' : 'تم رفض طلب التطوع.' })
  }

  if (loading || access === 'checking') return <div className="site-layout" dir="rtl"><SiteNavigation active="requests" /><div className="site-content"><main className="requests-page"><div className="requests-shell"><p className="requests-message">جارٍ تحميل الطلبات...</p></div></main></div></div>
  if (access === 'denied') return <div className="site-layout" dir="rtl"><SiteNavigation active="requests" /><div className="site-content"><main className="requests-page"><div className="requests-shell"><a href="/browse" className="back-link">العودة إلى التصفح ←</a><div className="access-panel"><div className="access-icon">🔒</div><h1>طلبات التسجيل</h1><p>{notice?.text}</p><a href="/login?redirect=/requests" className="primary-action">تسجيل الدخول</a></div></div></main></div></div>

  return <div className="site-layout" dir="rtl"><SiteNavigation active="requests" /><div className="site-content"><main className="requests-page"><div className="requests-shell">
    <header className="requests-header">
      <div>
        <a href="/browse" className="back-link">العودة إلى التصفح ←</a>
        <h1>الطلبات</h1>
        <p>مراجعة طلبات تسجيل الكتب وطلبات التطوع</p>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <a href="/admin/feedback" className="secondary-action">آراء المستخدمين</a>
        <a href="/submit" className="secondary-action">+ تسجيل كتاب</a>
      </div>
    </header>

    <div className="request-tabs" role="tablist" style={{ marginBottom: 18 }}>
      <button role="tab" aria-selected={section === 'books'} className={section === 'books' ? 'active' : ''} onClick={() => setSection('books')}>طلبات الكتب<span>{requests.filter((r) => r.status === 'pending').length}</span></button>
      <button role="tab" aria-selected={section === 'volunteers'} className={section === 'volunteers' ? 'active' : ''} onClick={() => setSection('volunteers')}>طلبات التطوع<span>{volRequests.filter((r) => r.status === 'pending').length}</span></button>
    </div>

    {notice && <p className={`request-notice ${notice.type}`} role="status">{notice.text}</p>}

    {section === 'books' && <>
      <div className="stats-grid">{statusTabs.map((item) => <button key={item.key} onClick={() => setTab(item.key)} className={`stat-card ${item.key}`}><strong>{counts[item.key]}</strong><span>{item.label}</span></button>)}</div>
      <div className="request-tabs" role="tablist">{statusTabs.map((item) => <button key={item.key} role="tab" aria-selected={tab === item.key} className={tab === item.key ? 'active' : ''} onClick={() => setTab(item.key)}>{item.label}<span>{counts[item.key]}</span></button>)}</div>
      <div className="filter-row" role="radiogroup" aria-label="تصفية الطلبات">{filters.map((item) => <button key={item} role="radio" aria-checked={filter === item} className={filter === item ? 'active' : ''} onClick={() => setFilter(item)}>{item}</button>)}</div>
      <section><p className="section-label">{statusTabs.find((item) => item.key === tab)?.label}</p>{visible.length ? <div className="request-grid">{visible.map((request) => <RequestCard key={request.entry_id} request={request} onApprove={() => void review(request, 'approved')} onReject={() => { setRejecting(request); setReason('') }} />)}</div> : <div className="empty-request"><span>✓</span><h2>لا توجد طلبات</h2><p>لا توجد طلبات تطابق الحالة والفلاتر الحالية.</p></div>}</section>
    </>}

    {section === 'volunteers' && <>
      <div className="stats-grid">{statusTabs.map((item) => <button key={item.key} onClick={() => setVolTab(item.key)} className={`stat-card ${item.key}`}><strong>{volCounts[item.key]}</strong><span>{item.label}</span></button>)}</div>
      <div className="request-tabs" role="tablist">{statusTabs.map((item) => <button key={item.key} role="tab" aria-selected={volTab === item.key} className={volTab === item.key ? 'active' : ''} onClick={() => setVolTab(item.key)}>{item.label}<span>{volCounts[item.key]}</span></button>)}</div>
      <section><p className="section-label">{statusTabs.find((item) => item.key === volTab)?.label}</p>{volVisible.length ? <div className="request-grid">{volVisible.map((request) => <VolunteerRequestCard key={request.id} request={request} onApprove={() => void reviewVolunteer(request, 'approved')} onReject={() => { setRejectingVol(request); setVolReason('') }} />)}</div> : <div className="empty-request"><span>✓</span><h2>لا توجد طلبات تطوع</h2><p>لا توجد طلبات تطابق الحالة الحالية.</p></div>}</section>
    </>}
  </div>

  {rejecting && <div className="request-modal-backdrop" role="dialog" aria-modal="true" onClick={(event) => { if (event.target === event.currentTarget) setRejecting(null) }}><div className="request-modal"><h2>رفض الطلب</h2><p>سيتم إخطار مقدم الطلب. الكتاب: <strong>{rejecting.title}</strong></p><label>سبب الرفض (اختياري)<textarea value={reason} onChange={(event) => setReason(event.target.value)} placeholder="مثال: هذا الكتاب مسجل بالفعل في نفس المسجد..." autoFocus /></label><div className="modal-actions"><button className="secondary-action" onClick={() => setRejecting(null)}>إلغاء</button><button className="reject-action" onClick={() => { void review(rejecting, 'rejected', reason.trim() || null); setRejecting(null) }}>تأكيد الرفض</button></div></div></div>}

  {rejectingVol && <div className="request-modal-backdrop" role="dialog" aria-modal="true" onClick={(event) => { if (event.target === event.currentTarget) setRejectingVol(null) }}><div className="request-modal"><h2>رفض طلب التطوع</h2><p>سيتم إخطار مقدم الطلب. المستخدم: <strong>{rejectingVol.fullname}</strong></p><label>سبب الرفض (اختياري)<textarea value={volReason} onChange={(event) => setVolReason(event.target.value)} placeholder="مثال: يرجى المحاولة لاحقاً بعد المزيد من النشاط على المنصة..." autoFocus /></label><div className="modal-actions"><button className="secondary-action" onClick={() => setRejectingVol(null)}>إلغاء</button><button className="reject-action" onClick={() => { void reviewVolunteer(rejectingVol, 'rejected', volReason.trim() || null); setRejectingVol(null) }}>تأكيد الرفض</button></div></div></div>}
  </main></div></div>
}

function RequestCard({ request, onApprove, onReject }: { request: BookRequest; onApprove: () => void; onReject: () => void }) {
  const mosque = request.mosque_name || `مسجد في ${request.mosque_city}`
  return <article className={`request-card ${request.status}`}><div className="request-card-body"><div className="request-card-top"><div><h2>{request.title}</h2><p>{request.author || 'مؤلف غير محدد'}</p></div>{request.category && <span className="category-tag">{request.category}</span>}</div><dl><div><dt>المسجد</dt><dd>{mosque} — {request.mosque_governorate}</dd></div><div><dt>الطبعة</dt><dd>{request.edition || 'طبعة غير محددة'}{request.publisher && ` · ${request.publisher}`}</dd></div></dl>{request.status !== 'pending' && <p className={`status-text ${request.status}`}>{request.status === 'approved' ? '✓ تمت الموافقة' : '× مرفوض'}{request.rejection_note && ` — ${request.rejection_note}`}</p>}</div><div className="request-card-footer"><span>قدمه: {request.submitted_by_name || 'مستخدم'}</span>{request.status === 'pending' && <div><button className="approve-action" onClick={onApprove}>✓ موافقة</button><button className="reject-action" onClick={onReject}>× رفض</button></div>}</div></article>
}

function VolunteerRequestCard({ request, onApprove, onReject }: { request: VolunteerRequest; onApprove: () => void; onReject: () => void }) {
  return <article className={`request-card ${request.status}`}>
    <div className="request-card-body">
      <div className="request-card-top">
        <div><h2>{request.fullname}</h2><p>{request.email || 'بدون بريد إلكتروني'}</p></div>
      </div>
      <dl>
        <div><dt>الرسالة</dt><dd>{request.message || 'بدون رسالة'}</dd></div>
        <div><dt>التاريخ</dt><dd>{new Date(request.created_at).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })}</dd></div>
      </dl>
      {request.status !== 'pending' && <p className={`status-text ${request.status}`}>{request.status === 'approved' ? '✓ تمت الموافقة — أصبح متطوعاً' : '× مرفوض'}{request.rejection_note && ` — ${request.rejection_note}`}</p>}
    </div>
    <div className="request-card-footer">
      <span>{request.reviewed_by_name ? `راجعه: ${request.reviewed_by_name}` : 'بانتظار المراجعة'}</span>
      {request.status === 'pending' && <div><button className="approve-action" onClick={onApprove}>✓ موافقة</button><button className="reject-action" onClick={onReject}>× رفض</button></div>}
    </div>
  </article>
}
