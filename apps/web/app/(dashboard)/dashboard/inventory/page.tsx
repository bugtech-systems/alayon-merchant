'use client'

import React, { useState, useCallback, useRef, useEffect, useMemo, KeyboardEvent } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Badge } from '@/components/ui/badge';
import {
  Plus,
  Trash2,
  Copy,
  Search,
  ChevronUp,
  ChevronDown,
  ArrowUpDown,
  FileSpreadsheet,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Types
interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  category: string;
  unitPrice: number | null;
  stock: number | null;
  reorderLevel: number | null;
  location: string;
}

interface SpreadsheetCell {
  rowId: string;
  colKey: string;
  value: any;
  isEditing: boolean;
  isSelected: boolean;
}

interface SpreadsheetProps {
  initialItems?: InventoryItem[];
  onInventoryChange?: (items: InventoryItem[]) => void;
}

// Mock data
const MOCK_INVENTORY: InventoryItem[] = [
  {
    id: 'inv_1',
    name: 'Premium Hoodie - Black',
    sku: 'PH-BLK-001',
    category: 'Apparel',
    unitPrice: 45.00,
    stock: 150,
    reorderLevel: 20,
    location: 'Warehouse A',
  },
  {
    id: 'inv_2',
    name: 'Premium Hoodie - White',
    sku: 'PH-WHT-001',
    category: 'Apparel',
    unitPrice: 45.00,
    stock: 85,
    reorderLevel: 20,
    location: 'Warehouse A',
  },
  {
    id: 'inv_3',
    name: 'Cotton T-Shirt - White',
    sku: 'CT-WHT-001',
    category: 'Apparel',
    unitPrice: 25.00,
    stock: 200,
    reorderLevel: 30,
    location: 'Warehouse B',
  },
  {
    id: 'inv_4',
    name: 'Denim Jacket - Blue',
    sku: 'DJ-BLU-001',
    category: 'Outerwear',
    unitPrice: 89.00,
    stock: 45,
    reorderLevel: 10,
    location: 'Warehouse A',
  },
];

const SUGGESTED_ITEMS = [
  { name: 'Premium Hoodie - Black', sku: 'PH-BLK-001', category: 'Apparel' },
  { name: 'Premium Hoodie - White', sku: 'PH-WHT-001', category: 'Apparel' },
  { name: 'Premium Hoodie - Gray', sku: 'PH-GRY-001', category: 'Apparel' },
  { name: 'Cotton T-Shirt - White', sku: 'CT-WHT-001', category: 'Apparel' },
  { name: 'Cotton T-Shirt - Black', sku: 'CT-BLK-001', category: 'Apparel' },
  { name: 'Denim Jacket - Blue', sku: 'DJ-BLU-001', category: 'Outerwear' },
  { name: 'Denim Jacket - Black', sku: 'DJ-BLK-001', category: 'Outerwear' },
  { name: 'Running Shoes - White', sku: 'RS-WHT-001', category: 'Footwear' },
  { name: 'Running Shoes - Black', sku: 'RS-BLK-001', category: 'Footwear' },
  { name: 'Leather Backpack', sku: 'LB-001', category: 'Accessories' },
];

const COLUMNS = [
  { key: 'name', label: 'Item Name', width: '200px', type: 'text' },
  { key: 'sku', label: 'SKU', width: '120px', type: 'text' },
  { key: 'category', label: 'Category', width: '120px', type: 'text' },
  { key: 'unitPrice', label: 'Unit Price', width: '120px', type: 'number' },
  { key: 'stock', label: 'Stock', width: '100px', type: 'number' },
  { key: 'reorderLevel', label: 'Reorder Level', width: '120px', type: 'number' },
  { key: 'location', label: 'Location', width: '130px', type: 'text' },
];

export function Spreadsheet({ 
  initialItems = MOCK_INVENTORY,
  onInventoryChange 
}: SpreadsheetProps) {
  const [items, setItems] = useState<InventoryItem[]>(initialItems);
  const [selectedCell, setSelectedCell] = useState<{ rowId: string; colKey: string } | null>(null);
  const [editingCell, setEditingCell] = useState<{ rowId: string; colKey: string } | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchRowId, setSearchRowId] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState<{ rowId: string; colKey: string } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragValue, setDragValue] = useState<any>(null);
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  
  const spreadsheetRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const cellRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Filter suggestions based on search
  const filteredSuggestions = useMemo(() => {
    if (!searchQuery) return SUGGESTED_ITEMS;
    const query = searchQuery.toLowerCase();
    return SUGGESTED_ITEMS.filter(item =>
      item.name.toLowerCase().includes(query) ||
      item.sku.toLowerCase().includes(query) ||
      item.category.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  // Check if item exists
  const isItemInInventory = useCallback((name: string, sku: string) => {
    return items.some(item => 
      item.name.toLowerCase() === name.toLowerCase() || 
      item.sku.toLowerCase() === sku.toLowerCase()
    );
  }, [items]);

  // Sort items
  const sortedItems = useMemo(() => {
    if (!sortConfig) return items;
    
    return [...items].sort((a, b) => {
      const aVal = a[sortConfig.key as keyof InventoryItem];
      const bVal = b[sortConfig.key as keyof InventoryItem];
      
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;
      
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
  }, [items, sortConfig]);

  // Handle cell click
  const handleCellClick = (rowId: string, colKey: string) => {
    setSelectedCell({ rowId, colKey });
    setEditingCell(null);
  };

  // Handle cell double click to edit
  const handleCellDoubleClick = (rowId: string, colKey: string) => {
    setEditingCell({ rowId, colKey });
    setSelectedCell({ rowId, colKey });
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        inputRef.current.select();
      }
    }, 10);
  };

  // Handle cell value change
  const handleCellChange = (rowId: string, colKey: string, value: any) => {
    setItems(prev => prev.map(item => {
      if (item.id === rowId) {
        return { ...item, [colKey]: value };
      }
      return item;
    }));

    if (onInventoryChange) {
      const updatedItems = items.map(item => {
        if (item.id === rowId) {
          return { ...item, [colKey]: value };
        }
        return item;
      });
      onInventoryChange(updatedItems);
    }
  };

  // Handle cell blur
  const handleCellBlur = () => {
    setEditingCell(null);
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: KeyboardEvent, rowId: string, colKey: string) => {
    const colIndex = COLUMNS.findIndex(col => col.key === colKey);
    const rowIndex = sortedItems.findIndex(item => item.id === rowId);
    
    switch (e.key) {
      case 'Enter':
        e.preventDefault();
        if (editingCell) {
          setEditingCell(null);
        } else {
          setEditingCell({ rowId, colKey });
          setTimeout(() => {
            if (inputRef.current) {
              inputRef.current.focus();
              inputRef.current.select();
            }
          }, 10);
        }
        break;
      
      case 'Tab':
        e.preventDefault();
        const nextCol = e.shiftKey ? colIndex - 1 : colIndex + 1;
        if (nextCol >= 0 && nextCol < COLUMNS.length) {
          setSelectedCell({ rowId, colKey: COLUMNS[nextCol].key });
        } else if (e.shiftKey && rowIndex > 0) {
          setSelectedCell({ rowId: sortedItems[rowIndex - 1].id, colKey: COLUMNS[COLUMNS.length - 1].key });
        } else if (!e.shiftKey && rowIndex < sortedItems.length - 1) {
          setSelectedCell({ rowId: sortedItems[rowIndex + 1].id, colKey: COLUMNS[0].key });
        }
        break;
      
      case 'ArrowUp':
        e.preventDefault();
        if (rowIndex > 0) {
          setSelectedCell({ rowId: sortedItems[rowIndex - 1].id, colKey });
        }
        break;
      
      case 'ArrowDown':
        e.preventDefault();
        if (rowIndex < sortedItems.length - 1) {
          setSelectedCell({ rowId: sortedItems[rowIndex + 1].id, colKey });
        }
        break;
      
      case 'ArrowLeft':
        e.preventDefault();
        if (colIndex > 0) {
          setSelectedCell({ rowId, colKey: COLUMNS[colIndex - 1].key });
        }
        break;
      
      case 'ArrowRight':
        e.preventDefault();
        if (colIndex < COLUMNS.length - 1) {
          setSelectedCell({ rowId, colKey: COLUMNS[colIndex + 1].key });
        }
        break;
      
      case 'Delete':
      case 'Backspace':
        if (!editingCell) {
          e.preventDefault();
          handleCellChange(rowId, colKey, null);
        }
        break;
      
      case 'Escape':
        setEditingCell(null);
        setSelectedCell(null);
        break;
    }
  };

  // Handle drag start
  const handleMouseDown = (e: React.MouseEvent, rowId: string, colKey: string) => {
    const cell = e.currentTarget as HTMLDivElement;
    const rect = cell.getBoundingClientRect();
    const isInDragHandle = e.clientX > rect.right - 10 && e.clientY > rect.bottom - 10;
    
    if (isInDragHandle) {
      const value = items.find(item => item.id === rowId)?.[colKey as keyof InventoryItem];
      setDragStart({ rowId, colKey });
      setDragValue(value);
      setIsDragging(true);
      e.preventDefault();
    }
  };

  // Handle drag over
  const handleMouseEnter = (e: React.MouseEvent, rowId: string, colKey: string) => {
    if (!isDragging || !dragStart) return;
    
    const targetRow = items.find(item => item.id === rowId);
    const targetCol = COLUMNS.find(col => col.key === colKey);
    
    if (targetRow && targetCol && dragValue !== null && dragValue !== undefined) {
      const colType = targetCol.type;
      let value = dragValue;
      
      if (colType === 'number' && typeof dragValue === 'number') {
        handleCellChange(rowId, colKey, dragValue);
      } else if (colType === 'text' && typeof dragValue === 'string') {
        handleCellChange(rowId, colKey, dragValue);
      }
    }
  };

  // End drag
  const handleMouseUp = () => {
    setIsDragging(false);
    setDragStart(null);
    setDragValue(null);
  };

  // Add new row
  const addNewRow = () => {
    const newId = `inv_new_${Date.now()}`;
    const newRow: InventoryItem = {
      id: newId,
      name: '',
      sku: '',
      category: '',
      unitPrice: null,
      stock: null,
      reorderLevel: null,
      location: '',
    };
    setItems(prev => [...prev, newRow]);
    setSelectedCell({ rowId: newId, colKey: 'name' });
    setEditingCell({ rowId: newId, colKey: 'name' });
    setSearchRowId(newId);
    setSearchOpen(true);
    
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, 10);
  };

  // Delete row
  const deleteRow = (rowId: string) => {
    if (items.length <= 1) {
      alert('Cannot delete the last item. Add more items first.');
      return;
    }
    
    const item = items.find(i => i.id === rowId);
    if (item?.name && !confirm(`Delete "${item.name}" from inventory?`)) {
      return;
    }
    
    setItems(prev => prev.filter(item => item.id !== rowId));
    setSelectedCell(null);
    setEditingCell(null);
    
    if (onInventoryChange) {
      onInventoryChange(items.filter(item => item.id !== rowId));
    }
  };

  // Copy row
  const copyRow = (rowId: string) => {
    const item = items.find(i => i.id === rowId);
    if (!item) return;
    
    const newId = `inv_copy_${Date.now()}`;
    const newRow: InventoryItem = {
      ...item,
      id: newId,
      name: `${item.name} (Copy)`,
    };
    setItems(prev => [...prev, newRow]);
    setSelectedCell({ rowId: newId, colKey: 'name' });
  };

  // Select item from search
  const selectItemFromSearch = (item: typeof SUGGESTED_ITEMS[0]) => {
    if (isItemInInventory(item.name, item.sku)) {
      alert('This item already exists in your inventory!');
      return;
    }

    if (!searchRowId) return;

    setItems(prev => prev.map(row => {
      if (row.id === searchRowId) {
        return {
          ...row,
          name: item.name,
          sku: item.sku,
          category: item.category,
        };
      }
      return row;
    }));

    setSearchOpen(false);
    setSearchQuery('');
    setSearchRowId(null);
    setEditingCell(null);
  };

  // Toggle sort
  const toggleSort = (colKey: string) => {
    setSortConfig(prev => {
      if (prev?.key === colKey) {
        return { key: colKey, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key: colKey, direction: 'asc' };
    });
  };

  // Get cell value
  const getCellValue = (item: InventoryItem, colKey: string) => {
    return item[colKey as keyof InventoryItem];
  };

  // Format cell display
  const formatCellDisplay = (value: any, colKey: string) => {
    if (value === null || value === undefined) return '';
    
    if (colKey === 'unitPrice') {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
      }).format(value);
    }
    
    return String(value);
  };

  // Check if cell is being edited
  const isEditing = (rowId: string, colKey: string) => {
    return editingCell?.rowId === rowId && editingCell?.colKey === colKey;
  };

  // Check if cell is selected
  const isSelected = (rowId: string, colKey: string) => {
    return selectedCell?.rowId === rowId && selectedCell?.colKey === colKey;
  };

  // Render cell
  const renderCell = (item: InventoryItem, col: typeof COLUMNS[0]) => {
    const value = getCellValue(item, col.key);
    const editing = isEditing(item.id, col.key);
    const selected = isSelected(item.id, col.key);
    const isNameColumn = col.key === 'name';
    
    return (
      <div
        ref={el => {
          if (el) {
            cellRefs.current.set(`${item.id}-${col.key}`, el);
          }
        }}
        className={cn(
          "relative h-10 px-3 py-1 border-r border-b border-gray-200 cursor-cell select-none",
          "hover:bg-blue-50/30 transition-colors",
          selected && "ring-2 ring-blue-500 ring-inset bg-blue-50/50 z-10",
          editing && "ring-2 ring-blue-500 ring-inset bg-blue-50/50 z-20",
          isDragging && "cursor-copy",
          col.key === 'name' && "sticky left-0 bg-white z-10",
          isNameColumn && selected && "ring-2 ring-blue-500 ring-inset bg-blue-50/50 z-20"
        )}
        style={{ 
          width: col.width,
          minWidth: col.width,
          maxWidth: col.width,
        }}
        onClick={() => handleCellClick(item.id, col.key)}
        onDoubleClick={() => handleCellDoubleClick(item.id, col.key)}
        onMouseDown={(e) => handleMouseDown(e, item.id, col.key)}
        onMouseEnter={(e) => handleMouseEnter(e, item.id, col.key)}
        onKeyDown={(e) => handleKeyDown(e, item.id, col.key)}
        tabIndex={0}
      >
        {isNameColumn && editing ? (
          <Popover open={searchOpen && searchRowId === item.id} onOpenChange={setSearchOpen}>
            <PopoverTrigger asChild>
              <div className="relative w-full h-full">
                <Input
                  ref={inputRef}
                  type="text"
                  value={value as string || ''}
                  onChange={(e) => {
                    handleCellChange(item.id, col.key, e.target.value);
                    setSearchQuery(e.target.value);
                    setSearchOpen(true);
                  }}
                  onFocus={() => {
                    setSearchRowId(item.id);
                    setSearchOpen(true);
                  }}
                  onBlur={() => {
                    if (!searchOpen) {
                      handleCellBlur();
                    }
                  }}
                  className="h-full w-full border-0 bg-transparent p-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                  placeholder="Search or type..."
                  autoFocus
                />
                <Search className="absolute right-1 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              </div>
            </PopoverTrigger>
            <PopoverContent className="w-[400px] p-0" align="start">
              <Command>
                <CommandInput 
                  placeholder="Search items..." 
                  value={searchQuery}
                  onValueChange={setSearchQuery}
                />
                <CommandList>
                  <CommandEmpty>No items found.</CommandEmpty>
                  <CommandGroup heading="Suggested Items">
                    {filteredSuggestions.map((suggested) => (
                      <CommandItem
                        key={`${suggested.name}-${suggested.sku}`}
                        onSelect={() => selectItemFromSearch(suggested)}
                        className="flex items-center justify-between"
                      >
                        <div className="flex flex-col">
                          <span className="font-medium">{suggested.name}</span>
                          <span className="text-xs text-gray-500">
                            SKU: {suggested.sku} • {suggested.category}
                          </span>
                        </div>
                        {isItemInInventory(suggested.name, suggested.sku) && (
                          <Badge variant="outline" className="text-xs">
                            Already added
                          </Badge>
                        )}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        ) : editing ? (
          <Input
            ref={inputRef}
            type={col.type === 'number' ? 'number' : 'text'}
            step={col.type === 'number' ? '0.01' : undefined}
            min={col.type === 'number' ? '0' : undefined}
            value={value ?? ''}
            onChange={(e) => {
              const val = col.type === 'number' 
                ? e.target.value === '' ? null : parseFloat(e.target.value)
                : e.target.value;
              handleCellChange(item.id, col.key, val);
            }}
            onBlur={handleCellBlur}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                setEditingCell(null);
              }
              if (e.key === 'Escape') {
                setEditingCell(null);
                setSelectedCell(null);
              }
            }}
            className="h-full w-full border-0 bg-transparent p-0 focus-visible:ring-0 focus-visible:ring-offset-0"
            autoFocus
          />
        ) : (
          <div className={cn(
            "truncate",
            value === null || value === undefined ? "text-gray-400" : "",
            col.type === 'number' && "text-right font-mono"
          )}>
            {formatCellDisplay(value, col.key)}
          </div>
        )}
        
        {/* Drag handle */}
        {selected && !editing && (
          <div 
            className="absolute bottom-0 right-0 w-3 h-3 cursor-crosshair opacity-0 group-hover:opacity-100 hover:opacity-100"
            style={{
              background: 'linear-gradient(135deg, transparent 50%, #3b82f6 50%)',
              bottom: '-1px',
              right: '-1px',
            }}
          />
        )}
      </div>
    );
  };

  // Calculate summary stats
  const totalItems = items.length;
  const totalStock = items.reduce((sum, item) => sum + (item.stock || 0), 0);
  const totalValue = items.reduce((sum, item) => sum + (item.unitPrice || 0) * (item.stock || 0), 0);

  return (
    <div 
      className="w-full space-y-4"
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Toolbar */}
      <div className="flex items-center justify-between bg-white border rounded-lg px-4 py-3 shadow-sm">
        <div className="flex items-center gap-4">
          <FileSpreadsheet className="h-5 w-5 text-gray-500" />
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-mono">
              {totalItems} rows
            </Badge>
            <Badge variant="outline" className="font-mono">
              {COLUMNS.length} columns
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={addNewRow}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Row
          </Button>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white border rounded-lg px-4 py-2">
          <p className="text-xs text-gray-500">Total Items</p>
          <p className="text-lg font-semibold">{totalItems}</p>
        </div>
        <div className="bg-white border rounded-lg px-4 py-2">
          <p className="text-xs text-gray-500">Total Stock</p>
          <p className="text-lg font-semibold">{totalStock}</p>
        </div>
        <div className="bg-white border rounded-lg px-4 py-2">
          <p className="text-xs text-gray-500">Total Value</p>
          <p className="text-lg font-semibold">
            {new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: 'USD',
            }).format(totalValue)}
          </p>
        </div>
      </div>

      {/* Spreadsheet */}
      <div 
        ref={spreadsheetRef}
        className="border rounded-lg overflow-auto bg-white shadow-sm"
        style={{ maxHeight: '600px' }}
      >
        <div className="relative" style={{ minWidth: 'fit-content' }}>
          {/* Header Row */}
          <div className="flex sticky top-0 z-20 bg-gray-100 border-b border-gray-300">
            <div 
              className="flex-shrink-0 w-10 h-10 border-r border-gray-300 bg-gray-100"
              style={{ minWidth: '40px' }}
            />
            {COLUMNS.map((col) => (
              <div
                key={col.key}
                className={cn(
                  "flex items-center justify-between h-10 px-3 border-r border-gray-300 font-semibold text-sm cursor-pointer select-none",
                  "hover:bg-gray-200 transition-colors",
                  col.key === 'name' && "sticky left-10 bg-gray-100 z-10"
                )}
                style={{ 
                  width: col.width,
                  minWidth: col.width,
                  maxWidth: col.width,
                }}
                onClick={() => toggleSort(col.key)}
              >
                <span className="truncate">{col.label}</span>
                {sortConfig?.key === col.key && (
                  <span className="ml-1">
                    {sortConfig.direction === 'asc' ? (
                      <ChevronUp className="h-3 w-3" />
                    ) : (
                      <ChevronDown className="h-3 w-3" />
                    )}
                  </span>
                )}
              </div>
            ))}
            <div 
              className="flex-shrink-0 w-20 h-10 border-r border-gray-300 bg-gray-100 text-center text-sm font-semibold"
              style={{ minWidth: '80px' }}
            >
              Actions
            </div>
          </div>

          {/* Data Rows */}
          {sortedItems.map((item) => (
            <div key={item.id} className="flex hover:bg-gray-50/50">
              {/* Row Number */}
              <div 
                className={cn(
                  "flex-shrink-0 w-10 h-10 border-r border-b border-gray-200 flex items-center justify-center text-xs text-gray-400 font-mono bg-gray-50/50",
                  hoveredRow === item.id && "bg-gray-100"
                )}
                style={{ minWidth: '40px' }}
                onMouseEnter={() => setHoveredRow(item.id)}
                onMouseLeave={() => setHoveredRow(null)}
              >
                {items.indexOf(item) + 1}
              </div>

              {/* Cells */}
              {COLUMNS.map((col) => (
                <div key={`${item.id}-${col.key}`}>
                  {renderCell(item, col)}
                </div>
              ))}

              {/* Actions */}
              <div 
                className={cn(
                  "flex-shrink-0 w-20 h-10 border-r border-b border-gray-200 flex items-center justify-center gap-1 bg-white",
                  hoveredRow === item.id && "bg-gray-50"
                )}
                style={{ minWidth: '80px' }}
                onMouseEnter={() => setHoveredRow(item.id)}
                onMouseLeave={() => setHoveredRow(null)}
              >
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => copyRow(item.id)}
                  title="Copy row"
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                  onClick={() => deleteRow(item.id)}
                  title="Delete row"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}

          {/* Empty state */}
          {items.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
              <FileSpreadsheet className="h-16 w-16 mb-4" />
              <p className="text-lg font-medium">No inventory items</p>
              <p className="text-sm">Click "Add Row" to start building your inventory</p>
            </div>
          )}
        </div>
      </div>

      {/* Instructions */}
      <div className="grid grid-cols-3 gap-4 text-xs text-gray-500">
        <div className="bg-gray-50 border rounded-lg px-3 py-2">
          <span className="font-medium text-gray-700">Double-click</span> to edit cell
        </div>
        <div className="bg-gray-50 border rounded-lg px-3 py-2">
          <span className="font-medium text-gray-700">Drag corner</span> to copy values down
        </div>
        <div className="bg-gray-50 border rounded-lg px-3 py-2">
          <span className="font-medium text-gray-700">Arrow keys</span> to navigate
        </div>
      </div>
    </div>
  );
}

// Example usage
export function SpreadsheetExample() {
  const [inventory, setInventory] = useState<InventoryItem[]>(MOCK_INVENTORY);

  return (
    <div className="container mx-auto py-8 max-w-7xl">
      <Spreadsheet 
        initialItems={inventory}
        onInventoryChange={setInventory}
      />
    </div>
  );
}

export default Spreadsheet;