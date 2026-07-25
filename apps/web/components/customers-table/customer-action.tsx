// components/customers/customer-actions.tsx
"use client";

import React, { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Eye,
  Edit,
  Send,
  ShoppingBag,
  Tag,
  Copy,
  Trash2,
  Mail,
  Phone,
  MapPin,
  Calendar,
  DollarSign,
  Star,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Clock,
  TrendingUp,
  Users,
  Building,
  ExternalLink,
  Printer,
  Download,
  RefreshCw,
  Menu,
  MoreVertical,
  Info,
  User,
  Globe,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { Switch } from "../ui/switch";
import { Checkbox } from "../ui/checkbox";
import { CustomerLocationModal } from "./customer-location";

const SMS_URL = process.env.SMS_URL || 'https://sms.sharewin.pro';

// Types
interface CustomerRow {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  metadata: any;
  created_at: string;
  updated_at: string;
  totalOrders?: number;
  totalSpent?: number;
  lastOrderDate?: string | null;
  status?: string;
  tags?: string[];
}

interface Order {
  id: string;
  display_id: number;
  created_at: string;
  total: number;
  status: string;
  items: any[];
}

interface ActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: CustomerRow;
  onActionComplete?: () => void;
}

// Helper functions
const getFullName = (customer: CustomerRow): string => {
  const firstName = customer.first_name || "";
  const lastName = customer.last_name || "";
  if (firstName || lastName) return `${firstName} ${lastName}`.trim();
  return "No name provided";
};

const getInitials = (customer: CustomerRow): string => {
  const firstName = customer.first_name || "";
  const lastName = customer.last_name || "";
  if (firstName || lastName) {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  }
  return customer.email.charAt(0).toUpperCase();
};

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
  }).format(amount);
};

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const formatDateTime = (dateString: string): string => {
  return new Date(dateString).toLocaleString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

// 1. View Customer Details Modal
export function ViewCustomerModal({ isOpen, onClose, customer }: ActionModalProps) {
  const isMobile = useIsMobile();
  const totalSpent = customer.metadata?.total_spent || customer.totalSpent || 0;
  const totalOrders = customer.metadata?.order_count || customer.totalOrders || 0;
  const lastOrderDate = customer.metadata?.last_order_date || customer.lastOrderDate;

  const Content = () => (
    <div className="space-y-6">
      {/* Customer Header */}
      <div className="flex items-start gap-4">
        <Avatar className="h-16 w-16">
          <AvatarImage src={`https://avatar.vercel.sh/${customer.email}`} />
          <AvatarFallback className="text-lg">{getInitials(customer)}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <h3 className="text-xl font-semibold">{getFullName(customer)}</h3>
          <p className="text-sm text-muted-foreground">{customer.email}</p>
          {customer.phone && (
            <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
              <Phone className="size-3.5" />
              {customer.phone}
            </p>
          )}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardHeader className="p-3">
            <CardTitle className="text-xs text-muted-foreground">Total Spent</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <p className="text-lg font-bold">{formatCurrency(totalSpent)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="p-3">
            <CardTitle className="text-xs text-muted-foreground">Total Orders</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <p className="text-lg font-bold">{totalOrders}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="p-3">
            <CardTitle className="text-xs text-muted-foreground">Joined</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <p className="text-sm font-medium">{formatDate(customer.created_at)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="p-3">
            <CardTitle className="text-xs text-muted-foreground">Last Order</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <p className="text-sm font-medium">{lastOrderDate ? formatDate(lastOrderDate) : "No orders"}</p>
          </CardContent>
        </Card>
      </div>

      {/* Contact & Account Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <Mail className="size-4 text-muted-foreground" />
              <span>{customer.email}</span>
            </div>
            {customer.phone && (
              <div className="flex items-center gap-2">
                <Phone className="size-4 text-muted-foreground" />
                <span>{customer.phone}</span>
              </div>
            )}
            {customer.metadata?.city && (
              <div className="flex items-center gap-2">
                <MapPin className="size-4 text-muted-foreground" />
                <span>{customer.metadata.city}</span>
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Account Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Role:</span>
              <Badge variant="outline">{customer.metadata?.role || "customer"}</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status:</span>
              <Badge>{customer.status || "active"}</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Created:</span>
              <span>{formatDateTime(customer.created_at)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tags */}
      {(customer.metadata?.tags?.length > 0 || customer.tags?.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Tags</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-1.5">
            {(customer.metadata?.tags || customer.tags || []).map((tag: string) => (
              <Badge key={tag} variant="secondary">{tag}</Badge>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={onClose}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Customer Details</DrawerTitle>
            <DrawerDescription>View customer information and account details.</DrawerDescription>
          </DrawerHeader>
          <div className="px-4 pb-4">
            <Content />
          </div>
          <DrawerFooter>
            <DrawerClose asChild>
              <Button variant="outline">Close</Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Customer Details</DialogTitle>
          <DialogDescription>View customer information and account details.</DialogDescription>
        </DialogHeader>
        <Content />
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// 2. Edit Customer Modal
export function EditCustomerModal({ isOpen, onClose, customer, onActionComplete }: ActionModalProps) {
  const [formData, setFormData] = useState({
    first_name: customer.first_name || "",
    last_name: customer.last_name || "",
    phone: customer.phone || "",
    city: customer.metadata?.city || "",
    role: customer.metadata?.role || "customer",
    status: customer.status || "active",
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      // API call to update customer
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success("Customer updated successfully");
      onActionComplete?.();
      onClose();
    } catch (error) {
      toast.error("Failed to update customer");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Customer</DialogTitle>
          <DialogDescription>Update customer information.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_name">First Name</Label>
                <Input
                  id="first_name"
                  value={formData.first_name}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">Last Name</Label>
                <Input
                  id="last_name"
                  value={formData.last_name}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <select
                  id="role"
                  className="w-full px-3 py-2 border rounded-md"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                >
                  <option value="customer">Customer</option>
                  <option value="company">Company</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <select
                  id="status"
                  className="w-full px-3 py-2 border rounded-md"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                >
                  <option value="active">Active</option>
                  <option value="vip">VIP</option>
                  <option value="at_risk">At Risk</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" type="button" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// 3. View Order History Modal
export function OrderHistoryModal({ isOpen, onClose, customer }: ActionModalProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  React.useEffect(() => {
    if (isOpen) {
      // Fetch orders from API
      const fetchOrders = async () => {
        setIsLoading(true);
        try {
          // Simulate API call
          await new Promise(resolve => setTimeout(resolve, 1000));
          setOrders([
            {
              id: "1",
              display_id: 1001,
              created_at: "2024-01-15T10:30:00Z",
              total: 2500,
              status: "completed",
              items: [{ name: "Product 1", quantity: 2, price: 1250 }],
            },
            {
              id: "2",
              display_id: 1002,
              created_at: "2024-01-10T14:20:00Z",
              total: 1800,
              status: "processing",
              items: [{ name: "Product 2", quantity: 1, price: 1800 }],
            },
          ]);
        } catch (error) {
          toast.error("Failed to load orders");
        } finally {
          setIsLoading(false);
        }
      };
      fetchOrders();
    }
  }, [isOpen]);

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      completed: "bg-green-100 text-green-800",
      processing: "bg-blue-100 text-blue-800",
      pending: "bg-yellow-100 text-yellow-800",
      canceled: "bg-red-100 text-red-800",
      refunded: "bg-gray-100 text-gray-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Order History</DialogTitle>
          <DialogDescription>
            View all orders for {getFullName(customer)}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <RefreshCw className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <ShoppingBag className="size-12 mx-auto mb-4 opacity-50" />
              <p>No orders found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order #</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">#{order.display_id}</TableCell>
                    <TableCell>{formatDate(order.created_at)}</TableCell>
                    <TableCell>{order.items.length} items</TableCell>
                    <TableCell>{formatCurrency(order.total)}</TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(order.status)} variant="outline">
                        {order.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm">
                        <Eye className="size-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
          <Button variant="outline">
            <Download className="size-4 mr-2" />
            Export
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// 4. Send Email Modal
export function SendEmailModal({ isOpen, onClose, customer }: ActionModalProps) {
  const [emailData, setEmailData] = useState({
    subject: "",
    message: "",
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      // API call to send email
      await new Promise(resolve => setTimeout(resolve, 1500));
      toast.success("Email sent successfully");
      onClose();
    } catch (error) {
      toast.error("Failed to send email");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Send Email</DialogTitle>
          <DialogDescription>
            Send an email to {customer.email}.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                value={emailData.subject}
                onChange={(e) => setEmailData({ ...emailData, subject: e.target.value })}
                placeholder="Enter email subject"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                value={emailData.message}
                onChange={(e) => setEmailData({ ...emailData, message: e.target.value })}
                placeholder="Write your message here..."
                rows={6}
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" type="button" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Sending..." : <><Send className="size-4 mr-2" /> Send Email</>}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Send SMS Modal - Single Customer with API Integration
interface SendSMSModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: {
    id: string;
    name: string;
    phone: string;
    email?: string;
  };
}

export function SendSMSModal({ isOpen, onClose, customer }: SendSMSModalProps) {
  const [smsData, setSmsData] = useState({
    message: "",
    isFlashMessage: false,
  });
  const [isLoading, setIsLoading] = useState(false);
  const maxLength = 600;

  const sendSMS = async (phoneNumber: string, message: string, isFlash: boolean) => {
    // Remove any non-numeric characters from phone number
    const cleanNumber = phoneNumber.replace(/\D/g, '');
    
    // Construct the payload according to the specified format
    const payload = {
      number: cleanNumber,
      message: message,
      phoneNumber: cleanNumber
    };

    // Select endpoint based on flash message toggle
    const endpoint = isFlash 
      ? `${SMS_URL}/api/sms/send-flash`
        : `${SMS_URL}/api/sms/send`;

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('SMS API Error:', error);
      throw error;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!smsData.message.trim()) {
      toast.error("Please enter a message");
      return;
    }

    if (!customer.phone) {
      toast.error("Customer phone number is missing");
      return;
    }

    setIsLoading(true);
    try {
      await sendSMS(
        customer.phone, 
        smsData.message, 
        smsData.isFlashMessage
      );
      
      toast.success(
        `SMS ${smsData.isFlashMessage ? '(Flash) ' : ''}sent to ${customer.name} successfully`
      );
      onClose();
      // Reset form
      setSmsData({ message: "", isFlashMessage: false });
    } catch (error: any) {
      console.error('Failed to send SMS:', error);
      
      // Provide more specific error messages
      if (error.message.includes('404')) {
        toast.error("SMS service endpoint not found. Please check the URL configuration.");
      } else if (error.message.includes('500')) {
        toast.error("Server error. Please try again later.");
      } else if (error.message.includes('Network')) {
        toast.error("Network error. Please check your internet connection.");
      } else {
        toast.error(`Failed to send SMS: ${error.message || 'Unknown error'}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const remainingChars = maxLength - smsData.message.length;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Send SMS</DialogTitle>
          <DialogDescription>
            Send an SMS message to {customer.name} ({customer.phone}).
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {/* Customer Info */}
            <div className="bg-muted/50 rounded-md p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <User className="size-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">{customer.name}</p>
                  <p className="text-xs text-muted-foreground">{customer.phone}</p>
                </div>
              </div>
              <Badge variant="secondary" className="text-xs">
                {smsData.isFlashMessage ? 'Flash SMS' : 'Standard SMS'}
              </Badge>
            </div>

            {/* Message Content */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="message">Message</Label>
                <span className={`text-xs ${
                  remainingChars < 50 ? 'text-orange-500' : 'text-muted-foreground'
                }`}>
                  {remainingChars} characters remaining
                </span>
              </div>
              <Textarea
                id="message"
                value={smsData.message}
                onChange={(e) => {
                  if (e.target.value.length <= maxLength) {
                    setSmsData({ ...smsData, message: e.target.value });
                  }
                }}
                placeholder="Write your SMS message here..."
                rows={5}
                required
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">
                Maximum {maxLength} characters
              </p>
            </div>

            {/* Flash Message Toggle */}
            <div className="flex items-center space-x-2">
              <Switch
                id="flash-message"
                checked={smsData.isFlashMessage}
                onCheckedChange={(checked) =>
                  setSmsData({ ...smsData, isFlashMessage: checked })
                }
              />
              <Label htmlFor="flash-message" className="text-sm cursor-pointer">
                Send as Flash Message
              </Label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="size-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs text-xs">
                    Flash messages appear directly on the recipient's screen 
                    without being saved to their inbox. Uses a different endpoint.
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>

            {/* Endpoint Info */}
            <div className="bg-blue-50 dark:bg-blue-950/20 rounded-md p-2">
              <p className="text-xs text-blue-700 dark:text-blue-300">
                <Globe className="size-3 inline mr-1" />
                {smsData.isFlashMessage 
                  ? `Sending via: ${SMS_URL}/api/sms/send-flash`
                  : `Sending via: ${SMS_URL}/api/sms/send`}
              </p>
            </div>
          </div>

          <DialogFooter className="flex items-center justify-between gap-2">
            <div className="text-xs text-muted-foreground">
              Sending to 1 recipient
            </div>
            <div className="flex gap-2">
              <Button variant="outline" type="button" onClick={onClose}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isLoading || !smsData.message.trim()}
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="size-4 animate-spin" />
                    Sending...
                  </span>
                ) : (
                  <>
                    <Send className="size-4 mr-2" />
                    Send SMS
                  </>
                )}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// // 5. Customer Location Map Modal
// export function CustomerLocationModal({ isOpen, onClose, customer }: ActionModalProps) {
//   const location = customer.metadata?.city || "Manila, Philippines";
//   const lat = customer.metadata?.lat || 14.5995;
//   const lng = customer.metadata?.lng || 120.9842;

//   return (
//     <Dialog open={isOpen} onOpenChange={onClose}>
//       <DialogContent className="max-w-4xl">
//         <DialogHeader>
//           <DialogTitle>Customer Location</DialogTitle>
//           <DialogDescription>
//             Location of {getFullName(customer)}.
//           </DialogDescription>
//         </DialogHeader>

//         <div className="space-y-4">
//           <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
//             <MapPin className="size-4 text-primary" />
//             <span className="font-medium">{location}</span>
//           </div>

//           <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
//             {/* Map placeholder - Replace with actual map component */}
//             <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
//               <MapPin className="size-12 mb-2 text-primary/50" />
//               <p className="font-medium">Map View</p>
//               <p className="text-sm">Lat: {lat}, Lng: {lng}</p>
//               <Button variant="outline" className="mt-4" size="sm">
//                 <ExternalLink className="size-4 mr-2" />
//                 Open in Google Maps
//               </Button>
//             </div>
//           </div>

//           <div className="grid grid-cols-2 gap-4 text-sm">
//             <Card>
//               <CardHeader className="p-3">
//                 <CardTitle className="text-xs text-muted-foreground">Latitude</CardTitle>
//               </CardHeader>
//               <CardContent className="p-3 pt-0">
//                 <p className="font-mono">{lat}</p>
//               </CardContent>
//             </Card>
//             <Card>
//               <CardHeader className="p-3">
//                 <CardTitle className="text-xs text-muted-foreground">Longitude</CardTitle>
//               </CardHeader>
//               <CardContent className="p-3 pt-0">
//                 <p className="font-mono">{lng}</p>
//               </CardContent>
//             </Card>
//           </div>
//         </div>

//         <DialogFooter>
//           <Button variant="outline" onClick={onClose}>Close</Button>
//         </DialogFooter>
//       </DialogContent>
//     </Dialog>
//   );
// }

// Main Actions Cell Component
export function ActionsCell({ customer, onAction }: { customer: CustomerRow; onAction?: (action: string, data: any) => void }) {
  const [modalState, setModalState] = useState<{
    type: 'view' | 'edit' | 'orders' | 'email' | 'location' | 'status' | null;
    isOpen: boolean;
  }>({ type: null, isOpen: false });

  const handleAction = (action: string, data?: any) => {
    const actionMap: Record<string, string> = {
      'view': 'view',
      'edit': 'edit',
      'viewOrders': 'orders',
      'sendEmail': 'email',
      'viewLocation': 'location',
      'setStatus': 'status',
    };

    const modalType = actionMap[action] as any;
    if (modalType) {
      setModalState({ type: modalType, isOpen: true });
    }

    if (onAction) {
      onAction(action, { customerId: customer.id, customer, ...data });
    }
  };

  const closeModal = () => {
    setModalState({ type: null, isOpen: false });
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="flex size-8 text-muted-foreground data-[state=open]:bg-muted" size="icon">
            <MoreVertical className="size-4" />
            <span className="sr-only">Open menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          <DropdownMenuItem onClick={() => handleAction('view')}>
            <MoreVertical className="size-4 mr-2" />
            View Details
          </DropdownMenuItem>
          
          <DropdownMenuItem onClick={() => handleAction('edit')}>
            <Edit className="size-4 mr-2" />
            Edit Customer
          </DropdownMenuItem>
          
          <DropdownMenuItem onClick={() => handleAction('viewOrders')}>
            <ShoppingBag className="size-4 mr-2" />
            View Orders
          </DropdownMenuItem>
          
          <DropdownMenuItem onClick={() => handleAction('sendEmail')}>
            <Send className="size-4 mr-2" />
            Send Email
          </DropdownMenuItem>
          
          <DropdownMenuItem onClick={() => handleAction('viewLocation')}>
            <MapPin className="size-4 mr-2" />
            View Location
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Tag className="size-4 mr-2" />
              Change Status
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem onClick={() => handleAction('setStatus', { status: 'active' })}>
                <CheckCircle2 className="size-4 mr-2 text-green-600" />
                Active
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleAction('setStatus', { status: 'vip' })}>
                <Star className="size-4 mr-2 text-amber-600" />
                VIP
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleAction('setStatus', { status: 'at_risk' })}>
                <AlertCircle className="size-4 mr-2 text-red-600" />
                At Risk
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleAction('setStatus', { status: 'inactive' })}>
                <XCircle className="size-4 mr-2 text-gray-600" />
                Inactive
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem onClick={() => {
            navigator.clipboard.writeText(customer.email);
            toast.success("Email copied to clipboard");
          }} className="text-blue-600">
            <Copy className="size-4 mr-2" />
            Copy Email
          </DropdownMenuItem>
          
          <DropdownMenuItem variant="destructive" onClick={() => handleAction('deactivate')}>
            <Trash2 className="size-4 mr-2" />
            Deactivate Account
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Modals */}
      <ViewCustomerModal
        isOpen={modalState.type === 'view' && modalState.isOpen}
        onClose={closeModal}
        customer={customer}
      />
      
      <EditCustomerModal
        isOpen={modalState.type === 'edit' && modalState.isOpen}
        onClose={closeModal}
        customer={customer}
        onActionComplete={() => {
          // Refresh data
        }}
      />
      
      <OrderHistoryModal
        isOpen={modalState.type === 'orders' && modalState.isOpen}
        onClose={closeModal}
        customer={customer}
      />
      
      <SendSMSModal
        isOpen={modalState.type === 'email' && modalState.isOpen}
        onClose={closeModal}
        customer={customer}
      />
      
      <CustomerLocationModal
        isOpen={modalState.type === 'location' && modalState.isOpen}
        onClose={closeModal}
        customer={customer}
      />
    </>
  );
}