# Architecture — على رفوف المساجد

## 1. Tech Stack

| Layer               | Technology                  | Why                                                                                                   |
| ------------------- | --------------------------- | ----------------------------------------------------------------------------------------------------- |
| **Language**        | TypeScript                  | Type safety; team's chosen language                                                                   |
| **Frontend**        | HTML + CSS + TypeScript     | As decided by the team                                                                                |
| **Framework**       | Next.js 14 (App Router)     | TypeScript-native; pairs seamlessly with Vercel; built-in routing; SSR for better SEO and performance |
| **Styling**         | CSS Modules or Tailwind CSS | TBD by team — both support RTL                                                                        |
| **Database**        | PostgreSQL via Supabase     | Relational data (books ↔ mosques ↔ users); better fit than MongoDB for this schema                    |
| **Auth**            | Supabase Auth               | Built-in email + OAuth (Google, Facebook); removes need to build auth from scratch                    |
| **Storage**         | Supabase Storage            | For book and mosque images                                                                            |
| **Hosting**         | Vercel                      | Free tier; native Next.js support; auto-deploys from GitHub                                           |
| **Version Control** | GitHub                      | Collaboration; branch-based workflow                                                                  |
| **Design**          | Figma                       | UI/UX mockups                                                                                         |

### Why Supabase over MongoDB?

The data in this project is **relational by nature**:

- A book can exist in **many** mosques
- A mosque can hold **many** books
- Submissions link books, mosques, AND users

A document database (MongoDB) would require duplicating data or using nested arrays, which makes queries for "all mosques that have book X" or "all books near location Y" significantly more complex. Supabase (PostgreSQL) handles these with simple JOINs and is free at the scale of this project.

---

## 2. Folder Structure

```
على-رفوف-المساجد/
│
├── app/                          # Next.js App Router pages
│   ├── layout.tsx                # Root layout (RTL, Arabic font, nav)
│   ├── page.tsx                  # Home page (V2)
│   ├── login/
│   │   └── page.tsx              # Login & registration
│   ├── onboarding/
│   │   └── page.tsx              # First-time OAuth location setup
│   ├── browse/
│   │   ├── page.tsx              # Browse books & mosques
│   │   ├── book/
│   │   │   └── [id]/page.tsx     # Book detail
│   │   └── mosque/
│   │       └── [id]/page.tsx     # Mosque detail
│   ├── submit/
│   │   ├── page.tsx              # Submit a book (auth-protected)
│   │   └── edit/
│   │       └── [id]/page.tsx     # Edit own submission (volunteer/admin)
│   ├── requests/
│   │   └── page.tsx              # Admin moderation (admin-only)
│   ├── profile/
│   │   └── page.tsx              # User profile & history
│   └── about/
│       └── page.tsx              # About page
│
├── components/                   # Reusable UI components
│   ├── ui/                       # Generic elements (Button, Input, Card...)
│   ├── BookCard.tsx
│   ├── MosqueCard.tsx
│   ├── BrowseFilters.tsx
│   ├── LocationPicker.tsx        # Shared — used in browse, profile, and onboarding
│   ├── SubmitBookForm.tsx        # Shared — used in /submit and /submit/edit/[id]
│   ├── MosqueSearchSelect.tsx
│   ├── SubmissionsList.tsx       # Admin requests list
│   └── Navbar.tsx
│
├── lib/                          # Utilities and integrations
│   ├── supabase/
│   │   ├── client.ts             # Browser Supabase client
│   │   ├── server.ts             # Server-side Supabase client
│   │   └── middleware.ts         # Auth session refresh
│   ├── queries/                  # Typed database query functions
│   │   ├── books.ts
│   │   ├── mosques.ts
│   │   ├── submissions.ts
│   │   └── users.ts
│   └── utils.ts                  # Helper functions
│
├── types/                        # TypeScript type definitions
│   ├── database.ts               # Auto-generated from Supabase schema
│   └── app.ts                    # App-specific types
│
├── middleware.ts                 # Next.js middleware (auth guards + onboarding redirect)
├── schema.sql                    # Database schema (source of truth)
├── .env.local                    # Local environment variables (gitignored)
├── .env.example                  # Template for environment variables
├── next.config.ts
├── tailwind.config.ts            # If using Tailwind
├── tsconfig.json
└── README.md
```

---

## 3. Authentication Strategy

### Flow

```
User visits /submit
    ↓
middleware.ts checks session (Supabase cookie)
    ↓
No session → redirect to /login
Session exists → check role from users table
    ↓
role = 'visitor' or 'volunteer' → allow
role not 'admin' → block /requests → redirect to /browse

───────────────────────────────────────────────

User completes OAuth sign-in (Google or Facebook)
    ↓
middleware.ts checks: users.governorate IS NULL?
    ↓
YES → redirect to /onboarding (location gate)
NO  → proceed to /browse (or originally intended page)
```

### OAuth Setup (Supabase)

1. Enable Google and Facebook providers in Supabase Auth settings
2. Add OAuth credentials (from Google Cloud Console / Meta Developer)
3. On first OAuth sign-in, a database trigger creates a `users` row with fullname from the OAuth provider profile
4. middleware.ts detects missing location → redirects to `/onboarding`
5. Email-registered users always have location set during registration → skip onboarding

### Session Persistence

Supabase Auth uses JWTs with refresh tokens stored in cookies. Sessions persist across browser restarts. No manual session handling needed.

---

## 4. Edition & Schema Design Decision

**Decision (2026):** `edition` and `publisher` were moved from the `books` table to the `mosque_books` table.

**Rationale:** The `books` table represents the canonical bibliographic identity of a work — title, author, category. These do not change between physical copies. Edition and publisher describe a _specific physical copy held at a specific location_. The `mosque_books` row is precisely that: one copy, in one place. Storing edition there allows:

- Multiple editions of the same book to coexist in the same mosque as separate, fully-queryable rows
- No data loss when a new edition is submitted (the old approach silently discarded the new edition's metadata)
- Simpler duplicate detection: block if `(book_id, mosque_id, edition)` already exists (using `NULLS NOT DISTINCT` for unspecified editions)

**Unique constraint:**

```sql
CONSTRAINT unique_book_mosque_edition UNIQUE NULLS NOT DISTINCT (book_id, mosque_id, edition)
```

This ensures:

- Two rows with the same book + mosque + `NULL` edition → blocked (true duplicate)
- Two rows with the same book + mosque + different edition strings → both allowed (different editions)

---

## 5. Admin RLS Strategy

**Decision (2026):** Admin database access uses **SECURITY DEFINER PostgreSQL functions**, not the Supabase service role key client-side.

**Rationale:** The service role key bypasses all RLS and must never be exposed to client-side code. Rather than creating permissive RLS policies that check roles on every query, two server-callable functions handle admin reads:

- `admin_get_all_submissions()` — returns all rows from `admin_submissions_view`
- `admin_get_pending_count()` — returns the count of pending entries (used for the realtime badge)

Both functions contain an internal role check (`auth.uid()` must belong to a user with `role = 'admin'`). They are called from Next.js **server components** only, using the standard anon-key Supabase client — the JWT carries the user's identity, and the function enforces the admin check at the database level.

```typescript
// lib/queries/submissions.ts

// Called from a server component — never from client-side code
export async function getAllSubmissions() {
  const supabase = createServerClient();
  const { data, error } = await supabase.rpc("admin_get_all_submissions");
  if (error) throw error;
  return data;
}

export async function getPendingCount() {
  const supabase = createServerClient();
  const { data, error } = await supabase.rpc("admin_get_pending_count");
  if (error) throw error;
  return data as number;
}
```

---

## 6. Edit Submission Route

**Decision (2026):** `/submit/edit/[id]` is a dedicated route that reuses the `SubmitBookForm` component in edit mode.

**Why a dedicated route (not a modal):**

- Shareable / linkable URL (the admin's "Edit & Approve" flow links directly to it)
- Middleware can enforce ownership and role checks on the route itself
- Back/forward browser navigation works correctly
- Avoids complex modal state management

**Edit mode behavior:**

- The route fetches the `mosque_books` entry by `id`, pre-filling all form fields
- For volunteers accessing their own submission: saving keeps status as `'approved'`
- For admins accessing via `?context=admin`: saving sets status to `'approved'` and records `reviewed_by` + `reviewed_at`
- RLS policy enforces that only the original submitter (if volunteer) or an admin can update the row

```typescript
// app/submit/edit/[id]/page.tsx

import { SubmitBookForm } from '@/components/SubmitBookForm';
import { getSubmissionById } from '@/lib/queries/submissions';

export default async function EditSubmissionPage({ params }: { params: { id: string } }) {
  const submission = await getSubmissionById(params.id); // throws if not authorized
  const isAdminContext = /* check searchParams.context === 'admin' */;

  return (
    <SubmitBookForm
      mode="edit"
      initialData={submission}
      adminContext={isAdminContext}
    />
  );
}
```

---

## 7. Database Access Pattern

All database operations go through typed query functions in `lib/queries/`. Components and pages never call Supabase directly — they call these functions.

```typescript
// lib/queries/books.ts

export async function getApprovedBooks(filters: BookFilters) {
  const supabase = createServerClient();
  return supabase
    .from("public_books_view")
    .select("*")
    .eq("mosque_governorate", filters.governorate ?? undefined)
    .order("created_at", { ascending: false });
}

export async function submitBook(
  data: BookSubmission,
  userId: string,
  isVolunteer: boolean,
) {
  const supabase = createServerClient();
  const status = isVolunteer ? "approved" : "pending";
  // 1. Upsert into books (find by title+author or create new)
  // 2. Insert into mosque_books with edition, publisher, status
}
```

---

## 8. Onboarding Middleware Logic

```typescript
// middleware.ts

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const supabase = createMiddlewareClient(request);
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Protected routes — require authentication
  if (["/submit", "/profile"].some((p) => pathname.startsWith(p))) {
    if (!session) return NextResponse.redirect(new URL("/login", request.url));
  }

  // Onboarding gate — OAuth users without location
  if (session && pathname !== "/onboarding" && pathname !== "/login") {
    const { data: user } = await supabase
      .from("users")
      .select("governorate, city")
      .eq("user_id", session.user.id)
      .single();

    if (user && (!user.governorate || !user.city)) {
      return NextResponse.redirect(new URL("/onboarding", request.url));
    }
  }

  // Already authenticated — skip login
  if (session && pathname === "/login") {
    return NextResponse.redirect(new URL("/browse", request.url));
  }

  // Admin-only routes
  if (pathname.startsWith("/requests")) {
    if (!session) return NextResponse.redirect(new URL("/login", request.url));
    const { data: user } = await supabase
      .from("users")
      .select("role")
      .eq("user_id", session.user.id)
      .single();
    if (user?.role !== "admin")
      return NextResponse.redirect(new URL("/browse", request.url));
  }

  return NextResponse.next();
}
```

---

## 9. Image Handling

- Images are uploaded to **Supabase Storage** (not stored in the DB)
- The DB stores only the URL
- Bucket structure:
  - `book-images/` — book cover photos
  - `mosque-images/` — mosque photos
  - `profile-images/` — user profile pictures
- Images are public (no auth required to view)
- Max size: 5MB per image (enforced client-side)
- Accepted formats: JPEG, PNG, WebP

---

## 10. Proximity / Location Sorting

**V1 (Simple):** Sort by governorate + city match. If user is in المنيا, show المنيا books first, then others.

**V2 (GPS-based):** Use `mosque_lat` and `mosque_lng` columns (already in schema) with PostGIS or a Haversine formula in a Supabase SQL function to return results ordered by distance.

```sql
-- Future: Haversine distance sort (V2)
SELECT *, (
  6371 * acos(
    cos(radians($user_lat)) * cos(radians(mosque_lat)) *
    cos(radians(mosque_lng) - radians($user_lng)) +
    sin(radians($user_lat)) * sin(radians(mosque_lat))
  )
) AS distance_km
FROM public_books_view
ORDER BY distance_km ASC;
```

---

## 11. RTL / Arabic Layout

- Set `dir="rtl"` and `lang="ar"` on the `<html>` element in `layout.tsx`
- Use an Arabic-friendly font: **Cairo** or **Noto Sans Arabic** (Google Fonts)
- Avoid using absolute positioning for left/right; use CSS logical properties:
  - `margin-inline-start` instead of `margin-left`
  - `padding-inline-end` instead of `padding-right`
- Test all layouts in RTL before finalizing
- Unnamed mosque fallback display: `"مسجد — [المدينة]"` — standardize this string across all components

---

## 12. Environment Variables

```bash
# .env.example

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key   # server-only; used only if RPC functions are insufficient

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 13. Deployment

| Environment | URL              | Trigger            |
| ----------- | ---------------- | ------------------ |
| Local       | `localhost:3000` | `npm run dev`      |
| Preview     | `*.vercel.app`   | Push to any branch |
| Production  | Custom domain    | Merge to `main`    |

### Branching Strategy

```
main          ← production (protected, requires PR)
  └── dev     ← staging / integration
        └── feature/browse-page
        └── feature/auth
        └── feature/onboarding
        └── feature/submit-form
        └── feature/edit-submission
        └── fix/mosque-search-bug
```

- All work happens in `feature/*` branches
- Merge into `dev` for testing
- Merge `dev` into `main` for releases
- Vercel auto-deploys preview URLs for every branch

---

## 14. Real-Time Features (Supabase Realtime)

The admin navbar badge (pending submissions counter) must update live without page refresh.

### Implementation

```typescript
// components/Navbar.tsx (admin only)

import { useEffect, useState } from "react";
import { createBrowserClient } from "@/lib/supabase/client";

export function usePendingCount() {
  const [count, setCount] = useState<number>(0);
  const supabase = createBrowserClient();

  useEffect(() => {
    // Initial fetch via SECURITY DEFINER RPC (respects RLS + admin check)
    supabase
      .rpc("admin_get_pending_count")
      .then(({ data }) => setCount(data ?? 0));

    // Live subscription — re-fetches count via RPC on any mosque_books change
    const channel = supabase
      .channel("pending_count")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "mosque_books" },
        () => {
          supabase
            .rpc("admin_get_pending_count")
            .then(({ data }) => setCount(data ?? 0));
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return count;
}
```

### Notes

- Realtime must be enabled for the `mosque_books` table in the Supabase dashboard
- The RPC function `admin_get_pending_count()` handles the admin role check internally — no RLS change needed
- The badge renders `null` (hidden) when count is 0 — never shows "0"

---

## 15. Performance Considerations

| Concern          | Approach                                                                           |
| ---------------- | ---------------------------------------------------------------------------------- |
| Large book lists | Paginate (20 per page) or use infinite scroll                                      |
| Images           | Use `next/image` for automatic optimization and lazy loading                       |
| Database         | Index on `mosque_governorate`, `mosque_city`, `status` (already in schema)         |
| First load       | Use Server-Side Rendering (SSR) for browse page — faster initial paint, better SEO |
| Arabic fonts     | Subset fonts to Arabic characters only to reduce bundle size                       |
