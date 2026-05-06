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
├── /browse ....................................... Browse Books & Mosques  [PUBLIC]
│   ├── ?view=books ............................... Books View (default)
│   │   ├── Search bar
│   │   ├── Filters (category, governorate, city)
│   │   ├── Location picker
│   │   └── Book cards → /browse/book/:id
│   │
│   ├── ?view=mosques ............................. Mosques View
│   │   ├── Search bar
│   │   ├── Filters (governorate, city)
│   │   ├── Location picker
│   │   └── Mosque cards → /browse/mosque/:id
│   │
│   ├── /browse/book/:id .......................... Book Detail Page
│   │   └── List of mosques that hold this book
│   │
│   └── /browse/mosque/:id ........................ Mosque Detail Page
│       └── List of books in this mosque
│
├── /submit ....................................... Register a Book  [AUTH REQUIRED]
│   ├── Book info form
│   ├── Mosque search / select
│   └── Mosque create (if not found)
│
├── /requests ..................................... Book Registration Requests  [ADMIN ONLY]
│   ├── Pending submissions list
│   ├── Approve action
│   ├── Reject action (+ reason)
│   └── Edit & Approve action
│
├── /profile ...................................... My Profile  [AUTH REQUIRED]
│   ├── My info (name, email, location)
│   ├── Edit location
│   └── My submissions (history + status)
│
└── /about ........................................ About the Platform  [PUBLIC]
    ├── Mission statement
    ├── How it works
    ├── How to volunteer
    └── Feedback form
```

---

## Page Index

| Page                  | URL                    | Access                                                       | MVP   |
| --------------------- | ---------------------- | ------------------------------------------------------------ | ----- |
| Home                  | `/`                    | Public                                                       | ❌ V2 |
| Login / Register      | `/login`               | Unauthenticated users (by choice or redirect from `/submit`) | ✅    |
| Browse (Books)        | `/browse?view=books`   | Public                                                       | ✅    |
| Browse (Mosques)      | `/browse?view=mosques` | Public                                                       | ✅    |
| Book Detail           | `/browse/book/:id`     | Public                                                       | ✅    |
| Mosque Detail         | `/browse/mosque/:id`   | Public                                                       | ✅    |
| Submit a Book         | `/submit`              | Authenticated users only                                     | ✅    |
| Registration Requests | `/requests`            | Admin only                                                   | ✅    |
| My Profile            | `/profile`             | Authenticated users only                                     | ✅    |
| About                 | `/about`               | Public                                                       | ✅    |

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

| Route       | Guard                         | Redirect if denied |
| ----------- | ----------------------------- | ------------------ |
| `/`         | None — redirects to `/browse` | —                  |
| `/submit`   | Must be authenticated         | `/login`           |
| `/requests` | Must be `admin` role          | `/browse`          |
| `/profile`  | Must be authenticated         | `/login`           |
| `/login`    | Must be unauthenticated       | `/browse`          |

> **Decision (2026):** `/browse` is the platform's default entry point for all users, authenticated or not. `/login` is only reached when a guest attempts a protected action (e.g., submitting a book) or navigates to it via the navbar.

---

## Page Relationships (Cross-links)

```
/browse ──────────────────────────→ /browse/book/:id
                                  → /browse/mosque/:id
                                  → /login (if unauthenticated user attempts to submit)

/login ─────────────────────────────→ /browse (on success)
                                    → /submit (if redirect came from /submit)

/browse/book/:id ────────────────→ /browse/mosque/:id (click mosque)

/browse/mosque/:id ──────────────→ /browse/book/:id (click book)

/submit ─────────────────────────→ /browse (on success — volunteer)
                                 → /browse (on success — user, with pending notice)

/requests ───────────────────────→ /requests (refreshes after action)

/profile ────────────────────────→ /submit (edit own submission — volunteer)
                                 → /browse/book/:id (view a cataloged book)

/about ──────────────────────────→ (external: volunteer contact / form)
```
