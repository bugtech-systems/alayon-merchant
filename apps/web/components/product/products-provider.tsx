// components/product/products-provider.tsx
'use client'

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'

interface ProductsContextType {
  filters: {
    sort: string | null
    category: string | null
    collection: string | null
    page: number
  }
  updateFilters: (updates: Partial<ProductsContextType['filters']>) => void
  resetFilters: () => void
}

const ProductsContext = createContext<ProductsContextType | undefined>(undefined)

export function ProductsProvider({ children }: { children: ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  
  const [filters, setFilters] = useState({
    sort: searchParams?.get('sort') || null,
    category: searchParams?.get('category') || null,
    collection: searchParams?.get('collection') || null,
    page: parseInt(searchParams?.get('page') || '1'),
  })

  // Sync filters with URL params
  useEffect(() => {
    const newFilters = {
      sort: searchParams?.get('sort') || null,
      category: searchParams?.get('category') || null,
      collection: searchParams?.get('collection') || null,
      page: parseInt(searchParams?.get('page') || '1'),
    }
    
    setFilters(prev => {
      if (JSON.stringify(prev) === JSON.stringify(newFilters)) return prev
      return newFilters
    })
  }, [searchParams])

  const updateFilters = useCallback((updates: Partial<ProductsContextType['filters']>) => {
    const params = new URLSearchParams(searchParams?.toString() || '')
    
    Object.entries(updates).forEach(([key, value]) => {
      if (value && value !== 'all') {
        params.set(key, String(value))
      } else {
        params.delete(key)
      }
    })
    
    // Reset page to 1 when filters change (except when explicitly setting page)
    if (!('page' in updates) || (updates.page === 1)) {
      params.delete('page')
    }
    
    router.push(`${pathname}?${params.toString()}`)
  }, [router, pathname, searchParams])

  const resetFilters = useCallback(() => {
    router.push(pathname)
  }, [router, pathname])

  return (
    <ProductsContext.Provider value={{ filters, updateFilters, resetFilters }}>
      {children}
    </ProductsContext.Provider>
  )
}

export function useProducts() {
  const context = useContext(ProductsContext)
  if (!context) {
    throw new Error('useProducts must be used within ProductsProvider')
  }
  return context
}