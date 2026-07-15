'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
import {
  Plus,
  Trash2,
  Search,
  ChevronUp,
  ChevronDown,
  Download,
  RefreshCw,
  Package,
  AlertCircle,
  Box,
  DollarSign,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  listInventoryItems,
  deleteInventoryItem,
  createInventoryItem,
} from '@/lib/actions/inventory';

// Types
interface InventoryItem {
  id: string;
  title: string;
  sku: string;
  description?: string;
  unit_price?: number;
  stock?: number;
  reorder_level?: number;
  location?: string;
  category?: string;
  supplier?: string;
  created_at?: string;
  updated_at?: string;
}

interface InventoryTableProps {
  initialItems?: InventoryItem[];
  onInventoryChange?: (items: InventoryItem[]) => void;
  readOnly?: boolean;
}

// Column configuration with responsive breakpoints
const COLUMNS = [
  { key: 'title', label: 'Item Name', visible: true },
  { key: 'sku', label: 'SKU', visible: true },
  { key: 'category', label: 'Category', visible: { base: false, sm: true } },
  { key: 'unit_price', label: 'Unit Price', visible: { base: false, md: true } },
  { key: 'stock', label: 'Stock', visible: { base: false, sm: true } },
  { key: 'reorder_level', label: 'Reorder Level', visible: { base: false, lg: true } },
  { key: 'location', label: 'Location', visible: { base: false, md: true } },
];

const CATEGORIES = ['Apparel', 'Outerwear', 'Footwear', 'Accessories', 'Electronics', 'Home Goods'];
const LOCATIONS = ['Warehouse A', 'Warehouse B', 'Warehouse C', 'Showroom', 'Storage'];

export function InventoryTable({
  initialItems = [],
  onInventoryChange,
  readOnly = false,
}: InventoryTableProps) {
  // State – initialised once with the prop value
  const [items, setItems] = useState<InventoryItem[]>(initialItems);
  const [loading, setLoading] = useState(!initialItems.length);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [locationFilter, setLocationFilter] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newItemData, setNewItemData] = useState<Partial<InventoryItem>>({
    title: '',
    sku: '',
    category: 'Apparel',
    unit_price: 0,
    stock: 0,
    reorder_level: 10,
    location: 'Warehouse A',
    description: '',
    supplier: '',
  });

  // Ref to prevent multiple loads
  const hasLoadedRef = useRef(false);

  // Load items – only called once on mount if initialItems is empty
  const loadItems = useCallback(async () => {
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;
    try {
      setLoading(true);
      setError(null);
      const result = await listInventoryItems(1000, 0, {});
      if (result.items) {
        setItems(result.items);
        // Notify parent, but parent will re‑render with new initialItems – we ignore that
        if (onInventoryChange) onInventoryChange(result.items);
      }
    } catch (err) {
      console.error('Failed to load inventory:', err);
      setError('Failed to load inventory. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [onInventoryChange]);

  // Run once on mount: load if no initial items, else just use the provided items
  useEffect(() => {
    if (initialItems.length > 0) {
      // We already have items from parent – no need to load
      setItems(initialItems);
      setLoading(false);
    } else if (!hasLoadedRef.current) {
      loadItems();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps – runs only once

  // Filter and sort (memoized)
  const filteredAndSortedItems = useMemo(() => {
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

    if (categoryFilter !== 'all') {
      result = result.filter((item) => (item.category || 'Uncategorized') === categoryFilter);
    }

    if (locationFilter !== 'all') {
      result = result.filter((item) => (item.location || 'Warehouse A') === locationFilter);
    }

    if (sortConfig) {
      result.sort((a, b) => {
        const aVal = a[sortConfig.key as keyof InventoryItem];
        const bVal = b[sortConfig.key as keyof InventoryItem];
        if (aVal === undefined || aVal === null) return 1;
        if (bVal === undefined || bVal === null) return -1;
        if (typeof aVal === 'string' && typeof bVal === 'string') {
          return sortConfig.direction === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
        }
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
        }
        return 0;
      });
    }

    return result;
  }, [items, searchQuery, categoryFilter, locationFilter, sortConfig]);

  // Selection handlers
  const toggleSelectAll = () => {
    if (selectedIds.size === filteredAndSortedItems.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredAndSortedItems.map((item) => item.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  // Delete selected
  const deleteSelected = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedIds.size} item(s)?`)) return;

    setIsDeleting(true);
    try {
      const ids = Array.from(selectedIds);
      await Promise.all(ids.map((id) => deleteInventoryItem(id)));
      const remainingItems = items.filter((item) => !selectedIds.has(item.id));
      setItems(remainingItems);
      setSelectedIds(new Set());
      if (onInventoryChange) onInventoryChange(remainingItems);
    } catch (err) {
      console.error('Failed to delete items:', err);
      alert('Failed to delete some items. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Add item
  const handleAddItem = async () => {
    if (!newItemData.title?.trim()) {
      alert('Please enter an item name.');
      return;
    }
    if (!newItemData.sku?.trim()) {
      alert('Please enter an SKU.');
      return;
    }

    setIsCreating(true);
    try {
      const result = await createInventoryItem({
        title: newItemData.title.trim(),
        sku: newItemData.sku.trim(),
        requires_shipping: false,
        description: newItemData.description || '',
        metadata: {
        category: newItemData.category || 'Apparel',
        unit_price: newItemData.unit_price || 0,
        stock: newItemData.stock || 0,
        reorder_level: newItemData.reorder_level || 10,
        location: newItemData.location || 'Warehouse A',
        supplier: newItemData.supplier || ''
        }

      });

      if (result.success && result.inventoryItem) {
        const newItem = result.inventoryItem;
        const newItems = [newItem, ...items];
        setItems(newItems);
        if (onInventoryChange) onInventoryChange(newItems);
        setIsDialogOpen(false);
        setNewItemData({
          title: '',
          sku: '',
          category: 'Apparel',
          unit_price: 0,
          stock: 0,
          reorder_level: 10,
          location: 'Warehouse A',
          description: '',
          supplier: '',
        });
      } else {
        alert('Failed to create item: ' + result.error);
      }
    } catch (err) {
      console.error('Failed to create item:', err);
      alert('Failed to create item. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  // Export CSV
  const exportCSV = () => {
    const headers = COLUMNS.map((col) => col.label).join(',');
    const rows = items.map((item) =>
      COLUMNS.map((col) => {
        const value = item[col.key as keyof InventoryItem];
        if (value === undefined || value === null) return '';
        if (typeof value === 'string' && value.includes(',')) return `"${value}"`;
        return String(value);
      }).join(',')
    );
    const csv = [headers, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inventory_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Stats
  const totalItems = items.length;
  const totalStock = items.reduce((sum, item) => sum + (item.stock || 0), 0);
  const totalValue = items.reduce((sum, item) => sum + (item.unit_price || 0) * (item.stock || 0), 0);
  const lowStockItems = items.filter(
    (i) => i.stock !== undefined && i.reorder_level !== undefined && i.stock <= i.reorder_level
  ).length;
  const filteredCount = filteredAndSortedItems.length;

  const toggleSort = (key: string) => {
    setSortConfig((prev) => {
      if (prev?.key === key) {
        return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key, direction: 'asc' };
    });
  };

  const renderValue = (item: InventoryItem, key: string) => {
    const val = item[key as keyof InventoryItem];
    if (val === undefined || val === null) return '-';
    if (key === 'unit_price') {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val as number);
    }
    return String(val);
  };

  // Loading state
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <Skeleton className="h-10 w-40" />
          <div className="flex gap-2">
            <Skeleton className="h-9 w-20" />
            <Skeleton className="h-9 w-20" />
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
        <Skeleton className="h-[400px]" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center justify-between">
          <span className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            {error}
          </span>
          <Button variant="ghost" size="sm" onClick={() => setError(null)}>
            <span className="sr-only">Dismiss</span>×
          </Button>
        </div>
      )}

      {/* Toolbar – unchanged */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white border rounded-lg px-4 py-3 shadow-sm">
        <div className="flex flex-wrap items-center gap-4 w-full sm:w-auto">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-gray-500" />
            <span className="font-semibold text-gray-700">Inventory</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="font-mono">
              {totalItems} items
            </Badge>
            {lowStockItems > 0 && (
              <Badge variant="destructive" className="font-mono flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {lowStockItems} low stock
              </Badge>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-initial">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 w-full sm:w-[200px] h-8"
            />
          </div>

          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="h-8 w-[130px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {CATEGORIES.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={locationFilter} onValueChange={setLocationFilter}>
            <SelectTrigger className="h-8 w-[130px]">
              <SelectValue placeholder="Location" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Locations</SelectItem>
              {LOCATIONS.map((loc) => (
                <SelectItem key={loc} value={loc}>
                  {loc}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearchQuery('');
              setCategoryFilter('all');
              setLocationFilter('all');
            }}
            className="h-8"
          >
            Reset
          </Button>

          <div className="w-px h-6 bg-gray-200" />

          <Button variant="ghost" size="sm" onClick={exportCSV} className="gap-1 h-8">
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Export</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              hasLoadedRef.current = false;
              loadItems();
            }}
            className="h-8 w-8 p-0"
            title="Refresh"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>

          {!readOnly && (
            <>
              <Button
                variant="destructive"
                size="sm"
                onClick={deleteSelected}
                disabled={selectedIds.size === 0 || isDeleting}
                className="gap-1 h-8"
              >
                {isDeleting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                <span className="hidden sm:inline">Delete</span>
                {selectedIds.size > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 px-1 text-xs">
                    {selectedIds.size}
                  </Badge>
                )}
              </Button>

              <Button
                size="sm"
                onClick={() => setIsDialogOpen(true)}
                className="gap-1 h-8 bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Add</span>
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Stats – unchanged */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white border rounded-lg px-4 py-3">
          <p className="text-xs text-gray-500 flex items-center gap-1">
            <Package className="h-3 w-3" /> Total Items
          </p>
          <p className="text-lg font-semibold">{totalItems}</p>
        </div>
        <div className="bg-white border rounded-lg px-4 py-3">
          <p className="text-xs text-gray-500 flex items-center gap-1">
            <Box className="h-3 w-3" /> Total Stock
          </p>
          <p className="text-lg font-semibold">{totalStock}</p>
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
              maximumFractionDigits: 0,
            }).format(totalValue)}
          </p>
        </div>
        <div className="bg-white border rounded-lg px-4 py-3">
          <p className="text-xs text-gray-500 flex items-center gap-1">
            <AlertCircle className="h-3 w-3" /> Low Stock
          </p>
          <p className={cn('text-lg font-semibold', lowStockItems > 0 ? 'text-red-600' : 'text-green-600')}>
            {lowStockItems}
          </p>
        </div>
      </div>

      {/* Table – unchanged */}
      <div className="border rounded-lg overflow-x-auto bg-white shadow-sm">
        <Table>
          <TableHeader className="bg-gray-100">
            <TableRow>
              <TableHead className="w-10 px-3">
                <Checkbox
                  checked={
                    filteredAndSortedItems.length > 0 &&
                    selectedIds.size === filteredAndSortedItems.length
                  }
                  onCheckedChange={toggleSelectAll}
                  aria-label="Select all"
                />
              </TableHead>
              {COLUMNS.map((col) => (
                <TableHead
                  key={col.key}
                  className={cn(
                    'cursor-pointer hover:bg-gray-200 transition-colors',
                    typeof col.visible === 'object' && col.visible.base === false
                      ? 'hidden'
                      : ''
                  )}
                  onClick={() => toggleSort(col.key)}
                >
                  <div className="flex items-center gap-1">
                    {col.label}
                    {sortConfig?.key === col.key &&
                      (sortConfig.direction === 'asc' ? (
                        <ChevronUp className="h-3 w-3" />
                      ) : (
                        <ChevronDown className="h-3 w-3" />
                      ))}
                  </div>
                </TableHead>
              ))}
              {!readOnly && <TableHead className="w-16 text-center">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAndSortedItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={COLUMNS.length + 2} className="h-24 text-center text-gray-400">
                  No items found
                </TableCell>
              </TableRow>
            ) : (
              filteredAndSortedItems.map((item) => {
                const isLowStock =
                  item.stock !== undefined &&
                  item.reorder_level !== undefined &&
                  item.stock <= item.reorder_level;
                return (
                  <TableRow
                    key={item.id}
                    className={cn(
                      'hover:bg-gray-50/50',
                      isLowStock && 'bg-red-50/30 hover:bg-red-50/50'
                    )}
                  >
                    <TableCell className="w-10 px-3">
                      <Checkbox
                        checked={selectedIds.has(item.id)}
                        onCheckedChange={() => toggleSelect(item.id)}
                        aria-label={`Select ${item.title}`}
                      />
                    </TableCell>
                    {COLUMNS.map((col) => {
                      const isVisible =
                        typeof col.visible === 'object'
                          ? col.visible.base !== false
                          : col.visible !== false;
                      return (
                        <TableCell
                          key={`${item.id}-${col.key}`}
                          className={cn(
                            'py-2',
                            !isVisible && 'hidden',
                            col.key === 'unit_price' && 'font-mono text-right',
                            col.key === 'stock' && 'font-mono text-center',
                            col.key === 'reorder_level' && 'font-mono text-center'
                          )}
                        >
                          {renderValue(item, col.key)}
                        </TableCell>
                      );
                    })}
                    {!readOnly && (
                      <TableCell className="w-16 text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={async () => {
                            if (confirm(`Delete "${item.title}"?`)) {
                              try {
                                await deleteInventoryItem(item.id);
                                const remaining = items.filter((i) => i.id !== item.id);
                                setItems(remaining);
                                if (onInventoryChange) onInventoryChange(remaining);
                              } catch (err) {
                                alert('Failed to delete item.');
                              }
                            }
                          }}
                          className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span className="sr-only">Delete</span>
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Footer info */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between text-sm text-gray-500 gap-2">
        <div>
          Showing {filteredCount} of {totalItems} items
        </div>
        <div className="flex gap-2">
          {selectedIds.size > 0 && <span>{selectedIds.size} selected</span>}
        </div>
      </div>

      {/* Add Item Dialog – unchanged */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
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
          <div className="grid gap-4 py-4">
            {/* ... form fields (same as before) */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="itemName" className="text-right text-sm">
                Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="itemName"
                placeholder="Item name"
                value={newItemData.title || ''}
                onChange={(e) => setNewItemData({ ...newItemData, title: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="itemSku" className="text-right text-sm">
                SKU <span className="text-red-500">*</span>
              </Label>
              <Input
                id="itemSku"
                placeholder="SKU"
                value={newItemData.sku || ''}
                onChange={(e) => setNewItemData({ ...newItemData, sku: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="itemCategory" className="text-right text-sm">
                Category
              </Label>
              <Select
                value={newItemData.category || 'Apparel'}
                onValueChange={(value) => setNewItemData({ ...newItemData, category: value })}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="itemPrice" className="text-right text-sm">
                Unit Price
              </Label>
              <Input
                id="itemPrice"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={newItemData.unit_price ?? ''}
                onChange={(e) =>
                  setNewItemData({
                    ...newItemData,
                    unit_price: parseFloat(e.target.value) || 0,
                  })
                }
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="itemStock" className="text-right text-sm">
                Stock
              </Label>
              <Input
                id="itemStock"
                type="number"
                min="0"
                placeholder="0"
                value={newItemData.stock ?? ''}
                onChange={(e) =>
                  setNewItemData({
                    ...newItemData,
                    stock: parseInt(e.target.value) || 0,
                  })
                }
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="itemReorder" className="text-right text-sm">
                Reorder Level
              </Label>
              <Input
                id="itemReorder"
                type="number"
                min="0"
                placeholder="10"
                value={newItemData.reorder_level ?? ''}
                onChange={(e) =>
                  setNewItemData({
                    ...newItemData,
                    reorder_level: parseInt(e.target.value) || 0,
                  })
                }
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="itemLocation" className="text-right text-sm">
                Location
              </Label>
              <Select
                value={newItemData.location || 'Warehouse A'}
                onValueChange={(value) => setNewItemData({ ...newItemData, location: value })}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  {LOCATIONS.map((loc) => (
                    <SelectItem key={loc} value={loc}>
                      {loc}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="itemDescription" className="text-right text-sm">
                Description
              </Label>
              <Input
                id="itemDescription"
                placeholder="Brief description"
                value={newItemData.description || ''}
                onChange={(e) =>
                  setNewItemData({ ...newItemData, description: e.target.value })
                }
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="itemSupplier" className="text-right text-sm">
                Supplier
              </Label>
              <Input
                id="itemSupplier"
                placeholder="Supplier name"
                value={newItemData.supplier || ''}
                onChange={(e) =>
                  setNewItemData({ ...newItemData, supplier: e.target.value })
                }
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddItem} disabled={isCreating} className="bg-blue-600 hover:bg-blue-700">
              {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add Item'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Example usage (unchanged)
export function InventoryPage() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);

  return (
    <div className="container mx-auto py-4 sm:py-8 px-2 sm:px-4 max-w-7xl">
      <h1 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6 flex items-center gap-2">
        <Package className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600" />
        Inventory Management
      </h1>
      <InventoryTable initialItems={inventory} onInventoryChange={setInventory} />
    </div>
  );
}

export default InventoryTable;