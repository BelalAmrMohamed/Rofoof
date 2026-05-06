# Requirements — على رفوف المساجد

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
- Book submission by volunteers (auto-approved)
- Book submission requests by public users (pending admin review)
- Admin moderation dashboard (approve / reject requests)
- About page with feedback system

### ❌ Out of Scope — V1

| Feature                       | Reason           | Target |
| ----------------------------- | ---------------- | ------ |
| Home page                     | Not yet designed | V2     |
| Financial support / donations | Not yet designed | V2     |
| Notifications (email / push)  | Adds complexity  | V2     |
| Book edition / publisher      | Known DB gap     | V2     |
| Map view with GPS pins        | Stretch goal     | V2     |
| Multi-language (English)      | Scope management | V2     |
| Multi-country support         | Egypt-first      | V2     |
| Mobile app (iOS / Android)    | Web-first        | V3     |

---

## 4. Functional Requirements

### 4.1 Authentication & Users

| ID      | Requirement                                                                                                              | Priority |
| ------- | ------------------------------------------------------------------------------------------------------------------------ | -------- |
| AUTH-01 | Users can register with an email and password                                                                            | Must     |
| AUTH-02 | Users can sign in with Google OAuth                                                                                      | Must     |
| AUTH-03 | Users can sign in with Facebook OAuth                                                                                    | Must     |
| AUTH-04 | Guests (unauthenticated visitors) can browse the platform freely without any login prompt                                | Must     |
| AUTH-05 | Guests cannot access the book submission page                                                                            | Must     |
| AUTH-06 | Users set their location (governorate + city) manually during registration                                               | Must     |
| AUTH-07 | Location is not inferred from email — always user-defined                                                                | Must     |
| AUTH-08 | Users can update their location at any time                                                                              | Must     |
| AUTH-09 | Sessions persist so returning users are not asked to log in again                                                        | Must     |
| AUTH-10 | Roles are: `visitor`, `volunteer`, `admin`                                                                               | Must     |
| AUTH-11 | Admin can promote a user to `volunteer` or `admin`                                                                       | Must     |
| AUTH-12 | First-time visitors (and all unauthenticated users) land directly on `/browse` — no login gate or "skip" prompt is shown | Must     |

### 4.2 Browsing

| ID        | Requirement                                                                         | Priority |
| --------- | ----------------------------------------------------------------------------------- | -------- |
| BROWSE-01 | Anyone (including guests) can browse books and mosques                              | Must     |
| BROWSE-02 | Books can be browsed sorted by proximity of their mosque to the user                | Must     |
| BROWSE-03 | Mosques can be browsed sorted by proximity to the user                              | Must     |
| BROWSE-04 | User can switch between "Books view" and "Mosques view"                             | Must     |
| BROWSE-05 | User can filter books by: category, governorate, city                               | Must     |
| BROWSE-06 | User can search books by: title, author                                             | Must     |
| BROWSE-07 | User can search mosques by: name, city, governorate                                 | Must     |
| BROWSE-08 | User can change their current location from the browse page                         | Must     |
| BROWSE-09 | Each book card shows: title, author, category, mosque name, city                    | Must     |
| BROWSE-10 | Each mosque card shows: name (if any), city, governorate, number of cataloged books | Must     |

### 4.3 Book Submission

| ID        | Requirement                                                                                                                                                                                                                                                                                                                                       | Priority |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| SUBMIT-01 | Only email-registered users can access the submit page                                                                                                                                                                                                                                                                                            | Must     |
| SUBMIT-02 | Volunteers' submissions are automatically approved                                                                                                                                                                                                                                                                                                | Must     |
| SUBMIT-03 | Non-volunteer submissions are marked `pending` and sent to review                                                                                                                                                                                                                                                                                 | Must     |
| SUBMIT-04 | Submitter can search for an existing mosque on the platform                                                                                                                                                                                                                                                                                       | Must     |
| SUBMIT-05 | If mosque not found, submitter registers new mosque inline                                                                                                                                                                                                                                                                                        | Must     |
| SUBMIT-06 | Book form includes: title (required), author, category, extra info, image                                                                                                                                                                                                                                                                         | Must     |
| SUBMIT-07 | Mosque form includes: governorate (required), city (required), name, image                                                                                                                                                                                                                                                                        | Must     |
| SUBMIT-08 | Volunteers can edit or delete their own approved submissions                                                                                                                                                                                                                                                                                      | Should   |
| SUBMIT-09 | Duplicate detection (same book title + same mosque): if the existing entry has the **same edition**, the submission is blocked as a true duplicate. If the existing entry has a **different edition**, no new mosque_books entry is created — instead, the existing entry is flagged with `has_multiple_editions = true` and the user is informed | Should   |

### 4.4 Moderation (Admin)

| ID     | Requirement                                                                                                                                                                                                   | Priority |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| MOD-01 | Admins can view all pending book submissions                                                                                                                                                                  | Must     |
| MOD-02 | Admins can approve a pending submission                                                                                                                                                                       | Must     |
| MOD-03 | Admins can reject a pending submission                                                                                                                                                                        | Must     |
| MOD-04 | Admins can edit a submission before approving it                                                                                                                                                              | Should   |
| MOD-05 | Admins can add a note/reason when rejecting                                                                                                                                                                   | Should   |
| MOD-06 | Admins can filter requests by: status, date, governorate                                                                                                                                                      | Should   |
| MOD-07 | Admins can promote users to volunteer or admin                                                                                                                                                                | Must     |
| MOD-08 | Admins can edit or delete any book entry                                                                                                                                                                      | Must     |
| MOD-09 | The navigation bar displays a live badge counter showing the current number of pending submissions, visible only to admins. The counter updates in real time via Supabase Realtime (no page refresh required) | Must     |

### 4.5 About Page

| ID       | Requirement                                                     | Priority   |
| -------- | --------------------------------------------------------------- | ---------- |
| ABOUT-01 | Page explains the platform's mission                            | Must       |
| ABOUT-02 | Page explains how the platform works (for users and volunteers) | Must       |
| ABOUT-03 | Page includes a feedback / rating form                          | Should     |
| ABOUT-04 | Page includes a way to contact the team                         | Should     |
| ABOUT-05 | Page includes financial support info                            | Could (V2) |

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

- Title is the only required field
- Category uses a predefined list (extensible): فقه، حديث، تفسير، سيرة، أدب، أخرى
- Book image is stored as a URL (not raw binary)
- A book can exist in multiple mosques (many-to-many via `mosque_books`)

### Mosques

- Governorate and city are the only required fields
- Mosque name is optional (many mosques in Egypt are unnamed)
- Coordinates (lat/lng) stored for future map feature, not required in V1

### Users

- Location (governorate + city) is always user-defined — never auto-detected from email
- Users who signed up without email can still have their name and location stored locally
- All role changes must be made by an admin

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

| #   | Question                                                  | Owner | Status  |
| --- | --------------------------------------------------------- | ----- | ------- |
| 1   | How are volunteers recruited and onboarded?               | Team  | ❓ Open |
| 2   | What happens if a book already exists in the DB?          | Dev   | ❓ Open |
| 3   | Should books have ISBNs for standardization?              | Team  | ❓ Open |
| 4   | Who owns the domain and pays for hosting long-term?       | Team  | ❓ Open |
| 5   | Is there a maximum number of books per mosque entry?      | Dev   | ❓ Open |
| 6   | Should rejected submissions be visible to the submitter?  | UX    | ❓ Open |
| 7   | Will there be a way to flag incorrect/outdated book info? | UX    | ❓ Open |
