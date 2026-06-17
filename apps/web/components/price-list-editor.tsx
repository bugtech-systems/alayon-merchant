// components/price-list-editor.tsx
"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getMedusaServerClient } from "@/lib/config";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Save, DollarSign, ShoppingBag, Info } from "lucide-react";
import { formatCurrency, getCurrencySymbol } from "@/lib/utils";
import { toast } from "sonner";

// ============================================
// TYPES (based on actual API response)
// ============================================

interface PriceListPrice {
  id: string;
  variant_id: string;
  amount: number;        // in cents
  currency_code: string;
  rules?: {
    region_id?: string;
    [key: string]: any;
  };
}

interface PriceList {
  id: string;
  name: string;
  description?: string;
  type: "sale" | "override";
  prices: PriceListPrice[];
}

interface ProductVariant {
  id: string;
  title: string;
  sku?: string;
  prices: { amount: number; currency_code: string; price_list_id?: string }[];
}

interface Product {
  id: string;
  title: string;
  thumbnail?: string;
  variants: ProductVariant[];
}

interface PriceListEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId: string;
  priceListId: any;
  region: {
    currency_code: string;
    tax_rate?: number;
  };
  onSuccess?: () => void;
}

// ============================================
// HOOKS
// ============================================

export const usePriceList = (
  priceListId: string,
  options?: {
    currencyCode: string;
    regionId?: string;
    enabled?: boolean;
  }
) => {
  const { currencyCode = 'php', regionId, enabled = true } = options || {};

  return useQuery({
    queryKey: ["price-list", priceListId, { currencyCode, regionId }],
    queryFn: async (): Promise<any> => {
      const client = getMedusaServerClient();
      const response = await client.admin.priceList.retrieve(priceListId, {
          fields: "*prices,prices.price_set.variant.id,prices.currency_code,prices.amount,*prices.price_rules,prices.created_at",
      });

      let priceList = (response.price_list || response) as any;

      const variantPriceMap = new Map<any, any>();
      const variantPriceObjects = new Map<string, PriceListPrice>();

      console.log(priceList, 'pssaaa')
      const sortedPrices = priceList?.prices.filter(a => a.rules_count).sort((a, b) => {
        if (a.created_at && b.created_at) {
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        }
        // If one has no date, treat as oldest
        if (a.created_at) return -1;
        if (b.created_at) return  1;
        return 0;
      });


      console.log(sortedPrices, 'sorrrted')
      // Group prices by variant_id
      const pricesByVariant = new Map<string, PriceListPrice[]>();
      for (const price of sortedPrices) {
        console.log(price, 'PPPPP')
        if (!pricesByVariant.get(price.variant_id) && !price.deleted_at ) {
          pricesByVariant.set(price.variant_id, []);
          pricesByVariant.get(price.variant_id)!.push(price);
        }
      }



      // For each variant, select the best matching price
      for (const [variantId, prices] of pricesByVariant) {
        // Filter by currency
        let candidates = prices.filter(p => p.currency_code === currencyCode || 'php');

        if (candidates.length === 0) {
          // No price for this currency – skip
          continue;
        }
        // If regionId is provided, filter by rules.region_id (if rules exist)
        // if (regionId && ) {
        //   const regionCandidates = candidates.filter(p => p.rules?.region_id === regionId);
        //   if (regionCandidates.length > 0) {
        //     candidates = regionCandidates;
        //   }
        // }

        // If multiple candidates remain, select the "latest" – here we pick the highest amount
        // (you could sort by created_at if available, or by amount, or a custom logic)
        const selected = candidates[0] as any;
        variantPriceMap.set(variantId, selected.amount);
        variantPriceObjects.set(variantId, selected);

      }

      return {
        priceList: {
          ...priceList,
          prices: sortedPrices
        },
        variantPriceMap,
        variantPriceObjects,
      };
    },
    enabled: enabled,
  });
};

/** Fetch product details (for variant titles, SKUs, default prices) */
const useProduct = (productId: string, enabled = true) => {
  return useQuery({
    queryKey: ["product", productId],
    queryFn: async (): Promise<any> => {
      const client = getMedusaServerClient();
      const response = await client.admin.product.retrieve(productId, {
        fields: "id,title,thumbnail,*variants,*variants.prices",
      });
      return response.product || response;
    },
    enabled: enabled && !!productId,
  });
};

/** Fetch price preferences (tax‑inclusive flag) */
const usePricePreferences = (enabled = true) => {
  return useQuery({
    queryKey: ["price-preferences"],
    queryFn: async () => {
      const client = getMedusaServerClient();
      const response = await client.admin.pricePreference.list();
      return response.price_preferences || response.data || [];
    },
    enabled,
  });
};

/** Batch update prices in a price list */
const useBatchUpdatePrices = (priceListId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { create?: any[]; update?: any[]; delete?: string[] }) => {
      const client = getMedusaServerClient();
      await client.admin.priceList.batchPrices(priceListId, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["price-list", priceListId] });
      queryClient.invalidateQueries({ queryKey: ["product"] });
      toast.success("Prices updated successfully");
    },
    onError: (error: any) => {
      toast.error(`Failed to update prices: ${error.message}`);
    },
  });
};

// ============================================
// MAIN COMPONENT
// ============================================

export function PriceListEditor({
  open,
  onOpenChange,
  productId,
  priceListId,
  region,
  onSuccess,
}: PriceListEditorProps) {
  const [variantPrices, setVariantPrices] = useState<Record<string, string>>({});

  // Fetch data
  const {data, isLoading} = usePriceList(priceListId, {currencyCode: 'php', regionId: region?.id}) as any;
  const {priceList, variantPriceMap, variantPriceObjects} = data || { };
  const { data: product, isLoading: isLoadingProduct } = useProduct(productId, open);
  const { data: pricePreferences } = usePricePreferences(open);
  const pricePreference = pricePreferences?.find(
    (p: any) => (p.attribute ===  "currency_code" && p.value === region?.currency_code || 'php'));
  const isTaxInclusive = pricePreference?.is_tax_inclusive || false;
  const batchUpdate = useBatchUpdatePrices(priceListId);
  // Build a map: variant_id -> price list price object (if exists)
  useEffect(() => {
    console.log(priceList, product , 'prroo', productId)
    if (!priceList || !product) return;

    // Create a map of variantId -> price list price (filter by currency)
    const priceMap: Record<string, PriceListPrice> = {};
    for (const price of priceList?.prices) {
      if (price.variant_id && !priceMap[price.variant_id]) {
        priceMap[price.variant_id] = price;
      }
    }

    // Initialize local state: for each product variant, show existing price list price (in dollars)
    const initial: Record<string, string> = {};
    for (const variant of product.variants) {
      const existing = priceMap[variant.id];
            console.log(variantPriceMap, variant.id, existing, 'variispasss')
      initial[variant.id] = existing ? (existing.amount).toString() : "";
      console.log(variantPriceMap, variant.id, existing, 'variispa')
    }

    console.log(product, 'PRODDaaaS', initial)
    setVariantPrices(initial);
  }, [priceList, variantPriceMap, product, region?.currency_code]);


  console.log(priceList, variantPriceMap, product, 'PRICC')

  const handlePriceChange = (variantId: string, value: string) => {
    setVariantPrices((prev) => ({ ...prev, [variantId]: value }));
  };

  const handleSave = async () => {
    if (!priceList || !product) return;

    // Prepare create and update arrays
    const create = [];
    const update = [];

    for (const variant of product.variants) {
      const newPriceStr = variantPrices[variant.id];
      if (!newPriceStr || newPriceStr.trim() === "") continue;

      const newAmountCents = Math.round(parseFloat(newPriceStr));
      // Find the existing price list price for this variant (by matching variant_id)
      const existingPrice = priceList.prices.find(
        (p) => p.variant_id === variant.id && p.currency_code === region?.currency_code
      );

      if (existingPrice) {
        // Only update if amount changed
        if (existingPrice.amount !== newAmountCents) {
          update.push({
            id: existingPrice.id,
            variant_id: variant.id,
            amount: newAmountCents,
            currency_code: region?.currency_code,
          });
        }
      } else {
        // New price for this variant
        create.push({
          variant_id: variant.id,
          amount: newAmountCents,
          currency_code: region?.currency_code,
        });
      }
    }

    const payload: { create?: any[]; update?: any[] } = {};
    if (create.length) payload.create = create;
    if (update.length) payload.update = update;

    if (create.length === 0 && update.length === 0) {
      onOpenChange(false);
      return;
    }

    await batchUpdate.mutateAsync(payload);
    onSuccess?.();
    onOpenChange(false);
  };

  const currencySymbol = getCurrencySymbol(region?.currency_code || 'php');
  const taxNote = isTaxInclusive ? "(prices are tax-inclusive)" : "(prices exclude tax)";

  console.log(product, data, 'price editor')
  if (!open) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="full" className="p-0 flex flex-col">
        <DialogHeader className="border-b px-6 py-4">
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Edit Product Pricing
          </DialogTitle>
          <div className="text-sm text-muted-foreground">
            Update prices for <span className="font-medium">{product?.title || "product"}</span> using price list{" "}
            {priceList?.name && <Badge variant="secondary">{priceList.name}</Badge>}
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-3 h-full">
            {/* Sidebar */}
            <div className="border-r bg-muted/30 p-6 overflow-y-auto">
              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
                    Product Details
                  </h3>
                  <div className="bg-background rounded-lg p-4 border mt-3">
                    <div className="flex items-start gap-3">
                      {product?.thumbnail ? (
                        <img
                          src={product.thumbnail}
                          alt={product.title}
                          className="w-12 h-12 rounded-md object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-md bg-muted flex items-center justify-center">
                          <ShoppingBag className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{product?.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {product?.variants?.length || 0} variants
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
                    Pricing Info
                  </h3>
                  <Alert className="mt-3">
                    <Info className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                      Prices are in {currencySymbol.toUpperCase()} {taxNote}
                    </AlertDescription>
                  </Alert>
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div className="lg:col-span-2 flex p-2 flex-col overflow-hidden">
               <ScrollArea className="h-full">
                    {isLoading ? (
                      <div className="flex justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                      </div>
                    ) : !product ? (
                      <div className="text-center text-destructive py-12">Failed to load product</div>
                    ) : (
                      <div className="rounded-md border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Variant</TableHead>
                              <TableHead>SRP Price</TableHead>
                              <TableHead>Price List Price ({currencySymbol})</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {product.variants.map((variant) => {
                              const defaultPrice = variant.prices.find(
                                (p) => !p.price_list_id && p.currency_code === region?.currency_code
                              )?.amount;
                              console.log(variant.id, 'VARRS', variantPriceMap, variantPrices[variant.id])
                              return (
                                <TableRow key={variant.id}>
                                  <TableCell>
                                    <div>
                                      <div className="font-medium">{variant.title || "Default Variant"}</div>
                                      {variant.sku && (
                                        <div className="text-sm text-muted-foreground">SKU: {variant.sku}</div>
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    {defaultPrice ? formatCurrency(defaultPrice, region?.currency_code || 'php') : "N/A"}
                                  </TableCell>
                                  <TableCell>
                                    <Input
                                      type="number"
                                      step="0.01"
                                      placeholder="Enter price"
                                      value={variantPrices[variant.id] || ""}
                                      onChange={(e) => handlePriceChange(variant.id, e.target.value)}
                                      className="w-32"
                                    />
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </ScrollArea>
            </div>
          </div>
        </div>

        <DialogFooter className="border-t px-6 py-4">
          <div className="flex items-center justify-between w-full">
            <div className="text-sm text-muted-foreground">
              {Object.values(variantPrices).some((p) => p) && "Changes pending"}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={batchUpdate.isPending}>
                {batchUpdate.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}