"use client";
"use no memo";

import * as React from "react";
import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type PaginationState,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";
import {
  ArrowUpDown,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  CreditCard,
  Loader2,
  Search,
  Trash2,
  UsersRound,
  CheckCircle,
  XCircle,
  AlertCircle,
  Receipt,
  MoreVertical,
  RefreshCw,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

import { recentCustomersColumns } from "./columns";
import {
  useCustomers,
  useBulkDeleteCustomers,
  useBulkUpdateCustomerStatus,
  useBulkUpdateCustomerBilling,
  useUpdateCustomerStatus,
  useDeleteCustomer,
} from "@/lib/hooks/useN8nQuery";

const statusOptions = [
  { value: "all", label: "All" },
  { value: "Subscribed", label: "Subscribed" },
  { value: "Inactive", label: "Inactive" },
  { value: "Unsubscribed", label: "Unsubscribed" },
] as const;

const billingOptions = [
  { value: "all", label: "All" },
  { value: "Paid", label: "Paid" },
  { value: "Pending", label: "Pending" },
  { value: "Overdue", label: "Overdue" },
  { value: "Trial", label: "Trial" },
] as const;

const joinedDateOptions = [
  { value: "all", label: "All time" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
] as const;

const sortOptions = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "name-asc", label: "Name A-Z" },
  { value: "name-desc", label: "Name Z-A" },
] as const;

const bulkStatusOptions = [
  { value: "Subscribed", label: "Subscribed", icon: CheckCircle, color: "text-green-600" },
  { value: "Inactive", label: "Inactive", icon: AlertCircle, color: "text-yellow-600" },
  { value: "Unsubscribed", label: "Unsubscribed", icon: XCircle, color: "text-red-600" },
] as const;

const bulkBillingOptions = [
  { value: "Paid", label: "Paid", color: "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400" },
  { value: "Pending", label: "Pending", color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400" },
  { value: "Overdue", label: "Overdue", color: "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400" },
  { value: "Trial", label: "Trial", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400" },
] as const;

export function RecentCustomersTable() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // State
  const [rowSelection, setRowSelection] = useState({});
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [billingDialogOpen, setBillingDialogOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [selectedBilling, setSelectedBilling] = useState<string>("");
  const [deleteProgress, setDeleteProgress] = useState({ processed: 0, total: 0 });

  // Get filters from URL
  const currentSearch = searchParams.get("search") || "";
  const currentStatus = searchParams.get("status") || "all";
  const currentBilling = searchParams.get("billing") || "all";
  const currentJoinedDate = searchParams.get("joinedDate") || "all";
  const currentPage = Number(searchParams.get("page")) || 1;
  const currentPageSize = Number(searchParams.get("pageSize")) || 10;
  
  // Parse sort from URL
  const getSortFromURL = (): SortingState => {
    const sort = searchParams.get("sort");
    if (sort === "oldest") return [{ id: "joined", desc: false }];
    if (sort === "name-asc") return [{ id: "name", desc: false }];
    if (sort === "name-desc") return [{ id: "name", desc: true }];
    return [{ id: "joined", desc: true }];
  };

  const [sorting, setSorting] = useState<SortingState>(getSortFromURL);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: currentPage - 1,
    pageSize: currentPageSize,
  });

  // Build query params for n8n
  const queryParams = {
    page: pagination.pageIndex + 1,
    pageSize: pagination.pageSize,
    search: currentSearch || undefined,
    status: currentStatus !== "all" ? currentStatus : undefined,
    billing: currentBilling !== "all" ? currentBilling : undefined,
    daysBack: currentJoinedDate !== "all" ? currentJoinedDate : undefined,
    sortBy: sorting[0]?.id,
    sortOrder: sorting[0]?.desc ? "desc" : "asc",
  };

  // N8N Hooks
  const { data: response, isLoading, isFetching, refetch } = useCustomers(queryParams);
  const bulkDelete = useBulkDeleteCustomers();
  const bulkUpdateStatus = useBulkUpdateCustomerStatus();
  const bulkUpdateBilling = useBulkUpdateCustomerBilling();
  const updateStatus = useUpdateCustomerStatus();
  const deleteCustomer = useDeleteCustomer();

  const data = response?.data || [];
  const total = response?.total || 0;
  const loading = isLoading && data.length === 0;
  const isRefreshing = isFetching && !isLoading;

  // Get selected row IDs
  const getSelectedRowIds = useCallback(() => {
    const selectedRows = table.getSelectedRowModel().rows;
    return selectedRows.map(row => row.original.id);
  }, [rowSelection]);

  // Update URL with current filters
  const updateUrlParams = useCallback((updates: Record<string, string | number | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === "" || value === "all" || value === 0) {
        params.delete(key);
      } else {
        params.set(key, String(value));
      }
    });
    
    router.push(`${pathname}?${params.toString()}`);
  }, [searchParams, pathname, router]);

  // Bulk delete handler
  const handleBulkDelete = async () => {
    const selectedIds = getSelectedRowIds();
    if (selectedIds.length === 0) return;

    setDeleteProgress({ processed: 0, total: selectedIds.length });
    
    bulkDelete.mutate(
      {
        endpoint: "/customers",
        ids: selectedIds,
        concurrency: 5,
        onProgress: (processed, total, successful, failed) => {
          setDeleteProgress({ processed, total });
        },
      },
      {
        onSuccess: (result) => {
          if (result.success) {
            toast.success(result.message);
            setRowSelection({});
            setDeleteDialogOpen(false);
            refetch();
          } else {
            toast.error(result.message || "Failed to delete some customers");
          }
          setDeleteProgress({ processed: 0, total: 0 });
        },
        onError: (error) => {
          toast.error("Failed to delete customers");
          setDeleteProgress({ processed: 0, total: 0 });
        },
      }
    );
  };

  // Bulk update status handler
  const handleBulkUpdateStatus = async () => {
    const selectedIds = getSelectedRowIds();
    if (selectedIds.length === 0 || !selectedStatus) return;

    bulkUpdateStatus.mutate(
      { ids: selectedIds, status: selectedStatus },
      {
        onSuccess: () => {
          toast.success(`Successfully updated ${selectedIds.length} customer(s) to ${selectedStatus}`);
          setRowSelection({});
          setStatusDialogOpen(false);
          setSelectedStatus("");
          refetch();
        },
        onError: () => {
          toast.error("Failed to update customer status");
        },
      }
    );
  };

  // Bulk update billing handler
  const handleBulkUpdateBilling = async () => {
    const selectedIds = getSelectedRowIds();
    if (selectedIds.length === 0 || !selectedBilling) return;

    bulkUpdateBilling.mutate(
      { ids: selectedIds, billingStatus: selectedBilling },
      {
        onSuccess: () => {
          toast.success(`Successfully updated ${selectedIds.length} customer(s) billing to ${selectedBilling}`);
          setRowSelection({});
          setBillingDialogOpen(false);
          setSelectedBilling("");
          refetch();
        },
        onError: () => {
          toast.error("Failed to update customer billing");
        },
      }
    );
  };

  // Single customer actions
  const handleDeleteSingleCustomer = async (customerId: string) => {
    deleteCustomer.mutate(customerId, {
      onSuccess: () => {
        toast.success("Customer deleted successfully");
        refetch();
      },
      onError: () => {
        toast.error("Failed to delete customer");
      },
    });
  };

  const handleUpdateSingleCustomerStatus = async (customerId: string, status: string) => {
    updateStatus.mutate(
      { id: customerId, status },
      {
        onSuccess: () => {
          toast.success(`Customer status updated to ${status}`);
          refetch();
        },
        onError: () => {
          toast.error("Failed to update customer status");
        },
      }
    );
  };

  // Filter handlers
  const handleSearchChange = (value: string) => {
    updateUrlParams({ search: value || null, page: 1 });
  };

  const handleStatusChange = (value: string) => {
    updateUrlParams({ status: value === "all" ? null : value, page: 1 });
  };

  const handleBillingChange = (value: string) => {
    updateUrlParams({ billing: value === "all" ? null : value, page: 1 });
  };

  const handleJoinedDateChange = (value: string) => {
    updateUrlParams({ joinedDate: value === "all" ? null : value, page: 1 });
  };

  const handleSortChange = (value: string) => {
    let newSorting: SortingState;
    switch (value) {
      case "oldest":
        newSorting = [{ id: "joined", desc: false }];
        break;
      case "name-asc":
        newSorting = [{ id: "name", desc: false }];
        break;
      case "name-desc":
        newSorting = [{ id: "name", desc: true }];
        break;
      default:
        newSorting = [{ id: "joined", desc: true }];
    }
    setSorting(newSorting);
    updateUrlParams({ page: 1 });
  };

  const getCurrentSortValue = () => {
    if (sorting[0]?.id === "joined" && !sorting[0]?.desc) return "oldest";
    if (sorting[0]?.id === "name" && !sorting[0]?.desc) return "name-asc";
    if (sorting[0]?.id === "name" && sorting[0]?.desc) return "name-desc";
    return "newest";
  };

  // Sync URL with state
  useEffect(() => {
    const params: Record<string, string | number | null> = {
      page: pagination.pageIndex + 1,
      pageSize: pagination.pageSize,
      search: currentSearch || null,
      status: currentStatus !== "all" ? currentStatus : null,
      billing: currentBilling !== "all" ? currentBilling : null,
      joinedDate: currentJoinedDate !== "all" ? currentJoinedDate : null,
    };
    
    const sortValue = getCurrentSortValue();
    if (sortValue !== "newest") {
      params.sort = sortValue;
    }
    
    updateUrlParams(params);
  }, [pagination, currentSearch, currentStatus, currentBilling, currentJoinedDate]);

  // Enhanced columns with action handlers
  const enhancedColumns = recentCustomersColumns.map(column => {
    if (column.id === "actions") {
      return {
        ...column,
        cell: ({ row }: any) => {
          const customer = row.original;
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem 
                  onClick={() => handleUpdateSingleCustomerStatus(customer.id, "Subscribed")}
                  disabled={updateStatus.isPending}
                >
                  <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                  Set as Subscribed
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => handleUpdateSingleCustomerStatus(customer.id, "Inactive")}
                  disabled={updateStatus.isPending}
                >
                  <AlertCircle className="mr-2 h-4 w-4 text-yellow-600" />
                  Set as Inactive
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => handleUpdateSingleCustomerStatus(customer.id, "Unsubscribed")}
                  disabled={updateStatus.isPending}
                >
                  <XCircle className="mr-2 h-4 w-4 text-red-600" />
                  Set as Unsubscribed
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => handleDeleteSingleCustomer(customer.id)}
                  className="text-red-600"
                  disabled={deleteCustomer.isPending}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      };
    }
    return column;
  });

  // Table setup
  const table = useReactTable({
    data,
    columns: enhancedColumns,
    state: {
      rowSelection,
      pagination,
      sorting,
    },
    getRowId: (row) => row.id,
    enableRowSelection: true,
    manualPagination: true,
    manualSorting: true,
    manualFiltering: true,
    pageCount: Math.ceil(total / pagination.pageSize) || 1,
    onRowSelectionChange: setRowSelection,
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const selectedCount = table.getSelectedRowModel().rows.length;
  const isBulkActionLoading = bulkDelete.isPending || bulkUpdateStatus.isPending || bulkUpdateBilling.isPending;

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading customers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Bulk Actions Bar */}
      {selectedCount > 0 && (
        <div className="flex items-center justify-between rounded-lg bg-primary/5 p-3 shadow-sm">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="font-mono">
              {selectedCount} selected
            </Badge>
            <span className="text-sm text-muted-foreground">
              row{selectedCount !== 1 ? "s" : ""} selected
            </span>
          </div>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" disabled={isBulkActionLoading}>
                  <UsersRound className="mr-2 h-4 w-4" />
                  Update Status
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {bulkStatusOptions.map((option) => (
                  <DropdownMenuItem
                    key={option.value}
                    onClick={() => {
                      setSelectedStatus(option.value);
                      setStatusDialogOpen(true);
                    }}
                  >
                    <option.icon className={`mr-2 h-4 w-4 ${option.color}`} />
                    Set as {option.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" disabled={isBulkActionLoading}>
                  <Receipt className="mr-2 h-4 w-4" />
                  Update Billing
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {bulkBillingOptions.map((option) => (
                  <DropdownMenuItem
                    key={option.value}
                    onClick={() => {
                      setSelectedBilling(option.value);
                      setBillingDialogOpen(true);
                    }}
                  >
                    <Badge className={`mr-2 ${option.color}`} variant="secondary">
                      {option.label}
                    </Badge>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              variant="destructive"
              size="sm"
              onClick={() => setDeleteDialogOpen(true)}
              disabled={isBulkActionLoading}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Selected
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setRowSelection({})}
              disabled={isBulkActionLoading}
            >
              Clear Selection
            </Button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-full lg:w-80">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="h-7 rounded-[min(var(--radius-md),12px)] pl-8"
              placeholder="Search customers..."
              defaultValue={currentSearch}
              onChange={(event) => handleSearchChange(event.target.value)}
            />
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <UsersRound />
                Status
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-35" align="start">
              <DropdownMenuRadioGroup
                value={currentStatus}
                onValueChange={handleStatusChange}
              >
                {statusOptions.map((status) => (
                  <DropdownMenuRadioItem key={status.value} value={status.value}>
                    {status.label}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <CalendarDays />
                Joined date
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-40" align="start">
              <DropdownMenuRadioGroup
                value={currentJoinedDate}
                onValueChange={handleJoinedDateChange}
              >
                {joinedDateOptions.map((option) => (
                  <DropdownMenuRadioItem key={option.value} value={option.value}>
                    {option.label}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center xl:w-auto">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <CreditCard />
                Billing
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuRadioGroup
                value={currentBilling}
                onValueChange={handleBillingChange}
              >
                {billingOptions.map((billing) => (
                  <DropdownMenuRadioItem key={billing.value} value={billing.value}>
                    {billing.label}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <ArrowUpDown />
                Sort
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuRadioGroup
                value={getCurrentSortValue()}
                onValueChange={handleSortChange}
              >
                {sortOptions.map((option) => (
                  <DropdownMenuRadioItem key={option.value} value={option.value}>
                    {option.label}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isRefreshing}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border bg-card">
        <Table>
          <TableHeader className="bg-muted/15">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} colSpan={header.colSpan} className="h-11 p-3 font-medium">
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isFetching && data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={table.getVisibleLeafColumns().length} className="h-24 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading...
                  </div>
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="p-3 align-middle">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={table.getVisibleLeafColumns().length} className="h-24 text-center">
                  No results found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-1">
        <div className="hidden flex-1 text-muted-foreground text-sm lg:flex">
          {selectedCount} of {total.toLocaleString()} row(s) selected.
        </div>
        <div className="flex w-full items-center gap-8 lg:w-fit">
          <div className="hidden items-center gap-2 lg:flex">
            <Label htmlFor="recent-customers-rows-per-page" className="font-medium text-sm">
              Rows per page
            </Label>
            <Select
              value={`${table.getState().pagination.pageSize}`}
              onValueChange={(value) => {
                table.setPageSize(Number(value));
                updateUrlParams({ pageSize: Number(value), page: 1 });
              }}
            >
              <SelectTrigger size="sm" className="w-20" id="recent-customers-rows-per-page">
                <SelectValue placeholder={table.getState().pagination.pageSize} />
              </SelectTrigger>
              <SelectContent side="top">
                <SelectGroup>
                  {[10, 20, 30, 40, 50].map((pageSize) => (
                    <SelectItem key={pageSize} value={`${pageSize}`}>
                      {pageSize}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          <div className="flex w-fit items-center justify-center font-medium text-sm">
            Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
          </div>
          <div className="ml-auto flex items-center gap-2 lg:ml-0">
            <Button
              variant="outline"
              className="hidden size-8 lg:flex"
              size="icon"
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage() || isFetching}
            >
              <span className="sr-only">Go to first page</span>
              <ChevronsLeft className="size-4" />
            </Button>
            <Button
              variant="outline"
              className="size-8"
              size="icon"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage() || isFetching}
            >
              <span className="sr-only">Go to previous page</span>
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              variant="outline"
              className="size-8"
              size="icon"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage() || isFetching}
            >
              <span className="sr-only">Go to next page</span>
              <ChevronRight className="size-4" />
            </Button>
            <Button
              variant="outline"
              className="hidden size-8 lg:flex"
              size="icon"
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage() || isFetching}
            >
              <span className="sr-only">Go to last page</span>
              <ChevronsRight className="size-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Customers</DialogTitle>
            <DialogDescription>
              {deleteProgress.total > 0 ? (
                <div className="space-y-2">
                  <p>Deleting {deleteProgress.processed} of {deleteProgress.total} customers...</p>
                  <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-destructive transition-all duration-300"
                      style={{ width: `${(deleteProgress.processed / deleteProgress.total) * 100}%` }}
                    />
                  </div>
                </div>
              ) : (
                `Are you sure you want to delete ${selectedCount} customer${selectedCount !== 1 ? "s" : ""}? 
                This action cannot be undone.`
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={bulkDelete.isPending}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleBulkDelete} disabled={bulkDelete.isPending}>
              {bulkDelete.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Update Status Dialog */}
      <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Customer Status</DialogTitle>
            <DialogDescription>
              Update status for {selectedCount} selected customer{selectedCount !== 1 ? "s" : ""} to {selectedStatus}.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusDialogOpen(false)} disabled={bulkUpdateStatus.isPending}>
              Cancel
            </Button>
            <Button onClick={handleBulkUpdateStatus} disabled={bulkUpdateStatus.isPending}>
              {bulkUpdateStatus.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm Update
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Update Billing Dialog */}
      <Dialog open={billingDialogOpen} onOpenChange={setBillingDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Billing Status</DialogTitle>
            <DialogDescription>
              Update billing status for {selectedCount} selected customer{selectedCount !== 1 ? "s" : ""} to {selectedBilling}.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBillingDialogOpen(false)} disabled={bulkUpdateBilling.isPending}>
              Cancel
            </Button>
            <Button onClick={handleBulkUpdateBilling} disabled={bulkUpdateBilling.isPending}>
              {bulkUpdateBilling.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm Update
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}