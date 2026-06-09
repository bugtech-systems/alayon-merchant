// components/ui/data-table.tsx (Updated with column visibility)
import React, { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  MoreHorizontal,
  Pencil,
  Trash2,
  Eye,
  Search,
  Columns,
} from 'lucide-react';

export interface ColumnConfig {
  key: string;
  header: string;
  render?: (value: any, row: any) => React.ReactNode;
  sortable?: boolean;
  searchable?: boolean;
  visible?: boolean;
  width?: string;
}

export interface TableConfig {
  columns: ColumnConfig[];
  pageSize: number;
  sortField?: string;
  sortOrder?: 'asc' | 'desc';
  enableSearch?: boolean;
  enableColumnVisibility?: boolean;
}

interface DataTableProps {
  config: TableConfig;
  data: any[];
  total: number;
  currentPage: number;
  onPageChange: (page: number) => void;
  onSortChange?: (field: string, order: 'asc' | 'desc') => void;
  onSearchChange?: (searchTerm: string) => void;
  onView?: (item: any) => void;
  onEdit?: (item: any) => void;
  onDelete?: (item: any) => void;
  loading?: boolean;
}

export function DataTable({
  config,
  data,
  total,
  currentPage,
  onPageChange,
  onSortChange,
  onSearchChange,
  onView,
  onEdit,
  onDelete,
  loading = false,
}: DataTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState(config.sortField || '');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(config.sortOrder || 'asc');
  const [columns, setColumns] = useState<ColumnConfig[]>(
    config.columns.map(col => ({ ...col, visible: col.visible !== false }))
  );

  const totalPages = Math.ceil(total / config.pageSize);

  // Save column visibility to localStorage
  useEffect(() => {
    const savedVisibility = localStorage.getItem('table-column-visibility');
    if (savedVisibility) {
      try {
        const visibility = JSON.parse(savedVisibility);
        setColumns(prev => prev.map(col => ({
          ...col,
          visible: visibility[col.key] !== undefined ? visibility[col.key] : col.visible
        })));
      } catch (e) {
        console.error('Failed to load column visibility:', e);
      }
    }
  }, []);

  // Save column visibility to localStorage when changed
  const updateColumnVisibility = (key: string, visible: boolean) => {
    const newColumns = columns.map(col =>
      col.key === key ? { ...col, visible } : col
    );
    setColumns(newColumns);
    
    // Save to localStorage
    const visibilityState: Record<string, boolean> = {};
    newColumns.forEach(col => {
      visibilityState[col.key] = col.visible !== false;
    });
    localStorage.setItem('table-column-visibility', JSON.stringify(visibilityState));
  };

  const handleSort = (field: string) => {
    if (!onSortChange) return;
    const newOrder = sortField === field && sortOrder === 'asc' ? 'desc' : 'asc';
    setSortField(field);
    setSortOrder(newOrder);
    onSortChange(field, newOrder);
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    if (onSearchChange) {
      onSearchChange(value);
    }
  };

  const resetColumnVisibility = () => {
    const resetColumns = columns.map(col => ({ ...col, visible: true }));
    setColumns(resetColumns);
    localStorage.removeItem('table-column-visibility');
  };

  const visibleColumns = columns.filter(col => col.visible !== false);

  return (
    <div className="w-full space-y-4">
      {/* Search and Controls Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {config.enableSearch && (
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search customers..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-8"
            />
          </div>
        )}
        
        <div className="flex gap-2">
          {config.enableColumnVisibility && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Columns className="h-4 w-4" />
                  Columns
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>Toggle Columns</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {columns.map((column) => (
                  <DropdownMenuCheckboxItem
                    key={column.key}
                    checked={column.visible !== false}
                    onCheckedChange={(checked) => updateColumnVisibility(column.key, checked)}
                  >
                    {column.header}
                  </DropdownMenuCheckboxItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={resetColumnVisibility}>
                  Reset to Default
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {visibleColumns.map((column) => (
                  <TableHead 
                    key={column.key}
                    style={{ width: column.width }}
                    className={column.sortable ? 'cursor-pointer select-none' : ''}
                  >
                    {column.sortable ? (
                      <Button
                        variant="ghost"
                        onClick={() => handleSort(column.key)}
                        className="h-8 p-0 hover:bg-transparent font-semibold"
                      >
                        {column.header}
                        {sortField === column.key && (
                          <span className="ml-1">
                            {sortOrder === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </Button>
                    ) : (
                      <span className="font-semibold">{column.header}</span>
                    )}
                  </TableHead>
                ))}
                <TableHead className="w-[70px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell
                    colSpan={visibleColumns.length + 1}
                    className="text-center py-8"
                  >
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                  </TableCell>
                </TableRow>
              ) : data.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={visibleColumns.length + 1}
                    className="text-center py-8 text-muted-foreground"
                  >
                    No customers found
                  </TableCell>
                </TableRow>
              ) : (
                data.map((row, index) => (
                  <TableRow key={row.id || index}>
                    {visibleColumns.map((column) => (
                      <TableCell key={column.key}>
                        {column.render
                          ? column.render(row[column.key], row)
                          : row[column.key] || '—'}
                      </TableCell>
                    ))}
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          {onView && (
                            <DropdownMenuItem onClick={() => onView(row)}>
                              <Eye className="mr-2 h-4 w-4" />
                              View
                            </DropdownMenuItem>
                          )}
                          {onEdit && (
                            <DropdownMenuItem onClick={() => onEdit(row)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                          )}
                          {onDelete && (
                            <DropdownMenuItem
                              onClick={() => onDelete(row)}
                              className="text-red-600"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {data.length} of {total} results
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(1)}
              disabled={currentPage === 1}
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(totalPages)}
              disabled={currentPage === totalPages}
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}