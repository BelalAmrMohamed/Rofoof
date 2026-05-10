# Development Roadmap — على رفوف المساجد

---

## Overview

| Phase | Name                    | Status             | Goal                                |
| ----- | ----------------------- | ------------------ | ----------------------------------- |
| 1     | Planning & Requirements | ✅ Complete        | Define what we're building          |
| 2     | Database & Architecture | ✅ Complete        | Define how it's structured          |
| 3     | Wireframes              | ✅ Skipped         | Merged into Phase 4 (prototyped directly) |
| 4     | UI Design & Prototyping | 🔄 In progress     | Create and refine high-fidelity prototypes |
| 5     | Dev Environment         | ❌ Not started     | Set up all tools and infrastructure |
| 6     | Implementation          | ❌ Not started     | Build the platform                  |
| 7     | Testing                 | ❌ Not started     | Verify everything works             |
| 8     | Launch                  | ❌ Not started     | Deploy and seed initial data        |

---

## Phase 1 — Planning & Requirements ✅

**Goal:** Define the project clearly before any design or code.

- [x] Write project idea and motivation
- [x] Define platform name: على رفوف المساجد
- [x] Define MVP scope (in / out of scope)
- [x] Define user roles and permissions
- [x] Write functional requirements (`requirements.md`)
- [x] Write user stories (`user-stories.md`)
- [x] Define sitemap (`sitemap.md`)
- [x] Define user flows (`user-flows.md`)

---

## Phase 2 — Database & Architecture ✅

**Goal:** Design how data is stored and how the system is built.

- [x] Design initial database schema
- [x] Identify and document junction table (`mosque_books`)
- [x] Write full SQL schema with enums, indexes, RLS, and views (`schema.sql`)
- [x] Choose and justify tech stack (`architecture.md`)
- [x] Define folder structure
- [x] Define auth strategy (Supabase + OAuth)
- [x] Define environment variables
- [x] Define branching strategy

**2026 Schema Decisions (documented in schema.sql and architecture.md):**

- [x] Move `edition` and `publisher` from `books` table to `mosque_books` table
- [x] Replace `UNIQUE(book_id, mosque_id)` with `UNIQUE NULLS NOT DISTINCT (book_id, mosque_id, edition)`
- [x] Remove `has_multiple_editions` column (superseded by per-edition rows)
- [x] Add `updated_at` trigger to `mosque_books`
- [x] Admin RLS strategy: SECURITY DEFINER functions (`admin_get_all_submissions`, `admin_get_pending_count`)
- [x] Add volunteer UPDATE policy to `mosque_books` RLS
- [x] Define `/onboarding` page and middleware redirect logic
- [x] Define `/submit/edit/[id]` route for volunteer/admin edit flow

**Post-Prototyping Schema Decisions:**

- [x] Add `feedback` table for the About page feedback form (see schema.sql)
- [x] `/browse` confirmed as the platform entry point (root `/`); no separate home page in V1

---

## Phase 3 — Wireframes ✅ Skipped

**Decision:** Wireframing was merged into Phase 4. The team moved directly to mid-fidelity HTML prototypes. No standalone wireframe phase is needed.

---

## Phase 4 — UI Design & Prototyping 🔄

**Goal:** Produce complete, responsive, production-ready prototypes for all pages with a unified design language and navigation system.

### Design Language (Established — Reference for all new pages)

The Login page prototype is the canonical design reference. All new pages must match:

| Token | Value | Usage |
|-------|-------|-------|
| Forest Green | `#1B3A2D` | Side nav, primary buttons, panel backgrounds |
| Cream | `#F5EFE0` | Page background, form panels, cards |
| Gold / Amber | `#C9A84C` | Logo, brand mark, accent |
| Teal / Mint | `#D4EDE8` | Expandable sections, highlighted states |
| Font | Cairo (Arabic) | All text — ExtraBold for headings, Medium for body |

### Navigation Decisions (Finalized)

| Breakpoint | Pattern | Contents |
|---|---|---|
| **Desktop** | **Side menu** (dark green, fixed, RTL-aware) | Logo, Browse, Submit, About, Profile, [Admin: Requests badge] |
| **Tablet** | Side menu (collapsible / icon-only) | Same links, collapsed by default |
| **Mobile** | Bottom tab bar | Browse, Submit, Profile (3 tabs max) |

- **Requests page** is accessed from the Profile page for admins only — it is NOT a top-level nav item.
- The pending submissions badge (realtime) appears next to "طلبات التسجيل" inside the Profile page admin section, and optionally as a small indicator on the Profile tab in the bottom nav.

### Prototyped Pages

| Page | Status | Notes |
|------|--------|-------|
| Login / Register | ✅ Production-ready | Desktop + mobile. Design language reference. |
| Submit a Book | ✅ Production-ready | Desktop + mobile + tablet. Missing nav component. |
| Browse | ✅ Production-ready | Missing nav component. |
| Onboarding | 🔄 Needs fix | Tablet + phone responsiveness incomplete. |
| Profile | 🔄 Needs fix | Style inconsistency; duplicate UI elements. |
| Requests (Admin) | 🔄 Needs fix | Multiple UI/flow bugs; misplaced top bar. |

### Remaining Work — Priority Order

**Step 1 — Navigation component (current priority — blocker)**
- [ ] Desktop: side menu (all 4 role states: guest / visitor / volunteer / admin)
- [ ] Tablet: collapsible side menu
- [ ] Mobile: bottom tab bar (Browse, Submit, Profile)
- [ ] Integrate into all existing prototype pages

**Step 2 — Fix Requests page**
- [ ] Correct misplaced top bar → replace with side nav
- [ ] Fix Approve / Edit & Approve / Reject flow bugs
- [ ] Make the three action paths visually distinct
- [ ] Verify admin-only access state

**Step 3 — Fix Profile page**
- [ ] Align style language with Login/Submit reference
- [ ] Remove duplicate UI elements
- [ ] Add admin section with link to Requests (visible to admin role only)
- [ ] Verify submission history layout (pending / approved / rejected + rejection note)

**Step 4 — Fix Onboarding page**
- [ ] Fix tablet responsiveness
- [ ] Fix mobile responsiveness
- [ ] Verify middleware logic is reflected in prototype flow

**Step 5 — New pages**
- [ ] Book Detail page (`/browse/book/:id`)
- [ ] Mosque Detail page (`/browse/mosque/:id`)
- [ ] About page (with feedback form)

**Step 6 — Team review and sign-off**
- [ ] Full design review across all pages
- [ ] RTL layout QA on all breakpoints
- [ ] Accessibility check (contrast, tap targets ≥ 44px)

**Figma link:** [current designs](https://www.figma.com/design/idcOa4g4eqkEEAVvnpzdFT)

---

## Phase 5 — Dev Environment Setup ❌

**Goal:** Set up all tools so every team member can run the project locally.

- [ ] Create GitHub repository
- [ ] Set up branch protection on `main` (require PR review)
- [ ] Create `dev` branch
- [ ] Initialize Next.js project with TypeScript
- [ ] Configure ESLint + Prettier with RTL/Arabic-aware rules
- [ ] Create Supabase project
- [ ] Run `schema.sql` to create all tables, views, indexes, RLS policies, SECURITY DEFINER functions, and `feedback` table
- [ ] Enable Supabase Auth (email + Google + Facebook OAuth)
- [ ] Enable Supabase Realtime for `mosque_books` table
- [ ] Set up Supabase Storage buckets (book-images, mosque-images, profile-images)
- [ ] Connect Vercel to GitHub repository
- [ ] Set all environment variables in Vercel + locally in `.env.local`
- [ ] Write `README.md` setup instructions
- [ ] Verify: every team member can run `npm run dev` and see the app

---

## Phase 6 — Implementation ❌

### Sprint 1 — Foundation (Auth + Layout + Navigation)

**Duration:** ~1 week
**Goal:** Users can log in; unified navigation exists; skeleton layout is in place.

- [ ] Root layout (`layout.tsx`) — RTL, Cairo font, side nav shell
- [ ] **Side navigation component** — desktop (fixed), tablet (collapsible), mobile (bottom tabs)
- [ ] Role-based nav rendering (guest / visitor / volunteer / admin states)
- [ ] Admin realtime pending badge in nav (via `admin_get_pending_count()` RPC)
- [ ] Auth middleware (route guards + onboarding redirect)
- [ ] Login page — email registration form (with location fields)
- [ ] Login page — Google OAuth
- [ ] Login page — Facebook OAuth
- [ ] **Onboarding page** — governorate + city picker for OAuth users
- [ ] Location picker component (governorate + city dropdowns; shared across onboarding, browse, profile)
- [ ] Supabase client setup (`lib/supabase/`)
- [ ] User creation trigger on first OAuth sign-in
- [ ] Profile page — view info + edit location + admin Requests link

---

### Sprint 2 — Browse (Core Feature)

**Duration:** ~1–2 weeks
**Goal:** Anyone can browse books and mosques.

- [ ] `getApprovedBooks()` query with filters
- [ ] `getMosquesWithBookCount()` query
- [ ] Browse page — Books view (list + cards)
- [ ] Browse page — Mosques view (list + cards)
- [ ] Book card component
- [ ] Mosque card component (with unnamed mosque fallback: "مسجد — [المدينة]")
- [ ] Search bar (title / author / mosque name)
- [ ] Category filter dropdown
- [ ] Governorate + city filter dropdowns
- [ ] Location picker on browse page (saves to profile for auth users; session cookie for guests)
- [ ] Proximity sorting (governorate/city match — V1)
- [ ] Book detail page (`/browse/book/:id`) — mosques listed by edition
- [ ] Mosque detail page (`/browse/mosque/:id`) — books with edition per entry

---

### Sprint 3 — Submit Books

**Duration:** ~1 week
**Goal:** Volunteers and users can submit books.

- [ ] `submitBook()` query function (edition + publisher on mosque_books)
- [ ] `searchMosques()` query function
- [ ] `checkDuplicate()` query — checks (book_id, mosque_id, edition) with NULLS NOT DISTINCT logic
- [ ] Submit page — book info form (including edition and publisher fields)
- [ ] Submit page — mosque search/select component
- [ ] Submit page — add new mosque inline form
- [ ] Role-based submission logic (approved vs. pending)
- [ ] Duplicate detection warning (client-side + server-side re-check)
- [ ] Different edition success message: "تمت إضافة طبعة جديدة لهذا الكتاب في نفس المسجد ✓"
- [ ] Image upload to Supabase Storage
- [ ] Success/error states

---

### Sprint 4 — Admin Moderation

**Duration:** ~1 week
**Goal:** Admins can review, approve, and reject submissions.

- [ ] `admin_get_all_submissions()` RPC call wrapper
- [ ] `admin_get_pending_count()` RPC call wrapper
- [ ] `approveSubmission()` query
- [ ] `rejectSubmission()` query (stores rejection_note)
- [ ] Requests page — list of pending submissions (shows edition + publisher)
- [ ] Approve button + confirmation
- [ ] Reject button + reason dialog
- [ ] Edit & Approve flow → /submit/edit/[id]?context=admin
- [ ] Filter by status, date, governorate
- [ ] Admin-only route protection
- [ ] Requests page accessible from Profile page only (not nav)
- [ ] User management: promote role (accessible from Requests page)
- [ ] Realtime pending badge (via `admin_get_pending_count()` RPC)

---

### Sprint 5 — Edit Submission + Profile + About + Polish

**Duration:** ~1 week
**Goal:** Edit flow works; profile shows full history; About page is live; all pages are polished.

- [ ] `getSubmissionById()` query (with ownership check)
- [ ] `updateSubmission()` query (volunteer: stays approved; admin context: sets reviewed_by)
- [ ] `/submit/edit/[id]` page — reuses `SubmitBookForm` in edit mode
- [ ] Route guard: only submitter (volunteer) or admin can access
- [ ] Disabled edit button for pending submissions (with tooltip)
- [ ] Profile page — submission history with: title, edition, mosque, date, status
- [ ] Rejection reason displayed inline for rejected submissions
- [ ] Admin section in Profile: link to Requests page + realtime pending count
- [ ] About page — mission text
- [ ] About page — how it works section
- [ ] About page — feedback form (stores to `feedback` table)
- [ ] `submitFeedback()` query function
- [ ] 404 page
- [ ] Empty states for all pages ("لا توجد نتائج")
- [ ] Loading states / skeletons
- [ ] Mobile responsiveness review (all pages)
- [ ] RTL layout QA (all pages)
- [ ] Error handling (form validation, network errors)
- [ ] Accessibility review (contrast, tap targets ≥ 44px)

---

## Phase 7 — Testing ❌

**Goal:** Verify the platform works correctly before public launch.

- [ ] Functional testing — every user story acceptance criteria verified
- [ ] Role-based access testing:
  - [ ] Guest cannot access /submit
  - [ ] OAuth user with no location is redirected to /onboarding
  - [ ] Email user bypasses /onboarding (location set during registration)
  - [ ] Regular user submissions go to pending
  - [ ] Volunteer submissions auto-approve
  - [ ] Only admins see /requests (accessible from profile only)
  - [ ] Only the submitter (volunteer) can edit their own submission
- [ ] Navigation testing:
  - [ ] Side menu renders correctly for all 4 role states (guest / visitor / volunteer / admin)
  - [ ] Bottom tabs render correctly on mobile for all roles
  - [ ] Requests link appears in Profile for admin only
  - [ ] Realtime badge updates without page refresh
- [ ] Edition logic testing:
  - [ ] Same title + same edition in same mosque → blocked
  - [ ] Same title + NULL edition twice in same mosque → blocked
  - [ ] Same title + different edition in same mosque → allowed, new row created
- [ ] Guest location testing:
  - [ ] Guest sets location → stored in session cookie only
  - [ ] Guest closes browser → location is gone on next visit
  - [ ] Auth user sets location → persists across sessions
- [ ] Cross-browser testing (Chrome, Firefox, Safari)
- [ ] Mobile testing (iOS Safari, Android Chrome)
- [ ] Performance check — browse page loads < 3s on 4G
- [ ] RTL rendering check — all pages
- [ ] Image upload testing (size limits, formats)
- [ ] Unnamed mosque fallback display — all components
- [ ] Feedback form submission (stored in `feedback` table)
- [ ] User testing session with 3–5 volunteers

---

## Phase 8 — Launch ❌

**Goal:** Get the platform live with real data.

- [ ] Final deployment to Vercel (production)
- [ ] Set up custom domain
- [ ] Enable HTTPS
- [ ] Seed initial data:
  - [ ] At least 5 mosques
  - [ ] At least 20 books across those mosques (with edition info where known)
- [ ] Create first volunteer accounts (admin-promoted)
- [ ] Soft launch to volunteer team for feedback
- [ ] Fix critical bugs from soft launch
- [ ] Public launch announcement (Telegram, social media)

---

## V2 — Future Features (Post-Launch)

| Feature | Priority |
| ------------------------------------------------ | -------- |
| Separate Home page with stats and intro | High |
| GPS-based proximity sorting | High |
| Map view with mosque pins | Medium |
| Push / email notifications for submission status | Medium |
| Volunteer recruitment page | Medium |
| Financial support / donations | Low |
| Multi-language (English) | Low |
| Multi-country support | Low |
| Mobile app (React Native) | Low |
| ISBN support for books | Low |
| Book condition / availability field | Low |
| "Request a book" feature (notify when found) | Low |
| Flag incorrect / outdated book info | Low |
