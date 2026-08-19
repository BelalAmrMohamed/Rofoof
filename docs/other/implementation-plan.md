# Implementation Plan — "على رفوف المساجد" Atomic Polish
> **File:** `browse.html` · **Engineer:** Senior UI/UX (Atomic Polish) · **Date:** 2026-05-13

---

## 1. Visual Language Audit

### Current Palette & Token Assessment

The design system is architecturally excellent — a three-family palette (Forest Green `--g-*`, Gold Amber `--a-*`, Warm Stone `--s-*`) with full semantic aliases and a layered shadow scale. This is rare quality for a single-file prototype.

| Token Family | Strength | Gap |
|---|---|---|
| `--g-*` Forest Green | 11-stop scale, well-used | Mid-range greens (`--g-500`, `--g-600`) are slightly under-used in surfaces |
| `--a-*` Gold Amber | Beautiful warmth in loc-bar | Almost absent in interactive feedback (no amber glow on hover states) |
| `--s-*` Warm Stone | Clean neutrals | `--s-950` text on `--s-50` bg = ~14:1 contrast ✓ |
| Shadows | 5-tier scale + accent variants | `--shadow-inner-highlight` defined but inconsistently applied |
| Gradients | Several overlay tokens defined | `--gradient-overlay-light` / `--gradient-overlay-heavy` are defined but **never applied** anywhere |
| Animations | `fadeUp`, `slideDown`, `buttonRipple`, `locPulse` + `locRipple` | No `@media (prefers-reduced-motion)` guard |

### Target "Vibe"

**"Sacred Utility"** — the warmth of a mosque's atmosphere (deep forest green, warm stone, gold), rendered through the clarity of a modern library catalog. Think Notion meets a finely-crafted Islamic geometric motif. Not flashy, not cold. Every interaction should feel like turning a well-bound page.

---

## 2. Component-Level Enhancements

### 2.1 Navbar (`.navbar`)

**Current state:** Solid gradient background, `backdrop-filter: blur(12px)`. Good bones, but static after scroll.

**Enhancements:**

- **Scroll-aware background:** Add a `scroll` class via a tiny `IntersectionObserver` on a `#scroll-sentinel` element placed just below the navbar. When triggered, deepen the gradient slightly and add a more prominent `border-bottom` glow using `box-shadow: 0 1px 0 rgba(255,255,255,0.06), 0 4px 24px rgba(6,41,34,0.4)`. Use CSS `transition: box-shadow 0.4s var(--ease-out)`.

- **Brand mark hover:** The `.brand-mark` currently has a flat `box-shadow`. On `.nav-brand:hover .brand-mark`, add `transform: rotate(-4deg) scale(1.08)` with `transition: transform 0.28s var(--ease-out)` for a subtle "book tilts in hand" effect.

- **Nav links active indicator:** Add a `::after` pseudo-element to `.nav-link.active` — a 2px amber (`--a-400`) line at the bottom, fading in with `scaleX` from 0 → 1.

- **`.btn-login` depth:** Add a `border-bottom: 1.5px solid rgba(255,255,255,0.12)` to create a subtle bottom depth, and on `:hover` add `box-shadow: 0 2px 8px rgba(0,0,0,0.24), inset 0 1px 0 rgba(255,255,255,0.15)`.

- **Toggle buttons `:active` state:** Currently missing. Add `transform: scale(0.92)` on `:active` to give tactile press feedback.

---

### 2.2 Sidebar (`#sidebar`)

**Current state:** Excellent slide-in animation, good sub-menu accordion. Missing polish at the item level.

**Enhancements:**

- **Left border accent on active item:** The active item uses `background: rgba(255,255,255,0.1)` but has no positional indicator. Add a `border-right: 3px solid var(--a-400)` (RTL — visually on the leading edge) to the `#sidebar > ul > li.active > a` rule. This amber streak connects the sidebar's feel to the location bar's amber glow.

- **Sidebar item hover:** Upgrade `background-color: rgba(255,255,255,0.07)` to a subtle left-gradient: `background: linear-gradient(270deg, rgba(255,255,255,0.08), transparent)` so items appear to "light up from the right edge" in RTL.

- **Sub-menu items hover:** Add `padding-inline-start` increment from `3.2em` → `3.5em` on hover, animated with `transition: padding-inline-start 0.18s var(--ease-out)`, creating a smooth indent-in effect.

- **Mobile bottom bar active tab:** Currently only changes `color` to `--g-300`. Add a `::after` pseudo-element that draws a 2px rounded arc at the top of the active tab: `position: absolute; top: 0; width: 32px; height: 2px; border-radius: 0 0 4px 4px; background: var(--g-300)`. This is the same "pill indicator" pattern used in iOS and many native apps.

---

### 2.3 Buttons — Full Audit

**Primary buttons** (`.btn-search`, `.btn-save`, `.btn-primary-full`, `.btn-empty`)

| Issue | Fix |
|---|---|
| `--gradient-button-overlay` token is defined but never applied | Add as a `::before` pseudo-element: `content:''; position:absolute; inset:0; border-radius:inherit; background:var(--gradient-button-overlay); pointer-events:none` |
| No `:active` state on `.btn-save` / `.btn-primary-full` | Add `transform: translateY(0) scale(0.98); box-shadow: var(--shadow-accent-sm)` |
| `buttonRipple` animation is wired to `.btn-search:active::before` but the `::before` pseudo has no base styles | Add base `::before` styles: `content:''; position:absolute; inset:0; border-radius:inherit` to activate the animation |
| `border-radius` inconsistency: search button uses `--r-lg`, save/cancel use `--r-md` | Unify modal footer buttons to `--r-lg` for a rounder, more premium feel |

**Ghost / secondary buttons** (`.btn-cancel`, `.btn-ghost-full`, `.btn-change-loc`)

| Issue | Fix |
|---|---|
| No `:active` state on any ghost button | Add `transform: scale(0.97); box-shadow: inset 0 2px 4px rgba(0,0,0,0.08)` |
| `.btn-cancel` has `border: 1.5px solid var(--border)` — same as inputs | Differentiate with `border-color: var(--border-strong)` at rest |
| `.btn-change-loc` missing `:active` | Add `transform: translateY(0); box-shadow: 0 1px 2px rgba(27,125,104,0.08)` |

---

### 2.4 Inputs & Selects

**Search input (`.search-input`)**

- The focus state is already strong. Add one enhancement: when focused, apply `background: linear-gradient(to bottom, var(--surface), var(--g-50) 300%)` — an extremely faint green tint at the base of the input when searching, reinforcing the "in active filter" state.
- The `.search-icon` transitions `color` on `:focus-within`, but should also `transform: scale(1.1)` for extra tactility.
- Add a `::placeholder` transition: not directly animatable in CSS, but the placeholder opacity can be shifted via `transition: opacity 0.2s` to fade the placeholder out faster when typing begins.

**Filter selects (`.filter-select`, `.field-select`)**

- The custom chevron (`::after`) currently uses a raw border-trick triangle. On `:hover` of the wrapper, animate it: `transition: transform 0.2s; transform: translateY(-50%) rotate(180deg)` (i.e., flip when open — currently requires JS to know open state, but the hover animation is still a nice cue).
- Add `box-shadow: var(--shadow-xs)` → `var(--shadow-sm)` on `:hover` for depth feedback.
- On `:focus`, the focus glow is present but the chevron color should also shift from `var(--text-muted)` → `var(--accent)` to reinforce the active state.

**Modal field selects (`.field-select`)**

- Add `transition: border-color 0.18s, box-shadow 0.22s` — currently missing, which causes an abrupt focus flash.
- Apply `var(--shadow-inner-highlight)` at rest for depth consistency with buttons.

---

### 2.5 Cards

**Book cards (`.book-card`)**

- **Category accent bar refinement:** The `::before` bar grows from `4px` → `5px` on hover. Upgrade: on hover, also add `background: linear-gradient(to bottom, var(--card-accent), rgba(var(--card-accent), 0.6))` and let it transition `opacity` from `0.85` → `1`. This gives the bar a luminous feel rather than just a width bump.
- **Inset top highlight:** The existing `inset 0 1px 0 rgba(255,255,255,0.5)` is good. Enhance to `inset 0 1px 0 rgba(255,255,255,0.9)` on hover to create a stronger "lifted glass" edge.
- **Card body padding:** Add `8px` of right-padding clearance to account for the accent bar so text doesn't crowd it on narrow cards.
- **`:active` state:** Add `transform: translateY(-2px) scale(0.995); box-shadow: var(--shadow-md)` — a subtle "press in" that counters the hover lift.
- **Skeleton loading:** Define a `.book-card--skeleton` variant using the `shimmer` animation already in the file. Apply to initial render before data loads.

**Mosque cards (`.mosque-card`)**

- **Parity with book cards:** Add a `::before` top accent bar using `--g-400` as the color (since mosque cards have no per-item category). This gives visual consistency between card types.
- **`.mosque-icon-wrap` hover depth:** Currently transitions `box-shadow`. Also add `transform: scale(1.05)` on `.mosque-card:hover .mosque-icon-wrap` with `transition: transform 0.28s var(--ease-out)`.
- **Footer divider:** The `border-top: 1px solid var(--s-100)` is too faint. Upgrade to `var(--s-200)` and add `background: linear-gradient(180deg, transparent, var(--s-50))` behind the footer row to create a subtle "content fades to footer" shelf.

---

### 2.6 Modals

**Overlay and entrance**

- The entrance animation (`translateY(20px) scale(0.94)` → identity) is already excellent. Add an **exit** animation: on `.modal-overlay` losing the `open` class (via JS), add class `closing` which applies `opacity: 0; pointer-events: none` and on `.modal` within it: `transform: translateY(12px) scale(0.96)`. Use `transitionend` to remove the element from pointer-events.
- The modal backdrop `background: rgba(6,41,34,0.7)` is slightly cold. Add a very subtle radial warm spot: `background: radial-gradient(ellipse at center, rgba(14,80,64,0.75), rgba(6,41,34,0.82))`.

**Modal header**

- The `background: linear-gradient(180deg, rgba(255,255,255,0.8), transparent)` is good. Extend to `var(--g-50)` at the top so the header reads as being inside the green system, not floating white.
- Add `letter-spacing: -0.2px` to `.modal-title` to match the brand-name tightness.

**Detail modal hero (`.detail-hero`)**

- The `background: linear-gradient(180deg, var(--g-50), transparent)` is correct. Add `border-bottom: 1px solid var(--g-100)` to properly segment the hero from the sections below.
- `.detail-avatar` has no border or shadow. Add `box-shadow: 0 4px 14px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.6); border: 1.5px solid rgba(255,255,255,0.4)` for depth.

---

### 2.7 Location Bar (`.loc-bar`)

- The gradient `linear-gradient(90deg, var(--g-50), var(--a-50) 60%, var(--g-50))` is charming. Extend: add a very faint `background-image` of the same dot-grid texture used in `body::before` but at `opacity: 0.15` to create continuity between the page and this bar.
- On `.btn-change-loc`, the defined `box-shadow: 0 1px 3px rgba(27,125,104,0.12)` should also include `--shadow-inner-highlight` to match the premium button feel of primary CTAs.

---

## 3. Motion & Feedback

### New Transitions to Implement

| Target | Property | Values | Duration/Easing |
|---|---|---|---|
| `.book-card:active` | `transform` | `translateY(-2px) scale(0.997)` | `0.1s ease` |
| `.mosque-card:active` | `transform` | `translateY(-2px) scale(0.997)` | `0.1s ease` |
| `.filter-tab:active` | `transform` | `translateY(0) scale(0.95)` | `0.1s ease` |
| `.view-btn:active` | `transform` | `scale(0.94)` | `0.1s ease` |
| `.search-icon` on focus-within | `transform` | `scale(1.15)` | `0.2s var(--ease-out)` |
| `.brand-mark` on nav-brand hover | `transform` | `rotate(-4deg) scale(1.08)` | `0.28s var(--ease-out)` |
| `.mosque-icon-wrap` on card hover | `transform` | `scale(1.08)` | `0.28s var(--ease-out)` |
| `.detail-avatar` on modal open | `transform` | `scale(0.85)→scale(1)` | `0.42s cubic-bezier(0.16,1,0.3,1)` |
| `.loc-dot` | Already animated | ✓ | — |
| `.results-meta strong` | Numeric count change | JS `textContent` swap + `animation: countBump 0.3s` | New keyframe needed |

### New Keyframes to Define

```
@keyframes countBump {
  0%   { transform: scale(1.4); opacity: 0.6; }
  60%  { transform: scale(0.95); }
  100% { transform: scale(1); opacity: 1; }
}

@keyframes badgePop {
  0%   { transform: scale(0); opacity: 0; }
  70%  { transform: scale(1.12); }
  100% { transform: scale(1); opacity: 1; }
}

@keyframes skeletonPulse {
  0%,100% { opacity: 0.6; }
  50%     { opacity: 1; }
}
```

### Micro-animation: Staggered card re-render

When the filter state changes (category tab click, search input, select change), each card in the grid currently re-renders with `fadeUp` animation. **Enforce this** by adding the `.fade-in` class via JS at render time (currently the stagger selectors exist but depend on the class already being on elements). Wrap in a `requestAnimationFrame` double-tick to ensure the class is applied after the DOM settles.

### Reduced Motion Guard (Critical Accessibility)

Wrap all transforms and animations in a prefers-reduced-motion block:
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.1ms !important;
  }
}
```
This is currently absent — a significant a11y gap.

---

## 4. UX Quick Wins

### 4.1 Accessibility Fixes

| Issue | Severity | Fix |
|---|---|---|
| `detail-section-title` uses `text-transform: uppercase` and `letter-spacing: 0.9px` on Arabic text | Medium | Arabic letters do not uppercase; `letter-spacing` disrupts Arabic glyph connections. Replace with `font-variant-numeric: oldstyle-nums` and keep weight/color contrast only. Remove letter-spacing for Arabic labels. |
| `empty-state` uses `display: none` / `display: flex` toggle — screen readers may miss the transition | Low | Add `aria-live="polite"` to the `#empty-state` element. |
| Modal focus trap is only `setTimeout 50ms` depth-1 | Medium | Implement a full focus trap: capture all `button, [href], input, select, [tabindex]:not([tabindex="-1"])` inside the modal, intercept `Tab` / `Shift+Tab` to cycle within. |
| `#sidebar-backdrop` has no ARIA role | Low | Add `role="presentation" aria-hidden="true"` since it's a visual-only overlay. |
| `results-meta` count change is not announced | Medium | Add `aria-live="polite" aria-atomic="true"` to the `.results-meta` element so screen readers announce filter result counts. |
| `.distance-pill` color badges — `.dist-same` green on green-bg may fail at small sizes | Low | Verify min contrast at `11px bold`. Bump `.dist-same` foreground to `var(--g-800)` for a safer ratio (~5.5:1). |
| Mobile bottom nav icons have no visible label when icon-only on very small screens | Low | Already has text labels ✓ but ensure `min-height: 58px` tap targets (current) meet WCAG 2.5.5 (44×44px minimum) ✓ |

### 4.2 Spacing & Rhythm Adjustments

| Component | Current | Suggested | Reason |
|---|---|---|---|
| `.book-card` body (inferred from truncation) | padding likely `16px` | Add `padding-right: 20px` (RTL leading edge) | Clear accent bar without crowding |
| `.filter-tabs` | `gap: 7px` | `gap: 8px` | Align to 8px grid |
| `.toolbar` | `margin-bottom: 20px` | `margin-bottom: 24px` | Increase breathing room before grid |
| `.detail-hero` | `padding: 24px 24px 16px` | `padding: 24px 24px 20px` | Slightly more space before the divider |
| `.modal-footer` | `padding: 16px 24px` | `padding: 18px 24px` | More generous — footer feels tight next to body |
| `.search-row` | `margin-bottom: 20px` | `margin-bottom: 24px` | Align to 8px grid |
| `.cards-grid` | `gap: 16px` | `gap: 18px` (desktop) / `12px` (mobile) | Small gap increase adds perceived quality |

### 4.3 Typography Refinements

| Element | Current | Suggested |
|---|---|---|
| `html` `line-height` | `1.6` | `1.65` — a touch more open for Arabic script |
| `.detail-title` | `font-size: 22px`, `line-height: 1.3` | `line-height: 1.35` for longer Arabic titles |
| `.detail-notes` | `line-height: 1.8` | ✓ Perfect for Arabic body text — keep |
| `.brand-name` | `letter-spacing: -0.2px` | Keep — tightly tracked headings read well for Arabic bold weight |
| `.detail-section-title` | `letter-spacing: 0.9px` | **Remove** — harmful for Arabic, explained in §4.1 |
| `.results-meta` | `font-size: 13px` | `font-size: 13.5px` — easier to read at a glance |
| `.book-count` | `font-size: 13px, font-weight: 800` | Add `font-variant-numeric: tabular-nums` for consistent width when numbers change |
| `.empty-title` | `font-size: 19px` | `font-size: 20px` — cleaner on the type scale |

---

## 5. Technical Refactor Strategy

### 5.1 CSS Variable Additions

Add the following token groups to `:root` — these complete the token system without breaking anything existing:

```css
:root {
  /* MISSING: Amber interaction glow (referenced nowhere currently) */
  --shadow-amber-sm: 0 2px 8px rgba(212, 132, 26, 0.15);
  --shadow-amber-md: 0 4px 16px rgba(212, 132, 26, 0.22);

  /* MISSING: Transition for card active-press */
  --interactive-duration-press: 0.1s;

  /* MISSING: Skeleton shimmer color */
  --skeleton-base: var(--s-100);
  --skeleton-shine: var(--s-50);

  /* MISSING: Nav scroll-depth indicator */
  --nav-scrolled-shadow: 0 4px 24px rgba(6, 41, 34, 0.4), 0 1px 0 rgba(255,255,255,0.06);

  /* MISSING: Standardized amber badge for sidebar active */
  --sidebar-active-indicator: var(--a-400);
}
```

### 5.2 New Utility Classes

Add these reusable micro-classes near the `UTILITIES` section:

```css
/* Press-feedback for any interactive element */
.pressable:active { transform: scale(0.97); transition: transform 0.1s ease; }

/* Skeleton loading shimmer */
.skeleton {
  background: linear-gradient(90deg, var(--skeleton-base) 25%, var(--skeleton-shine) 50%, var(--skeleton-base) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s ease-in-out infinite;
  border-radius: var(--r-sm);
}

/* Screen-reader only (already implied but make explicit) */
.sr-only {
  position: absolute; width: 1px; height: 1px;
  padding: 0; margin: -1px; overflow: hidden;
  clip: rect(0,0,0,0); white-space: nowrap; border: 0;
}
```

### 5.3 CSS Organization Strategy

The current single-block `<style>` is already well-organized by component sections. Maintain this structure but introduce **two new sections** between `ANIMATIONS` and `UTILITIES`:

```
/* NEW SECTION: MOTION GUARDS */
/* @media (prefers-reduced-motion) overrides */

/* NEW SECTION: SKELETON STATES */
/* .book-card--skeleton, .mosque-card--skeleton */
```

### 5.4 JavaScript Touch-ups (Minimal)

Only two JS changes needed to support the visual plan:

1. **Scroll-sentinel for navbar:** `const obs = new IntersectionObserver(([e]) => navbar.classList.toggle('scrolled', !e.isIntersecting)); obs.observe(document.getElementById('scroll-sentinel'));` — no library needed, ~3 lines.

2. **Result count animation:** When `render()` updates `.results-meta`, read the old count, update the DOM, then add class `count-bump` to the `<strong>` element and remove it on `animationend`. ~5 lines.

3. **Modal exit animation:** In `closeModal()`, add class `closing` before removing `open`, and use `transitionend` event to clean up. ~4 lines.

### 5.5 What NOT to Touch

| Element | Reason to Leave Alone |
|---|---|
| `body::before` dot-grid texture | Already correctly layered with `z-index: 0` and `pointer-events: none` |
| `--ease-out: cubic-bezier(0.22,1,0.36,1)` | Excellent spring-like easing — do not change |
| Staggered `.cards-grid > *:nth-child(n)` delays | Well-calibrated, only extend to `:nth-child(n+9)` (already done) |
| The modal `backdrop-filter: blur(12px)` | Performance-heavy but intentional and correct |
| RTL direction infrastructure | All `padding-inline-*` and `margin-right: auto` patterns are correct |

---

## Approval Checklist

Before implementation begins, confirm:

- [ ] Reduced motion guard is a **must** — implement first
- [ ] Arabic `letter-spacing` removal on `.detail-section-title` approved
- [ ] Amber sidebar active indicator approved (adds amber to a green-only sidebar)
- [ ] Scroll-aware navbar behavior desired (requires 3-line JS addition)
- [ ] Modal exit animation approved (requires ~4-line JS change to `closeModal`)
- [ ] Skeleton states: are they needed before data loads, or is load instant in prod?

