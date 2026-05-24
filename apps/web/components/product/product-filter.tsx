// components/product/product-filters.tsx
'use client'

import { useProducts } from './products-provider'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { SlidersHorizontal, X } from 'lucide-react'



const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'oldest', label: 'Oldest First' },
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
  { value: 'title-asc', label: 'Name: A to Z' },
  { value: 'title-desc', label: 'Name: Z to A' },
]

export function ProductFilters({ 
  currentSort, 
  currentCategory, 
  currentCollection 
}: { 
  currentSort?: string
  currentCategory?: string
  currentCollection?: string
}) {
  const { filters, updateFilters, resetFilters } = useProducts()
  
  const hasActiveFilters = filters.sort !== null || filters.category !== null || filters.collection !== null

  return (
    <div className="mb-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Filter & Sort</span>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={resetFilters}
              className="h-7 px-2 text-xs gap-1"
            >
              <X className="h-3 w-3" />
              Reset all
            </Button>
          )}
        </div>

        <div className="flex items-center gap-3">
          <Select
            value={filters.sort || currentSort || 'newest'}
            onValueChange={(value) => updateFilters({ sort: value, page: 1 })}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  )
}


// Product Filters Wrapper (Client Component)
export function ProductFiltersWrapper({ 
  currentSort, 
  currentCategory, 
  currentCollection 
}: { 
  currentSort?: string
  currentCategory?: string
  currentCollection?: string
}) {
  'use client'
  
  const { filters, updateFilters, resetFilters } = useProducts()
  
  const hasActiveFilters = filters.sort !== null || filters.category !== null || filters.collection !== null

  const SORT_OPTIONS = [
    { value: 'newest', label: 'Newest First' },
    { value: 'oldest', label: 'Oldest First' },
    { value: 'price-asc', label: 'Price: Low to High' },
    { value: 'price-desc', label: 'Price: High to Low' },
    { value: 'title-asc', label: 'Name: A to Z' },
    { value: 'title-desc', label: 'Name: Z to A' },
  ]

  return (
    <div className="mb-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Filter & Sort</span>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={resetFilters}
              className="h-7 px-2 text-xs gap-1"
            >
              <X className="h-3 w-3" />
              Reset all
            </Button>
          )}
        </div>

        <div className="flex items-center gap-3">
          <Select
            value={filters.sort || currentSort || 'newest'}
            onValueChange={(value) => updateFilters({ sort: value, page: 1 })}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  )
}