// components/dynamic-data-table.tsx
"use client";

import * as React from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  DndContext,
  closestCenter,
  type DragEndEvent,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { arrayMove, SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import {
  ColumnDef,
  ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
  VisibilityState,
} from "@tanstack/react-table";
import { ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon, ChevronsLeftIcon, ChevronsRightIcon, Loader2Icon, PlusIcon, RefreshCwIcon, Settings2, FilterIcon, XIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger, SheetFooter, SheetClose } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { n8nFetcher, useN8nQuery } from "@/hooks/useN8nQuery";
import { DynamicFormDrawer } from "./dynamic-form-drawer";
import { DraggableRow } from "./draggable-row";
import type { ColumnConfig, DynamicDataTableProps, FieldConfig } from "@/types/dynamic-table";

export function DynamicDataTable<TData extends { id: string }>({
  entityName,
  columnsConfig,
  formConfig,
  n8n,
  companyId,
  defaultPageSize = 10,
  refreshInterval,
  onSuccess,
  onError,
  onBeforeCreate,
  onAfterCreate,
  onBeforeUpdate,
  onAfterUpdate,
  onBeforeDelete,
  onAfterDelete,
  onBeforeReorder,
  onAfterReorder,
}: DynamicDataTableProps<TData>) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();

  // Table state
  const [data, setData] = React.useState<TData[]>([]);
  const [pagination, setPagination] = React.useState({ pageIndex: 0, pageSize: defaultPageSize });
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [rowSelection, setRowSelection] = React.useState({});
  const [isFilterOpen, setIsFilterOpen] = React.useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = React.useState(false);
  const [editingRecord, setEditingRecord] = React.useState<TData | null>(null);
  const [filters, setFilters] = React.useState<Record<string, any>>(() => {
    const initial: Record<string, any> = {};
    for (const col of columnsConfig) {
      const paramValue = searchParams.get(col.id);
      if (paramValue !== null) initial[col.id] = paramValue;
    }
    return initial;
  });

  const sortableId = React.useId();
  const sensors = useSensors(useSensor(MouseSensor), useSensor(TouchSensor), useSensor(KeyboardSensor));

  // Build query parameters for the list endpoint
  const buildListParams = React.useCallback(() => {
    const params: Record<string, any> = {
      page: pagination.pageIndex + 1,
      limit: pagination.pageSize,
    };
    if (companyId) params.company_id = companyId;
    if (sorting.length) {
      params.sort_by = sorting[0].id;
      params.sort_order = sorting[0].desc ? "DESC" : "ASC";
    }
    Object.entries(filters).forEach(([key, val]) => {
      if (val && typeof val === "string") params[`filter_${key}`] = val;
    });
    return params;
  }, [pagination, companyId, sorting, filters]);

  // React Query for fetching list data
  const { data: queryData, isLoading, refetch } = useN8nQuery<{ data: TData[]; total: number; totalPages: number }>({
    endpoint: n8n.list,
    method: "GET",
    params: buildListParams(),
    enabled: !!n8n.list,
    refetchInterval: refreshInterval,
  });

  // Sync React Query data into local state (and compute total count / pages)
  const totalCount = queryData?.total ?? 0;
  const totalPages = queryData?.totalPages ?? 0;
  console.log(queryData, 'wewewaa', columnsConfig)
  React.useEffect(() => {
    if (queryData) setData(queryData?.data ?? queryData);
  }, [queryData]);

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (formData: Record<string, any>) => {
      let dataToSend = formData;
      if (onBeforeCreate) dataToSend = await onBeforeCreate(dataToSend);
      return n8nFetcher({ endpoint: n8n.create, method: "POST", body: dataToSend });
    },
    onSuccess: (newRecord) => {
      setData(prev => [newRecord, ...prev]);
      queryClient.invalidateQueries({ queryKey: [n8n.list] });
      onSuccess?.(`${entityName} created`);
      onAfterCreate?.(newRecord);
      setIsDrawerOpen(false);
    },
    onError: (err) => onError?.(err),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, any> }) => {
      let dataToSend = data;
      if (onBeforeUpdate) dataToSend = await onBeforeUpdate(id, dataToSend);
      return n8nFetcher({ endpoint: `${n8n.update}/${id}`, method: "PUT", body: dataToSend });
    },
    onSuccess: (updatedRecord) => {
      setData(prev => prev.map(item => (item.id === updatedRecord.id ? updatedRecord : item)));
      queryClient.invalidateQueries({ queryKey: [n8n.list] });
      onSuccess?.(`${entityName} updated`);
      onAfterUpdate?.(updatedRecord);
      setIsDrawerOpen(false);
      setEditingRecord(null);
    },
    onError: (err) => onError?.(err),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      if (onBeforeDelete && !(await onBeforeDelete(id))) throw new Error("Deletion cancelled");
      return n8nFetcher({ endpoint: `${n8n.delete}/${id}`, method: "DELETE" });
    },
    onSuccess: (_, id) => {
      setData(prev => prev.filter(item => item.id !== id));
      queryClient.invalidateQueries({ queryKey: [n8n.list] });
      onSuccess?.(`${entityName} deleted`);
      onAfterDelete?.(id);
    },
    onError: (err) => onError?.(err),
  });

  const reorderMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      let idsToSend = ids;
      if (onBeforeReorder) idsToSend = await onBeforeReorder(idsToSend);
      return n8nFetcher({ endpoint: n8n.reorder, method: "POST", body: { ids: idsToSend } });
    },
    onSuccess: (_, ids) => {
      onAfterReorder?.(ids);
      onSuccess?.("Order updated");
    },
    onError: (err) => {
      // rollback local order on error
      refetch();
      onError?.(err);
    },
  });

  // Drag & drop handler
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!active || !over || active.id === over.id) return;
    const oldIndex = data.findIndex(item => item.id === active.id);
    const newIndex = data.findIndex(item => item.id === over.id);
    const newData = arrayMove(data, oldIndex, newIndex);
    setData(newData);
    // Persist new order
    const orderedIds = newData.map(item => item.id);
    await reorderMutation.mutateAsync(orderedIds);
  };

  // Table columns definition (from config)
  const tableColumns: ColumnDef<TData>[] = React.useMemo(() => {
    return columnsConfig.map((col) => ({
      id: col.id,
      accessorKey: col.accessorKey || col.id,
      header: col.header,
      enableSorting: col.enableSorting ?? true,
      enableHiding: col.enableHiding ?? true,
      size: col.size,
      cell: col.cell ? ({ row }) => col.cell!(row.getValue(col.id), row.original) : undefined,
    }));
  }, [columnsConfig]);

  const table = useReactTable({
    data,
    columns: tableColumns,
    state: { sorting, columnVisibility, rowSelection, columnFilters, pagination },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onPaginationChange: setPagination,
    manualPagination: true,
    pageCount: totalPages,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  // Sync URL with filters & pagination
  React.useEffect(() => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, val]) => {
      if (val) params.set(key, String(val));
    });
    if (pagination.pageIndex > 0) params.set("page", String(pagination.pageIndex));
    if (pagination.pageSize !== defaultPageSize) params.set("limit", String(pagination.pageSize));
    if (sorting.length) {
      params.set("sortBy", sorting[0].id);
      params.set("sortOrder", sorting[0].desc ? "desc" : "asc");
    }
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [filters, pagination, sorting, defaultPageSize, router, pathname]);

  const activeFilterCount = Object.values(filters).filter(v => v && v !== "").length;
  const isMutating = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;
  return (
    <div className="w-full space-y-4">
      {/* Error / success toasts omitted for brevity (same as before) */}

      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Input
              placeholder={`Search ${entityName.toLowerCase()}...`}
              value={filters.search || ""}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              className="pr-8"
            />
            {filters.search && (
              <button onClick={() => setFilters(prev => ({ ...prev, search: "" }))} className="absolute right-2 top-1/2 -translate-y-1/2">
                <XIcon className="size-4" />
              </button>
            )}
          </div>
          <Sheet open={isFilterOpen} onOpenChange={setIsFilterOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="relative">
                <FilterIcon className="size-4 mr-2" />
                Filters
                {activeFilterCount > 0 && <Badge variant="secondary" className="ml-2">{activeFilterCount}</Badge>}
              </Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Filter {entityName}s</SheetTitle>
                <SheetDescription>Apply filters to narrow down results</SheetDescription>
              </SheetHeader>
              <div className="py-4 space-y-4">
                {columnsConfig.filter(c => c.enableSorting !== false).map(col => (
                  <div key={col.id} className="space-y-2">
                    <Label>{col.header}</Label>
                    <Input
                      placeholder={`Filter by ${col.header}`}
                      value={filters[col.id] || ""}
                      onChange={(e) => setFilters(prev => ({ ...prev, [col.id]: e.target.value }))}
                    />
                  </div>
                ))}
              </div>
              <SheetFooter>
                <Button variant="outline" onClick={() => setFilters({})}>Clear All</Button>
                <SheetClose asChild><Button>Apply Filters</Button></SheetClose>
              </SheetFooter>
            </SheetContent>
          </Sheet>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
            {isLoading ? <Loader2Icon className="size-4 animate-spin" /> : <RefreshCwIcon className="size-4" />}
            <span className="hidden lg:inline ml-2">Refresh</span>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm"><Settings2 className="size-4" /><span className="hidden lg:inline ml-2">View</span><ChevronDownIcon className="size-4 ml-1" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {table.getAllColumns().filter(col => col.getCanHide()).map(col => (
                <DropdownMenuCheckboxItem key={col.id} checked={col.getIsVisible()} onCheckedChange={val => col.toggleVisibility(!!val)}>
                  {columnsConfig.find(c => c.id === col.id)?.header || col.id}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="outline" size="sm" onClick={() => { setEditingRecord(null); setIsDrawerOpen(true); }}>
            <PlusIcon className="size-4" /><span className="hidden lg:inline ml-2">New {entityName}</span>
          </Button>
        </div>
      </div>

      {/* Table rendering (same as before) */}
      <div className="overflow-hidden rounded-lg border">
        <DndContext collisionDetection={closestCenter} modifiers={[restrictToVerticalAxis]} onDragEnd={handleDragEnd} sensors={sensors} id={sortableId}>
          <div className="relative">
            {isLoading && data.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm"><Loader2Icon className="size-6 animate-spin" /></div>
            )}
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-muted">
                {table.getHeaderGroups().map(headerGroup => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map(header => (
                      <TableHead key={header.id} colSpan={header.colSpan}>
                        {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows.length ? (
                  <SortableContext items={data.map(d => d.id)} strategy={verticalListSortingStrategy}>
                    {table.getRowModel().rows.map(row => (
                      <DraggableRow
                        key={row.id}
                        row={row}
                        onEdit={() => { setEditingRecord(row.original); setIsDrawerOpen(true); }}
                        onDelete={() => deleteMutation.mutate(row.original.id)}
                      />
                    ))}
                  </SortableContext>
                ) : (
                  <TableRow><TableCell colSpan={table.getVisibleLeafColumns().length} className="h-24 text-center">No {entityName.toLowerCase()}s found.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </DndContext>
      </div>

      {/* Pagination controls (same as before) */}
      <div className="flex items-center justify-between px-4">
        <div className="text-muted-foreground text-sm">{table.getRowModel().rows.length} of {totalCount} {entityName.toLowerCase()}(s)</div>
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2">
            <Label htmlFor="rows-per-page">Rows per page</Label>
            <Select value={String(pagination.pageSize)} onValueChange={val => table.setPageSize(Number(val))}>
              <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
              <SelectContent><SelectGroup>{[10,20,30,50].map(size => <SelectItem key={size} value={String(size)}>{size}</SelectItem>)}</SelectGroup></SelectContent>
            </Select>
          </div>
          <div>Page {pagination.pageIndex + 1} of {table.getPageCount()}</div>
          <div className="flex gap-1">
            <Button variant="outline" size="icon" onClick={() => table.setPageIndex(0)} disabled={!table.getCanPreviousPage()}><ChevronsLeftIcon className="size-4" /></Button>
            <Button variant="outline" size="icon" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}><ChevronLeftIcon className="size-4" /></Button>
            <Button variant="outline" size="icon" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}><ChevronRightIcon className="size-4" /></Button>
            <Button variant="outline" size="icon" onClick={() => table.setPageIndex(table.getPageCount() - 1)} disabled={!table.getCanNextPage()}><ChevronsRightIcon className="size-4" /></Button>
          </div>
        </div>
      </div>

      {/* Dynamic Form Drawer */}
      <DynamicFormDrawer
        open={isDrawerOpen}
        onOpenChange={setIsDrawerOpen}
        title={editingRecord ? `Edit ${entityName}` : `Create ${entityName}`}
        fields={formConfig}
        initialValues={editingRecord || {}}
        onSubmit={async (values) => {
          if (editingRecord) await updateMutation.mutateAsync({ id: editingRecord.id, data: values });
          else await createMutation.mutateAsync(values);
        }}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
      />
    </div>
  );
}