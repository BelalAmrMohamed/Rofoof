-- ============================================================
-- على رفوف المساجد — Database Schema
-- Engine: PostgreSQL (via Supabase)
-- Last updated: 2026
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
  email         VARCHAR UNIQUE,                        -- nullable for guest-style users
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
-- A book record represents a bibliographic title.
-- The same title can exist in multiple mosques — that
-- relationship is tracked in mosque_books.
-- ============================================================

CREATE TABLE books (
  book_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title         VARCHAR NOT NULL,
  author        VARCHAR,
  edition       VARCHAR,                               -- e.g. "الطبعة الثالثة" — V1 addition
  publisher     VARCHAR,                               -- publishing house — V1 addition
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
  mosque_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mosque_name       VARCHAR,                           -- optional
  mosque_governorate VARCHAR NOT NULL,
  mosque_city       VARCHAR NOT NULL,
  mosque_lat        FLOAT,                             -- for map & proximity sorting
  mosque_lng        FLOAT,                             -- for map & proximity sorting
  mosque_image      VARCHAR,                           -- URL
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ
);

CREATE TRIGGER mosques_updated_at
  BEFORE UPDATE ON mosques
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Index for location-based filtering
CREATE INDEX idx_mosques_location ON mosques (mosque_governorate, mosque_city);


-- ============================================================
-- MOSQUE_BOOKS  (Junction / Core Table)
-- Resolves the many-to-many between books and mosques.
-- Also tracks WHO submitted it, and its approval status.
--
-- How to read a row:
--   "Book [book_id] exists in mosque [mosque_id].
--    It was submitted by [submitted_by] and is currently [status]."
--
-- Only rows with status = 'approved' are shown in public browse.
--
-- Edition-aware duplicate logic (application-level):
--   When a submission arrives for title T in mosque M:
--   1. Query mosque_books JOIN books WHERE title = T AND mosque_id = M
--   2. If match found with SAME edition   → block as true duplicate
--   3. If match found with DIFFERENT edition → set has_multiple_editions = TRUE
--      on the EXISTING row; do NOT insert a new mosque_books row
--   4. If no match found                 → proceed with normal insert
-- ============================================================

CREATE TABLE mosque_books (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id              UUID NOT NULL REFERENCES books(book_id) ON DELETE CASCADE,
  mosque_id            UUID NOT NULL REFERENCES mosques(mosque_id) ON DELETE CASCADE,
  submitted_by         UUID REFERENCES users(user_id) ON DELETE SET NULL,
  status               submission_status NOT NULL DEFAULT 'pending',
  rejection_note       TEXT,                                 -- admin note when rejecting
  reviewed_by          UUID REFERENCES users(user_id),        -- which admin approved/rejected
  reviewed_at          TIMESTAMPTZ,
  has_multiple_editions BOOLEAN NOT NULL DEFAULT FALSE,      -- TRUE when same title exists in this mosque with a different edition
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Prevent duplicate: same book record in same mosque submitted twice
  CONSTRAINT unique_book_mosque UNIQUE (book_id, mosque_id)
);

-- Index for filtering by status (e.g., show all pending)
CREATE INDEX idx_mosque_books_status     ON mosque_books (status);
CREATE INDEX idx_mosque_books_submitted  ON mosque_books (submitted_by);
CREATE INDEX idx_mosque_books_mosque     ON mosque_books (mosque_id);
CREATE INDEX idx_mosque_books_book       ON mosque_books (book_id);


-- ============================================================
-- ROW-LEVEL SECURITY (Supabase RLS)
-- Enable RLS on all tables and define access policies.
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

-- Admins can read all rows (including pending/rejected)
-- Note: implement admin checks via a Supabase function or service role


-- ============================================================
-- VIEWS
-- ============================================================

-- Public browse view: only approved entries, with joined data
CREATE VIEW public_books_view AS
SELECT
  mb.id             AS entry_id,
  b.book_id,
  b.title,
  b.author,
  b.edition,
  b.publisher,
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
  mb.has_multiple_editions,
  mb.created_at     AS cataloged_at
FROM mosque_books mb
JOIN books   b ON b.book_id   = mb.book_id
JOIN mosques m ON m.mosque_id = mb.mosque_id
WHERE mb.status = 'approved';


-- Admin view: all submissions with submitter and reviewer info
CREATE VIEW admin_submissions_view AS
SELECT
  mb.id             AS entry_id,
  mb.status,
  mb.rejection_note,
  mb.created_at     AS submitted_at,
  mb.reviewed_at,
  b.title,
  b.author,
  b.category,
  m.mosque_name,
  m.mosque_governorate,
  m.mosque_city,
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