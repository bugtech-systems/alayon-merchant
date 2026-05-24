// components/DynamicFilters.tsx

"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Filter, X, CalendarIcon, ChevronDown, Search, DollarSign, Hash, ToggleLeft, Tag, SlidersHorizontal } from "lucide-react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@workspace/ui/components/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
  SheetClose,
} from "@workspace/ui/components/sheet";
import { Calendar } from "@workspace/ui/components/calendar";
import { cn } from "@workspace/ui/lib/utils";
import { DataTableConfig, ColumnConfig, FilterFieldConfig } from "@/types/dynamic-datatable-types";
import { Badge } from "@workspace/ui/components/badge";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import { useMediaQuery } from "@/hooks/useMediaQuery";

interface DynamicFiltersProps {
  tableConfig: DataTableConfig;
  initialFilters?: Record<string, any>;
  onFilterChange?: (filters: Record<string, any>) => void;
  debounceDelay?: number;
}

// Helper to generate filter config from columns
function generateFiltersFromColumns(columns: ColumnConfig[]): FilterFieldConfig[] {
  const filters: FilterFieldConfig[] = [];

  columns.forEach((column) => {
    if (column.filterable === false) return;

    switch (column.type) {
      case 'text':
        filters.push({
          id: `${column.id}_filter`,
          field: column.accessorKey,
          type: 'text',
          label: column.header,
          placeholder: `Search ${column.header.toLowerCase()}...`,
        });
        break;

      case 'number':
      case 'currency':
        filters.push({
          id: `${column.id}_range`,
          field: column.accessorKey,
          type: 'number',
          label: column.header,
          placeholder: `Filter ${column.header.toLowerCase()}`,
        });
        break;

      case 'date':
        filters.push({
          id: `${column.id}_date`,
          field: column.accessorKey,
          type: 'daterange',
          label: column.header,
          placeholder: `Select ${column.header.toLowerCase()} range`,
        });
        break;

      case 'boolean':
        filters.push({
          id: `${column.id}_boolean`,
          field: column.accessorKey,
          type: 'select',
          label: column.header,
          options: [
            { value: 'true', label: 'Yes' },
            { value: 'false', label: 'No' },
          ],
        });
        break;

      case 'badge':
        if (column.badgeStyles && Object.keys(column.badgeStyles).length > 0) {
          filters.push({
            id: `${column.id}_badge`,
            field: column.accessorKey,
            type: 'select',
            label: column.header,
            options: Object.keys(column.badgeStyles).map(key => ({
              value: key,
              label: key.charAt(0).toUpperCase() + key.slice(1),
            })),
          });
        } else {
          filters.push({
            id: `${column.id}_text`,
            field: column.accessorKey,
            type: 'text',
            label: column.header,
            placeholder: `Filter by ${column.header.toLowerCase()}...`,
          });
        }
        break;
    }
  });

  return filters;
}

const getFilterIcon = (type: string) => {
  switch (type) {
    case 'text':
      return <Search className="h-3 w-3" />;
    case 'number':
    case 'currency':
      return <Hash className="h-3 w-3" />;
    case 'date':
    case 'daterange':
      return <CalendarIcon className="h-3 w-3" />;
    case 'boolean':
      return <ToggleLeft className="h-3 w-3" />;
    case 'select':
      return <Tag className="h-3 w-3" />;
    default:
      return <Filter className="h-3 w-3" />;
  }
};

const CLEAR_VALUE = "___clear___";

export function DynamicFilters({
  tableConfig,
  initialFilters = {},
  onFilterChange,
  debounceDelay = 300,
}: DynamicFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isMobile = useMediaQuery("(max-width: 768px)");
  
  // Refs to prevent infinite loops
  const isUpdatingFromURL = useRef(false);
  const isUpdatingFromLocal = useRef(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | any>(1000);
  
  // Generate filters from table columns
  const filtersConfig = useMemo(() => {
    if (tableConfig.filters && tableConfig.filters.length > 0) {
      return tableConfig.filters;
    }
    return generateFiltersFromColumns(tableConfig.columns);
  }, [tableConfig]);
  
  // Initialize local filters from URL only once
  const [localFilters, setLocalFilters] = useState<Record<string, any>>(() => {
    const urlFilters: Record<string, any> = {};
    filtersConfig.forEach((filter: any) => {
      const urlValue = searchParams.get(filter.field);
      if (urlValue !== null && urlValue !== "") {
        if (filter.type === "number") {
          const [min, max] = urlValue.split("-");
          if (min && max) {
            urlFilters[filter.field] = { min: parseFloat(min), max: parseFloat(max) };
          } else if (min) {
            urlFilters[filter.field] = { min: parseFloat(min), max: undefined };
          }
        } else if (filter.type === "daterange") {
          const [from, to] = urlValue.split("__");
          if (from && to) {
            urlFilters[filter.field] = { from, to };
          }
        } else if (filter.type === "date") {
          urlFilters[filter.field] = urlValue;
        } else if (filter.type === "boolean") {
          urlFilters[filter.field] = urlValue === "true";
        } else {
          urlFilters[filter.field] = urlValue;
        }
      }
    });
    return { ...initialFilters, ...urlFilters };
  });

  const [open, setOpen] = useState(false);

  // Active filters count
  const activeFiltersCount = useMemo(() => {
    return Object.keys(localFilters).filter((key) => {
      const value = localFilters[key];
      if (value === undefined || value === null || value === "") return false;
      if (typeof value === "object") {
        if (value.from && value.to) return true;
        if ((value.min !== undefined && value.min !== "") || (value.max !== undefined && value.max !== "")) return true;
        return false;
      }
      return true;
    }).length;
  }, [localFilters]);

  // Sync URL changes to local filters (one way)
  useEffect(() => {
    if (isUpdatingFromLocal.current) return;
    
    isUpdatingFromURL.current = true;
    
    const newUrlFilters: Record<string, any> = {};
    filtersConfig.forEach((filter: any) => {
      const urlValue = searchParams.get(filter.field);
      if (urlValue !== null && urlValue !== "") {
        if (filter.type === "number") {
          const [min, max] = urlValue.split("-");
          if (min && max) {
            newUrlFilters[filter.field] = { min: parseFloat(min), max: parseFloat(max) };
          } else if (min) {
            newUrlFilters[filter.field] = { min: parseFloat(min), max: undefined };
          }
        } else if (filter.type === "daterange") {
          const [from, to] = urlValue.split("__");
          if (from && to) {
            newUrlFilters[filter.field] = { from, to };
          }
        } else if (filter.type === "date") {
          newUrlFilters[filter.field] = urlValue;
        } else if (filter.type === "boolean") {
          newUrlFilters[filter.field] = urlValue === "true";
        } else {
          newUrlFilters[filter.field] = urlValue;
        }
      }
    });
    
    setLocalFilters((prev) => {
      const hasChanges = JSON.stringify(prev) !== JSON.stringify(newUrlFilters);
      if (hasChanges) {
        return { ...initialFilters, ...newUrlFilters };
      }
      return prev;
    });
    
    setTimeout(() => {
      isUpdatingFromURL.current = false;
    }, 100);
  }, [searchParams, filtersConfig, initialFilters]);

  // Debounced update to URL and parent
  const debouncedUpdate = useCallback((filters: Record<string, any>) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    debounceTimerRef.current = setTimeout(() => {
      if (isUpdatingFromURL.current) return;
      
      isUpdatingFromLocal.current = true;
      
      const params = new URLSearchParams();
      
      // Preserve existing non-filter params
      const existingParams = new URLSearchParams(searchParams.toString());
      existingParams.forEach((val, key) => {
        const isFilterField = filtersConfig.some((f) => f.field === key);
        if (!isFilterField) {
          params.set(key, val);
        }
      });
      
      // Add filter params
      Object.entries(filters).forEach(([key, value]) => {
        if (value === undefined || value === null || value === "") return;
        
        if (typeof value === "object") {
          if (value.from && value.to) {
            params.set(key, `${value.from}__${value.to}`);
          } else if (value.min !== undefined && value.min !== "" && value.min !== null) {
            const max = value.max !== undefined && value.max !== "" && value.max !== null ? `-${value.max}` : "";
            params.set(key, `${value.min}${max}`);
          } else if (value.max !== undefined && value.max !== "" && value.max !== null) {
            params.set(key, `-${value.max}`);
          }
        } else if (typeof value === "boolean") {
          params.set(key, String(value));
        } else {
          params.set(key, String(value));
        }
      });
      
      const newUrl = `${pathname}${params.toString() ? `?${params.toString()}` : ""}`;
      const currentUrl = `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;
      
      if (newUrl !== currentUrl) {
        router.replace(newUrl, { scroll: false });
      }
      
      if (onFilterChange) {
        onFilterChange(filters);
      }
      
      setTimeout(() => {
        isUpdatingFromLocal.current = false;
      }, 100);
    }, debounceDelay);
  }, [router, pathname, searchParams, filtersConfig, onFilterChange, debounceDelay]);

  // Handle local filter changes
  const handleFilterChange = useCallback((field: string, value: any) => {
    if (isUpdatingFromURL.current) return;
    
    setLocalFilters((prev) => {
      const newFilters = { ...prev, [field]: value };
      debouncedUpdate(newFilters);
      return newFilters;
    });
  }, [debouncedUpdate]);

  const handleClearAll = useCallback(() => {
    if (isUpdatingFromURL.current) return;
    
    const clearedFilters: Record<string, any> = {};
    filtersConfig.forEach((filter) => {
      clearedFilters[filter.field] = undefined;
    });
    setLocalFilters(clearedFilters);
    debouncedUpdate(clearedFilters);
    setOpen(false);
  }, [filtersConfig, debouncedUpdate]);

  const handleClearFilter = useCallback((field: string) => {
    if (isUpdatingFromURL.current) return;
    
    setLocalFilters((prev) => {
      const newFilters = { ...prev, [field]: undefined };
      debouncedUpdate(newFilters);
      return newFilters;
    });
  }, [debouncedUpdate]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const renderFilterInput = (filter: FilterFieldConfig) => {
    const value = localFilters[filter.field];

    switch (filter.type) {
      case 'text':
        return (
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={filter.placeholder || `Search ${filter.label.toLowerCase()}...`}
              value={value || ""}
              onChange={(e) => handleFilterChange(filter.field, e.target.value)}
              className="pl-9"
            />
          </div>
        );

      case 'select':
        return (
          <Select
            value={value !== undefined && value !== "" ? String(value) : CLEAR_VALUE}
            onValueChange={(val) => {
              if (val === CLEAR_VALUE) {
                handleFilterChange(filter.field, undefined);
              } else {
                handleFilterChange(filter.field, val);
              }
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder={filter.placeholder || `Select ${filter.label}`} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={CLEAR_VALUE}>Clear selection</SelectItem>
              {filter.options?.map((option) => (
                <SelectItem key={option.value} value={String(option.value)}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'date':
        return (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !value && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {value ? new Date(value).toLocaleDateString() : filter.placeholder || "Pick a date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={value ? new Date(value) : undefined}
                onSelect={(date) => {
                  handleFilterChange(filter.field, date?.toISOString().split('T')[0]);
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        );

      case 'daterange':
        return (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !value?.from && !value?.to && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {value?.from && value?.to
                  ? `${new Date(value.from).toLocaleDateString()} - ${new Date(
                      value.to
                    ).toLocaleDateString()}`
                  : filter.placeholder || "Select date range"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="range"
                selected={value}
                onSelect={(range) => handleFilterChange(filter.field, range)}
                numberOfMonths={isMobile ? 1 : 2}
              />
            </PopoverContent>
          </Popover>
        );

      case 'number':
        return (
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="number"
                placeholder="Min"
                value={value?.min !== undefined && value?.min !== "" ? value.min : ""}
                onChange={(e) =>
                  handleFilterChange(filter.field, { 
                    ...value, 
                    min: e.target.value === "" ? undefined : parseFloat(e.target.value) 
                  })
                }
                className="pl-9"
              />
            </div>
            <div className="relative flex-1">
              <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="number"
                placeholder="Max"
                value={value?.max !== undefined && value?.max !== "" ? value.max : ""}
                onChange={(e) =>
                  handleFilterChange(filter.field, { 
                    ...value, 
                    max: e.target.value === "" ? undefined : parseFloat(e.target.value) 
                  })
                }
                className="pl-9"
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const getDisplayValue = (filter: FilterFieldConfig | any, value: any): string => {
    if (!value) return "";
    
    if (filter.type === "daterange" && value.from && value.to) {
      return `${new Date(value.from).toLocaleDateString()} → ${new Date(value.to).toLocaleDateString()}`;
    }
    
    if (filter.type === "number") {
      if (value.min !== undefined && value.max !== undefined && value.min !== "" && value.max !== "") {
        return `${value.min} - ${value.max}`;
      }
      if (value.min !== undefined && value.min !== "") return `≥ ${value.min}`;
      if (value.max !== undefined && value.max !== "") return `≤ ${value.max}`;
    }
    
    if (filter.type === "select" && filter.options) {
      const option = filter.options.find((opt: any) => String(opt.value) === String(value));
      return option?.label || String(value);
    }
    
    if (filter.type === "boolean") {
      return value ? "Yes" : "No";
    }
    
    if (filter.type === "date") {
      return new Date(value).toLocaleDateString();
    }
    
    return value;
  };

  const groupedFilters = useMemo(() => {
    const groups: Record<string, FilterFieldConfig[]> | any = {
      Basic: [],
      Other: [],
    };
    
    filtersConfig.forEach((filter) => {
      if (['search', 'status', 'type', 'is_deleted', 'is_admin', 'game_time'].includes(filter.field)) {
        groups.Basic.push(filter);
      } else {
        groups.Other.push(filter);
      }
    });
    
    return groups;
  }, [filtersConfig]);

  // Mobile Filter Sheet Component with Fixed Footer
  const MobileFilterSheet = () => (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button 
          variant="outline" 
          size="icon"
          className="relative h-9 w-9"
        >
          <SlidersHorizontal className="h-4 w-4" />
          {activeFiltersCount > 0 && (
            <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center">
              {activeFiltersCount}
            </span>
          )}
          <span className="sr-only">Filters</span>
        </Button>
      </SheetTrigger>
      
      <SheetContent side="bottom" className="h-[90vh] p-0 rounded-t-xl flex flex-col">
        {/* Fixed Header */}
        <SheetHeader className="px-4 py-4 border-b shrink-0">
          <SheetTitle className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filter {tableConfig.title || "Data"}
          </SheetTitle>
          <p className="text-xs text-muted-foreground">
            Apply filters to refine your results
          </p>
        </SheetHeader>

        {/* Scrollable Content */}
        <ScrollArea className="flex-1 px-4">
          <div className="py-4 space-y-6">
            {Object.entries(groupedFilters).map(([groupName, filters]: any) => (
              filters.length > 0 && (
                <div key={groupName} className="space-y-3">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {groupName}
                  </h3>
                  <div className="space-y-4">
                    {filters.map((filter: any) => (
                      <div key={filter.id} className="space-y-1.5">
                        <Label className="text-xs font-medium flex items-center gap-1.5">
                          {getFilterIcon(filter.type)}
                          {filter.label}
                        </Label>
                        {renderFilterInput(filter)}
                      </div>
                    ))}
                  </div>
                </div>
              )
            ))}
          </div>
        </ScrollArea>

        {/* Fixed Footer */}
        <SheetFooter className="px-4 py-4 border-t mt-auto shrink-0">
          <div className="flex w-full gap-2">
            <SheetClose asChild>
              <Button variant="outline" className="flex-1">
                Cancel
              </Button>
            </SheetClose>
            <Button 
              onClick={handleClearAll} 
              variant="destructive" 
              className="flex-1"
            >
              Clear All
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );

  // Desktop filter content
  const DesktopFilterContent = () => (
    <>
      <ScrollArea className="h-[calc(90vh-200px)] px-1">
        <div className="space-y-8 py-4">
          {Object.entries(groupedFilters).map(([groupName, filters]: any) => (
            filters.length > 0 && (
              <div key={groupName} className="space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground border-b pb-2">
                  {groupName}
                </h3>
                <div className="space-y-6">
                  {filters.map((filter: any) => (
                    <div key={filter.id} className="space-y-2">
                      <Label className="text-sm font-semibold flex items-center gap-2">
                        {getFilterIcon(filter.type)}
                        {filter.label}
                      </Label>
                      {renderFilterInput(filter)}
                    </div>
                  ))}
                </div>
              </div>
            )
          ))}
        </div>
      </ScrollArea>

      <DialogFooter className="pt-4 border-t mt-4">
        <div className="flex w-full gap-2">
          <DialogClose asChild>
            <Button variant="outline" className="flex-1">
              Cancel
            </Button>
          </DialogClose>
          <Button onClick={handleClearAll} variant="destructive" className="flex-1">
            Clear All
          </Button>
        </div>
      </DialogFooter>
    </>
  );

  // For mobile: Use Sheet (bottom drawer) with fixed header/footer
  if (isMobile) {
    return (
      <>
        <MobileFilterSheet />

        {/* Active Filters Display */}
        {activeFiltersCount > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {Object.entries(localFilters).map(([key, value]) => {
              if (!value) return null;
              const filterConfig = filtersConfig.find((f) => f.field === key);
              if (!filterConfig) return null;

              const displayValue = getDisplayValue(filterConfig, value);
              if (!displayValue) return null;

              return (
                <Badge 
                  key={key} 
                  variant="secondary" 
                  className="gap-1 px-2 py-0.5 text-xs cursor-pointer hover:bg-destructive/10"
                >
                  <span className="font-medium">{filterConfig.label}:</span>
                  <span className="truncate max-w-[120px]">{displayValue}</span>
                  <X
                    className="h-2.5 w-2.5 cursor-pointer hover:text-destructive ml-0.5 shrink-0"
                    onClick={() => handleClearFilter(key)}
                  />
                </Badge>
              );
            })}
          </div>
        )}
      </>
    );
  }

  // Desktop: Use Dialog
  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" className="relative gap-2">
            <Filter className="h-4 w-4" />
            Filters
            {activeFiltersCount > 0 && (
              <span className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
                {activeFiltersCount}
              </span>
            )}
            <ChevronDown className="h-3 w-3 opacity-50 hidden sm:inline" />
          </Button>
        </DialogTrigger>
        
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filter {tableConfig.title || "Data"}
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              Apply filters to refine your results
            </p>
          </DialogHeader>

          <DesktopFilterContent />
        </DialogContent>
      </Dialog>

      {/* Active Filters Display */}
      {activeFiltersCount > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {Object.entries(localFilters).map(([key, value]) => {
            if (!value) return null;
            const filterConfig = filtersConfig.find((f) => f.field === key);
            if (!filterConfig) return null;

            const displayValue = getDisplayValue(filterConfig, value);
            if (!displayValue) return null;

            return (
              <Badge 
                key={key} 
                variant="secondary" 
                className="gap-1 px-3 py-1 text-sm cursor-pointer hover:bg-destructive/10"
              >
                <span className="font-medium">{filterConfig.label}:</span>
                <span>{displayValue}</span>
                <X
                  className="h-3 w-3 cursor-pointer hover:text-destructive ml-1"
                  onClick={() => handleClearFilter(key)}
                />
              </Badge>
            );
          })}
        </div>
      )}
    </>
  );
}