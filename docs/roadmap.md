# Development Roadmap — على رفوف المساجد

---

## Overview

| Phase | Name                    | Status         | Goal                                |
| ----- | ----------------------- | -------------- | ----------------------------------- |
| 1     | Planning & Requirements | ✅ Complete    | Define what we're building          |
| 2     | Database & Architecture | ✅ Complete    | Define how it's structured          |
| 3     | Wireframes              | ❌ Not started | Sketch page layouts                 |
| 4     | UI Design (Figma)       | 🔄 In progress | Create high-fidelity mockups        |
| 5     | Dev Environment         | ❌ Not started | Set up all tools and infrastructure |
| 6     | Implementation          | ❌ Not started | Build the platform                  |
| 7     | Testing                 | ❌ Not started | Verify everything works             |
| 8     | Launch                  | ❌ Not started | Deploy and seed initial data        |

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

---

## Phase 3 — Wireframes ❌

**Goal:** Sketch the layout of every page before adding color or detail.
Rules: No colors. No images. Boxes and labels only.

- [ ] Login page wireframe
- [ ] **Onboarding page wireframe** ← new
- [ ] Browse page — Books view wireframe
- [ ] Browse page — Mosques view wireframe
- [ ] Book detail page wireframe
- [ ] Mosque detail page wireframe
- [ ] Submit book form wireframe
- [ ] Edit submission form wireframe (`/submit/edit/[id]`) ← new
- [ ] Admin requests page wireframe
- [ ] Profile page wireframe (with rejection reason in submission history) ← updated
- [ ] About page wireframe
- [ ] Mobile versions of all above
- [ ] Team review + sign-off on wireframes

**Tool:** Figma (low-fidelity) or pen + paper → photo

---

## Phase 4 — UI Design (Figma) 🔄

**Goal:** Create high-fidelity, production-ready designs for all pages.

**Prototyping status (mid-fidelity):**

- [x] Browse page prototype
- [x] Submit a Book page prototype
- [x] Login / Register page prototype
- [ ] **Onboarding page prototype** ← next
- [ ] Edit Submission page prototype

- [ ] Finalize brand identity:
  - [ ] Logo / logotype for "على رفوف المساجد"
  - [ ] Color palette (primary, secondary, neutral, error, success)
  - [ ] Typography (Arabic font — Cairo or Noto Sans Arabic recommended)
  - [ ] Spacing and grid system
  - [ ] RTL layout conventions
- [ ] Design component library in Figma:
  - [ ] Buttons (primary, secondary, ghost)
  - [ ] Input fields
  - [ ] Book card
  - [ ] Mosque card
  - [ ] Filter dropdowns
  - [ ] Navigation bar
  - [ ] Forms (submit book, login, feedback)
  - [ ] Status badges (pending, approved, rejected)
- [ ] Full page designs (desktop + mobile):
  - [ ] Login / register
  - [ ] Onboarding
  - [ ] Browse — books view
  - [ ] Browse — mosques view
  - [ ] Book detail
  - [ ] Mosque detail
  - [ ] Submit form
  - [ ] Edit submission form
  - [ ] Admin requests
  - [ ] Profile (with submission history + rejection reasons)
  - [ ] About
- [ ] Team review + sign-off on designs

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
- [ ] Run `schema.sql` to create all tables, views, indexes, RLS policies, and SECURITY DEFINER functions
- [ ] Enable Supabase Auth (email + Google + Facebook OAuth)
- [ ] Enable Supabase Realtime for `mosque_books` table
- [ ] Set up Supabase Storage buckets (book-images, mosque-images, profile-images)
- [ ] Connect Vercel to GitHub repository
- [ ] Set all environment variables in Vercel + locally in `.env.local`
- [ ] Write `README.md` setup instructions
- [ ] Verify: every team member can run `npm run dev` and see the app

---

## Phase 6 — Implementation ❌

### Sprint 1 — Foundation (Auth + Layout)

**Duration:** ~1 week
**Goal:** Users can log in; skeleton layout exists.

- [ ] Root layout (`layout.tsx`) — RTL, Arabic font, nav
- [ ] Navigation bar (with role-based links)
- [ ] Auth middleware (route guards + onboarding redirect)
- [ ] Login page — email registration form (with location fields)
- [ ] Login page — Google OAuth
- [ ] Login page — Facebook OAuth
- [ ] Login page — Skip login
- [ ] **Onboarding page** — governorate + city picker for OAuth users ← new
- [ ] Location picker component (governorate + city dropdowns; shared across onboarding, browse, profile)
- [ ] Supabase client setup (`lib/supabase/`)
- [ ] User creation trigger on first OAuth sign-in
- [ ] Profile page — view info + edit location

---

### Sprint 2 — Browse (Core Feature)

**Duration:** ~1–2 weeks
**Goal:** Anyone can browse books and mosques.

- [ ] `getApprovedBooks()` query with filters
- [ ] `getMosquesWithBookCount()` query
- [ ] Browse page — Books view (list + cards)
- [ ] Browse page — Mosques view (list + cards)
- [ ] Book card component
- [ ] Mosque card component (with unnamed mosque fallback)
- [ ] Search bar (title / author / mosque name)
- [ ] Category filter dropdown
- [ ] Governorate + city filter dropdowns
- [ ] Location picker on browse page (saves to profile)
- [ ] Proximity sorting (governorate/city match — V1)
- [ ] Book detail page (`/browse/book/:id`) — mosques listed by edition
- [ ] Mosque detail page (`/browse/mosque/:id`) — books with edition per entry

---

### Sprint 3 — Submit Books

**Duration:** ~1 week
**Goal:** Volunteers and users can submit books.

- [ ] `submitBook()` query function (edition + publisher now on mosque_books)
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
- [ ] User management: promote role
- [ ] Realtime pending badge (uses `admin_get_pending_count()` RPC)

---

### Sprint 5 — Edit Submission + Profile + Polish

**Duration:** ~1 week
**Goal:** Volunteers can edit submissions; profile shows full history with rejection reasons.

- [ ] `getSubmissionById()` query (with ownership check)
- [ ] `updateSubmission()` query (volunteer: stays approved; admin context: sets reviewed_by)
- [ ] `/submit/edit/[id]` page — reuses `SubmitBookForm` in edit mode
- [ ] Route guard: only submitter (volunteer) or admin can access
- [ ] Disabled edit button for pending submissions (with tooltip)
- [ ] Profile page — submission history with: title, edition, mosque, date, status
- [ ] Rejection reason displayed inline for rejected submissions
- [ ] About page — mission text
- [ ] About page — how it works section
- [ ] About page — feedback form
- [ ] 404 page
- [ ] Empty states for all pages ("لا توجد نتائج")
- [ ] Loading states / skeletons
- [ ] Mobile responsiveness review (all pages)
- [ ] RTL layout QA (all pages)
- [ ] Error handling (form validation, network errors)
- [ ] Accessibility review (contrast, tap targets)

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
  - [ ] Only admins see /requests
  - [ ] Only the submitter (volunteer) can edit their own submission
- [ ] Edition logic testing:
  - [ ] Same title + same edition in same mosque → blocked
  - [ ] Same title + NULL edition twice in same mosque → blocked
  - [ ] Same title + different edition in same mosque → allowed, new row created
- [ ] Cross-browser testing (Chrome, Firefox, Safari)
- [ ] Mobile testing (iOS Safari, Android Chrome)
- [ ] Performance check — browse page loads < 3s on 4G
- [ ] RTL rendering check — all pages
- [ ] Image upload testing (size limits, formats)
- [ ] Unnamed mosque fallback display — all components
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

| Feature                                          | Priority |
| ------------------------------------------------ | -------- |
| Home page with stats and intro                   | High     |
| GPS-based proximity sorting                      | High     |
| Map view with mosque pins                        | Medium   |
| Push / email notifications for submission status | Medium   |
| Volunteer recruitment page                       | Medium   |
| Financial support / donations                    | Low      |
| Multi-language (English)                         | Low      |
| Multi-country support                            | Low      |
| Mobile app (React Native)                        | Low      |
| ISBN support for books                           | Low      |
| Book condition / availability field              | Low      |
| "Request a book" feature (notify when found)     | Low      |
