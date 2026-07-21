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

// ---------- Types (unchanged) ----------
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

// ---------- Stock level helpers (unchanged) ----------
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

const getCategory = (item: InventoryItem): string => {
  return item.metadata?.category || 'Uncategorized';
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

// ---------- Column configuration (unchanged) ----------
const COLUMNS = [
  { key: 'title', label: 'Inventory Name', sortable: true },
  { key: 'sku', label: 'SKU', sortable: true },
  { key: 'total_stock', label: 'Stock', sortable: true },
  { key: 'reserved', label: 'Reserved', sortable: true },
  { key: 'available', label: 'Available', sortable: true },
  { key: 'unit_price', label: 'Unit Price', sortable: true },
  { key: 'stock_level', label: 'Stock Level', sortable: false },
];

// ---------- Main Component ----------
export function InventoryTable({ user }: any) {
  // Data state
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [locations, setLocations] = useState<Location[]>([
    { id: 'default', name: 'Default Location' },
  ]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);

  // UI state
  const [searchQuery, setSearchQuery] = useState('');
  const [stockLevelFilter, setStockLevelFilter] = useState<StockLevel>('all');
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
    category: 'General',
    location: 'Default',
    origin_country: '',
    requires_shipping: false,
  });

  const [stockFormData, setStockFormData] = useState({
    location_id: 'default',
    adjustment_quantity: 0,
    adjustment_type: 'set' as 'set' | 'add' | 'subtract',
  });

  // Combobox state
  const [comboboxOpen, setComboboxOpen] = useState(false);

  // Loading states for operations
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isAdjustingStock, setIsAdjustingStock] = useState(false);

  // ---------- Data fetching (unchanged) ----------
  const loadItems = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await fetchInventoryItemsByLocation(user?.stockLocationId);
      if (result) {
        const transformedItems: InventoryItem[] = result.map((item: any) => ({
          id: item.id,
          sku: item.sku || '',
          title: item.title || item.sku,
          description: item.description || '',
          requires_shipping: item.requires_shipping || false,
          thumbnail: item.thumbnail,
          origin_country: item.origin_country,
          metadata: item.metadata || {},
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
      }
    } catch (err) {
      console.error('Failed to load inventory:', err);
      setError('Failed to load inventory items. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [user?.stockLocationId]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  // ---------- Load inventory levels for an item (unchanged) ----------
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
      }
    } catch (err) {
      console.error('Failed to load inventory levels:', err);
    }
  };

  // ---------- Filtering and sorting (unchanged) ----------
  const filteredAndSorted = useMemo(() => {
    let result = [...items];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (item) =>
          item.title?.toLowerCase().includes(q) ||
          item.sku?.toLowerCase().includes(q) ||
          item.description?.toLowerCase().includes(q)
      );
    }

    if (stockLevelFilter !== 'all') {
      result = result.filter(
        (item) => getStockLevel(item, getReorderLevel(item)) === stockLevelFilter
      );
    }

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
  }, [items, searchQuery, stockLevelFilter, sortConfig]);

  // ---------- Selection handlers (unchanged) ----------
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

  // ---------- CRUD Operations (unchanged) ----------
  const handleCreateItem = async () => {
    if (!formData.sku.trim()) {
      toast.error('SKU is required');
      return;
    }

    setIsCreating(true);
    try {
      const response = await createInventoryItem({
        sku: formData.sku.trim(),
        title: formData.title.trim() || formData.sku.trim(),
        description: formData.description.trim(),
        requires_shipping: formData.requires_shipping,
        origin_country: formData.origin_country || undefined,
        metadata: {
          unit_price: formData.unit_price,
          reorder_level: formData.reorder_level,
          category: formData.category,
          location: formData.location,
          company_id: user?.companyId,
          location_id: user?.stockLocationId,
        },
      });

      if (response.success) {
        const newItem: any = {
          ...response.data,
          location_levels: [],
        };

        setItems((prev) => [newItem, ...prev]);
        setTotalCount((prev) => prev + 1);
        toast.success('Inventory item created successfully');
        setIsCreateDialogOpen(false);
        resetForm();
      } else {
        throw new Error(response.error || 'Failed to create item');
      }
    } catch (err: any) {
      console.error('Failed to create item:', err);
      toast.error(err.message || 'Failed to create inventory item');
    } finally {
      setIsCreating(false);
    }
  };

  const handleEditItem = async () => {
    if (!editingItem || !formData.sku.trim()) return;

    setIsUpdating(true);
    try {
      const response = await updateInventoryItem(editingItem.id, {
        sku: formData.sku.trim(),
        title: formData.title.trim() || formData.sku.trim(),
        description: formData.description.trim(),
        requires_shipping: formData.requires_shipping,
        origin_country: formData.origin_country || undefined,
        metadata: {
          ...editingItem.metadata,
          unit_price: formData.unit_price,
          reorder_level: formData.reorder_level,
          category: formData.category,
          location: formData.location,
        },
      });

      if (response.success && response.inventoryItem) {
        setItems((prev) =>
          prev.map((item) =>
            item.id === editingItem.id
              ? { ...item, ...response.inventoryItem }
              : item
          )
        );
        toast.success('Inventory item updated successfully');
        setIsEditDialogOpen(false);
        setEditingItem(null);
        resetForm();
      } else {
        throw new Error(response.error || 'Failed to update item');
      }
    } catch (err: any) {
      console.error('Failed to update item:', err);
      toast.error(err.message || 'Failed to update inventory item');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteItems = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedIds.size} item(s)?`)) return;

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
      toast.success(`Successfully deleted ${selectedIds.size} item(s)`);
    } catch (err: any) {
      console.error('Failed to delete items:', err);
      toast.error(err.message || 'Failed to delete some items');
      await loadItems();
    } finally {
      setIsDeleting(false);
    }
  };

  const handleStockAdjustment = async () => {
    if (!stockManagingItem || !stockFormData.location_id) {
      toast.error('Please select a location');
      return;
    }

    setIsAdjustingStock(true);
    try {
      const currentLevel = stockManagingItem.location_levels?.find(
        (level) => level.location_id === stockFormData.location_id
      );

      let newQuantity = stockFormData.adjustment_quantity;

      if (stockFormData.adjustment_type === 'add') {
        newQuantity = (currentLevel?.stocked_quantity || 0) + stockFormData.adjustment_quantity;
      } else if (stockFormData.adjustment_type === 'subtract') {
        newQuantity = Math.max(0, (currentLevel?.stocked_quantity || 0) - stockFormData.adjustment_quantity);
      }

      const response = await updateInventoryLevel(
        stockManagingItem.id,
        stockFormData.location_id,
        newQuantity
      );

      if (response.success) {
        await loadItemLevels(stockManagingItem.id);
        toast.success('Stock updated successfully');
        setIsStockDialogOpen(false);
        setStockManagingItem(null);
      } else {
        throw new Error(response.error || 'Failed to update stock');
      }
    } catch (err: any) {
      console.error('Failed to update stock:', err);
      toast.error(err.message || 'Failed to update stock levels');
    } finally {
      setIsAdjustingStock(false);
    }
  };

  // ---------- Form handlers ----------
  const openEditDialog = (item: InventoryItem) => {
    setEditingItem(item);
    setFormData({
      title: item.title || '',
      sku: item.sku,
      description: item.description || '',
      unit_price: getUnitPrice(item),
      reorder_level: getReorderLevel(item),
      category: getCategory(item),
      location: getLocation(item),
      origin_country: item.origin_country || '',
      requires_shipping: item.requires_shipping || false,
    });
    setIsEditDialogOpen(true);
  };

  const openStockDialog = async (item: InventoryItem) => {
    if (!item.location_levels || item.location_levels.length === 0) {
      await loadItemLevels(item.id);
    }
    setStockManagingItem(item);
    setStockFormData({
      location_id: item.location_levels?.[0]?.location_id || locations[0]?.id || 'default',
      adjustment_quantity: 0,
      adjustment_type: 'set',
    });
    setIsStockDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      title: '',
      sku: '',
      description: '',
      unit_price: 0,
      reorder_level: 10,
      category: 'General',
      location: 'Default',
      origin_country: '',
      requires_shipping: false,
    });
    setComboboxOpen(false);
  };

  // ---------- Combobox handlers ----------
  const handleTitleSelect = (selectedValue: string) => {
    setComboboxOpen(false);
    if (selectedValue === 'create') {
      // Create new item: keep the title as typed, clear other fields
      const typedTitle = formData.title.trim();
      setFormData({
        title: typedTitle,
        sku: '',
        description: '',
        unit_price: 0,
        reorder_level: 10,
        category: 'General',
        location: 'Default',
        origin_country: '',
        requires_shipping: false,
      });
      // Optionally focus SKU field
      return;
    }

    // Find the selected item
    const selectedItem = items.find((item) => item.id === selectedValue);
    if (!selectedItem) return;

    // Populate form with selected item's data
    setFormData({
      title: selectedItem.title || '',
      sku: selectedItem.sku,
      description: selectedItem.description || '',
      unit_price: getUnitPrice(selectedItem),
      reorder_level: getReorderLevel(selectedItem),
      category: getCategory(selectedItem),
      location: getLocation(selectedItem),
      origin_country: selectedItem.origin_country || '',
      requires_shipping: selectedItem.requires_shipping || false,
    });
  };

  // ---------- Export (unchanged) ----------
  const exportCSV = () => {
    const headers = COLUMNS.map((c) => c.label).join(',');
    const rows = items.map((item) =>
      COLUMNS.map((col) => {
        switch (col.key) {
          case 'title':
            return `"${item.title || ''}"`;
          case 'sku':
            return item.sku;
          case 'total_stock':
            return getTotalStock(item);
          case 'reserved':
            return getReservedStock(item);
          case 'available':
            return getAvailableStock(item);
          case 'unit_price':
            return getUnitPrice(item);
          case 'stock_level':
            return STOCK_LEVEL_LABELS[getStockLevel(item, getReorderLevel(item))];
          default:
            return '';
        }
      }).join(',')
    );

    const csv = [headers, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inventory_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ---------- Stats (unchanged) ----------
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

  // ---------- Sorting handler (unchanged) ----------
  const toggleSort = (key: string) => {
    setSortConfig((prev) =>
      prev?.key === key
        ? { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
        : { key, direction: 'asc' }
    );
  };

  // ---------- Loading state (unchanged) ----------
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


  console.log(items, 'ITEMSS')
  // ---------- Render ----------
  return (
    <TooltipProvider>
      <div className="space-y-4 p-4">
        {/* Error banner (unchanged) */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center justify-between">
            <span className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" /> {error}
            </span>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={loadItems}>
                <RefreshCw className="h-4 w-4" /> Retry
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setError(null)}>
                ×
              </Button>
            </div>
          </div>
        )}

        {/* Toolbar (unchanged) */}
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

        {/* Stats (unchanged) */}
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
                {stats.totalStock}
                <span className="text-xs text-gray-500 ml-2">
                  ({stats.totalAvailable} available)
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
                  currency: 'USD',
                  minimumFractionDigits: 0,
                }).format(stats.totalValue)}
              </p>
            </div>
            <div className="bg-white border rounded-lg px-4 py-3">
              <p className="text-xs text-gray-500 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" /> Alerts
              </p>
              <p className="text-lg font-semibold flex gap-2">
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

        {/* Table (unchanged) */}
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
                    No inventory items found
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
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm ">{item.sku}</TableCell>
                      <TableCell className="font-mono">{totalStock}</TableCell>
                      <TableCell className="font-mono">{reserved}</TableCell>
                      <TableCell className="font-mono">
                        <span
                          className={cn(
                            'font-semibold',
                            available === 0 && 'text-red-600',
                            available > 0 && available <= reorderLevel && 'text-yellow-600'
                          )}
                        >
                          {available}
                        </span>
                      </TableCell>
                      <TableCell className="font-mono">
                        {unitPrice > 0
                          ? new Intl.NumberFormat('en-US', {
                              style: 'currency',
                              currency: 'USD',
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

        {/* Footer (unchanged) */}
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

        {/* Create Dialog with Autocomplete Combobox */}
<Dialog
  open={isCreateDialogOpen}
  onOpenChange={(open) => {
    if (!open) {
      setIsCreateDialogOpen(false);
      resetForm();
    }
  }}
>
  <DialogContent className="sm:max-w-[500px]">
    <DialogHeader>
      <DialogTitle className="flex items-center gap-2">
        <Package className="h-5 w-5" />
        Add New Inventory Item
      </DialogTitle>
      <DialogDescription>
        Enter the details of the new item to add to your inventory. You can also
        select an existing item to pre‑fill the form.
      </DialogDescription>
    </DialogHeader>
    <div className="grid gap-4 py-4">
      {/* Title with Autocomplete */}
      <div className="grid grid-cols-4 items-start gap-4">
        <Label htmlFor="title" className="text-right pt-2">
          Title
        </Label>
        <div className="col-span-3">
          <Autocomplete
            value={formData.title}
            onChange={(value) => setFormData((prev) => ({ ...prev, title: value }))}
            items={items}
            onSelect={(item) => {
              if (item.isNew) {
                // Handle create new
                handleTitleSelect('create');
              } else {
                handleTitleSelect(item.id);
              }
            }}
            placeholder="Search or enter title..."
            emptyMessage="No existing items found"
            createNewLabel="Create new item"
          />
        </div>
      </div>

      {/* SKU */}
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="sku" className="text-right">
          SKU <span className="text-red-500">*</span>
        </Label>
        <Input
          id="sku"
          placeholder="SKU code"
          value={formData.sku}
          onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
          className="col-span-3"
        />
      </div>

      {/* Description */}
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="description" className="text-right">
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

      {/* Category */}
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="category" className="text-right">
          Category
        </Label>
        <Input
          id="category"
          placeholder="Category"
          value={formData.category}
          onChange={(e) =>
            setFormData({ ...formData, category: e.target.value })
          }
          className="col-span-3"
        />
      </div>

      {/* Unit Price */}
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="unit_price" className="text-right">
          Unit Price
        </Label>
        <Input
          id="unit_price"
          type="number"
          step="0.01"
          min="0"
          placeholder="0.00"
          value={formData.unit_price || ''}
          onChange={(e) =>
            setFormData({
              ...formData,
              unit_price: parseFloat(e.target.value) || 0,
            })
          }
          className="col-span-3"
        />
      </div>

      {/* Reorder Level */}
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="reorder_level" className="text-right">
          Reorder Level
        </Label>
        <Input
          id="reorder_level"
          type="number"
          min="0"
          placeholder="10"
          value={formData.reorder_level || ''}
          onChange={(e) =>
            setFormData({
              ...formData,
              reorder_level: parseInt(e.target.value) || 0,
            })
          }
          className="col-span-3"
        />
      </div>

      {/* Location */}
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="location" className="text-right">
          Location
        </Label>
        <Input
          id="location"
          placeholder="Location"
          value={formData.location}
          onChange={(e) =>
            setFormData({ ...formData, location: e.target.value })
          }
          className="col-span-3"
        />
      </div>

      {/* Origin Country */}
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="origin_country" className="text-right">
          Origin Country
        </Label>
        <Input
          id="origin_country"
          placeholder="e.g., US"
          value={formData.origin_country}
          onChange={(e) =>
            setFormData({ ...formData, origin_country: e.target.value })
          }
          className="col-span-3"
        />
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

        {/* Edit Dialog – unchanged (title input remains as plain Input) */}
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
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Edit Inventory Item
              </DialogTitle>
              <DialogDescription>
                Update the details of this inventory item.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-sku" className="text-right">
                  SKU <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="edit-sku"
                  placeholder="SKU code"
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-title" className="text-right">
                  Title
                </Label>
                <Input
                  id="edit-title"
                  placeholder="Item name"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-description" className="text-right">
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
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-category" className="text-right">
                  Category
                </Label>
                <Input
                  id="edit-category"
                  placeholder="Category"
                  value={formData.category}
                  onChange={(e) =>
                    setFormData({ ...formData, category: e.target.value })
                  }
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-unit_price" className="text-right">
                  Unit Price
                </Label>
                <Input
                  id="edit-unit_price"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={formData.unit_price || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      unit_price: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-reorder_level" className="text-right">
                  Reorder Level
                </Label>
                <Input
                  id="edit-reorder_level"
                  type="number"
                  min="0"
                  placeholder="10"
                  value={formData.reorder_level || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      reorder_level: parseInt(e.target.value) || 0,
                    })
                  }
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-location" className="text-right">
                  Location
                </Label>
                <Input
                  id="edit-location"
                  placeholder="Location"
                  value={formData.location}
                  onChange={(e) =>
                    setFormData({ ...formData, location: e.target.value })
                  }
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-origin_country" className="text-right">
                  Origin Country
                </Label>
                <Input
                  id="edit-origin_country"
                  placeholder="e.g., US"
                  value={formData.origin_country}
                  onChange={(e) =>
                    setFormData({ ...formData, origin_country: e.target.value })
                  }
                  className="col-span-3"
                />
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

        {/* Stock Management Dialog (unchanged) */}
        <Dialog
          open={isStockDialogOpen}
          onOpenChange={(open) => {
            if (!open) {
              setIsStockDialogOpen(false);
              setStockManagingItem(null);
            }
          }}
        >
          <DialogContent className="sm:max-w-[500px]">
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
                          <span className="font-mono">{currentLevel?.stocked_quantity || 0}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Reserved:</span>{' '}
                          <span className="font-mono">{currentLevel?.reserved_quantity || 0}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Available:</span>{' '}
                          <span className="font-mono">{currentLevel?.available_quantity || 0}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Incoming:</span>{' '}
                          <span className="font-mono">{currentLevel?.incoming_quantity || 0}</span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="stock_location" className="text-right">
                  Location
                </Label>
                <Select
                  value={stockFormData.location_id}
                  onValueChange={(value) =>
                    setStockFormData({ ...stockFormData, location_id: value })
                  }
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map((loc) => (
                      <SelectItem key={loc.id} value={loc.id}>
                        {loc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="adjustment_type" className="text-right">
                  Type
                </Label>
                <Select
                  value={stockFormData.adjustment_type}
                  onValueChange={(value: 'set' | 'add' | 'subtract') =>
                    setStockFormData({ ...stockFormData, adjustment_type: value })
                  }
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="set">Set exact quantity</SelectItem>
                    <SelectItem value="add">Add to stock</SelectItem>
                    <SelectItem value="subtract">Remove from stock</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="adjustment_quantity" className="text-right">
                  Quantity
                </Label>
                <Input
                  id="adjustment_quantity"
                  type="number"
                  min="0"
                  placeholder="0"
                  value={stockFormData.adjustment_quantity || ''}
                  onChange={(e) =>
                    setStockFormData({
                      ...stockFormData,
                      adjustment_quantity: parseInt(e.target.value) || 0,
                    })
                  }
                  className="col-span-3"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsStockDialogOpen(false);
                  setStockManagingItem(null);
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