import { useCallback, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { SearchContext } from './search-context'

// Read an initial "?q=" from the URL once, so a header search submitted from
// another page (which navigates to "/?q=...") pre-fills the browse query.
function initialQueryFromUrl() {
  try {
    return new URLSearchParams(window.location.search).get('q') ?? ''
  } catch {
    return ''
  }
}

export function SearchProvider({ children }: { children: ReactNode }) {
  const [query, setQuery] = useState(initialQueryFromUrl)
  const [placeholder, setPlaceholder] = useState('ابحث عن كتاب أو مسجد...')

  // Default submit behavior: navigate to the browse page with the query.
  // BrowsePage overrides this via context so Enter doesn't reload the page
  // it's already filtering live.
  const onSubmit = useCallback((value: string) => {
    const trimmed = value.trim()
    window.location.assign(trimmed ? `/?q=${encodeURIComponent(trimmed)}` : '/')
  }, [])

  const value = useMemo(
    () => ({ query, setQuery, placeholder, setPlaceholder, onSubmit }),
    [query, placeholder, onSubmit],
  )

  return <SearchContext.Provider value={value}>{children}</SearchContext.Provider>
}
