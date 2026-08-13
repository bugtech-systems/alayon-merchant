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

import { Separator } from "@/components/ui/separator"
import {
  ArrowLeft,
  Container,
  CreditCard,
  Edit,
  MoreVertical,
  Package,
  Phone,
  RefreshCw,
  Trash2,
  Wallet,
  XCircle,
  Loader2,
  Droplet,
  RotateCcw,
  Store,
  Home,
  CheckCircle,
  BarChart3,
  Calendar,
  Mail,
  DollarSign,
  Boxes,
  ClipboardList,
  ChevronDown,
  ChevronUp,
  Truck,
  Banknote,
  ArrowRightLeft,
} from "lucide-react"

// Import existing customer actions
import { retrieveCustomer, updateCustomer, deleteCustomer } from "@/lib/actions/drivers"
import {
  getJagwarCustomerDashboard,
  createJagwarOrder,
  listCustomerOrders,
  fulfillOrder,
  addPaymentToOrder,
  returnContainers,
  borrowJagsToCustomer,
  type JagwarCustomerDashboard,
  type JagTransaction,
  type RefillCreditTransaction,
  type CreateJagwarOrderInput,
  type JagwarOrder,
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

interface WaterRecord {
  customerId: string
  quantity: number
  returnedOwn: number
  returnedOther: number
  paidAmount: number
  creditToApply: number
  stockLocationId: string
  notes: string
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

const getOrderStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    completed: "bg-green-100 text-green-800 border-green-200",
    pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
    cancelled: "bg-red-100 text-red-800 border-red-200",
    processing: "bg-blue-100 text-blue-800 border-blue-200",
  }
  return colors[status] || "bg-gray-100 text-gray-800 border-gray-200"
}

const getFulfillmentStatusBadge = (status: string) => {
  const config: Record<string, { color: string; label: string }> = {
    not_fulfilled: { color: "bg-slate-100 text-slate-700", label: "Pending" },
    partially_fulfilled: { color: "bg-blue-100 text-blue-700", label: "Partially Fulfilled" },
    fulfilled: { color: "bg-green-100 text-green-700", label: "Fulfilled" },
  }
  const c = config[status] || config.not_fulfilled
  return <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", c.color)}>{c.label}</span>
}

const getPaymentStatusBadge = (status: string) => {
  const config: Record<string, { color: string; label: string }> = {
    pending: { color: "bg-yellow-100 text-yellow-700", label: "Pending" },
    paid: { color: "bg-green-100 text-green-700", label: "Paid" },
    partial: { color: "bg-blue-100 text-blue-700", label: "Partial" },
    refunded: { color: "bg-purple-100 text-purple-700", label: "Refunded" },
  }
  const c = config[status] || config.pending
  return <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", c.color)}>{c.label}</span>
}

// -----------------------------------------------------------------------------
// Page
// -----------------------------------------------------------------------------

export default function CustomerDetailPage({ user }: any) {
  const params = useParams()
  const router = useRouter()
  const customerId = String(params.id)

  // --- Customer & Dashboard State ---
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [dashboardData, setDashboardData] = useState<JagwarCustomerDashboard | null>(null)
  const [isLoadingCustomer, setIsLoadingCustomer] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [activeTab, setActiveTab] = useState("orders")

  // --- Orders State ---
  const [orders, setOrders] = useState<JagwarOrder[]>([])
  const [isLoadingOrders, setIsLoadingOrders] = useState(false)
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null)

  // --- Order Creation Dialog ---
  const [orderDialogOpen, setOrderDialogOpen] = useState(false)
  const [waterRecord, setWaterRecord] = useState<WaterRecord>({
    customerId: "",
    quantity: 0,
    returnedOwn: 0,
    returnedOther: 0,
    paidAmount: 0,
    creditToApply: 0,
    stockLocationId: "",
    notes: "",
  })
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false)

  // --- Action Dialogs State ---
  // Fulfillment
  const [fulfillDialogOpen, setFulfillDialogOpen] = useState(false)
  const [fulfillForm, setFulfillForm] = useState<{
    orderId: string;
    items: { id: string; quantity: number }[];
    notes: string;
  }>({ orderId: "", items: [], notes: "" })
  const [isFulfilling, setIsFulfilling] = useState(false)

  // Payment
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false)
  const [paymentForm, setPaymentForm] = useState<{
    orderId: string;
    amount: number;
    method: string;
    notes: string;
  }>({ orderId: "", amount: 0, method: "cash", notes: "" })
  const [isProcessingPayment, setIsProcessingPayment] = useState(false)

  // Returns
  const [returnDialogOpen, setReturnDialogOpen] = useState(false)
  const [returnForm, setReturnForm] = useState<{
    orderId: string;
    items: { id: string; quantity: number; reason: string }[];
    notes: string;
  }>({ orderId: "", items: [], notes: "" })
  const [isProcessingReturn, setIsProcessingReturn] = useState(false)

  // Borrow Jugs
  const [borrowDialogOpen, setBorrowDialogOpen] = useState(false)
  const [borrowForm, setBorrowForm] = useState<{
    orderId: string;
    quantity: number;
    brand: "own" | "other";
    notes: string;
  }>({ orderId: "", quantity: 0, brand: "own", notes: "" })
  const [isBorrowing, setIsBorrowing] = useState(false)

  // Edit/Delete Customer
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editFormData, setEditFormData] = useState<Partial<Customer>>({})
  const [isUpdatingCustomer, setIsUpdatingCustomer] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  // -----------------------------------------------------------------------------
  // Data Fetching
  // -----------------------------------------------------------------------------

  const fetchCustomerData = useCallback(async () => {
    if (!customerId) return
    setIsLoadingCustomer(true)
    try {
      const customerResult = await retrieveCustomer(customerId)
      if (customerResult.success && customerResult.customer) {
        setCustomer(customerResult.customer)
        setWaterRecord(prev => ({ ...prev, customerId: customerResult.customer.id }))
      }
      const dashboardResult = await getJagwarCustomerDashboard(customerId)
      if (dashboardResult.success && dashboardResult.data) {
        setDashboardData(dashboardResult.data)
      }
    } catch (error) {
      toast.error("Failed to load customer data")
    } finally {
      setIsLoadingCustomer(false)
    }
  }, [customerId])

  const fetchOrders = useCallback(async () => {
    if (!customerId) return
    setIsLoadingOrders(true)
    try {
      const result = await listCustomerOrders(customerId)
      if (result.success) {
        setOrders(result.orders || [])
      }
    } catch (error) {
      toast.error("Failed to load orders")
    } finally {
      setIsLoadingOrders(false)
    }
  }, [customerId])

  useEffect(() => {
    fetchCustomerData()
    fetchOrders()
  }, [fetchCustomerData, fetchOrders])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await Promise.all([fetchCustomerData(), fetchOrders()])
    setIsRefreshing(false)
    toast.success("Refreshed")
  }

  // -----------------------------------------------------------------------------
  // Derived Values
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

  // -----------------------------------------------------------------------------
  // Order Creation
  // -----------------------------------------------------------------------------

  const handleCreateOrder = useCallback(async () => {
    if (!customer || !user.stockLocationId) return
    setIsSubmittingOrder(true)
    try {
      const input: CreateJagwarOrderInput = {
        customerId: customer.id,
        quantity: waterRecord.quantity || 0,
        returnedOwn: waterRecord.returnedOwn,
        returnedOther: waterRecord.returnedOther,
        paidAmount: waterRecord.paidAmount,
        creditToApply: waterRecord.creditToApply,
        stockLocationId: user.stockLocationId,
        notes: waterRecord.notes || undefined,
      }
      const result = await createJagwarOrder(input)
      if (!result.success) {
        toast.error(result.error || "Failed to create order")
        return
      }
      toast.success("Order created")
      setOrderDialogOpen(false)
      await fetchOrders()
      setWaterRecord({
        customerId: customer.id,
        quantity: 0,
        returnedOwn: 0,
        returnedOther: 0,
        paidAmount: 0,
        creditToApply: 0,
        stockLocationId: "",
        notes: "",
      })
    } catch {
      toast.error("Failed to create order")
    } finally {
      setIsSubmittingOrder(false)
    }
  }, [customer, waterRecord, fetchOrders, user.stockLocationId])

  // -----------------------------------------------------------------------------
  // Order Actions
  // -----------------------------------------------------------------------------

  // --- Fulfill ---
  const openFulfillDialog = (order: JagwarOrder) => {
    const items = order.items
      .filter(item => item.fulfilled_quantity < item.quantity)
      .map(item => ({
        id: item.id,
        quantity: item.quantity - item.fulfilled_quantity,
      }))
    setFulfillForm({ orderId: order.id, items, notes: "" })
    setFulfillDialogOpen(true)
  }

  const handleFulfillOrder = async () => {
    setIsFulfilling(true)
    try {
      const result = await fulfillOrder({
        orderId: fulfillForm.orderId,
        items: fulfillForm.items.filter(i => i.quantity > 0),
        notes: fulfillForm.notes,
      })
      if (result.success) {
        toast.success("Order fulfilled")
        setFulfillDialogOpen(false)
        await fetchOrders()
      } else {
        toast.error(result.error || "Fulfillment failed")
      }
    } catch {
      toast.error("Fulfillment error")
    } finally {
      setIsFulfilling(false)
    }
  }

  // --- Payment ---
  const openPaymentDialog = (order: JagwarOrder) => {
    const outstanding = Math.max(0, order.total_amount - order.paid_amount)
    setPaymentForm({ orderId: order.id, amount: outstanding, method: "cash", notes: "" })
    setPaymentDialogOpen(true)
  }

  const handleAddPayment = async () => {
    setIsProcessingPayment(true)
    try {
      const result = await addPaymentToOrder({
        orderId: paymentForm.orderId,
        amount: paymentForm.amount,
        method: paymentForm.method,
        notes: paymentForm.notes,
      })
      if (result.success) {
        toast.success("Payment added")
        setPaymentDialogOpen(false)
        await fetchOrders()
      } else {
        toast.error(result.error || "Payment failed")
      }
    } catch {
      toast.error("Payment error")
    } finally {
      setIsProcessingPayment(false)
    }
  }

  // --- Return Containers ---
  const openReturnDialog = (order: JagwarOrder) => {
    const items = order.items
      .filter(item => item.fulfilled_quantity > item.returned_quantity)
      .map(item => ({
        id: item.id,
        quantity: item.fulfilled_quantity - item.returned_quantity,
        reason: "",
      }))
    setReturnForm({ orderId: order.id, items, notes: "" })
    setReturnDialogOpen(true)
  }

  const handleProcessReturns = async () => {
    setIsProcessingReturn(true)
    try {
      const result = await returnContainers({
        orderId: returnForm.orderId,
        items: returnForm.items.filter(i => i.quantity > 0),
        notes: returnForm.notes,
      })
      if (result.success) {
        toast.success("Returns processed")
        setReturnDialogOpen(false)
        await fetchOrders()
      } else {
        toast.error(result.error || "Return failed")
      }
    } catch {
      toast.error("Return error")
    } finally {
      setIsProcessingReturn(false)
    }
  }

  // --- Borrow Jugs ---
  const openBorrowDialog = (order: JagwarOrder) => {
    setBorrowForm({ orderId: order.id, quantity: 0, brand: "own", notes: "" })
    setBorrowDialogOpen(true)
  }

  const handleBorrowJugs = async () => {
    setIsBorrowing(true)
    try {
      const result = await borrowJagsToCustomer({
        customerId,
        orderId: borrowForm.orderId,
        quantity: borrowForm.quantity,
        brand: borrowForm.brand,
        notes: borrowForm.notes,
      })
      if (result.success) {
        toast.success("Jugs borrowed recorded")
        setBorrowDialogOpen(false)
        await fetchOrders()
      } else {
        toast.error(result.error || "Borrow recording failed")
      }
    } catch {
      toast.error("Borrow error")
    } finally {
      setIsBorrowing(false)
    }
  }

  // --- Edit / Delete Customer ---
  const handleEditCustomer = useCallback(async () => {
    if (!customer) return
    setIsUpdatingCustomer(true)
    try {
      const result = await updateCustomer(customer.id, {
        first_name: editFormData.first_name || customer.first_name,
        last_name: editFormData.last_name || customer.last_name,
        email: editFormData.email || customer.email,
        phone: editFormData.phone || customer.phone,
        metadata: { ...customer.metadata, ...editFormData.metadata },
      })
      if (!result.success) {
        toast.error(result.error || "Update failed")
        return
      }
      if (result.customer) setCustomer(result.customer)
      setEditDialogOpen(false)
      toast.success("Customer updated")
    } catch {
      toast.error("Update failed")
    } finally {
      setIsUpdatingCustomer(false)
    }
  }, [customer, editFormData])

  const handleDeleteCustomer = useCallback(async () => {
    if (!customer) return
    try {
      const result = await deleteCustomer(customer.id)
      if (!result.success) {
        toast.error(result.error || "Delete failed")
        return
      }
      setDeleteDialogOpen(false)
      toast.success("Deleted")
      router.push("/customers")
    } catch {
      toast.error("Delete failed")
    }
  }, [customer, router])

  // -----------------------------------------------------------------------------
  // Loading / Not Found
  // -----------------------------------------------------------------------------

  if (isLoadingCustomer) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-6">
        <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground ml-3">Loading customer...</p>
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
            <Button className="mt-6" onClick={() => router.back()}>Go Back</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // -----------------------------------------------------------------------------
  // Main Render
  // -----------------------------------------------------------------------------

  return (
    <main className="min-h-screen w-full overflow-x-hidden bg-background">
      <div className="mx-auto w-full max-w-[1600px] space-y-4 p-3 sm:p-5 lg:p-6">

        {/* Header */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <Avatar className="h-12 w-12 shrink-0 sm:h-14 sm:w-14">
              <AvatarFallback>{getInitials(customer)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold sm:text-2xl truncate">
                  {customer.first_name} {customer.last_name}
                </h1>
                <Badge variant={customer.metadata.customer_type === "commercial" ? "default" : "secondary"}>
                  {customer.metadata.customer_type === "commercial" ? (
                    <Store className="mr-1 h-3 w-3" />
                  ) : (
                    <Home className="mr-1 h-3 w-3" />
                  )}
                  {customer.metadata.customer_type}
                </Badge>
                <Badge variant="outline">{financialData.total_orders} orders</Badge>
              </div>
              <div className="mt-1 flex items-center gap-x-2 text-xs text-muted-foreground">
                <span>Customer since {format(new Date(customer.created_at), "MMM dd, yyyy")}</span>
                <Badge variant={customer.has_account ? "default" : "secondary"} className="h-5 text-[10px]">
                  {customer.has_account ? "Active Account" : "Guest"}
                </Badge>
              </div>
            </div>
          </div>

          <div className="flex w-full gap-2 sm:w-auto">
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
              <RefreshCw className={cn("h-4 w-4 mr-2", isRefreshing && "animate-spin")} /> Refresh
            </Button>
            <Button className="flex-1 sm:flex-none" onClick={() => setOrderDialogOpen(true)}>
              <Droplet className="mr-2 h-4 w-4" /> New Water Order
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon"><MoreVertical className="h-4 w-4" /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setEditDialogOpen(true)}>
                  <Edit className="mr-2 h-4 w-4" /> Edit
                </DropdownMenuItem>
                <DropdownMenuItem className="text-destructive" onClick={() => setDeleteDialogOpen(true)}>
                  <Trash2 className="mr-2 h-4 w-4" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-medium">Current Credit</CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold">{peso(financialData.current_balance)}</div>
              <Progress value={creditUtilization} className="mt-2 h-1.5" />
              <p className="mt-1 text-[11px] text-muted-foreground">Limit: {peso(financialData.credit_limit)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-medium">Refill Credits</CardTitle>
              <RotateCcw className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold">{rewardsData.refill_credit_balance}</div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Earned: {rewardsData.total_earned} · Used: {rewardsData.total_used}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-medium">Own Jugs With Customer</CardTitle>
              <Container className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold">{containerData.borrowed_own}</div>
              <p className="mt-1 text-[11px] text-muted-foreground">Net own-brand containers</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-medium">Other Brand Returns</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold">{containerData.returned_other}</div>
              <p className="mt-1 text-[11px] text-muted-foreground">Total other-brand returns</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs: Orders (primary) + Overview & Rewards */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="w-full overflow-x-auto pb-1">
            <TabsList className="inline-flex h-auto min-w-max">
              <TabsTrigger value="orders"><ClipboardList className="mr-2 h-4 w-4" /> Orders</TabsTrigger>
              <TabsTrigger value="overview"><BarChart3 className="mr-2 h-4 w-4" /> Overview</TabsTrigger>
              <TabsTrigger value="rewards"><RotateCcw className="mr-2 h-4 w-4" /> Rewards</TabsTrigger>
            </TabsList>
          </div>

          {/* ORDERS TAB */}
          <TabsContent value="orders" className="mt-4 space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Order History</CardTitle>
                  <CardDescription>{orders.length} order{orders.length !== 1 && 's'}</CardDescription>
                </div>
                <Button onClick={() => setOrderDialogOpen(true)} size="sm">
                  <Droplet className="mr-2 h-4 w-4" /> New Order
                </Button>
              </CardHeader>
              <CardContent className="p-0 sm:p-6 pt-0">
                {isLoadingOrders ? (
                  <div className="py-8 text-center">
                    <Loader2 className="animate-spin h-6 w-6 mx-auto text-muted-foreground" />
                  </div>
                ) : orders.length === 0 ? (
                  <div className="py-12 text-center text-muted-foreground">No orders yet</div>
                ) : (
                  <div className="space-y-2">
                    {orders.map((order) => {
                      const isExpanded = expandedOrderId === order.id
                      const outstanding = Math.max(0, order.total_amount - order.paid_amount)
                      const canFulfill = order.items.some(i => i.fulfilled_quantity < i.quantity)
                      const canPay = outstanding > 0
                      const canReturn = order.items.some(i => i.fulfilled_quantity > i.returned_quantity)
                      return (
                        <div
                          key={order.id}
                          className={cn(
                            "rounded-lg border transition-all",
                            isExpanded && "ring-1 ring-primary/20"
                          )}
                        >
                          <button
                            onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
                            className="flex w-full items-center justify-between p-3 sm:p-4 text-left hover:bg-muted/30 rounded-lg"
                          >
                            <div className="flex flex-wrap items-center gap-2 sm:gap-3 min-w-0">
                              <span className="font-mono text-sm font-semibold">
                                #{order.display_id || order.id.slice(0, 8)}
                              </span>
                              <Badge
                                variant="outline"
                                className={cn("text-xs", getOrderStatusColor(order.status))}
                              >
                                {titleCase(order.status)}
                              </Badge>
                              <span className="text-sm font-medium">{peso(order.total_amount)}</span>
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(order.created_at), "MMM dd")}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              {getFulfillmentStatusBadge(order.fulfillment_status)}
                              {getPaymentStatusBadge(order.payment_status)}
                              {isExpanded ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </div>
                          </button>

                          {isExpanded && (
                            <div className="border-t px-4 py-4 space-y-4 animate-in fade-in">
                              {/* Items */}
                              <div>
                                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                                  Items
                                </h4>
                                <div className="space-y-2">
                                  {order.items.map(item => (
                                    <div
                                      key={item.id}
                                      className="flex justify-between rounded-md bg-muted/40 px-3 py-2 text-sm"
                                    >
                                      <span>
                                        {item.product_name} × {item.quantity}
                                      </span>
                                      <span className="text-muted-foreground">
                                        Fulfilled: {item.fulfilled_quantity} · Returned: {item.returned_quantity}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* Payment Summary */}
                              <div className="rounded-md bg-muted/30 p-3 space-y-1 text-sm">
                                <div className="flex justify-between">
                                  <span>Total</span>
                                  <span className="font-medium">{peso(order.total_amount)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Paid</span>
                                  <span className="text-green-600 font-medium">{peso(order.paid_amount)}</span>
                                </div>
                                {outstanding > 0 && (
                                  <div className="flex justify-between border-t pt-1 mt-1">
                                    <span className="font-medium">Outstanding</span>
                                    <span className="font-semibold text-amber-600">{peso(outstanding)}</span>
                                  </div>
                                )}
                              </div>

                              {/* Action Buttons */}
                              <div className="flex flex-wrap gap-2">
                                {canFulfill && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => openFulfillDialog(order)}
                                  >
                                    <Truck className="mr-2 h-4 w-4" /> Fulfill
                                  </Button>
                                )}
                                {canPay && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => openPaymentDialog(order)}
                                  >
                                    <CreditCard className="mr-2 h-4 w-4" /> Add Payment
                                  </Button>
                                )}
                                {canReturn && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => openReturnDialog(order)}
                                  >
                                    <ArrowRightLeft className="mr-2 h-4 w-4" /> Handle Returns
                                  </Button>
                                )}
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => openBorrowDialog(order)}
                                >
                                  <Container className="mr-2 h-4 w-4" /> Borrow Jugs
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* OVERVIEW TAB */}
          <TabsContent value="overview" className="mt-4 space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Customer Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4" />
                    <span>{customer.email}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4" />
                    <span>{customer.phone}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Calendar className="h-4 w-4" />
                    <span>Joined {format(new Date(customer.created_at), "MMMM dd, yyyy")}</span>
                  </div>
                  {customer.metadata.notes && (
                    <>
                      <Separator />
                      <div>
                        <h4 className="text-sm font-medium">Notes</h4>
                        <p className="text-sm text-muted-foreground">{customer.metadata.notes}</p>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Credit & Rewards</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex justify-between">
                      <span>Current Credit</span>
                      <span className="font-bold">{peso(financialData.current_balance)}</span>
                    </div>
                    <Progress value={creditUtilization} className="mt-2" />
                    <p className="text-xs text-muted-foreground mt-1">
                      Limit: {peso(financialData.credit_limit)}
                    </p>
                  </div>
                  <Separator />
                  <div className="rounded-lg border p-4">
                    <div className="flex justify-between">
                      <span>Refill Credits</span>
                      <span className="text-xl font-bold">{rewardsData.refill_credit_balance}</span>
                    </div>
                    <div className="text-xs text-muted-foreground flex justify-between mt-1">
                      <span>Earned: {rewardsData.total_earned}</span>
                      <span>Used: {rewardsData.total_used}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* REWARDS TAB */}
          <TabsContent value="rewards" className="mt-4 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Reward Transactions</CardTitle>
              </CardHeader>
              <CardContent>
                {dashboardData?.recent_activity?.reward_transactions?.length ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dashboardData.recent_activity.reward_transactions.map(tx => (
                        <TableRow key={tx.id}>
                          <TableCell>{format(new Date(tx.created_at), "MMM dd, yyyy")}</TableCell>
                          <TableCell>{titleCase(tx.type)}</TableCell>
                          <TableCell className={tx.type === "earn" ? "text-green-600" : "text-red-600"}>
                            {tx.type === "earn" ? "+" : "-"}{tx.amount}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-center text-muted-foreground py-8">No reward transactions</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* ---------- DIALOGS ---------- */}
      {/* Create Order Dialog (fully restored) */}
      <Dialog open={orderDialogOpen} onOpenChange={setOrderDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Droplet className="h-5 w-5" />
              New Water Order
            </DialogTitle>
            <DialogDescription>
              Create a water order with container transactions for {customer.first_name} {customer.last_name}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5 py-2">
            <div className="space-y-3">
              <Label className="text-sm font-semibold">Order Details</Label>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Quantity</Label>
                  <Input
                    type="number"
                    value={waterRecord.quantity}
                    onChange={(e) =>
                      setWaterRecord(prev => ({ ...prev, quantity: parseInt(e.target.value) || 0 }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Stock Location ID</Label>
                  <Input value={user.stockLocationId} disabled />
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <Label className="text-sm font-semibold">Container Returns</Label>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1">
                    <Container className="h-3 w-3" />
                    Returned Own Brand
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    value={waterRecord.returnedOwn}
                    onChange={(e) =>
                      setWaterRecord(prev => ({ ...prev, returnedOwn: parseInt(e.target.value) || 0 }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1">
                    <Package className="h-3 w-3" />
                    Returned Other Brand
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    value={waterRecord.returnedOther}
                    onChange={(e) =>
                      setWaterRecord(prev => ({ ...prev, returnedOther: parseInt(e.target.value) || 0 }))
                    }
                  />
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <Label className="text-sm font-semibold">Payment</Label>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1">
                    <DollarSign className="h-3 w-3" />
                    Paid Amount
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={waterRecord.paidAmount}
                    onChange={(e) =>
                      setWaterRecord(prev => ({ ...prev, paidAmount: parseFloat(e.target.value) || 0 }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1">
                    <RotateCcw className="h-3 w-3" />
                    Credit to Apply
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={waterRecord.creditToApply}
                    onChange={(e) =>
                      setWaterRecord(prev => ({ ...prev, creditToApply: parseFloat(e.target.value) || 0 }))
                    }
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold">Notes</Label>
              <Textarea
                placeholder="Optional notes about this order..."
                value={waterRecord.notes}
                onChange={(e) => setWaterRecord(prev => ({ ...prev, notes: e.target.value }))}
                className="resize-none"
              />
            </div>

            <div className="rounded-lg bg-muted/50 p-4 space-y-1">
              <p className="text-sm font-semibold">Order Summary</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-muted-foreground">
                <div className="flex justify-between">
                  <span>Water Jugs:</span>
                  <span className="font-medium text-foreground">{waterRecord.quantity}</span>
                </div>
                <div className="flex justify-between">
                  <span>Returns (Own):</span>
                  <span className="font-medium text-foreground">{waterRecord.returnedOwn}</span>
                </div>
                <div className="flex justify-between">
                  <span>Returns (Other):</span>
                  <span className="font-medium text-foreground">{waterRecord.returnedOther}</span>
                </div>
                <div className="flex justify-between border-t pt-1 mt-1">
                  <span className="font-medium text-foreground">Net Jugs:</span>
                  <span
                    className={`font-semibold ${waterRecord.quantity - waterRecord.returnedOwn - waterRecord.returnedOther >= 0 ? "text-green-600" : "text-red-600"}`}
                  >
                    {waterRecord.quantity - waterRecord.returnedOwn - waterRecord.returnedOther}
                  </span>
                </div>
                {waterRecord.paidAmount > 0 && (
                  <div className="flex justify-between col-span-2">
                    <span>Payment:</span>
                    <span className="font-medium text-foreground">{peso(waterRecord.paidAmount)}</span>
                  </div>
                )}
                {waterRecord.creditToApply > 0 && (
                  <div className="flex justify-between col-span-2">
                    <span>Credits Applied:</span>
                    <span className="font-medium text-foreground">{waterRecord.creditToApply}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOrderDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateOrder} disabled={isSubmittingOrder}>
              {isSubmittingOrder ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating...
                </>
              ) : (
                <>
                  <Droplet className="mr-2 h-4 w-4" /> Create Order
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Fulfill Order Dialog */}
      <Dialog open={fulfillDialogOpen} onOpenChange={setFulfillDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Fulfill Order</DialogTitle>
            <DialogDescription>Specify the quantities to mark as fulfilled.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {fulfillForm.items.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-4">
                All items have already been fulfilled.
              </p>
            ) : (
              fulfillForm.items.map((item, idx) => (
                <div key={item.id} className="flex items-center gap-3">
                  <Label className="w-24 text-xs">Item Qty:</Label>
                  <Input
                    type="number"
                    min={0}
                    max={item.quantity}
                    value={item.quantity}
                    onChange={e => {
                      const newItems = [...fulfillForm.items]
                      newItems[idx].quantity = Math.min(
                        Math.max(0, parseInt(e.target.value) || 0),
                        item.quantity
                      )
                      setFulfillForm(prev => ({ ...prev, items: newItems }))
                    }}
                  />
                </div>
              ))
            )}
            <Textarea
              placeholder="Notes"
              value={fulfillForm.notes}
              onChange={e => setFulfillForm(p => ({ ...p, notes: e.target.value }))}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFulfillDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleFulfillOrder} disabled={isFulfilling || fulfillForm.items.length === 0}>
              {isFulfilling ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Confirm Fulfillment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Payment</DialogTitle>
            <DialogDescription>Record a payment for this order.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Amount</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={paymentForm.amount}
                onChange={e => setPaymentForm(p => ({ ...p, amount: parseFloat(e.target.value) || 0 }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Method</Label>
              <Select
                value={paymentForm.method}
                onValueChange={v => setPaymentForm(p => ({ ...p, method: v }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="transfer">Bank Transfer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Textarea
              placeholder="Notes"
              value={paymentForm.notes}
              onChange={e => setPaymentForm(p => ({ ...p, notes: e.target.value }))}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddPayment} disabled={isProcessingPayment || paymentForm.amount <= 0}>
              {isProcessingPayment ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Add Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Return Containers Dialog */}
      <Dialog open={returnDialogOpen} onOpenChange={setReturnDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Handle Returns</DialogTitle>
            <DialogDescription>Record returned containers for this order.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {returnForm.items.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-4">
                No items available for return.
              </p>
            ) : (
              returnForm.items.map((item, idx) => (
                <div key={item.id} className="flex flex-col gap-2">
                  <div className="flex items-center gap-3">
                    <Label className="w-24 text-xs">Qty:</Label>
                    <Input
                      type="number"
                      min={0}
                      max={item.quantity}
                      value={item.quantity}
                      onChange={e => {
                        const newItems = [...returnForm.items]
                        newItems[idx].quantity = Math.min(
                          Math.max(0, parseInt(e.target.value) || 0),
                          item.quantity
                        )
                        setReturnForm(prev => ({ ...prev, items: newItems }))
                      }}
                    />
                  </div>
                  <Select
                    value={item.reason}
                    onValueChange={v => {
                      const newItems = [...returnForm.items]
                      newItems[idx].reason = v
                      setReturnForm(prev => ({ ...prev, items: newItems }))
                    }}
                  >
                    <SelectTrigger><SelectValue placeholder="Reason" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="container_return">Container Return</SelectItem>
                      <SelectItem value="damaged">Damaged</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ))
            )}
            <Textarea
              placeholder="Notes"
              value={returnForm.notes}
              onChange={e => setReturnForm(p => ({ ...p, notes: e.target.value }))}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReturnDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleProcessReturns} disabled={isProcessingReturn || returnForm.items.length === 0}>
              {isProcessingReturn ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Process Returns
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Borrow Jugs Dialog */}
      <Dialog open={borrowDialogOpen} onOpenChange={setBorrowDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Borrow Jugs to Customer</DialogTitle>
            <DialogDescription>
              Record containers given to the customer (not yet returned).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Quantity</Label>
              <Input
                type="number"
                min={0}
                value={borrowForm.quantity}
                onChange={e => setBorrowForm(p => ({ ...p, quantity: parseInt(e.target.value) || 0 }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Brand</Label>
              <Select
                value={borrowForm.brand}
                onValueChange={(v: "own" | "other") => setBorrowForm(p => ({ ...p, brand: v }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="own">Own Brand</SelectItem>
                  <SelectItem value="other">Other Brand</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Textarea
              placeholder="Notes"
              value={borrowForm.notes}
              onChange={e => setBorrowForm(p => ({ ...p, notes: e.target.value }))}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBorrowDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleBorrowJugs} disabled={isBorrowing || borrowForm.quantity <= 0}>
              {isBorrowing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Record Borrow
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Customer Dialog */}
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
                <Input
                  defaultValue={customer.first_name}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, first_name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Last Name</Label>
                <Input
                  defaultValue={customer.last_name}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, last_name: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  defaultValue={customer.email}
                  type="email"
                  onChange={(e) => setEditFormData(prev => ({ ...prev, email: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input
                  defaultValue={customer.phone}
                  type="tel"
                  onChange={(e) => setEditFormData(prev => ({ ...prev, phone: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Customer Type</Label>
              <Select
                defaultValue={customer.metadata.customer_type}
                onValueChange={(value) =>
                  setEditFormData(prev => ({
                    ...prev,
                    metadata: { ...prev.metadata, customer_type: value as CustomerType },
                  }))
                }
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="residential">Residential</SelectItem>
                  <SelectItem value="commercial">Commercial</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                defaultValue={customer.metadata.notes}
                onChange={(e) =>
                  setEditFormData(prev => ({
                    ...prev,
                    metadata: { ...prev.metadata, notes: e.target.value },
                  }))
                }
              />
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

      {/* Delete Customer Dialog */}
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