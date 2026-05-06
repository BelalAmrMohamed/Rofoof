# User Flows — على رفوف المساجد

> This document maps the step-by-step journeys a user takes through the platform.
> For visual flow diagrams, see [`../diagrams/user-flows.html`](../diagrams/user-flows.html).

---

## Flow 1: Guest Browses Books

**Actor:** Guest (no account)
**Goal:** Find a book available near them

```
1. User visits the platform (any URL)
2. User lands directly on /browse (Books view, default) — no login prompt
3. User is prompted: "أدخل موقعك لعرض الكتب القريبة منك"
4. User selects governorate + city from dropdowns
5. Browse page updates — books sorted by proximity
6. User searches/filters (optional)
7. User clicks a book card
8. Book detail page shows which mosques hold this book
9. User visits mosque ✓
```

**Happy path:** Steps 1 → 9
**Failure states:**

- User skips location → books shown without proximity sorting (alphabetical or by date)

> **Decision (2026):** The platform no longer shows a login page as the entry point. All unauthenticated users arrive directly on `/browse`. Login is accessible from the navbar when the user chooses to sign in.

---

## Flow 2: New User Registers and Submits a Book

**Actor:** New visitor wanting to contribute
**Goal:** Register an account and submit a book for review

```
1. User clicks "تسجيل كتاب" (Submit a Book) from nav or browse page
2. System detects no session → redirects to /login
3. User clicks "إنشاء حساب بالبريد الإلكتروني"
4. User fills form: name, email, password
5. User selects governorate + city
6. Account created with role = 'visitor'
7. User is redirected back to /submit
8. User fills book form:
   a. Title (required)
   b. Author, category, edition, notes (optional)
   c. Book image (optional)
9. User searches for mosque
   a. IF found → selects from dropdown → mosque fields auto-fill
   b. IF not found → expands "Add new mosque" form:
      - Governorate (required)
      - City (required)
      - Name, image (optional)
10. User submits form
11. System saves entry with status = 'pending'
12. User sees: "شكراً! طلبك قيد المراجعة" (Thank you! Your request is under review)
13. Entry appears in admin /requests page
14. [See Flow 4 for admin review]
```

**Failure states:**

- **True duplicate (same title + same edition + same mosque):** Warning shown — "هذا الكتاب بهذه الطبعة مسجل بالفعل في هذا المسجد" — submission is blocked
- **Different edition (same title + different edition + same mosque):** No new entry is created; existing mosque_books record is flagged `has_multiple_editions = true`; user sees "تمت إضافة طبعة جديدة إلى نفس السجل"
- Missing required fields → inline validation errors
- Image too large → error message, image not uploaded

---

## Flow 3: Volunteer Submits a Book (Auto-approved)

**Actor:** Volunteer (already authenticated)
**Goal:** Quickly catalog a book found in a mosque

```
1. Volunteer clicks "تسجيل كتاب" from nav
2. System detects session + volunteer role → loads /submit directly
3. Volunteer fills book form (same as Flow 2, steps 8–9)
4. Volunteer submits
5. System saves entry with status = 'approved'
6. Entry immediately appears in public browse
7. Volunteer sees: "تم تسجيل الكتاب بنجاح ✓"
   (includes: book title, mosque name, link to view in browse)
```

**Difference from Flow 2:** No pending state — auto-approved.

---

## Flow 4: Admin Reviews a Pending Submission

**Actor:** Admin
**Goal:** Approve or reject a public user's book submission

```
1. Admin logs in → lands on /browse (default)
2. Admin sees notification or navigates to /requests
3. Admin views list of pending submissions
4. Admin clicks on a submission to expand details:
   - Book info (title, author, category, notes, image)
   - Mosque info (name, city, governorate)
   - Submitted by (name, date)
5. Admin reviews the information

   PATH A — Approve:
   5a. Admin clicks "موافقة" (Approve)
   5b. Status → 'approved'
   5c. Book appears in public browse immediately
   5d. Submission moves to "Approved" tab in /requests

   PATH B — Edit & Approve:
   5b. Admin clicks "تعديل وموافقة" (Edit & Approve)
   5c. Form opens pre-filled with submission data
   5d. Admin corrects typos / missing info
   5e. Admin clicks "حفظ وموافقة"
   5f. Status → 'approved', edited data saved

   PATH C — Reject:
   5b. Admin clicks "رفض" (Reject)
   5c. Dialog opens: "سبب الرفض (اختياري)"
   5d. Admin types reason (optional) and confirms
   5e. Status → 'rejected'
   5f. Submission moves to "Rejected" tab
```

---

## Flow 5: User Updates Their Location

**Actor:** Any authenticated user
**Goal:** Change their governorate/city for more relevant browse results

```
OPTION A — From Browse page:
1. User clicks "تغيير الموقع" button on /browse
2. Dropdown appears: select governorate → select city
3. User clicks "تحديث" (Update)
4. Browse results refresh based on new location
5. Location saved to user profile

OPTION B — From Profile page:
1. User navigates to /profile
2. User clicks "تعديل" (Edit) next to current location
3. Selects new governorate + city
4. Clicks "حفظ"
5. Location updated
```

---

## Flow 6: User Finds a Specific Book

**Actor:** Any visitor or user
**Goal:** Find a specific book they've heard of and locate it

```
1. User lands on /browse (Books view)
2. User types book title in search bar
3. Results filter in real-time (or on submit)
4. User sees matching book card(s) — possibly in multiple mosques
5. User clicks book card
6. Book detail page shows:
   - Book info (title, author, category, notes)
   - List of mosques that hold this book:
     - Mosque name (if any)
     - Governorate + City
     - Distance from user (if location is set)
7. User picks the closest mosque and goes to visit it ✓
```

**Failure state:**

- Book not found → "لم يُعثر على نتائج. هل تريد إضافة هذا الكتاب؟" → link to /submit

---

## Flow 7: Admin Promotes a User to Volunteer

**Actor:** Admin
**Goal:** Grant volunteer privileges to a trusted contributor

```
1. Admin navigates to /profile or a user management section in /requests
2. Admin searches for user by name or email
3. Admin views user profile (role: visitor, submissions: X)
4. Admin clicks "ترقية إلى متطوع" (Promote to Volunteer)
5. Confirmation dialog: "هل أنت متأكد؟"
6. Admin confirms
7. User's role updated to 'volunteer'
8. Future submissions by this user will be auto-approved
9. Existing pending submissions remain pending (not retroactively approved)
```

---

## Flow 8: Returning User Re-visits the Platform

**Actor:** Any registered user
**Goal:** Come back to browse or submit without logging in again

```
1. User visits the platform URL
2. Supabase detects existing session (cookie)
3. User is taken directly to /browse
4. Previous location settings are applied
5. No login prompt shown
```

**Session expiry case:**

- If session expired → user lands on /browse as a guest → if they attempt to submit, they are redirected to /login → sees their email pre-filled → re-authenticates with one click (OAuth) or password
