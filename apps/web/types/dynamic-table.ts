// types/dynamic-table.ts

export interface ColumnConfig {
  id: string;                    // field name in data object
  header: string;                // display label
  accessorKey?: string;          // same as id usually
  cell?: (value: any, row: any) => React.ReactNode; // optional custom renderer
  enableSorting?: boolean;
  enableHiding?: boolean;
  size?: number;
  meta?: Record<string, any>;
}

export interface FieldConfig {
  name: string;                  // field name
  label: string;
  type: 'text' | 'number' | 'select' | 'date' | 'textarea' | 'custom';
  required?: boolean;
  placeholder?: string;
  options?: Array<{ value: string; label: string }>; // for select
  defaultValue?: any;
  customComponent?: React.ComponentType<{ value: any; onChange: (val: any) => void; field: FieldConfig }>;
}

export interface N8nEndpoints {
  list: string;       // webhook path for GET list (supports query params)
  create: string;     // POST
  update: string;     // PUT/PATCH – will append /:id
  delete: string;     // DELETE – will append /:id
  reorder: string;    // POST to reorder items (receives { ids: string[] })
}

export interface DynamicDataTableProps<TData = any> {
  entityName: string;            // e.g., "Order", "Product"
  columnsConfig: ColumnConfig[];
  formConfig: FieldConfig[];     // for create/edit drawer
  n8n: N8nEndpoints;
  n8nBaseUrl: string;            // base URL for n8n webhooks
  companyId?: string;            // optional, appended to list queries
  defaultPageSize?: number;
  refreshInterval?: number;      // auto-refresh in ms
  onError?: (error: Error) => void;
  onSuccess?: (message: string) => void;
  // Optional callbacks for custom side effects
  onBeforeCreate?: (data: Partial<TData>) => Promise<Partial<TData>>;
  onAfterCreate?: (record: TData) => void;
  onBeforeUpdate?: (id: string, data: Partial<TData>) => Promise<Partial<TData>>;
  onAfterUpdate?: (record: TData) => void;
  onBeforeDelete?: (id: string) => Promise<boolean>;
  onAfterDelete?: (id: string) => void;
  onBeforeReorder?: (ids: string[]) => Promise<string[]>;
  onAfterReorder?: (ids: string[]) => void;
}