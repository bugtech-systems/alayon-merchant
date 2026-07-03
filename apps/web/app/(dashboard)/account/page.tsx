// app/page.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DynamicFormModal, FormConfig } from "@/components/dynamic-form-modal";

const fullPageFormConfig: FormConfig = {
  title: "Create New Product",
  description: "Fill in the product details below. Press Cmd+Enter to submit.",
  size: "full", // or "xl", "lg", "md", "sm"
  fields: [
    { 
      name: "name",
      label: "Product Name",
      type: "text",
      placeholder: "Enter product name",
      required: true,
      colSpan: "full",
      validation: {
        min: 3,
        max: 100,
      },
    },
    {
      name: "price",
      label: "Price",
      type: "number",
      placeholder: "99.99",
      required: true,
      colSpan: "half",
      validation: {
        min: 0.01,
        max: 9999.99,
      },
    },
    {
      name: "stock",
      label: "Stock Quantity",
      type: "number",
      placeholder: "100",
      required: true,
      colSpan: "half",
      validation: {
        integer: true,
        min: 0,
      },
    },
    {
      name: "category",
      label: "Category",
      type: "select",
      required: true,
      colSpan: "half",
      options: [
        { value: "electronics", label: "Electronics" },
        { value: "clothing", label: "Clothing" },
        { value: "books", label: "Books" },
      ],
    },
    {
      name: "description",
      label: "Description",
      type: "textarea",
      placeholder: "Product description...",
      required: false,
      colSpan: "full",
      validation: {
        max: 500,
      },
    },
  ],
  submitLabel: {
    create: "Create Product",
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

export default function Home() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="container mx-auto p-8">
      <Button onClick={() => setIsOpen(true)}>
        Open Full Page Modal
      </Button>
      
      <p className="mt-4 text-sm text-muted-foreground">
        Tips: Press ESC to close, Cmd/Ctrl+Enter to submit
      </p>

      <DynamicFormModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        config={fullPageFormConfig}
        mode="create"
        onSuccess={(data) => {
          console.log("Success:", data);
        }}
        onError={(error) => {
          console.error("Error:", error);
        }}
      />
    </div>
  );
}