"use client";
"use no memo";

import * as React from "react";

import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  type UniqueIdentifier,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { arrayMove, SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import {
  type ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
  type VisibilityState,
} from "@tanstack/react-table";
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
  PlusIcon,
  Settings2,
  TruckIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { DraggableWaterOrderRow, waterOrdersColumns } from "./columns";
import type { WaterOrderRow } from "./schema";

const VIEW_OPTIONS = [
  { value: "all-orders", label: "All Orders", badge: 0 },
  { value: "pending", label: "Pending", badge: 0 },
  { value: "preparing", label: "Preparing", badge: 0 },
  { value: "in-transit", label: "In Transit", badge: 0 },
  { value: "delivered", label: "Delivered", badge: 0 },
  { value: "declined", label: "Declined", badge: 0 },
] as const;

type ViewOption = (typeof VIEW_OPTIONS)[number]["value"];

interface WaterDeliveryTableProps {
  data: WaterOrderRow[];
  onAssignRider?: (orderId: string, riderName: string | null, riderId: string | null) => void;
  onUpdateStatus?: (orderId: string, status: WaterOrderRow["status"]) => void;
  onAddOrder?: () => void;
  onContactRider?: (riderPhone: string) => void;
}

export function WaterDeliveryTable({ 
  data: initialData, 
  onAssignRider,
  onUpdateStatus,
  onAddOrder,
  onContactRider
}: WaterDeliveryTableProps) {
  const [data, setData] = React.useState(() => initialData);
  const [activeView, setActiveView] = React.useState<ViewOption>("all-orders");
  const [rowSelection, setRowSelection] = React.useState({});
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 10,
  });
  
  const sortableId = React.useId();
  const sensors = useSensors(useSensor(MouseSensor, {}), useSensor(TouchSensor, {}), useSensor(KeyboardSensor, {}));

  // Filter data based on active view
  const filteredData = React.useMemo(() => {
    switch (activeView) {
      case "all-orders":
        return data;
      case "pending":
        return data.filter(order => 
          order.status === "pending" || 
          order.status === "pickup_claimed"
        );
      case "preparing":
        return data.filter(order => 
          order.status === "company_preparing" || 
          order.status === "ready_for_pickup"
        );
      case "in-transit":
        return data.filter(order => order.status === "in_transit");
      case "delivered":
        return data.filter(order => order.status === "delivered");
      case "declined":
        return data.filter(order => order.status === "company_declined");
      default:
        return data;
    }
  }, [data, activeView]);

  const dataIds = React.useMemo<UniqueIdentifier[]>(() => filteredData.map(({ id }) => id), [filteredData]);

  // Handle driver assignment and update data state
  const handleAssignRider = React.useCallback((orderId: string, riderName: string | null, riderId: string | null) => {
    setData(prevData => 
      prevData.map(order => 
        order.id === orderId 
          ? { ...order, assignedDriver: riderName, assignedDriverId: riderId }
          : order
      )
    );
    onAssignRider?.(orderId, riderName, riderId);
  }, [onAssignRider]);

  const table = useReactTable({
    data: filteredData,
    columns: waterOrdersColumns,
    state: {
      sorting,
      columnVisibility,
      rowSelection,
      columnFilters,
      pagination,
    },
    getRowId: (row) => row.id,
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    meta: {
      onAssignRider: handleAssignRider,
      onUpdateStatus,
      onContactRider,
    },
  });

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (active && over && active.id !== over.id) {
      setData((currentData) => {
        const oldIndex = dataIds.indexOf(active.id);
        const newIndex = dataIds.indexOf(over.id);
        return arrayMove(currentData, oldIndex, newIndex);
      });
    }
  }

  // Get badge count for view
  const getViewBadgeCount = (viewValue: ViewOption) => {
    switch (viewValue) {
      case "all-orders":
        return data.length;
      case "pending":
        return data.filter(order => 
          order.status === "pending" || 
          order.status === "pickup_claimed"
        ).length;
      case "preparing":
        return data.filter(order => 
          order.status === "company_preparing" || 
          order.status === "ready_for_pickup"
        ).length;
      case "in-transit":
        return data.filter(order => order.status === "in_transit").length;
      case "delivered":
        return data.filter(order => order.status === "delivered").length;
      case "declined":
        return data.filter(order => order.status === "company_declined").length;
      default:
        return 0;
    }
  };

  return (
    <Tabs
      value={activeView}
      onValueChange={(value) => setActiveView(value as ViewOption)}
      className="w-full flex-col justify-start gap-6"
    >
      <div className="flex items-center justify-between">
        <Label htmlFor="view-selector" className="sr-only">
          View
        </Label>
        <Select value={activeView} onValueChange={(value) => setActiveView(value as ViewOption)}>
          <SelectTrigger className="flex @4xl/main:hidden w-fit" size="sm" id="view-selector">
            <SelectValue placeholder="Select a view" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {VIEW_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
        
        <TabsList className="@4xl/main:flex hidden **:data-[slot=badge]:size-5 **:data-[slot=badge]:rounded-full **:data-[slot=badge]:bg-muted-foreground/30 **:data-[slot=badge]:px-1">
          {VIEW_OPTIONS.map((option) => (
            <TabsTrigger key={option.value} value={option.value}>
              {option.label}
              <Badge variant="secondary" className="ml-2">
                {getViewBadgeCount(option.value)}
              </Badge>
            </TabsTrigger>
          ))}
        </TabsList>
        
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Settings2 data-icon="inline-start" />
                View
                <ChevronDownIcon data-icon="inline-end" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-35">
              <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {table
                .getAllColumns()
                .filter((column) => typeof column.accessorFn !== "undefined" && column.getCanHide())
                .map((column) => (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    className="capitalize"
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) => column.toggleVisibility(!!value)}
                  >
                    {column.id === "assignedDriver" ? "Assigned Driver" : 
                     column.id === "orderNumber" ? "Order #" :
                     column.id === "total" ? "Total (₱)" :
                     column.id === "quantity" ? "Quantity" :
                     column.id === "customer" ? "Customer" :
                     column.id === "status" ? "Status" :
                     column.id}
                  </DropdownMenuCheckboxItem>
                ))}
            </DropdownMenuContent>
          </DropdownMenu>
          
          <Button variant="outline" size="sm" onClick={onAddOrder}>
            <PlusIcon data-icon="inline-start" />
            <span className="hidden lg:inline">New Order</span>
          </Button>
        </div>
      </div>
      
      {VIEW_OPTIONS.map((option) => (
        <TabsContent key={option.value} value={option.value} className="relative flex flex-col gap-4 overflow-auto">
          <WaterDeliveryTableContent 
            table={table} 
            filteredData={filteredData}
            dataIds={dataIds}
            handleDragEnd={handleDragEnd}
            sensors={sensors}
            sortableId={sortableId}
            onAssignRider={handleAssignRider}
            onUpdateStatus={onUpdateStatus}
            onContactRider={onContactRider}
          />
        </TabsContent>
      ))}
    </Tabs>
  );
}

// Separate component for table content to keep code organized
function WaterDeliveryTableContent({ 
  table, 
  filteredData, 
  dataIds, 
  handleDragEnd, 
  sensors, 
  sortableId,
  onAssignRider,
  onUpdateStatus,
  onContactRider
}: { 
  table: any;
  filteredData: WaterOrderRow[];
  dataIds: UniqueIdentifier[];
  handleDragEnd: (event: DragEndEvent) => void;
  sensors: any;
  sortableId: string;
  onAssignRider?: (orderId: string, riderName: string | null, riderId: string | null) => void;
  onUpdateStatus?: (orderId: string, status: WaterOrderRow["status"]) => void;
  onContactRider?: (riderPhone: string) => void;
}) {
  // Create a map of updated data for the rows
  const rowMap = React.useMemo(() => {
    const map = new Map();
    filteredData.forEach(order => {
      map.set(order.id, order);
    });
    return map;
  }, [filteredData]);

  return (
    <>
      <div className="overflow-hidden rounded-lg border">
        <DndContext
          collisionDetection={closestCenter}
          modifiers={[restrictToVerticalAxis]}
          onDragEnd={handleDragEnd}
          sensors={sensors}
          id={sortableId}
        >
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-muted">
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
            <TableBody className="**:data-[slot=table-cell]:first:w-8">
              {table.getRowModel().rows.length ? (
                <SortableContext items={dataIds} strategy={verticalListSortingStrategy}>
                  {table.getRowModel().rows.map((row) => {
                    // Get the latest data for this row
                    const latestOrder = rowMap.get(row.original.id) || row.original;
                    const updatedRow = { ...row, original: latestOrder };
                    return (
                      <DraggableWaterOrderRow 
                        key={row.id} 
                        row={updatedRow}
                        onAssignRider={onAssignRider}
                        onUpdateStatus={onUpdateStatus}
                        onContactRider={onContactRider}
                      />
                    );
                  })}
                </SortableContext>
              ) : (
                <TableRow>
                  <TableCell colSpan={table.getVisibleLeafColumns().length} className="h-24 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <TruckIcon className="size-8 text-muted-foreground/50" />
                      <p className="text-muted-foreground">No orders found in this category</p>
                      <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
                        Refresh
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </DndContext>
      </div>
      
      <div className="flex items-center justify-between px-4">
        <div className="hidden flex-1 text-muted-foreground text-sm lg:flex">
          {table.getFilteredSelectedRowModel().rows.length} of {table.getFilteredRowModel().rows.length} order(s)
          selected.
        </div>
        <div className="flex w-full items-center gap-8 lg:w-fit">
          <div className="hidden items-center gap-2 lg:flex">
            <Label htmlFor="rows-per-page" className="font-medium text-sm">
              Rows per page
            </Label>
            <Select
              value={`${table.getState().pagination.pageSize}`}
              onValueChange={(value) => {
                table.setPageSize(Number(value));
              }}
            >
              <SelectTrigger size="sm" className="w-20" id="rows-per-page">
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
              className="hidden h-8 w-8 p-0 lg:flex"
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
            >
              <span className="sr-only">Go to first page</span>
              <ChevronsLeftIcon />
            </Button>
            <Button
              variant="outline"
              className="size-8"
              size="icon"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <span className="sr-only">Go to previous page</span>
              <ChevronLeftIcon />
            </Button>
            <Button
              variant="outline"
              className="size-8"
              size="icon"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <span className="sr-only">Go to next page</span>
              <ChevronRightIcon />
            </Button>
            <Button
              variant="outline"
              className="hidden size-8 lg:flex"
              size="icon"
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
            >
              <span className="sr-only">Go to last page</span>
              <ChevronsRightIcon />
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}