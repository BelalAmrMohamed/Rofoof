import { useState } from 'react'
import './site-navigation.css'

type ActivePage = 'browse' | 'submit' | 'requests' | 'profile'

const items: { key: ActivePage | 'about'; label: string; icon: 'book' | 'plus' | 'requests' | 'user' | 'info'; href: string }[] = [
  { key: 'browse', label: 'تصفح', icon: 'book', href: '/browse' },
  { key: 'submit', label: 'تسجيل كتاب', icon: 'plus', href: '/submit' },
  { key: 'requests', label: 'الطلبات', icon: 'requests', href: '/requests' },
  { key: 'profile', label: 'حسابي', icon: 'user', href: '/profile' },
  { key: 'about', label: 'عن المنصة', icon: 'info', href: '/about' },
]

function Icon({ name }: { name: 'book' | 'plus' | 'requests' | 'user' | 'info' }) {
  const paths = {
    book: <><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" /></>,
    plus: <><path d="M12 5v14M5 12h14" /></>,
    requests: <><path d="m9 11 3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></>,
    user: <><circle cx="12" cy="8" r="3" /><path d="M5 21a7 7 0 0 1 14 0" /></>,
    info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></>,
  }
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>
}

export function SiteNavigation({ active }: { active: ActivePage }) {
  const [open, setOpen] = useState(false)
  const navigate = (href: string) => window.location.assign(href)
  return <>
    <aside className={`site-sidebar ${open ? 'open' : ''}`} aria-label="روابط رئيسية">
      <div className="site-sidebar-header"><button className="site-close" onClick={() => setOpen(false)} aria-label="إغلاق القائمة">×</button><a href="/browse" className="site-brand"><span>ر</span><strong>على رفوف المساجد<small>مكتبات المساجد في مكان واحد</small></strong></a></div>
      <nav className="site-nav-list">{items.map((item) => <button key={item.key} className={`site-nav-item ${active === item.key ? 'active' : ''}`} onClick={() => navigate(item.href)}><span className="site-nav-icon"><Icon name={item.icon} /></span><span>{item.label}</span></button>)}</nav>
    </aside>
    {open && <button className="site-nav-backdrop" onClick={() => setOpen(false)} aria-label="إغلاق القائمة" />}
    <header className="site-topbar"><div className="site-topbar-inner"><button className="site-menu-button" onClick={() => setOpen(true)} aria-label="فتح القائمة">☰</button><a href="/browse" className="site-brand"><span>ر</span><strong>على رفوف المساجد<small>مكتبات المساجد في مكان واحد</small></strong></a><a className="site-login-link" href={`/login?redirect=${active === 'profile' ? '/profile' : `/${active}`}`}>تسجيل الدخول</a></div></header>
  </>
}