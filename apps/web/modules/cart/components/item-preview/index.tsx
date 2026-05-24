// components/item-preview.tsx
"use client"

import { HttpTypes } from "@medusajs/types"
import { BaseCartLineItem } from "@medusajs/types/dist/http/cart/common"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { 
  Package, 
  StickyNote, 
  AlertCircle, 
  CheckCircle2,
  Tag,
  XCircle 
} from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"
import Image from "next/image"
import { convertToLocale } from "@/lib/util/money"

// Types
interface ItemPreviewProps {
  item: HttpTypes.StoreCartLineItem | HttpTypes.StoreOrderLineItem
  currencyCode: string
  showBorders?: boolean
  showNote?: boolean
  showVariantBadge?: boolean
  onRemove?: (itemId: string) => void
  onUpdateQuantity?: (itemId: string, quantity: number) => void
  readOnly?: boolean
}

interface LineItemPriceProps {
  item: HttpTypes.StoreCartLineItem | HttpTypes.StoreOrderLineItem
  currencyCode: string
  className?: string
}

// Price component
const LineItemPrice = ({ item, currencyCode, className }: LineItemPriceProps) => {
  const unitPrice = item.unit_price || 0
  const totalPrice = (item.unit_price || 0) * (item.quantity || 1)
  const originalUnitPrice = item.original_unit_price || unitPrice
  const hasDiscount = originalUnitPrice > unitPrice
  const discountPercentage = hasDiscount 
    ? Math.round(((originalUnitPrice - unitPrice) / originalUnitPrice) * 100)
    : 0

  return (
    <div className={cn("text-right space-y-1", className)}>
      <div className="flex items-center gap-2 justify-end">
        {hasDiscount && (
          <span className="text-xs font-medium text-red-500 bg-red-50 px-1.5 py-0.5 rounded-full">
            -{discountPercentage}%
          </span>
        )}
        <span className="text-sm font-semibold text-gray-900">
          {convertToLocale({ amount: totalPrice, currency_code: currencyCode })}
        </span>
      </div>
      {hasDiscount && (
        <div className="text-xs text-gray-400 line-through">
          {convertToLocale({ amount: originalUnitPrice * (item.quantity || 1), currency_code: currencyCode })}
        </div>
      )}
      <div className="text-xs text-gray-500">
        {convertToLocale({ amount: unitPrice, currency_code: currencyCode })} each
      </div>
    </div>
  )
}

// Stock status badge
const StockStatusBadge = ({ item }: { item: HttpTypes.StoreCartLineItem }) => {
  const inventoryQuantity = (item.variant as any)?.inventory_quantity
  const allowBackorder = (item.variant as any)?.allow_backorder
  const manageInventory = (item.variant as any)?.manage_inventory

  if (!manageInventory) {
    return (
      <Badge variant="secondary" className="gap-1 text-xs">
        <CheckCircle2 className="h-3 w-3" />
        In Stock
      </Badge>
    )
  }

  if (allowBackorder) {
    return (
      <Badge variant="outline" className="gap-1 text-xs text-blue-600 border-blue-200 bg-blue-50">
        <Package className="h-3 w-3" />
        Pre-order
      </Badge>
    )
  }

  if (inventoryQuantity && inventoryQuantity <= 5 && inventoryQuantity > 0) {
    return (
      <Badge variant="outline" className="gap-1 text-xs text-orange-600 border-orange-200 bg-orange-50">
        <AlertCircle className="h-3 w-3" />
        Low Stock
      </Badge>
    )
  }

  if (inventoryQuantity && inventoryQuantity === 0) {
    return (
      <Badge variant="destructive" className="gap-1 text-xs">
        <XCircle className="h-3 w-3" />
        Out of Stock
      </Badge>
    )
  }

  return (
    <Badge variant="secondary" className="gap-1 text-xs">
      <CheckCircle2 className="h-3 w-3" />
      In Stock
    </Badge>
  )
}

// Main ItemPreview component
export function ItemPreview({ 
  item, 
  currencyCode, 
  showBorders = true,
  showNote = true,
  showVariantBadge = false,
  onRemove,
  onUpdateQuantity,
  readOnly = false
}: ItemPreviewProps) {
  const product = item.product
  const variant = item.variant
  const handle = product?.handle || variant?.product?.handle
  const thumbnail = item.thumbnail || product?.thumbnail || variant?.product?.thumbnail
  const title = product?.title || variant?.product?.title || "Product"
  const variantTitle = variant?.title || "Default"
  const quantity = item.quantity || 1
  const note = (item as any)?.metadata?.note as string

  const maxQuantity = (variant as any)?.inventory_quantity ?? 100
  const isOutOfStock = (variant as any)?.inventory_quantity === 0 && !(variant as any)?.allow_backorder

  const handleQuantityChange = (newQuantity: number) => {
    if (readOnly) return
    if (newQuantity < 1) return
    if (newQuantity > maxQuantity && !(variant as any)?.allow_backorder) return
    onUpdateQuantity?.(item.id, newQuantity)
  }

  const handleRemove = () => {
    if (readOnly) return
    onRemove?.(item.id)
  }

  return (
    <Card className={cn(
      "overflow-hidden transition-all duration-200",
      showBorders ? "border" : "border-0 shadow-none",
      isOutOfStock && "opacity-60 bg-gray-50"
    )}>
      <CardContent className="p-4">
        <div className="flex gap-4">
          {/* Product Image */}
          <Link 
            href={`/products/${handle}`} 
            className="flex-shrink-0 group relative"
          >
            <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden bg-gray-100">
              {thumbnail ? (
                <Image
                  src={thumbnail}
                  alt={title}
                  fill
                  className="object-cover transition-transform duration-300 group-hover:scale-110"
                  sizes="80px"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Package className="h-8 w-8 text-gray-400" />
                </div>
              )}
            </div>
            {isOutOfStock && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg">
                <span className="text-white text-xs font-medium">Out of Stock</span>
              </div>
            )}
          </Link>

          {/* Product Details */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
              <div className="space-y-1 flex-1">
                {/* Title and Variant */}
                <Link href={`/products/${handle}`}>
                  <h3 className="font-medium text-gray-900 hover:text-blue-600 transition-colors line-clamp-1 text-sm sm:text-base">
                    {title}
                  </h3>
                </Link>
                
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="text-xs font-normal">
                    {variantTitle}
                  </Badge>
                  
                  {showVariantBadge && (variant as any)?.sku && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <Badge variant="secondary" className="text-xs font-mono">
                            SKU: {(variant as any).sku}
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Product SKU</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                  
                  <StockStatusBadge item={item} />
                </div>

                {/* Note */}
                {showNote && note && (
                  <div className="flex items-start gap-1.5 mt-2 p-2 bg-gray-50 rounded-md">
                    <StickyNote className="h-3.5 w-3.5 text-gray-500 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-gray-600 italic line-clamp-2">
                      {note}
                    </p>
                  </div>
                )}
              </div>

              {/* Price and Quantity */}
              <div className="flex items-center justify-between sm:justify-end gap-4">
                {/* Quantity Selector */}
                {!readOnly && onUpdateQuantity && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleQuantityChange(quantity - 1)}
                      disabled={quantity <= 1 || isOutOfStock}
                      className="w-7 h-7 rounded-md border border-gray-300 flex items-center justify-center hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      aria-label="Decrease quantity"
                    >
                      -
                    </button>
                    <span className="w-8 text-center text-sm font-medium">
                      {quantity}
                    </span>
                    <button
                      onClick={() => handleQuantityChange(quantity + 1)}
                      disabled={(quantity >= maxQuantity && !(variant as any)?.allow_backorder) || isOutOfStock}
                      className="w-7 h-7 rounded-md border border-gray-300 flex items-center justify-center hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      aria-label="Increase quantity"
                    >
                      +
                    </button>
                  </div>
                )}

                {readOnly && (
                  <Badge variant="secondary" className="text-sm">
                    Qty: {quantity}
                  </Badge>
                )}

                {/* Price */}
                <LineItemPrice 
                  item={item} 
                  currencyCode={currencyCode}
                  className="min-w-[100px]"
                />

                {/* Remove Button */}
                {!readOnly && onRemove && (
                  <button
                    onClick={handleRemove}
                    className="p-1.5 text-gray-400 hover:text-red-500 transition-colors rounded-full hover:bg-red-50"
                    aria-label="Remove item"
                  >
                    <XCircle className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ItemsPreviewTemplate Component
interface ItemsPreviewTemplateProps {
  items?: HttpTypes.StoreCartLineItem[] | HttpTypes.StoreOrderLineItem[]
  currencyCode: string
  onRemoveItem?: (itemId: string) => void
  onUpdateQuantity?: (itemId: string, quantity: number) => void
  readOnly?: boolean
  showNote?: boolean
  maxHeight?: string
}

export function ItemsPreviewTemplate({ 
  items, 
  currencyCode,
  onRemoveItem,
  onUpdateQuantity,
  readOnly = false,
  showNote = true,
  maxHeight = "420px"
}: ItemsPreviewTemplateProps) {
  const hasOverflow = items && items.length > 4
  const isLoading = !items

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="flex gap-4 p-4 border rounded-lg">
              <div className="w-16 h-16 bg-gray-200 rounded-lg" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4" />
                <div className="h-3 bg-gray-200 rounded w-1/2" />
                <div className="h-3 bg-gray-200 rounded w-1/3" />
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (!items || items.length === 0) {
    return (
      <Card className="bg-gray-50">
        <CardContent className="p-8 text-center">
          <Package className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500">Your cart is empty</p>
          <Link href="/shop" className="text-blue-600 text-sm hover:underline mt-2 inline-block">
            Continue Shopping
          </Link>
        </CardContent>
      </Card>
    )
  }

  return (
    <div
      className={cn(
        "space-y-3",
        hasOverflow && "overflow-y-auto pr-1"
      )}
      style={{ maxHeight: hasOverflow ? maxHeight : "auto" }}
    >
      {items
        .sort((a, b) => {
          const dateA = (a as any).created_at || ""
          const dateB = (b as any).created_at || ""
          return dateA > dateB ? -1 : 1
        })
        .map((item) => (
          <ItemPreview
            key={item.id}
            item={item as HttpTypes.StoreCartLineItem}
            currencyCode={currencyCode}
            showNote={showNote}
            onRemove={!readOnly ? onRemoveItem : undefined}
            onUpdateQuantity={!readOnly ? onUpdateQuantity : undefined}
            readOnly={readOnly}
          />
        ))}
    </div>
  )
}

// Export both components
export default ItemPreview