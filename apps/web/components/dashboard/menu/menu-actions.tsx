"use client";

import { CompanyDTO } from "@/lib/types";
import { HttpTypes, ProductCategoryDTO } from "@medusajs/types";
import { CreateCategoryDrawer } from "./create-category-drawer";
import { CreateProductDrawer } from "./create-product-drawer";

export function MenuActions({
  company,
  categories,
}: {
  company: CompanyDTO;
  categories: HttpTypes.StoreProductCategory[];
}) {
  return (
    <div className="flex gap-4">
      <CreateCategoryDrawer company={company} />
      <CreateProductDrawer company={company} categories={categories} />
    </div>
  );
}
