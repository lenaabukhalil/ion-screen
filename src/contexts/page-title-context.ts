import { createContext } from 'react'

export interface PageTitleContextValue {
  title: string
  setTitle: (title: string) => void
}

export const PageTitleContext = createContext<PageTitleContextValue | null>(null)
