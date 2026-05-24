"use client"

import * as React from "react"
import {
  ColumnDef,
  getCoreRowModel,
  useReactTable,
  flexRender,
  getPaginationRowModel,
} from "@tanstack/react-table"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"

import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@workspace/ui/components/tabs"

import {
  Button
} from "@workspace/ui/components/button"

import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem
} from "@workspace/ui/components/select"

import {
  Badge
} from "@workspace/ui/components/badge"

import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
  Download
} from "lucide-react"

import { useN8nQuery } from "@/hooks/useN8nQuery"
import { useURLFilters } from "@/hooks/useUrlFilters"

type Order = {
  id: string
  order_number: string
  order_type: string
  total_amount: number
  is_paid: boolean
  order_date: string
}

const ordersWidget = {
  id: "orders-table",
  webhook: {
    url: "/webhook/orders",
    method: "GET",
    queryMap: {
      from: "from",
      to: "to",
      branch: "branch",
      batch: "batch",
      type: "type",
      page: "page",
      limit: "limit",
    },
  },
}

export function DataTable() {
  const { filters, setFilters } = useURLFilters() as any
 
  const [activeTab, setActiveTab] = React.useState("sale")

  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 10,
  })

  const { data, isLoading } = useN8nQuery({widget: ordersWidget, filters: {
    ...filters,
    type: activeTab,
    page: pagination.pageIndex + 1,
    limit: pagination.pageSize,
  }}) as any;

  const tableData: Order[] = (data && data[0]?.data) || []
  const total = (data && data[0]?.total) || 0

  const columns: ColumnDef<Order>[] = [
    {
      accessorKey: "order_number",
      header: "Order #",
    },
    {
      accessorKey: "order_type",
      header: "Type",
      cell: ({ row }) => (
        <Badge variant="outline">
          {row.original.order_type}
        </Badge>
      ),
    },
    {
      accessorKey: "description",
      header: "Description",
    },
    {
      accessorKey: "total_amount",
      header: "Amount",
      cell: ({ row }) =>
        `₱${row.original.total_amount?.toLocaleString()}`,
    },
    {
      accessorKey: "is_paid",
      header: "Status",
      cell: ({ row }) =>
        row.original.is_paid ? "✅ Paid" : "❌ Unpaid",
    },
    {
      accessorKey: "order_date",
      header: "Date",
      cell: ({ row }) =>
        new Date(row.original.order_date).toLocaleDateString(),
    },
  ]


  console.log(tableData, 'TABLE', data)

  const table = useReactTable({
    data: tableData,
    columns,
    state: {
      pagination,
    },
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    manualPagination: true,
    pageCount: Math.ceil(total / pagination.pageSize),
  })

  // sync pagination → filters
  React.useEffect(() => {
    setFilters((prev: any) => ({
      ...prev,
      page: pagination.pageIndex + 1,
      limit: pagination.pageSize,
    }))
  }, [pagination])

  // CSV EXPORT
  function exportCSV(rows: Order[] | any) {
    if (!rows.length) return

    const headers = Object.keys(rows[0])

    const csv = [
      headers.join(","),
      ...rows.map((row: any) =>
        headers.map((h) => `"${(row as any)[h] ?? ""}"`).join(",")
      ),
    ].join("\n")

    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)

    const a = document.createElement("a")
    a.href = url
    a.download = "orders.csv"
    a.click()
  }

  return (
    <div className="w-full space-y-4">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <Tabs
          value={activeTab}
          onValueChange={(val) => {
            setActiveTab(val)
            setPagination((p) => ({ ...p, pageIndex: 0 }))
          }}
        >
          <TabsList>
            <TabsTrigger value="sale">Sales</TabsTrigger>
            <TabsTrigger value="expense">Expenses</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-2">
          <Select
            value={String(pagination.pageSize)}
            onValueChange={(val) =>
              setPagination((p) => ({
                ...p,
                pageSize: Number(val),
              }))
            }
          >
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[10, 20, 50].map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            onClick={() => exportCSV(tableData)}
          >
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* TABLE */}
      <div className="rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {flexRender(
                      header.column.columnDef.header,
                      header.getContext()
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>

          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={columns.length}>
                  Loading...
                </TableCell>
              </TableRow>
            ) : tableData.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length}>
                  No results
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* PAGINATION */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Page {pagination.pageIndex + 1} of{" "}
          {table.getPageCount() || 1}
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="icon"
            variant="outline"
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronsLeftIcon />
          </Button>

          <Button
            size="icon"
            variant="outline"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronLeftIcon />
          </Button>

          <Button
            size="icon"
            variant="outline"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            <ChevronRightIcon />
          </Button>

          <Button
            size="icon"
            variant="outline"
            onClick={() =>
              table.setPageIndex(table.getPageCount() - 1)
            }
            disabled={!table.getCanNextPage()}
          >
            <ChevronsRightIcon />
          </Button>
        </div>
      </div>
    </div>
  )
}