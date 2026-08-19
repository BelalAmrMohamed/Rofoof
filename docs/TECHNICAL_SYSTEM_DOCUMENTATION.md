# على رفوف المساجد (On Mosque Shelves) — Technical System Documentation

**Stack:** React + TypeScript + Tailwind CSS + Supabase (PostgreSQL + PostGIS)
**Status:** Post-migration consolidated reference — supersedes prior Next.js/CSS-Modules/governorate-only planning docs where noted.

---

## 0. Changelog — This Revision

This document consolidates seven prior planning docs (`README.md`, `roadmap.md`, `sitemap.md`, `user-flows.md`, `architecture.md`, `requirements.md`, `user-stories.md`) and the current `schema.sql` into one reference, and resolves conflicts introduced by the migration to React/TS/Tailwind/Supabase with PostGIS.

**New requirements are treated as authoritative.** Where they conflict with earlier decisions, the earlier decision is marked **SUPERSEDED** below and kept only as historical context.

| # | Old decision | New decision | Status |
|---|---|---|---|
| 1 | Guest location stored in a session cookie only (governorate/city); no map | Guest location may still be a coarse fallback, but onboarding/browse now support live geolocation and an interactive map pin — this is a genuine capability add, not just cookie semantics | **SUPERSEDED** |
| 2 | `mosque_lat`/`mosque_lng` optional, "future V2 map feature," V1 uses governorate/city string matching only | PostGIS-backed `geography(Point, 4326)` columns on both `users` and `mosques`, `mosque_lat`/`mosque_lng` are `NOT NULL`, real `ST_DWithin`/`ST_Distance`/KNN proximity queries required now | **SUPERSEDED** |
| 3 | Onboarding location step is required-feeling (governorate + city dropdowns, gates access) | Onboarding is explicitly optional and skippable; supports auto-detect geolocation or manual map pin drop | **SUPERSEDED** |
| 4 | 10-page sitemap (Browse, Submit, About, Login, Onboarding, Profile, Requests, Book Detail, Mosque Detail, Edit Submission) | 7-page scope: Browse, Submit, About, Log In, Onboarding, Profile, Requests | **SUPERSEDED (scope)** — see §3 for how Book Detail / Mosque Detail / Edit Submission are treated |
| 5 | Framework: Next.js 14 App Router | Not specified in new requirements; **framework choice preserved from architecture.md pending explicit reconfirmation** — flagged as an open question in §9 | **CARRIED FORWARD, FLAGGED** |
| 6 | Styling: CSS Modules or Tailwind (TBD) | Tailwind CSS specified | **RESOLVED — Tailwind** |
| 7 | Requests page reached only via Profile, not top-level nav | New requirements list Requests as one of the 7 core pages without specifying nav placement | **CARRIED FORWARD** — Profile-only access preserved as the default (see §3, §9) |

Everything not listed above (auth rules, RLS strategy, edition/publisher-on-`mosque_books` schema decision, moderation workflow, feedback table, design tokens) is unchanged and carried forward as-is.

---

## 1. Project Overview

**Platform Name:** على رفوف المساجد — *On the Shelves of Mosques* (confirmed, final)
**Type:** Community-driven book cataloging web platform
**Geography:** Egypt (V1); extensible to other Arab countries in V2 — location schema is not Egypt-hardcoded
**Language:** Arabic (RTL), primary; English optional in V2

**Mission:** Most mosques hold a rich library of books that almost no one reads, sitting under dust on the shelves. This platform makes those books searchable and discoverable by cataloging what exists, where, and in which edition.

| Goal | Description |
|---|---|
| Discovery | Make books in mosque libraries searchable and findable by anyone |
| Accessibility | Single platform, works on mobile and desktop |
| Community | Enable volunteers to catalog books in their local mosques |
| Trust | Ensure submitted data is accurate through a moderation workflow |

---

## 2. Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| Language | TypeScript | Type safety across app and query layer |
| Frontend | React | Migrated from HTML/CSS/TS |
| Styling | **Tailwind CSS** | RTL-compatible; replaces the old CSS-Modules-or-Tailwind open question |
| Database | PostgreSQL via Supabase | Relational data (books ↔ mosques ↔ users) |
| Geospatial | **PostGIS** (`CREATE EXTENSION postgis`) | Powers real proximity queries — see §5 |
| Auth | Supabase Auth | Email + Google + Facebook OAuth |
| Storage | Supabase Storage | Book, mosque, and profile images |
| Hosting | Vercel | Auto-deploys from GitHub |
| Version Control | GitHub | Branch-based workflow |
| Design | Figma | UI/UX mockups |

**Framework note:** prior architecture docs specified Next.js 14 (App Router) for SSR/routing benefits alongside this stack. The new requirements don't name a framework explicitly. This document assumes Next.js is still in use (React is a dependency of Next.js, and the routing/middleware patterns below rely on it) — **flagged for explicit reconfirmation in §9**.

### Why PostgreSQL + PostGIS over a document database

The data is relational by nature — a book exists in many mosques, a mosque holds many books, submissions link books/mosques/users, and now every user and mosque carries a precise geographic point. PostGIS gives native `geography` types, GIST indexes, and distance/containment operators (`ST_DWithin`, `ST_Distance`, `<->` KNN) directly in SQL, which a document store would require significant custom logic to replicate.

---

## 3. System Scope — 7 Pages

| Page | URL | Access | Notes |
|---|---|---|---|
| Browse | `/browse` | Public | Home page (map/list view, proximity sorting) — root `/` redirects here |
| Submit | `/submit` | Auth required | Mosque/book submission with interactive map picker |
| About | `/about` | Public | Mission, how-it-works, feedback form |
| Log In | `/login` | Unauthenticated only | Email + Google + Facebook |
| Onboarding | `/onboarding` | Post-auth, optional | Skippable location setup — auto-detect or map pin |
| Profile | `/profile` | Auth required | User details, saved mosques, submission history |
| Requests | `/requests` | Admin only | Submission status tracker / moderation queue |

### Reconciling scope with prior detail pages

The prior 10-page sitemap additionally specified `/browse/book/:id`, `/browse/mosque/:id`, and `/submit/edit/[id]` as standalone routes. The new 7-page scope doesn't list them separately. Rather than silently dropping functionality that the requirements and user stories both depend on (book/mosque detail views, edit-own-submission), this document treats them as **sub-routes of their parent page** rather than top-level pages:

- `/browse/book/:id` and `/browse/mosque/:id` are detail views reached from within **Browse**.
- `/submit/edit/[id]` is a mode of the **Submit** page (`SubmitBookForm` in edit mode), reached from Profile or Requests.

This keeps the 7-page count accurate at the navigation/IA level while preserving the underlying functional requirements (BROWSE-12, BROWSE-13, SUBMIT-08/10, MOD-04) documented in §7.

### Navigation (carried forward from architecture.md, unchanged unless noted)

| Breakpoint | Pattern |
|---|---|
| Desktop | Fixed side menu (dark green, RTL) |
| Tablet | Collapsible side menu (icon-only collapsed) |
| Mobile | Bottom tab bar — Browse, Submit, Profile |

Requests remains reachable from the Profile page rather than as a top-level nav link, consistent with MOD-09/NAV-05 — the new requirements list Requests as a page in scope but don't specify nav placement, so this default is preserved. **Flagged in §9** in case the migration intends Requests to become a nav-level item.

| Role | Browse | Submit | About | Profile | Login | Logout | Requests |
|---|---|---|---|---|---|---|---|
| Guest | ✅ | ❌ | ✅ | ❌ | ✅ | ❌ | ❌ |
| Visitor | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ |
| Volunteer | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ |
| Admin | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | In Profile only |

---

## 4. Authentication & Authorization Rules

| Rule | Detail |
|---|---|
| Browsing | Open to unauthenticated guests — no login prompts, no gate, no "skip" screen. Guests land directly on `/browse`. |
| Submitting | Mosque and book submissions strictly require authentication (`auth.uid() IS NOT NULL`), enforced at both the RLS layer and the route middleware. |
| Roles | `visitor` (default on signup), `volunteer` (trusted, auto-approved submissions), `admin` (moderation + role management) |
| Volunteer submissions | Auto-approved, immediately public |
| Visitor submissions | `pending`, held for admin review |
| Session persistence | Supabase Auth JWT + refresh token in cookies; returning users are not re-prompted to log in |
| Location is never inferred from identity | Always user-set (auto-detect button, map pin, or manual entry) — never derived from email/OAuth profile |

### Auth flow

```
User visits /submit
    ↓
No session → redirect to /login
Session exists → check role from users table
    ↓
visitor / volunteer → allowed to submit
non-admin → /requests blocked, redirected to /browse
```

```
User completes OAuth (Google or Facebook)
    ↓
users row created via DB trigger (fullname from provider profile)
    ↓
Onboarding is OPTIONAL — no hard gate.
User may be shown the onboarding step once; skipping is a first-class action.
    ↓
Skip  → proceed to /browse (governorate/city or lat/lng remain NULL until later set)
Complete → auto-detect geolocation OR drop a manual map pin → proceed to /browse
```

This differs materially from the prior "OAuth users are redirected to `/onboarding` and re-redirected until they complete it" middleware logic (`architecture.md` §5, §10; `user-flows.md` Flow 9). That loop enforced a **mandatory** location gate. Under the new requirements, onboarding must not trap the user — skip has to be a real, permanent choice, not a deferred prompt.

---

## 5. Maps & Geolocation

### 5.1 Onboarding Flow — Optional and Skippable

- Shown once after first sign-in (OAuth or email) for users with no `lat`/`lng` set.
- Two ways to set a precise location:
  - **Auto-detect** — browser/device Geolocation API, user must grant permission
  - **Manual pin** — drop a pin on an interactive map (no permission needed)
- A visible, unambiguous **Skip** action is always available. Skipping does not block access to Browse, Submit, or any other page.
- `users.location_source` records how the point was obtained: `'auto_detect'`, `'manual_pin'`, `'skipped'`, or `NULL` (pre-migration users, never prompted).
- `users.governorate` / `users.city` remain as a separate, always-present coarse fallback — independent of whether a precise pin was ever set. They are user-defined, never auto-derived from the pin.
- `users.lat` / `users.lng` are nullable — a skipped or not-yet-prompted user has no precise point, and the app must degrade gracefully to governorate/city-based display in that case.

### 5.2 Mosque Submission Flow — Map Picker Required

- The "Submit a Mosque" form requires pinning an exact location on an interactive map. This is a hard requirement for this flow specifically (unlike onboarding) — a mosque record without coordinates isn't useful for proximity search or map display.
- `mosques.mosque_lat` / `mosques.mosque_lng` are `NOT NULL` in the schema, with range constraints (`BETWEEN -90 AND 90` / `BETWEEN -180 AND 180`) guarding against a broken map widget submitting invalid values.
- `mosque_governorate` / `mosque_city` remain required text fields alongside the pin, for filter dropdowns and text-fallback display (`"مسجد — [المدينة]"`).

### 5.3 Data Model

Both `users` and `mosques` carry a generated PostGIS column derived from their lat/lng:

```sql
location_geog GEOGRAPHY(Point, 4326)
  GENERATED ALWAYS AS (
    ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography
  ) STORED
```

(On `users` this is wrapped in a `CASE` since lat/lng may be `NULL`; on `mosques` it's unconditional since both columns are `NOT NULL`.) Each table has a GIST index on this column (`idx_users_geo`, `idx_mosques_geo`) to support fast proximity queries.

### 5.4 Proximity Queries

Two `SECURITY DEFINER`-free SQL functions wrap the PostGIS logic so the frontend never hand-writes `ST_*` SQL:

- `nearby_books(origin_lat, origin_lng, radius_km, max_results)` — approved books sorted by mosque distance
- `nearby_mosques(origin_lat, origin_lng, radius_km, max_results)` — mosques sorted by distance

Both accept a raw lat/lng pair as input, so the caller can pass `users.lat/lng`, a guest's session-cookie pin, or a live GPS reading from a future mobile client — none of it needs to be persisted server-side for the function to work.

### 5.5 Guest Location — Unchanged at the DB Level

Guests never get a `users` row. If a guest drops a pin during an onboarding-equivalent browse-time prompt, that pin lives in a session cookie only and is never persisted server-side. This part of the original design is **not** superseded — it still holds under the new requirements, since nothing in the new spec asks for guest location to be durable.

---

## 6. Database Schema Summary

Full source of truth: `schema.sql`. Key structures relevant to this migration:

| Table | Purpose | Location fields |
|---|---|---|
| `users` | Profile, role, location — paired with `auth.users` (Supabase Auth) | `governorate`, `city` (coarse, always editable) + `lat`, `lng`, `location_geog`, `location_source`, `location_updated_at` (precise, optional) |
| `mosques` | Physical mosque locations | `mosque_governorate`, `mosque_city` (required text) + `mosque_lat`, `mosque_lng` (required, map-pinned), `location_geog` (generated) |
| `books` | Canonical bibliographic identity (title, author, category) — edition/publisher intentionally excluded, see below | — |
| `mosque_books` | Junction table: which edition of which book is held by which mosque, submission status, review metadata | — |
| `feedback` | About-page feedback form submissions; `user_id` nullable for guests | — |

**Edition/publisher placement:** `edition` and `publisher` live on `mosque_books`, not `books`, because they describe a specific physical copy at a specific mosque, not the bibliographic work itself. This allows multiple editions of the same title to coexist at the same mosque as separate, independently queryable rows. Duplicate detection uses `UNIQUE NULLS NOT DISTINCT (book_id, mosque_id, edition)` — two rows with the same book, same mosque, and both `NULL` edition are treated as a true duplicate.

**RLS strategy:** admin reads go through `SECURITY DEFINER` functions (`admin_get_all_submissions()`, `admin_get_pending_count()`) rather than permissive policies that check role on every row, avoiding exposure of the Supabase service-role key to client code. Both functions enforce the admin check internally against `auth.uid()`.

**Auth rules confirmed at the RLS layer** (unchanged by this migration):
- Browsing (`SELECT`) on `books`, `mosques`, and approved `mosque_books` rows requires no auth.
- Submitting (`INSERT`) a book or a mosque requires `auth.uid() IS NOT NULL`.

---

## 7. Functional Requirements (carried forward, annotated where the migration changes behavior)

### 7.1 Authentication & Users

| ID | Requirement | Status |
|---|---|---|
| AUTH-04 | Guests browse freely, zero login prompts | Unchanged |
| AUTH-05 | Guests cannot access `/submit` | Unchanged |
| AUTH-06 | Location is user-defined at registration (email) or onboarding (OAuth) | **Amended** — onboarding is now optional; email users still set governorate/city at registration, but precise lat/lng is available to all users at any time, not gated to OAuth-only onboarding |
| AUTH-08 | Users can update location from browse or profile; both write the same profile record | Unchanged, now also true of the map pin |
| AUTH-13 | First-time OAuth users are redirected to onboarding if no location set | **Amended** — onboarding is shown but is skippable; no forced redirect loop |

### 7.2 Browsing

| ID | Requirement | Status |
|---|---|---|
| BROWSE-01 | Anyone can browse books and mosques | Unchanged |
| BROWSE-02/03 | Proximity sorting | **Upgraded** — from governorate/city string match to real `ST_DWithin`/`ST_Distance` queries via `nearby_books`/`nearby_mosques` |
| BROWSE-08 | User can change location from browse page | Unchanged; now supports map pin in addition to dropdowns |
| BROWSE-12/13 | Book detail page shows mosque entries grouped by edition, each mosque's multiple editions as separate rows | Unchanged — implemented as a Browse sub-route per §3 |

### 7.3 Book Submission

| ID | Requirement | Status |
|---|---|---|
| SUBMIT-01 | Only authenticated users access `/submit`; guests redirected to `/login` | Unchanged |
| SUBMIT-02/03 | Volunteer auto-approve / visitor pending | Unchanged |
| SUBMIT-05/07 | Mosque governorate/city required at minimum | **Amended** — mosque submission now additionally requires a map-pinned `mosque_lat`/`mosque_lng`; this is no longer optional/V2 |
| SUBMIT-08/10 | Volunteer edit-own-submission via edit route | Unchanged — implemented as a Submit sub-route/mode per §3 |
| SUBMIT-09 | Edition-aware duplicate detection | Unchanged |

### 7.4 Moderation (Admin)

| ID | Requirement | Status |
|---|---|---|
| MOD-01–08 | View/approve/reject/edit pending submissions, promote users | Unchanged |
| MOD-09 | Requests reached from Profile, not top-level nav | Carried forward as default — see §3 flag |
| MOD-10 | Live pending count via Realtime | Unchanged |

### 7.5 About Page

| ID | Requirement | Status |
|---|---|---|
| ABOUT-01–04 | Mission, how-it-works, feedback form, contact | Unchanged |
| ABOUT-06 | Feedback stored in `feedback` table, guests can submit | Unchanged |

### 7.6 Non-Functional Requirements (unchanged)

RTL Arabic layout, mobile-first responsiveness, sub-3s browse load on 4G, tap targets ≥44px, Supabase-managed auth security, only-approved-visible-publicly data integrity, location fields not Egypt-hardcoded (schema scalability), user locations never shared publicly.

---

## 8. Key User Flows (updated for optional onboarding + map)

### Flow — First-Time User Completes (or Skips) Onboarding

```
1. User signs in (email or OAuth)
2. If lat/lng not set, onboarding step is shown (not forced)
3. User chooses:
   a. Auto-detect → browser permission prompt → point saved, location_source = 'auto_detect'
   b. Manual pin → drop pin on map → point saved, location_source = 'manual_pin'
   c. Skip → location_source = 'skipped', lat/lng remain NULL
4. User proceeds to /browse regardless of choice
5. Browse degrades gracefully: precise-point users get distance-sorted results;
   skipped users fall back to governorate/city matching or unsorted results
```

### Flow — Submit a Mosque (New Map Requirement)

```
1. Authenticated user opens "Submit a Mosque" (inline from /submit)
2. Governorate + city selected (required, as before)
3. Interactive map picker is REQUIRED — user must drop a pin
4. Form cannot be submitted without a valid lat/lng (client-side check
   mirrors the mosque_lat_range / mosque_lng_range DB constraints)
5. Mosque record created with mosque_lat/mosque_lng NOT NULL
```

### Flow — Admin Reviews a Pending Submission (unchanged)

Approve / Edit & Approve / Reject, as documented in `user-flows.md` Flow 4 — no changes from this migration.

---

## 9. Open Questions / Flags Requiring Team Confirmation

1. **Framework:** is Next.js still the intended framework post-migration, or has the team moved to a different React setup (Vite, Remix, plain CR)? This document assumes Next.js is retained for routing/middleware/SSR, consistent with `architecture.md`, but the new requirements don't name it.
2. **Requests page nav placement:** the new 7-page scope lists Requests as a first-class page but doesn't say whether it's now a top-level nav item (unlike the old Profile-only access model). Default preserved as Profile-only; confirm before implementation.
3. **Guest map behavior:** does a guest dropping a pin during browse now get an "auto-detect" option too, or is that OAuth/email-user-only? The new requirements say onboarding supports both for "users" — guest behavior at browse-time isn't explicitly addressed and is assumed unchanged (session cookie only, per §5.5).
4. **Skip persistence:** if a user skips onboarding, is that a one-time dismissal (never shown again) or re-offered periodically (e.g., next login)? Not specified — recommend one-time dismissal with a persistent "set location" affordance in Profile/Browse instead of re-prompting.
5. **Detail/edit sub-routes:** confirm the §3 treatment of Book Detail, Mosque Detail, and Edit Submission as sub-routes rather than top-level pages correctly reflects intent, given the new doc lists exactly 7 pages.
