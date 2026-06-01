// components/variant-price-sheet.tsx
import { useState } from "react";
import { Drawer, Button, Table, Input, Badge } from "@medusajs/ui";

interface VariantPriceSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: any;
  onSave: (variants: any[]) => void;
}

export function VariantPriceSheet({ open, onOpenChange, product, onSave }: VariantPriceSheetProps) {
  const [variants, setVariants] = useState(product?.variants || []);

  const handlePriceChange = (index: number, price: number) => {
    const updated = [...variants];
    updated[index].customPrice = Math.round(price * 100); // Convert to cents
    setVariants(updated);
  };

  const handleSave = () => {
    onSave(variants);
    onOpenChange(false);
  };

  if (!product) return null;

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <Drawer.Content className="max-w-3xl">
        <Drawer.Header>
          <Drawer.Title>Set Custom Prices</Drawer.Title>
          <Drawer.Description>
            Configure custom pricing for {product.productName} variants
          </Drawer.Description>
        </Drawer.Header>
        
        <div className="p-6">
          <Table>
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell>Variant</Table.HeaderCell>
                <Table.HeaderCell>SKU</Table.HeaderCell>
                <Table.HeaderCell>Original Price</Table.HeaderCell>
                <Table.HeaderCell>Custom Price</Table.HeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {variants.map((variant: any, index: number) => (
                <Table.Row key={variant.variantId}>
                  <Table.Cell className="font-medium">
                    {variant.variantName}
                  </Table.Cell>
                  <Table.Cell>
                    {variant.sku || "N/A"}
                  </Table.Cell>
                  <Table.Cell>
                    <Badge size="small" variant="neutral">
                      ${(variant.originalPrice / 100).toFixed(2)}
                    </Badge>
                  </Table.Cell>
                  <Table.Cell>
                    <div className="flex items-center space-x-2">
                      <span className="text-gray-500">$</span>
                      <Input
                        type="number"
                        value={(variant.customPrice / 100).toFixed(2)}
                        onChange={(e) => handlePriceChange(index, parseFloat(e.target.value))}
                        className="w-32"
                        step="0.01"
                        min="0"
                      />
                    </div>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        </div>

        <Drawer.Footer>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Prices
          </Button>
        </Drawer.Footer>
      </Drawer.Content>
    </Drawer>
  );
}