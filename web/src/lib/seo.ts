// web/src/lib/seo.ts
// Lightweight helper for dynamically updating page meta tags.
// Call setPageMeta() in a useEffect on each page for SPA-style SEO.

const SITE_NAME = 'على رفوف المساجد'
const SITE_URL = 'https://rofoof-almasajid.vercel.app'
const DEFAULT_IMAGE = `${SITE_URL}/thumbnail.jpg`

interface PageMeta {
  title: string
  description: string
  image?: string
  jsonLd?: object | object[]
  canonical?: string
}

function setMeta(name: string, content: string, property = false) {
  const attr = property ? 'property' : 'name'
  let el = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement | null
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, name)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

function setJsonLd(data: object | object[]) {
  const existing = document.getElementById('page-jsonld')
  if (existing) existing.remove()
  const script = document.createElement('script')
  script.id = 'page-jsonld'
  script.type = 'application/ld+json'
  script.textContent = JSON.stringify(Array.isArray(data) ? data : [data], null, 0)
  document.head.appendChild(script)
}

export function setPageMeta({ title, description, image, jsonLd, canonical }: PageMeta) {
  const fullTitle = title === SITE_NAME ? title : `${title} — ${SITE_NAME}`
  const img = image ?? DEFAULT_IMAGE

  document.title = fullTitle

  setMeta('description', description)
  setMeta('robots', 'index, follow')

  // OpenGraph
  setMeta('og:title', fullTitle, true)
  setMeta('og:description', description, true)
  setMeta('og:image', img, true)
  setMeta('og:site_name', SITE_NAME, true)
  setMeta('og:type', 'website', true)
  setMeta('og:locale', 'ar_EG', true)
  if (canonical) setMeta('og:url', canonical, true)

  // Twitter / X
  setMeta('twitter:card', 'summary_large_image')
  setMeta('twitter:title', fullTitle)
  setMeta('twitter:description', description)
  setMeta('twitter:image', img)

  // Canonical link
  let canonEl = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null
  if (canonical) {
    if (!canonEl) { canonEl = document.createElement('link'); canonEl.rel = 'canonical'; document.head.appendChild(canonEl) }
    canonEl.href = canonical
  }

  // JSON-LD
  if (jsonLd) setJsonLd(jsonLd)
}

// ── Pre-built JSON-LD schema builders ────────────────────────────────────

export function buildLibrarySchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    alternateName: 'On Mosque Shelves | Rofoof Al-Masajid',
    url: SITE_URL,
    description: 'فهرس رقمي مفتوح يُوثّق الكتب الموجودة على رفوف مساجد العالم الإسلامي ويتيحها لأبناء المجتمعات المحلية.',
    inLanguage: 'ar',
    potentialAction: {
      '@type': 'SearchAction',
      target: `${SITE_URL}/?query={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  }
}

export function buildBookSchema(book: {
  title: string
  author: string | null
  category: string | null
  mosqueName: string | null
  mosqueCity: string
  mosqueGovernorate: string
  mosqueCountry?: string
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Book',
    name: book.title,
    author: book.author ? { '@type': 'Person', name: book.author } : undefined,
    genre: book.category ?? undefined,
    locationCreated: undefined,
    offers: {
      '@type': 'Offer',
      availability: 'https://schema.org/InStoreOnly',
      availableAtOrFrom: {
        '@type': 'Library',
        name: book.mosqueName ?? `مسجد في ${book.mosqueCity}`,
        address: {
          '@type': 'PostalAddress',
          addressLocality: book.mosqueCity,
          addressRegion: book.mosqueGovernorate,
          addressCountry: book.mosqueCountry ?? 'EG',
        },
      },
    },
  }
}

export function buildMosqueSchema(mosque: {
  name: string | null
  city: string
  governorate: string
  country?: string
  bookCount: number
  lat?: number | null
  lng?: number | null
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'LandmarksOrHistoricalBuildings',
    name: mosque.name ?? `مسجد في ${mosque.city}`,
    address: {
      '@type': 'PostalAddress',
      addressLocality: mosque.city,
      addressRegion: mosque.governorate,
      addressCountry: mosque.country ?? 'EG',
    },
    ...(mosque.lat && mosque.lng ? {
      geo: { '@type': 'GeoCoordinates', latitude: mosque.lat, longitude: mosque.lng },
    } : {}),
    description: `يضم هذا المسجد ${mosque.bookCount} كتاب مُسجَّل في فهرس "على رفوف المساجد".`,
  }
}
