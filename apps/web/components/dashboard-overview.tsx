"use client"

import * as React from "react"
import { Download, ChevronsUpDown, Check } from "lucide-react"
import { DateRange } from "react-day-picker"
import { format, subDays, subMonths } from "date-fns"

import { DateRangePicker } from "@/components/date-range-picker"
import { Button } from "@workspace/ui/components/button"
import { Badge } from "@workspace/ui/components/badge"
import { Popover, PopoverContent, PopoverTrigger } from "@workspace/ui/components/popover"
import { Command, CommandGroup, CommandItem, CommandList } from "@/components/ui/command"

import { useURLFilters } from "@/hooks/useUrlFilters"
import { useN8nQuery } from "@/hooks/useN8nQuery"

import { cn } from "@/lib/utils"
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "./ui/chart"
import { Area, ComposedChart, XAxis, YAxis } from "recharts"

const branchesWidget = {
  id: "branches",
  webhook: {
    url: "/webhook/get-branches",
    queryMap: {},
  },
}

const batchesWidget = {
  id: "batches",
  webhook: {
    url: "/webhook/get-batches",
    queryMap: {
      branch: "branch"
   }
  },
}

const pedlersWidget = {
  id: "peddlers",
  webhook: {
    url: "/webhook/get-peddlers",
    queryMap: {
      branch: "branch",
      batch: "batch"
   }
  },
}

// Default date range: last 30 days
const getDefaultDateRange = () => ({
  from: subDays(new Date(), 30),
  to: new Date(),
})

export function AnalyticsOverview() {
  const { filters, setFilters, clearFilters } = useURLFilters({
    defaultPage: 1,
    defaultLimit: 50,
    defaultDateRange: {
      fromKey: 'from',
      toKey: 'to',
    }
  })
  const [selectedFilters, setSelectedFilters] = React.useState<string[]>(() => {
    // Initialize from URL params if present
    if (filters.peddler && filters.peddler !== 'all') {
      return filters.peddler.split(',')
    }
    return []
  })

  // Fetch data with current filters
  const { data: branches = [] } = useN8nQuery({
    widget: branchesWidget, 
    filters: {
      branch: filters.branch,
      batch: filters.batch
    }
  })
  
  const { data: batches = [], isLoading: batchesLoading } = useN8nQuery({
    widget: batchesWidget, 
    filters: { branch: filters.branch }
  })


  
  const { data: peddlers = [] } = useN8nQuery({
    widget: pedlersWidget, 
    filters: {
      branch: filters.branch,
      batch: filters.batch
    }
  })

  // Date range handling with defaults from URL
  const dateRange: DateRange = {
    from: filters.from ? new Date(filters.from) : getDefaultDateRange().from,
    to: filters.to ? new Date(filters.to) : getDefaultDateRange().to,
  }


  
  const handleDateChange = (range?: DateRange) => {
    if (!range?.from || !range?.to) return
    
    setFilters({
      from: format(range.from, "yyyy-MM-dd"),
      to: format(range.to, "yyyy-MM-dd"),
      page: 1, // Reset to first page when date changes
    })
  }

  // Handle filter toggle
  const handleFilterToggle = (key: string, checked: boolean) => {
    setSelectedFilters((prev) => {
      const newFilters = checked 
        ? [...prev, key]
        : prev.filter((item) => item !== key)
      
      // Update URL with comma-separated peddler IDs
      setFilters({
        peddler: newFilters.length > 0 ? newFilters.join(",") : undefined,
        page: 1, // Reset to first page when filters change
      })
      
      return newFilters
    })
  }

    // Handle filter toggle
  const clearFilterToggle = () => {
    setSelectedFilters([])
      
      // Update URL with comma-separated peddler IDs
      setFilters({
        peddler: "",
        page: 1, // Reset to first page when filters change
      })
  }

    const handleBranch = (value: any) => {
     setFilters({
                branch: value,
                batch: "all", // Reset batch when branch changes
                peddler: undefined, // Reset peddler when branch changes
                page: 1, // Reset to first page
              })

  }


  // Initialize default URL parameters on first load
  React.useEffect(() => {
    const defaults: any = {}
    let needsUpdate = false
    
    // Set default branch if not set
    if (!filters.branch && branches.length > 0) {
      defaults.branch = "all"
      needsUpdate = true
    }
    
    // Set default batch if not set
    if (!filters.batch) {
      defaults.batch = "all"
      needsUpdate = true
    }
    
    // Set default peddler if not set
    if (!filters.peddler) {
      defaults.peddler = undefined
      needsUpdate = true
    }
    
    // Set default date range if not set
    if (!filters.from || !filters.to) {
      const { from, to } = getDefaultDateRange()
      defaults.from = format(from, "yyyy-MM-dd")
      defaults.to = format(to, "yyyy-MM-dd")
      needsUpdate = true
    }
    
    if (needsUpdate) {
      setFilters(defaults)
    }
  }, [branches.length, filters.branch, filters.batch, filters.peddler, filters.from, filters.to, setFilters])

  return (
    <div className="grid gap-4 px-4 lg:px-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {/* BRANCH */}
          <BranchSelect
            branches={branches}
            value={filters.branch || "all"}
            onChange={handleBranch}
          />

          {/* BATCH */}
          {/* <BatchSelect
            batches={batches}
            value={filters.batch || "all"}
            disabled={!filters.branch || filters.branch === "all"}
            onChange={(val: any) => {
              setFilters({ 
                batch: val,
                peddler: undefined, // Reset peddler when batch changes
                page: 1, // Reset to first page
              })
              setSelectedFilters([]) // Clear selected peddlers
            }}
          /> */}
          
          {/* PEDDLERS FILTER */}
          <FiltersPopover 
            options={peddlers}  
            selectedFilters={selectedFilters} 
            onToggle={handleFilterToggle} 
            clearFilter={clearFilterToggle}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <DateRangePicker 
            value={dateRange} 
            onChange={handleDateChange} 
          />
          {/* <Button variant="secondary" onClick={handleExport}>
            <Download />
            Export
          </Button> */}
        </div>
      </div>
    </div>
  )
}


function BranchSelect({ branches, value, onChange }: any) {
  const [open, setOpen] = React.useState(false)

  // Find selected branch name
  const selectedBranch = value === "all" 
    ? "All Branches" 
    : branches.find((b: any) => b.id === value)?.name || "All Branches"

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-[200px] justify-between">
          {selectedBranch}
          <ChevronsUpDown className="opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-[200px] p-0">
        <Command>
          <CommandList>
            <CommandGroup>
              <CommandItem
                value="all"
                onSelect={() => {
                  onChange("all")
                  setOpen(false)
                }}
              >
                All Branches
                <Check className={cn("ml-auto", value === "all" ? "opacity-100" : "opacity-0")} />
              </CommandItem>

              {branches.map((b: any) => (
                <CommandItem
                  key={b.id}
                  value={b.id}
                  onSelect={() => {
                    onChange(b.id)
                    setOpen(false)
                  }}
                >
                  {b.name}
                  <Check className={cn("ml-auto", value === b.id ? "opacity-100" : "opacity-0")} />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

function BatchSelect({ batches, value, onChange, disabled }: any) {
  const [open, setOpen] = React.useState(false)

  // Find selected batch name
  const selectedBatch = !value || value === "all" || disabled
    ? "All Batches"
    : batches.find((b: any) => b.id === value)?.name || "All Batches"

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="w-[200px] justify-between"
          disabled={disabled}
        >
          {disabled ? "Select branch first" : selectedBatch}
          <ChevronsUpDown className="opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-[200px] p-0">
        <Command>
          <CommandList>
            <CommandGroup>
              <CommandItem
                value="all"
                onSelect={() => {
                  onChange("all")
                  setOpen(false)
                }}
              >
                All Batches
                <Check className={cn("ml-auto", value === "all" ? "opacity-100" : "opacity-0")} />
              </CommandItem>

              {batches.map((b: any) => (
                <CommandItem
                  key={b.id}
                  value={b.id}
                  onSelect={() => {
                    onChange(b.id)
                    setOpen(false)
                  }}
                >
                  {b.name}
                  <Check className={cn("ml-auto", value === b.id ? "opacity-100" : "opacity-0")} />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

function FiltersPopover({
  selectedFilters,
  onToggle,
  options = [],
  clearFilter
}: {
  selectedFilters: string[]
  onToggle: (id: string, checked: boolean) => void
  options: any[]
  clearFilter?: any
}) {
  const [open, setOpen] = React.useState(false)
  const activeCount = selectedFilters.length

  return (
    <div className="flex items-center gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" aria-expanded={open}>
            Filters
            {activeCount > 0 && (
              <Badge className="tabular-nums ml-1" variant="secondary">
                {activeCount}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-72">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm">Filter by Peddler</h3>
              {activeCount > 0 && <Badge variant="link" onClick={clearFilter}>Clear</Badge>}
              <Badge variant="outline" className="font-medium text-xs tabular-nums">
                Active: {activeCount}
              </Badge>
            </div>
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {options.map((item) => (
                <FilterToggle
                  key={item.id}
                  id={item.id}
                  label={item.name}
                  checked={selectedFilters.includes(item.id)}
                  onCheckedChange={(checked) => onToggle(item.id, checked)}
                />
              ))}
              {options.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No peddlers available
                </p>
              )}
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {activeCount > 0 && (
        <span className="text-muted-foreground text-sm hidden md:inline">
          Showing: <span className="font-medium">{summarizeFilterState(options, selectedFilters)}</span>
        </span>
      )}
    </div>
  )
}

function FilterToggle({
  id,
  label,
  checked,
  onCheckedChange,
}: {
  id: string
  label: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}) {
  return (
    <div className="flex cursor-pointer items-center gap-2">
      <Checkbox id={id} checked={checked} onCheckedChange={(value) => onCheckedChange(Boolean(value))} />
      <Label htmlFor={id} className="cursor-pointer font-normal text-sm">
        {label}
      </Label>
    </div>
  )
}

function summarizeFilterState(options: any[], selectedFilters: string[]) {
  if (selectedFilters.length === 0) {
    return "All peddlers"
  }
  
  const selectedNames = options
    .filter((item) => selectedFilters.includes(item.id))
    .map((item) => item.name)
  
  if (selectedNames.length === 0) return "All peddlers"
  if (selectedNames.length <= 2) return selectedNames.join(" · ")
  return `${selectedNames.slice(0, 2).join(" · ")} +${selectedNames.length - 2} more`
}