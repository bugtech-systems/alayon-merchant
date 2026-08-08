// app/customers/[id]/page.tsx
"use client"

import { useEffect, useMemo, useState, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
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
import { Separator } from "@/components/ui/separator"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  ArrowLeft,
  Package,
  CreditCard,
  ShoppingCart,
  MapPin,
  Phone,
  Mail,
  Calendar,
  MoreVertical,
  Plus,
  Minus,
  History,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Container,
  Wallet,
  Download,
  Filter,
  Edit,
  Trash2,
  RefreshCw,
  Droplet,
  RotateCcw,
  Truck,
  CheckCircle2,
  Receipt,
  QrCode,
  Smartphone,
  Banknote,
  Loader2,
} from "lucide-react"
import { format } from "date-fns"
import { toast } from "sonner"

// Import actions
import {
  retrieveCustomer,
  listCustomerOrders,
  listCustomerAddresses,
  listCustomerPaymentCollections,
  updateCustomer,
  deleteCustomer,
  createPaymentCollection,
  capturePayment,
  addRefillCredits,
  updateContainerBalance,
} from "@/lib/actions/drivers"

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

type ContainerBrand = "own_brand" | "other_brand"
type PaymentMethod = "cash" | "gcash" | "maya" | "credit" | "refill"

interface ContainerBreakdown {
  borrowed: number
  returned: number
}

interface Customer {
  id: string
  first_name: string
  last_name: string
  email: string
  phone: string
  created_at: string
  has_account: boolean
  metadata: {
    credit_balance: number
    refill_credits: number
    borrowed_jugs: number
    total_jags_borrowed: number
    total_jags_returned: number
    own_brand: ContainerBreakdown
    other_brand: ContainerBreakdown
    lifetime_purchases: number
    preferred_payment: string
    notes: string
    customer_type: "residential" | "commercial"
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

interface Order {
  id: string
  display_id: string
  created_at: string
  status: string
  total: number
  items: OrderItem[]
  metadata: {
    jags_returned: number
    jags_borrowed: number
    delivery_type: "delivery" | "pickup"
    returned_own_brand: number
    returned_other_brand: number
    borrowed_own_brand: number
    borrowed_other_brand: number
  }
}

interface OrderItem {
  id: string
  title: string
  quantity: number
  unit_price: number
  total: number
}

interface Payment {
  id: string
  amount: number
  created_at: string
  status: string
  payment_method: PaymentMethod
  reference?: string
  metadata: {
    payment_type: PaymentMethod
    reference: string
    notes?: string
  }
}

interface CustomerGroup {
  id: string
  name: string
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function currency(value: number) {
  return `₱${value.toFixed(2)}`
}

function statusVariant(status: string) {
  if (status === "delivered" || status === "captured" || status === "paid" || status === "completed") 
    return "default"
  if (status === "processing" || status === "pending" || status === "authorized") 
    return "secondary"
  if (status === "cancelled" || status === "failed" || status === "canceled") 
    return "destructive"
  return "outline"
}

function getPaymentMethodIcon(method: PaymentMethod) {
  switch (method) {
    case "cash":
      return Banknote
    case "gcash":
      return Smartphone
    case "maya":
      return QrCode
    case "credit":
      return Wallet
    case "refill":
      return Droplet
    default:
      return CreditCard
  }
}

function getPaymentMethodLabel(method: PaymentMethod) {
  switch (method) {
    case "cash":
      return "Cash"
    case "gcash":
      return "GCash"
    case "maya":
      return "Maya"
    case "credit":
      return "Wallet Credit"
    case "refill":
      return "Refill Credits"
    default:
      return method
  }
}

function getPaymentMethodColor(method: PaymentMethod) {
  switch (method) {
    case "cash":
      return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
    case "gcash":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
    case "maya":
      return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300"
    case "credit":
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
    case "refill":
      return "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-300"
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
  }
}

// -----------------------------------------------------------------------------
// Page
// -----------------------------------------------------------------------------

export default function CustomerDetailPage() {
  const params = useParams()
  const router = useRouter()

  const customerId = params?.id as string

  // State for customer data
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [addresses, setAddresses] = useState<Address[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [groups, setGroups] = useState<CustomerGroup[]>([])

  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [activeTab, setActiveTab] = useState("overview")

  // Payment recording states
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false)
  const [paymentAmount, setPaymentAmount] = useState<string>("")
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash")
  const [paymentReference, setPaymentReference] = useState<string>("")
  const [paymentNotes, setPaymentNotes] = useState<string>("")
  const [isRecordingPayment, setIsRecordingPayment] = useState(false)

  // Container management states
  const [containerAction, setContainerAction] = useState<"borrow" | "return">("borrow")
  const [containerBrand, setContainerBrand] = useState<ContainerBrand>("own_brand")
  const [containerQuantity, setContainerQuantity] = useState("1")
  const [isUpdatingContainer, setIsUpdatingContainer] = useState(false)

  // Refill credits states
  const [refillCreditsAmount, setRefillCreditsAmount] = useState("1")
  const [refillDialogOpen, setRefillDialogOpen] = useState(false)
  const [isAddingRefillCredits, setIsAddingRefillCredits] = useState(false)

  // Edit dialog states
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editFormData, setEditFormData] = useState<Partial<Customer>>({})
  const [isUpdatingCustomer, setIsUpdatingCustomer] = useState(false)

  // Delete dialog states
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // ---------------------------------------------------------------------------
  // Fetch customer data
  // ---------------------------------------------------------------------------

  const fetchCustomerData = useCallback(async () => {
    if (!customerId) return

    try {
      setIsLoading(true)

      // Fetch customer details
      const customerResult = await retrieveCustomer(customerId)
      if (customerResult.success && customerResult.customer) {
        setCustomer(customerResult.customer)
      } else {
        toast.error(customerResult.error || "Failed to load customer")
      }

      // Fetch customer addresses
      const addressesResult = await listCustomerAddresses(customerId)
      if (addressesResult.success) {
        setAddresses(addressesResult.addresses || [])
      }

      // Fetch customer orders
      const ordersResult = await listCustomerOrders(customerId)
      if (ordersResult.success) {
        setOrders(ordersResult.orders || [])
      }

      // Fetch customer payment collections
      const paymentsResult = await listCustomerPaymentCollections(customerId)
      if (paymentsResult.success && paymentsResult.paymentCollections) {
        const transformedPayments = paymentsResult.paymentCollections.map((pc: any) => ({
          id: pc.id,
          amount: pc.amount,
          created_at: pc.created_at,
          status: pc.status,
          payment_method: pc.metadata?.payment_method || "cash",
          reference: pc.metadata?.reference || pc.id.slice(0, 8),
          metadata: {
            payment_type: pc.metadata?.payment_method || "cash",
            reference: pc.metadata?.reference || pc.id.slice(0, 8),
            notes: pc.metadata?.notes || "",
          },
        }))
        setPayments(transformedPayments)
      }

    } catch (error) {
      console.error("Error fetching customer data:", error)
      toast.error("Failed to load customer data")
    } finally {
      setIsLoading(false)
    }
  }, [customerId])

  // Initial data load
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

  // ---------------------------------------------------------------------------
  // Derived data
  // ---------------------------------------------------------------------------

  const containerStats = useMemo(() => {
    if (!customer) return null

    const ownBorrowed = customer.metadata?.own_brand?.borrowed || 0
    const otherBorrowed = customer.metadata?.other_brand?.borrowed || 0
    const ownReturned = customer.metadata?.own_brand?.returned || 0
    const otherReturned = customer.metadata?.other_brand?.returned || 0

    return {
      currentBorrowed: ownBorrowed + otherBorrowed,
      totalBorrowed: customer.metadata?.total_jags_borrowed || 0,
      totalReturned: customer.metadata?.total_jags_returned || 0,
      ownBorrowed,
      otherBorrowed,
      ownReturned,
      otherReturned,
      totalOwnHandled: ownBorrowed + ownReturned,
      totalOtherHandled: otherBorrowed + otherReturned,
    }
  }, [customer])

  // Payment stats
  const paymentStats = useMemo(() => {
    if (!payments.length) return null

    const totalPaid = payments
      .filter(p => p.status === "captured" || p.status === "paid" || p.status === "completed")
      .reduce((sum, p) => sum + p.amount, 0)

    const totalPending = payments
      .filter(p => p.status === "pending" || p.status === "authorized")
      .reduce((sum, p) => sum + p.amount, 0)

    const byMethod = payments.reduce((acc, p) => {
      const method = p.payment_method || "cash"
      acc[method] = (acc[method] || 0) + p.amount
      return acc
    }, {} as Record<string, number>)

    return { totalPaid, totalPending, byMethod }
  }, [payments])

  // ---------------------------------------------------------------------------
  // Payment recording
  // ---------------------------------------------------------------------------

  const handleRecordPayment = useCallback(async () => {
    if (!customer) return

    const amount = parseFloat(paymentAmount)
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid amount")
      return
    }

    setIsRecordingPayment(true)

    try {
      // Create payment collection
      const result = await createPaymentCollection({
        customer_id: customer.id,
        amount: amount,
        currency_code: "php",
        metadata: {
          payment_method: paymentMethod,
          reference: paymentReference || `PAY-${Date.now().toString().slice(-6)}`,
          notes: paymentNotes || "",
        },
      })

      if (!result.success) {
        toast.error(result.error || "Failed to create payment")
        return
      }

      const paymentCollection = result.paymentCollection

      // If payment method is cash or digital, capture immediately
      if (paymentMethod !== "refill" && paymentMethod !== "credit") {
        const captureResult = await capturePayment(paymentCollection.id, customer.id)
        if (!captureResult.success) {
          toast.error(captureResult.error || "Failed to capture payment")
          return
        }
      }

      // Update local state
      const newPayment: Payment = {
        id: paymentCollection.id,
        amount: amount,
        created_at: new Date().toISOString(),
        status: paymentMethod === "refill" || paymentMethod === "credit" ? "pending" : "captured",
        payment_method: paymentMethod,
        reference: paymentReference || `PAY-${Date.now().toString().slice(-6)}`,
        metadata: {
          payment_type: paymentMethod,
          reference: paymentReference || `PAY-${Date.now().toString().slice(-6)}`,
          notes: paymentNotes || "",
        },
      }

      setPayments(prev => [newPayment, ...prev])

      // Update customer balance if using wallet credit
      if (paymentMethod === "credit" && customer.metadata) {
        setCustomer(prev => {
          if (!prev) return prev
          return {
            ...prev,
            metadata: {
              ...prev.metadata,
              credit_balance: (prev.metadata?.credit_balance || 0) - amount,
            },
          }
        })
      }

      // Update refill credits if using refill
      if (paymentMethod === "refill" && customer.metadata) {
        setCustomer(prev => {
          if (!prev) return prev
          return {
            ...prev,
            metadata: {
              ...prev.metadata,
              refill_credits: (prev.metadata?.refill_credits || 0) - amount,
            },
          }
        })
      }

      // Reset form
      setPaymentAmount("")
      setPaymentMethod("cash")
      setPaymentReference("")
      setPaymentNotes("")
      setPaymentDialogOpen(false)

      toast.success("Payment recorded successfully")

    } catch (error) {
      console.error("Failed to record payment:", error)
      toast.error("Failed to record payment")
    } finally {
      setIsRecordingPayment(false)
    }
  }, [customer, paymentAmount, paymentMethod, paymentReference, paymentNotes])

  // ---------------------------------------------------------------------------
  // Container management
  // ---------------------------------------------------------------------------

  const handleContainerAction = useCallback(async () => {
    if (!customer) return

    const quantity = Math.max(1, Number(containerQuantity) || 1)
    setIsUpdatingContainer(true)

    try {
      const result = await updateContainerBalance(
        customer.id,
        containerAction,
        containerBrand,
        quantity
      )

      if (!result.success) {
        toast.error(result.error || "Failed to update container balance")
        return
      }

      if (result.customer) {
        setCustomer(result.customer)
      }

      setContainerQuantity("1")
      toast.success(`Container ${containerAction === "borrow" ? "borrowed" : "returned"} successfully`)

    } catch (error) {
      console.error("Failed to update containers:", error)
      toast.error("Failed to update containers")
    } finally {
      setIsUpdatingContainer(false)
    }
  }, [customer, containerAction, containerBrand, containerQuantity])

  // ---------------------------------------------------------------------------
  // Refill credits
  // ---------------------------------------------------------------------------

  const handleAddRefillCredits = useCallback(async () => {
    if (!customer) return

    const amount = Math.max(1, Number(refillCreditsAmount) || 1)
    setIsAddingRefillCredits(true)

    try {
      const result = await addRefillCredits(customer.id, amount)

      if (!result.success) {
        toast.error(result.error || "Failed to add refill credits")
        return
      }

      if (result.customer) {
        setCustomer(result.customer)
      }

      setRefillCreditsAmount("1")
      setRefillDialogOpen(false)
      toast.success(`Added ${amount} refill credits`)

    } catch (error) {
      console.error("Failed to add refill credits:", error)
      toast.error("Failed to add refill credits")
    } finally {
      setIsAddingRefillCredits(false)
    }
  }, [customer, refillCreditsAmount])

  // ---------------------------------------------------------------------------
  // Edit customer
  // ---------------------------------------------------------------------------

  const handleEditCustomer = useCallback(async () => {
    if (!customer) return

    setIsUpdatingCustomer(true)

    try {
      const result = await updateCustomer(customer.id, {
        first_name: editFormData.first_name,
        last_name: editFormData.last_name,
        email: editFormData.email,
        phone: editFormData.phone,
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

  // ---------------------------------------------------------------------------
  // Delete customer
  // ---------------------------------------------------------------------------

  const handleDeleteCustomer = useCallback(async () => {
    if (!customer) return

    setIsDeleting(true)

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
    } finally {
      setIsDeleting(false)
    }
  }, [customer, router])

  // ---------------------------------------------------------------------------
  // Loading
  // ---------------------------------------------------------------------------

  if (isLoading) {
    return (
      <div className="h-full overflow-y-auto bg-background">
        <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="space-y-6 animate-pulse">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-muted" />
              <div className="space-y-2">
                <div className="h-6 w-48 rounded-md bg-muted" />
                <div className="h-4 w-32 rounded-md bg-muted" />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <Card key={index}>
                  <CardContent className="h-32" />
                </Card>
              ))}
            </div>
            <Card>
              <CardContent className="h-[500px]" />
            </Card>
          </div>
        </div>
      </div>
    )
  }

  if (!customer) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="mx-auto flex min-h-screen max-w-2xl items-center justify-center px-4">
          <Card className="w-full">
            <CardHeader>
              <CardTitle>Customer Not Found</CardTitle>
              <CardDescription>
                The customer you're looking for doesn't exist or has been removed.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => router.back()}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Go Back
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="h-full overflow-y-auto bg-background">
      <div className="mx-auto w-full max-w-7xl px-3 py-4 sm:px-6 sm:py-6 lg:px-8 space-y-6">

        {/* ----------------------------------------------------------------- */}
        {/* Header */}
        {/* ----------------------------------------------------------------- */}

        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between flex-shrink-0">
          <div className="flex min-w-0 items-start gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="mt-1 shrink-0"
              onClick={() => router.back()}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>

            <Avatar className="h-12 w-12 shrink-0 sm:h-14 sm:w-14">
              <AvatarFallback className="text-lg">
                {customer.first_name?.[0] || "U"}
                {customer.last_name?.[0] || ""}
              </AvatarFallback>
            </Avatar>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate text-xl font-bold sm:text-2xl">
                  {customer.first_name || "Unknown"} {customer.last_name || ""}
                </h1>
                <Badge
                  variant={customer.metadata?.customer_type === "commercial" ? "default" : "secondary"}
                >
                  {customer.metadata?.customer_type || "Residential"}
                </Badge>
                {customer.has_account && (
                  <Badge variant="outline" className="text-xs">
                    <CheckCircle2 className="mr-1 h-3 w-3" />
                    Verified
                  </Badge>
                )}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Customer since {customer.created_at ? format(new Date(customer.created_at), "MMM dd, yyyy") : "N/A"}
              </p>
            </div>
          </div>

          <div className="flex w-full gap-2 sm:w-auto">
            {/* Refresh Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex-1 sm:flex-none"
            >
              <RefreshCw className={cn("h-4 w-4 mr-2", isRefreshing && "animate-spin")} />
              Refresh
            </Button>

            {/* Record Payment Button */}
            <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
              <DialogTrigger asChild>
                <Button className="flex-1 sm:flex-none">
                  <Receipt className="mr-2 h-4 w-4" />
                  Record Payment
                </Button>
              </DialogTrigger>

              <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Record Payment</DialogTitle>
                  <DialogDescription>
                    Record a payment from {customer.first_name} {customer.last_name}.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="payment-amount">Amount (₱)</Label>
                    <Input
                      id="payment-amount"
                      type="number"
                      placeholder="0.00"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Payment Method</Label>
                    <RadioGroup
                      value={paymentMethod}
                      onValueChange={(value) => setPaymentMethod(value as PaymentMethod)}
                      className="grid grid-cols-2 gap-2"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="cash" id="cash" />
                        <Label htmlFor="cash" className="flex items-center gap-2 cursor-pointer">
                          <Banknote className="h-4 w-4" />
                          Cash
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="gcash" id="gcash" />
                        <Label htmlFor="gcash" className="flex items-center gap-2 cursor-pointer">
                          <Smartphone className="h-4 w-4" />
                          GCash
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="maya" id="maya" />
                        <Label htmlFor="maya" className="flex items-center gap-2 cursor-pointer">
                          <QrCode className="h-4 w-4" />
                          Maya
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="credit" id="credit" />
                        <Label htmlFor="credit" className="flex items-center gap-2 cursor-pointer">
                          <Wallet className="h-4 w-4" />
                          Wallet Credit
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2 col-span-2">
                        <RadioGroupItem value="refill" id="refill" />
                        <Label htmlFor="refill" className="flex items-center gap-2 cursor-pointer">
                          <Droplet className="h-4 w-4" />
                          Refill Credits
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="payment-reference">Reference (Optional)</Label>
                    <Input
                      id="payment-reference"
                      placeholder="OR-12345, GCASH-REF, etc."
                      value={paymentReference}
                      onChange={(e) => setPaymentReference(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="payment-notes">Notes (Optional)</Label>
                    <Textarea
                      id="payment-notes"
                      placeholder="Add any notes about this payment..."
                      value={paymentNotes}
                      onChange={(e) => setPaymentNotes(e.target.value)}
                    />
                  </div>

                  <div className="rounded-lg bg-muted p-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Wallet Balance:</span>
                      <span className="font-medium">{currency(customer.metadata?.credit_balance || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Refill Credits:</span>
                      <span className="font-medium">{customer.metadata?.refill_credits || 0}</span>
                    </div>
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setPaymentDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleRecordPayment} disabled={isRecordingPayment}>
                    {isRecordingPayment ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Recording...
                      </>
                    ) : (
                      <>
                        <Receipt className="mr-2 h-4 w-4" />
                        Record Payment
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Edit Customer Dialog */}
            <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="flex-1 sm:flex-none">
                  <Edit className="mr-2 h-4 w-4" />
                  <span className="hidden sm:inline">Edit</span>
                </Button>
              </DialogTrigger>

              <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[600px]">
                <DialogHeader>
                  <DialogTitle>Edit Customer Details</DialogTitle>
                  <DialogDescription>
                    Update customer information and preferences.
                  </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>First Name</Label>
                      <Input
                        defaultValue={customer.first_name || ""}
                        onChange={(e) => setEditFormData(prev => ({ ...prev, first_name: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Last Name</Label>
                      <Input
                        defaultValue={customer.last_name || ""}
                        onChange={(e) => setEditFormData(prev => ({ ...prev, last_name: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input
                        defaultValue={customer.email || ""}
                        type="email"
                        onChange={(e) => setEditFormData(prev => ({ ...prev, email: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Phone</Label>
                      <Input
                        defaultValue={customer.phone || ""}
                        type="tel"
                        onChange={(e) => setEditFormData(prev => ({ ...prev, phone: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Customer Type</Label>
                    <Select
                      defaultValue={customer.metadata?.customer_type || "residential"}
                      onValueChange={(value) => 
                        setEditFormData(prev => ({
                          ...prev,
                          metadata: { ...prev.metadata, customer_type: value }
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="residential">Residential</SelectItem>
                        <SelectItem value="commercial">Commercial</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Notes</Label>
                    <Textarea
                      defaultValue={customer.metadata?.notes || ""}
                      onChange={(e) => 
                        setEditFormData(prev => ({
                          ...prev,
                          metadata: { ...prev.metadata, notes: e.target.value }
                        }))
                      }
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleEditCustomer} disabled={isUpdatingCustomer}>
                    {isUpdatingCustomer ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Save Changes"
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="shrink-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuItem>
                  <Download className="mr-2 h-4 w-4" />
                  Export Data
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  className="text-destructive"
                  onClick={() => setDeleteDialogOpen(true)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Customer
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Customer</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete {customer.first_name} {customer.last_name}? 
                This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleDeleteCustomer} 
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  "Delete Customer"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ----------------------------------------------------------------- */}
        {/* Main Stats */}
        {/* ----------------------------------------------------------------- */}

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 flex-shrink-0">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Wallet Credit</CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{currency(customer.metadata?.credit_balance || 0)}</div>
              <p className="text-xs text-muted-foreground">Available monetary balance</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Refill Credits</CardTitle>
              <Droplet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{customer.metadata?.refill_credits || 0}</div>
              <p className="text-xs text-muted-foreground">Free/credit refill units available</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Containers Out</CardTitle>
              <Container className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{containerStats?.currentBorrowed || 0}</div>
              <p className="text-xs text-muted-foreground">Currently with customer</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Lifetime Purchases</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{currency(customer.metadata?.lifetime_purchases || 0)}</div>
              <p className="text-xs text-muted-foreground">Total purchases</p>
            </CardContent>
          </Card>
        </div>

        {/* ----------------------------------------------------------------- */}
        {/* Tabs */}
        {/* ----------------------------------------------------------------- */}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <div className="w-full overflow-x-auto pb-1 flex-shrink-0">
            <TabsList className="inline-flex min-w-max">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="orders">Orders</TabsTrigger>
              <TabsTrigger value="payments">Payments</TabsTrigger>
              <TabsTrigger value="containers">Containers</TabsTrigger>
              <TabsTrigger value="addresses">Addresses</TabsTrigger>
            </TabsList>
          </div>

          {/* =============================================================== */}
          {/* OVERVIEW TAB */}
          {/* =============================================================== */}

          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              {/* Customer Information */}
              <Card>
                <CardHeader>
                  <CardTitle>Customer Information</CardTitle>
                  <CardDescription>Contact details, account status and preferences.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <Mail className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="break-all text-sm">{customer.email || "N/A"}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Phone className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="text-sm">{customer.phone || "N/A"}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Calendar className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="text-sm">
                        Joined {customer.created_at ? format(new Date(customer.created_at), "MMMM dd, yyyy") : "N/A"}
                      </span>
                    </div>
                  </div>

                  <Separator />

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-lg border p-3">
                      <p className="text-xs text-muted-foreground">Account</p>
                      <Badge className="mt-2" variant={customer.has_account ? "default" : "secondary"}>
                        {customer.has_account ? "Active Account" : "Guest"}
                      </Badge>
                    </div>
                    <div className="rounded-lg border p-3">
                      <p className="text-xs text-muted-foreground">Payment</p>
                      <Badge className="mt-2 uppercase" variant="outline">
                        {customer.metadata?.preferred_payment || "N/A"}
                      </Badge>
                    </div>
                  </div>

                  {customer.metadata?.notes && (
                    <>
                      <Separator />
                      <div>
                        <h4 className="mb-2 text-sm font-medium">Notes</h4>
                        <p className="text-sm leading-6 text-muted-foreground">{customer.metadata.notes}</p>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Credit & Refill Management */}
              <Card>
                <CardHeader>
                  <CardTitle>Credit & Refill Management</CardTitle>
                  <CardDescription>Manage monetary credits and refill credits.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="rounded-xl border p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium">Wallet Credit</p>
                        <p className="text-xs text-muted-foreground">Available balance</p>
                      </div>
                      <span className="text-xl font-bold">{currency(customer.metadata?.credit_balance || 0)}</span>
                    </div>
                    <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                      <Button className="flex-1">
                        <Plus className="mr-2 h-4 w-4" />
                        Add Credit
                      </Button>
                      <Button variant="outline" className="flex-1">
                        <Minus className="mr-2 h-4 w-4" />
                        Use Credit
                      </Button>
                    </div>
                  </div>

                  <div className="rounded-xl border p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium">Refill Credits</p>
                        <p className="text-xs text-muted-foreground">Available refill units</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Droplet className="h-5 w-5 text-muted-foreground" />
                        <span className="text-xl font-bold">{customer.metadata?.refill_credits || 0}</span>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                      <Dialog open={refillDialogOpen} onOpenChange={setRefillDialogOpen}>
                        <DialogTrigger asChild>
                          <Button className="flex-1">
                            <Plus className="mr-2 h-4 w-4" />
                            Add Refill Credits
                          </Button>
                        </DialogTrigger>

                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Add Refill Credits</DialogTitle>
                            <DialogDescription>
                              Add refill credits to this customer's account.
                            </DialogDescription>
                          </DialogHeader>

                          <div className="space-y-4 py-4">
                            <div className="space-y-2">
                              <Label>Number of Credits</Label>
                              <Input
                                type="number"
                                min="1"
                                value={refillCreditsAmount}
                                onChange={(e) => setRefillCreditsAmount(e.target.value)}
                              />
                            </div>
                          </div>

                          <DialogFooter>
                            <Button variant="outline" onClick={() => setRefillDialogOpen(false)}>
                              Cancel
                            </Button>
                            <Button onClick={handleAddRefillCredits} disabled={isAddingRefillCredits}>
                              {isAddingRefillCredits ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Adding...
                                </>
                              ) : (
                                "Add Credits"
                              )}
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>

                      <Button variant="outline" className="flex-1">
                        <History className="mr-2 h-4 w-4" />
                        History
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Payment Summary */}
            {paymentStats && (
              <Card>
                <CardHeader>
                  <CardTitle>Payment Summary</CardTitle>
                  <CardDescription>Overview of customer payments.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="rounded-xl border p-4">
                      <p className="text-sm text-muted-foreground">Total Paid</p>
                      <p className="mt-1 text-2xl font-bold text-green-600">
                        {currency(paymentStats.totalPaid)}
                      </p>
                    </div>
                    <div className="rounded-xl border p-4">
                      <p className="text-sm text-muted-foreground">Pending</p>
                      <p className="mt-1 text-2xl font-bold text-yellow-600">
                        {currency(paymentStats.totalPending)}
                      </p>
                    </div>
                    <div className="rounded-xl border p-4">
                      <p className="text-sm text-muted-foreground">By Method</p>
                      <div className="mt-1 space-y-1">
                        {Object.entries(paymentStats.byMethod).map(([method, amount]) => (
                          <div key={method} className="flex justify-between text-sm">
                            <span className="text-muted-foreground">{getPaymentMethodLabel(method as PaymentMethod)}</span>
                            <span className="font-medium">{currency(amount)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Container Summary */}
            <Card>
              <CardHeader>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <CardTitle>Container Summary</CardTitle>
                    <CardDescription>Current container balance and brand breakdown.</CardDescription>
                  </div>
                  <Badge variant="outline">{containerStats?.currentBorrowed || 0} currently out</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-xl border p-4">
                    <p className="text-sm text-muted-foreground">Currently Borrowed</p>
                    <p className="mt-1 text-2xl font-bold">{containerStats?.currentBorrowed || 0}</p>
                  </div>
                  <div className="rounded-xl border p-4">
                    <p className="text-sm text-muted-foreground">Total Borrowed</p>
                    <p className="mt-1 text-2xl font-bold">{containerStats?.totalBorrowed || 0}</p>
                  </div>
                  <div className="rounded-xl border p-4">
                    <p className="text-sm text-muted-foreground">Total Returned</p>
                    <p className="mt-1 text-2xl font-bold">{containerStats?.totalReturned || 0}</p>
                  </div>
                  <div className="rounded-xl border p-4">
                    <p className="text-sm text-muted-foreground">Return Rate</p>
                    <p className="mt-1 text-2xl font-bold">
                      {containerStats?.totalBorrowed && containerStats.totalBorrowed > 0
                        ? Math.round((containerStats.totalReturned / containerStats.totalBorrowed) * 100)
                        : 0}
                      %
                    </p>
                  </div>
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <div className="rounded-xl border p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Container className="h-4 w-4" />
                        <span className="font-medium">Own Brand</span>
                      </div>
                      <Badge variant="secondary">{containerStats?.ownBorrowed || 0} out</Badge>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs text-muted-foreground">Borrowed</p>
                        <p className="text-lg font-semibold">{containerStats?.ownBorrowed || 0}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Returned</p>
                        <p className="text-lg font-semibold">{containerStats?.ownReturned || 0}</p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4" />
                        <span className="font-medium">Other Brand</span>
                      </div>
                      <Badge variant="outline">{containerStats?.otherBorrowed || 0} out</Badge>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs text-muted-foreground">Borrowed</p>
                        <p className="text-lg font-semibold">{containerStats?.otherBorrowed || 0}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Returned</p>
                        <p className="text-lg font-semibold">{containerStats?.otherReturned || 0}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Orders */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Orders</CardTitle>
                <CardDescription>Latest customer orders.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="w-full overflow-x-auto">
                  <Table className="min-w-[700px]">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Order</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Items</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orders.slice(0, 5).map((order) => (
                        <TableRow key={order.id}>
                          <TableCell className="font-medium">{order.display_id}</TableCell>
                          <TableCell>
                            {format(new Date(order.created_at), "MMM dd, yyyy")}
                          </TableCell>
                          <TableCell>{order.items?.length || 0} items</TableCell>
                          <TableCell>
                            <Badge variant={statusVariant(order.status)}>{order.status}</Badge>
                          </TableCell>
                          <TableCell className="text-right">{currency(order.total || 0)}</TableCell>
                        </TableRow>
                      ))}
                      {orders.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground">
                            No orders found
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* =============================================================== */}
          {/* ORDERS TAB */}
          {/* =============================================================== */}

          <TabsContent value="orders" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <CardTitle>Order History</CardTitle>
                    <CardDescription>All customer orders and container transactions.</CardDescription>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm">
                      <Filter className="mr-2 h-4 w-4" />
                      Filter
                    </Button>
                    <Button variant="outline" size="sm">
                      <Download className="mr-2 h-4 w-4" />
                      Export
                    </Button>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button size="sm">
                          <ShoppingCart className="mr-2 h-4 w-4" />
                          New Order
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>New Order</DialogTitle>
                          <DialogDescription>Create an order for this customer.</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <Label>Delivery Type</Label>
                            <Select defaultValue="delivery">
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="delivery">Delivery</SelectItem>
                                <SelectItem value="pickup">Pickup</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>Notes</Label>
                            <Textarea placeholder="Order notes..." />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button variant="outline">Cancel</Button>
                          <Button>Create Order</Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="w-full overflow-x-auto">
                  <Table className="min-w-[1050px]">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Order ID</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Items</TableHead>
                        <TableHead>Containers</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orders.map((order) => (
                        <TableRow key={order.id}>
                          <TableCell className="font-medium">{order.display_id}</TableCell>
                          <TableCell>
                            {format(new Date(order.created_at), "MMM dd, yyyy HH:mm")}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{order.metadata?.delivery_type || "delivery"}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              {order.items?.map((item) => (
                                <div key={item.id} className="text-sm">
                                  {item.quantity}x {item.title}
                                </div>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-2 text-xs">
                              {order.metadata?.jags_borrowed > 0 && (
                                <div>
                                  <span className="font-medium">Borrowed:</span> {order.metadata.jags_borrowed}
                                </div>
                              )}
                              {order.metadata?.jags_returned > 0 && (
                                <div>
                                  <span className="font-medium">Returned:</span> {order.metadata.jags_returned}
                                </div>
                              )}
                              <div className="text-muted-foreground">
                                Own: {order.metadata?.borrowed_own_brand || 0} out / {order.metadata?.returned_own_brand || 0} returned
                              </div>
                              <div className="text-muted-foreground">
                                Other: {order.metadata?.borrowed_other_brand || 0} out / {order.metadata?.returned_other_brand || 0} returned
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={statusVariant(order.status)}>{order.status}</Badge>
                          </TableCell>
                          <TableCell className="text-right">{currency(order.total || 0)}</TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Edit Order
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-destructive">
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Cancel Order
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                      {orders.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center text-muted-foreground">
                            No orders found
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* =============================================================== */}
          {/* PAYMENTS TAB */}
          {/* =============================================================== */}

          <TabsContent value="payments" className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              {/* Payment History */}
              <Card>
                <CardHeader>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <CardTitle>Payment History</CardTitle>
                      <CardDescription>All payment transactions.</CardDescription>
                    </div>
                    <Button size="sm" onClick={() => setPaymentDialogOpen(true)}>
                      <Receipt className="mr-2 h-4 w-4" />
                      Record Payment
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="w-full overflow-x-auto">
                    <Table className="min-w-[650px]">
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Method</TableHead>
                          <TableHead>Reference</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {payments.map((payment) => {
                          const Icon = getPaymentMethodIcon(payment.payment_method)
                          return (
                            <TableRow key={payment.id}>
                              <TableCell>
                                {format(new Date(payment.created_at), "MMM dd, yyyy")}
                              </TableCell>
                              <TableCell>
                                <Badge className={getPaymentMethodColor(payment.payment_method)}>
                                  <Icon className="mr-1 h-3 w-3" />
                                  {getPaymentMethodLabel(payment.payment_method)}
                                </Badge>
                              </TableCell>
                              <TableCell className="font-mono text-xs">
                                {payment.reference || payment.metadata?.reference || "-"}
                              </TableCell>
                              <TableCell>
                                <Badge variant={statusVariant(payment.status)}>
                                  {payment.status}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right font-medium">
                                {currency(payment.amount)}
                              </TableCell>
                            </TableRow>
                          )
                        })}
                        {payments.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center text-muted-foreground">
                              No payments found
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              {/* Credit Summary */}
              <Card>
                <CardHeader>
                  <CardTitle>Credit Summary</CardTitle>
                  <CardDescription>Customer credit activity.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-xl border p-4">
                    <p className="text-sm text-muted-foreground">Available Balance</p>
                    <p className="mt-1 text-3xl font-bold">{currency(customer.metadata?.credit_balance || 0)}</p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border p-4">
                      <TrendingUp className="mb-2 h-6 w-6 text-green-600" />
                      <p className="text-xl font-bold">{currency(paymentStats?.totalPaid || 0)}</p>
                      <p className="text-xs text-muted-foreground">Total Paid</p>
                    </div>
                    <div className="rounded-xl border p-4">
                      <TrendingDown className="mb-2 h-6 w-6 text-red-600" />
                      <p className="text-xl font-bold">{currency(paymentStats?.totalPending || 0)}</p>
                      <p className="text-xs text-muted-foreground">Pending</p>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <h4 className="mb-3 text-sm font-medium">Refill Credit Balance</h4>
                    <div className="flex items-center justify-between rounded-lg border p-4">
                      <div className="flex items-center gap-3">
                        <Droplet className="h-5 w-5 text-cyan-600" />
                        <div>
                          <p className="font-medium">Refill Credits</p>
                          <p className="text-xs text-muted-foreground">Available refills</p>
                        </div>
                      </div>
                      <span className="text-2xl font-bold">{customer.metadata?.refill_credits || 0}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* =============================================================== */}
          {/* CONTAINERS TAB */}
          {/* =============================================================== */}

          <TabsContent value="containers" className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-3">
              {/* Current balance */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Container / Jug Management</CardTitle>
                  <CardDescription>Track borrowed and returned containers by brand.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-xl border p-4">
                      <p className="text-xs text-muted-foreground">Currently Out</p>
                      <p className="mt-1 text-3xl font-bold">{containerStats?.currentBorrowed || 0}</p>
                    </div>
                    <div className="rounded-xl border p-4">
                      <p className="text-xs text-muted-foreground">Borrowed Lifetime</p>
                      <p className="mt-1 text-3xl font-bold">{containerStats?.totalBorrowed || 0}</p>
                    </div>
                    <div className="rounded-xl border p-4">
                      <p className="text-xs text-muted-foreground">Returned Lifetime</p>
                      <p className="mt-1 text-3xl font-bold">{containerStats?.totalReturned || 0}</p>
                    </div>
                  </div>

                  <Separator />

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-xl border p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Container className="h-5 w-5" />
                          <span className="font-semibold">Own Brand</span>
                        </div>
                        <Badge>{containerStats?.ownBorrowed || 0} out</Badge>
                      </div>
                      <div className="mt-5 grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-muted-foreground">Borrowed</p>
                          <p className="text-2xl font-bold">{containerStats?.ownBorrowed || 0}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Returned</p>
                          <p className="text-2xl font-bold">{containerStats?.ownReturned || 0}</p>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-xl border p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Package className="h-5 w-5" />
                          <span className="font-semibold">Other Brand</span>
                        </div>
                        <Badge variant="outline">{containerStats?.otherBorrowed || 0} out</Badge>
                      </div>
                      <div className="mt-5 grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-muted-foreground">Borrowed</p>
                          <p className="text-2xl font-bold">{containerStats?.otherBorrowed || 0}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Returned</p>
                          <p className="text-2xl font-bold">{containerStats?.otherReturned || 0}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <Label>Container Return Rate</Label>
                      <span className="text-sm font-medium">
                        {containerStats?.totalBorrowed && containerStats.totalBorrowed > 0
                          ? Math.round((containerStats.totalReturned / containerStats.totalBorrowed) * 100)
                          : 0}
                        %
                      </span>
                    </div>
                    <Progress
                      value={
                        containerStats?.totalBorrowed && containerStats.totalBorrowed > 0
                          ? (containerStats.totalReturned / containerStats.totalBorrowed) * 100
                          : 0
                      }
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Action */}
              <Card>
                <CardHeader>
                  <CardTitle>Container Transaction</CardTitle>
                  <CardDescription>Record a borrowed or returned jug.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Action</Label>
                    <Select
                      value={containerAction}
                      onValueChange={(value) => setContainerAction(value as "borrow" | "return")}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="borrow">Borrow Container</SelectItem>
                        <SelectItem value="return">Return Container</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Brand</Label>
                    <Select
                      value={containerBrand}
                      onValueChange={(value) => setContainerBrand(value as ContainerBrand)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="own_brand">Own Brand</SelectItem>
                        <SelectItem value="other_brand">Other Brand</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Quantity</Label>
                    <Input
                      type="number"
                      min="1"
                      value={containerQuantity}
                      onChange={(e) => setContainerQuantity(e.target.value)}
                    />
                  </div>

                  {containerAction === "return" && (
                    <div className="rounded-lg border p-3 text-sm text-muted-foreground">
                      Returning containers will reduce the customer's current borrowed balance.
                    </div>
                  )}

                  <Button 
                    className="w-full" 
                    onClick={handleContainerAction}
                    disabled={isUpdatingContainer}
                  >
                    {isUpdatingContainer ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : containerAction === "borrow" ? (
                      <>
                        <Plus className="mr-2 h-4 w-4" />
                        Record Borrow
                      </>
                    ) : (
                      <>
                        <RotateCcw className="mr-2 h-4 w-4" />
                        Record Return
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Brand accounting */}
            <Card>
              <CardHeader>
                <CardTitle>Container Accounting</CardTitle>
                <CardDescription>Clear separation between your containers and containers from other brands.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="w-full overflow-x-auto">
                  <Table className="min-w-[700px]">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Brand</TableHead>
                        <TableHead>Currently Borrowed</TableHead>
                        <TableHead>Returned</TableHead>
                        <TableHead>Total Handled</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell className="font-medium">Own Brand</TableCell>
                        <TableCell>{containerStats?.ownBorrowed || 0}</TableCell>
                        <TableCell>{containerStats?.ownReturned || 0}</TableCell>
                        <TableCell>{containerStats?.totalOwnHandled || 0}</TableCell>
                        <TableCell>
                          <Badge>Customer has {containerStats?.ownBorrowed || 0} own-brand containers</Badge>
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Other Brand</TableCell>
                        <TableCell>{containerStats?.otherBorrowed || 0}</TableCell>
                        <TableCell>{containerStats?.otherReturned || 0}</TableCell>
                        <TableCell>{containerStats?.totalOtherHandled || 0}</TableCell>
                        <TableCell>
                          <Badge variant="outline">Customer has {containerStats?.otherBorrowed || 0} other-brand containers</Badge>
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* =============================================================== */}
          {/* ADDRESSES TAB */}
          {/* =============================================================== */}

          <TabsContent value="addresses" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <CardTitle>Customer Addresses</CardTitle>
                    <CardDescription>Delivery and billing addresses.</CardDescription>
                  </div>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button size="sm">
                        <Plus className="mr-2 h-4 w-4" />
                        Add Address
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[600px]">
                      <DialogHeader>
                        <DialogTitle>Add New Address</DialogTitle>
                        <DialogDescription>Add a delivery or billing address.</DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                          <Label>Address Line 1</Label>
                          <Input placeholder="House number, street name" />
                        </div>
                        <div className="space-y-2">
                          <Label>Address Line 2</Label>
                          <Input placeholder="Barangay, subdivision" />
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div className="space-y-2">
                            <Label>City</Label>
                            <Input placeholder="City" />
                          </div>
                          <div className="space-y-2">
                            <Label>Province</Label>
                            <Input placeholder="Province" />
                          </div>
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div className="space-y-2">
                            <Label>Postal Code</Label>
                            <Input placeholder="Postal code" />
                          </div>
                          <div className="space-y-2">
                            <Label>Country</Label>
                            <Select defaultValue="ph">
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="ph">Philippines</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Landmark</Label>
                          <Input placeholder="Nearby landmark" />
                        </div>
                        <div className="space-y-2">
                          <Label>Delivery Instructions</Label>
                          <Textarea placeholder="Special instructions for delivery" />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline">Cancel</Button>
                        <Button>Save Address</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {addresses.map((address) => (
                    <Card key={address.id} className="relative">
                      <CardContent className="pt-6">
                        <div className="absolute right-2 top-2">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive">
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        <div className="space-y-4 pr-8">
                          <div className="flex items-start gap-3">
                            <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
                            <div>
                              <p className="font-medium">{address.address_1}</p>
                              {address.address_2 && (
                                <p className="text-sm text-muted-foreground">{address.address_2}</p>
                              )}
                              <p className="text-sm text-muted-foreground">
                                {address.city}, {address.province} {address.postal_code}
                              </p>
                            </div>
                          </div>

                          {address.metadata?.landmark && (
                            <div className="flex items-start gap-2 text-sm">
                              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                              <span className="text-muted-foreground">
                                Landmark: {address.metadata.landmark}
                              </span>
                            </div>
                          )}

                          {address.metadata?.delivery_instructions && (
                            <div className="flex items-start gap-2 text-sm">
                              <Truck className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                              <span className="text-muted-foreground">
                                {address.metadata.delivery_instructions}
                              </span>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {addresses.length === 0 && (
                    <div className="text-center text-muted-foreground py-8">
                      No addresses found
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* ----------------------------------------------------------------- */}
        {/* Customer Groups */}
        {/* ----------------------------------------------------------------- */}

        <Card className="flex-shrink-0">
          <CardHeader>
            <CardTitle>Customer Groups</CardTitle>
            <CardDescription>Manage customer group memberships.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {groups.map((group) => (
                <Badge key={group.id} variant="secondary" className="py-1">
                  {group.name}
                  <button type="button" className="ml-2 hover:text-destructive">×</button>
                </Badge>
              ))}
              <Button variant="outline" size="sm">
                <Plus className="mr-2 h-3 w-3" />
                Add Group
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Bottom spacing */}
        <div className="h-4" />
      </div>
    </div>
  )
}