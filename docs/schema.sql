-- ============================================================
-- على رفوف المساجد — Database Schema
-- Engine: PostgreSQL (via Supabase)
-- Last updated: 2026
-- ============================================================
--
-- CHANGE LOG (2026 decisions):
--   • edition + publisher moved from books → mosque_books
--     Rationale: the same bibliographic title (same author, same book)
--     can be held by different mosques in different editions. Storing
--     edition on the books table conflated identity with physical copy.
--   • has_multiple_editions column removed. Superseded by storing each
--     edition as its own mosque_books row; multiple editions are now
--     discoverable with a simple COUNT query.
--   • UNIQUE constraint on mosque_books changed from (book_id, mosque_id)
--     to (book_id, mosque_id, edition) NULLS NOT DISTINCT, so two rows
--     with the same book + mosque + NULL edition still collide (preventing
--     true duplicates when no edition is specified).
--   • Admin RLS: a SECURITY DEFINER function is used so server-side
--     admin queries bypass RLS without exposing the service role key
--     to client-side code. See admin_get_all_submissions() below.
-- ============================================================


-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE user_role AS ENUM ('visitor', 'volunteer', 'admin');

CREATE TYPE submission_status AS ENUM ('pending', 'approved', 'rejected');

CREATE TYPE book_category AS ENUM (
  'فقه',
  'حديث',
  'تفسير',
  'سيرة',
  'عقيدة',
  'تزكية',
  'أدب',
  'تاريخ',
  'أخرى'
);


-- ============================================================
-- USERS
-- Managed in conjunction with Supabase Auth.
-- auth.users (Supabase) holds credentials; this table holds
-- profile and role information.
-- ============================================================

CREATE TABLE users (
  user_id       UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email         VARCHAR UNIQUE,                        -- nullable for OAuth-only users before email is confirmed
  fullname      VARCHAR NOT NULL,
  governorate   VARCHAR,                               -- user-defined; never auto-detected
  city          VARCHAR,                               -- user-defined
  profile_image VARCHAR,                               -- URL to image, not raw binary
  role          user_role NOT NULL DEFAULT 'visitor',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ
);

-- Auto-update updated_at on any row change
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ============================================================
-- BOOKS
-- A book record represents a bibliographic title — the canonical
-- identity of a work regardless of which edition or where it is held.
--
-- NOTE: edition and publisher are NOT stored here. They describe
-- a specific physical copy and belong on mosque_books, where the
-- book-mosque relationship (and thus the physical copy) lives.
-- ============================================================

CREATE TABLE books (
  book_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title         VARCHAR NOT NULL,
  author        VARCHAR,
  category      book_category,                         -- nullable; uses predefined enum
  extra_info    TEXT,                                  -- free-form description / notes
  book_image    VARCHAR,                               -- URL
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ
);

CREATE TRIGGER books_updated_at
  BEFORE UPDATE ON books
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Index for search by title and author
CREATE INDEX idx_books_title  ON books USING GIN (to_tsvector('arabic', title));
CREATE INDEX idx_books_author ON books USING GIN (to_tsvector('arabic', coalesce(author, '')));


-- ============================================================
-- MOSQUES
-- A mosque record represents a physical location.
-- mosque_name is optional — many Egyptian mosques are unnamed.
-- lat/lng stored for future map/proximity features.
-- ============================================================

CREATE TABLE mosques (
  mosque_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mosque_name        VARCHAR,                          -- optional; fallback display: "مسجد — [المدينة]"
  mosque_governorate VARCHAR NOT NULL,
  mosque_city        VARCHAR NOT NULL,
  mosque_lat         FLOAT,                            -- for map & proximity sorting (V2)
  mosque_lng         FLOAT,                            -- for map & proximity sorting (V2)
  mosque_image       VARCHAR,                          -- URL
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ
);

CREATE TRIGGER mosques_updated_at
  BEFORE UPDATE ON mosques
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Index for location-based filtering
CREATE INDEX idx_mosques_location ON mosques (mosque_governorate, mosque_city);


-- ============================================================
-- MOSQUE_BOOKS  (Junction / Core Table)
-- Resolves the many-to-many between books and mosques.
-- Also tracks the specific edition held, WHO submitted it,
-- and the approval status of the submission.
--
-- How to read a row:
--   "The [edition] edition of book [book_id] is held by mosque
--    [mosque_id]. It was submitted by [submitted_by] and is
--    currently [status]."
--
-- Only rows with status = 'approved' are shown in public browse.
--
-- Edition-aware duplicate logic (application-level):
--   When a submission arrives for title T in mosque M with edition E:
--   1. Look up the book_id for title T in the books table.
--   2. Query mosque_books WHERE book_id = T AND mosque_id = M AND edition = E
--      (using NULLS NOT DISTINCT semantics: NULL edition matches NULL edition)
--   3. If a match is found → block as a true duplicate:
--      "هذا الكتاب بهذه الطبعة مسجل بالفعل في هذا المسجد"
--   4. If no match → insert a new mosque_books row with the given edition.
--      (Multiple editions of the same book in the same mosque are
--      stored as separate rows, each fully queryable.)
--
-- To detect "does this mosque hold multiple editions of the same book":
--   SELECT COUNT(*) FROM mosque_books
--   WHERE book_id = $id AND mosque_id = $mid AND status = 'approved'
--   → COUNT > 1 means multiple editions.
-- ============================================================

CREATE TABLE mosque_books (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id         UUID NOT NULL REFERENCES books(book_id) ON DELETE CASCADE,
  mosque_id       UUID NOT NULL REFERENCES mosques(mosque_id) ON DELETE CASCADE,
  edition         VARCHAR,                                -- e.g. "الطبعة الثالثة"; NULL = unspecified
  publisher       VARCHAR,                                -- publishing house; specific to this copy
  submitted_by    UUID REFERENCES users(user_id) ON DELETE SET NULL,
  status          submission_status NOT NULL DEFAULT 'pending',
  rejection_note  TEXT,                                   -- admin note when rejecting; visible to submitter in /profile
  reviewed_by     UUID REFERENCES users(user_id),         -- which admin approved/rejected
  reviewed_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ,

  -- Prevent true duplicate: same book + same mosque + same edition (NULL treated as a value)
  CONSTRAINT unique_book_mosque_edition UNIQUE NULLS NOT DISTINCT (book_id, mosque_id, edition)
);

CREATE TRIGGER mosque_books_updated_at
  BEFORE UPDATE ON mosque_books
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Indexes
CREATE INDEX idx_mosque_books_status     ON mosque_books (status);
CREATE INDEX idx_mosque_books_submitted  ON mosque_books (submitted_by);
CREATE INDEX idx_mosque_books_mosque     ON mosque_books (mosque_id);
CREATE INDEX idx_mosque_books_book       ON mosque_books (book_id);


-- ============================================================
-- ROW-LEVEL SECURITY (Supabase RLS)
-- Enable RLS on all tables and define access policies.
--
-- ADMIN READ POLICY:
--   Rather than writing a complex RLS policy that requires checking
--   the users table on every query (expensive), admin read access is
--   granted via a SECURITY DEFINER function (see below). This function
--   runs with elevated privileges, bypasses RLS, and is callable only
--   by authenticated users — with the role check enforced inside the
--   function itself. Server components call this function; they never
--   use the service role key client-side.
-- ============================================================

ALTER TABLE users         ENABLE ROW LEVEL SECURITY;
ALTER TABLE books         ENABLE ROW LEVEL SECURITY;
ALTER TABLE mosques       ENABLE ROW LEVEL SECURITY;
ALTER TABLE mosque_books  ENABLE ROW LEVEL SECURITY;

-- USERS: Anyone can read. Users can update only their own row.
CREATE POLICY "Users are viewable by everyone"
  ON users FOR SELECT USING (true);

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE USING (auth.uid() = user_id);

-- BOOKS: Anyone can read. Authenticated users can insert.
-- Volunteers and admins can update their own book records.
CREATE POLICY "Books are viewable by everyone"
  ON books FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert books"
  ON books FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- MOSQUES: Anyone can read. Authenticated users can insert.
CREATE POLICY "Mosques are viewable by everyone"
  ON mosques FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert mosques"
  ON mosques FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- MOSQUE_BOOKS: Public can read approved only.
CREATE POLICY "Approved mosque_books are viewable by everyone"
  ON mosque_books FOR SELECT USING (status = 'approved');

CREATE POLICY "Authenticated users can insert mosque_books"
  ON mosque_books FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Volunteers can update their own submissions (for edit-own-submission flow)
CREATE POLICY "Volunteers can update own submissions"
  ON mosque_books FOR UPDATE
  USING (
    auth.uid() = submitted_by
    AND EXISTS (
      SELECT 1 FROM users
      WHERE user_id = auth.uid()
        AND role IN ('volunteer', 'admin')
    )
  );


-- ============================================================
-- ADMIN SECURITY DEFINER FUNCTION
-- Allows server-side admin queries to bypass RLS cleanly.
-- The role check is enforced inside the function.
-- Usage in Next.js: call via supabase.rpc('admin_get_all_submissions')
-- from a server component — never from client-side code.
-- ============================================================

CREATE OR REPLACE FUNCTION admin_get_all_submissions()
RETURNS SETOF admin_submissions_view
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Enforce that the caller is an admin at the database level
  IF NOT EXISTS (
    SELECT 1 FROM users
    WHERE user_id = auth.uid()
      AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  RETURN QUERY SELECT * FROM admin_submissions_view;
END;
$$;

-- Likewise for the pending count used by the realtime badge
CREATE OR REPLACE FUNCTION admin_get_pending_count()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM users
    WHERE user_id = auth.uid()
      AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  SELECT COUNT(*) INTO v_count
  FROM mosque_books
  WHERE status = 'pending';

  RETURN v_count;
END;
$$;


-- ============================================================
-- VIEWS
-- ============================================================

-- Public browse view: only approved entries, with joined data.
-- edition and publisher are now sourced from mosque_books.
CREATE VIEW public_books_view AS
SELECT
  mb.id             AS entry_id,
  b.book_id,
  b.title,
  b.author,
  mb.edition,
  mb.publisher,
  b.category,
  b.extra_info,
  b.book_image,
  m.mosque_id,
  m.mosque_name,
  m.mosque_governorate,
  m.mosque_city,
  m.mosque_lat,
  m.mosque_lng,
  m.mosque_image,
  mb.created_at     AS cataloged_at,
  mb.updated_at     AS last_edited_at
FROM mosque_books mb
JOIN books   b ON b.book_id   = mb.book_id
JOIN mosques m ON m.mosque_id = mb.mosque_id
WHERE mb.status = 'approved';


-- Admin view: all submissions with submitter and reviewer info.
-- edition and publisher are sourced from mosque_books.
CREATE VIEW admin_submissions_view AS
SELECT
  mb.id             AS entry_id,
  mb.status,
  mb.rejection_note,
  mb.created_at     AS submitted_at,
  mb.reviewed_at,
  mb.updated_at     AS last_edited_at,
  b.title,
  b.author,
  b.category,
  mb.edition,
  mb.publisher,
  m.mosque_name,
  m.mosque_governorate,
  m.mosque_city,
  u_sub.user_id     AS submitted_by_id,
  u_sub.fullname    AS submitted_by_name,
  u_sub.email       AS submitted_by_email,
  u_rev.fullname    AS reviewed_by_name
FROM mosque_books mb
JOIN books   b     ON b.book_id   = mb.book_id
JOIN mosques m     ON m.mosque_id = mb.mosque_id
LEFT JOIN users u_sub ON u_sub.user_id = mb.submitted_by
LEFT JOIN users u_rev ON u_rev.user_id = mb.reviewed_by;


-- ============================================================
-- SEED DATA — Categories reference (for documentation)
-- The category enum above is the source of truth.
-- ============================================================

-- book_category values:
--   فقه       — Islamic jurisprudence
--   حديث      — Hadith (Prophetic traditions)
--   تفسير     — Quran exegesis
--   سيرة      — Prophetic biography
--   عقيدة     — Islamic creed / theology
--   تزكية     — Spiritual purification
--   أدب       — Literature / language
--   تاريخ     — History
--   أخرى      — Other