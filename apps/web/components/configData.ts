// config/bettings-table.config.ts

import { DataTableConfig } from "@/types/dynamic-datatable-types";

export const transactionsTableConfig: DataTableConfig = {
  id: "transactions-table",
  title: "Transactions Management",
  defaultPageSize: 10,
  pageSizeOptions: [10, 20, 50, 100],
  exportable: true,
  searchable: true,
  
  columns: [
    {
      id: "order_number",
      accessorKey: "order_number",
      header: "Transaction ID",
      type: "text",
      sortable: true,
      filterable: true,
    },
    {
      id: "order_type",
      accessorKey: "order_type",
      header: "Transaction Type",
      type: "badge",
      sortable: true,
      filterable: true,
      badgeStyles: {
        income: "success",
        expense: "destructive",
        refund: "warning",
        transfer: "info",
        payment: "default",
        withdrawal: "secondary",
        deposit: "success",
        fee: "destructive",
        tax: "warning",
      },
    },
    {
      id: "description",
      accessorKey: "description",
      header: "Description",
      type: "text",
      sortable: true,
      filterable: true,
    },
    {
      id: "total_amount",
      accessorKey: "total_amount",
      header: "Amount",
      type: "number",
      sortable: true,
      filterable: true,
    },
    {
      id: "order_date",
      accessorKey: "order_date",
      header: "Transaction Date",
      type: "date",
      sortable: true,
      filterable: true,
      dateFormat: "MM/DD/YYYY HH:mm",
    },  {
      id: "branch_id",
      accessorKey: "branch_id",
      header: "Branch",
      type: "text",
      sortable: true,
      filterable: true,
    }, {
      id: "batch_id",
      accessorKey: "batch_id",
      header: "Batch",
      type: "text",
      sortable: true,
      filterable: true,
    }, {
      id: "peddler_id",
      accessorKey: "peddler_id",
      header: "Peddler",
      type: "text",
      sortable: true,
      filterable: true,
    },
    {
      id: "status",
      accessorKey: "status",
      header: "Status",
      type: "badge",
      sortable: true,
      filterable: true,
      badgeStyles: {
        completed: "secondary",
        unpaid: "destructive",
        paid: "default"
      },
    },
  ],
  
  // Custom filters configuration
  filters: [ ],
  
  defaultSort: {
    field: "date",
    direction: "desc",
  },
};

// configs/userTableConfig.ts

export const usersTableConfig: DataTableConfig = {
  id: "users-table",
  title: "Users Management",
  defaultPageSize: 10,
  pageSizeOptions: [10, 20, 50, 100],
  exportable: true,
  searchable: true,
  
  columns: [
        {
      id: "username",
      accessorKey: "username",
      header: "Username",
      type: "text",
      sortable: true,
      filterable: true,
    },
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
      sortable: false,
      filterable: true,
    },
      {
      id: "mobile",
      accessorKey: "mobile",
      header: "Mobile",
      type: "text",
      sortable: false,
      filterable: true,
    },
        {
      id: "address",
      accessorKey: "address",
      header: "Address",
      type: "text",
      sortable: false,
      filterable: true,
    },
        {
      id: "branch_name",
      accessorKey: "branch_name",
      header: "Branch",
      type: "text",
      sortable: false,
      filterable: true,
    },
    {
      id: "created_at",
      accessorKey: "created_at",
      header: "Created Date",
      type: "date",
      sortable: false,
      filterable: false,
      dateFormat: "MM/DD/YYYY",
    },
    {
      id: "updated_at",
      accessorKey: "updated_at",
      header: "Last Updated",
      type: "date",
      sortable: false,
      filterable: false,
      dateFormat: "MM/DD/YYYY",
    },
  ],
  
  // Custom filters configuration
  filters: [
    // {
    //   id: "date_range",
    //   field: "created_at",
    //   type: "daterange",
    //   label: "Registration Date",
    //   placeholder: "Select date range",
    // },
    // {
    //   id: "search_user",
    //   field: "search",
    //   type: "text",
    //   label: "Quick Search",
    //   placeholder: "Search by name or email...",
    // },
  ],
  
  defaultSort: {
    field: "created_at",
    direction: "desc",
  },
};

export const customerTableConfig: DataTableConfig = {
  id: "customer-table",
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
      sortable: true,
      filterable: true,
    },
    {
      id: "has_account",
      accessorKey: "has_account",
      header: "Has Account",
      type: "badge",
      sortable: true,
      filterable: true,
      badgeStyles: {
        true: "success",
        false: "secondary",
      },
    },
    // {
    //   id: "actor_type",
    //   accessorKey: "metadata.actor_type",
    //   header: "Customer Type",
    //   type: "badge",
    //   sortable: true,
    //   filterable: true,
    //   badgeStyles: {
    //     customer: "default",
    //     driver: "info",
    //     peddler: "warning",
    //     admin: "destructive",
    //   },
    // },
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
  
  filters: [
    // {
    //   id: "has_account",
    //   field: "has_account",
    //   type: "select",
    //   label: "Account Status",
    //   options: [
    //     { value: "true", label: "Has Account" },
    //     { value: "false", label: "No Account" },
    //   ],
    // },
    // {
    //   id: "customer_type",
    //   field: "metadata.actor_type",
    //   type: "select",
    //   label: "Customer Type",
    //   placeholder: "Filter by customer type",
    //   options: [
    //     { value: "customer", label: "Regular Customer" },
    //     { value: "driver", label: "Driver" },
    //     { value: "peddler", label: "Peddler" },
    //     { value: "admin", label: "Admin" },
    //   ],
    // },
    // {
    //   id: "date_range",
    //   field: "created_at",
    //   type: "daterange",
    //   label: "Registration Date",
    //   placeholder: "Select date range",
    // },
    // {
    //   id: "search_customer",
    //   field: "search",
    //   type: "text",
    //   label: "Quick Search",
    //   placeholder: "Search by name, email, or phone...",
    // },
  ],
  
  defaultSort: {
    field: "created_at",
    direction: "desc",
  },
};

// Optional: Pre-defined filter presets for common scenarios
export const userFilterPresets = {
  activeUsers: {
    label: "Active Users",
    filters: { is_deleted: "false" },
  },
  deletedUsers: {
    label: "Deleted Users",
    filters: { is_deleted: "true" },
  },
  adminUsers: {
    label: "Admin Users",
    filters: { is_admin: "true", is_deleted: "false" },
  },
  highCommission: {
    label: "High Commission (>5%)",
    filters: { commission_min: "5" },
  },
  recentUsers: {
    label: "Recent Users (Last 30 days)",
    filters: { created_at_from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0] },
  },
};

export const bettingsTableConfig: DataTableConfig = {
  id: "bettings-table",
  title: "Bettings",
  defaultPageSize: 10,
  pageSizeOptions: [10, 20, 50, 100],
  exportable: true,
  searchable: true,
  
  columns: [
    {
      id: "ticket_no",
      accessorKey: "ticket_no",
      header: "Ticket #",
      type: "text",
      sortable: true,
      width: "120px",
    },
    {
      id: "collector",
      accessorKey: "collector",
      header: "Collector",
      type: "text",
      sortable: true,
      width: "180px",
    },
    {
      id: "game_time",
      accessorKey: "game_time",
      header: "Game Time",
      type: "badge",
      sortable: true,
      width: "100px",
      badgeStyles: {
        "2pm": "default",
        "5pm": "secondary", 
        "8pm": "warning",
        "9pm": "destructive",
      },
    },
    {
      id: "gross",
      accessorKey: "gross",
      header: "Gross Amount",
      type: "currency",
      sortable: true,
      currency: "₱",
      width: "140px",
    },
    {
      id: "is_complete",
      accessorKey: "is_complete",
      header: "Status",
      type: "boolean",
      sortable: true,
      width: "100px",
    },
    {
      id: "timestamp",
      accessorKey: "timestamp",
      header: "Date & Time",
      type: "date",
      sortable: true,
      dateFormat: "MM/DD/YYYY HH:mm",
      width: "160px",
    },
  ],
  
  filters: [
    {
      id: "input_type_filter",
      field: "input_type",
      type: "select",
      label: "Bet Type",
      options: [
        { value: "normal", label: "Normal" },
        { value: "special", label: "Special" },
        { value: "promo", label: "Promo" },
      ],
    },
    {
      id: "status_filter",
      field: "is_complete",
      type: "select",
      label: "Completion Status",
      options: [
        { value: "true", label: "Completed" },
        { value: "false", label: "Pending" },
      ],
    },
    {
      id: "game_time_filter",
      field: "game_time",
      type: "select",
      label: "Game Time",
      options: [
        { value: "2pm", label: "2 PM" },
        { value: "5pm", label: "5 PM" },
        { value: "8pm", label: "8 PM" },
        { value: "9pm", label: "9 PM" },
      ],
    },
    {
      id: "collector_filter",
      field: "collector",
      type: "text",
      label: "Collector Name",
      placeholder: "Search by collector name...",
    },
    {
      id: "owner_filter",
      field: "owner_id",
      type: "select",
      label: "Branch",
      options: [
        { value: "branch1", label: "Branch 1" },
        { value: "branch2", label: "Branch 2" },
        { value: "branch3", label: "Branch 3" },
        // These should be dynamically loaded from your API
      ],
    },
    {
      id: "date_range",
      field: "date_range",
      type: "daterange",
      label: "Date Range",
      placeholder: "Select date range",
    },
    {
      id: "amount_filter",
      field: "amount",
      type: "number",
      label: "Gross Amount Range",
    },
    {
      id: "search_filter",
      field: "search",
      type: "text",
      label: "Search",
      placeholder: "Search by ticket #, collector, or owner...",
    },
  ],
  
  defaultSort: {
    field: "timestamp",
    direction: "desc",
  },
};


export const ordersTableConfig: DataTableConfig = {
  id: "orders-table",
  title: "Orders",
  defaultPageSize: 10,
  pageSizeOptions: [10, 20, 50, 100],
  exportable: true,
  searchable: true,
  
  columns: [
    {
      id: "order_number",
      accessorKey: "order_number",
      header: "Order #",
      type: "text",
      sortable: true,
    },
    {
      id: "order_type",
      accessorKey: "order_type",
      header: "Type",
      type: "badge",
      sortable: true,
      badgeStyles: {
        sale: "default",
        expense: "secondary",
        advance: "warning",
      },
    },
    {
      id: "description",
      accessorKey: "description",
      header: "Description",
      type: "text",
      sortable: false,
    },
    {
      id: "total_amount",
      accessorKey: "total_amount",
      header: "Amount",
      type: "currency",
      sortable: true,
      currency: "₱",
    },
    {
      id: "is_paid",
      accessorKey: "is_paid",
      header: "Status",
      type: "boolean",
      sortable: true,
    },
    {
      id: "order_date",
      accessorKey: "order_date",
      header: "Date",
      type: "date",
      sortable: true,
      dateFormat: "MM/DD/YYYY",
    },
  ],
  
  filters: [
    {
      id: "status_filter",
      field: "status",
      type: "select",
      label: "Status",
      options: [
        { value: "paid", label: "Paid" },
        { value: "unpaid", label: "Unpaid" },
        { value: "pending", label: "Pending" },
      ],
    },
    {
      id: "date_range",
      field: "date_range",
      type: "daterange",
      label: "Date Range",
      placeholder: "Select date range",
    },
    {
      id: "amount_filter",
      field: "amount",
      type: "number",
      label: "Amount Range",
    },
    {
      id: "search_filter",
      field: "search",
      type: "text",
      label: "Search",
      placeholder: "Search by order number or description...",
    },
  ],
  
  defaultSort: {
    field: "order_date",
    direction: "desc",
  },
};

// config/branches-table.config.ts
export const branchesTableConfig: DataTableConfig = {
  id: "branches-table",
  title: "Branches",
  defaultPageSize: 20,
  pageSizeOptions: [10, 20, 50],
  exportable: true,
  searchable: true,
  
  columns: [
    {
      id: "name",
      accessorKey: "name",
      header: "Branch Name",
      type: "text",
      sortable: true,
    },
    {
      id: "code",
      accessorKey: "code",
      header: "Branch Code",
      type: "text",
      sortable: true,
    },
    {
      id: "location",
      accessorKey: "location",
      header: "Location",
      type: "text",
      sortable: false,
    },
    {
      id: "manager",
      accessorKey: "manager",
      header: "Manager",
      type: "text",
      sortable: true,
    },
    {
      id: "status",
      accessorKey: "status",
      header: "Status",
      type: "badge",
      sortable: true,
      badgeStyles: {
        active: "success",
        inactive: "secondary",
        suspended: "destructive",
      },
    },
  ],
  
  filters: [
    {
      id: "status_filter",
      field: "status",
      type: "select",
      label: "Status",
      options: [
        { value: "active", label: "Active" },
        { value: "inactive", label: "Inactive" },
        { value: "suspended", label: "Suspended" },
      ],
    },
  ],
};


export const soldoutTableConfig: DataTableConfig = {
  id: "soldout-table",
  title: "Sold Out Report",
  defaultPageSize: 10,
  pageSizeOptions: [10, 20, 50, 100],
  exportable: true,
  searchable: true,
  
  columns: [
    {
      id: "timestamp",
      accessorKey: "timestamp",
      header: "Date",
      type: "date",
      sortable: true,
      filterable: true,
      dateFormat: "MM/DD/YYYY",
      width: "120px",
    },
    {
      id: "game_time",
      accessorKey: "game_time",
      header: "Game Time",
      type: "badge",
      sortable: true,
      filterable: true,
      width: "100px",
      badgeStyles: {
        "2pm": "default",
        "5pm": "secondary",
        "8pm": "warning",
        "9pm": "destructive",
        "morning": "default",
        "afternoon": "secondary",
        "evening": "warning",
      },
    },
    {
      id: "gross",
      accessorKey: "gross",
      header: "Total Amount",
      type: "currency",
      sortable: true,
      filterable: true,
      currency: "₱",
      width: "150px",
    },
    {
      id: "hits",
      accessorKey: "hits",
      header: "Hits",
      type: "number",
      sortable: true,
      filterable: true,
      width: "100px",
    },
  ],
  
  filters: [
    {
      id: "date_range",
      field: "date_range",
      type: "daterange",
      label: "Date Range",
      placeholder: "Select date range",
    },
    {
      id: "game_time_filter",
      field: "game_time",
      type: "select",
      label: "Game Time",
      options: [
        { value: "2pm", label: "2:00 PM" },
        { value: "5pm", label: "5:00 PM" },
        { value: "8pm", label: "8:00 PM" },
        { value: "9pm", label: "9:00 PM" },
        { value: "morning", label: "Morning" },
        { value: "afternoon", label: "Afternoon" },
        { value: "evening", label: "Evening" },
      ],
    },
    {
      id: "total_range",
      field: "total",
      type: "number",
      label: "Total Amount Range",
      placeholder: "Filter by total amount",
    },
    {
      id: "hits_range",
      field: "hits",
      type: "number",
      label: "Hits Range",
      placeholder: "Filter by number of hits",
    },
    {
      id: "search_filter",
      field: "search",
      type: "text",
      label: "Quick Search",
      placeholder: "Search by date or game time...",
    },
  ],
  
  defaultSort: {
    field: "date",
    direction: "desc",
  },
};

export const drawsTableConfig: DataTableConfig = {
  id: "draws-table",
  title: "Draws Management",
  defaultPageSize: 10,
  pageSizeOptions: [10, 20, 50, 100],
  exportable: true,
  searchable: true,
  
  columns: [
    {
      id: "game_time",
      accessorKey: "game_time",
      header: "Game Time",
      type: "badge",
      sortable: true,
      filterable: true,
      width: "120px",
      badgeStyles: {
        "2pm": "default",
        "5pm": "secondary",
        "8pm": "warning",
        "9pm": "destructive",
      },
    },
    {
      id: "combination",
      accessorKey: "combination",
      header: "Winning Combination",
      type: "text",
      sortable: true,
      filterable: true,
      width: "180px",
    },
    {
      id: "gross_total",
      accessorKey: "gross_total",
      header: "Gross Total",
      type: "currency",
      sortable: true,
      filterable: true,
      currency: "₱",
      width: "140px",
    },
    {
      id: "net_total",
      accessorKey: "net_total",
      header: "Net Total",
      type: "currency",
      sortable: true,
      filterable: true,
      currency: "₱",
      width: "140px",
    },
    {
      id: "sold_out_total",
      accessorKey: "sold_out_total",
      header: "Sold Out",
      type: "currency",
      sortable: true,
      filterable: true,
      currency: "₱",
      width: "140px",
    },
    {
      id: "win_total",
      accessorKey: "win_total",
      header: "Winning Payout",
      type: "number",
      sortable: true,
      filterable: true,
      width: "140px",
    },
    {
      id: "is_win_to",
      accessorKey: "is_win_to",
      header: "Win To",
      type: "boolean",
      sortable: true,
      filterable: true,
      width: "100px",
    },
    {
      id: "total_bets_count",
      accessorKey: "total_bets_count",
      header: "Total Bets",
      type: "number",
      sortable: true,
      filterable: true,
      width: "100px",
    },
    {
      id: "created_at",
      accessorKey: "created_at",
      header: "Draw Date",
      type: "date",
      sortable: true,
      filterable: true,
      dateFormat: "MM/DD/YYYY HH:mm",
      width: "160px",
    },
  ],
  
  filters: [
    {
      id: "date_range",
      field: "date_range",
      type: "daterange",
      label: "Draw Date Range",
      placeholder: "Select date range",
    },
    {
      id: "game_time_filter",
      field: "game_time",
      type: "select",
      label: "Game Time",
      placeholder: "Filter by game time",
      options: [
        { value: "2pm", label: "2:00 PM" },
        { value: "5pm", label: "5:00 PM" },
        { value: "8pm", label: "8:00 PM" },
        { value: "9pm", label: "9:00 PM" },
      ],
    },
    {
      id: "win_to_filter",
      field: "is_win_to",
      type: "select",
      label: "Win To Status",
      options: [
        { value: "true", label: "✅ Win To Active" },
        { value: "false", label: "❌ Win To Inactive" },
      ],
    },
    {
      id: "gross_range",
      field: "gross_total",
      type: "number",
      label: "Gross Amount Range",
      placeholder: "Filter by gross amount",
    },
    {
      id: "net_range",
      field: "net_total",
      type: "number",
      label: "Net Amount Range",
      placeholder: "Filter by net amount",
    },
    {
      id: "profit_range",
      field: "profit_loss",
      type: "number",
      label: "Profit/Loss Range",
      placeholder: "Filter by profit/loss",
    },
    {
      id: "search_filter",
      field: "search",
      type: "text",
      label: "Quick Search",
      placeholder: "Search by combination or game time...",
    },
  ],
  
  defaultSort: {
    field: "created_at",
    direction: "desc",
  },
};

export const batchTableConfig: DataTableConfig = {
  id: "batches-table",
  title: "Batches Management",
  defaultPageSize: 10,
  pageSizeOptions: [10, 20, 50, 100],
  exportable: true,
  searchable: true,
  
  columns: [
    {
      id: "batch_number",
      accessorKey: "batch_number",
      header: "Batch Number",
      type: "text",
      sortable: true,
      filterable: true,
    },
    {
      id: "branch_name",
      accessorKey: "branch_name",
      header: "Branch",
      type: "text",
      sortable: true,
      filterable: true,
    },
    {
      id: "status",
      accessorKey: "status",
      header: "Status",
      type: "badge",
      sortable: true,
      filterable: true,
      badgeStyles: {
        active: "success",
        completed: "info",
        cancelled: "destructive",
        pending: "warning",
        archived: "secondary",
      },
    },
    {
      id: "amount",
      accessorKey: "amount",
      header: "Amount",
      type: "currency",
      sortable: true,
      filterable: true,
      currency: "₱",
    },
    {
      id: "total_cans",
      accessorKey: "total_cans",
      header: "Total Cans",
      type: "number",
      sortable: true,
      filterable: true,
    },
     {
      id: "total_crates",
      accessorKey: "total_crates",
      header: "Total Crates",
      type: "number",
      sortable: true,
      filterable: true,
    },
    {
      id: "sold_cans",
      accessorKey: "sold_cans",
      header: "Sold Cans",
      type: "number",
      sortable: true,
      filterable: true,
    },
    {
      id: "bad_order_cans",
      accessorKey: "bad_order_cans",
      header: "Bad Order Cans",
      type: "number",
      sortable: true,
      filterable: true,
    },
    {
      id: "remaining_cans",
      accessorKey: "remaining_cans",
      header: "Remaining Cans",
      type: "number",
      sortable: true,
      filterable: true,
    },
    {
      id: "description",
      accessorKey: "description",
      header: "Description",
      type: "text",
      sortable: true,
      filterable: true,
    },
    {
      id: "purchase_date",
      accessorKey: "purchase_date",
      header: "Purchase Date",
      type: "date",
      sortable: true,
      filterable: true,
      dateFormat: "MM/DD/YYYY",
    }
  ],
  
  filters: [ ],
  
  defaultSort: {
    field: "purchase_date",
    direction: "desc",
  },
};
