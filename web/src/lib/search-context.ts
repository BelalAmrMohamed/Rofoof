import { createContext } from 'react'

export type SearchContextValue = {
  /** Current search text. On the browse page this drives the results list
   *  directly; on other pages it's just the header input's value until the
   *  user submits, which navigates to "/" with the query applied. */
  query: string
  setQuery: (value: string) => void
  /** Placeholder text the header search field should show. BrowsePage sets
   *  this to a books/mosques-specific hint depending on the active view;
   *  other pages get a sensible default. */
  placeholder: string
  setPlaceholder: (value: string) => void
  /** Called when the header search is submitted (Enter) from a page other
   *  than "/". Defaults to navigating to "/?q=...". BrowsePage overrides
   *  this to a no-op since it already filters live as the user types. */
  onSubmit: (value: string) => void
}

export const SearchContext = createContext<SearchContextValue>({
  query: '',
  setQuery: () => {},
  placeholder: 'ابحث عن كتاب أو مسجد...',
  setPlaceholder: () => {},
  onSubmit: (value: string) => {
    const trimmed = value.trim()
    window.location.assign(trimmed ? `/?q=${encodeURIComponent(trimmed)}` : '/')
  },
})
