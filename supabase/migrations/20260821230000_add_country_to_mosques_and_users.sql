-- ============================================================
-- Add country support to mosques and users tables.
-- Backfill existing rows as Egypt (مصر).
-- ============================================================

ALTER TABLE public.mosques
  ADD COLUMN IF NOT EXISTS country VARCHAR NOT NULL DEFAULT 'مصر';

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS country VARCHAR NOT NULL DEFAULT 'مصر';

-- Backfill any rows that somehow have NULL (shouldn't happen with DEFAULT)
UPDATE public.mosques SET country = 'مصر' WHERE country IS NULL OR country = '';
UPDATE public.users    SET country = 'مصر' WHERE country IS NULL OR country = '';

-- Index for country-based filtering
CREATE INDEX IF NOT EXISTS idx_mosques_country ON public.mosques (country);
CREATE INDEX IF NOT EXISTS idx_users_country   ON public.users (country);
