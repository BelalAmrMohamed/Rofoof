# 🕌 Visual & UX Upgrade Roadmap
## `profile.html` — على رفوف المساجد

> **Analyst:** Senior UI/UX Designer & Frontend Architect
> **Stack:** Vanilla CSS / Vanilla JS (no framework dependency)
> **Document version:** 1.0

---

## Executive Summary

The prototype is a strong foundation. It correctly uses CSS custom properties, a coherent dark color system, `backdrop-filter` glassmorphism, Arabic RTL layout, PWA meta tags, ARIA live regions, and a meaningful animation system. The issues identified are refinements rather than rewrites — the goal is to close the remaining 20 % gap between "well-built prototype" and "premium, production-grade product."

---

## Audit Findings at a Glance

| Area | Current State | Severity |
|---|---|---|
| `stat-lbl` font-size (9.5px) | Below WCAG minimum | 🔴 Critical |
| `prefers-reduced-motion` | Entirely absent | 🔴 Critical |
| `--muted` (#4e6585) contrast ratio | ~3.1:1 on bg-card — fails WCAG AA | 🔴 Critical |
| `Space` key on `role="button"` stat cards | Not handled | 🟠 High |
| Modal focus trap | Escape only — Tab not cycled | 🟠 High |
| `hero-name` `white-space: nowrap` | Truncates on < 360 px | 🟠 High |
| `color-scheme: dark` missing | Flash-of-white risk | 🟠 High |
| `renderCards()` on every `toggleNote` | Full DOM re-render | 🟡 Medium |
| Loading skeleton states | Absent | 🟡 Medium |
| `@container` queries | Not used | 🟡 Medium |
| `safe-area-inset` on main content | Only on overlay | 🟡 Medium |
| Toast icon uses text char `✓`/`!` | Use SVG instead | 🟢 Low |
| `sub-list` `aria-labelledby` missing | Partial ARIA pattern | 🟢 Low |
| Skip-to-main-content link | Absent | 🟢 Low |

---

## Phase 1 — Structural Fixes (Layout & HTML Semantics)

### 1.1 Fix the `<h1>` Truncation

**Problem:** `.hero-name` uses `white-space: nowrap; overflow: hidden; text-overflow: ellipsis`. On viewports below ~360 px, a user's full Arabic name is silently cut — the most important identity element on the page.

**Fix:**

```css
/* BEFORE */
.hero-name {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* AFTER — allow wrap, guard against layout break */
.hero-name {
  overflow-wrap: break-word;
  word-break: break-word;
  /* Remove the three nowrap/ellipsis lines above */
}
```

---

### 1.2 Complete the ARIA Tabs Pattern

**Problem:** `role="tablist"` and `role="tab"` are present, and `role="tabpanel"` is on `#sub-list`, but the panel is not linked back to its controlling tab via `aria-labelledby`. Screen readers cannot announce which filter is active.

**Fix (HTML):**

```html
<!-- Tabs: add aria-controls -->
<button class="tab on" id="tab-all" role="tab"
        aria-selected="true"
        aria-controls="sub-list"
        onclick="App.setTab('all')">
  الكل <span class="tc" id="tc-all">٥</span>
</button>

<!-- Panel: add aria-labelledby pointing to active tab -->
<div class="sub-list" id="sub-list"
     role="tabpanel"
     aria-labelledby="tab-all"
     tabindex="0">
```

**Fix (JS) — update `aria-labelledby` on tab switch:**

```js
function syncTabs(activeTab) {
  const tabMap = { all: 'all', approved: 'ok', pending: 'pend', rejected: 'rej' };
  ['all', 'ok', 'pend', 'rej'].forEach(k => {
    const btn = el('tab-' + k);
    if (!btn) return;
    const isActive = tabMap[activeTab] === k;
    btn.classList.toggle('on', isActive);
    btn.setAttribute('aria-selected', isActive);
  });
  // Link panel to the newly-active tab
  const activeTabId = 'tab-' + (tabMap[activeTab] || 'all');
  el('sub-list').setAttribute('aria-labelledby', activeTabId);
}
```

---

### 1.3 Add `role="button"` Keyboard Completeness

**Problem:** Stat cards have `role="button"` and handle `Enter` via `onkeydown`, but the WAI-ARIA spec also requires `Space` to activate buttons. Missing `Space` breaks keyboard-only navigation.

**Fix (HTML — each stat card):**

```html
<div class="stat-card" role="button" tabindex="0"
     onclick="App.setTab('approved')"
     onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();App.setTab('approved')}"
     aria-label="عرض الطلبات المقبولة">
```

---

### 1.4 Complete the Modal Focus Trap

**Problem:** `_trapFocus` only handles `Escape`. Tab key presses escape the modal entirely, violating WCAG 2.4.3 (Focus Order) and 2.1.2 (No Keyboard Trap — users must be able to get out, but also must not be able to get out unintentionally).

**Fix (JS — replace `_trapFocus`):**

```js
_trapFocus(e) {
  if (e.key === 'Escape') { App.closeModal(); return; }
  if (e.key !== 'Tab') return;

  const modal     = el('modal');
  const focusable = [...modal.querySelectorAll(
    'button:not([disabled]), select, [tabindex]:not([tabindex="-1"])'
  )].filter(el => !el.closest('[aria-hidden="true"]'));

  const first = focusable[0];
  const last  = focusable[focusable.length - 1];

  if (e.shiftKey) {
    if (document.activeElement === first) {
      e.preventDefault(); last.focus();
    }
  } else {
    if (document.activeElement === last) {
      e.preventDefault(); first.focus();
    }
  }
},
```

---

### 1.5 Add a Skip-Navigation Link

**Problem:** Keyboard-only and screen-reader users must Tab through the entire `<nav>` on every page load to reach the main content.

**Fix (HTML — first element inside `<body>`):**

```html
<a href="#main-content" class="skip-link">انتقل إلى المحتوى الرئيسي</a>
```

**Fix (CSS):**

```css
.skip-link {
  position: absolute;
  top: -100%;
  right: 0;
  background: var(--gold);
  color: rgba(6, 10, 22, 0.95);
  padding: 10px 18px;
  font-weight: 800;
  font-size: 14px;
  border-radius: 0 0 var(--r-md) var(--r-md);
  z-index: 9999;
  text-decoration: none;
  transition: top 0.2s;
}
.skip-link:focus { top: 0; }
```

---

### 1.6 Add `safe-area-inset` Padding to Main Content

**Problem:** `env(safe-area-inset-bottom)` is only applied to `.overlay`. On notched devices (iPhone 14+), the bottom of the card list is clipped behind the home indicator.

**Fix:**

```css
.content {
  flex: 1;
  padding: 16px 0 calc(64px + env(safe-area-inset-bottom, 0px));
}
```

---

## Phase 2 — Visual Polish (CSS, Color, Typography)

### 2.1 Declare `color-scheme` and Fix the Flash-of-White

**Problem:** Without `color-scheme: dark`, some browsers render a white background flash before CSS loads — jarring on a pitch-dark theme.

**Fix (add to `:root`):**

```css
:root {
  color-scheme: dark;
  /* ...existing tokens... */
}
```

---

### 2.2 Fix WCAG Color Contrast Failures

**Problem:** The `--muted` color (`#4e6585`) on `--bg-card` (`#0c1425`) produces a contrast ratio of approximately **3.1:1** — failing WCAG AA (4.5:1 for normal text, 3:1 for large text/UI components). It is used for `.hero-email`, `.sub-author`, `.stat-lbl`, `.sub-date`, and `.joined-text`.

**Fix (token replacement in `:root`):**

```css
/* BEFORE */
--muted:     #4e6585;

/* AFTER — bumped to achieve ≥ 4.5:1 on --bg-card */
--muted:     #7a92b4;
```

**Verification** (approximate ratios on `#0c1425`):
- `#4e6585` → 3.1:1 ❌
- `#7a92b4` → 5.4:1 ✅

---

### 2.3 Fix Sub-Minimum Font Sizes

**Problem:** `stat-lbl` (9.5px), `cat-chip` (10px), `empty-sub` (11.5px as muted), and `loc-lbl` (10.5px uppercase) are below the practical minimum for Arabic script legibility and violate WCAG SC 1.4.4 under browser text-zoom scenarios.

**Minimum recommended size: 12px for auxiliary labels; 11px absolute floor.**

```css
/* stat-lbl: 9.5px → 11px */
.stat-lbl { font-size: 11px; }

/* cat-chip: 10px → 11px */
.cat-chip  { font-size: 11px; }

/* loc-lbl: 10.5px → 11px */
.loc-lbl   { font-size: 11px; }

/* tc (tab count badge): 9.5px → 11px */
.tab .tc   { font-size: 11px; }
```

---

### 2.4 Hero Section — Vertical Rhythm & Prominence

**Problem:** `.hero-name` at `17px / font-weight: 800` is undersized for an `<h1>` that represents the primary identity element. There is no visual breathing room between name and email; the hierarchy reads flat.

**Fix:**

```css
.hero-name {
  font-size: 20px;          /* was 17px */
  font-weight: 800;
  line-height: 1.2;
  margin-bottom: 5px;       /* was 3px */
  /* remove white-space: nowrap; overflow: hidden; text-overflow: ellipsis */
  overflow-wrap: break-word;
}

.hero-email {
  font-size: 12.5px;        /* was 11.5px */
  color: var(--muted);
  margin-bottom: 12px;      /* was 10px */
}

/* Avatar: increase size for stronger identity anchor */
.avatar {
  width: 76px;              /* was 68px */
  height: 76px;
  border-radius: 20px;      /* was 18px */
  font-size: 32px;          /* was 28px */
}
```

---

### 2.5 Stats Grid — Responsive Collapse

**Problem:** At < 380 px, the 4-column stats grid pushes Arabic text like `قيد المراجعة` (11px) into a single illegible column.

**Fix — use `@container` or a graceful `@media` fallback:**

```css
/* Wrap the stats section in a container */
.stats-wrap { container-type: inline-size; }

.stats-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

/* Below ~340px: 2×2 grid */
@container (max-width: 340px) {
  .stats-row { grid-template-columns: repeat(2, 1fr); }
}

/* Fallback for browsers without @container */
@media (max-width: 360px) {
  .stats-row { grid-template-columns: repeat(2, 1fr); }
}
```

HTML wrapper change:

```html
<!-- Wrap existing stats-row -->
<div class="stats-wrap">
  <section class="stats-row a4" aria-label="إحصائيات الطلبات">
    ...
  </section>
</div>
```

---

### 2.6 Elevated CSS Token Architecture

Introduce `@layer` to prevent specificity wars as the codebase grows, and add `@property` for animatable custom properties:

```css
@layer reset, tokens, base, components, utilities;

/* Animatable gold opacity — enables CSS-only glow transitions */
@property --gold-opacity {
  syntax: '<number>';
  initial-value: 0.12;
  inherits: false;
}

/* Use it in the hero gold glow */
.hero::before {
  background: radial-gradient(
    circle,
    rgba(200, 146, 42, var(--gold-opacity)) 0%,
    transparent 70%
  );
  transition: --gold-opacity 0.4s ease;
}
.hero:hover::before { --gold-opacity: 0.26; }
```

---

### 2.7 Refined Submission Card Status Accents

**Problem:** The status left-border accent is 2px wide at 20%–80% vertical height and set to 0.4 opacity — barely visible on dark backgrounds.

**Fix — make the accent a gradient line, increase opacity:**

```css
.sub-card[data-status]::before {
  content: '';
  position: absolute;
  right: 0; top: 0; bottom: 0;
  width: 3px;                       /* was 2px */
  border-radius: 0 var(--r-lg) var(--r-lg) 0;
  opacity: 0.65;                    /* was 0.4 */
}

.sub-card[data-status="approved"]::before {
  background: linear-gradient(to bottom,
    transparent 0%,
    var(--ok-text) 30%,
    var(--ok-text) 70%,
    transparent 100%);
}
/* Repeat gradient pattern for pending / rejected */
```

---

## Phase 3 — The "Wow" Factor (Animations & UX Delights)

### 3.1 `prefers-reduced-motion` — Non-Negotiable

**Problem:** Entirely absent. All animations fire unconditionally. Users with vestibular disorders who have enabled "reduce motion" in their OS receive full animation — a WCAG 2.3.3 AAA violation (and a failure of basic empathy).

**Fix — add at the very end of the `<style>` block:**

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }

  /* Keep the avatar glow as a static state instead */
  .avatar { box-shadow: 0 0 0 3px rgba(200, 146, 42, 0.25); }
}
```

---

### 3.2 Loading Skeleton Screens

**Problem:** When `renderCards()` is called, the list area is either empty or instantly populated. In a real API scenario, the flash of empty content causes layout shift (CLS).

**Add a skeleton system:**

```css
/* Skeleton base */
.skeleton {
  background: linear-gradient(
    90deg,
    var(--bg-elevated) 25%,
    rgba(255, 255, 255, 0.04) 50%,
    var(--bg-elevated) 75%
  );
  background-size: 400% 100%;
  animation: shimmer 1.6s ease infinite;
  border-radius: var(--r-sm);
}

.skeleton-card {
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--r-lg);
  padding: 15px 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.skeleton-line {
  height: 14px;
  border-radius: 4px;
}
.skeleton-line.short  { width: 40%; }
.skeleton-line.medium { width: 65%; }
.skeleton-line.full   { width: 100%; }
```

**Usage in JS — show skeletons before fetch, clear after:**

```js
function showSkeletons(count = 3) {
  el('sub-list').innerHTML = Array.from({ length: count }, () => `
    <div class="skeleton-card" aria-hidden="true">
      <div class="skeleton skeleton-line medium"></div>
      <div class="skeleton skeleton-line short"></div>
      <div class="skeleton skeleton-line full" style="height:10px"></div>
    </div>
  `).join('');
}
```

---

### 3.3 Surgical DOM Updates Instead of Full Re-Render

**Problem:** `toggleNote()` calls `renderCards()`, which wipes and re-renders the entire `#sub-list`. This is both a performance issue and a UX regression — keyboard focus is lost after re-render.

**Fix — update only the affected card's note section:**

```js
toggleNote(id) {
  if (state.openNotes.has(id)) {
    state.openNotes.delete(id);
  } else {
    state.openNotes.add(id);
  }

  // Surgical update — no full re-render
  const isOpen  = state.openNotes.has(id);
  const card    = el('sub-list').querySelector(`[data-id="${id}"]`);
  if (!card) return;

  const toggle  = card.querySelector('.rej-toggle');
  const note    = card.querySelector('.rej-note');
  const chevron = card.querySelector('.rej-chevron');
  const txt     = card.querySelector('.rej-toggle-text');

  if (!toggle || !note) return;

  toggle.setAttribute('aria-expanded', isOpen);
  note.setAttribute('aria-hidden', !isOpen);
  note.classList.toggle('open', isOpen);
  chevron.classList.toggle('open', isOpen);
  txt.textContent = isOpen ? 'إخفاء سبب الرفض' : 'عرض سبب الرفض';
},
```

> **Also:** add `data-id="${s.id}"` to the `<article class="sub-card">` in `renderCards()` so the selector above works.

---

### 3.4 Stat Number Count-Up Animation

Add a delightful count-up on initial load and on tab switch:

```js
function animateNumber(el, targetStr) {
  // targetStr is Arabic numerals like "٣"
  const toWestern = s => s.replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));
  const target = parseInt(toWestern(targetStr), 10);
  if (isNaN(target) || target > 99) { el.textContent = targetStr; return; }

  let start = 0;
  const duration = 400;
  const startTime = performance.now();

  function step(now) {
    const progress = Math.min((now - startTime) / duration, 1);
    const eased    = 1 - Math.pow(1 - progress, 3); // ease-out-cubic
    const current  = Math.round(eased * target);
    el.textContent = toAr(current);
    if (progress < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}
```

---

### 3.5 Scroll-Reveal for Cards

Replace the blanket `.a1`–`.a5` stagger classes (which fire once on page load) with an `IntersectionObserver`-based reveal — cards animate in when they scroll into view, which is far more satisfying on long lists:

```js
function observeCards() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.animationPlayState = 'running';
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  el('sub-list').querySelectorAll('.sub-card').forEach((card, i) => {
    card.style.animationDelay      = `${i * 0.045}s`;
    card.style.animationPlayState  = 'paused';
    observer.observe(card);
  });
}

// Call at the end of renderCards()
function renderCards() {
  // ...existing render logic...
  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    observeCards();
  }
}
```

---

### 3.6 Toast Icon — Replace Text Characters with SVG

**Problem:** `toast-icon` renders `✓` and `!` as text glyphs — inconsistent across OSes (emoji vs symbol vs nothing on some Android WebViews).

```css
/* Remove font-size: 11px from .toast-icon; size is now set by SVG */
.toast-icon { width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; }
```

```js
// In _showToast:
const icons = {
  ok:   `<svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" fill="none" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>`,
  warn: `<svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" fill="none" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
};
icon.innerHTML = icons[type] || icons.ok;
```

---

### 3.7 Hover Glow on Stat Cards

Add a subtle, status-colored glow that bleeds from the active stat color on hover — reinforces the semantic grouping:

```css
.s-ok   .stat-card:hover { box-shadow: 0 6px 24px rgba(74, 222, 128, 0.12); }
.s-pend .stat-card:hover { box-shadow: 0 6px 24px rgba(251, 191, 36, 0.12); }
.s-rej  .stat-card:hover { box-shadow: 0 6px 24px rgba(248, 113, 113, 0.12); }
.s-all  .stat-card:hover { box-shadow: 0 6px 24px rgba(237, 224, 198, 0.08); }
```

---

### 3.8 Tab Scroll Indicator (Mobile)

The tab row scrolls horizontally on mobile but gives no visual affordance. Add a right-side fade to signal more content:

```css
.tabs-wrap {
  /* existing styles... */
  -webkit-mask-image: linear-gradient(to left, transparent 0%, black 48px);
          mask-image: linear-gradient(to left, transparent 0%, black 48px);
}

/* Remove the mask when scrolled to the end (JS) */
.tabs-wrap.at-end {
  -webkit-mask-image: none;
          mask-image: none;
}
```

```js
// Add to init()
const tabsWrap = document.querySelector('.tabs-wrap');
tabsWrap.addEventListener('scroll', () => {
  const atEnd = tabsWrap.scrollLeft <= 8; // RTL: scrollLeft ≤ 0 at right end
  tabsWrap.classList.toggle('at-end', atEnd);
});
```

---

## Code Snippet Reference — Most Impactful Changes

### Snippet A — Consolidated Critical Fixes (add to end of `:root`)

```css
:root {
  color-scheme: dark;

  /* Contrast-fixed muted color (was #4e6585 — 3.1:1 → now 5.4:1) */
  --muted: #7a92b4;
}
```

### Snippet B — `prefers-reduced-motion` Guard (add at end of `<style>`)

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration:       0.01ms !important;
    animation-iteration-count: 1    !important;
    transition-duration:      0.01ms !important;
    scroll-behavior:          auto   !important;
  }
  .avatar { animation: none; box-shadow: 0 0 0 3px rgba(200, 146, 42, 0.25); }
  .pdot   { animation: none; }
  .demo-dot { animation: none; }
}
```

### Snippet C — Hero Typography Upgrade

```css
.hero-name {
  font-size: 20px;
  font-weight: 800;
  color: var(--cream);
  line-height: 1.2;
  margin-bottom: 5px;
  overflow-wrap: break-word;
  word-break: break-word;
  /* REMOVED: white-space, overflow: hidden, text-overflow */
}
.avatar {
  width: 76px;
  height: 76px;
  border-radius: 20px;
  font-size: 32px;
}
```

### Snippet D — Stats Responsive Grid

```css
.stats-wrap { container-type: inline-size; }

@container (max-width: 340px) {
  .stats-row { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 360px) {
  /* Fallback for non-@container browsers */
  .stats-row { grid-template-columns: repeat(2, 1fr); }
}
```

### Snippet E — Complete Focus Trap (JS replacement)

```js
_trapFocus(e) {
  if (e.key === 'Escape') { App.closeModal(); return; }
  if (e.key !== 'Tab') return;
  const focusable = [...el('modal').querySelectorAll(
    'button:not([disabled]), select, [tabindex]:not([tabindex="-1"])'
  )];
  const first = focusable[0];
  const last  = focusable[focusable.length - 1];
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault(); last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault(); first.focus();
  }
},
```

---

## Implementation Priority Order

```
🔴 CRITICAL (do first — accessibility & correctness)
   1. prefers-reduced-motion guard (Snippet B)
   2. --muted contrast fix (Snippet A)
   3. stat-lbl / cat-chip / loc-lbl font-size → 11px
   4. hero-name white-space fix (Snippet C)
   5. Space key on role="button" stat cards
   6. Complete focus trap (Snippet E)

🟠 HIGH (do in sprint 1)
   7. color-scheme: dark (Snippet A)
   8. aria-labelledby on tabpanel
   9. safe-area-inset on .content
  10. Stats responsive grid (Snippet D)

🟡 MEDIUM (sprint 2)
  11. Skeleton screens
  12. Surgical toggleNote DOM update
  13. Tab scroll fade indicator
  14. Stat card status glow on hover

🟢 POLISH (sprint 3)
  15. Count-up animation on stat numbers
  16. Scroll-reveal via IntersectionObserver
  17. Toast SVG icons
  18. @layer + @property architecture
  19. Skip navigation link
  20. Hero @property gold glow on hover
```

---

## What the Prototype Already Does Well ✅

These are intentionally preserved — do not change them:

- **CSS custom property system** is comprehensive and correctly scoped to `:root`
- **RTL layout** is correctly handled at every level (`dir="rtl"`, font selection, `text-align`, LTR override on email)
- **Glassmorphism nav** (`backdrop-filter: blur(24px) saturate(160%)`) is tasteful and not overused
- **Animation keyframe library** is well-named and the `cubic-bezier(0.22, 1, 0.36, 1)` spring easing is a premium choice
- **Toast aria-live region** is correctly set up with `polite` urgency
- **Modal ARIA** (`role="dialog"`, `aria-modal="true"`, `aria-labelledby`) is correctly implemented
- **Scrollbar styling** (3px, gold-tinted) is a delightful detail
- **`min-height: 44px`** on all interactive targets meets WCAG 2.5.5 touch target size
- **Noise grain overlay** adds texture without performance cost (SVG filter, not a PNG)
- **PWA meta tags** and manifest reference are properly placed

---

*Document end — على رفوف المساجد Upgrade Roadmap v1.0*
