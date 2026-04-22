import { useContext, useEffect } from 'react'
import { PageTitleContext, type PageTitleContextValue } from '@/contexts/page-title-context'

export function usePageTitle(): PageTitleContextValue {
  const ctx = useContext(PageTitleContext)
  if (!ctx) {
    throw new Error('usePageTitle must be used within PageTitleProvider')
  }
  return ctx
}

/** Sets the top bar title while mounted; clears on unmount. */
export function useSetPageTitle(title: string): void {
  const { setTitle } = usePageTitle()
  useEffect(() => {
    setTitle(title)
    return () => setTitle('')
  }, [title, setTitle])
}
