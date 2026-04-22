import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { PageTitleContext } from '@/contexts/page-title-context'

export function PageTitleProvider({ children }: { children: ReactNode }) {
  const [title, setTitleState] = useState('')
  const setTitle = useCallback((next: string) => {
    setTitleState(next)
  }, [])
  const value = useMemo(() => ({ title, setTitle }), [title, setTitle])
  return <PageTitleContext.Provider value={value}>{children}</PageTitleContext.Provider>
}
