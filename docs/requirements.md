# Requirements — على رفوف المساجد

> **Revision history:**
>
> - 2026 (initial) — First draft
> - 2026 (updated) — Corrected edition/publisher scope; fixed SUBMIT-09 duplicate logic; added SUBMIT-10, SUBMIT-11, AUTH-13; closed open questions #2 and #6; updated data requirements to reflect 2026 schema decisions.
> - 2026 (prototyping update) — Closed open questions #8, #9, #10; added NAV requirements; added ABOUT-06 for feedback table; updated scope to reflect Browse-as-home-page decision.

---

## 1. Project Overview

**Platform Name:** على رفوف المساجد _(On the Shelves of Mosques)_ — **confirmed, final**
**Type:** Community-driven book cataloging web platform
**Geography:** Egypt (V1); extensible to other Arab countries in V2
**Language:** Arabic (RTL) — primary; English optional in V2

---

## 2. Goals

| Goal              | Description                                                      |
| ----------------- | ---------------------------------------------------------------- |
| **Discovery**     | Make books in mosque libraries searchable and findable by anyone |
| **Accessibility** | Single platform, works on mobile and desktop                     |
| **Community**     | Enable volunteers to catalog books in their local mosques        |
| **Trust**         | Ensure submitted data is accurate through a moderation workflow  |

---

## 3. Scope

### ✅ In Scope — MVP (V1)

- User registration and authentication (email, Google, Facebook)
- Guest / skip-login access (browse only)
- Location-based book and mosque browsing
- `/browse` as the platform entry point and V1 home page
- Book submission by volunteers (auto-approved)
- Book submission requests by public users (pending admin review)
- Admin moderation dashboard (approve / reject / edit requests), accessible from Profile
- Volunteer edit of own approved submissions
- Book edition and publisher tracking (per mosque copy)
- About page with feedback system (stored in `feedback` table)
- Side menu navigation (desktop/tablet) + bottom tab bar (mobile)

### ❌ Out of Scope — V1

| Feature                       | Reason           | Target |
| ----------------------------- | ---------------- | ------ |
| Separate Home page            | /browse serves as home in V1 | V2 |
| Financial support / donations | Not yet designed | V2     |
| Notifications (email / push)  | Adds complexity  | V2     |
| GPS-based proximity sorting   | Stretch goal     | V2     |
| Map view with GPS pins        | Stretch goal     | V2     |
| Multi-language (English)      | Scope management | V2     |
| Multi-country support         | Egypt-first      | V2     |
| Mobile app (iOS / Android)    | Web-first        | V3     |

---

## 4. Functional Requirements

### 4.1 Authentication & Users

| ID      | Requirement                                                                                                                                                                                                                                | Priority |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------- |
| AUTH-01 | Users can register with an email and password                                                                                                                                                                                              | Must     |
| AUTH-02 | Users can sign in with Google OAuth                                                                                                                                                                                                        | Must     |
| AUTH-03 | Users can sign in with Facebook OAuth                                                                                                                                                                                                      | Must     |
| AUTH-04 | Guests (unauthenticated visitors) can browse the platform freely without any login prompt                                                                                                                                                  | Must     |
| AUTH-05 | Guests cannot access the book submission page                                                                                                                                                                                              | Must     |
| AUTH-06 | Users set their location (governorate + city) manually during registration (email) or during onboarding (OAuth)                                                                                                                            | Must     |
| AUTH-07 | Location is not inferred from email — always user-defined                                                                                                                                                                                  | Must     |
| AUTH-08 | Users can update their location at any time from the browse page or profile page — both update the same profile record                                                                                                                     | Must     |
| AUTH-09 | Sessions persist so returning users are not asked to log in again                                                                                                                                                                          | Must     |
| AUTH-10 | Roles are: `visitor`, `volunteer`, `admin`                                                                                                                                                                                                 | Must     |
| AUTH-11 | Admin can promote a user to `volunteer` or `admin`                                                                                                                                                                                         | Must     |
| AUTH-12 | First-time visitors (and all unauthenticated users) land directly on `/browse` — no login gate or "skip" prompt is shown                                                                                                                   | Must     |
| AUTH-13 | First-time OAuth users (Google / Facebook) who have not yet set their location are automatically redirected to `/onboarding` after sign-in. Email-registered users bypass `/onboarding` because location is collected during registration. | Must     |

### 4.2 Browsing

| ID        | Requirement                                                                                                                             | Priority |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| BROWSE-01 | Anyone (including guests) can browse books and mosques                                                                                  | Must     |
| BROWSE-02 | Books can be browsed sorted by proximity of their mosque to the user (governorate/city match)                                           | Must     |
| BROWSE-03 | Mosques can be browsed sorted by proximity to the user                                                                                  | Must     |
| BROWSE-04 | User can switch between "Books view" and "Mosques view"                                                                                 | Must     |
| BROWSE-05 | User can filter books by: category, governorate, city                                                                                   | Must     |
| BROWSE-06 | User can search books by: title, author                                                                                                 | Must     |
| BROWSE-07 | User can search mosques by: name, city, governorate                                                                                     | Must     |
| BROWSE-08 | User can change their current location from the browse page; the change saves to their profile (or session cookie if guest)             | Must     |
| BROWSE-09 | Each book card shows: title, author, category, mosque name (or fallback), city                                                          | Must     |
| BROWSE-10 | Each mosque card shows: name (or fallback), city, governorate, number of cataloged books                                                | Must     |
| BROWSE-11 | Mosques with no registered name display as "مسجد — [المدينة]" in all UI contexts                                                        | Must     |
| BROWSE-12 | Book detail page shows all mosque entries for that book, each with its edition (if recorded), governorate, city, and distance from user | Must     |
| BROWSE-13 | If the same mosque holds multiple editions of a book, each edition appears as a separate row on the book detail page                    | Must     |

### 4.3 Book Submission

| ID        | Requirement                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Priority |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| SUBMIT-01 | Only authenticated users can access the submit page; guests are redirected to `/login`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | Must     |
| SUBMIT-02 | Volunteers' submissions are automatically approved and immediately visible in public browse                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Must     |
| SUBMIT-03 | Non-volunteer (visitor) submissions are marked `pending` and sent to admin review                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | Must     |
| SUBMIT-04 | Submitter can search for an existing mosque by name, city, or governorate                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | Must     |
| SUBMIT-05 | If mosque not found, submitter can register a new mosque inline without leaving the form                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | Must     |
| SUBMIT-06 | Book form fields: title (required), author, category, edition, publisher, notes, image                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | Must     |
| SUBMIT-07 | Mosque form fields: governorate (required), city (required), name (optional), image (optional)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | Must     |
| SUBMIT-08 | Volunteers can edit their own approved submissions via `/submit/edit/[id]`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | Should   |
| SUBMIT-09 | **Edition-aware duplicate detection** — when a submission arrives for title T, mosque M, and edition E, the system checks for an existing `mosque_books` row with the same (book_id, mosque_id, edition) using NULLS NOT DISTINCT logic. **(A) True duplicate** — blocked with "هذا الكتاب بهذه الطبعة مسجّل بالفعل في هذا المسجد". **(B) New edition** — a new row is created and the user sees "تمت إضافة طبعة جديدة لهذا الكتاب في نفس المسجد".                                                                                                                                                                                                                              | Should   |
| SUBMIT-10 | A volunteer who originally submitted an entry can edit it from `/submit/edit/[id]`. The edit form is pre-filled. Changes save immediately and the entry remains `approved`. Pending submissions cannot be edited while awaiting review.                                                                                                                                                                                                                                                                                                                                                                                                                                            | Should   |
| SUBMIT-11 | Rejected submissions are visible to the submitter in their profile page, including the admin's rejection note (if provided).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | Should   |

### 4.4 Moderation (Admin)

| ID     | Requirement                                                                                                                                                                                   | Priority |
| ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| MOD-01 | Admins can view all pending book submissions                                                                                                                                                  | Must     |
| MOD-02 | Admins can approve a pending submission                                                                                                                                                       | Must     |
| MOD-03 | Admins can reject a pending submission                                                                                                                                                        | Must     |
| MOD-04 | Admins can edit a submission's data before approving it, via `/submit/edit/[id]?context=admin`                                                                                                | Should   |
| MOD-05 | Admins can add a note/reason when rejecting; this note is stored and shown to the submitter in their profile                                                                                  | Should   |
| MOD-06 | Admins can filter requests by: status, date, governorate                                                                                                                                      | Should   |
| MOD-07 | Admins can promote users to volunteer or admin                                                                                                                                                | Must     |
| MOD-08 | Admins can edit or delete any book entry                                                                                                                                                      | Must     |
| MOD-09 | The Requests page is accessible from the admin's Profile page only — it is not a top-level navigation item                                                                                    | Must     |
| MOD-10 | A live pending count is displayed on the Profile page (next to the Requests link) for admins, updating in real time via Supabase Realtime. On mobile, a dot indicator appears on the Profile tab. | Must |

### 4.5 Navigation

| ID    | Requirement                                                                                                           | Priority |
| ----- | --------------------------------------------------------------------------------------------------------------------- | -------- |
| NAV-01 | Desktop: a fixed side menu (dark green, RTL) provides navigation; it appears on the right side of the screen         | Must     |
| NAV-02 | Tablet: the side menu is collapsible (icon-only when collapsed, expands on demand)                                   | Must     |
| NAV-03 | Mobile: a bottom tab bar replaces the side menu; it shows Browse, Submit, and Profile tabs                           | Must     |
| NAV-04 | The nav renders differently based on role: guests see Browse, About, Login; authenticated users see Submit and Profile; admins see no extra top-level link for Requests | Must |
| NAV-05 | The Requests page is NOT a top-level nav item; it is accessed via the Profile page (admin section only)              | Must     |
| NAV-06 | On mobile, a dot indicator appears on the Profile tab when the admin has pending submissions (count > 0)             | Should   |

### 4.6 About Page

| ID       | Requirement                                                     | Priority   |
| -------- | --------------------------------------------------------------- | ---------- |
| ABOUT-01 | Page explains the platform's mission                            | Must       |
| ABOUT-02 | Page explains how the platform works (for users and volunteers) | Must       |
| ABOUT-03 | Page includes a feedback / rating form                          | Should     |
| ABOUT-04 | Page includes a way to contact the team                         | Should     |
| ABOUT-05 | Page includes financial support info                            | Could (V2) |
| ABOUT-06 | Feedback form submissions are stored in a `feedback` table in the database; guest users can also submit (no login required) | Must |

---

## 5. Non-Functional Requirements

| ID     | Category           | Requirement                                                                           |
| ------ | ------------------ | ------------------------------------------------------------------------------------- |
| NFR-01 | **Language**       | Platform is fully in Arabic, right-to-left (RTL) layout                               |
| NFR-02 | **Responsiveness** | Works on mobile, tablet, and desktop (mobile-first)                                   |
| NFR-03 | **Performance**    | Browse page loads in under 3 seconds on 4G                                            |
| NFR-04 | **Accessibility**  | Text is legible; sufficient contrast; tappable targets ≥ 44px                         |
| NFR-05 | **Security**       | Authentication managed via Supabase Auth; no passwords stored in plain text           |
| NFR-06 | **Data integrity** | Only approved submissions appear in public browse                                     |
| NFR-07 | **Scalability**    | Database design supports multiple countries (location fields are not Egypt-hardcoded) |
| NFR-08 | **Availability**   | Platform targets 99% uptime via Vercel + Supabase                                     |
| NFR-09 | **Privacy**        | User locations are not shared publicly; only used for proximity sorting               |
| NFR-10 | **Offline**        | Not required for V1                                                                   |

---

## 6. Data Requirements

### Books

- Title is the only required field on the `books` table
- A `books` row represents a bibliographic title — the identity of a work, independent of which edition or where it is held
- Category uses a predefined enum: فقه، حديث، تفسير، سيرة، عقيدة، تزكية، أدب، تاريخ، أخرى
- Book image is stored as a URL (not raw binary)
- A book can exist in multiple mosques in multiple editions (many-to-many via `mosque_books`)

### Editions & Publishers (on `mosque_books`, not `books`)

- **Edition** and **publisher** describe a specific physical copy held by a mosque — they belong on the `mosque_books` junction table, not the `books` table
- Edition is optional (NULL = unspecified). NULLS NOT DISTINCT logic means two rows with NULL edition for the same book + mosque are treated as a duplicate
- Publisher is optional

### Mosques

- Governorate and city are the only required fields
- Mosque name is optional — display fallback: "مسجد — [المدينة]"
- Coordinates (lat/lng) stored for future map feature, not required in V1

### Users

- Location (governorate + city) is always user-defined — never auto-detected
- Email users set location during registration; OAuth users set location during `/onboarding`
- **Guests** who set location on browse page have it stored in a **session cookie only** — it does not persist across sessions and is not linked to any profile
- **Authenticated users** who change location anywhere have it saved to their `users` profile record immediately
- All role changes must be made by an admin

### Feedback

- Stored in the `feedback` table (see schema.sql)
- Fields: message (required), email (optional, for guests who want a reply), rating (1–5, optional), user_id (nullable — null for guests)
- No login required to submit feedback

---

## 7. Constraints

| Constraint    | Details                                                      |
| ------------- | ------------------------------------------------------------ |
| **Budget**    | Zero (open-source, free tiers only for V1)                   |
| **Team size** | Small volunteer team                                         |
| **Timeline**  | TBD                                                          |
| **Tech**      | HTML, CSS, TypeScript — as decided by team                   |
| **Hosting**   | Vercel (free tier)                                           |
| **Database**  | Supabase free tier (500MB storage, 50K monthly active users) |

---

## 8. Assumptions

- The primary device for users is a smartphone
- Most mosque names in Egypt are not officially registered, so name is optional
- Volunteers are trusted individuals — they will be added by admins, not self-assigned
- Internet connectivity is assumed (no offline mode in V1)
- Content is user-generated and subject to human error; moderation is essential

---

## 9. Open Questions

| #   | Question                                                  | Owner | Status                                                                                                                                                          |
| --- | --------------------------------------------------------- | ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | How are volunteers recruited and onboarded?               | Team  | ❓ Open                                                                                                                                                         |
| 2   | What happens if a book already exists in the DB?          | Dev   | ✅ Resolved — See SUBMIT-09. Duplicate detection is edition-aware.                                                                                              |
| 3   | Should books have ISBNs for standardization?              | Team  | ❓ Open — Could (V2)                                                                                                                                            |
| 4   | Who owns the domain and pays for hosting long-term?       | Team  | ❓ Open                                                                                                                                                         |
| 5   | Is there a maximum number of books per mosque entry?      | Dev   | ❓ Open — No limit enforced in V1                                                                                                                               |
| 6   | Should rejected submissions be visible to the submitter?  | UX    | ✅ Resolved — Yes. The rejection note is stored in `mosque_books.rejection_note` and displayed in /profile.                                                     |
| 7   | Will there be a way to flag incorrect/outdated book info? | UX    | ❓ Open — Could (V2)                                                                                                                                            |
| 8   | Should the Browse page be the home page?                  | UX    | ✅ Resolved — Yes. `/browse` is the platform entry point in V1. Root `/` redirects to `/browse`. A dedicated home page is a V2 feature.                         |
| 9   | Should the feedback form store data in the DB?            | Dev   | ✅ Resolved — Yes. A `feedback` table is added to schema.sql. Guests can submit without logging in.                                                             |
| 10  | Desktop nav: top bar or side menu?                        | UX    | ✅ Resolved — Side menu (fixed, dark green, RTL). Tablet: collapsible. Mobile: bottom tab bar. Requests page is accessed from Profile, not the nav.             |
