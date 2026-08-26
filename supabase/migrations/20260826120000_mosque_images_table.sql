-- ============================================================
-- Multiple images per mosque.
--
-- Previously a mosque could have exactly one photo (mosques.mosque_image).
-- This adds a normalized mosque_images table so a mosque can have several
-- photos — e.g. multiple exterior angles plus a photo of the library/book
-- shelves inside — each independently addable, orderable, and removable.
--
-- Backward compatibility: mosques.mosque_image is left in place (not
-- dropped) and is treated as a legacy single-photo field. Existing values
-- are backfilled into mosque_images as the first image so old data keeps
-- displaying correctly. New submissions should insert into mosque_images
-- going forward; the frontend falls back to mosque_image only when a
-- mosque has no rows in mosque_images yet.
-- ============================================================

CREATE TABLE mosque_images (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mosque_id   UUID NOT NULL REFERENCES mosques(mosque_id) ON DELETE CASCADE,
  image_url   VARCHAR NOT NULL,
  -- Free-form label so the UI can distinguish e.g. exterior shots from the
  -- library/book-shelf photo. Nullable — most images won't need one.
  caption     VARCHAR,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  submitted_by UUID REFERENCES users(user_id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_mosque_images_mosque ON mosque_images (mosque_id, sort_order);

ALTER TABLE mosque_images ENABLE ROW LEVEL SECURITY;

-- Anyone can read mosque images (public browse, same as mosques itself).
CREATE POLICY "Mosque images are viewable by everyone"
  ON mosque_images FOR SELECT USING (true);

-- Auth required to add images, consistent with mosques/mosque_books INSERT
-- policies (submission requires login; guests cannot add data).
CREATE POLICY "Authenticated users can insert mosque images"
  ON mosque_images FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- A submitter can remove an image they added themselves.
CREATE POLICY "Submitters can delete their own mosque images"
  ON mosque_images FOR DELETE
  USING (auth.uid() = submitted_by);

-- Backfill: turn each existing mosques.mosque_image into the first
-- mosque_images row, so current photos keep showing up after this migration.
INSERT INTO mosque_images (mosque_id, image_url, sort_order, submitted_by)
SELECT mosque_id, mosque_image, 0, submitted_by
FROM mosques
WHERE mosque_image IS NOT NULL AND mosque_image <> '';
