// app/customers/[id]/page.tsx
"use client"

import { useEffect, useMemo, useState, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { format } from "date-fns"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

import { Calendar } from "@/components/ui/calendar"
import { Separator } from "@/components/ui/separator"
import {
  AlertCircle,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock,
  Container,
  CreditCard,
  Download,
  Edit,
  Filter,
  History,
  Mail,
  MapPin,
  Minus,
  MoreVertical,
  Package,
  Phone,
  Plus,
  RefreshCw,
  ShoppingCart,
  Trash2,
  TrendingDown,
  TrendingUp,
  Wallet,
  XCircle,
  Loader2,
  Receipt,
  Droplet,
  RotateCcw,
} from "lucide-react"

// Import actions
import { retrieveCustomer, listCustomerAddresses, updateCustomer, deleteCustomer } from "@/lib/actions/drivers"
import { 
  getJagwarCustomerDashboard, 
  createJagwarOrder,
  type JagwarCustomerDashboard,
  type JagTransaction,
  type RefillCreditTransaction,
  type CreateJagwarOrderInput,
} from "@/lib/actions/jagwar"

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

type CustomerType = "residential" | "commercial"

interface Customer {
  id: string
  first_name: string
  last_name: string
  email: string
  phone: string
  created_at: string
  has_account: boolean
  metadata: {
    preferred_payment: string
    notes: string
    customer_type: CustomerType
  }
}

interface Address {
  id: string
  customer_id: string
  address_1: string
  address_2: string
  city: string
  province: string
  postal_code: string
  country_code: string
  metadata: {
    landmark: string
    delivery_instructions: string
  }
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

const peso = (value: number) =>
  `₱${Number(value || 0).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`

const titleCase = (value: string) =>
  value?.charAt(0).toUpperCase() + value?.slice(1)

const getInitials = (customer: Customer) =>
  `${customer.first_name?.[0] ?? ""}${customer.last_name?.[0] ?? ""}`

// -----------------------------------------------------------------------------
// Page
// -----------------------------------------------------------------------------

export default function CustomerDetailPage() {
  const params = useParams()
  const router = useRouter()

  const customerId = String(params.id)

  // State
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [dashboardData, setDashboardData] = useState<JagwarCustomerDashboard | null>(null)
  const [addresses, setAddresses] = useState<Address[]>([])
  const [jagTransactions, setJagTransactions] = useState<JagTransaction[]>([])
  const [rewardTransactions, setRewardTransactions] = useState<RefillCreditTransaction[]>([])

  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [activeTab, setActiveTab] = useState("overview")

  // Order dialog states
  const [orderDialogOpen, setOrderDialogOpen] = useState(false)
  const [orderQuantity, setOrderQuantity] = useState("1")
  const [orderReturnedOwn, setOrderReturnedOwn] = useState("0")
  const [orderReturnedOther, setOrderReturnedOther] = useState("0")
  const [orderPaidAmount, setOrderPaidAmount] = useState("0")
  const [orderCreditToApply, setOrderCreditToApply] = useState("0")
  const [orderStockLocationId, setOrderStockLocationId] = useState("")
  const [orderNotes, setOrderNotes] = useState("")
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false)

  // Edit dialog states
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editFormData, setEditFormData] = useState<Partial<Customer>>({})
  const [isUpdatingCustomer, setIsUpdatingCustomer] = useState(false)

  // Delete dialog states
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  // -----------------------------------------------------------------------------
  // Load Data
  // -----------------------------------------------------------------------------

  const fetchCustomerData = useCallback(async () => {
    if (!customerId) return

    try {
      setIsLoading(true)

      // Fetch customer details
      const customerResult = await retrieveCustomer(customerId)
      if (customerResult.success && customerResult.customer) {
        setCustomer(customerResult.customer)
      }

      // Fetch customer addresses
      const addressesResult = await listCustomerAddresses(customerId)
      if (addressesResult.success) {
        setAddresses(addressesResult.addresses || [])
      }

      // Fetch Jagwar dashboard data
      const dashboardResult = await getJagwarCustomerDashboard(customerId)
      if (dashboardResult.success && dashboardResult.data) {
        setDashboardData(dashboardResult.data)
        setJagTransactions(dashboardResult.data.recent_activity?.jag_transactions || [])
        setRewardTransactions(dashboardResult.data.recent_activity?.reward_transactions || [])
      }

    } catch (error) {
      console.error("Error fetching customer data:", error)
      toast.error("Failed to load customer data")
    } finally {
      setIsLoading(false)
    }
  }, [customerId])

  useEffect(() => {
    fetchCustomerData()
  }, [fetchCustomerData])

  // Refresh handler
  const handleRefresh = useCallback(async () => {
    if (isRefreshing) return

    setIsRefreshing(true)
    try {
      await fetchCustomerData()
      toast.success("Customer data refreshed")
    } catch (error) {
      console.error("Refresh failed:", error)
      toast.error("Failed to refresh customer data")
    } finally {
      setIsRefreshing(false)
    }
  }, [fetchCustomerData, isRefreshing])

  // -----------------------------------------------------------------------------
  // Derived values
  // -----------------------------------------------------------------------------

  const financialData = dashboardData?.financial || {
    credit_limit: 0,
    current_balance: 0,
    total_orders: 0,
  }

  const containerData = dashboardData?.containers || {
    borrowed_own: 0,
    returned_other: 0,
  }

  const rewardsData = dashboardData?.rewards || {
    refill_credit_balance: 0,
    total_earned: 0,
    total_used: 0,
  }

  const creditUtilization = financialData.credit_limit > 0
    ? Math.min(100, (financialData.current_balance / financialData.credit_limit) * 100)
    : 0

  const totalJagTransactions = jagTransactions.reduce(
    (sum, t) => sum + t.quantity,
    0
  )

  // -----------------------------------------------------------------------------
  // Create Order Handler
  // -----------------------------------------------------------------------------

  const handleCreateOrder = useCallback(async () => {
    if (!customer) return

    const quantity = Number(orderQuantity)
    const returnedOwn = Number(orderReturnedOwn)
    const returnedOther = Number(orderReturnedOther)
    const paidAmount = Number(orderPaidAmount)
    const creditToApply = Number(orderCreditToApply)

    if (!quantity || quantity <= 0) {
      toast.error("Please enter a valid quantity")
      return
    }

    if (!orderStockLocationId) {
      toast.error("Please select a stock location")
      return
    }

    setIsSubmittingOrder(true)

    try {
      const input: CreateJagwarOrderInput = {
        customerId: customer.id,
        quantity,
        returnedOwn,
        returnedOther,
        paidAmount,
        creditToApply,
        stockLocationId: orderStockLocationId,
        notes: orderNotes || undefined,
      }

      const result = await createJagwarOrder(input)

      if (!result.success) {
        toast.error(result.error || "Failed to create order")
        return
      }

      // Refresh data
      await fetchCustomerData()

      // Reset form
      setOrderQuantity("1")
      setOrderReturnedOwn("0")
      setOrderReturnedOther("0")
      setOrderPaidAmount("0")
      setOrderCreditToApply("0")
      setOrderStockLocationId("")
      setOrderNotes("")
      setOrderDialogOpen(false)

      toast.success("Order created successfully")

    } catch (error) {
      console.error("Failed to create order:", error)
      toast.error("Failed to create order")
    } finally {
      setIsSubmittingOrder(false)
    }
  }, [customer, orderQuantity, orderReturnedOwn, orderReturnedOther, orderPaidAmount, orderCreditToApply, orderStockLocationId, orderNotes, fetchCustomerData])

  // -----------------------------------------------------------------------------
  // Edit Customer Handler
  // -----------------------------------------------------------------------------

  const handleEditCustomer = useCallback(async () => {
    if (!customer) return

    setIsUpdatingCustomer(true)

    try {
      const result = await updateCustomer(customer.id, {
        first_name: editFormData.first_name || customer.first_name,
        last_name: editFormData.last_name || customer.last_name,
        email: editFormData.email || customer.email,
        phone: editFormData.phone || customer.phone,
        metadata: {
          ...customer.metadata,
          ...editFormData.metadata,
        },
      })

      if (!result.success) {
        toast.error(result.error || "Failed to update customer")
        return
      }

      if (result.customer) {
        setCustomer(result.customer)
      }

      setEditDialogOpen(false)
      toast.success("Customer updated successfully")

    } catch (error) {
      console.error("Failed to update customer:", error)
      toast.error("Failed to update customer")
    } finally {
      setIsUpdatingCustomer(false)
    }
  }, [customer, editFormData])

  // -----------------------------------------------------------------------------
  // Delete Customer Handler
  // -----------------------------------------------------------------------------

  const handleDeleteCustomer = useCallback(async () => {
    if (!customer) return

    try {
      const result = await deleteCustomer(customer.id)

      if (!result.success) {
        toast.error(result.error || "Failed to delete customer")
        return
      }

      setDeleteDialogOpen(false)
      toast.success("Customer deleted successfully")
      router.push("/customers")

    } catch (error) {
      console.error("Failed to delete customer:", error)
      toast.error("Failed to delete customer")
    }
  }, [customer, router])

  // -----------------------------------------------------------------------------
  // Loading
  // -----------------------------------------------------------------------------

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading customer...</p>
        </div>
      </div>
    )
  }

  if (!customer) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center p-8 text-center">
            <XCircle className="mb-4 h-12 w-12 text-destructive" />
            <h2 className="text-xl font-semibold">Customer Not Found</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              The customer you're looking for doesn't exist or has been removed.
            </p>
            <Button className="mt-6" onClick={() => router.back()}>
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // -----------------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------------

  return (
    <main className="min-h-screen w-full overflow-x-hidden bg-background">
      <div className="mx-auto w-full max-w-[1600px] space-y-4 p-3 sm:p-5 lg:p-6">

        {/* ----------------------------------------------------------------- */}
        {/* Header */}
        {/* ----------------------------------------------------------------- */}

        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <Button variant="ghost" size="icon" className="shrink-0" onClick={() => router.back()}>
              <ArrowLeft className="h-5 w-5" />
            </Button>

            <Avatar className="h-12 w-12 shrink-0 sm:h-14 sm:w-14">
              <AvatarFallback className="text-sm sm:text-base">
                {getInitials(customer)}
              </AvatarFallback>
            </Avatar>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate text-xl font-bold sm:text-2xl">
                  {customer.first_name} {customer.last_name}
                </h1>
                <Badge variant={customer.metadata.customer_type === "commercial" ? "default" : "secondary"}>
                  {customer.metadata.customer_type}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {financialData.total_orders} orders
                </Badge>
              </div>

              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground sm:text-sm">
                <span>Customer since {format(new Date(customer.created_at), "MMM dd, yyyy")}</span>
                <span className="hidden sm:inline">•</span>
                <Badge variant={customer.has_account ? "default" : "secondary"} className="h-5 text-[10px]">
                  {customer.has_account ? "Active Account" : "Guest"}
                </Badge>
              </div>
            </div>
          </div>

          <div className="flex w-full gap-2 sm:w-auto">
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
              <RefreshCw className={cn("h-4 w-4 mr-2", isRefreshing && "animate-spin")} />
              Refresh
            </Button>

            <Button className="flex-1 sm:flex-none" onClick={() => setOrderDialogOpen(true)}>
              <Droplet className="mr-2 h-4 w-4" />
              New Water Order
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="shrink-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Customer Actions</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => setEditDialogOpen(true)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Customer
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Download className="mr-2 h-4 w-4" />
                  Export Data
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive" onClick={() => setDeleteDialogOpen(true)}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Customer
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* ----------------------------------------------------------------- */}
        {/* KPI Cards */}
        {/* ----------------------------------------------------------------- */}

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-medium sm:text-sm">Current Credit</CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold sm:text-2xl">{peso(financialData.current_balance)}</div>
              <Progress value={creditUtilization} className="mt-2 h-1.5" />
              <p className="mt-1 text-[11px] text-muted-foreground">
                Limit: {peso(financialData.credit_limit)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-medium sm:text-sm">Refill Credits</CardTitle>
              <RefreshCw className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold sm:text-2xl">{rewardsData.refill_credit_balance}</div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Earned: {rewardsData.total_earned} • Used: {rewardsData.total_used}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-medium sm:text-sm">Own Jugs With Customer</CardTitle>
              <Container className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold sm:text-2xl">{containerData.borrowed_own}</div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Net own-brand containers
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-medium sm:text-sm">Other Brand Returns</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold sm:text-2xl">{containerData.returned_other}</div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Total other-brand returns
              </p>
            </CardContent>
          </Card>
        </div>

        {/* ----------------------------------------------------------------- */}
        {/* Tabs */}
        {/* ----------------------------------------------------------------- */}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="w-full overflow-x-auto pb-1">
            <TabsList className="inline-flex h-auto min-w-max">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="transactions">Transactions</TabsTrigger>
              <TabsTrigger value="rewards">Rewards</TabsTrigger>
              <TabsTrigger value="addresses">Addresses</TabsTrigger>
            </TabsList>
          </div>

          {/* ============================================================ */}
          {/* OVERVIEW TAB */}
          {/* ============================================================ */}

          <TabsContent value="overview" className="mt-4 space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              {/* Customer Information */}
              <Card>
                <CardHeader>
                  <CardTitle>Customer Information</CardTitle>
                  <CardDescription>Contact details and account preferences</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="break-all text-sm">{customer.email}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Phone className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="text-sm">{customer.phone}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="text-sm">
                        Joined {format(new Date(customer.created_at), "MMMM dd, yyyy")}
                      </span>
                    </div>
                  </div>

                  <Separator />

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <p className="text-xs text-muted-foreground">Customer Type</p>
                      <Badge className="mt-1" variant="secondary">
                        {titleCase(customer.metadata.customer_type)}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Total Orders</p>
                      <p className="mt-1 text-lg font-semibold">{financialData.total_orders}</p>
                    </div>
                  </div>

                  {customer.metadata.notes && (
                    <>
                      <Separator />
                      <div>
                        <h4 className="mb-1 text-sm font-medium">Notes</h4>
                        <p className="text-sm text-muted-foreground">{customer.metadata.notes}</p>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Credit & Rewards Summary */}
              <Card>
                <CardHeader>
                  <CardTitle>Credit & Rewards Summary</CardTitle>
                  <CardDescription>Financial credit and refill-credit balances</CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div>
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <span className="text-sm font-medium">Current Credit</span>
                      <span className="text-lg font-bold">{peso(financialData.current_balance)}</span>
                    </div>
                    <Progress value={creditUtilization} />
                    <div className="mt-1 flex justify-between text-xs text-muted-foreground">
                      <span>Limit: {peso(financialData.credit_limit)}</span>
                      <span>{Math.round(creditUtilization)}% used</span>
                    </div>
                  </div>

                  <Separator />

                  <div className="rounded-lg border p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">Refill Credit Balance</p>
                        <p className="text-xs text-muted-foreground">Credits available for refills</p>
                      </div>
                      <p className="text-2xl font-bold">{rewardsData.refill_credit_balance}</p>
                    </div>
                    <div className="mt-2 flex justify-between text-xs text-muted-foreground">
                      <span>Earned: {rewardsData.total_earned}</span>
                      <span>Used: {rewardsData.total_used}</span>
                    </div>
                  </div>

                  <Button className="w-full" onClick={() => setOrderDialogOpen(true)}>
                    <Droplet className="mr-2 h-4 w-4" />
                    Create Water Order
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Container Summary */}
            <Card>
              <CardHeader>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <CardTitle>Container / Jug Summary</CardTitle>
                    <CardDescription>Current ownership and return activity</CardDescription>
                  </div>
                  <Badge variant="outline">
                    {jagTransactions.length} transactions
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <SummaryBox label="Own With Customer" value={String(containerData.borrowed_own)} description="Net borrowed" />
                  <SummaryBox label="Other Brand Returned" value={String(containerData.returned_other)} description="Lifetime returns" />
                  <SummaryBox label="Total Transactions" value={String(jagTransactions.length)} description="Ledger entries" />
                  <SummaryBox label="Total Units" value={String(totalJagTransactions)} description="All transactions combined" />
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Latest container and reward transactions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 max-h-[400px] overflow-y-auto">
                  {[...jagTransactions, ...rewardTransactions]
                    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                    .slice(0, 10)
                    .map((item) => {
                      const isJag = 'brand' in item
                      return (
                        <div key={item.id} className="flex items-start gap-3">
                          <div className="mt-1 rounded-full border p-2">
                            {isJag ? <Container className="h-4 w-4" /> : <RefreshCw className="h-4 w-4" />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium">
                              {isJag 
                                ? `${titleCase((item as JagTransaction).type)} ${(item as JagTransaction).quantity} ${(item as JagTransaction).brand}-brand jug${(item as JagTransaction).quantity !== 1 ? 's' : ''}`
                                : `${titleCase((item as RefillCreditTransaction).type)} ${(item as RefillCreditTransaction).amount} refill credits`
                              }
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(item.created_at), "MMM dd, yyyy • h:mm a")}
                              {isJag && (item as JagTransaction).order_id && (
                                <span className="ml-2 font-mono text-[10px]">
                                  Order: {(item as JagTransaction).order_id?.slice(0, 8)}
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                      )
                    })}
                  {jagTransactions.length === 0 && rewardTransactions.length === 0 && (
                    <p className="text-center text-sm text-muted-foreground py-4">No recent activity</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ============================================================ */}
          {/* TRANSACTIONS TAB */}
          {/* ============================================================ */}

          <TabsContent value="transactions" className="mt-4 space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <SummaryBox label="Own Borrowed" value={String(containerData.borrowed_own)} description="Current with customer" />
              <SummaryBox label="Other Returned" value={String(containerData.returned_other)} description="Lifetime total" />
              <SummaryBox label="Total Transactions" value={String(jagTransactions.length)} description="All container entries" />
            </div>

            <Card>
              <CardHeader>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <CardTitle>Container Ledger</CardTitle>
                    <CardDescription>Every borrow, return and sale</CardDescription>
                  </div>
                  <Button onClick={() => setOrderDialogOpen(true)}>
                    <Droplet className="mr-2 h-4 w-4" />
                    New Order
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0 sm:p-6">
                <div className="w-full overflow-x-auto">
                  <Table className="min-w-[850px]">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Transaction</TableHead>
                        <TableHead>Brand</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Order</TableHead>
                        <TableHead>Effect</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {jagTransactions.map((transaction) => {
                        const effect = transaction.type === "borrow" && transaction.brand === "own"
                          ? `+${transaction.quantity} customer-owned`
                          : transaction.type === "return" && transaction.brand === "own"
                            ? `-${transaction.quantity} customer-owned`
                            : transaction.type === "return" && transaction.brand === "other"
                              ? `+${transaction.quantity} other-brand return`
                              : "Sale recorded"
                        return (
                          <TableRow key={transaction.id}>
                            <TableCell>{format(new Date(transaction.created_at), "MMM dd, yyyy h:mm a")}</TableCell>
                            <TableCell>
                              <Badge variant={transaction.type === "return" ? "secondary" : transaction.type === "borrow" ? "default" : "outline"}>
                                {titleCase(transaction.type)}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant={transaction.brand === "own" ? "default" : "outline"}>
                                {transaction.brand === "own" ? "Own Brand" : "Other Brand"}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-medium">{transaction.quantity}</TableCell>
                            <TableCell>
                              {transaction.order_id ? (
                                <span className="font-mono text-xs">{transaction.order_id.slice(0, 8)}…</span>
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell><span className="text-sm">{effect}</span></TableCell>
                          </TableRow>
                        )
                      })}
                      {jagTransactions.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                            No container transactions found
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ============================================================ */}
          {/* REWARDS TAB */}
          {/* ============================================================ */}

          <TabsContent value="rewards" className="mt-4 space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <SummaryBox label="Available" value={String(rewardsData.refill_credit_balance)} description="Current refill credits" />
              <SummaryBox label="Earned" value={String(rewardsData.total_earned)} description="From transaction ledger" />
              <SummaryBox label="Used" value={String(rewardsData.total_used)} description="From transaction ledger" />
              <SummaryBox label="Transactions" value={String(rewardTransactions.length)} description="Ledger entries" />
            </div>

            <Card>
              <CardHeader>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <CardTitle>Reward / Refill Credit Transactions</CardTitle>
                    <CardDescription>Earn, use and expiration history</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0 sm:p-6">
                <div className="w-full overflow-x-auto">
                  <Table className="min-w-[900px]">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Source</TableHead>
                        <TableHead>Reference</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rewardTransactions.map((transaction) => (
                        <TableRow key={transaction.id}>
                          <TableCell>{format(new Date(transaction.created_at), "MMM dd, yyyy h:mm a")}</TableCell>
                          <TableCell>
                            <Badge variant={transaction.type === "earn" ? "default" : transaction.type === "use" ? "secondary" : "destructive"}>
                              {titleCase(transaction.type)}
                            </Badge>
                          </TableCell>
                          <TableCell><Badge variant="outline">{titleCase(transaction.source)}</Badge></TableCell>
                          <TableCell className="font-mono text-xs">{transaction.reference || "—"}</TableCell>
                          <TableCell className="max-w-[250px] truncate text-sm">{transaction.description || "—"}</TableCell>
                          <TableCell className={`text-right font-semibold ${transaction.type === "earn" ? "text-green-600" : "text-red-600"}`}>
                            {transaction.type === "earn" ? "+" : "-"}{transaction.amount}
                          </TableCell>
                        </TableRow>
                      ))}
                      {rewardTransactions.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                            No reward transactions found
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Reward Sources</CardTitle>
                <CardDescription>Supported sources in the reward system</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                  {["referral", "commission", "cashback", "manual", "rebate"].map((source) => (
                    <div key={source} className="rounded-lg border p-3">
                      <p className="text-sm font-medium">{titleCase(source)}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {rewardTransactions.filter(t => t.source === source).length} transactions
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ============================================================ */}
          {/* ADDRESSES TAB */}
          {/* ============================================================ */}

          <TabsContent value="addresses" className="mt-4 space-y-4">
            <Card>
              <CardHeader>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <CardTitle>Customer Addresses</CardTitle>
                    <CardDescription>Delivery and billing addresses</CardDescription>
                  </div>
                  <Button size="sm"><Plus className="mr-2 h-4 w-4" />Add Address</Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  {addresses.map((address) => (
                    <Card key={address.id}>
                      <CardContent className="relative p-5">
                        <div className="absolute right-3 top-3">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem><Edit className="mr-2 h-4 w-4" />Edit</DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive"><Trash2 className="mr-2 h-4 w-4" />Delete</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        <div className="flex gap-3 pr-8">
                          <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
                          <div className="space-y-1">
                            <p className="font-medium">{address.address_1}</p>
                            {address.address_2 && <p className="text-sm text-muted-foreground">{address.address_2}</p>}
                            <p className="text-sm text-muted-foreground">{address.city}, {address.province} {address.postal_code}</p>
                          </div>
                        </div>
                        {address.metadata.landmark && (
                          <div className="mt-4 flex gap-2 border-t pt-4 text-sm">
                            <AlertCircle className="h-4 w-4 shrink-0 text-muted-foreground" />
                            <span className="text-muted-foreground">{address.metadata.landmark}</span>
                          </div>
                        )}
                        {address.metadata.delivery_instructions && (
                          <div className="mt-2 flex gap-2 text-sm">
                            <Clock className="h-4 w-4 shrink-0 text-muted-foreground" />
                            <span className="text-muted-foreground">{address.metadata.delivery_instructions}</span>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                  {addresses.length === 0 && (
                    <div className="col-span-2 text-center text-muted-foreground py-8">
                      No addresses found
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* ================================================================== */}
      {/* CREATE ORDER DIALOG */}
      {/* ================================================================== */}

      <Dialog open={orderDialogOpen} onOpenChange={setOrderDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>New Water Order</DialogTitle>
            <DialogDescription>
              Create a water order with container transactions for {customer.first_name} {customer.last_name}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Quantity</Label>
                <Input
                  type="number"
                  min="1"
                  value={orderQuantity}
                  onChange={(e) => setOrderQuantity(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Stock Location</Label>
                <Input
                  placeholder="Stock location ID"
                  value={orderStockLocationId}
                  onChange={(e) => setOrderStockLocationId(e.target.value)}
                />
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label className="text-sm font-medium">Container Returns</Label>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Returned Own Brand</Label>
                  <Input
                    type="number"
                    min="0"
                    value={orderReturnedOwn}
                    onChange={(e) => setOrderReturnedOwn(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Returned Other Brand</Label>
                  <Input
                    type="number"
                    min="0"
                    value={orderReturnedOther}
                    onChange={(e) => setOrderReturnedOther(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label className="text-sm font-medium">Payment</Label>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Paid Amount</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={orderPaidAmount}
                    onChange={(e) => setOrderPaidAmount(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Credit to Apply</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={orderCreditToApply}
                    onChange={(e) => setOrderCreditToApply(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                placeholder="Optional notes about this order..."
                value={orderNotes}
                onChange={(e) => setOrderNotes(e.target.value)}
              />
            </div>

            <div className="rounded-lg bg-muted/50 p-4">
              <p className="text-sm font-medium">Order Summary</p>
              <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                <div className="flex justify-between">
                  <span>Water Jugs:</span>
                  <span className="font-medium text-foreground">{orderQuantity || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Returns (Own):</span>
                  <span className="font-medium text-foreground">{orderReturnedOwn || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Returns (Other):</span>
                  <span className="font-medium text-foreground">{orderReturnedOther || 0}</span>
                </div>
                <div className="flex justify-between border-t pt-1 mt-1">
                  <span>Net Jugs:</span>
                  <span className="font-medium text-foreground">
                    {Number(orderQuantity || 0) - Number(orderReturnedOwn || 0) - Number(orderReturnedOther || 0)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOrderDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateOrder} disabled={isSubmittingOrder}>
              {isSubmittingOrder ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating...</>
              ) : (
                <><Droplet className="mr-2 h-4 w-4" />Create Order</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ================================================================== */}
      {/* EDIT CUSTOMER DIALOG */}
      {/* ================================================================== */}

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Edit Customer Details</DialogTitle>
            <DialogDescription>Update customer information and preferences.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>First Name</Label>
                <Input defaultValue={customer.first_name} onChange={(e) => setEditFormData(prev => ({ ...prev, first_name: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Last Name</Label>
                <Input defaultValue={customer.last_name} onChange={(e) => setEditFormData(prev => ({ ...prev, last_name: e.target.value }))} />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input defaultValue={customer.email} type="email" onChange={(e) => setEditFormData(prev => ({ ...prev, email: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input defaultValue={customer.phone} type="tel" onChange={(e) => setEditFormData(prev => ({ ...prev, phone: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Customer Type</Label>
              <Select defaultValue={customer.metadata.customer_type} onValueChange={(value) => 
                setEditFormData(prev => ({ ...prev, metadata: { ...prev.metadata, customer_type: value as CustomerType } }))
              }>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="residential">Residential</SelectItem>
                  <SelectItem value="commercial">Commercial</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea defaultValue={customer.metadata.notes} onChange={(e) => 
                setEditFormData(prev => ({ ...prev, metadata: { ...prev.metadata, notes: e.target.value } }))
              } />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleEditCustomer} disabled={isUpdatingCustomer}>
              {isUpdatingCustomer ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ================================================================== */}
      {/* DELETE CUSTOMER DIALOG */}
      {/* ================================================================== */}

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Customer</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {customer.first_name} {customer.last_name}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteCustomer}>Delete Customer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </main>
  )
}

// -----------------------------------------------------------------------------
// Small UI components
// -----------------------------------------------------------------------------

function SummaryBox({ label, value, description }: { label: string; value: string; description: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="mt-1 text-xl font-bold">{value}</p>
        <p className="mt-1 text-[11px] text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  )
}