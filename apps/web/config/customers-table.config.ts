// config/customers-table.config.ts
import { DataTableConfig } from "@/types/dynamic-datatable-types";

export const customerTableConfig: DataTableConfig = {
  id: "customers-table",
  title: "Customer Management",
  defaultPageSize: 10,
  pageSizeOptions: [10, 20, 50, 100],
  exportable: true,
  searchable: true,
  
  columns: [
    {
      id: "first_name",
      accessorKey: "first_name",
      header: "First Name",
      type: "text",
      sortable: true,
      filterable: true,
    },
    {
      id: "last_name",
      accessorKey: "last_name",
      header: "Last Name",
      type: "text",
      sortable: true,
      filterable: true,
    },
    {
      id: "email",
      accessorKey: "email",
      header: "Email",
      type: "text",
      sortable: true,
      filterable: true,
    },
    {
      id: "phone",
      accessorKey: "phone",
      header: "Phone Number",
      type: "text",
      sortable: false,
      filterable: true,
    },
    {
      id: "has_account",
      accessorKey: "has_account",
      header: "Has Account",
      type: "badge",
      sortable: false,
      filterable: true,
      badgeStyles: {
        true: "success",
        false: "secondary",
      },
    },
    {
      id: "created_at",
      accessorKey: "created_at",
      header: "Created Date",
      type: "date",
      sortable: true,
      filterable: true,
      dateFormat: "MM/DD/YYYY",
    },
    {
      id: "updated_at",
      accessorKey: "updated_at",
      header: "Last Updated",
      type: "date",
      sortable: true,
      filterable: true,
      dateFormat: "MM/DD/YYYY",
    }
  ],
  
  filters: [],
  
  defaultSort: {
    field: "created_at",
    direction: "desc",
  },
};