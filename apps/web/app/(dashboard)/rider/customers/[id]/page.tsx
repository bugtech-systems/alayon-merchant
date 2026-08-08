// app/customers/[id]/page.tsx
"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
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
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  ArrowLeft,
  Droplet,
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
  CheckCircle2,
  XCircle,
  Clock,
  TrendingUp,
  TrendingDown,
  User,
  ShoppingBag,
  Container,
  Wallet,
  Download,
  Filter,
  Search,
  Edit,
  Trash2,
  RefreshCw,
} from "lucide-react"
import { format } from "date-fns"

// Types
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
    borrowed_jags: number
    total_jags_borrowed: number
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
  metadata: {
    payment_type: "credit" | "debit" | "cash" | "gcash" | "maya"
    reference: string
  }
}

interface CustomerGroup {
  id: string
  name: string
}

// Mock Data Fetching
const mockCustomer: Customer = {
  id: "cust_123",
  first_name: "Juan",
  last_name: "Dela Cruz",
  email: "juan.delacruz@email.com",
  phone: "+63 912 345 6789",
  created_at: "2023-06-15T08:00:00Z",
  has_account: true,
  metadata: {
    credit_balance: 250.00,
    borrowed_jags: 3,
    total_jags_borrowed: 47,
    lifetime_purchases: 12500.00,
    preferred_payment: "gcash",
    notes: "Regular customer. Prefers delivery on weekends.",
    customer_type: "residential",
  },
}

const mockAddresses: Address[] = [
  {
    id: "addr_1",
    customer_id: "cust_123",
    address_1: "123 Rizal Street",
    address_2: "Barangay San Antonio",
    city: "Quezon City",
    province: "Metro Manila",
    postal_code: "1105",
    country_code: "ph",
    metadata: {
      landmark: "Near the basketball court",
      delivery_instructions: "Leave at the gate if no one is home",
    },
  },
]

const mockOrders: Order[] = [
  {
    id: "order_1",
    display_id: "WRS-2024-001",
    created_at: "2024-01-15T10:30:00Z",
    status: "delivered",
    total: 150.00,
    items: [
      {
        id: "item_1",
        title: "Purified Water (5 Gallon)",
        quantity: 2,
        unit_price: 25.00,
        total: 50.00,
      },
      {
        id: "item_2",
        title: "Mineral Water (5 Gallon)",
        quantity: 1,
        unit_price: 30.00,
        total: 30.00,
      },
    ],
    metadata: {
      jags_returned: 2,
      jags_borrowed: 3,
      delivery_type: "delivery",
    },
  },
  {
    id: "order_2",
    display_id: "WRS-2024-002",
    created_at: "2024-01-20T14:00:00Z",
    status: "processing",
    total: 100.00,
    items: [
      {
        id: "item_2",
        title: "Purified Water (5 Gallon)",
        quantity: 4,
        unit_price: 25.00,
        total: 100.00,
      },
    ],
    metadata: {
      jags_returned: 0,
      jags_borrowed: 4,
      delivery_type: "pickup",
    },
  },
]

const mockPayments: Payment[] = [
  {
    id: "pay_1",
    amount: 150.00,
    created_at: "2024-01-15T10:35:00Z",
    status: "captured",
    metadata: {
      payment_type: "gcash",
      reference: "GCASH-123456",
    },
  },
  {
    id: "pay_2",
    amount: 500.00,
    created_at: "2024-01-10T09:00:00Z",
    status: "captured",
    metadata: {
      payment_type: "credit",
      reference: "TOP-UP-789",
    },
  },
]

const mockGroups: CustomerGroup[] = [
  { id: "group_1", name: "VIP Customers" },
  { id: "group_2", name: "Regular Delivery" },
  { id: "group_3", name: "Suki" },
]

export default function CustomerDetailPage() {
  const params = useParams()
    const router = useRouter();

  const [customer, setCustomer] = useState<Customer | null>(null)
  const [addresses, setAddresses] = useState<Address[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [groups, setGroups] = useState<CustomerGroup[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("overview")

  useEffect(() => {
    // Simulate API fetch
    setTimeout(() => {
      setCustomer(mockCustomer)
      setAddresses(mockAddresses)
      setOrders(mockOrders)
      setPayments(mockPayments)
      setGroups(mockGroups)
      setIsLoading(false)
    }, 1000)
  }, [])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!customer) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Card className="p-8 text-center">
          <XCircle className="mx-auto h-12 w-12 text-destructive mb-4" />
          <CardTitle>Customer Not Found</CardTitle>
          <CardDescription>
            The customer you're looking for doesn't exist or has been removed.
          </CardDescription>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon"
                onClick={() => router.back()}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Avatar className="h-16 w-16">
            <AvatarFallback className="text-lg">
              {customer.first_name[0]}
              {customer.last_name[0]}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {customer.first_name} {customer.last_name}
            </h1>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Badge variant={customer.metadata.customer_type === "commercial" ? "default" : "secondary"}>
                {customer.metadata.customer_type}
              </Badge>
              <span>•</span>
              <span>Customer since {format(new Date(customer.created_at), "MMM dd, yyyy")}</span>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Edit className="mr-2 h-4 w-4" />
                Edit Customer
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Edit Customer Details</DialogTitle>
                <DialogDescription>
                  Update customer information and preferences.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>First Name</Label>
                    <Input defaultValue={customer.first_name} />
                  </div>
                  <div className="space-y-2">
                    <Label>Last Name</Label>
                    <Input defaultValue={customer.last_name} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input defaultValue={customer.email} type="email" />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone</Label>
                    <Input defaultValue={customer.phone} type="tel" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Customer Type</Label>
                  <Select defaultValue={customer.metadata.customer_type}>
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
                  <Textarea defaultValue={customer.metadata.notes} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline">Cancel</Button>
                <Button>Save Changes</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem>
                <Download className="mr-2 h-4 w-4" />
                Export Data
              </DropdownMenuItem>
              <DropdownMenuItem>
                <RefreshCw className="mr-2 h-4 w-4" />
                Reset Password
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Customer
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Credit Balance</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₱{customer.metadata.credit_balance.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              Available credits for purchases
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Borrowed Jugs</CardTitle>
            <Container className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{customer.metadata.borrowed_jags}</div>
            <p className="text-xs text-muted-foreground">
              Currently borrowed containers
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Lifetime Purchases</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₱{customer.metadata.lifetime_purchases.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              Total purchases to date
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Total Jugs Borrowed</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{customer.metadata.total_jags_borrowed}</div>
            <p className="text-xs text-muted-foreground">
              Historical container count
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 lg:w-[600px]">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="payments">Payments & Credits</TabsTrigger>
          <TabsTrigger value="addresses">Addresses</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Customer Information */}
            <Card>
              <CardHeader>
                <CardTitle>Customer Information</CardTitle>
                <CardDescription>Contact details and preferences</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{customer.email}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{customer.phone}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      Joined {format(new Date(customer.created_at), "MMMM dd, yyyy")}
                    </span>
                  </div>
                </div>

                <Separator />

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Account Status</span>
                    <Badge variant={customer.has_account ? "default" : "secondary"}>
                      {customer.has_account ? "Active Account" : "Guest"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Preferred Payment</span>
                    <Badge variant="outline" className="uppercase">
                      {customer.metadata.preferred_payment}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Customer Type</span>
                    <Badge variant={customer.metadata.customer_type === "commercial" ? "default" : "secondary"}>
                      {customer.metadata.customer_type}
                    </Badge>
                  </div>
                </div>

                {customer.metadata.notes && (
                  <>
                    <Separator />
                    <div>
                      <h4 className="text-sm font-medium mb-2">Notes</h4>
                      <p className="text-sm text-muted-foreground">
                        {customer.metadata.notes}
                      </p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Credit & Jugs Management */}
            <Card>
              <CardHeader>
                <CardTitle>Credit & Container Management</CardTitle>
                <CardDescription>Manage credits and borrowed jugs</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  {/* Credit Balance */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label>Credit Balance</Label>
                      <span className="text-lg font-bold">
                        ₱{customer.metadata.credit_balance.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button size="sm" className="flex-1">
                            <Plus className="mr-2 h-4 w-4" />
                            Add Credits
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Add Credits</DialogTitle>
                            <DialogDescription>
                              Add credit balance to customer account.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <div className="space-y-2">
                              <Label>Amount (₱)</Label>
                              <Input type="number" placeholder="0.00" />
                            </div>
                            <div className="space-y-2">
                              <Label>Payment Method</Label>
                              <Select>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select payment method" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="cash">Cash</SelectItem>
                                  <SelectItem value="gcash">GCash</SelectItem>
                                  <SelectItem value="maya">Maya</SelectItem>
                                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label>Reference Number</Label>
                              <Input placeholder="Optional reference" />
                            </div>
                          </div>
                          <DialogFooter>
                            <Button variant="outline">Cancel</Button>
                            <Button>Add Credits</Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>

                      <Dialog>
                        <DialogTrigger asChild>
                          <Button size="sm" variant="outline" className="flex-1">
                            <Minus className="mr-2 h-4 w-4" />
                            Use Credits
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Use Credits</DialogTitle>
                            <DialogDescription>
                              Deduct credits for purchases or payments.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <div className="space-y-2">
                              <Label>Amount (₱)</Label>
                              <Input type="number" placeholder="0.00" />
                            </div>
                            <div className="space-y-2">
                              <Label>Purpose</Label>
                              <Select>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select purpose" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="purchase">Water Purchase</SelectItem>
                                  <SelectItem value="delivery">Delivery Fee</SelectItem>
                                  <SelectItem value="other">Other</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <DialogFooter>
                            <Button variant="outline">Cancel</Button>
                            <Button>Deduct Credits</Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>

                  <Separator />

                  {/* Borrowed Jugs */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label>Borrowed Jugs</Label>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold">
                          {customer.metadata.borrowed_jags}
                        </span>
                        <span className="text-sm text-muted-foreground">jugs</span>
                      </div>
                    </div>
                    <Progress 
                      value={(customer.metadata.borrowed_jags / 10) * 100} 
                      className="h-2" 
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Total borrowed historically: {customer.metadata.total_jags_borrowed}
                    </p>
                    <div className="flex gap-2 mt-3">
                      <Button size="sm" variant="outline" className="flex-1">
                        <Plus className="mr-2 h-4 w-4" />
                        Borrow Jugs
                      </Button>
                      <Button size="sm" variant="outline" className="flex-1">
                        <Minus className="mr-2 h-4 w-4" />
                        Return Jugs
                      </Button>
                    </div>
                  </div>

                  <Separator />

                  {/* Quick Actions */}
                  <div>
                    <Label className="mb-2 block">Quick Actions</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <Button variant="outline" size="sm">
                        <ShoppingCart className="mr-2 h-4 w-4" />
                        New Order
                      </Button>
                      <Button variant="outline" size="sm">
                        <History className="mr-2 h-4 w-4" />
                        View History
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Customer Groups */}
          <Card>
            <CardHeader>
              <CardTitle>Customer Groups</CardTitle>
              <CardDescription>Manage group memberships</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {groups.map((group) => (
                  <Badge key={group.id} variant="secondary" className="text-sm py-1">
                    {group.name}
                    <button className="ml-2 hover:text-destructive">×</button>
                  </Badge>
                ))}
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Plus className="mr-2 h-3 w-3" />
                      Add Group
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add to Group</DialogTitle>
                      <DialogDescription>
                        Select a customer group to add this customer to.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Select group" />
                        </SelectTrigger>
                        <SelectContent>
                          {groups.map((group) => (
                            <SelectItem key={group.id} value={group.id}>
                              {group.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <DialogFooter>
                      <Button variant="outline">Cancel</Button>
                      <Button>Add to Group</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardContent>
          </Card>

          {/* Recent Orders */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Orders</CardTitle>
              <CardDescription>Latest 5 orders</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order ID</TableHead>
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
                      <TableCell>{order.items.length} items</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            order.status === "delivered"
                              ? "default"
                              : order.status === "processing"
                              ? "secondary"
                              : "destructive"
                          }
                        >
                          {order.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">₱{order.total.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Orders Tab */}
        <TabsContent value="orders" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                  <CardTitle>Order History</CardTitle>
                  <CardDescription>All orders and transactions</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <Filter className="mr-2 h-4 w-4" />
                    Filter
                  </Button>
                  <Button variant="outline" size="sm">
                    <Download className="mr-2 h-4 w-4" />
                    Export
                  </Button>
                  <Button size="sm">
                    <ShoppingCart className="mr-2 h-4 w-4" />
                    New Order
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Jugs</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead></TableHead>
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
                        <Badge variant="outline">
                          {order.metadata.delivery_type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {order.items.map((item, idx) => (
                          <div key={idx} className="text-sm">
                            {item.quantity}x {item.title}
                          </div>
                        ))}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm space-y-1">
                          {order.metadata.jags_borrowed > 0 && (
                            <div className="flex items-center gap-1 text-green-600">
                              <Plus className="h-3 w-3" />
                              {order.metadata.jags_borrowed} borrowed
                            </div>
                          )}
                          {order.metadata.jags_returned > 0 && (
                            <div className="flex items-center gap-1 text-blue-600">
                              <Minus className="h-3 w-3" />
                              {order.metadata.jags_returned} returned
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            order.status === "delivered"
                              ? "default"
                              : order.status === "processing"
                              ? "secondary"
                              : "destructive"
                          }
                        >
                          {order.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">₱{order.total.toFixed(2)}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payments Tab */}
        <TabsContent value="payments" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Payment History */}
            <Card>
              <CardHeader>
                <CardTitle>Payment History</CardTitle>
                <CardDescription>All payment transactions</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell>
                          {format(new Date(payment.created_at), "MMM dd, yyyy")}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="uppercase">
                            {payment.metadata.payment_type}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {payment.metadata.reference}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              payment.status === "captured"
                                ? "default"
                                : "secondary"
                            }
                          >
                            {payment.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          ₱{payment.amount.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Credit Management */}
            <Card>
              <CardHeader>
                <CardTitle>Credit Management</CardTitle>
                <CardDescription>Top-up and credit transactions</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Available Balance</span>
                    <span className="text-3xl font-bold">
                      ₱{customer.metadata.credit_balance.toFixed(2)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <TrendingUp className="mx-auto h-8 w-8 text-green-500 mb-2" />
                          <div className="text-2xl font-bold text-green-500">
                            ₱750.00
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Total Top-ups
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <TrendingDown className="mx-auto h-8 w-8 text-red-500 mb-2" />
                          <div className="text-2xl font-bold text-red-500">
                            ₱500.00
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Total Used
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="flex gap-2">
                    <Button className="flex-1">
                      <Plus className="mr-2 h-4 w-4" />
                      Add Credits
                    </Button>
                    <Button variant="outline" className="flex-1">
                      <History className="mr-2 h-4 w-4" />
                      View History
                    </Button>
                  </div>
                </div>

                <Separator />

                {/* Recent Credit Transactions */}
                <div>
                  <h4 className="text-sm font-medium mb-3">Recent Credit Transactions</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">Credit Top-up</p>
                        <p className="text-xs text-muted-foreground">Jan 10, 2024</p>
                      </div>
                      <span className="text-sm font-bold text-green-500">
                        +₱500.00
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">Purchase Payment</p>
                        <p className="text-xs text-muted-foreground">Jan 15, 2024</p>
                      </div>
                      <span className="text-sm font-bold text-red-500">
                        -₱150.00
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Addresses Tab */}
        <TabsContent value="addresses" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Customer Addresses</CardTitle>
                  <CardDescription>Delivery and billing addresses</CardDescription>
                </div>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="mr-2 h-4 w-4" />
                      Add Address
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                      <DialogTitle>Add New Address</DialogTitle>
                      <DialogDescription>
                        Add a new delivery or billing address for this customer.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="space-y-2">
                        <Label>Address Line 1</Label>
                        <Input placeholder="House number, street name" />
                      </div>
                      <div className="space-y-2">
                        <Label>Address Line 2</Label>
                        <Input placeholder="Barangay, subdivision (optional)" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>City</Label>
                          <Input placeholder="City" />
                        </div>
                        <div className="space-y-2">
                          <Label>Province</Label>
                          <Input placeholder="Province" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
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
                        <Input placeholder="Nearby landmark for easy delivery" />
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
                      <div className="absolute top-2 right-2">
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

                      <div className="space-y-3">
                        <div className="flex items-start gap-3">
                          <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                          <div>
                            <p className="font-medium">{address.address_1}</p>
                            {address.address_2 && (
                              <p className="text-sm text-muted-foreground">
                                {address.address_2}
                              </p>
                            )}
                            <p className="text-sm text-muted-foreground">
                              {address.city}, {address.province} {address.postal_code}
                            </p>
                          </div>
                        </div>

                        {address.metadata.landmark && (
                          <div className="flex items-center gap-2 text-sm">
                            <AlertCircle className="h-4 w-4 text-muted-foreground" />
                            <span className="text-muted-foreground">
                              Landmark: {address.metadata.landmark}
                            </span>
                          </div>
                        )}

                        {address.metadata.delivery_instructions && (
                          <div className="flex items-start gap-2 text-sm">
                            <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5" />
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
                  <div className="text-center py-8">
                    <MapPin className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No addresses found</h3>
                    <p className="text-sm text-muted-foreground">
                      Add delivery addresses to make ordering easier.
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}