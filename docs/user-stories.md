# User Stories — على رفوف المساجد

> Format: _"As a [role], I want to [action], so that [benefit]."_
> Each story includes **Acceptance Criteria (AC)** — the conditions that define "done".

---

## Roles

| Role          | Description                                               |
| ------------- | --------------------------------------------------------- |
| **Guest**     | Unauthenticated visitor (skipped login or not registered) |
| **User**      | Registered with email; can request book submissions       |
| **Volunteer** | Trusted cataloger; submissions are auto-approved          |
| **Admin**     | Moderator; can approve/reject/edit/delete anything        |

---

## 1. Authentication & Onboarding

---

### US-01 — Browse Without an Account

**As a** guest,
**I want to** arrive directly on the browse page without any login prompt,
**so that** I can discover books immediately with zero friction.

**Acceptance Criteria:**

- [ ] Visiting the platform root or `/browse` takes any unauthenticated user directly to the browse page — no login screen is shown
- [ ] I can see all approved books and mosques
- [ ] I cannot access the book submission page (`/submit` redirects me to `/login`)
- [ ] A "تسجيل الدخول" (Login) link is visible in the navbar so I can choose to sign in when ready
- [ ] My guest session persists for the duration of the browser session — I am not interrupted

---

### US-02 — Register with Email

**As a** new visitor,
**I want to** create an account with my email,
**so that** I can submit book entries to the platform.

**Acceptance Criteria:**

- [ ] Registration form collects: full name, email, password
- [ ] I must also select my governorate and city (dropdown — not auto-detected)
- [ ] After registration, I am taken to the browse page
- [ ] My session persists — I do not need to log in again on my next visit
- [ ] My role is set to `visitor` by default (until promoted by an admin)

---

### US-03 — Sign In with Google or Facebook

**As a** returning user,
**I want to** sign in with my Google or Facebook account,
**so that** I don't need to remember a password.

**Acceptance Criteria:**

- [ ] "تسجيل الدخول بـ Google" and "تسجيل الدخول بـ Facebook" buttons are visible
- [ ] Clicking either opens the respective OAuth flow
- [ ] On first OAuth sign-in, I am prompted to set my governorate and city
- [ ] My profile is created and I am taken to the browse page
- [ ] On subsequent sign-ins, I go directly to the browse page

---

### US-04 — Update My Location

**As a** registered user,
**I want to** update my governorate and city at any time,
**so that** the browse page always shows me relevant nearby results.

**Acceptance Criteria:**

- [ ] A location change option is accessible from the browse page and my profile
- [ ] I can select any governorate + city combination from dropdowns
- [ ] The change is saved immediately
- [ ] The browse results update to reflect my new location

---

## 2. Browsing

---

### US-05 — Browse Books by Proximity

**As a** guest or user,
**I want to** see books sorted by how close their mosque is to me,
**so that** I can find books I can actually access.

**Acceptance Criteria:**

- [ ] The default browse view shows books, sorted by mosque proximity
- [ ] Each book card shows: title, author, category, mosque name (or city), governorate
- [ ] If I have no location set, I am prompted to enter one before proximity sorting works
- [ ] Results only include books from `approved` submissions

---

### US-06 — Browse Mosques by Proximity

**As a** guest or user,
**I want to** see mosques near me and what books they contain,
**so that** I can visit a mosque library that has what I'm looking for.

**Acceptance Criteria:**

- [ ] A "المساجد" tab/toggle switches to mosque view
- [ ] Each mosque card shows: name (if any), city, governorate, number of cataloged books
- [ ] Clicking a mosque card shows all books cataloged in that mosque
- [ ] Results are sorted by proximity to my location

---

### US-07 — Filter and Search Books

**As a** guest or user,
**I want to** filter books by category and search by title or author,
**so that** I can quickly find a specific book or topic.

**Acceptance Criteria:**

- [ ] A search bar accepts text input (title or author)
- [ ] A category filter dropdown shows all available categories
- [ ] A governorate filter dropdown narrows results by region
- [ ] Filters can be combined (e.g., category = فقه AND governorate = المنيا)
- [ ] Clearing filters restores the full list
- [ ] Search results update as I type (or on submit)

---

### US-08 — Change My Browse Location

**As a** user browsing books,
**I want to** temporarily change the location used for proximity sorting,
**so that** I can find books near a place I'm planning to visit (not just where I am now).

**Acceptance Criteria:**

- [ ] A "تغيير الموقع" button is visible on the browse page
- [ ] I can set any governorate + city without changing my profile location
- [ ] Proximity sorting updates immediately
- [ ] My profile location is not permanently changed by this action

---

## 3. Submitting Books

---

### US-09 — Submit a Book (Volunteer)

**As a** volunteer,
**I want to** add a book and its mosque to the platform,
**so that** others can discover it.

**Acceptance Criteria:**

- [ ] I can access the "تسجيل كتاب" page
- [ ] The form has fields: title\*, author, category, edition, publisher, description, image
- [ ] I can search for an existing mosque on the platform
- [ ] If the mosque isn't found, I can fill in mosque details inline: governorate*, city*, name, image
- [ ] After submitting, the entry is immediately `approved` and visible in browse
- [ ] I see a success confirmation with the book title and mosque name
- [ ] I can edit or delete my own submissions later

---

### US-10 — Request to Add a Book (Public User)

**As a** registered user (non-volunteer),
**I want to** submit a book for review,
**so that** I can contribute even if I'm not a trusted volunteer.

**Acceptance Criteria:**

- [ ] The submit form is identical to the volunteer form
- [ ] After submitting, I see a message: "طلبك قيد المراجعة" (Your request is under review)
- [ ] The submission is stored with status `pending`
- [ ] The book does NOT appear in public browse until approved
- [ ] I can view my pending submissions somewhere in my profile

---

### US-11 — Find an Existing Mosque While Submitting

**As a** user submitting a book,
**I want to** search for a mosque that is already registered on the platform,
**so that** I don't create duplicate mosque entries.

**Acceptance Criteria:**

- [ ] A search field on the submit form lets me search mosques by name, city, or governorate
- [ ] Matching mosques appear in a dropdown as I type
- [ ] Selecting a mosque from the dropdown fills the mosque section automatically
- [ ] If no match is found, an option to "إضافة مسجد جديد" (Add new mosque) expands the form
- [ ] I cannot submit without selecting or creating a mosque

---

### US-12 — Prevent Duplicate Submissions / Handle Multiple Editions

**As a** volunteer or user,
**I want to** be informed when a book already exists in a mosque — and have the system handle editions correctly —
**so that** the catalog stays clean without losing edition information.

**Acceptance Criteria:**

- [ ] When I select a book title and a mosque, the system checks for an existing approved or pending entry for the same title in that mosque
- [ ] **Same title + same edition:** A warning is shown — "هذا الكتاب بهذه الطبعة مسجل بالفعل في هذا المسجد" — and submission is blocked
- [ ] **Same title + different edition:** No new mosque_books entry is created. Instead, the existing entry is flagged as `has_multiple_editions = true`, and the user sees: "تمت إضافة طبعة جديدة إلى نفس السجل الموجود"
- [ ] If no matching title is found in that mosque, submission proceeds normally
- [ ] The duplicate/edition check happens client-side before the form is submitted

---

## 4. Moderation (Admin)

---

### US-13 — View Pending Submissions

**As an** admin,
**I want to** see all pending book submissions,
**so that** I can review and approve or reject them.

**Acceptance Criteria:**

- [ ] The "طلبات التسجيل" page is only accessible to admins
- [ ] It shows a list of all `pending` submissions with: book title, author, mosque, submitter name, date
- [ ] I can filter by: status, governorate, date range
- [ ] Each submission has Approve and Reject buttons

---

### US-14 — Approve a Submission

**As an** admin,
**I want to** approve a pending book submission,
**so that** it becomes visible to all users.

**Acceptance Criteria:**

- [ ] Clicking Approve changes the status to `approved`
- [ ] The book immediately appears in the public browse
- [ ] The submission shows who approved it and when
- [ ] The submitter's contribution is credited

---

### US-15 — Reject a Submission

**As an** admin,
**I want to** reject a pending book submission with a reason,
**so that** the submitter understands why it was not approved.

**Acceptance Criteria:**

- [ ] Clicking Reject opens a dialog with a text field for rejection reason
- [ ] The rejection reason is optional but recommended
- [ ] Status changes to `rejected`
- [ ] The book does NOT appear in public browse
- [ ] The submitter can see the rejection and reason in their submission history

---

### US-16 — Edit a Submission Before Approving

**As an** admin,
**I want to** edit a pending submission's details before approving it,
**so that** I can correct typos or incomplete information without rejecting valid contributions.

**Acceptance Criteria:**

- [ ] An "Edit & Approve" option opens an editable version of the submission form
- [ ] I can modify any field: title, author, category, mosque info, etc.
- [ ] After saving, the entry is auto-approved and made public
- [ ] The edit is logged (who changed it and when)

---

### US-17 — Promote a User to Volunteer

**As an** admin,
**I want to** promote a registered user to volunteer,
**so that** their future submissions are auto-approved.

**Acceptance Criteria:**

- [ ] An admin panel page lists all registered users
- [ ] I can search by name or email
- [ ] I can change a user's role to `volunteer` or `admin`
- [ ] The change takes effect immediately
- [ ] The user's existing pending submissions are NOT retroactively approved

---

## 5. Profile & Settings

---

### US-18 — View My Submission History

**As a** registered user,
**I want to** see all the books I have submitted,
**so that** I can track my contributions and see their status.

**Acceptance Criteria:**

- [ ] My profile or a "مساهماتي" section shows all my submissions
- [ ] Each submission shows: book title, mosque, date, and current status (pending / approved / rejected)
- [ ] Rejected submissions show the rejection reason
- [ ] I can click a submission to view or edit it (volunteers only)

---

## 6. About & Feedback

---

### US-19 — Learn About the Platform

**As a** new visitor,
**I want to** understand what this platform is and how it works,
**so that** I can decide whether to use it or volunteer.

**Acceptance Criteria:**

- [ ] The About page clearly explains the mission in 2–3 sentences
- [ ] It explains what users can do vs. what volunteers do
- [ ] It explains how to become a volunteer
- [ ] It is accessible from the main navigation

---

### US-20 — Submit Feedback

**As a** user,
**I want to** send feedback or a suggestion to the team,
**so that** I can help improve the platform.

**Acceptance Criteria:**

- [ ] A feedback form is present on the About page
- [ ] The form accepts: name (optional), message (required), rating (1–5 stars, optional)
- [ ] After submitting, I see a confirmation: "شكراً على ملاحظتك"
- [ ] Guest users can also submit feedback (no login required)

---

### US-21 — Live Pending Submissions Badge (Admin)

**As an** admin,
**I want to** see a live counter badge on the navigation bar showing how many submissions are pending,
**so that** I know immediately when new submissions arrive without having to open the requests page.

**Acceptance Criteria:**

- [ ] A numeric badge appears next to "طلبات التسجيل" in the navbar, visible only to admins
- [ ] The badge shows the exact count of `pending` submissions
- [ ] The count updates in real time via Supabase Realtime — no page refresh needed
- [ ] When a submission is approved or rejected, the counter decrements immediately
- [ ] When a new submission arrives, the counter increments immediately
- [ ] If there are zero pending submissions, the badge is hidden (not shown as "0")
