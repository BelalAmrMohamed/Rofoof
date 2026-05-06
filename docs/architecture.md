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
│   ├── browse/
│   │   ├── page.tsx              # Browse books & mosques
│   │   ├── book/
│   │   │   └── [id]/page.tsx     # Book detail
│   │   └── mosque/
│   │       └── [id]/page.tsx     # Mosque detail
│   ├── submit/
│   │   └── page.tsx              # Submit a book (auth-protected)
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
│   ├── LocationPicker.tsx
│   ├── SubmitBookForm.tsx
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
├── middleware.ts                 # Next.js middleware (auth guards)
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
```

### OAuth Setup (Supabase)

1. Enable Google and Facebook providers in Supabase Auth settings
2. Add OAuth credentials (from Google Cloud Console / Meta Developer)
3. On first OAuth sign-in, trigger a database function to create a `users` row
4. Prompt user to set governorate + city if not yet defined

### Session Persistence

Supabase Auth uses JWTs with refresh tokens stored in cookies. Sessions persist across browser restarts. No manual session handling needed.

---

## 4. Database Access Pattern

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
  // ... insert into books, then mosque_books
}
```

---

## 5. Image Handling

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

## 6. Proximity / Location Sorting

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

## 7. RTL / Arabic Layout

- Set `dir="rtl"` and `lang="ar"` on the `<html>` element in `layout.tsx`
- Use an Arabic-friendly font: **Cairo** or **Noto Sans Arabic** (Google Fonts)
- Avoid using absolute positioning for left/right; use CSS logical properties:
  - `margin-inline-start` instead of `margin-left`
  - `padding-inline-end` instead of `padding-right`
- Test all layouts in RTL before finalizing

---

## 8. Environment Variables

```bash
# .env.example

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key   # server-only, never expose to client

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 9. Deployment

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
        └── feature/submit-form
        └── fix/mosque-search-bug
```

- All work happens in `feature/*` branches
- Merge into `dev` for testing
- Merge `dev` into `main` for releases
- Vercel auto-deploys preview URLs for every branch

---

## 11. Real-Time Features (Supabase Realtime)

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
    // Initial fetch
    supabase
      .from("mosque_books")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending")
      .then(({ count }) => setCount(count ?? 0));

    // Live subscription
    const channel = supabase
      .channel("pending_count")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "mosque_books" },
        () => {
          supabase
            .from("mosque_books")
            .select("id", { count: "exact", head: true })
            .eq("status", "pending")
            .then(({ count }) => setCount(count ?? 0));
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
- The RLS policy for admins must allow SELECT on all statuses (not just approved), so the count query works
- The badge renders `null` (hidden) when count is 0 — never shows "0"

---

## 12. Performance Considerations

| Concern          | Approach                                                                           |
| ---------------- | ---------------------------------------------------------------------------------- |
| Large book lists | Paginate (20 per page) or use infinite scroll                                      |
| Images           | Use `next/image` for automatic optimization and lazy loading                       |
| Database         | Index on `mosque_governorate`, `mosque_city`, `status` (already in schema)         |
| First load       | Use Server-Side Rendering (SSR) for browse page — faster initial paint, better SEO |
| Arabic fonts     | Subset fonts to Arabic characters only to reduce bundle size                       |
