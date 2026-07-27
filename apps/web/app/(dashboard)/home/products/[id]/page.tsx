// app/products/[id]/page.tsx
"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import {
  ArrowLeft,
  Pencil,
  Copy,
  Check,
  Package,
  Tag,
  Layers,
  DollarSign,
  Calendar,
  Globe,
  MoreVertical,
  ExternalLink,
  TrendingUp,
  ShoppingBag,
  Archive,
  Eye,
  EyeOff,
} from "lucide-react";
import { useProduct, usePriceLists, useUpdateVariantPriceListPrice } from "@/hooks/use-products";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { PriceListEditor } from "@/components/price-list-editor";
import { formatCurrency, formatDate } from "@/lib/utils";
import { toast } from "sonner";

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const productId = params.id as string;
  const { data: product, isLoading, error, refetch } = useProduct(productId);
  const [activeTab, setActiveTab] = useState("overview");
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showPriceListEditor, setShowPriceListEditor] = useState(false);

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
    toast.success("Copied to clipboard");
  };

  if (isLoading) {
    return <ProductDetailSkeleton />;
  }

  if (error || !product) {
    return (
      <div className="container mx-auto py-10">
        <Alert variant="destructive">
          <AlertDescription>
            {error?.message || "Product not found"}
            <Button variant="outline" size="sm" className="ml-4" onClick={() => router.push("/pos/products")}>
              Back to Products
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push("/pos/products")}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              <Separator orientation="vertical" className="h-6" />
              <div className="flex items-center gap-3">
                {product.thumbnail ? (
                  <Image
                    src={product.thumbnail}
                    alt={product.title}
                    width={40}
                    height={40}
                    className="rounded-md object-cover"
                  />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-muted">
                    <Package className="h-5 w-5 text-muted-foreground" />
                  </div>
                )}
                <div>
                  <h1 className="text-2xl font-semibold tracking-tight">{product.title}</h1>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant={product.status === "published" ? "default" : "secondary"}>
                      {product.status}
                    </Badge>
                    {product.is_giftcard && <Badge variant="outline">Gift Card</Badge>}
                    {product.discountable === false && <Badge variant="outline">Not Discountable</Badge>}
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="sm" onClick={() => copyToClipboard(product.id, "id")}>
                      {copiedField === "id" ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Copy Product ID</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <Button variant="outline" size="sm" className="gap-2">
                <ExternalLink className="h-4 w-4" />
                View in Store
              </Button>
              <Button size="sm" className="gap-2" onClick={() => setShowPriceListEditor(true)}>
                <DollarSign className="h-4 w-4" />
                Edit Pricing
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="variants">Variants</TabsTrigger>
            <TabsTrigger value="pricing">Pricing</TabsTrigger>
            <TabsTrigger value="metadata">Metadata</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Main Info */}
              <div className="lg:col-span-2 space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Product Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label className="text-sm text-muted-foreground">Description</Label>
                      <p className="mt-1 whitespace-pre-wrap">
                        {product.description || "No description provided"}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm text-muted-foreground">Handle</Label>
                        <p className="mt-1 font-mono text-sm">{product.handle || "—"}</p>
                      </div>
                      <div>
                        <Label className="text-sm text-muted-foreground">Subtitle</Label>
                        <p className="mt-1">{product.subtitle || "—"}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Categories & Tags */}
                <Card>
                  <CardHeader>
                    <CardTitle>Categories & Tags</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label className="text-sm text-muted-foreground">Categories</Label>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {product.categories?.length > 0 ? (
                          product.categories.map((category: any) => (
                            <Badge key={category.id} variant="secondary">
                              {category.name}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-sm text-muted-foreground">No categories</span>
                        )}
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm text-muted-foreground">Tags</Label>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {product.tags?.length > 0 ? (
                          product.tags.map((tag: any) => (
                            <Badge key={tag.id} variant="outline">
                              {tag.value}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-sm text-muted-foreground">No tags</span>
                        )}
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm text-muted-foreground">Collections</Label>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {product.collections?.length > 0 ? (
                          product.collections.map((collection: any) => (
                            <Badge key={collection.id} variant="default">
                              {collection.title}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-sm text-muted-foreground">No collections</span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Sidebar Info */}
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Product Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Type</span>
                      <Badge variant="outline">{product.type?.value || "Standard"}</Badge>
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Created</span>
                      <span className="text-sm">{formatDate(product.created_at)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Last Updated</span>
                      <span className="text-sm">{formatDate(product.updated_at)}</span>
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Discountable</span>
                      <Badge variant={product.discountable ? "default" : "secondary"}>
                        {product.discountable ? "Yes" : "No"}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Gift Card</span>
                      <Badge variant={product.is_giftcard ? "default" : "secondary"}>
                        {product.is_giftcard ? "Yes" : "No"}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>

                {/* Images Gallery */}
                <Card>
                  <CardHeader>
                    <CardTitle>Images</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-2">
                      {product.images?.length > 0 ? (
                        product.images.map((image: any, index: number) => (
                          <div key={image.id} className="relative aspect-square rounded-md overflow-hidden border">
                            <Image
                              src={image.url}
                              alt={`${product.title} - ${index + 1}`}
                              fill
                              className="object-cover"
                            />
                          </div>
                        ))
                      ) : (
                        <div className="col-span-3 flex h-32 items-center justify-center rounded-md border bg-muted">
                          <span className="text-sm text-muted-foreground">No images</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Options */}
                {product.options?.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Options</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {product.options.map((option: any) => (
                        <div key={option.id}>
                          <Label className="text-sm font-medium">{option.title}</Label>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {option.values?.map((value: any) => (
                              <Badge key={value.id} variant="secondary" className="text-xs">
                                {value.value}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Variants Tab */}
          <TabsContent value="variants" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Product Variants</CardTitle>
                <CardDescription>Manage product variants and their prices</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Variant</TableHead>
                        <TableHead>SKU</TableHead>
                        <TableHead>EAN</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Inventory</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {product.variants?.map((variant: any) => (
                        <TableRow key={variant.id}>
                          <TableCell className="font-medium">
                            {variant.title || "Default Variant"}
                          </TableCell>
                          <TableCell>
                            <code className="text-xs">{variant.sku || "—"}</code>
                          </TableCell>
                          <TableCell>{variant.ean || "—"}</TableCell>
                          <TableCell>
                            {variant.prices?.find((p: any) => !p.price_list_id)?.amount 
                              ? formatCurrency(variant.prices.find((p: any) => !p.price_list_id).amount, 'PHP')
                              : "N/A"}
                          </TableCell>
                          <TableCell>
                            {variant.inventory_quantity !== undefined ? (
                              <Badge variant={variant.inventory_quantity > 0 ? "default" : "destructive"}>
                                {variant.inventory_quantity} in stock
                              </Badge>
                            ) : (
                              "—"
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant={variant.allow_backorder ? "outline" : "secondary"}>
                              {variant.allow_backorder ? "Backorder Allowed" : "No Backorder"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuItem onClick={() => copyToClipboard(variant.id, `variant-${variant.id}`)}>
                                  Copy Variant ID
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem>Edit Variant</DropdownMenuItem>
                                <DropdownMenuItem>Manage Inventory</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Pricing Tab */}
          <TabsContent value="pricing" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Price Lists</CardTitle>
                <CardDescription>Manage prices using price lists</CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={() => setShowPriceListEditor(true)} className="gap-2">
                  <DollarSign className="h-4 w-4" />
                  Edit Price List Prices
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Metadata Tab */}
          <TabsContent value="metadata" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Metadata</CardTitle>
                <CardDescription>Additional product metadata</CardDescription>
              </CardHeader>
              <CardContent>
                {product.metadata && Object.keys(product.metadata).length > 0 ? (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Key</TableHead>
                          <TableHead>Value</TableHead>
                          <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {Object.entries(product.metadata).map(([key, value]) => (
                          <TableRow key={key}>
                            <TableCell className="font-mono text-sm">{key}</TableCell>
                            <TableCell>{String(value)}</TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => copyToClipboard(String(value), `meta-${key}`)}
                              >
                                {copiedField === `meta-${key}` ? (
                                  <Check className="h-4 w-4" />
                                ) : (
                                  <Copy className="h-4 w-4" />
                                )}
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="flex h-32 items-center justify-center rounded-md border bg-muted">
                    <span className="text-sm text-muted-foreground">No metadata found</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Price List Editor Modal */}
      <PriceListEditor
        open={showPriceListEditor}
        onOpenChange={setShowPriceListEditor}
        product={product}
        onSuccess={() => {
          refetch();
          toast.success("Prices updated successfully");
        }}
      />
    </div>
  );
}

// Loading Skeleton Component
function ProductDetailSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 border-b bg-background/95">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-10 w-10 rounded-md" />
              <div>
                <Skeleton className="h-7 w-64" />
                <Skeleton className="mt-1 h-5 w-24" />
              </div>
            </div>
            <Skeleton className="h-9 w-32" />
          </div>
        </div>
      </div>
      <div className="container mx-auto px-6 py-6">
        <div className="space-y-6">
          <Skeleton className="h-10 w-96" />
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
              <Skeleton className="h-64 w-full" />
              <Skeleton className="h-96 w-full" />
            </div>
            <div className="space-y-6">
              <Skeleton className="h-64 w-full" />
              <Skeleton className="h-64 w-full" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}