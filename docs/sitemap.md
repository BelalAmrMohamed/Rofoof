# Sitemap — على رفوف المساجد

> This document describes every page on the platform, its URL, who can access it, and what it links to.
> For a visual diagram, see [`../diagrams/sitemap.html`](../diagrams/sitemap.html).

---

## Navigation Structure

```
على رفوف المساجد
│
├── / ............................................. → Redirects to /browse (Browse IS the home page in V1)
│
├── /browse ....................................... Browse Books & Mosques  [PUBLIC — default entry point]
│   ├── ?view=books ............................... Books View (default)
│   │   ├── Search bar
│   │   ├── Filters (category, governorate, city)
│   │   ├── Location picker (saves to profile if auth; session cookie if guest)
│   │   └── Book cards → /browse/book/:id
│   │
│   ├── ?view=mosques ............................. Mosques View
│   │   ├── Search bar
│   │   ├── Filters (governorate, city)
│   │   ├── Location picker (saves to profile if auth; session cookie if guest)
│   │   └── Mosque cards → /browse/mosque/:id
│   │
│   ├── /browse/book/:id .......................... Book Detail Page
│   │   └── List of mosques that hold this book (grouped by edition)
│   │
│   └── /browse/mosque/:id ........................ Mosque Detail Page
│       └── List of books in this mosque (with edition per entry)
│
├── /login ........................................ Login & Registration  [UNAUTHENTICATED ONLY]
│   ├── Sign in with Google
│   ├── Sign in with Facebook
│   ├── Sign in with Email
│   └── Register with Email
│
├── /onboarding ................................... First-Time Setup  [POST-OAUTH, NO LOCATION SET]
│   ├── Welcome message + brief platform intro
│   ├── Governorate + City picker (required)
│   └── "ابدأ التصفح" → /browse
│
├── /submit ....................................... Register a Book  [AUTH REQUIRED]
│   ├── Book info form
│   ├── Mosque search / select
│   └── Mosque create (if not found)
│
├── /submit/edit/[id] ............................. Edit Own Submission  [VOLUNTEER / ADMIN ONLY]
│   ├── Pre-filled book + mosque form
│   ├── Save changes (stays approved if volunteer; sets reviewed_by if admin context)
│   └── Cancel → /profile
│
├── /requests ..................................... Book Registration Requests  [ADMIN ONLY]
│   │   ← Reached from /profile (admin section) — NOT a top-level nav item
│   ├── Pending submissions list
│   ├── Approve action
│   ├── Reject action (+ reason)
│   ├── Edit & Approve action → /submit/edit/[id]?context=admin
│   └── User management (promote role)
│
├── /profile ...................................... My Profile  [AUTH REQUIRED]
│   ├── My info (name, email, location)
│   ├── Edit location (saves to profile — same as browse picker)
│   ├── My submissions (history + status + rejection reason if rejected)
│   └── [ADMIN ONLY] Link to /requests + realtime pending submissions count
│
└── /about ........................................ About the Platform  [PUBLIC]
    ├── Mission statement
    ├── How it works
    ├── How to volunteer
    └── Feedback form (stored in `feedback` table)
```

---

## Page Index

| Page | URL | Access | MVP |
| --------------------- | ---------------------- | ---------------------------------------------------------------------------- | ----- |
| Browse (Books) | `/browse?view=books` | Public — default entry point (replaces `/` in V1) | ✅ |
| Browse (Mosques) | `/browse?view=mosques` | Public | ✅ |
| Book Detail | `/browse/book/:id` | Public | ✅ |
| Mosque Detail | `/browse/mosque/:id` | Public | ✅ |
| Login / Register | `/login` | Unauthenticated users (by choice or redirect from `/submit`) | ✅ |
| Onboarding | `/onboarding` | OAuth users with no location set (auto-redirected after first OAuth sign-in) | ✅ |
| Submit a Book | `/submit` | Authenticated users only | ✅ |
| Edit Own Submission | `/submit/edit/[id]` | Volunteer who owns the submission, or Admin | ✅ |
| Registration Requests | `/requests` | Admin only — accessed from /profile | ✅ |
| My Profile | `/profile` | Authenticated users only | ✅ |
| About | `/about` | Public | ✅ |
| Home | `/` | Public — redirects to `/browse` in V1; dedicated page in V2 | ❌ V2 |

---

## Navigation Components

### Desktop Side Menu (fixed, dark green, RTL)

| Link | Visible to |
| -------------------------------- | ------------------- |
| تصفح الكتب (Browse) | Everyone |
| تسجيل كتاب (Submit) | Authenticated users |
| عن المنصة (About) | Everyone |
| الملف الشخصي (Profile) | Authenticated users |
| تسجيل الدخول (Login) | Guests only |
| تسجيل الخروج (Logout) | Authenticated users |

> **Note:** "طلبات التسجيل (Requests)" is NOT in the side menu. It is accessible from the Profile page for admins only.

### Mobile Bottom Tab Bar

| Tab | Icon | Visible to |
| ----------------------- | ---- | ------------------- |
| تصفح (Browse) | 🔍 | Everyone |
| تسجيل (Submit) | ➕ | Authenticated users |
| الملف الشخصي (Profile) | 👤 | Authenticated users |

> On mobile, guests see Browse and a Login prompt in place of Submit/Profile.

### Admin-Specific Elements

| Element | Location | Behavior |
| ----------------------------------- | -------- | -------- |
| Requests link | /profile page | Visible to admin role only |
| Realtime pending count badge | /profile page (next to Requests link) | Live count via Supabase Realtime; hidden when count = 0 |
| Pending indicator on Profile tab | Mobile bottom tab bar | Small dot indicator for admin when pending > 0 |

---

## Auth Guards (Route Protection)

| Route | Guard | Redirect if denied |
| ------------------- | -------------------------------------------------- | ----------------------------------- |
| `/` | None — redirects to `/browse` | — |
| `/onboarding` | Must be authenticated + no location set on profile | `/browse` (if location already set) |
| `/submit` | Must be authenticated | `/login` |
| `/submit/edit/[id]` | Must be volunteer (own submission) or admin | `/browse` |
| `/requests` | Must be `admin` role | `/browse` |
| `/profile` | Must be authenticated | `/login` |
| `/login` | Must be unauthenticated | `/browse` |

> **Decision (2026):** `/browse` is the platform entry point for all users, authenticated or not. It also functions as the V1 home page (root `/` redirects to `/browse`). A dedicated home page is planned for V2. `/login` is only reached when a guest attempts a protected action or navigates there via the nav. `/onboarding` is only reached immediately after a first-time OAuth sign-in; it is skipped entirely for email registrations.

---

## Guest Location Behavior

| State | Location Storage | Persistence |
| ------------- | ---------------- | ----------- |
| Guest | Session cookie | Lost when browser is closed |
| Auth user | `users` table (`governorate`, `city` columns) | Persists across all sessions |

Setting location on the browse page updates the profile for authenticated users. For guests, it stores in a session cookie only — no profile record exists.

---

## Onboarding Trigger Logic

```
User completes OAuth sign-in (Google or Facebook)
    ↓
Supabase Auth callback fires → user row created in users table
    ↓
middleware.ts checks: users.governorate IS NULL OR users.city IS NULL?
    ↓
YES → redirect to /onboarding
NO  → redirect to /browse (or the originally requested page)
```

Email-registered users are NOT redirected to `/onboarding` because the registration form already collects `governorate` and `city` as required fields.

---

## Page Relationships (Cross-links)

```
/browse ──────────────────────────→ /browse/book/:id
                                  → /browse/mosque/:id
                                  → /login (if unauthenticated user attempts to submit)

/login ─────────────────────────────→ /onboarding (first OAuth sign-in, no location)
                                    → /browse (email login / subsequent OAuth)
                                    → /submit (if redirect came from /submit)

/onboarding ─────────────────────→ /browse (after location is saved)

/browse/book/:id ────────────────→ /browse/mosque/:id (click mosque)

/browse/mosque/:id ──────────────→ /browse/book/:id (click book)

/submit ─────────────────────────→ /browse (on success — volunteer)
                                 → /browse (on success — user, with pending notice)

/submit/edit/[id] ───────────────→ /profile (on save or cancel)
                                 → /requests (if accessed via admin context=admin)

/profile ────────────────────────→ /requests (admin section link — admin only)
                                 → /submit/edit/[id] (edit own submission — volunteer)
                                 → /browse/book/:id (view a cataloged book)

/requests ───────────────────────→ /submit/edit/[id]?context=admin (Edit & Approve)
                                 → /requests (refreshes after approve/reject action)

/about ──────────────────────────→ (external: volunteer contact / form)
```
