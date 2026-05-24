"use client";
"use no memo";

import * as React from "react";

import {
  type ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  type PaginationState,
  useReactTable,
  type VisibilityState,
} from "@tanstack/react-table";
import { ChevronDownIcon, ListFilter } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { waterDeliveryColumns } from "./opportunities-table/columns";
import waterDeliveryData from "./opportunities-table/data.json";
import { waterDeliveryOrderSchema } from "./opportunities-table/schema";

// Status options for filtering
const statusOptions = [
  "all",
  "pending",
  "company_declined",
  "company_accepted",
  "pickup_claimed",
  "company_preparing",
  "ready_for_pickup",
  "in_transit",
  "delivered",
] as const;

// Stock health filter options
const stockHealthOptions = ["all", "high", "medium", "low"] as const;

// Parse and validate data
const orders = waterDeliveryOrderSchema.array().parse(waterDeliveryData);

function preventPaginationNavigation(event: React.MouseEvent<HTMLAnchorElement>) {
  event.preventDefault();
}

export function WaterDeliveryOrdersSection() {
  const [rowSelection, setRowSelection] = React.useState({});
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility] = React.useState<VisibilityState>({});
  const [globalFilter, setGlobalFilter] = React.useState("");
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });

  const table = useReactTable({
    data: orders,
    columns: waterDeliveryColumns,
    state: {
      rowSelection,
      columnFilters,
      columnVisibility,
      globalFilter,
      pagination,
    },
    getRowId: (row) => row.id,
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    globalFilterFn: "includesString",
  });

  const searchQuery = table.getState().globalFilter ?? "";
  const statusFilter = (table.getColumn("status")?.getFilterValue() as string) ?? "all";
  const stockHealthFilter = (table.getColumn("stockHealth")?.getFilterValue() as string) ?? "all";
  const currentPage = table.getState().pagination.pageIndex + 1;
  const pageCount = table.getPageCount();
  const filteredOrderCount = table.getFilteredRowModel().rows.length;
  const visibleOrderCount = table.getRowModel().rows.length;
  
  const pageNumbers = React.useMemo(() => {
    if (pageCount <= 3) {
      return Array.from({ length: pageCount }, (_, index) => index + 1);
    }

    if (currentPage <= 2) return [1, 2, 3];
    if (currentPage >= pageCount - 1) return [pageCount - 2, pageCount - 1, pageCount];

    return [currentPage - 1, currentPage, currentPage + 1];
  }, [currentPage, pageCount]);

  // Format status label for display
  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: "Pending",
      company_declined: "Company Declined",
      company_accepted: "Company Accepted",
      pickup_claimed: "Pickup Claimed",
      company_preparing: "Company Preparing",
      ready_for_pickup: "Ready for Pickup",
      in_transit: "In Transit",
      delivered: "Delivered",
    };
    return labels[status] || status;
  };

  return (
    <section>
      <Card>
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          {/* Left side: Title & Description */}
          <div className="space-y-1">
            <CardTitle className="leading-none">Water Delivery Orders</CardTitle>
            <CardDescription>
              Track and manage water delivery orders across all statuses, from pending to delivery.
            </CardDescription>
          </div>

          {/* Right side: Filters */}
          <CardAction>
            <div className="flex flex-wrap items-center gap-2">
              <Input
                className="h-9 w-full sm:w-44 md:w-52"
                placeholder="Search orders..."
                value={searchQuery}
                onChange={(event) => {
                  table.setGlobalFilter(event.target.value || undefined);
                  table.setPageIndex(0);
                }}
              />
              
              {/* Status Filter */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-9">
                    <ListFilter data-icon="inline-start" />
                    Status
                    <ChevronDownIcon data-icon="inline-end" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuRadioGroup
                    value={statusFilter}
                    onValueChange={(value) => {
                      table.getColumn("status")?.setFilterValue(value === "all" ? undefined : value);
                      table.setPageIndex(0);
                    }}
                  >
                    {statusOptions.map((option) => (
                      <DropdownMenuRadioItem key={option} value={option}>
                        {option === "all" ? "All statuses" : getStatusLabel(option)}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Stock Health Filter */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-9">
                    <ListFilter data-icon="inline-start" />
                    Stock Health
                    <ChevronDownIcon data-icon="inline-end" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  <DropdownMenuRadioGroup
                    value={stockHealthFilter}
                    onValueChange={(value) => {
                      table.getColumn("stockHealth")?.setFilterValue(value === "all" ? undefined : value);
                      table.setPageIndex(0);
                    }}
                  >
                    <DropdownMenuRadioItem value="all">All stock levels</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="high">High (≥60%)</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="medium">Medium (30-59%)</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="low">Low (&lt;30%)</DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardAction>
        </CardHeader>
        
        <CardContent className="flex flex-col gap-4 px-0">
          <div className="overflow-hidden">
            <Table className="**:data-[slot='table-cell']:px-4 **:data-[slot='table-head']:px-4 **:data-[slot='table-cell']:py-4">
              <TableHeader className="border-t **:data-[slot='table-head']:h-11 **:data-[slot='table-head']:font-medium **:data-[slot='table-head']:text-foreground **:data-[slot='table-head']:text-sm">
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableHead key={header.id} colSpan={header.colSpan}>
                        {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody className="**:data-[slot='table-row']:border-border/50 **:data-[slot='table-row']:hover:bg-transparent">
                {table.getRowModel().rows.length ? (
                  table.getRowModel().rows.map((row) => (
                    <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={table.getVisibleLeafColumns().length} className="h-24 text-center">
                      No orders found matching your filters.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          
          <div className="flex items-center justify-between gap-4 px-4 pb-1">
            <p className="text-muted-foreground text-sm">
              Showing {visibleOrderCount} of {filteredOrderCount.toLocaleString()} orders
            </p>

            <Pagination className="mx-0 w-auto justify-end">
              <PaginationContent className="gap-1.5">
                <PaginationItem>
                  <PaginationPrevious
                    href="#"
                    className={!table.getCanPreviousPage() ? "pointer-events-none opacity-50" : undefined}
                    onClick={(event) => {
                      preventPaginationNavigation(event);
                      table.previousPage();
                    }}
                  />
                </PaginationItem>
                {pageNumbers[0] > 1 ? (
                  <PaginationItem>
                    <PaginationEllipsis />
                  </PaginationItem>
                ) : null}
                {pageNumbers.map((pageNumber) => (
                  <PaginationItem key={`page-${pageNumber}`}>
                    <PaginationLink
                      href="#"
                      isActive={table.getState().pagination.pageIndex === pageNumber - 1}
                      onClick={(event) => {
                        preventPaginationNavigation(event);
                        table.setPageIndex(pageNumber - 1);
                      }}
                    >
                      {pageNumber}
                    </PaginationLink>
                  </PaginationItem>
                ))}
                {pageNumbers[pageNumbers.length - 1] < pageCount ? (
                  <PaginationItem>
                    <PaginationEllipsis />
                  </PaginationItem>
                ) : null}
                <PaginationItem>
                  <PaginationNext
                    href="#"
                    className={!table.getCanNextPage() ? "pointer-events-none opacity-50" : undefined}
                    onClick={(event) => {
                      preventPaginationNavigation(event);
                      table.nextPage();
                    }}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}