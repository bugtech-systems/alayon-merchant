// config/quick-create-actions.ts
import { UserPlus, Users, ShoppingCart, Package, Tag, Building2, Mail, Phone, FileText } from "lucide-react";
import type { QuickCreateAction } from "@/components/quick-create-button";
import type { FormConfig } from "@/components/dynamic-form-modal";

// Customer Form Configuration
const customerFormConfig: FormConfig = {
  title: "Create New Customer",
  description: "Add a new customer to your database",
  fields: [
    {
      name: "firstName",
      label: "First Name",
      type: "text",
      placeholder: "John",
      required: true,
      validation: {
        min: 2,
        max: 50,
      },
    },
    {
      name: "lastName",
      label: "Last Name",
      type: "text",
      placeholder: "Doe",
      required: true,
      validation: {
        min: 2,
        max: 50,
      },
    },
    {
      name: "email",
      label: "Email Address",
      type: "email",
      placeholder: "customer@example.com",
      required: true,
    },
    {
      name: "phone",
      label: "Phone Number",
      type: "tel",
      placeholder: "+1 234 567 8900",
      required: false,
    },
    {
      name: "company",
      label: "Company",
      type: "text",
      placeholder: "Company Name",
      required: false,
    },
  ],
  submitLabel: {
    create: "Create Customer",
    update: "Update Customer",
  },
  webhook: {
    createEndpoint: "/webhook/create-customer",
    updateEndpoint: "/webhook/update-customer",
    method: "POST",
    transformData: (data) => ({
      ...data,
      fullName: `${data.firstName} ${data.lastName}`,
      createdAt: new Date().toISOString(),
    }),
  },
};

// Member Form Configuration
const memberFormConfig: FormConfig = {
  title: "Add New Team Member",
  description: "Invite a new member to your team",
  fields: [
    {
      name: "name",
      label: "Full Name",
      type: "text",
      placeholder: "Jane Smith",
      required: true,
      validation: {
        min: 2,
        max: 50,
      },
    },
    {
      name: "email",
      label: "Email Address",
      type: "email",
      placeholder: "member@company.com",
      required: true,
    },
    {
      name: "role",
      label: "Role",
      type: "select",
      required: true,
      options: [
        { value: "admin", label: "Administrator" },
        { value: "manager", label: "Manager" },
        { value: "editor", label: "Editor" },
        { value: "viewer", label: "Viewer" },
      ],
      defaultValue: "viewer",
    },
    {
      name: "department",
      label: "Department",
      type: "select",
      required: false,
      options: [
        { value: "sales", label: "Sales" },
        { value: "marketing", label: "Marketing" },
        { value: "engineering", label: "Engineering" },
        { value: "support", label: "Customer Support" },
      ],
    },
  ],
  submitLabel: {
    create: "Invite Member",
    update: "Update Member",
  },
  webhook: {
    createEndpoint: "/webhook/invite-member",
    updateEndpoint: "/webhook/update-member",
    method: "POST",
    transformData: (data) => ({
      ...data,
      invitedAt: new Date().toISOString(),
      status: "pending",
    }),
  },
};

// Draft Order Form Configuration
const draftOrderFormConfig: FormConfig = {
  title: "Create Draft Order",
  description: "Create a new draft order for a customer",
  size: "full", // or "xl", "lg", "md", "sm"
  fields: [
    {
      name: "customerName",
      label: "Customer Name",
      type: "text",
      placeholder: "Customer name",
      required: true,
    },
    {
      name: "customerEmail",
      label: "Customer Email",
      type: "email",
      placeholder: "customer@example.com",
      required: true,
    },
    {
      name: "product",
      label: "Product",
      type: "select",
      colSpan: "half",
      required: true,
      options: [
        { value: "product-1", label: "Product 1 - $99" },
        { value: "product-2", label: "Product 2 - $149" },
        { value: "product-3", label: "Product 3 - $199" },
      ],
    },
    {
      name: "quantity",
      label: "Quantity",
      type: "number",
      placeholder: "1",
      required: true,
      validation: {
        min: 1,
        max: 100,
        integer: true,
      },
      defaultValue: 1,
    },
    {
      name: "notes",
      label: "Order Notes",
      type: "textarea",
      placeholder: "Special instructions or notes...",
      required: false,
      validation: {
        max: 500,
      },
    },
  ],
  submitLabel: {
    create: "Create Draft Order",
    update: "Update Draft Order",
  },
  webhook: {
    createEndpoint: "/webhook/create-draft-order",
    updateEndpoint: "/webhook/update-draft-order",
    method: "POST",
    transformData: (data) => ({
      ...data,
      orderNumber: `DRAFT-${Date.now()}`,
      status: "draft",
      createdAt: new Date().toISOString(),
    }),
  },
};

// Product Form Configuration
const productFormConfig: FormConfig = {
  title: "Add New Product",
  description: "Create a new product in your catalog",
  fields: [
    {
      name: "name",
      label: "Product Name",
      type: "text",
      placeholder: "Product name",
      required: true,
      validation: {
        min: 3,
        max: 100,
      },
    },
    {
      name: "price",
      label: "Price",
      type: "text",
      placeholder: "99.99",
      required: true,
      validation: {
        pattern: "^\\d+(\\.\\d{1,2})?$",
        customMessage: "Please enter a valid price",
      },
    },
    {
      name: "category",
      label: "Category",
      type: "select",
      required: true,
      options: [
        { value: "electronics", label: "Electronics" },
        { value: "clothing", label: "Clothing" },
        { value: "books", label: "Books" },
        { value: "home", label: "Home & Garden" },
      ],
    },
    {
      name: "stock",
      label: "Initial Stock",
      type: "number",
      placeholder: "0",
      required: true,
      validation: {
        min: 0,
        integer: true,
      },
      defaultValue: 0,
    },
    {
      name: "description",
      label: "Description",
      type: "textarea",
      placeholder: "Product description...",
      required: false,
      validation: {
        max: 500,
      },
    },
  ],
  submitLabel: {
    create: "Add Product",
    update: "Update Product",
  },
  webhook: {
    createEndpoint: "/webhook/create-product",
    updateEndpoint: "/webhook/update-product",
    method: "POST",
    transformData: (data) => ({
      ...data,
      sku: `SKU-${Date.now()}`,
      createdAt: new Date().toISOString(),
    }),
  },
};

// Export all quick create actions
export const quickCreateActions: QuickCreateAction[] = [
  {
    id: "create-customer",
    label: "New Customer",
    icon: UserPlus,
    description: "Add a new customer to your database",
    formConfig: customerFormConfig,
    onSuccess: (data) => {
      console.log("Customer created:", data);
      // You can add toast notification here
      // toast.success(`Customer ${data.firstName} ${data.lastName} created successfully`);
    },
    onError: (error) => {
      console.error("Failed to create customer:", error);
      // toast.error("Failed to create customer");
    },
  },
  {
    id: "create-member",
    label: "Team Member",
    icon: Users,
    description: "Invite a new team member",
    formConfig: memberFormConfig,
    onSuccess: (data) => {
      console.log("Member invited:", data);
      // toast.success(`Invitation sent to ${data.name}`);
    },
    onError: (error) => {
      console.error("Failed to invite member:", error);
      // toast.error("Failed to send invitation");
    },
  },
  {
    id: "draft-order",
    label: "Draft Order",
    icon: ShoppingCart,
    description: "Create a draft order for a customer",
    formConfig: draftOrderFormConfig,
    onSuccess: (data) => {
      console.log("Draft order created:", data);
      // toast.success(`Draft order ${data.orderNumber} created`);
    },
    onError: (error) => {
      console.error("Failed to create draft order:", error);
      // toast.error("Failed to create draft order");
    },
  },
  {
    id: "add-product",
    label: "New Product",
    icon: Package,
    description: "Add a new product to your catalog",
    formConfig: productFormConfig,
    onSuccess: (data) => {
      console.log("Product added:", data);
      // toast.success(`${data.name} added to catalog`);
    },
    onError: (error) => {
      console.error("Failed to add product:", error);
      // toast.error("Failed to add product");
    },
  },
];

// Optional: Grouped actions for more organization
export const groupedQuickCreateActions = {
  customers: {
    label: "Customers",
    actions: [
      quickCreateActions[0], // New Customer
    ],
  },
  team: {
    label: "Team",
    actions: [
      quickCreateActions[1], // Team Member
    ],
  },
  sales: {
    label: "Sales",
    actions: [
      quickCreateActions[2], // Draft Order
    ],
  },
  products: {
    label: "Products",
    actions: [
      quickCreateActions[3], // New Product
    ],
  },
};