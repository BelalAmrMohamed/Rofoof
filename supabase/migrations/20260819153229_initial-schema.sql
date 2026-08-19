-- ============================================================
-- على رفوف المساجد — Database Schema
-- Engine: PostgreSQL (via Supabase) + PostGIS
-- Last updated: 2026 — Geolocation & Auth Migration
-- ============================================================
--
-- CHANGE LOG (this revision — React/TS/Tailwind + Expo migration):
--   • PostGIS extension enabled. Both `users` and `mosques` gain a
--     generated `geography(Point, 4326)` column derived from lat/lng,
--     replacing governorate/city string-matching with real spatial
--     queries (ST_DWithin / ST_Distance / KNN <-> operator). This is
--     required for both the web map and the future Expo mobile map.
--   • mosques.mosque_lat / mosque_lng are now NOT NULL. The "Submit a
--     Mosque" form requires pinning an exact location on a map — this
--     is no longer a V2/optional feature, so the columns can no longer
--     be nullable.
--   • users.lat / users.lng added (nullable). Set via the optional,
--     skippable Onboarding map (auto-detect geolocation or manual pin
--     drop). Distinct from governorate/city, which remain the coarse,
--     always-present fallback for filtering and display.
--   • users.location_source added: tracks HOW a user's lat/lng was
--     obtained ('auto_detect' | 'manual_pin' | 'skipped' | NULL for
--     users who registered before this migration). Lets the UI decide
--     whether to re-prompt or trust the stored point silently.
--   • users.location_updated_at added: separate from the row-level
--     updated_at trigger, so "location is stale, re-request?" logic
--     can be built later without conflating it with profile edits.
--   • idx_mosques_geo / idx_users_geo: GIST indexes on the new
--     geography columns for fast proximity queries.
--   • Guest location handling is UNCHANGED at the DB level: guests
--     never get a users row, so their pin (if dropped during
--     onboarding-equivalent browse flow) still lives in a session
--     cookie only, never persisted server-side.
--   • Auth rules confirmed unchanged and still correctly modeled:
--       - Browsing (books/mosques SELECT) requires no auth (public
--         RLS SELECT policies on books, mosques, and approved
--         mosque_books rows).
--       - Submitting a book OR a mosque requires auth (INSERT
--         policies gated on auth.uid() IS NOT NULL).
--
-- Everything else (previous 2026 decisions: edition/publisher on
-- mosque_books, NULLS NOT DISTINCT uniqueness, feedback table, admin
-- SECURITY DEFINER functions) is preserved as-is below.
-- ============================================================


-- ============================================================
-- EXTENSIONS
-- ============================================================

CREATE EXTENSION IF NOT EXISTS postgis;


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

-- How a user's stored lat/lng was obtained.
-- 'skipped' means onboarding was dismissed — governorate/city (if set)
-- remain the only location signal until the user sets a pin later.
CREATE TYPE location_source AS ENUM ('auto_detect', 'manual_pin', 'skipped');


-- ============================================================
-- USERS
-- Managed in conjunction with Supabase Auth.
-- auth.users (Supabase) holds credentials; this table holds
-- profile, role, and location information.
--
-- Location model:
--   governorate/city  → coarse, always-editable, used for filter
--                        dropdowns and as a display fallback.
--   lat/lng           → precise point, set via the optional/skippable
--                        Onboarding map (auto-detect or manual pin).
--                        NULL until the user sets it or skips.
--   location_geog     → generated PostGIS point derived from lat/lng,
--                        used for actual proximity/distance queries.
-- ============================================================

CREATE TABLE users (
  user_id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email              VARCHAR UNIQUE,                        -- nullable for OAuth-only users before email is confirmed
  fullname           VARCHAR NOT NULL,
  governorate        VARCHAR,                               -- user-defined; never auto-detected
  city               VARCHAR,                               -- user-defined
  lat                FLOAT,                                 -- precise location; NULL if never set/skipped
  lng                FLOAT,                                 -- precise location; NULL if never set/skipped
  location_geog       GEOGRAPHY(Point, 4326)
                       GENERATED ALWAYS AS (
                         CASE
                           WHEN lat IS NOT NULL AND lng IS NOT NULL
                           THEN ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography
                           ELSE NULL
                         END
                       ) STORED,
  location_source    location_source,                       -- how lat/lng was obtained; NULL = never prompted
  location_updated_at TIMESTAMPTZ,                           -- when lat/lng last changed
  profile_image      VARCHAR,                               -- URL to image, not raw binary
  role               user_role NOT NULL DEFAULT 'visitor',
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ
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

-- Keep location_updated_at in sync whenever lat/lng actually change
CREATE OR REPLACE FUNCTION set_location_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  IF (NEW.lat IS DISTINCT FROM OLD.lat) OR (NEW.lng IS DISTINCT FROM OLD.lng) THEN
    NEW.location_updated_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_location_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_location_updated_at();

-- Spatial index for "mosques/books near this user" queries
CREATE INDEX idx_users_geo ON users USING GIST (location_geog);


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
--
-- Location model:
--   mosque_lat/mosque_lng → REQUIRED. The "Submit a Mosque" form now
--                            mandates pinning an exact point on a map,
--                            so these are no longer nullable/future-V2.
--   location_geog          → generated PostGIS point for proximity
--                            queries and map rendering.
--   mosque_governorate/city → still required as coarse fields, kept
--                            for filter dropdowns and text fallback
--                            display (e.g. "مسجد — [المدينة]").
-- ============================================================

CREATE TABLE mosques (
  mosque_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mosque_name        VARCHAR,                          -- optional; fallback display: "مسجد — [المدينة]"
  mosque_governorate VARCHAR NOT NULL,
  mosque_city        VARCHAR NOT NULL,
  mosque_lat         FLOAT NOT NULL,                    -- required: set via map pin on Submit a Mosque
  mosque_lng         FLOAT NOT NULL,                    -- required: set via map pin on Submit a Mosque
  location_geog        GEOGRAPHY(Point, 4326)
                        GENERATED ALWAYS AS (
                          ST_SetSRID(ST_MakePoint(mosque_lng, mosque_lat), 4326)::geography
                        ) STORED,
  mosque_image       VARCHAR,                          -- URL
  submitted_by       UUID REFERENCES users(user_id) ON DELETE SET NULL,  -- who added this mosque (auth required)
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ,

  -- Guard against wildly invalid coordinates from a broken map widget
  CONSTRAINT mosque_lat_range CHECK (mosque_lat BETWEEN -90 AND 90),
  CONSTRAINT mosque_lng_range CHECK (mosque_lng BETWEEN -180 AND 180)
);

CREATE TRIGGER mosques_updated_at
  BEFORE UPDATE ON mosques
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Coarse filter index (governorate/city dropdowns)
CREATE INDEX idx_mosques_location ON mosques (mosque_governorate, mosque_city);

-- Spatial index for real proximity queries (ST_DWithin, KNN <->, ST_Distance)
CREATE INDEX idx_mosques_geo ON mosques USING GIST (location_geog);


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
  reviewed_by     UUID REFERENCES users(user_id) ON DELETE SET NULL,  -- which admin approved/rejected
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
-- CONFIRMED AUTH RULES:
--   • Browsing (SELECT) on books, mosques, and approved mosque_books
--     rows requires NO authentication — guests can read freely.
--   • Submitting (INSERT) a book, a mosque, or a mosque_books entry
--     requires auth.uid() IS NOT NULL — login is mandatory to submit.
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
  ON users FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id AND role = (SELECT role FROM users WHERE user_id = auth.uid()));

-- BOOKS: Anyone (including guests) can read. Auth required to insert.
CREATE POLICY "Books are viewable by everyone"
  ON books FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert books"
  ON books FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- MOSQUES: Anyone (including guests) can read. Auth required to insert
-- (the "Submit a Mosque" map-pin form is gated behind login).
CREATE POLICY "Mosques are viewable by everyone"
  ON mosques FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert mosques"
  ON mosques FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- MOSQUE_BOOKS: Public can read approved only. Auth required to insert.
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
  )
  WITH CHECK (
    auth.uid() = submitted_by
    AND status = 'pending'
    AND reviewed_by IS NULL
    AND reviewed_at IS NULL
  );

-- Admins can update any submission (approve/reject/edit), enforced via the
-- SECURITY DEFINER pattern already used for reads — see admin_review_submission below.


-- ============================================================
-- ADMIN SECURITY DEFINER FUNCTION
-- Allows server-side admin queries to bypass RLS cleanly.
-- The role check is enforced inside the function.
-- Usage in Next.js: call via supabase.rpc('admin_get_all_submissions')
-- from a server component — never from client-side code.
--
-- NOTE: moved below the VIEWS section (further down this file) so
-- admin_submissions_view exists before this function's RETURNS clause
-- references it — CREATE FUNCTION ... RETURNS SETOF <view> requires
-- the view to already exist. See admin_get_all_submissions definition
-- after CREATE VIEW admin_submissions_view.
-- ============================================================

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
-- PROXIMITY HELPER FUNCTIONS
-- Wrap the PostGIS distance logic so the app layer (React web +
-- Expo mobile) never has to hand-write ST_* SQL.
-- ============================================================

-- Nearby approved books, sorted by mosque distance from a given point.
-- Pass the user's lat/lng (from users.lat/lng, a guest's session-cookie
-- pin, or live device GPS from the Expo app) — none of it needs to be
-- persisted for this function to work.
CREATE OR REPLACE FUNCTION nearby_books(
  origin_lat  FLOAT,
  origin_lng  FLOAT,
  radius_km   FLOAT DEFAULT 50,
  max_results INTEGER DEFAULT 50
)
RETURNS TABLE (
  entry_id     UUID,
  book_id      UUID,
  title        VARCHAR,
  mosque_id    UUID,
  mosque_name  VARCHAR,
  distance_km  FLOAT
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    mb.id,
    b.book_id,
    b.title,
    m.mosque_id,
    m.mosque_name,
    ST_Distance(
      m.location_geog,
      ST_SetSRID(ST_MakePoint(origin_lng, origin_lat), 4326)::geography
    ) / 1000.0 AS distance_km
  FROM mosque_books mb
  JOIN books   b ON b.book_id   = mb.book_id
  JOIN mosques m ON m.mosque_id = mb.mosque_id
  WHERE mb.status = 'approved'
    AND ST_DWithin(
      m.location_geog,
      ST_SetSRID(ST_MakePoint(origin_lng, origin_lat), 4326)::geography,
      radius_km * 1000
    )
  ORDER BY distance_km ASC
  LIMIT max_results;
$$;

-- Nearby mosques, sorted by distance from a given point.
CREATE OR REPLACE FUNCTION nearby_mosques(
  origin_lat  FLOAT,
  origin_lng  FLOAT,
  radius_km   FLOAT DEFAULT 50,
  max_results INTEGER DEFAULT 50
)
RETURNS TABLE (
  mosque_id    UUID,
  mosque_name  VARCHAR,
  distance_km  FLOAT
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    m.mosque_id,
    m.mosque_name,
    ST_Distance(
      m.location_geog,
      ST_SetSRID(ST_MakePoint(origin_lng, origin_lat), 4326)::geography
    ) / 1000.0 AS distance_km
  FROM mosques m
  WHERE ST_DWithin(
    m.location_geog,
    ST_SetSRID(ST_MakePoint(origin_lng, origin_lat), 4326)::geography,
    radius_km * 1000
  )
  ORDER BY distance_km ASC
  LIMIT max_results;
$$;


-- ============================================================
-- VIEWS
-- ============================================================

-- Public browse view: only approved entries, with joined data.
-- edition and publisher are sourced from mosque_books.
-- mosque_lat/mosque_lng are always present now (NOT NULL on mosques).
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


-- admin_submissions_view now exists, so this function can safely
-- RETURNS SETOF it (see note where this was originally declared,
-- up in the ADMIN SECURITY DEFINER FUNCTION section).
CREATE OR REPLACE FUNCTION admin_get_all_submissions()
RETURNS SETOF admin_submissions_view
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
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

-- Admin approve/reject action. Volunteers cannot reach this path (their
-- own UPDATE policy's WITH CHECK forbids changing status/reviewed_*),
-- so approval/rejection is only possible through this SECURITY DEFINER
-- function, which enforces the admin role check itself.
CREATE OR REPLACE FUNCTION admin_review_submission(
  p_entry_id        UUID,
  p_status          submission_status,
  p_rejection_note  TEXT DEFAULT NULL
)
RETURNS mosque_books
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_row mosque_books;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM users
    WHERE user_id = auth.uid()
      AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  IF p_status NOT IN ('approved', 'rejected') THEN
    RAISE EXCEPTION 'p_status must be approved or rejected';
  END IF;

  UPDATE mosque_books
  SET status = p_status,
      rejection_note = p_rejection_note,
      reviewed_by = auth.uid(),
      reviewed_at = NOW()
  WHERE id = p_entry_id
  RETURNING * INTO v_row;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No mosque_books row with id %', p_entry_id;
  END IF;

  RETURN v_row;
END;
$$;


-- ============================================================
-- FEEDBACK
-- Stores feedback submitted from the About page.
-- No authentication required — user_id is NULL for guest submissions.
-- email is optional: provided by guests who want a reply.
-- rating is optional: 1–5 integer scale.
-- ============================================================

CREATE TABLE feedback (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES users(user_id) ON DELETE SET NULL,  -- NULL for guests
  message     TEXT NOT NULL,
  email       VARCHAR,                                             -- optional; for guest reply
  rating      SMALLINT CHECK (rating BETWEEN 1 AND 5),            -- optional; 1–5 scale
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS: anyone can insert; only admins can read (via service role or future admin view)
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit feedback"
  ON feedback FOR INSERT WITH CHECK (true);

-- Admins read feedback via service role or a future SECURITY DEFINER function.
-- No public SELECT policy — feedback is not exposed to regular users.


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

-- location_source values:
--   auto_detect — user's browser/device geolocation API was used
--   manual_pin  — user manually dropped a pin on the onboarding map
--   skipped     — user dismissed the onboarding map; lat/lng remain NULL