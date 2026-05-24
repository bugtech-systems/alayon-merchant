// types/datatable.types.ts

export type ColumnType = 'text' | 'number' | 'date' | 'badge' | 'currency' | 'boolean' | 'custom';

// export interface ColumnConfig {
//   id: string;
//   accessorKey: string;
//   header: string;
//   type: ColumnType;
//   width?: string;
//   sortable?: boolean;
//   filterable?: boolean;
//   cellRenderer?: (value: any, row: any) => React.ReactNode;
//   badgeStyles?: {
//     [key: string]: string;
//   };
//   currency?: string;
//   dateFormat?: string;
// }

export interface FilterOperator {
  value: string;
  label: string;
}

export interface FilterFieldConfig {
  id: string;
  field: string;
  type: 'text' | 'select' | 'date' | 'daterange' | 'number';
  label: string;
  placeholder?: string;
  operators?: FilterOperator[];
  options?: Array<{ value: string; label: string }>;
  defaultValue?: any;
}

export interface DataTableConfig {
  id: string;
  title?: string;
  columns: ColumnConfig[];
  filters?: FilterFieldConfig[];
  defaultSort?: {
    field: string;
    direction: 'asc' | 'desc';
  };
  defaultPageSize?: number;
  pageSizeOptions?: number[];
  exportable?: boolean;
  searchable?: boolean;
}

export interface ColumnConfig {
  id: string;
  accessorKey: string;
  header: string;
  type: ColumnType;
  width?: string;
  sortable?: boolean;
  filterable?: boolean; // Add this - whether column can be filtered
  cellRenderer?: (value: any, row: any) => React.ReactNode;
  badgeStyles?: {
    [key: string]: string;
  };
  currency?: string;
  dateFormat?: string;
}
