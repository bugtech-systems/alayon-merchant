import { useState } from "react";
import { useFormContext, useFieldArray } from "react-hook-form";
import { Button, Table, Input, Badge } from "@medusajs/ui";
import { AdminCompany } from "../../../types/company/module";
import { ProductSelector } from "./product-selector";
import { VariantPriceSheet } from "./variant-price-sheet";

export function CompanyProductsPricing() {
  const { control, watch, setValue } = useFormContext<AdminCompany>();
  const { fields, append, remove } = useFieldArray({
    control,
    name: "products",
  });
  
  const [selectedProductForPricing, setSelectedProductForPricing] = useState<number | null>(null);
  const products = watch("products");

  const handleAddProduct = (product: any) => {
    append({
      productId: product.id,
      productName: product.name,
      variants: product.variants.map((variant: any) => ({
        variantId: variant.id,
        variantName: variant.title,
        originalPrice: variant.prices?.[0]?.amount || 0,
        customPrice: variant.prices?.[0]?.amount || 0,
      })),
    });
  };

  const handleUpdateVariantPrices = (productIndex: number, variantPrices: any[]) => {
    setValue(`products.${productIndex}.variants`, variantPrices);
    setSelectedProductForPricing(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Products & Custom Pricing</h3>
        <p className="text-sm text-gray-500 mb-6">
          Select products and set custom prices for each variant
        </p>
      </div>

      {/* Product Selection */}
      <div className="mb-6">
        <ProductSelector onSelect={handleAddProduct} />
      </div>

      {/* Products Table */}
      {fields.length > 0 ? (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell>Product</Table.HeaderCell>
                <Table.HeaderCell>Variants</Table.HeaderCell>
                <Table.HeaderCell>Actions</Table.HeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {fields.map((field, index) => (
                <Table.Row key={field.id}>
                  <Table.Cell className="font-medium">
                    {products[index]?.productName}
                  </Table.Cell>
                  <Table.Cell>
                    <div className="space-y-1">
                      {products[index]?.variants.map((variant, vIndex) => (
                        <div key={vIndex} className="flex items-center justify-between text-sm">
                          <span>{variant.variantName}</span>
                          <Badge>
                            ${(variant.customPrice / 100).toFixed(2)}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </Table.Cell>
                  <Table.Cell>
                    <div className="flex space-x-2">
                      <Button
                        variant="secondary"
                        size="small"
                        onClick={() => setSelectedProductForPricing(index)}
                      >
                        Edit Prices
                      </Button>
                      <Button
                        variant="danger"
                        size="small"
                        onClick={() => remove(index)}
                      >
                        Remove
                      </Button>
                    </div>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        </div>
      ) : (
        <div className="text-center py-12 border-2 border-dashed rounded-lg">
          <p className="text-gray-500">No products added yet</p>
          <p className="text-sm text-gray-400 mt-1">
            Click the button above to add products
          </p>
        </div>
      )}

      {/* Variant Price Sheet */}
      {selectedProductForPricing !== null && (
        <VariantPriceSheet
          open={true}
          onOpenChange={() => setSelectedProductForPricing(null)}
          product={products[selectedProductForPricing]}
          onSave={(variantPrices) => 
            handleUpdateVariantPrices(selectedProductForPricing, variantPrices)
          }
        />
      )}
    </div>
  );
}