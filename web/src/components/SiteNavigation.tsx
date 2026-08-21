import { useState } from 'react'
import './site-navigation.css'

type ActivePage = 'browse' | 'submit' | 'requests' | 'profile'

const items: { key: ActivePage; label: string; icon: string; href: string }[] = [
  { key: 'browse', label: 'تصفح', icon: '⌂', href: '/browse' },
  { key: 'submit', label: 'تسجيل كتاب', icon: '+', href: '/submit' },
  { key: 'requests', label: 'الطلبات', icon: '✓', href: '/requests' },
  { key: 'profile', label: 'حسابي', icon: '◯', href: '/profile' },
]

export function SiteNavigation({ active }: { active: ActivePage }) {
  const [open, setOpen] = useState(false)
  const navigate = (href: string) => window.location.assign(href)
  return <>
    <aside className={`site-sidebar ${open ? 'open' : ''}`} aria-label="روابط رئيسية">
      <div className="site-sidebar-header"><button className="site-close" onClick={() => setOpen(false)} aria-label="إغلاق القائمة">×</button><a href="/browse" className="site-brand"><span>ر</span><strong>على رفوف المساجد<small>مكتبات المساجد في مكان واحد</small></strong></a></div>
      <nav className="site-nav-list">{items.map((item) => <button key={item.key} className={`site-nav-item ${active === item.key ? 'active' : ''}`} onClick={() => navigate(item.href)}><span className="site-nav-icon" aria-hidden="true">{item.icon}</span><span>{item.label}</span></button>)}</nav>
    </aside>
    {open && <button className="site-nav-backdrop" onClick={() => setOpen(false)} aria-label="إغلاق القائمة" />}
    <header className="site-topbar"><div className="site-topbar-inner"><button className="site-menu-button" onClick={() => setOpen(true)} aria-label="فتح القائمة">☰</button><a href="/browse" className="site-brand"><span>ر</span><strong>على رفوف المساجد<small>مكتبات المساجد في مكان واحد</small></strong></a><a className="site-login-link" href={`/login?redirect=${active === 'profile' ? '/profile' : `/${active}`}`}>تسجيل الدخول</a></div></header>
  </>
}