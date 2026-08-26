# Rofoof — Issue Tracker (Implementation-Ready)

Cross-checked against the current source in `web/src/` and `supabase/migrations/`. Each
issue includes the affected files, the current behavior, the required behavior, and
acceptance criteria.

---

## 1. Feedback has no review path

**Files:** `web/src/features/about/AboutPage.tsx`, `supabase/migrations/` (new admin-read
policy needed), a new admin-only view (page or section)

**Current behavior:** `AboutPage.tsx`'s `submitFeedback` correctly inserts into the
`feedback` table (`id`, `user_id`, `message`, `email`, `rating`, `created_at`). The table's
RLS policy allows anyone to `INSERT`, but there is no `SELECT` policy for any role — the
initial schema comment explicitly notes *"Admins read feedback via service role or a
future SECURITY DEFINER function. No public SELECT policy."* That function/view was
never built, and no page in the app reads from `feedback` at all. Submitted feedback is
therefore captured correctly but is completely unreachable from the product — the only
way to see it today is a direct database query.

**Required behavior:**
- Add a `SELECT` RLS policy (or a `SECURITY DEFINER` RPC, matching the pattern already
  used for `admin_get_all_submissions()`) that lets only users with `role = 'admin'` read
  the `feedback` table.
- Add an admin-only view of submitted feedback — a new route/page (e.g. `/admin/feedback`)
  or a section of an existing admin area if one gets built alongside issue 2 below.
  Should show message, optional rating, optional email, submitter (if logged in), and
  timestamp, newest first.
- Gate access the same way the rest of the admin surface is gated (role check via
  `users.role`).

**Acceptance criteria:**
- A logged-in admin can see all submitted feedback, including guest submissions.
- Non-admin users (including guests and volunteers) cannot read the `feedback` table.
- Feedback submitted before this fix ships is still visible (no data migration needed —
  the rows already exist).

---

## 2. Admins cannot edit or delete existing mosques/books

**Files:** `supabase/migrations/` (new RLS policies), `web/src/features/browse/BrowsePage.tsx`
(`DetailMosque`, `DetailBook`), a new admin surface for management

**Current behavior:** There is no `UPDATE` or `DELETE` RLS policy on `mosques`, `books`, or
`mosque_books` for any role, including `admin` — the only existing `DELETE` policy in the
schema is the narrow one on `mosque_images` (a submitter deleting their own uploaded
photo). The `admin` role already exists (`users.role = 'admin'`, checked and displayed
today in `ProfilePage.tsx`) and already has elevated write access for new submissions
(auto-approved instead of pending — see `SubmitPage.tsx`'s `submissionStatus` logic), but
that's as far as admin privileges currently go. There is no edit or delete control
anywhere in the UI — not on `DetailMosque`, `DetailBook`, or any dedicated admin page.

**Required behavior:**
- Add `UPDATE` and `DELETE` RLS policies on `mosques`, `books`, and `mosque_books`
  scoped to `role = 'admin'` (mirroring the existing `user_role_for()` / admin-check
  pattern already used for submission review).
- Add edit and delete controls for admins, visible only when the logged-in user's role is
  `admin`. Minimum viable surface: edit/delete actions inside the existing `DetailMosque`
  and `DetailBook` dialogs (and their full-page equivalents, `MosquePage.tsx` /
  `BookPage.tsx`), gated behind the same role check used elsewhere.
- Deleting a mosque should cascade sensibly — `mosque_books` and `mosque_images` already
  have `ON DELETE CASCADE` to `mosque_id`, so this should fall out for free once the
  `mosques` `DELETE` policy exists; confirm this behavior before shipping.
- Editing should reuse the same field set exposed on the submit form where practical,
  rather than a separate parallel form.

**Acceptance criteria:**
- A user with `role = 'admin'` can edit a mosque's or book's fields and see the change
  reflected immediately in Browse.
- A user with `role = 'admin'` can delete a mosque or book; dependent rows
  (`mosque_books`, `mosque_images`) are removed or handled consistently, not left orphaned.
- Non-admin users (visitor, volunteer, guest) see no edit/delete controls and cannot
  perform these actions even via a direct API call (enforced by RLS, not just hidden UI).

---

## 3. Mosque page map doesn't zoom on scroll

**Files:** `web/src/components/MosqueMap.tsx`

**Current behavior:** `MosqueMap` (the read-only map shown on the full mosque page) sets
`scrollWheelZoom={false}` on its Leaflet `MapContainer`. This was a deliberate original
choice — likely to stop the map from hijacking page-scroll while a user scrolls past it —
but the practical effect is that scrolling over the map does nothing at all, which reads as
broken rather than intentional, especially since `MapPicker` (used on Submit/Profile) has
no such restriction and scrolls/zooms normally.

**Required behavior:**
- Enable scroll-wheel zoom on `MosqueMap`, consistent with `MapPicker`.
- If page-scroll hijacking while scrolling past the map is a real concern, use Leaflet's
  click/focus-to-activate pattern (e.g. `scrollWheelZoom: true` combined with requiring
  the map to be focused/clicked first) rather than disabling zoom entirely — but a plain
  `scrollWheelZoom={true}` is an acceptable first pass matching `MapPicker`'s behavior.

**Acceptance criteria:**
- Scrolling with the mouse wheel while hovering over the mosque page's map zooms in/out,
  the same way it already does on the submit-page location picker.

---

## 4. Header search only searches one type at a time, but doesn't say so

**Files:** `web/src/lib/search-context.ts`, `web/src/features/browse/BrowsePage.tsx`

**Current behavior:** The header search field's default placeholder (set in
`search-context.ts`) reads "ابحث عن كتاب أو مسجد..." ("Search for a book or a
mosque..."), implying a single search covers both. In reality, `BrowsePage` has a `view`
state (`'books' | 'mosques'`) that defaults to `'books'`, and `results` is computed as
`view === 'books' ? filteredBooks : filteredMosques` — strictly one or the other, never
both. Typing a mosque name into the header search on any page navigates to `/` (via the
`?q=` param), which lands on the default `'books'` view — so a mosque-name search
against a real mosque correctly filters `filteredMosques` in memory, but the visible list is
still `filteredBooks`, which shows nothing relevant (or nothing at all). The placeholder
text overpromises what the page actually does.

**Required behavior:**
- When arriving at the home page via a header search (i.e. with a `?q=` param), search
  across both books and mosques instead of only the currently-active `view`, so a query
  that matches a mosque name surfaces a result regardless of which view is selected.
- Simplest correct approach: when a `?q=` param is present on load, run the query against
  both `filteredBooks` and `filteredMosques`, and if the active view (`'books'`) has zero
  matches while the other view has matches, switch `view` to the one with results (or
  present both result sets together, whichever fits the existing UI better — a combined
  "top matches" section above the normal book/mosque grid is also acceptable).
- At minimum, do not silently show an empty list when a valid mosque (or book) match
  exists in the other view.

**Acceptance criteria:**
- Searching a mosque's name from the header (from any page) lands on a result that
  actually shows that mosque, without the user having to manually switch to the "مساجد"
  view first.
- Searching a book's title continues to work exactly as it does today.
- The header placeholder text's promise ("search for a book or a mosque") matches actual
  behavior.