// config/orders-table.config.ts
import { currencySymbolMap } from "@/lib/constants";
import { DataTableConfig } from "@/types/dynamic-datatable-types";

export const ordersTableConfig: DataTableConfig = {
  id: "orders-table",
  title: "Orders Management",
  defaultPageSize: 10,
  pageSizeOptions: [10, 20, 50, 100],
  exportable: true,
  searchable: true,
  
  columns: [
    {
      id: "order_id",
      accessorKey: "order_id",
      header: "Order #",
      type: "text",
      sortable: true,
      filterable: true,
    },
    {
      id: "email",
      accessorKey: "email",
      header: "Customer Email",
      type: "text",
      sortable: true,
      filterable: true,
    },
    {
      id: "total",
      accessorKey: "total",
      header: "Total Amount",
      type: "currency",
      sortable: true,
      filterable: true,
      currency: currencySymbolMap['php'],
    },
    {
      id: "status",
      accessorKey: "status",
      header: "Status",
      type: "badge",
      sortable: true,
      filterable: true,
      badgeStyles: {
        pending: "warning",
        completed: "success",
        canceled: "destructive",
        requires_action: "info",
      },
    },
    {
      id: "created_at",
      accessorKey: "created_at",
      header: "Created Date",
      type: "date",
      sortable: true,
      filterable: true,
      dateFormat: "MM/DD/YYYY HH:mm",
    },
    {
      id: "updated_at",
      accessorKey: "updated_at",
      header: "Last Updated",
      type: "date",
      sortable: true,
      filterable: true,
      dateFormat: "MM/DD/YYYY HH:mm",
    },
  ],
  
  filters: [],
  
  defaultSort: {
    field: "created_at",
    direction: "desc",
  },
};