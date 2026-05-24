'use client'


import { useURLFilters } from "@/hooks/useUrlFilters"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"


export function DashboardFiltersBar() {
  const { filters, setFilters } = useURLFilters()
console.log(filters, 'FILTT')
  return (
    <div className="flex flex-wrap gap-4 px-4 lg:px-6">
      
      {/* DATE RANGE */}
      <Select
        value={filters.range}
        onValueChange={(val) => setFilters({ range: val })}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue />
        </SelectTrigger>

        <SelectContent>
          <SelectItem value="90d">Last 3 months</SelectItem>
          <SelectItem value="30d">Last 30 days</SelectItem>
          <SelectItem value="7d">Last 7 days</SelectItem>
        </SelectContent>
      </Select>

      {/* SEGMENT */}
      <Select
        value={filters.segment}
        onValueChange={(val) => setFilters({ segment: val })}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue />
        </SelectTrigger>

        <SelectContent>
          <SelectItem value="all">All</SelectItem>
          <SelectItem value="enterprise">Enterprise</SelectItem>
          <SelectItem value="retail">Retail</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}