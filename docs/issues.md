# Rofoof — Issue Tracker (Implementation-Ready)

Cross-checked against the current
source in `web/src/`. Each issue includes the affected files, the current behavior, the
required behavior, and acceptance criteria.

---

## 2. Submit Page

### 2.2 Location picker map is a bare click-to-pick map with no context of existing mosques
**Files:** `web/src/features/onboarding/components/MapPicker.tsx`

**Current behavior:** `MapPicker` renders a Leaflet map with OpenStreetMap tiles and a single
click-to-place marker for the point being edited. It does not render markers for any other
mosques already submitted to the platform, and provides no search-by-address input — only
click-to-pick plus reverse geocoding after the click.

**Required behavior:**
- Add an address/place search box above or over the map (e.g. using a geocoding provider such as
  Nominatim, already partially used via `reverseGeocode` in `web/src/lib/geocode.ts`) so users can
  search for a location instead of only clicking blindly.
- Optionally render existing mosque locations as light/secondary markers on the picker map for
  spatial context (distinguish clearly from the "selected point" marker), so users can see mosques
  near the one they're submitting instead of duplicating.

**Acceptance criteria:**
- User can type an address/place name and jump the map to it before placing the marker.
- The currently-selected point marker remains visually distinct from any other markers shown.

---

### 2.4 New feature: allow a book cover photo on submission
**Files:** `web/src/features/submit/SubmitPage.tsx` (mirror the existing `photoFile`/`photoPreview` pattern at lines 48–51, 146–156), Supabase `books`/`mosque_books` schema, `mosque-images` storage bucket (or a new `book-images` bucket)

**Current behavior:** The submit form only supports one photo upload target: the mosque photo
(`photoFile` → `mosque-images` bucket → `mosque_image` column). There is no equivalent upload
control or storage column for a book cover image.

**Required behavior:**
- Add an optional book cover upload control to the book section of the submit form, following the
  same pattern used for the mosque photo (file input, preview, upload to a Supabase Storage
  bucket, store the resulting public URL).
- Add a `book_image` (or similarly named) column to the relevant table to persist the URL.
- Display the book cover in the book card and book detail view (see 1.4) when present, falling
  back to the current initial-letter avatar (`book-avatar`) when absent.

**Acceptance criteria:**
- A user can attach an image to a book during submission.
- The uploaded image is visible on that book's card and detail page after submission.
- Books without a cover continue to show the existing letter-avatar fallback.

---

### 2.5 New feature: allow multiple mosque images (exterior angles + library interior)
**Files:** `web/src/features/submit/SubmitPage.tsx` (photo upload section), Supabase `mosques` schema, `mosque-images` storage bucket, `web/src/features/browse/BrowsePage.tsx` (`DetailMosque`, `MosqueCard`)

**Current behavior:** The schema and submit form support exactly one image per mosque
(`mosque_image: string | null`, one `photoFile`/`photoPreview` pair). There's no way to add
multiple exterior photos or a separate photo of the mosque's library/book collection.

**Required behavior:**
- Change the mosque photo model from a single URL to a list of images, e.g. a new
  `mosque_images` table (`mosque_id`, `image_url`, `sort_order`, optional `caption` such as
  "exterior" / "library") or a `text[]`/JSON column on `mosques` if a normalized table is out of
  scope for this pass.
- Update the submit form to allow multiple file selection/upload (with previews and per-image
  removal), including a way to tag or at least visually group "mosque exterior" vs. "library
  interior" shots.
- Update the mosque detail page (1.4) to render all images in a gallery/carousel, and update
  `MosqueCard` to use the first/primary image as the card thumbnail.
- Maintain backward compatibility with existing single-`mosque_image` records (treat as a
  one-item gallery) or migrate existing values into the new structure.

**Acceptance criteria:**
- A user can upload more than one image when submitting or editing a mosque.
- All uploaded images for a mosque are visible in its detail gallery.
- Existing mosques with only a legacy `mosque_image` value still display correctly.