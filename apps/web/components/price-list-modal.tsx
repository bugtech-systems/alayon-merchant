"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Plus,
  Trash2,
  Save,
  X,
  Check,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Filter,
  Search,
  LayoutGrid,
  List,
  Tag,
  Users,
  Calendar,
  Clock,
  Settings2,
  ArrowUpDown,
  Percent,
  DollarSign,
  TrendingUp,
  Package,
  Building2,
  UserCircle,
  Shield,
  Layers,
  RefreshCw,
  Loader2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

// ============================================================================
// Types following Medusa v2 CreatePriceListsWorkflowInput structure [citation:2][citation:9]
// ============================================================================

interface PriceListPrice {
  id?: string
  amount: number
  currency_code: string
  variant_id: string
  min_quantity: number | null
  max_quantity: number | null
  rules?: Record<string, string>
}

interface PriceListRule {
  id?: string
  attribute: string
  value: string
}

interface CustomerGroup {
  id: string
  name: string
  customers?: { id: string }[]
  created_at: string
  updated_at: string
}

interface ProductVariant {
  id: string
  title: string
  sku: string
  product_title: string
  product_id: string
  product: {
    id: string
    title: string
    thumbnail?: string
  }
  options: Record<string, string>
  prices?: {
    id: string
    amount: number
    currency_code: string
  }[]
  original_price?: number
  inventory_quantity?: number
}

interface PriceList {
  id?: string
  title: string
  description: string
  status: "active" | "draft"
  type: "sale" | "override"
  starts_at: string | null
  ends_at: string | null
  customer_groups: CustomerGroup[]
  prices: PriceListPrice[]
  rules?: PriceListRule[]
  metadata?: Record<string, any>
}

// ============================================================================
// Medusa API Service Actions [citation:6][citation:9]
// ============================================================================

// Fetch all customer groups for selection
async function fetchCustomerGroups(): Promise<CustomerGroup[]> {
  const response = await fetch("/api/admin/customer-groups", {
    headers: {
      "Content-Type": "application/json",
    },
  })
  if (!response.ok) {
    throw new Error("Failed to fetch customer groups")
  }
  const data = await response.json()
  return data.customer_groups || []
}

// Create a new price list using Medusa's createPriceListsWorkflow [citation:9]
async function createPriceList(priceListData: Partial<PriceList>): Promise<PriceList> {
  // Prepare payload following CreatePriceListsWorkflowInput structure [citation:2]
  const payload = {
    price_lists_data: [
      {
        title: priceListData.title,
        description: priceListData.description,
        status: priceListData.status,
        type: priceListData.type,
        starts_at: priceListData.starts_at,
        ends_at: priceListData.ends_at,
        // Customer groups are linked via rules in Medusa v2 [citation:1]
        rules: priceListData.customer_groups && priceListData.customer_groups.length > 0
          ? {
              customer_group_id: priceListData.customer_groups.map(g => g.id),
            }
          : undefined,
        prices: priceListData.prices?.map(price => ({
          amount: price.amount,
          currency_code: price.currency_code,
          variant_id: price.variant_id,
          min_quantity: price.min_quantity,
          max_quantity: price.max_quantity,
          rules: price.rules,
        })),
        metadata: priceListData.metadata,
      },
    ],
  }

  const response = await fetch("/api/admin/price-lists", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || "Failed to create price list")
  }

  const data = await response.json()
  return data.price_lists?.[0] || data
}

// Update existing price list [citation:6][citation:10]
async function updatePriceList(id: string, priceListData: Partial<PriceList>): Promise<PriceList> {
  const payload = {
    id,
    title: priceListData.title,
    description: priceListData.description,
    status: priceListData.status,
    type: priceListData.type,
    starts_at: priceListData.starts_at,
    ends_at: priceListData.ends_at,
    rules: priceListData.customer_groups && priceListData.customer_groups.length > 0
      ? {
          customer_group_id: priceListData.customer_groups.map(g => g.id),
        }
      : undefined,
    metadata: priceListData.metadata,
  }

  const response = await fetch(`/api/admin/price-lists/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || "Failed to update price list")
  }

  const data = await response.json()
  return data.price_list
}

// Update price list prices [citation:6]
async function updatePriceListPrices(priceListId: string, prices: PriceListPrice[]): Promise<void> {
  const response = await fetch(`/api/admin/price-lists/${priceListId}/prices`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prices: prices.map(price => ({
        id: price.id,
        amount: price.amount,
        currency_code: price.currency_code,
        variant_id: price.variant_id,
        min_quantity: price.min_quantity,
        max_quantity: price.max_quantity,
        rules: price.rules,
      })),
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || "Failed to update prices")
  }
}

// Fetch variants with their current prices [citation:8]
async function fetchVariants(params?: {
  q?: string
  limit?: number
  offset?: number
}): Promise<ProductVariant[]> {
  const queryParams = new URLSearchParams()
  if (params?.q) queryParams.append("q", params.q)
  if (params?.limit) queryParams.append("limit", String(params.limit))
  if (params?.offset) queryParams.append("offset", String(params.offset))
  queryParams.append("fields", "id,title,sku,product_id,product,*prices")

  const response = await fetch(`/api/admin/variants?${queryParams.toString()}`, {
    headers: {
      "Content-Type": "application/json",
    },
  })

  if (!response.ok) {
    throw new Error("Failed to fetch variants")
  }

  const data = await response.json()
  return data.variants || []
}

// Fetch price list by ID for editing
async function fetchPriceList(id: string): Promise<PriceList> {
  const response = await fetch(`/api/admin/price-lists/${id}`, {
    headers: {
      "Content-Type": "application/json",
    },
  })

  if (!response.ok) {
    throw new Error("Failed to fetch price list")
  }

  const data = await response.json()
  return data.price_list
}

// ============================================================================
// Mock Data for Development (Replace with actual API calls)
// ============================================================================

const mockCurrencies = [
  { code: "usd", symbol: "$", name: "US Dollar", rate: 1, decimal_places: 2 },
  { code: "eur", symbol: "€", name: "Euro", rate: 0.85, decimal_places: 2 },
  { code: "gbp", symbol: "£", name: "British Pound", rate: 0.73, decimal_places: 2 },
  { code: "cad", symbol: "C$", name: "Canadian Dollar", rate: 1.25, decimal_places: 2 },
  { code: "aud", symbol: "A$", name: "Australian Dollar", rate: 1.35, decimal_places: 2 },
]

const mockCustomerGroups: CustomerGroup[] = [
  { id: "group_1", name: "Wholesale Customers", customers: [], created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: "group_2", name: "VIP Customers", customers: [], created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: "group_3", name: "Retail Partners", customers: [], created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: "group_4", name: "Enterprise Accounts", customers: [], created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
]

const mockVariants: ProductVariant[] = [
  {
    id: "variant_1",
    title: "Classic White T-Shirt / Small",
    sku: "TS-WHT-S",
    product_title: "Classic White T-Shirt",
    product_id: "prod_1",
    product: { id: "prod_1", title: "Classic White T-Shirt", thumbnail: null },
    options: { Size: "Small", Color: "White" },
    original_price: 29.99,
    inventory_quantity: 50,
  },
  // ... more variants as before
]

// ============================================================================
// Main Component - Full Width Modal with Customer Groups
// ============================================================================

interface PriceListModalProps {
  children?: React.ReactNode
  onSave?: (priceList: PriceList) => Promise<void>
  onClose?: () => void
  initialData?: Partial<PriceList>
  priceListId?: string // For editing existing price list
  variants?: ProductVariant[]
  currencies?: typeof mockCurrencies
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function PriceListModal({
  children,
  onSave,
  onClose,
  initialData,
  priceListId,
  variants = mockVariants,
  currencies = mockCurrencies,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: PriceListModalProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [loading, setLoading] = useState(false)
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedProductFilter, setSelectedProductFilter] = useState<string>("all")
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [activeTab, setActiveTab] = useState<string>("prices")
  const [customerGroups, setCustomerGroups] = useState<CustomerGroup[]>([])
  const [loadingGroups, setLoadingGroups] = useState(false)
  const [customerGroupPopoverOpen, setCustomerGroupPopoverOpen] = useState(false)

  const open = controlledOpen !== undefined ? controlledOpen : internalOpen
  const setOpen = controlledOnOpenChange || setInternalOpen

  // Form state following Medusa v2 structure
  const [priceList, setPriceList] = useState<PriceList>({
    title: initialData?.title || "",
    description: initialData?.description || "",
    status: initialData?.status || "draft",
    type: initialData?.type || "override",
    starts_at: initialData?.starts_at || null,
    ends_at: initialData?.ends_at || null,
    customer_groups: initialData?.customer_groups || [],
    prices: initialData?.prices || [],
    metadata: initialData?.metadata || {},
  })

  const [selectedVariants, setSelectedVariants] = useState<Set<string>>(
    new Set(initialData?.prices?.map((p) => p.variant_id) || [])
  )

  const [bulkEditMode, setBulkEditMode] = useState<{
    active: boolean
    currencyCode: string | null
    value: number | null
    operation: "set" | "increase" | "decrease" | "percentage"
  }>({ active: false, currencyCode: null, value: null, operation: "set" })

  // Load customer groups on mount [citation:1]
  useEffect(() => {
    if (open) {
      loadCustomerGroups()
      if (priceListId) {
        loadExistingPriceList(priceListId)
      }
    }
  }, [open, priceListId])

  const loadCustomerGroups = async () => {
    setLoadingGroups(true)
    try {
      const groups = await fetchCustomerGroups()
      setCustomerGroups(groups)
    } catch (error) {
      console.error("Failed to load customer groups:", error)
      // Fallback to mock data in development
      setCustomerGroups(mockCustomerGroups)
    } finally {
      setLoadingGroups(false)
    }
  }

  const loadExistingPriceList = async (id: string) => {
    setLoading(true)
    try {
      const existing = await fetchPriceList(id)
      setPriceList({
        title: existing.title,
        description: existing.description,
        status: existing.status,
        type: existing.type,
        starts_at: existing.starts_at,
        ends_at: existing.ends_at,
        customer_groups: existing.customer_groups || [],
        prices: existing.prices || [],
        metadata: existing.metadata,
      })
      setSelectedVariants(new Set(existing.prices?.map(p => p.variant_id) || []))
    } catch (error) {
      console.error("Failed to load price list:", error)
      toast.error("Failed to load price list data")
    } finally {
      setLoading(false)
    }
  }

  // Filter variants
  const filteredVariants = variants.filter((variant) => {
    const matchesSearch =
      searchQuery === "" ||
      variant.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      variant.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      variant.product_title.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesProduct =
      selectedProductFilter === "all" || variant.product_id === selectedProductFilter

    return matchesSearch && matchesProduct
  })

  const products = Array.from(
    new Map(variants.map((v) => [v.product_id, v.product_title]))
  ).map(([id, title]) => ({ id, title }))

  // Price management functions
  const updatePrice = (variantId: string, currencyCode: string, amount: number) => {
    setPriceList((prev) => {
      const existingIndex = prev.prices.findIndex(
        (p) => p.variant_id === variantId && p.currency_code === currencyCode
      )

      let newPrices
      if (existingIndex >= 0) {
        newPrices = [...prev.prices]
        newPrices[existingIndex] = { ...newPrices[existingIndex], amount }
      } else {
        newPrices = [
          ...prev.prices,
          {
            variant_id: variantId,
            currency_code: currencyCode,
            amount,
            min_quantity: null,
            max_quantity: null,
          },
        ]
      }
      return { ...prev, prices: newPrices }
    })
  }

  const getPrice = (variantId: string, currencyCode: string): number | null => {
    const price = priceList.prices.find(
      (p) => p.variant_id === variantId && p.currency_code === currencyCode
    )
    return price?.amount ?? null
  }

  const removeVariantPrices = (variantId: string) => {
    setPriceList((prev) => ({
      ...prev,
      prices: prev.prices.filter((p) => p.variant_id !== variantId),
    }))
    setSelectedVariants((prev) => {
      const next = new Set(prev)
      next.delete(variantId)
      return next
    })
  }

  const toggleVariant = (variantId: string) => {
    setSelectedVariants((prev) => {
      const next = new Set(prev)
      if (next.has(variantId)) {
        next.delete(variantId)
      } else {
        next.add(variantId)
      }
      return next
    })
  }

  const selectAllFilteredVariants = () => {
    const allIds = new Set(filteredVariants.map((v) => v.id))
    setSelectedVariants(allIds)
  }

  const clearAllSelections = () => {
    setSelectedVariants(new Set())
  }

  const applyPercentageDiscount = (percentage: number, currencyCode: string) => {
    selectedVariants.forEach((variantId) => {
      const variant = variants.find((v) => v.id === variantId)
      if (variant?.original_price) {
        const discountedPrice = variant.original_price * (1 - percentage / 100)
        updatePrice(variantId, currencyCode, Number(discountedPrice.toFixed(2)))
      }
    })
  }

  const bulkUpdatePrices = () => {
    if (!bulkEditMode.currencyCode || bulkEditMode.value === null) return

    selectedVariants.forEach((variantId) => {
      const currentPrice = getPrice(variantId, bulkEditMode.currencyCode!)
      let newPrice = bulkEditMode.value!

      switch (bulkEditMode.operation) {
        case "increase":
          newPrice = (currentPrice || 0) + bulkEditMode.value!
          break
        case "decrease":
          newPrice = (currentPrice || 0) - bulkEditMode.value!
          break
        case "percentage":
          newPrice = (currentPrice || 0) * (1 + bulkEditMode.value! / 100)
          break
        case "set":
        default:
          newPrice = bulkEditMode.value!
      }

      updatePrice(variantId, bulkEditMode.currencyCode!, Number(newPrice.toFixed(2)))
    })

    setBulkEditMode({ active: false, currencyCode: null, value: null, operation: "set" })
  }

  const toggleCustomerGroup = (group: CustomerGroup) => {
    setPriceList((prev) => {
      const exists = prev.customer_groups.some((g) => g.id === group.id)
      if (exists) {
        return {
          ...prev,
          customer_groups: prev.customer_groups.filter((g) => g.id !== group.id),
        }
      } else {
        return {
          ...prev,
          customer_groups: [...prev.customer_groups, group],
        }
      }
    })
  }

  // Handle save/submit using Medusa workflows [citation:6][citation:9]
  const handleSave = async () => {
    setLoading(true)
    try {
      // Filter prices to only include selected variants
      const finalPrices = priceList.prices.filter((p) =>
        selectedVariants.has(p.variant_id)
      )

      let savedPriceList: PriceList

      if (priceListId) {
        // Update existing price list
        await updatePriceList(priceListId, {
          title: priceList.title,
          description: priceList.description,
          status: priceList.status,
          type: priceList.type,
          starts_at: priceList.starts_at,
          ends_at: priceList.ends_at,
          customer_groups: priceList.customer_groups,
          metadata: priceList.metadata,
        })
        
        // Update prices separately
        if (finalPrices.length > 0) {
          await updatePriceListPrices(priceListId, finalPrices)
        }
        
        savedPriceList = { ...priceList, id: priceListId }
        
        toast.success("Price list updated successfully")
      } else {
        // Create new price list
        savedPriceList = await createPriceList({
          title: priceList.title,
          description: priceList.description,
          status: priceList.status,
          type: priceList.type,
          starts_at: priceList.starts_at,
          ends_at: priceList.ends_at,
          customer_groups: priceList.customer_groups,
          prices: finalPrices,
          metadata: priceList.metadata,
        })
        
        toast("Price list created successfully")
      }

      await onSave?.(savedPriceList)
      handleClose()
    } catch (error: any) {
      console.error("Failed to save price list:", error)
      toast.error(error.message || "Failed to save price list")
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (hasUnsavedChanges()) {
      setShowCancelDialog(true)
    } else {
      setOpen(false)
      resetForm()
      onClose?.()
    }
  }

  const resetForm = () => {
    setStep(1)
    setPriceList({
      title: "",
      description: "",
      status: "draft",
      type: "override",
      starts_at: null,
      ends_at: null,
      customer_groups: [],
      prices: [],
      metadata: {},
    })
    setSelectedVariants(new Set())
    setSearchQuery("")
    setSelectedProductFilter("all")
  }

  const hasUnsavedChanges = () => {
    return (
      priceList.title !== "" ||
      priceList.description !== "" ||
      priceList.prices.length > 0 ||
      selectedVariants.size > 0 ||
      priceList.customer_groups.length > 0
    )
  }

  const nextStep = () => {
    if (step === 1 && !priceList.title) return
    setStep((s) => (s + 1) as 1 | 2 | 3)
  }
  const prevStep = () => setStep((s) => (s - 1) as 1 | 2 | 3)

  const progress = (step / 3) * 100
  const variantsByProduct = filteredVariants.reduce((acc, variant) => {
    if (!acc[variant.product_title]) acc[variant.product_title] = []
    acc[variant.product_title].push(variant)
    return acc
  }, {} as Record<string, ProductVariant[]>)

  const selectedVariantsList = variants.filter((v) => selectedVariants.has(v.id))
  const totalPriceEntries = priceList.prices.length
  const totalValue = priceList.prices.reduce((sum, p) => sum + p.amount, 0)
  const averagePrice = totalPriceEntries > 0 ? totalValue / totalPriceEntries : 0

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        {children && <DialogTrigger asChild>{children}</DialogTrigger>}
        <DialogContent className="w-screen h-screen max-w-none p-0 m-0 rounded-none flex flex-col overflow-hidden">
          {/* Header */}
          <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10">
            <div className="px-8 py-6">
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <DialogTitle className="text-3xl font-bold tracking-tight">
                      {priceListId ? "Edit Price List" : "Create New Price List"}
                    </DialogTitle>
                    <DialogDescription className="text-base mt-2">
                      Configure product pricing with customer group rules following Medusa v2 workflow
                    </DialogDescription>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Selected Variants</p>
                      <p className="text-2xl font-bold">{selectedVariants.size}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Customer Groups</p>
                      <p className="text-2xl font-bold">{priceList.customer_groups.length}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Price Entries</p>
                      <p className="text-2xl font-bold">{totalPriceEntries}</p>
                    </div>
                  </div>
                </div>
              </DialogHeader>

              {/* Progress Steps */}
              <div className="mt-6 space-y-3">
                <div className="flex justify-between text-sm">
                  <div className={cn("flex items-center gap-2", step >= 1 && "text-primary font-semibold")}>
                    <div className={cn("w-6 h-6 rounded-full flex items-center justify-center text-xs",
                      step >= 1 ? "bg-primary text-primary-foreground" : "bg-muted")}>1</div>
                    <span>Details & Groups</span>
                  </div>
                  <div className={cn("flex items-center gap-2", step >= 2 && "text-primary font-semibold")}>
                    <div className={cn("w-6 h-6 rounded-full flex items-center justify-center text-xs",
                      step >= 2 ? "bg-primary text-primary-foreground" : "bg-muted")}>2</div>
                    <span>Products</span>
                  </div>
                  <div className={cn("flex items-center gap-2", step >= 3 && "text-primary font-semibold")}>
                    <div className={cn("w-6 h-6 rounded-full flex items-center justify-center text-xs",
                      step >= 3 ? "bg-primary text-primary-foreground" : "bg-muted")}>3</div>
                    <span>Prices</span>
                  </div>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            </div>
          </div>

          {/* Scrollable Content */}
          <ScrollArea className="flex-1">
            <div className="p-8">
              {/* Step 1: Details & Customer Groups */}
              {step === 1 && (
                <div className="max-w-4xl mx-auto space-y-8">
                  {/* Type Selection */}
                  <div className="space-y-4">
                    <Label className="text-base font-semibold flex items-center gap-2">
                      <Tag className="h-4 w-4" />
                      Price List Type
                    </Label>
                    <div className="grid grid-cols-2 gap-6">
                      <Button
                        type="button"
                        variant={priceList.type === "sale" ? "default" : "outline"}
                        onClick={() => setPriceList({ ...priceList, type: "sale" })}
                        className="h-auto py-6 flex flex-col gap-3"
                      >
                        <div className="text-3xl">🏷️</div>
                        <div>
                          <div className="font-semibold text-lg">Sale</div>
                          <div className="text-sm text-muted-foreground">
                            Temporary price reductions for promotions
                          </div>
                        </div>
                      </Button>
                      <Button
                        type="button"
                        variant={priceList.type === "override" ? "default" : "outline"}
                        onClick={() => setPriceList({ ...priceList, type: "override" })}
                        className="h-auto py-6 flex flex-col gap-3"
                      >
                        <div className="text-3xl">⚡</div>
                        <div>
                          <div className="font-semibold text-lg">Override</div>
                          <div className="text-sm text-muted-foreground">
                            Permanent overrides for specific customer groups [citation:1]
                          </div>
                        </div>
                      </Button>
                    </div>
                  </div>

                  <Separator />

                  {/* Basic Information */}
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="title" className="text-base font-semibold">
                        Price List Name *
                      </Label>
                      <Input
                        id="title"
                        placeholder="e.g., Summer Sale 2024, Wholesale Pricing, VIP Customer Prices"
                        value={priceList.title}
                        onChange={(e) => setPriceList({ ...priceList, title: e.target.value })}
                        className="text-lg h-12"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description" className="text-base font-semibold">
                        Description
                      </Label>
                      <textarea
                        id="description"
                        placeholder="Brief description of this price list (internal use)"
                        value={priceList.description}
                        onChange={(e) => setPriceList({ ...priceList, description: e.target.value })}
                        className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-4 py-3 text-sm"
                      />
                    </div>
                  </div>

                  <Separator />

                  {/* Customer Group Selection - B2B Feature [citation:1] */}
                  <div className="space-y-4">
                    <div>
                      <Label className="text-base font-semibold flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Customer Groups
                      </Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        Apply this price list to specific customer groups for B2B pricing [citation:1]
                      </p>
                    </div>

                    <Popover open={customerGroupPopoverOpen} onOpenChange={setCustomerGroupPopoverOpen}>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-between h-12">
                          <span className="flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            {priceList.customer_groups.length > 0
                              ? `${priceList.customer_groups.length} group(s) selected`
                              : "Select customer groups"}
                          </span>
                          <ChevronRight className="h-4 w-4 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[400px] p-0" align="start">
                        <Command>
                          <CommandInput placeholder="Search groups..." />
                          <CommandList>
                            <CommandEmpty>No groups found.</CommandEmpty>
                            <CommandGroup heading="Available Groups">
                              {customerGroups.map((group) => (
                                <CommandItem
                                  key={group.id}
                                  onSelect={() => toggleCustomerGroup(group)}
                                  className="flex items-center justify-between cursor-pointer"
                                >
                                  <div className="flex items-center gap-2">
                                    <Building2 className="h-4 w-4" />
                                    <span>{group.name}</span>
                                  </div>
                                  <Checkbox
                                    checked={priceList.customer_groups.some(g => g.id === group.id)}
                                    className="pointer-events-none"
                                  />
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>

                    {/* Selected groups display */}
                    {priceList.customer_groups.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {priceList.customer_groups.map((group) => (
                          <Badge key={group.id} variant="secondary" className="gap-1">
                            {group.name}
                            <button
                              onClick={() => toggleCustomerGroup(group)}
                              className="ml-1 hover:text-destructive"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  <Separator />

                  {/* Schedule Settings */}
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="status" className="flex items-center gap-2">
                        <Settings2 className="h-4 w-4" />
                        Status
                      </Label>
                      <Select
                        value={priceList.status}
                        onValueChange={(value: "active" | "draft") =>
                          setPriceList({ ...priceList, status: value })
                        }
                      >
                        <SelectTrigger className="h-11">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-green-500" />
                              Active
                            </div>
                          </SelectItem>
                          <SelectItem value="draft">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-gray-400" />
                              Draft
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="starts_at" className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Start Date (Optional)
                      </Label>
                      <Input
                        id="starts_at"
                        type="datetime-local"
                        value={priceList.starts_at?.slice(0, 16) || ""}
                        onChange={(e) =>
                          setPriceList({
                            ...priceList,
                            starts_at: e.target.value ? new Date(e.target.value).toISOString() : null,
                          })
                        }
                        className="h-11"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="ends_at" className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        End Date (Optional)
                      </Label>
                      <Input
                        id="ends_at"
                        type="datetime-local"
                        value={priceList.ends_at?.slice(0, 16) || ""}
                        onChange={(e) =>
                          setPriceList({
                            ...priceList,
                            ends_at: e.target.value ? new Date(e.target.value).toISOString() : null,
                          })
                        }
                        className="h-11"
                      />
                    </div>
                  </div>

                  {/* Info card about customer group pricing */}
                  <Card className="bg-muted/50">
                    <CardContent className="pt-6">
                      <div className="flex items-start gap-3">
                        <Shield className="h-5 w-5 text-primary mt-0.5" />
                        <div>
                          <p className="text-sm font-medium">B2B Customer Group Pricing</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            In Medusa v2, price lists can be scoped to specific customer groups using rules.
                            Customers belonging to selected groups will see these prices automatically. [citation:1]
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Step 2: Product Selection */}
              {step === 2 && (
                <div className="space-y-6">
                  {/* Search and Filter */}
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex gap-4 items-center flex-wrap">
                        <div className="relative flex-1 min-w-[300px]">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="Search products, variants, or SKU..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 h-11"
                          />
                        </div>
                        <Select value={selectedProductFilter} onValueChange={setSelectedProductFilter}>
                          <SelectTrigger className="w-[200px] h-11">
                            <Filter className="h-4 w-4 mr-2" />
                            <SelectValue placeholder="All Products" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Products</SelectItem>
                            {products.map((product) => (
                              <SelectItem key={product.id} value={product.id}>
                                {product.title}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button variant="outline" size="sm" onClick={() => setViewMode("grid")}>
                          <LayoutGrid className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => setViewMode("list")}>
                          <List className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" onClick={selectAllFilteredVariants}>
                          Select All ({filteredVariants.length})
                        </Button>
                        {selectedVariants.size > 0 && (
                          <Button variant="ghost" onClick={clearAllSelections}>
                            Clear ({selectedVariants.size})
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Selected Summary */}
                  {selectedVariants.size > 0 && (
                    <Card className="bg-primary/5 border-primary/20">
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium">Selected Variants</p>
                            <p className="text-2xl font-bold">{selectedVariants.size}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium">Products</p>
                            <p className="text-2xl font-bold">
                              {new Set(selectedVariantsList.map(v => v.product_id)).size}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm font-medium">Total Original Value</p>
                            <p className="text-2xl font-bold">
                              ${selectedVariantsList.reduce((sum, v) => sum + (v.original_price || 0), 0).toFixed(2)}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Variants Display */}
                  <div className="space-y-6">
                    {Object.entries(variantsByProduct).map(([productTitle, productVariants]) => (
                      <Card key={productTitle}>
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <div>
                              <CardTitle className="text-xl">{productTitle}</CardTitle>
                              <CardDescription>
                                {productVariants.length} variants • 
                                {productVariants.filter(v => selectedVariants.has(v.id)).length} selected
                              </CardDescription>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const ids = productVariants.map(v => v.id)
                                const allSelected = ids.every(id => selectedVariants.has(id))
                                if (allSelected) {
                                  ids.forEach(id => selectedVariants.delete(id))
                                  setSelectedVariants(new Set(selectedVariants))
                                } else {
                                  ids.forEach(id => selectedVariants.add(id))
                                  setSelectedVariants(new Set(selectedVariants))
                                }
                              }}
                            >
                              {productVariants.every(v => selectedVariants.has(v.id)) ? "Deselect All" : "Select All"}
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent>
                          {viewMode === "grid" ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                              {productVariants.map((variant) => (
                                <div
                                  key={variant.id}
                                  className={cn(
                                    "flex flex-col p-4 rounded-lg border transition-all cursor-pointer",
                                    selectedVariants.has(variant.id)
                                      ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                                      : "hover:bg-muted/50"
                                  )}
                                  onClick={() => toggleVariant(variant.id)}
                                >
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                      <p className="font-medium">{variant.title}</p>
                                      <p className="text-sm text-muted-foreground mt-1">SKU: {variant.sku}</p>
                                    </div>
                                    {selectedVariants.has(variant.id) && <Check className="h-5 w-5 text-primary" />}
                                  </div>
                                  <div className="flex flex-wrap gap-2 mt-3">
                                    {Object.entries(variant.options).map(([key, value]) => (
                                      <Badge key={key} variant="secondary" className="text-xs">
                                        {key}: {value}
                                      </Badge>
                                    ))}
                                  </div>
                                  <div className="flex justify-between items-center mt-3 pt-3 border-t">
                                    <span className="text-sm text-muted-foreground">Stock: {variant.inventory_quantity}</span>
                                    <span className="font-semibold">${variant.original_price}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {productVariants.map((variant) => (
                                <div
                                  key={variant.id}
                                  className={cn(
                                    "flex items-center justify-between p-4 rounded-lg border transition-all cursor-pointer",
                                    selectedVariants.has(variant.id)
                                      ? "border-primary bg-primary/5"
                                      : "hover:bg-muted/50"
                                  )}
                                  onClick={() => toggleVariant(variant.id)}
                                >
                                  <div className="flex-1 grid grid-cols-12 gap-4 items-center">
                                    <div className="col-span-5">
                                      <p className="font-medium">{variant.title}</p>
                                      <p className="text-sm text-muted-foreground">SKU: {variant.sku}</p>
                                    </div>
                                    <div className="col-span-4">
                                      <div className="flex gap-2">
                                        {Object.entries(variant.options).map(([key, value]) => (
                                          <Badge key={key} variant="secondary" size="sm">
                                            {key}: {value}
                                          </Badge>
                                        ))}
                                      </div>
                                    </div>
                                    <div className="col-span-2 text-right">
                                      <p className="text-sm text-muted-foreground">Stock: {variant.inventory_quantity}</p>
                                    </div>
                                    <div className="col-span-1 text-right font-semibold">${variant.original_price}</div>
                                  </div>
                                  {selectedVariants.has(variant.id) && <Check className="h-5 w-5 text-primary ml-4" />}
                                </div>
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}

                    {filteredVariants.length === 0 && (
                      <div className="text-center py-12">
                        <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <p className="text-muted-foreground">No variants match your search</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Step 3: Prices */}
              {step === 3 && (
                <div className="space-y-6">
                  {selectedVariantsList.length === 0 ? (
                    <div className="text-center py-12">
                      <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground text-lg">No variants selected</p>
                      <Button onClick={prevStep} className="mt-6">Back to Products</Button>
                    </div>
                  ) : (
                    <Tabs value={activeTab} onValueChange={setActiveTab}>
                      <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
                        <TabsTrigger value="prices">Price Matrix</TabsTrigger>
                        <TabsTrigger value="bulk">Bulk Actions</TabsTrigger>
                        <TabsTrigger value="analytics">Analytics</TabsTrigger>
                      </TabsList>

                      <TabsContent value="prices" className="mt-6">
                        <div className="rounded-md border overflow-auto">
                          <Table>
                            <TableHeader className="sticky top-0 bg-background">
                              <TableRow>
                                <TableHead className="w-[350px] sticky left-0 bg-background z-10">
                                  Product / Variant
                                </TableHead>
                                {currencies.map((currency) => (
                                  <TableHead key={currency.code} className="text-right min-w-[150px]">
                                    <div>
                                      <div className="font-semibold">{currency.code.toUpperCase()}</div>
                                      <div className="text-xs text-muted-foreground">{currency.symbol}</div>
                                    </div>
                                  </TableHead>
                                ))}
                                <TableHead className="w-[50px]"></TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {selectedVariantsList.map((variant) => {
                                const originalPrice = variant.original_price
                                return (
                                  <TableRow key={variant.id}>
                                    <TableCell className="font-medium sticky left-0 bg-background">
                                      <div>
                                        <p className="font-semibold text-base">{variant.product_title}</p>
                                        <p className="text-sm">{variant.title}</p>
                                        <p className="text-xs text-muted-foreground mt-1">SKU: {variant.sku}</p>
                                        {originalPrice && (
                                          <p className="text-xs text-muted-foreground mt-1">Original: ${originalPrice}</p>
                                        )}
                                      </div>
                                    </TableCell>
                                    {currencies.map((currency) => {
                                      const price = getPrice(variant.id, currency.code)
                                      const isDiscounted = originalPrice && price && price < originalPrice
                                      return (
                                        <TableCell key={currency.code} className="text-right">
                                          <Input
                                            type="number"
                                            placeholder="—"
                                            value={price ?? ""}
                                            onChange={(e) => {
                                              const value = e.target.value
                                              updatePrice(variant.id, currency.code, value ? parseFloat(value) : 0)
                                            }}
                                            className={cn("w-32 ml-auto text-right", isDiscounted && "border-green-500")}
                                            step={currency.decimal_places === 0 ? "1" : "0.01"}
                                          />
                                        </TableCell>
                                      )
                                    })}
                                    <TableCell>
                                      <Button variant="ghost" size="icon" onClick={() => removeVariantPrices(variant.id)}>
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </TableCell>
                                  </TableRow>
                                )
                              })}
                            </TableBody>
                          </Table>
                        </div>
                      </TabsContent>

                      <TabsContent value="bulk" className="mt-6">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          <Card>
                            <CardHeader>
                              <CardTitle className="flex items-center gap-2">
                                <ArrowUpDown className="h-5 w-5" />
                                Bulk Price Operations
                              </CardTitle>
                              <CardDescription>
                                Apply to {selectedVariantsList.length} selected variants
                              </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                              <div className="space-y-2">
                                <Label>Currency</Label>
                                <Select
                                  value={bulkEditMode.currencyCode || ""}
                                  onValueChange={(v) => setBulkEditMode({ ...bulkEditMode, currencyCode: v })}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select currency" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {currencies.map((c) => (
                                      <SelectItem key={c.code} value={c.code}>
                                        {c.code.toUpperCase()} - {c.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-2">
                                <Label>Operation</Label>
                                <Select
                                  value={bulkEditMode.operation}
                                  onValueChange={(v: any) => setBulkEditMode({ ...bulkEditMode, operation: v })}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="set">Set to value</SelectItem>
                                    <SelectItem value="increase">Increase by amount</SelectItem>
                                    <SelectItem value="decrease">Decrease by amount</SelectItem>
                                    <SelectItem value="percentage">Increase by percentage</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-2">
                                <Label>Value</Label>
                                <Input
                                  type="number"
                                  placeholder="Enter value"
                                  value={bulkEditMode.value || ""}
                                  onChange={(e) => setBulkEditMode({
                                    ...bulkEditMode,
                                    value: e.target.value ? parseFloat(e.target.value) : null,
                                  })}
                                />
                              </div>
                              <Button className="w-full" onClick={bulkUpdatePrices} disabled={!bulkEditMode.currencyCode || bulkEditMode.value === null}>
                                Apply to {selectedVariantsList.length} variants
                              </Button>
                            </CardContent>
                          </Card>

                          <Card>
                            <CardHeader>
                              <CardTitle className="flex items-center gap-2">
                                <Percent className="h-5 w-5" />
                                Quick Discounts
                              </CardTitle>
                              <CardDescription>Apply percentage discounts</CardDescription>
                            </CardHeader>
                            <CardContent>
                              <div className="grid grid-cols-4 gap-2">
                                {[5, 10, 15, 20, 25, 30, 40, 50].map((p) => (
                                  <Button key={p} variant="outline" onClick={() => applyPercentageDiscount(p, "usd")}>
                                    {p}% OFF
                                  </Button>
                                ))}
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                      </TabsContent>

                      <TabsContent value="analytics" className="mt-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                          <Card>
                            <CardHeader className="pb-2">
                              <CardDescription>Total Variants</CardDescription>
                              <CardTitle className="text-3xl">{selectedVariantsList.length}</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Package className="h-4 w-4" />
                                across {new Set(selectedVariantsList.map(v => v.product_id)).size} products
                              </div>
                            </CardContent>
                          </Card>
                          <Card>
                            <CardHeader className="pb-2">
                              <CardDescription>Price Entries</CardDescription>
                              <CardTitle className="text-3xl">{totalPriceEntries}</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <DollarSign className="h-4 w-4" />
                                across {currencies.length} currencies
                              </div>
                            </CardContent>
                          </Card>
                          <Card>
                            <CardHeader className="pb-2">
                              <CardDescription>Average Price</CardDescription>
                              <CardTitle className="text-3xl">${averagePrice.toFixed(2)}</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <TrendingUp className="h-4 w-4" />
                                per variant
                              </div>
                            </CardContent>
                          </Card>
                          <Card>
                            <CardHeader className="pb-2">
                              <CardDescription>Customer Groups</CardDescription>
                              <CardTitle className="text-3xl">{priceList.customer_groups.length}</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Users className="h-4 w-4" />
                                groups selected
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                      </TabsContent>
                    </Tabs>
                  )}
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Footer */}
          <DialogFooter className="border-t bg-background/95 sticky bottom-0 z-10">
            <div className="flex justify-between w-full px-8 py-4">
              <div>
                {step > 1 && (
                  <Button variant="outline" onClick={prevStep} size="lg">
                    <ChevronLeft className="h-4 w-4 mr-2" />
                    Back
                  </Button>
                )}
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={handleClose} size="lg">Cancel</Button>
                {step < 3 ? (
                  <Button onClick={nextStep} disabled={step === 1 && !priceList.title} size="lg">
                    Continue
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                ) : (
                  <Button onClick={handleSave} disabled={loading} size="lg">
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        {priceListId ? "Update" : "Create"} Price List
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Confirmation */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes. Are you sure you want to cancel?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continue Editing</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              setShowCancelDialog(false)
              setOpen(false)
              resetForm()
              onClose?.()
            }}>
              Discard Changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}