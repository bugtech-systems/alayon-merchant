// modules/cart/components/item-full.tsx
"use client"

import { useCart } from "@/lib/context/cart-context"
import AddNoteButton from "@/modules/cart/components/add-note-button"
import DeleteButton from "@/modules/common/components/delete-button"
import LineItemPrice from "@/modules/common/components/line-item-price"
import LocalizedClientLink from "@/modules/common/components/localized-client-link"
import Spinner from "@/modules/common/icons/spinner"
import Thumbnail from "@/modules/products/components/thumbnail"
import { HttpTypes } from "@medusajs/types"
import { clx, Input } from "@medusajs/ui"
import { startTransition, useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Minus, Plus, Trash2, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { Alert, AlertDescription } from "@/components/ui/alert"

type ItemProps = {
  item: HttpTypes.StoreCartLineItem
  showBorders?: boolean
  currencyCode: string
  disabled?: boolean
  variant?: "default" | "compact" | "detailed"
}

const ItemFull = ({
  item,
  showBorders = true,
  currencyCode,
  disabled,
  variant = "default",
}: ItemProps) => {
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [quantity, setQuantity] = useState(item.quantity.toString())

  const { handleDeleteItem, handleUpdateCartQuantity, company } = useCart()

  const changeQuantity = async (newQuantity: number) => {
    if (newQuantity === item.quantity) return
    
    setError(null)
    setUpdating(true)

    try {
      startTransition(() => {
        setQuantity(newQuantity.toString())
      })

      await handleUpdateCartQuantity(item.id, Number(newQuantity))
    } catch (err) {
      setError("Failed to update quantity")
      setQuantity(item.quantity.toString())
    } finally {
      setUpdating(false)
    }
  }

  useEffect(() => {
    setQuantity(item.quantity.toString())
  }, [item.quantity])

  const handleBlur = (value: number) => {
    if (value === item.quantity) return

    if (value > maxQuantity) {
      changeQuantity(maxQuantity)
    } else if (value < 1) {
      handleDeleteItem(item.id)
    } else {
      changeQuantity(value)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return

    if (e.key === "Enter") {
      changeQuantity(Number(quantity))
    }

    if (e.key === "ArrowUp" && e.shiftKey) {
      e.preventDefault()
      setQuantity((Number(quantity) + 10).toString())
    }

    if (e.key === "ArrowDown" && e.shiftKey) {
      e.preventDefault()
      setQuantity((Number(quantity) - 10).toString())
    }
  }

  const maxQuantity = item.variant?.inventory_quantity ?? 100
  const isLowStock = item.variant?.inventory_quantity && item.variant.inventory_quantity <= 10
  const isOutOfStock = item.variant?.inventory_quantity === 0
  // Compact variant for cart drawer
  if (variant === "compact") {
    return (
      <div className={cn(
        "flex gap-3 py-3",
        showBorders && "border-b border-gray-100 last:border-0"
      )}>
        <LocalizedClientLink href={`/products/${item.product_handle}`} className="flex-shrink-0">
          <Thumbnail
            thumbnail={item.thumbnail}
            size="square"
            type="full"
            className="bg-gray-100 rounded-lg w-16 h-16 object-cover"
          />
        </LocalizedClientLink>
        
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start gap-2">
            <div className="flex-1">
              <LocalizedClientLink href={`/products/${item.product_handle}`}>
                <h4 className="text-sm font-medium text-gray-900 line-clamp-2 hover:text-primary transition-colors">
                  {item.product?.title}
                </h4>
              </LocalizedClientLink>
              {item.variant?.title && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {item.variant.title}
                </p>
              )}
            </div>
            <LineItemPrice
              item={item}
              currencyCode={currencyCode}
              className="text-sm font-semibold"
            />
          </div>
          
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 border rounded-full px-2 py-1 bg-gray-50">
                <button
                  className={cn(
                    "w-5 h-5 flex items-center justify-center rounded-full hover:bg-gray-200 transition-colors",
                    (disabled || item.quantity <= 1) && "opacity-50 cursor-not-allowed"
                  )}
                  onClick={() => changeQuantity(item.quantity - 1)}
                  disabled={item.quantity <= 1 || disabled || updating}
                >
                  <Minus className="h-3 w-3" />
                </button>
                <span className="w-8 text-center text-sm font-medium">
                  {updating ? <Spinner size="12" /> : item.quantity}
                </span>
                <button
                  className={cn(
                    "w-5 h-5 flex items-center justify-center rounded-full hover:bg-gray-200 transition-colors",
                    (disabled || item.quantity >= maxQuantity) && "opacity-50 cursor-not-allowed"
                  )}
                  onClick={() => changeQuantity(item.quantity + 1)}
                  disabled={item.quantity >= maxQuantity || disabled || updating}
                >
                  <Plus className="h-3 w-3" />
                </button>
              </div>
              <DeleteButton id={item.id} disabled={disabled} />
            </div>
            {/* <AddNoteButton item={item} disabled={disabled} /> */}
          </div>
          
          {error && (
            <p className="text-xs text-red-500 mt-1">{error}</p>
          )}
        </div>
      </div>
    )
  }

  // Default variant
  return (
    <Card className={cn(
      "w-full overflow-hidden transition-all duration-200",
      showBorders ? "border border-gray-100" : "border-0 shadow-none",
      disabled && "opacity-60"
    )}>
      <CardContent className="p-4">
        <div className="flex gap-4">
          {/* Product Image */}
          <LocalizedClientLink href={`/products/${item.product_handle}`} className="flex-shrink-0">
            <Thumbnail
              thumbnail={item.thumbnail}
              size="square"
              type="full"
              className="bg-gray-100 rounded-lg w-24 h-24 object-cover"
            />
          </LocalizedClientLink>

          {/* Product Details */}
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-start gap-4">
              <div className="flex-1">
                <LocalizedClientLink href={`/products/${item.product_handle}`}>
                  <h3 className="text-base font-semibold text-gray-900 hover:text-primary transition-colors line-clamp-2">
                    {item.product?.title}
                  </h3>
                </LocalizedClientLink>
                
                {item.variant?.title && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {item.variant.title}
                  </p>
                )}
                
                {/* Stock Status */}
                {isLowStock && !isOutOfStock && (
                  <div className="mt-1">
                    <span className="text-xs text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">
                      Only {item.variant.inventory_quantity} left in stock
                    </span>
                  </div>
                )}
              </div>
              
              <LineItemPrice
                item={item}
                currencyCode={currencyCode}
                className="text-lg font-bold text-primary"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between mt-4">
              <div className="flex items-center gap-3">
                {/* Quantity Controls */}
                <div className="flex items-center gap-2 border rounded-lg p-1 bg-gray-50">
                  <button
                    className={cn(
                      "w-7 h-7 flex items-center justify-center rounded-md hover:bg-white transition-colors",
                      (disabled || item.quantity <= 1) && "opacity-50 cursor-not-allowed"
                    )}
                    onClick={() => changeQuantity(item.quantity - 1)}
                    disabled={item.quantity <= 1 || disabled || updating}
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  
                  <div className="min-w-[40px] text-center">
                    {updating ? (
                      <Spinner size="16" />
                    ) : (
                      <Input
                        className={cn(
                          "w-12 h-7 text-center text-sm border-0 bg-transparent focus:ring-0 p-0",
                          disabled && "opacity-50 pointer-events-none"
                        )}
                        type="number"
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                        onBlur={(e) => handleBlur(Number(e.target.value))}
                        onKeyDown={handleKeyDown}
                        disabled={disabled}
                      />
                    )}
                  </div>
                  
                  <button
                    className={cn(
                      "w-7 h-7 flex items-center justify-center rounded-md hover:bg-white transition-colors",
                      (disabled || item.quantity >= maxQuantity) && "opacity-50 cursor-not-allowed"
                    )}
                    onClick={() => changeQuantity(item.quantity + 1)}
                    disabled={item.quantity >= maxQuantity || disabled || updating}
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-1">
                  <AddNoteButton item={item} disabled={disabled} />
                  <DeleteButton id={item.id} disabled={disabled} />
                </div>
              </div>
              
              {/* Unit Price */}
              {item.quantity > 1 && (
                <p className="text-xs text-muted-foreground">
                  {new Intl.NumberFormat('en-PH', {
                    style: 'currency',
                    currency: currencyCode
                  }).format(item.unit_price)} each
                </p>
              )}
            </div>

            {/* Error Message */}
            {error && (
              <Alert variant="destructive" className="mt-3 py-2">
                <AlertCircle className="h-3 w-3" />
                <AlertDescription className="text-xs">{error}</AlertDescription>
              </Alert>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default ItemFull