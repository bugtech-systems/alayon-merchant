'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import {
  Search,
  ChevronUp,
  ChevronDown,
  Download,
  Eye,
  EyeOff,
  Package,
  Box,
  DollarSign,
  AlertTriangle,
  Loader2,
  Plus,
  Pencil,
  Trash2,
  RefreshCw,
  ArrowUpDown,
  Check,
  ChevronsUpDown,
  Tag,
  Layers,
  ChevronRight,
  Info,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  listInventoryItems,
  createInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
  getInventoryItem,
  listInventoryLevels,
  updateInventoryLevel,
  fetchInventoryItemsByLocation,
} from '@/lib/actions/inventory';
import { Autocomplete } from './inventory-item-autocomplete';

// ---------- Types ----------
interface InventoryItem {
  id: string;
  sku: string;
  title?: string;
  description?: string;
  requires_shipping?: boolean;
  thumbnail?: string;
  origin_country?: string;
  metadata?: Record<string, any>;
  location_levels?: InventoryLevel[];
  created_at?: string;
  updated_at?: string;
  categories?: string[];
}

interface InventoryLevel {
  id: string;
  inventory_item_id: string;
  location_id: string;
  stocked_quantity: number;
  reserved_quantity: number;
  incoming_quantity: number;
  available_quantity: number;
  metadata?: Record<string, any>;
}

interface Location {
  id: string;
  name: string;
}

interface FormErrors {
  sku?: string;
  title?: string;
  unit_price?: string;
  reorder_level?: string;
  stocked_level?: string;
  categories?: string;
  general?: string;
}

// ---------- Stock level helpers ----------
type StockLevel = 'all' | 'in_stock' | 'low_stock' | 'out_of_stock';

const getStockLevel = (
  item: InventoryItem,
  reorderLevel: number = 10
): StockLevel => {
  const availableStock = getAvailableStock(item);
  if (availableStock === 0) return 'out_of_stock';
  if (availableStock <= reorderLevel) return 'low_stock';
  return 'in_stock';
};

const getTotalStock = (item: InventoryItem): number => {
  return item.location_levels?.reduce(
    (sum, level) => sum + (level.stocked_quantity || 0),
    0
  ) || 0;
};

const getReservedStock = (item: InventoryItem): number => {
  return item.location_levels?.reduce(
    (sum, level) => sum + (level.reserved_quantity || 0),
    0
  ) || 0;
};

const getAvailableStock = (item: InventoryItem): number => {
  return item.location_levels?.reduce(
    (sum, level) => sum + (level.available_quantity || 0),
    0
  ) || 0;
};

const getUnitPrice = (item: InventoryItem): number => {
  return item.metadata?.unit_price || 0;
};

const getReorderLevel = (item: InventoryItem): number => {
  return item.metadata?.reorder_level || 10;
};

const getCategories = (item: InventoryItem): string[] => {
  return item.categories || item.metadata?.categories || ['Uncategorized'];
};

const getLocation = (item: InventoryItem): string => {
  return item.metadata?.location || 'Default';
};

const STOCK_LEVEL_LABELS: Record<StockLevel, string> = {
  all: 'All Levels',
  in_stock: 'In Stock',
  low_stock: 'Low Stock',
  out_of_stock: 'Out of Stock',
};

const STOCK_LEVEL_BADGE_COLORS: Record<StockLevel, string> = {
  all: '',
  in_stock: 'bg-green-100 text-green-800 hover:bg-green-200',
  low_stock: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200',
  out_of_stock: 'bg-red-100 text-red-800 hover:bg-red-200',
};

// ---------- Column configuration ----------
const COLUMNS = [
  { key: 'title', label: 'Inventory Name', sortable: true },
  { key: 'sku', label: 'SKU', sortable: true },
  { key: 'total_stock', label: 'Stock', sortable: true },
  { key: 'reserved', label: 'Reserved', sortable: true },
  { key: 'available', label: 'Available', sortable: true },
  { key: 'unit_price', label: 'Unit Price', sortable: true },
  { key: 'stock_level', label: 'Stock Level', sortable: false },
  { key: 'categories', label: 'Categories', sortable: false },
];

// ---------- Category Multi-Select Combobox Component ----------
const CategoryMultiCombobox = ({
  value,
  onChange,
  categories,
  error,
}: {
  value: string[];
  onChange: (val: string[]) => void;
  categories: string[];
  error?: string;
}) => {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');

  const handleSelect = (category: string) => {
    const newValue = value.includes(category)
      ? value.filter(c => c !== category)
      : [...value, category];
    onChange(newValue);
  };

  const handleCreate = () => {
    if (inputValue.trim() && !value.includes(inputValue.trim())) {
      onChange([...value, inputValue.trim()]);
      setInputValue('');
    }
  };

  const filtered = categories.filter(cat =>
    cat.toLowerCase().includes(inputValue.toLowerCase())
  );

  return (
    <div className="space-y-1">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn(
              "w-full justify-between min-h-[40px] h-auto",
              error && "border-red-500 focus:ring-red-500"
            )}
          >
            <div className="flex flex-wrap gap-1">
              {value.length === 0 && (
                <span className="text-muted-foreground">Select categories...</span>
              )}
              {value.map(cat => (
                <Badge key={cat} variant="secondary" className="text-xs">
                  {cat}
                  <button
                    type="button"
                    className="ml-1 hover:text-foreground"
                    onClick={(e) => {
                      e.stopPropagation();
                      onChange(value.filter(c => c !== cat));
                    }}
                  >
                    ×
                  </button>
                </Badge>
              ))}
            </div>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0">
          <Command>
            <CommandInput
              placeholder="Search or create category..."
              value={inputValue}
              onValueChange={setInputValue}
            />
            <CommandList>
              <CommandEmpty>
                <button
                  type="button"
                  className="w-full text-left px-2 py-1.5 text-sm hover:bg-gray-100 rounded"
                  onClick={handleCreate}
                >
                  + Create "{inputValue}"
                </button>
              </CommandEmpty>
              <CommandGroup>
                {filtered.map(cat => (
                  <CommandItem
                    key={cat}
                    value={cat}
                    onSelect={() => handleSelect(cat)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value.includes(cat) ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {cat}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {error && (
        <p className="text-sm text-red-500 flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          {error}
        </p>
      )}
    </div>
  );
};

// ---------- Reserved Items Collapsible Component ----------
const ReservedItemsCollapsible = ({ item }: { item: InventoryItem }) => {
  const [isOpen, setIsOpen] = useState(false);
  const reservedLevels = item.location_levels?.filter(
    level => level.reserved_quantity > 0
  ) || [];

  if (reservedLevels.length === 0) return null;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="w-full">
      <CollapsibleTrigger className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
        <ChevronRight className={cn(
          "h-3 w-3 transition-transform",
          isOpen && "rotate-90"
        )} />
        {reservedLevels.length} reserved item{reservedLevels.length > 1 ? 's' : ''}
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-1 space-y-1">
        {reservedLevels.map((level, idx) => (
          <div key={idx} className="text-xs text-muted-foreground pl-4 border-l-2 border-blue-200">
            <span className="font-mono">{level.reserved_quantity.toFixed(2)}</span> units reserved
            {level.metadata?.order_id && (
              <span className="ml-1">for order #{level.metadata.order_id}</span>
            )}
          </div>
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
};

// ---------- Error Alert Component ----------
const ErrorAlert = ({ 
  error, 
  onRetry, 
  onDismiss,
  details,
}: { 
  error: string | null; 
  onRetry?: () => void; 
  onDismiss?: () => void;
  details?: string;
}) => {
  if (!error) return null;

  return (
    <Alert variant="destructive" className="border-red-300 bg-red-50">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle className="flex items-center gap-2">
        <span className="font-semibold">Error</span>
        {details && (
          <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200 text-xs">
            Details available
          </Badge>
        )}
      </AlertTitle>
      <AlertDescription className="space-y-2">
        <p>{error}</p>
        {details && (
          <details className="text-sm text-red-700 bg-red-100/50 rounded p-2">
            <summary className="cursor-pointer font-medium">View technical details</summary>
            <pre className="mt-2 text-xs whitespace-pre-wrap break-words">
              {details}
            </pre>
          </details>
        )}
        <div className="flex gap-2 mt-2">
          {onRetry && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onRetry}
              className="border-red-300 hover:bg-red-100"
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Retry
            </Button>
          )}
          {onDismiss && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onDismiss}
              className="hover:bg-red-100"
            >
              Dismiss
            </Button>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
};

// ---------- Main Component ----------
export function InventoryTable({ user }: any) {
  // Data state
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [locations, setLocations] = useState<Location[]>([
    { id: 'default', name: 'Default Location' },
  ]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<string | undefined>(undefined);
  const [totalCount, setTotalCount] = useState(0);

  // UI state
  const [searchQuery, setSearchQuery] = useState('');
  const [stockLevelFilter, setStockLevelFilter] = useState<StockLevel>('all');
  const [categoryFilter, setCategoryFilter] = useState<string[]>([]);
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: 'asc' | 'desc';
  } | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showStats, setShowStats] = useState(true);

  // Dialog states
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isStockDialogOpen, setIsStockDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [stockManagingItem, setStockManagingItem] = useState<InventoryItem | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    title: '',
    sku: '',
    description: '',
    unit_price: 0,
    reorder_level: 10,
    categories: ['Uncategorized'] as string[],
    stocked_level: 0,
    requires_shipping: false,
    unit_of_measure: '',
  });

  const [formErrors, setFormErrors] = useState<FormErrors>({});

  const [stockFormData, setStockFormData] = useState({
    location_id: 'default',
    adjustment_quantity: 0,
    adjustment_type: 'set' as 'set' | 'add' | 'subtract',
  });

  const [stockFormErrors, setStockFormErrors] = useState<{
    location_id?: string;
    adjustment_quantity?: string;
    general?: string;
  }>({});

  // Loading states for operations
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isAdjustingStock, setIsAdjustingStock] = useState(false);

  // Category state
  const [allCategories, setAllCategories] = useState<string[]>(['Uncategorized']);

  // ---------- Validation Functions ----------
  const validateCreateForm = (): boolean => {
    const errors: FormErrors = {};

    if (!formData.sku.trim()) {
      errors.sku = 'SKU is required and cannot be empty';
    } else if (formData.sku.length < 2) {
      errors.sku = 'SKU must be at least 2 characters long';
    } else if (formData.sku.length > 50) {
      errors.sku = 'SKU must be less than 50 characters';
    }

    if (formData.title && formData.title.length > 100) {
      errors.title = 'Title must be less than 100 characters';
    }

    if (formData.unit_price < 0) {
      errors.unit_price = 'Unit price cannot be negative';
    }

    if (formData.reorder_level < 0) {
      errors.reorder_level = 'Reorder level cannot be negative';
    }

    if (formData.stocked_level < 0) {
      errors.stocked_level = 'Initial stock cannot be negative';
    }

    if (formData.categories.length === 0) {
      errors.categories = 'At least one category is required';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateStockForm = (): boolean => {
    const errors: typeof stockFormErrors = {};

    if (!stockFormData.location_id) {
      errors.location_id = 'Please select a location';
    }

    if (stockFormData.adjustment_quantity < 0) {
      errors.adjustment_quantity = 'Quantity cannot be negative';
    }

    if (stockFormData.adjustment_quantity === 0 && stockFormData.adjustment_type === 'set') {
      errors.adjustment_quantity = 'Quantity must be greater than 0 when setting stock';
    }

    setStockFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // ---------- Data fetching ----------
  const loadItems = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setErrorDetails(undefined);

      if (!user?.stockLocationId) {
        throw new Error('No stock location ID found. Please ensure you have a valid location.');
      }

      const result = await fetchInventoryItemsByLocation(user.stockLocationId);
      console.log(result, user?.stockLocationId, 'STO LOC')
      if (!result) {
        throw new Error('No data received from server');
      }

      const transformedItems: InventoryItem[] = result.map((item: any) => ({
        id: item.id,
        sku: item.sku || '',
        title: item.title || item.sku,
        description: item.description || '',
        requires_shipping: item.requires_shipping || false,
        thumbnail: item.thumbnail,
        metadata: item?.metadata || {},
        categories: item.metadata?.categories || ['Uncategorized'],
        location_levels: item.location_levels || [],
        created_at: item.created_at,
        updated_at: item.updated_at,
      }));

      setItems(transformedItems);
      setTotalCount(result.length || transformedItems.length);

      // Extract unique locations
      const uniqueLocations = new Map<string, Location>();
      transformedItems.forEach((item) => {
        item.location_levels?.forEach((level) => {
          if (!uniqueLocations.has(level.location_id)) {
            uniqueLocations.set(level.location_id, {
              id: level.location_id,
              name: level.metadata?.name || `Location ${level.location_id}`,
            });
          }
        });
      });

      if (uniqueLocations.size > 0) {
        setLocations(Array.from(uniqueLocations.values()));
      }

      toast.success(`Loaded ${transformedItems.length} inventory items`);
    } catch (err: any) {
      console.error('Failed to load inventory:', err);
      setError(err.message || 'Failed to load inventory items. Please try again.');
      setErrorDetails(err.stack || JSON.stringify(err, null, 2));
      toast.error('Failed to load inventory');
    } finally {
      setLoading(false);
    }
  }, [user?.stockLocationId]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  // Extract categories from items
  useEffect(() => {
    const cats = new Set<string>();
    items.forEach(item => {
      const itemCats = getCategories(item);
      itemCats.forEach(cat => cats.add(cat));
    });
    cats.add('Uncategorized');
    setAllCategories(Array.from(cats).sort());
  }, [items]);

  // ---------- Load inventory levels for an item ----------
  const loadItemLevels = async (itemId: string) => {
    try {
      const result = await listInventoryLevels(itemId);
      if (result.success && result.levels) {
        setItems((prev) =>
          prev.map((item) =>
            item.id === itemId
              ? { ...item, location_levels: result.levels }
              : item
          )
        );
        return result.levels;
      } else {
        throw new Error(result.error || 'Failed to load inventory levels');
      }
    } catch (err: any) {
      console.error('Failed to load inventory levels:', err);
      toast.error(err.message || 'Failed to load stock levels');
      return null;
    }
  };

  // ---------- Filtering and sorting ----------
  const filteredAndSorted = useMemo(() => {
    let result = [...items];

    // Search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (item) =>
          item.title?.toLowerCase().includes(q) ||
          item.sku?.toLowerCase().includes(q) ||
          item.description?.toLowerCase().includes(q)
      );
    }

    // Stock level filter
    if (stockLevelFilter !== 'all') {
      result = result.filter(
        (item) => getStockLevel(item, getReorderLevel(item)) === stockLevelFilter
      );
    }

    // Category filter
    if (categoryFilter.length > 0) {
      result = result.filter(item =>
        getCategories(item).some(cat => categoryFilter.includes(cat))
      );
    }

    // Sorting
    if (sortConfig) {
      result.sort((a, b) => {
        let aVal: any;
        let bVal: any;

        switch (sortConfig.key) {
          case 'total_stock':
            aVal = getTotalStock(a);
            bVal = getTotalStock(b);
            break;
          case 'reserved':
            aVal = getReservedStock(a);
            bVal = getReservedStock(b);
            break;
          case 'available':
            aVal = getAvailableStock(a);
            bVal = getAvailableStock(b);
            break;
          case 'unit_price':
            aVal = getUnitPrice(a);
            bVal = getUnitPrice(b);
            break;
          default:
            aVal = a[sortConfig.key as keyof InventoryItem];
            bVal = b[sortConfig.key as keyof InventoryItem];
        }

        if (aVal == null) return 1;
        if (bVal == null) return -1;

        if (typeof aVal === 'string' && typeof bVal === 'string') {
          return sortConfig.direction === 'asc'
            ? aVal.localeCompare(bVal)
            : bVal.localeCompare(aVal);
        }

        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
        }

        return 0;
      });
    }

    return result;
  }, [items, searchQuery, stockLevelFilter, categoryFilter, sortConfig]);

  // ---------- Selection handlers ----------
  const toggleSelectAll = () => {
    if (selectedIds.size === filteredAndSorted.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredAndSorted.map((i) => i.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  // ---------- CRUD Operations ----------
  const handleCreateItem = async () => {
    // Validate form
    if (!validateCreateForm()) {
      toast.error('Please fix the errors in the form');
      return;
    }

    setIsCreating(true);
    setFormErrors({});
    
    try {
      const response = await createInventoryItem({
        sku: formData.sku.trim(),
        title: formData.title.trim() || formData.sku.trim(),
        description: formData.description.trim(),
        requires_shipping: formData.requires_shipping || false,
        stocked_level: parseFloat(formData.stocked_level.toString()) || 0,
        metadata: {
          unit_price: parseFloat(formData.unit_price.toString()) || 0,
          reorder_level: parseFloat(formData.reorder_level.toString()) || 10,
          categories: formData.categories,
          unit_of_measure: formData.unit_of_measure,
          company_id: user?.companyId,
          location_id: user?.stockLocationId
        },
      });

      if (response.success) {
        const newItem: any = {
          ...response.data,
          categories: formData.categories,
        };
        setItems((prev) => [newItem, ...prev]);
        setTotalCount((prev) => prev + 1);
        toast.success(`Item "${formData.title || formData.sku}" created successfully`);
        setIsCreateDialogOpen(false);
        resetForm();
      } else {
        throw new Error(response.error || 'Failed to create item');
      }
    } catch (err: any) {
      console.error('Failed to create item:', err);
      const errorMsg = err.message || 'Failed to create inventory item';
      setFormErrors({ general: errorMsg });
      toast.error(errorMsg);
      
      // Show detailed error in console for debugging
      if (err.stack) {
        console.error('Stack trace:', err.stack);
      }
    } finally {
      setIsCreating(false);
    }
  };

  const handleEditItem = async () => {
    if (!editingItem) {
      toast.error('No item selected for editing');
      return;
    }

    if (!validateCreateForm()) {
      toast.error('Please fix the errors in the form');
      return;
    }

    setIsUpdating(true);
    setFormErrors({});
    
    try {
      const response = await updateInventoryItem(editingItem.id, {
        sku: formData.sku.trim(),
        title: formData.title.trim() || formData.sku.trim(),
        description: formData.description.trim(),
        requires_shipping: formData.requires_shipping,
        metadata: {
          ...editingItem.metadata,
          unit_price: parseFloat(formData.unit_price.toString()) || 0,
          reorder_level: parseFloat(formData.reorder_level.toString()) || 10,
          categories: formData.categories,
          unit_of_measure: formData.unit_of_measure,
        },
      });

      if (response.success) {
        toast.success(`Item "${formData.title || formData.sku}" updated successfully`);
        setIsEditDialogOpen(false);
        setEditingItem(null);
        resetForm();
        await loadItems();
      } else {
        throw new Error(response.error || 'Failed to update item');
      }
    } catch (err: any) {
      console.error('Failed to update item:', err);
      const errorMsg = err.message || 'Failed to update inventory item';
      setFormErrors({ general: errorMsg });
      toast.error(errorMsg);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteItems = async () => {
    if (selectedIds.size === 0) {
      toast.warning('No items selected for deletion');
      return;
    }

    const itemCount = selectedIds.size;
    const confirmMsg = itemCount === 1 
      ? 'Are you sure you want to delete this item? This action cannot be undone.'
      : `Are you sure you want to delete ${itemCount} items? This action cannot be undone.`;

    if (!confirm(confirmMsg)) return;

    setIsDeleting(true);
    try {
      const deletePromises = Array.from(selectedIds).map((id) =>
        deleteInventoryItem(id)
      );
      const results = await Promise.all(deletePromises);
      const failedDeletes = results.filter((r) => !r.success);

      if (failedDeletes.length > 0) {
        throw new Error(`${failedDeletes.length} item(s) failed to delete`);
      }

      setItems((prev) => prev.filter((item) => !selectedIds.has(item.id)));
      setTotalCount((prev) => prev - selectedIds.size);
      setSelectedIds(new Set());
      toast.success(`Successfully deleted ${itemCount} item(s)`);
    } catch (err: any) {
      console.error('Failed to delete items:', err);
      const errorMsg = err.message || 'Failed to delete some items';
      toast.error(errorMsg);
      await loadItems(); // Reload to ensure consistency
    } finally {
      setIsDeleting(false);
    }
  };

  const handleStockAdjustment = async () => {
    if (!stockManagingItem) {
      toast.error('No item selected for stock adjustment');
      return;
    }

    if (!validateStockForm()) {
      toast.error('Please fix the errors in the form');
      return;
    }

    setIsAdjustingStock(true);
    setStockFormErrors({});
    
    try {
      const currentLevel = stockManagingItem.location_levels?.find(
        (level) => level.location_id === stockFormData.location_id
      );

      let newQuantity = parseFloat(stockFormData.adjustment_quantity.toString()) || 0;

      if (stockFormData.adjustment_type === 'add') {
        newQuantity = (currentLevel?.stocked_quantity || 0) + newQuantity;
      } else if (stockFormData.adjustment_type === 'subtract') {
        if (newQuantity > (currentLevel?.stocked_quantity || 0)) {
          throw new Error('Cannot subtract more than available stock');
        }
        newQuantity = Math.max(0, (currentLevel?.stocked_quantity || 0) - newQuantity);
      }

      const response = await updateInventoryLevel(
        stockManagingItem.id,
        stockFormData.location_id,
        { stocked_quantity: newQuantity }
      );

      if (response.success) {
        await loadItemLevels(stockManagingItem.id);
        await loadItems();
        toast.success(`Stock updated successfully for "${stockManagingItem.title || stockManagingItem.sku}"`);
        setIsStockDialogOpen(false);
        setStockManagingItem(null);
        setStockFormErrors({});
      } else {
        throw new Error(response.error || 'Failed to update stock');
      }
    } catch (err: any) {
      console.error('Failed to update stock:', err);
      const errorMsg = err.message || 'Failed to update stock levels';
      setStockFormErrors({ general: errorMsg });
      toast.error(errorMsg);
    } finally {
      setIsAdjustingStock(false);
    }
  };

  // ---------- Form handlers ----------
  const openEditDialog = (item: any) => {
    setEditingItem(item);
    setFormData({
      title: item.title || '',
      sku: item.sku,
      description: item.description || '',
      unit_price: getUnitPrice(item),
      reorder_level: getReorderLevel(item),
      categories: getCategories(item),
      requires_shipping: item.requires_shipping || false,
      unit_of_measure: item.metadata?.unit_of_measure || '',
      stocked_level: 0,
    });
    setFormErrors({});
    setIsEditDialogOpen(true);
  };

  const openStockDialog = async (item: any) => {
    let levels = item.location_levels;
    if (!levels || levels.length === 0) {
      levels = await loadItemLevels(item.id);
    }

    setStockManagingItem(item);
    setStockFormData({
      location_id: levels?.[0]?.location_id || locations[0]?.id || 'default',
      adjustment_quantity: levels?.[0]?.available_quantity || levels?.[0]?.stocked_quantity || 0,
      adjustment_type: 'set',
    });
    setStockFormErrors({});
    setIsStockDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      title: '',
      sku: '',
      description: '',
      unit_price: 0,
      reorder_level: 10,
      categories: ['Uncategorized'],
      stocked_level: 0,
      requires_shipping: false,
      unit_of_measure: '',
    });
    setFormErrors({});
  };

  // ---------- Export ----------
  const exportCSV = () => {
    try {
      const headers = [...COLUMNS.map(c => c.label), 'Categories'].join(',');
      const rows = items.map((item) => {
        const row = COLUMNS.map(col => {
          switch (col.key) {
            case 'title': return `"${item.title || ''}"`;
            case 'sku': return item.sku;
            case 'total_stock': return getTotalStock(item).toFixed(2);
            case 'reserved': return getReservedStock(item).toFixed(2);
            case 'available': return getAvailableStock(item).toFixed(2);
            case 'unit_price': return getUnitPrice(item).toFixed(2);
            case 'stock_level': return STOCK_LEVEL_LABELS[getStockLevel(item, getReorderLevel(item))];
            case 'categories': return getCategories(item).join('; ');
            default: return '';
          }
        });
        row.push(`"${getCategories(item).join('; ')}"`);
        return row.join(',');
      });

      const csv = [headers, ...rows].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `inventory_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('CSV exported successfully');
    } catch (err: any) {
      console.error('Failed to export CSV:', err);
      toast.error(err.message || 'Failed to export CSV');
    }
  };

  // ---------- Stats ----------
  const stats = useMemo(() => {
    const totalItems = items.length;
    const totalStock = items.reduce((sum, item) => sum + getTotalStock(item), 0);
    const totalReserved = items.reduce((sum, item) => sum + getReservedStock(item), 0);
    const totalAvailable = items.reduce((sum, item) => sum + getAvailableStock(item), 0);
    const totalValue = items.reduce(
      (sum, item) => sum + getUnitPrice(item) * getTotalStock(item),
      0
    );
    const lowStockCount = items.filter(
      (item) => getStockLevel(item, getReorderLevel(item)) === 'low_stock'
    ).length;
    const outOfStockCount = items.filter(
      (item) => getStockLevel(item, getReorderLevel(item)) === 'out_of_stock'
    ).length;

    return {
      totalItems,
      totalStock,
      totalReserved,
      totalAvailable,
      totalValue,
      lowStockCount,
      outOfStockCount,
    };
  }, [items]);

  // ---------- Sorting handler ----------
  const toggleSort = (key: string) => {
    setSortConfig((prev) =>
      prev?.key === key
        ? { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
        : { key, direction: 'asc' }
    );
  };

  // ---------- Loading state ----------
  if (loading) {
    return (
      <div className="space-y-4 p-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-40" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-20" />
          </div>
        </div>
        {showStats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
        )}
        <Skeleton className="h-[400px]" />
      </div>
    );
  }

  // ---------- Render ----------
  return (
    <TooltipProvider>
      <div className="space-y-4 p-4">
        {/* Error banner */}
        {error && (
          <ErrorAlert 
            error={error}
            details={errorDetails}
            onRetry={loadItems}
            onDismiss={() => {
              setError(null);
              setErrorDetails(undefined);
            }}
          />
        )}

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white border rounded-lg px-4 py-3 shadow-sm">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-gray-500" />
            <span className="font-semibold text-gray-700">Inventory Management</span>
            <Badge variant="outline" className="font-mono">
              {totalCount} items
            </Badge>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            {/* Search */}
            <div className="relative flex-1 sm:flex-initial">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search inventory..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 w-full sm:w-[220px] h-8"
              />
            </div>

            {/* Category filter */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 gap-1">
                  <Tag className="h-3.5 w-3.5" />
                  {categoryFilter.length > 0 ? (
                    <Badge variant="secondary" className="h-5 px-1 text-xs">
                      {categoryFilter.length}
                    </Badge>
                  ) : (
                    'Categories'
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[200px] p-0">
                <Command>
                  <CommandInput placeholder="Filter categories..." />
                  <CommandList>
                    <CommandEmpty>No categories found</CommandEmpty>
                    <CommandGroup>
                      {allCategories.map(cat => (
                        <CommandItem
                          key={cat}
                          value={cat}
                          onSelect={() => {
                            setCategoryFilter(prev =>
                              prev.includes(cat)
                                ? prev.filter(c => c !== cat)
                                : [...prev, cat]
                            );
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              categoryFilter.includes(cat) ? "opacity-100" : "opacity-0"
                            )}
                          />
                          {cat}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>

            {/* Stock level filter */}
            <Select
              value={stockLevelFilter}
              onValueChange={(v) => setStockLevelFilter(v as StockLevel)}
            >
              <SelectTrigger className="h-8 w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(['all', 'in_stock', 'low_stock', 'out_of_stock'] as StockLevel[]).map(
                  (level) => (
                    <SelectItem key={level} value={level}>
                      {STOCK_LEVEL_LABELS[level]}
                    </SelectItem>
                  )
                )}
              </SelectContent>
            </Select>

            {/* Reset filters */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchQuery('');
                setStockLevelFilter('all');
                setCategoryFilter([]);
              }}
              className="h-8"
            >
              Reset
            </Button>

            <div className="w-px h-6 bg-gray-200" />

            {/* Toggle stats */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowStats(!showStats)}
                  className="h-8 w-8 p-0"
                >
                  {showStats ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {showStats ? 'Hide statistics' : 'Show statistics'}
              </TooltipContent>
            </Tooltip>

            {/* Refresh */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={loadItems}
                  className="h-8 w-8 p-0"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Refresh data</TooltipContent>
            </Tooltip>

            {/* Export */}
            <Button
              variant="ghost"
              size="sm"
              onClick={exportCSV}
              className="gap-1 h-8"
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Export</span>
            </Button>

            {/* Delete selected */}
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDeleteItems}
              disabled={selectedIds.size === 0 || isDeleting}
              className="gap-1 h-8"
            >
              {isDeleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              {selectedIds.size > 0 && (
                <Badge variant="secondary" className="h-5 px-1 text-xs">
                  {selectedIds.size}
                </Badge>
              )}
            </Button>

            {/* Create new */}
            <Button
              size="sm"
              onClick={() => {
                resetForm();
                setIsCreateDialogOpen(true);
              }}
              className="gap-1 h-8 bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Add Item</span>
            </Button>
          </div>
        </div>

        {/* Stats */}
        {showStats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white border rounded-lg px-4 py-3">
              <p className="text-xs text-gray-500 flex items-center gap-1">
                <Package className="h-3 w-3" /> Total Items
              </p>
              <p className="text-lg font-semibold">{stats.totalItems}</p>
            </div>
            <div className="bg-white border rounded-lg px-4 py-3">
              <p className="text-xs text-gray-500 flex items-center gap-1">
                <Box className="h-3 w-3" /> Total Stock
              </p>
              <p className="text-lg font-semibold">
                {stats.totalStock.toFixed(2)}
                <span className="text-xs text-gray-500 ml-2">
                  ({stats.totalAvailable.toFixed(2)} available)
                </span>
              </p>
            </div>
            <div className="bg-white border rounded-lg px-4 py-3">
              <p className="text-xs text-gray-500 flex items-center gap-1">
                <DollarSign className="h-3 w-3" /> Total Value
              </p>
              <p className="text-lg font-semibold">
                {new Intl.NumberFormat('en-US', {
                  style: 'currency',
                  currency: 'PHP',
                  minimumFractionDigits: 2,
                }).format(stats.totalValue)}
              </p>
            </div>
            <div className="bg-white border rounded-lg px-4 py-3">
              <p className="text-xs text-gray-500 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" /> Alerts
              </p>
              <p className="text-lg font-semibold flex gap-2 flex-wrap">
                {stats.lowStockCount > 0 && (
                  <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                    {stats.lowStockCount} low
                  </Badge>
                )}
                {stats.outOfStockCount > 0 && (
                  <Badge variant="secondary" className="bg-red-100 text-red-800">
                    {stats.outOfStockCount} out
                  </Badge>
                )}
                {stats.lowStockCount === 0 && stats.outOfStockCount === 0 && (
                  <span className="text-green-600 text-base">All good</span>
                )}
              </p>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="border rounded-lg overflow-x-auto bg-white shadow-sm">
          <Table>
            <TableHeader className="bg-gray-100">
              <TableRow>
                <TableHead className="w-10 px-3">
                  <Checkbox
                    checked={
                      filteredAndSorted.length > 0 &&
                      selectedIds.size === filteredAndSorted.length
                    }
                    onCheckedChange={toggleSelectAll}
                    aria-label="Select all"
                  />
                </TableHead>
                {COLUMNS.map((col) => (
                  <TableHead
                    key={col.key}
                    className={cn(
                      col.sortable && 'cursor-pointer hover:bg-gray-200 transition-colors'
                    )}
                    onClick={() => col.sortable && toggleSort(col.key)}
                  >
                    <div className="flex items-center gap-1">
                      {col.label}
                      {sortConfig?.key === col.key ? (
                        sortConfig.direction === 'asc' ? (
                          <ChevronUp className="h-3 w-3" />
                        ) : (
                          <ChevronDown className="h-3 w-3" />
                        )
                      ) : col.sortable ? (
                        <ArrowUpDown className="h-3 w-3 text-gray-400" />
                      ) : null}
                    </div>
                  </TableHead>
                ))}
                <TableHead className="w-[100px] text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSorted.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={COLUMNS.length + 2}
                    className="h-24 text-center text-gray-400"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <Package className="h-8 w-8 text-gray-300" />
                      <p>No inventory items found</p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          resetForm();
                          setIsCreateDialogOpen(true);
                        }}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Add your first item
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredAndSorted.map((item) => {
                  const totalStock = getTotalStock(item);
                  const reserved = getReservedStock(item);
                  const available = getAvailableStock(item);
                  const unitPrice = getUnitPrice(item);
                  const reorderLevel = getReorderLevel(item);
                  const level = getStockLevel(item, reorderLevel);
                  const categories = getCategories(item);

                  return (
                    <TableRow
                      key={item.id}
                      className={cn(
                        'hover:bg-gray-50/50',
                        level === 'low_stock' && 'bg-yellow-50/30 hover:bg-yellow-50/50',
                        level === 'out_of_stock' && 'bg-red-50/30 hover:bg-red-50/50'
                      )}
                    >
                      <TableCell className="w-10 px-3">
                        <Checkbox
                          checked={selectedIds.has(item.id)}
                          onCheckedChange={() => toggleSelect(item.id)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        <div>
                          <p>{item.title || item.sku}</p>
                          {item.description && (
                            <p className="text-xs text-gray-500 truncate max-w-[200px]">
                              {item.description}
                            </p>
                          )}
                          {/* Reserved items collapsible */}
                          <ReservedItemsCollapsible item={item} />
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{item.sku}</TableCell>
                      <TableCell className="font-mono">
                        {totalStock.toFixed(2)}
                      </TableCell>
                      <TableCell className="font-mono">
                        {reserved.toFixed(2)}
                      </TableCell>
                      <TableCell className="font-mono">
                        <span
                          className={cn(
                            'font-semibold',
                            available === 0 && 'text-red-600',
                            available > 0 && available <= reorderLevel && 'text-yellow-600'
                          )}
                        >
                          {available.toFixed(2)}
                        </span>
                      </TableCell>
                      <TableCell className="font-mono">
                        {unitPrice > 0
                          ? new Intl.NumberFormat('en-US', {
                              style: 'currency',
                              currency: 'PHP',
                              minimumFractionDigits: 2,
                            }).format(unitPrice)
                          : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={cn(
                            'text-xs font-medium',
                            STOCK_LEVEL_BADGE_COLORS[level]
                          )}
                        >
                          {STOCK_LEVEL_LABELS[level]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {categories.map(cat => (
                            <Badge
                              key={cat}
                              variant="outline"
                              className="text-xs bg-gray-50"
                            >
                              {cat}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openStockDialog(item)}
                                className="h-7 w-7 p-0"
                              >
                                <Box className="h-3.5 w-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Manage stock</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEditDialog(item)}
                                className="h-7 w-7 p-0"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Edit item</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={async () => {
                                  if (confirm(`Delete "${item.title || item.sku}"?`)) {
                                    try {
                                      const result = await deleteInventoryItem(item.id);
                                      if (result.success) {
                                        setItems((prev) => prev.filter((i) => i.id !== item.id));
                                        setTotalCount((prev) => prev - 1);
                                        toast.success('Item deleted successfully');
                                      } else {
                                        throw new Error(result.error || 'Failed to delete item');
                                      }
                                    } catch (err: any) {
                                      toast.error(err.message || 'Failed to delete item');
                                    }
                                  }
                                }}
                                className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Delete item</TooltipContent>
                          </Tooltip>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Footer */}
        <div className="flex justify-between text-sm text-gray-500">
          <span>
            Showing {filteredAndSorted.length} of {totalCount} items
          </span>
          {selectedIds.size > 0 && (
            <span className="text-blue-600 font-medium">
              {selectedIds.size} item(s) selected
            </span>
          )}
        </div>
{/* ==================== CREATE DIALOG ==================== */}
<Dialog
  open={isCreateDialogOpen}
  onOpenChange={(open) => {
    if (!open) {
      setIsCreateDialogOpen(false);
      resetForm();
    }
  }}
>
  <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
    <DialogHeader>
      <DialogTitle className="flex items-center gap-2">
        <Package className="h-5 w-5" />
        Add New Inventory Item
      </DialogTitle>
      <DialogDescription>
        Enter the details of the new item to add to your inventory.
      </DialogDescription>
    </DialogHeader>
    
    {formErrors.general && (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Form Error</AlertTitle>
        <AlertDescription>{formErrors.general}</AlertDescription>
      </Alert>
    )}

    <div className="grid gap-4 py-4">
      {/* SKU */}
      <div className="grid grid-cols-4 items-start gap-4">
        <Label htmlFor="sku" className="text-right pt-2">
          SKU <span className="text-red-500">*</span>
        </Label>
        <div className="col-span-3 space-y-1">
          <Input
            id="sku"
            placeholder="SKU code"
            value={formData.sku}
            onChange={(e) => {
              setFormData({ ...formData, sku: e.target.value });
              if (formErrors.sku) setFormErrors({ ...formErrors, sku: undefined });
            }}
            className={cn(formErrors.sku && "border-red-500 focus:ring-red-500")}
          />
          {formErrors.sku && (
            <p className="text-sm text-red-500 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {formErrors.sku}
            </p>
          )}
        </div>
      </div>

      {/* Title */}
      <div className="grid grid-cols-4 items-start gap-4">
        <Label htmlFor="title" className="text-right pt-2">
          Title
        </Label>
        <div className="col-span-3">
          <Autocomplete
            value={formData.title}
            onChange={(value) => setFormData((prev) => ({ ...prev, title: value }))}
            items={items}
            placeholder="Search or enter title..."
            emptyMessage="No existing items found"
          />
        </div>
      </div>

      {/* Description */}
      <div className="grid grid-cols-4 items-start gap-4">
        <Label htmlFor="description" className="text-right pt-2">
          Description
        </Label>
        <Textarea
          id="description"
          placeholder="Item description"
          value={formData.description}
          onChange={(e) =>
            setFormData({ ...formData, description: e.target.value })
          }
          className="col-span-3"
          rows={3}
        />
      </div>

      {/* Categories */}
      <div className="grid grid-cols-4 items-start gap-4">
        <Label htmlFor="categories" className="text-right pt-2">
          Categories <span className="text-red-500">*</span>
        </Label>
        <div className="col-span-3">
          <CategoryMultiCombobox
            value={formData.categories}
            onChange={(val) => {
              setFormData({ ...formData, categories: val });
              if (formErrors.categories) setFormErrors({ ...formErrors, categories: undefined });
            }}
            categories={allCategories}
            error={formErrors.categories}
          />
        </div>
      </div>

      {/* Unit of Measure - Updated with predefined options */}
      <div className="grid grid-cols-4 items-start">
        <Label htmlFor="unit_of_measure" className="text-right pt-2">
          <span>Unit of Measure </span><span className="text-red-500">*</span>
        </Label>
        <div className="col-span-3 space-y-1">
          <Select
            value={formData.unit_of_measure}
            onValueChange={(value) => {
              setFormData({ ...formData, unit_of_measure: value });
              if (formErrors.unit_of_measure) setFormErrors({ ...formErrors, unit_of_measure: undefined });
            }}
          >
            <SelectTrigger className={cn(formErrors.unit_of_measure && "border-red-500 focus:ring-red-500")}>
              <SelectValue placeholder="Select unit of measure" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pcs">Pieces (pcs)</SelectItem>
              <SelectItem value="kg">Kilograms (kg)</SelectItem>
              <SelectItem value="g">Grams (g)</SelectItem>
              <SelectItem value="L">Liters (L)</SelectItem>
              <SelectItem value="gal">Gallons (gal)</SelectItem>
              <SelectItem value="dozen">Dozen (dozen)</SelectItem>
              <SelectItem value="sheet">Sheet (sheet)</SelectItem>
              <SelectItem value="pair">Pair (pair)</SelectItem>
              <SelectItem value="set">Set (set)</SelectItem>
              <SelectItem value="each">Each (each)</SelectItem>
            </SelectContent>
          </Select>
          {formErrors.unit_of_measure && (
            <p className="text-sm text-red-500 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {formErrors.unit_of_measure}
            </p>
          )}
        </div>
      </div>

      {/* Unit Price */}
      <div className="grid grid-cols-4 items-start gap-4">
        <Label htmlFor="unit_price" className="text-right pt-2">
          Unit Price
        </Label>
        <div className="col-span-3 space-y-1">
          <Input
            id="unit_price"
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            value={formData.unit_price || ''}
            onChange={(e) => {
              setFormData({
                ...formData,
                unit_price: parseFloat(e.target.value) || 0,
              });
              if (formErrors.unit_price) setFormErrors({ ...formErrors, unit_price: undefined });
            }}
            className={cn(formErrors.unit_price && "border-red-500 focus:ring-red-500")}
          />
          {formErrors.unit_price && (
            <p className="text-sm text-red-500 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {formErrors.unit_price}
            </p>
          )}
        </div>
      </div>

      {/* Reorder Level */}
      <div className="grid grid-cols-4 items-start gap-4">
        <Label htmlFor="reorder_level" className="text-right pt-2">
          Reorder Level
        </Label>
        <div className="col-span-3 space-y-1">
          <Input
            id="reorder_level"
            type="number"
            step="0.01"
            min="0"
            placeholder="10"
            value={formData.reorder_level || ''}
            onChange={(e) => {
              setFormData({
                ...formData,
                reorder_level: parseFloat(e.target.value) || 0,
              });
              if (formErrors.reorder_level) setFormErrors({ ...formErrors, reorder_level: undefined });
            }}
            className={cn(formErrors.reorder_level && "border-red-500 focus:ring-red-500")}
          />
          {formErrors.reorder_level && (
            <p className="text-sm text-red-500 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {formErrors.reorder_level}
            </p>
          )}
        </div>
      </div>

      {/* Initial Stock Level */}
      <div className="grid grid-cols-4 items-start gap-4">
        <Label htmlFor="stocked_level" className="text-right pt-2">
          Initial Stock
        </Label>
        <div className="col-span-3 space-y-1">
          <Input
            id="stocked_level"
            type="number"
            step="0.01"
            min="0"
            placeholder="0"
            value={formData.stocked_level || ''}
            onChange={(e) => {
              setFormData({
                ...formData,
                stocked_level: parseFloat(e.target.value) || 0,
              });
              if (formErrors.stocked_level) setFormErrors({ ...formErrors, stocked_level: undefined });
            }}
            className={cn(formErrors.stocked_level && "border-red-500 focus:ring-red-500")}
          />
          {formErrors.stocked_level && (
            <p className="text-sm text-red-500 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {formErrors.stocked_level}
            </p>
          )}
        </div>
      </div>
    </div>
    <DialogFooter>
      <Button
        variant="outline"
        onClick={() => {
          setIsCreateDialogOpen(false);
          resetForm();
        }}
      >
        Cancel
      </Button>
      <Button
        onClick={handleCreateItem}
        disabled={isCreating}
        className="bg-blue-600 hover:bg-blue-700"
      >
        {isCreating && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
        Create Item
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>

{/* ==================== EDIT DIALOG ==================== */}
<Dialog
  open={isEditDialogOpen}
  onOpenChange={(open) => {
    if (!open) {
      setIsEditDialogOpen(false);
      setEditingItem(null);
      resetForm();
    }
  }}
>
  <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto p-2">
    <DialogHeader>
      <DialogTitle className="flex items-center gap-2">
        <Package className="h-5 w-5" />
        Edit Inventory Item
      </DialogTitle>
      <DialogDescription>
        Update the details of this inventory item.
      </DialogDescription>
    </DialogHeader>

    {formErrors.general && (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Form Error</AlertTitle>
        <AlertDescription>{formErrors.general}</AlertDescription>
      </Alert>
    )}

    <div className="grid gap-4 py-4">
      {/* SKU */}
      <div className="grid grid-cols-4 items-start gap-4">
        <Label htmlFor="edit-sku" className="text-right pt-2">
          SKU <span className="text-red-500">*</span>
        </Label>
        <div className="col-span-3 space-y-1">
          <Input
            id="edit-sku"
            placeholder="SKU code"
            value={formData.sku}
            onChange={(e) => {
              setFormData({ ...formData, sku: e.target.value });
              if (formErrors.sku) setFormErrors({ ...formErrors, sku: undefined });
            }}
            className={cn(formErrors.sku && "border-red-500 focus:ring-red-500")}
          />
          {formErrors.sku && (
            <p className="text-sm text-red-500 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {formErrors.sku}
            </p>
          )}
        </div>
      </div>

      {/* Title */}
      <div className="grid grid-cols-4 items-start gap-4">
        <Label htmlFor="title" className="text-right pt-2">
          Title
        </Label>
        <div className="col-span-3">
          <Autocomplete
            value={formData.title}
            onChange={(value) => setFormData((prev) => ({ ...prev, title: value }))}
            items={items}
            placeholder="Search or enter title..."
            emptyMessage="No existing items found"
          />
        </div>
      </div>

      {/* Description */}
      <div className="grid grid-cols-4 items-start gap-4">
        <Label htmlFor="edit-description" className="text-right pt-2">
          Description
        </Label>
        <Textarea
          id="edit-description"
          placeholder="Item description"
          value={formData.description}
          onChange={(e) =>
            setFormData({ ...formData, description: e.target.value })
          }
          className="col-span-3"
          rows={3}
        />
      </div>

      {/* Categories */}
      <div className="grid grid-cols-4 items-start gap-4">
        <Label htmlFor="edit-categories" className="text-right pt-2">
          Categories <span className="text-red-500">*</span>
        </Label>
        <div className="col-span-3">
          <CategoryMultiCombobox
            value={formData.categories}
            onChange={(val) => {
              setFormData({ ...formData, categories: val });
              if (formErrors.categories) setFormErrors({ ...formErrors, categories: undefined });
            }}
            categories={allCategories}
            error={formErrors.categories}
          />
        </div>
      </div>

      {/* Unit of Measure - Updated with predefined options */}
      <div className="grid grid-cols-4 items-start">
        <Label htmlFor="edit-unit_of_measure" className="text-right pt-2">
          <span>Unit of Measure </span><span className="text-red-500">*</span>
        </Label>
        <div className="col-span-3 space-y-1">
          <Select
            value={formData.unit_of_measure}
            onValueChange={(value) => {
              setFormData({ ...formData, unit_of_measure: value });
              if (formErrors.unit_of_measure) setFormErrors({ ...formErrors, unit_of_measure: undefined });
            }}
          >
            <SelectTrigger className={cn(formErrors.unit_of_measure && "border-red-500 focus:ring-red-500")}>
              <SelectValue placeholder="Select unit of measure" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pcs">Pieces (pcs)</SelectItem>
              <SelectItem value="kg">Kilograms (kg)</SelectItem>
              <SelectItem value="g">Grams (g)</SelectItem>
              <SelectItem value="L">Liters (L)</SelectItem>
              <SelectItem value="gal">Gallons (gal)</SelectItem>
              <SelectItem value="dozen">Dozen (dozen)</SelectItem>
              <SelectItem value="sheet">Sheet (sheet)</SelectItem>
              <SelectItem value="pair">Pair (pair)</SelectItem>
              <SelectItem value="set">Set (set)</SelectItem>
              <SelectItem value="each">Each (each)</SelectItem>
            </SelectContent>
          </Select>
          {formErrors.unit_of_measure && (
            <p className="text-sm text-red-500 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {formErrors.unit_of_measure}
            </p>
          )}
        </div>
      </div>

      {/* Unit Price */}
      <div className="grid grid-cols-4 items-start gap-4">
        <Label htmlFor="edit-unit_price" className="text-right pt-2">
          Unit Price
        </Label>
        <div className="col-span-3 space-y-1">
          <Input
            id="edit-unit_price"
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            value={formData.unit_price || ''}
            onChange={(e) => {
              setFormData({
                ...formData,
                unit_price: parseFloat(e.target.value) || 0,
              });
              if (formErrors.unit_price) setFormErrors({ ...formErrors, unit_price: undefined });
            }}
            className={cn(formErrors.unit_price && "border-red-500 focus:ring-red-500")}
          />
          {formErrors.unit_price && (
            <p className="text-sm text-red-500 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {formErrors.unit_price}
            </p>
          )}
        </div>
      </div>

      {/* Reorder Level */}
      <div className="grid grid-cols-4 items-start gap-4">
        <Label htmlFor="edit-reorder_level" className="text-right pt-2">
          Reorder Level
        </Label>
        <div className="col-span-3 space-y-1">
          <Input
            id="edit-reorder_level"
            type="number"
            step="0.01"
            min="0"
            placeholder="10"
            value={formData.reorder_level || ''}
            onChange={(e) => {
              setFormData({
                ...formData,
                reorder_level: parseFloat(e.target.value) || 0,
              });
              if (formErrors.reorder_level) setFormErrors({ ...formErrors, reorder_level: undefined });
            }}
            className={cn(formErrors.reorder_level && "border-red-500 focus:ring-red-500")}
          />
          {formErrors.reorder_level && (
            <p className="text-sm text-red-500 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {formErrors.reorder_level}
            </p>
          )}
        </div>
      </div>
    </div>
    <DialogFooter>
      <Button
        variant="outline"
        onClick={() => {
          setIsEditDialogOpen(false);
          setEditingItem(null);
          resetForm();
        }}
      >
        Cancel
      </Button>
      <Button
        onClick={handleEditItem}
        disabled={isUpdating}
        className="bg-blue-600 hover:bg-blue-700"
      >
        {isUpdating && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
        Update Item
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>

        {/* ==================== STOCK MANAGEMENT DIALOG ==================== */}
        <Dialog
          open={isStockDialogOpen}
          onOpenChange={(open) => {
            if (!open) {
              setIsStockDialogOpen(false);
              setStockManagingItem(null);
              setStockFormErrors({});
            }
          }}
        >
          <DialogContent className="sm:max-w-[500px] p-2">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Box className="h-5 w-5" />
                Manage Stock Levels
              </DialogTitle>
              <DialogDescription>
                {stockManagingItem && (
                  <span>
                    Adjust stock for <strong>{stockManagingItem.title || stockManagingItem.sku}</strong>
                  </span>
                )}
              </DialogDescription>
            </DialogHeader>

            {stockFormErrors.general && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Stock Update Error</AlertTitle>
                <AlertDescription>{stockFormErrors.general}</AlertDescription>
              </Alert>
            )}

            <div className="grid gap-4 py-4">
              {stockManagingItem && stockFormData.location_id && (
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <h4 className="text-sm font-medium text-gray-700">Current Stock</h4>
                  {(() => {
                    const currentLevel = stockManagingItem.location_levels?.find(
                      (l) => l.location_id === stockFormData.location_id
                    );
                    return (
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-gray-500">Stocked:</span>{' '}
                          <span className="font-mono">
                            {currentLevel?.stocked_quantity?.toFixed(2) || '0.00'}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">Reserved:</span>{' '}
                          <span className="font-mono">
                            {currentLevel?.reserved_quantity?.toFixed(2) || '0.00'}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">Available:</span>{' '}
                          <span className="font-mono">
                            {currentLevel?.available_quantity?.toFixed(2) || '0.00'}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">Incoming:</span>{' '}
                          <span className="font-mono">
                            {currentLevel?.incoming_quantity?.toFixed(2) || '0.00'}
                          </span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Adjustment Type */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="adjustment_type" className="text-right">
                  Operation
                </Label>
                <Select
                  value={stockFormData.adjustment_type}
                  onValueChange={(v: any) =>
                    setStockFormData({ ...stockFormData, adjustment_type: v })
                  }
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="set">Set to quantity</SelectItem>
                    <SelectItem value="add">Add quantity</SelectItem>
                    <SelectItem value="subtract">Subtract quantity</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Quantity */}
              <div className="grid grid-cols-4 items-start gap-4">
                <Label htmlFor="adjustment_quantity" className="text-right pt-2">
                  Quantity <span className="text-red-500">*</span>
                </Label>
                <div className="col-span-3 space-y-1">
                  <Input
                    id="adjustment_quantity"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={stockFormData.adjustment_quantity || ''}
                    onChange={(e) => {
                      setStockFormData({
                        ...stockFormData,
                        adjustment_quantity: parseFloat(e.target.value) || 0,
                      });
                      if (stockFormErrors.adjustment_quantity) {
                        setStockFormErrors({ ...stockFormErrors, adjustment_quantity: undefined });
                      }
                    }}
                    className={cn(
                      stockFormErrors.adjustment_quantity && "border-red-500 focus:ring-red-500"
                    )}
                  />
                  {stockFormErrors.adjustment_quantity && (
                    <p className="text-sm text-red-500 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {stockFormErrors.adjustment_quantity}
                    </p>
                  )}
                </div>
              </div>

              {/* Location selector if multiple locations */}
              {locations.length > 1 && (
                <div className="grid grid-cols-4 items-start gap-4">
                  <Label htmlFor="location" className="text-right pt-2">
                    Location <span className="text-red-500">*</span>
                  </Label>
                  <div className="col-span-3 space-y-1">
                    <Select
                      value={stockFormData.location_id}
                      onValueChange={(v) => {
                        setStockFormData({ ...stockFormData, location_id: v });
                        if (stockFormErrors.location_id) {
                          setStockFormErrors({ ...stockFormErrors, location_id: undefined });
                        }
                      }}
                    >
                      <SelectTrigger className={cn(
                        stockFormErrors.location_id && "border-red-500 focus:ring-red-500"
                      )}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {locations.map((loc) => (
                          <SelectItem key={loc.id} value={loc.id}>
                            {loc.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {stockFormErrors.location_id && (
                      <p className="text-sm text-red-500 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {stockFormErrors.location_id}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsStockDialogOpen(false);
                  setStockManagingItem(null);
                  setStockFormErrors({});
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleStockAdjustment}
                disabled={isAdjustingStock}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isAdjustingStock && (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                )}
                Update Stock
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}

export default InventoryTable;