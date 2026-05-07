# Sitemap — على رفوف المساجد

> This document describes every page on the platform, its URL, who can access it, and what it links to.
> For a visual diagram, see [`../diagrams/sitemap.html`](../diagrams/sitemap.html).

---

## Navigation Structure

```
على رفوف المساجد
│
├── / ............................................. Home (V2 — not in MVP)
│
├── /login ........................................ Login & Registration  [UNAUTHENTICATED — reached by choice or redirect]
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
├── /browse ....................................... Browse Books & Mosques  [PUBLIC]
│   ├── ?view=books ............................... Books View (default)
│   │   ├── Search bar
│   │   ├── Filters (category, governorate, city)
│   │   ├── Location picker (saves to profile)
│   │   └── Book cards → /browse/book/:id
│   │
│   ├── ?view=mosques ............................. Mosques View
│   │   ├── Search bar
│   │   ├── Filters (governorate, city)
│   │   ├── Location picker (saves to profile)
│   │   └── Mosque cards → /browse/mosque/:id
│   │
│   ├── /browse/book/:id .......................... Book Detail Page
│   │   └── List of mosques that hold this book (grouped by edition)
│   │
│   └── /browse/mosque/:id ........................ Mosque Detail Page
│       └── List of books in this mosque (with edition per entry)
│
├── /submit ....................................... Register a Book  [AUTH REQUIRED]
│   ├── Book info form
│   ├── Mosque search / select
│   └── Mosque create (if not found)
│
├── /submit/edit/[id] ............................. Edit Own Submission  [VOLUNTEER / ADMIN ONLY]
│   ├── Pre-filled book + mosque form
│   ├── Save changes (re-approves if volunteer; queues re-review if changed by admin edit)
│   └── Cancel → /profile
│
├── /requests ..................................... Book Registration Requests  [ADMIN ONLY]
│   ├── Pending submissions list
│   ├── Approve action
│   ├── Reject action (+ reason)
│   └── Edit & Approve action → /submit/edit/[id]?context=admin
│
├── /profile ...................................... My Profile  [AUTH REQUIRED]
│   ├── My info (name, email, location)
│   ├── Edit location (saves to profile — same as browse picker)
│   └── My submissions (history + status + rejection reason if rejected)
│
└── /about ........................................ About the Platform  [PUBLIC]
    ├── Mission statement
    ├── How it works
    ├── How to volunteer
    └── Feedback form
```

---

## Page Index

| Page                  | URL                    | Access                                                                       | MVP   |
| --------------------- | ---------------------- | ---------------------------------------------------------------------------- | ----- |
| Home                  | `/`                    | Public                                                                       | ❌ V2 |
| Login / Register      | `/login`               | Unauthenticated users (by choice or redirect from `/submit`)                 | ✅    |
| Onboarding            | `/onboarding`          | OAuth users with no location set (auto-redirected after first OAuth sign-in) | ✅    |
| Browse (Books)        | `/browse?view=books`   | Public                                                                       | ✅    |
| Browse (Mosques)      | `/browse?view=mosques` | Public                                                                       | ✅    |
| Book Detail           | `/browse/book/:id`     | Public                                                                       | ✅    |
| Mosque Detail         | `/browse/mosque/:id`   | Public                                                                       | ✅    |
| Submit a Book         | `/submit`              | Authenticated users only                                                     | ✅    |
| Edit Own Submission   | `/submit/edit/[id]`    | Volunteer who owns the submission, or Admin                                  | ✅    |
| Registration Requests | `/requests`            | Admin only                                                                   | ✅    |
| My Profile            | `/profile`             | Authenticated users only                                                     | ✅    |
| About                 | `/about`               | Public                                                                       | ✅    |

---

## Navigation Bar Links

| Link                     | Visible to          |
| ------------------------ | ------------------- |
| تصفح الكتب (Browse)      | Everyone            |
| تسجيل كتاب (Submit)      | Authenticated users |
| طلبات التسجيل (Requests) | Admins only         |
| عن المنصة (About)        | Everyone            |
| تسجيل الدخول (Login)     | Guests only         |
| الملف الشخصي (Profile)   | Authenticated users |
| تسجيل الخروج (Logout)    | Authenticated users |

---

## Auth Guards (Route Protection)

| Route               | Guard                                              | Redirect if denied                  |
| ------------------- | -------------------------------------------------- | ----------------------------------- |
| `/`                 | None — redirects to `/browse`                      | —                                   |
| `/onboarding`       | Must be authenticated + no location set on profile | `/browse` (if location already set) |
| `/submit`           | Must be authenticated                              | `/login`                            |
| `/submit/edit/[id]` | Must be volunteer (own submission) or admin        | `/browse`                           |
| `/requests`         | Must be `admin` role                               | `/browse`                           |
| `/profile`          | Must be authenticated                              | `/login`                            |
| `/login`            | Must be unauthenticated                            | `/browse`                           |

> **Decision (2026):** `/browse` is the platform's default entry point for all users, authenticated or not. `/login` is only reached when a guest attempts a protected action (e.g., submitting a book) or navigates there via the navbar. `/onboarding` is only reached immediately after a first-time OAuth sign-in; it is skipped entirely for email registrations (which collect location inline).

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

/requests ───────────────────────→ /submit/edit/[id]?context=admin (Edit & Approve)
                                 → /requests (refreshes after approve/reject action)

/profile ────────────────────────→ /submit/edit/[id] (edit own submission — volunteer)
                                 → /browse/book/:id (view a cataloged book)

/about ──────────────────────────→ (external: volunteer contact / form)
```
