// app/(pos)/components/sidebar-cart.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Trash2,
  ShoppingCart,
  Minus,
  Plus,
  Loader2,
  MapPin,
  User,
  UserPlus,
  X,
  CreditCard,
  Save,
  Check,
  Calendar,
  Clock,
  Printer,
  DollarSign,
  Tag,
  Mail,
  Phone,
  Home,
  Search,
  Building2,
  AlertCircle,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { getAuthHeaders } from "@/lib/data/cookies";
import { sdk } from "@/lib/config";
import { SimpleTable } from "./pos-app";
import { PrintDialog } from "./print-dialog";
import { Separator } from "@/components/ui/separator";
import { listBarangays, listMunicipalities } from "@/lib/actions/regions";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { createQuickCustomer } from "@/lib/actions";
import { listCustomerGroupCustomers, listCustomers } from "@/lib/data/customer";

// Types
interface CartItem {
  id: string;
  product_id: string;
  variant_id: string;
  title: string;
  thumbnail: string | null;
  quantity: number;
  unit_price: number;
  original_unit_price?: number;
  variant_title?: string;
  subtotal: number;
  is_custom_priced?: boolean;
}

interface Region {
  id: string;
  name: string;
  currency_code: string;
  tax_rate: number;
}

interface Customer {
  id: string;
  first_name: string;
  last_name?: string;
  email?: string;
  phone?: string;
  address?: string;
  municipality?: string;
  barangay?: string;
}

interface Municipality {
  id: string;
  psgc_code: string;
  name: string;
  citymun_desc: string;
  reg_desc: string;
  prov_code: string;
  citymun_code: string;
}

interface Barangay {
  id: string;
  psgc_code: string;
  name: string;
  barangay_desc: string;
  reg_desc: string;
  prov_code: string;
  citymun_code: string;
}

// Multi-Table Selector Component
function MultiTableSelector({ 
  selectedTableIds, 
  onTablesChange,
  disabledTables = []
}: { 
  selectedTableIds: string[];
  onTablesChange: (tableIds: string[]) => void;
  disabledTables?: string[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [availableTables, setAvailableTables] = useState<SimpleTable[]>([]);

  useEffect(() => {
    const loadTables = () => {
      const stored = localStorage.getItem("simple-tables");
      if (stored) {
        setAvailableTables(JSON.parse(stored));
      } else {
        // Initialize 10 default tables if none exist
        const defaultTables: SimpleTable[] = [];
        for (let i = 1; i <= 10; i++) {
          let capacity = 4;
          if (i === 9 || i === 10) capacity = 8;
          if (i === 1 || i === 2) capacity = 2;
          
          defaultTables.push({
            id: `table-${i}`,
            name: `Table ${i}`,
            number: i.toString(),
            capacity: capacity,
            status: "available",
          });
        }
        localStorage.setItem("simple-tables", JSON.stringify(defaultTables));
        setAvailableTables(defaultTables);
      }
    };
    
    loadTables();
    window.addEventListener("storage", loadTables);
    return () => window.removeEventListener("storage", loadTables);
  }, []);

  const getTableName = (id: string) => {
    const table = availableTables.find(t => t.id === id);
    return table?.name || id;
  };

  const toggleTable = (tableId: string) => {
    if (selectedTableIds.includes(tableId)) {
      onTablesChange(selectedTableIds.filter(id => id !== tableId));
    } else {
      onTablesChange([...selectedTableIds, tableId]);
    }
  };

  const isTableDisabled = (table: SimpleTable) => {
    if (disabledTables.includes(table.id)) return true;
    if (table.status === "occupied" && !selectedTableIds.includes(table.id)) return true;
    if (table.status === "reserved" && !selectedTableIds.includes(table.id)) return true;
    return false;
  };

  const getTableStatusBadge = (table: SimpleTable) => {
    if (table.status === "occupied") return { text: "Occupied", className: "bg-red-100 text-red-700" };
    if (table.status === "reserved") return { text: "Reserved", className: "bg-yellow-100 text-yellow-700" };
    if (table.status === "cleaning") return { text: "Cleaning", className: "bg-blue-100 text-blue-700" };
    return { text: "Available", className: "bg-green-100 text-green-700" };
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium">Tables ({selectedTableIds.length})</label>
        <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setIsOpen(true)}>
          <MapPin className="mr-1 h-3 w-3" />
          {selectedTableIds.length > 0 ? "Change" : "Select"}
        </Button>
      </div>

      {selectedTableIds.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {selectedTableIds.map(id => (
            <Badge key={id} variant="secondary" className="gap-1 text-xs">
              <MapPin className="h-2 w-2" />
              {getTableName(id)}
              <button onClick={() => onTablesChange(selectedTableIds.filter(tid => tid !== id))} className="ml-1 hover:text-destructive">
                <X className="h-2 w-2" />
              </button>
            </Badge>
          ))}
        </div>
      ) : (
        <div className="text-xs text-muted-foreground">No tables assigned</div>
      )}

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Select Tables</DialogTitle>
            <DialogDescription>Choose one or more tables for this order</DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[60vh] pr-4">
            <div className="space-y-2">
              {availableTables.map(table => {
                const isSelected = selectedTableIds.includes(table.id);
                const isDisabled = isTableDisabled(table);
                const statusBadge = getTableStatusBadge(table);
                
                return (
                  <button
                    key={table.id}
                    onClick={() => !isDisabled && toggleTable(table.id)}
                    disabled={isDisabled}
                    className={cn(
                      "w-full p-3 rounded-lg border text-left transition-all",
                      isSelected && "border-primary bg-primary/5",
                      isDisabled && "opacity-50 cursor-not-allowed bg-muted",
                      !isDisabled && !isSelected && "hover:border-primary/50 hover:bg-accent"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{table.name}</span>
                          <Badge className={cn("text-[10px]", statusBadge.className)}>
                            {statusBadge.text}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Capacity: {table.capacity} pax
                        </div>
                        {table.status === "occupied" && table.customer_name && (
                          <div className="text-xs text-muted-foreground mt-1">
                            Customer: {table.customer_name}
                          </div>
                        )}
                        {table.status === "reserved" && table.reserved_name && (
                          <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                            <Calendar className="h-2 w-2" />
                            Reserved for: {table.reserved_name}
                          </div>
                        )}
                      </div>
                      {isSelected && <Check className="h-4 w-4 text-primary" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Simplified Create Customer Form Component (No advanced search)
function CreateCustomerForm({ 
  onCustomerCreated,
  onCancel,
  user
}: { 
  onCustomerCreated: (customer: Customer) => void;
  onCancel: () => void;
  user?: any
}) {
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    phone: "",
    email: "",
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const customerGroupId = user?.metadata?.role === 'company' 
    ? user.employee?.company?.customer_group_id 
    : user?.driver?.customer_group_id;

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    // First name validation
    if (!formData.first_name.trim()) {
      newErrors.first_name = "First name is required";
    } else if (formData.first_name.length < 2) {
      newErrors.first_name = "First name must be at least 2 characters";
    } else if (formData.first_name.length > 50) {
      newErrors.first_name = "First name must be less than 50 characters";
    }
    
    // Last name validation (optional)
    if (formData.last_name && formData.last_name.length > 50) {
      newErrors.last_name = "Last name must be less than 50 characters";
    }
    
    // Phone validation
    const phoneRegex = /^[0-9]{10,11}$/;
    const cleanPhone = formData.phone.replace(/\D/g, '');
    if (!formData.phone) {
      newErrors.phone = "Phone number is required";
    } else if (!phoneRegex.test(cleanPhone)) {
      newErrors.phone = "Please enter a valid phone number (10-11 digits)";
    }
    
    // Email validation (optional)
    if (formData.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        newErrors.email = "Please enter a valid email address";
      } else if (formData.email.length > 100) {
        newErrors.email = "Email must be less than 100 characters";
      }
    }
    
    return newErrors;
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }));
    }
  };

  const handleBlur = (field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  const handleSubmit = async () => {
    // Mark all fields as touched
    const allFields = ['first_name', 'phone'];
    if (formData.email) allFields.push('email');
    if (formData.last_name) allFields.push('last_name');
    
    const touchedState: Record<string, boolean> = {};
    allFields.forEach(field => { touchedState[field] = true; });
    setTouched(touchedState);
    
    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsLoading(true);
    setErrors({});
    
    try {
      // Generate a temporary email if not provided
      const tempEmail = formData.email || `${Date.now()}-${formData.first_name.toLowerCase()}@temp.customer.com`;
      
      const response = await createQuickCustomer({
        customer_group_id: customerGroupId,
        email: tempEmail,
        first_name: formData.first_name,
        last_name: formData.last_name || "",
        phone: formData.phone,
      });


      console.log(response, 'RESPSSS')
      if (response.customer) {
        onCustomerCreated({
          id: response.customer.id,
          first_name: response.customer.first_name,
          last_name: response.customer.last_name,
          email: response.customer.email,
          phone: response.customer.phone,
        });
      }
    } catch (error: any) {
      console.error("Error creating customer:", error);
      
      if (error.message?.includes("already exists") || error.status === 500) {
        setErrors({ general: "A customer with this phone number already exists. Please search for existing customer." });
      } else if (error.message?.includes("phone")) {
        setErrors({ phone: "This phone number is already registered. Please use a different number." });
      } else {
        setErrors({ general: "Failed to create customer. Please try again." });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h3 className="font-medium text-sm">Create New Customer</h3>
        <p className="text-xs text-muted-foreground mt-1">Enter customer details below</p>
      </div>

      {/* General Error Alert */}
      {errors.general && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-red-600 mt-0.5" />
            <p className="text-sm text-red-800">{errors.general}</p>
          </div>
        </div>
      )}

      {/* Name Fields */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className={errors.first_name && touched.first_name ? "text-red-600" : ""}>
            First Name <span className="text-red-500">*</span>
          </Label>
          <Input
            value={formData.first_name}
            onChange={(e) => handleInputChange('first_name', e.target.value)}
            onBlur={() => handleBlur('first_name')}
            placeholder="John"
            className={errors.first_name && touched.first_name ? "border-red-500" : ""}
          />
          {errors.first_name && touched.first_name && (
            <p className="text-xs text-red-500 mt-1">{errors.first_name}</p>
          )}
        </div>
        <div>
          <Label>Last Name</Label>
          <Input
            value={formData.last_name}
            onChange={(e) => handleInputChange('last_name', e.target.value)}
            onBlur={() => handleBlur('last_name')}
            placeholder="Doe"
          />
          {errors.last_name && touched.last_name && (
            <p className="text-xs text-red-500 mt-1">{errors.last_name}</p>
          )}
        </div>
      </div>

      {/* Contact Fields */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className={errors.phone && touched.phone ? "text-red-600" : ""}>
            Phone Number <span className="text-red-500">*</span>
          </Label>
          <Input
            type="tel"
            value={formData.phone}
            onChange={(e) => handleInputChange('phone', e.target.value)}
            onBlur={() => handleBlur('phone')}
            placeholder="09123456789"
            className={errors.phone && touched.phone ? "border-red-500" : ""}
          />
          {errors.phone && touched.phone && (
            <p className="text-xs text-red-500 mt-1">{errors.phone}</p>
          )}
        </div>
        <div>
          <Label>Email <span className="text-gray-400 text-xs">(Optional)</span></Label>
          <Input
            type="email"
            value={formData.email}
            onChange={(e) => handleInputChange('email', e.target.value)}
            onBlur={() => handleBlur('email')}
            placeholder="customer@example.com"
          />
          {errors.email && touched.email && (
            <p className="text-xs text-red-500 mt-1">{errors.email}</p>
          )}
        </div>
      </div>

      <div className="flex gap-2 pt-2">
        <Button variant="outline" onClick={onCancel} className="flex-1">
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={isLoading} className="flex-1">
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Create Customer
        </Button>
      </div>
    </div>
  );
}

function CustomerSelector({ selectedCustomer, onSelectCustomer, onClear, user }: CustomerSelectorProps) {
  const customerGroupId = user?.metadata?.role === 'company' 
    ? user.employee?.company?.customer_group_id 
    : user?.driver?.customer_group_id;
    
  const [isOpen, setIsOpen] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [pagination, setPagination] = useState({ total: 0, page: 1, totalPages: 1 });

  // Unified function to fetch customers using listCustomers action
  const fetchCustomers = useCallback(async (params: any = {}) => {
    setIsLoading(true);
    try {
      const response = await listCustomers({
        ...params,
        limit: params.limit || 20,
        include_addresses: true,
        include_groups: true,
      });
      
      if (response?.success && response?.data) {
        setCustomers(response.data);
        setPagination({
          total: response.pagination.total,
          page: response.pagination.page,
          totalPages: response.pagination.totalPages,
        });
        setHasSearched(true);
      } else {
        setCustomers([]);
        setPagination({ total: 0, page: 1, totalPages: 1 });
      }
    } catch (error) {
      console.error("Error fetching customers:", error);
      setCustomers([]);
      setPagination({ total: 0, page: 1, totalPages: 1 });
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Search customers by query
  const searchCustomers = useCallback(async () => {
    if (!searchTerm.trim()) return;
    
    await fetchCustomers({
      search: searchTerm.trim(),
      limit: 20,
    });
  }, [searchTerm, fetchCustomers]);

  // Load initial customers when dialog opens
  useEffect(() => {
    if (isOpen) {
      if (customerGroupId) {
        // Load customers from specific group
        fetchCustomers({
          customer_group_id: customerGroupId,
          limit: 20,
          order: "-created_at",
        });
      } else {
        // Load all customers
        fetchCustomers({
          limit: 20,
          order: "-created_at",
        });
      }
    }
  }, [isOpen, customerGroupId, fetchCustomers]);

  const handleCustomerSelect = (customer: Customer) => {
    onSelectCustomer(customer);
    handleClose();
  };

  const handleClose = () => {
    setIsOpen(false);
    setShowCreateForm(false);
    setSearchTerm("");
    setHasSearched(false);
    setCustomers([]);
    setPagination({ total: 0, page: 1, totalPages: 1 });
  };

  const handleCustomerCreated = (newCustomer: Customer) => {
    onSelectCustomer(newCustomer);
    handleClose();
  };

  const handleBackToSearch = () => {
    setShowCreateForm(false);
    setSearchTerm("");
    // Reload customers when going back
    if (customerGroupId) {
      fetchCustomers({ customer_group_id: customerGroupId, limit: 20 });
    } else {
      fetchCustomers({ limit: 20 });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      searchCustomers();
    }
  };

  const handleLoadMore = () => {
    if (pagination.page < pagination.totalPages) {
      const nextPage = pagination.page + 1;
      const params: any = searchTerm 
        ? { search: searchTerm, page: nextPage, limit: 20 }
        : customerGroupId 
          ? { customer_group_id: customerGroupId, page: nextPage, limit: 20 }
          : { page: nextPage, limit: 20 };
      
      fetchCustomers(params);
    }
  };

  return (
    <>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium">Customer</label>
          <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setIsOpen(true)}>
            <UserPlus className="mr-1 h-3 w-3" />
            {selectedCustomer ? "Change" : "Add"}
          </Button>
        </div>

        {selectedCustomer ? (
          <Badge variant="secondary" className="gap-1 text-xs p-2">
            <User className="h-3 w-3" />
            <span>{selectedCustomer.first_name} {selectedCustomer.last_name}</span>
            {selectedCustomer.phone && <span className="text-muted-foreground">({selectedCustomer.phone})</span>}
            <button onClick={onClear} className="ml-1 hover:text-destructive">
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ) : (
          <div className="text-xs text-muted-foreground">No customer selected</div>
        )}

        <Dialog open={isOpen} onOpenChange={(open) => {
          if (!open) handleClose();
          setIsOpen(open);
        }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {showCreateForm ? "Create New Customer" : "Select Customer"}
              </DialogTitle>
              <DialogDescription>
                {showCreateForm 
                  ? "Enter customer details (First Name, Last Name, Phone - Email optional)" 
                  : "Search for an existing customer or create a new one"}
              </DialogDescription>
            </DialogHeader>
            
            {!showCreateForm ? (
              <div className="space-y-4">
                {/* Search Input */}
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search by name, email, or phone..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      onKeyPress={handleKeyPress}
                      className="pl-7"
                      autoFocus
                    />
                  </div>
                  <Button onClick={searchCustomers} disabled={isLoading || !searchTerm.trim()} size="sm">
                    Search
                  </Button>
                </div>

                {/* Results Count */}
                {hasSearched && !isLoading && (
                  <div className="text-xs text-muted-foreground">
                    Found {pagination.total} customer{pagination.total !== 1 ? 's' : ''}
                  </div>
                )}

                {/* Results */}
                {isLoading && (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                )}
                
                {!isLoading && hasSearched && customers.length > 0 && (
                  <ScrollArea className="h-64">
                    <div className="space-y-2">
                      {customers.map((customer) => (
                        <button
                          key={customer.id}
                          onClick={() => handleCustomerSelect(customer)}
                          className="w-full p-3 rounded-lg border text-left hover:bg-accent transition-colors"
                        >
                          <div className="font-medium">
                            {customer.first_name} {customer.last_name}
                            {customer.company_name && (
                              <span className="text-xs text-muted-foreground ml-2">
                                ({customer.company_name})
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                            {customer.phone && (
                              <div className="flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {customer.phone}
                              </div>
                            )}
                            {customer.email && (
                              <div className="flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                {customer.email}
                              </div>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  </ScrollArea>
                )}

                {/* Load More Button */}
                {!isLoading && hasSearched && customers.length > 0 && pagination.page < pagination.totalPages && (
                  <Button variant="outline" onClick={handleLoadMore} className="w-full">
                    Load More ({pagination.page}/{pagination.totalPages})
                  </Button>
                )}

                {/* No Results */}
                {!isLoading && hasSearched && customers.length === 0 && searchTerm && (
                  <div className="text-center py-6">
                    <p className="text-sm text-muted-foreground mb-3">No customers found matching "{searchTerm}"</p>
                    <Button onClick={() => setShowCreateForm(true)} className="w-full">
                      <UserPlus className="mr-2 h-4 w-4" />
                      Create New Customer
                    </Button>
                  </div>
                )}

                {/* Initial State - No Search */}
                {!isLoading && !hasSearched && (
                  <div className="text-center py-6">
                    <p className="text-sm text-muted-foreground mb-2">
                      {customerGroupId 
                        ? `${pagination.total} customer${pagination.total !== 1 ? 's' : ''} available in this group`
                        : "Enter a name, email, or phone number to search"}
                    </p>
                    {customers.length === 0 && !searchTerm && (
                      <Button variant="outline" onClick={() => setShowCreateForm(true)}>
                        <UserPlus className="mr-2 h-4 w-4" />
                        Or Create New Customer
                      </Button>
                    )}
                  </div>
                )}

                {/* Show existing customers when no search term */}
                {!isLoading && !searchTerm && customers.length > 0 && (
                  <ScrollArea className="h-64">
                    <div className="space-y-2">
                      {customers.map((customer) => (
                        <button
                          key={customer.id}
                          onClick={() => handleCustomerSelect(customer)}
                          className="w-full p-3 rounded-lg border text-left hover:bg-accent transition-colors"
                        >
                          <div className="font-medium">
                            {customer.first_name} {customer.last_name}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {customer.phone || customer.email}
                          </div>
                        </button>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </div>
            ) : (
              <CreateCustomerForm
                onCustomerCreated={handleCustomerCreated}
                onCancel={handleBackToSearch}
                user={user}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}

// Custom Price Input Component
function CustomPriceInput({ item, onApplyCustomPrice, region }: any) {
  const [isEditing, setIsEditing] = useState(false);
  const [customPrice, setCustomPrice] = useState(item.unit_price);
  
  const handleApply = () => {
    onApplyCustomPrice(item.id, item.variant_id, customPrice, item.quantity);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-1 mt-1">
        <Input
          type="number"
          value={customPrice}
          onChange={(e) => setCustomPrice(parseFloat(e.target.value))}
          className="h-6 w-20 text-xs"
          step="0.01"
          min="0"
          autoFocus
        />
        <Button size="sm" className="h-6 px-2 text-xs" onClick={handleApply}>
          Apply
        </Button>
        <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => setIsEditing(false)}>
          Cancel
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 mt-1">
      <p className="text-xs font-semibold text-primary">
        {region?.currency_code?.toUpperCase() || "PHP"} {item.unit_price?.toFixed(2)}
      </p>
      {item.is_custom_priced && (
        <Badge variant="outline" className="text-[10px]">
          <DollarSign className="h-2 w-2 mr-1" />
          Custom
        </Badge>
      )}
      <Button
        variant="ghost"
        size="sm"
        className="h-5 px-1 text-xs"
        onClick={() => setIsEditing(true)}
      >
        <Tag className="h-3 w-3" />
      </Button>
      {item.original_unit_price && item.original_unit_price !== item.unit_price && (
        <p className="text-xs text-muted-foreground line-through">
          {region?.currency_code?.toUpperCase() || "PHP"} {item.original_unit_price.toFixed(2)}
        </p>
      )}
    </div>
  );
}

// Cart Item Component
const CartItemComponent = ({ item, onUpdateQuantity, onRemove, onCustomPrice, region }: any) => (
  <div className="flex gap-2 rounded-lg border bg-card p-2 mb-1">
    <div className="flex-1 min-w-0">
      <h4 className="font-medium text-sm line-clamp-1">{item.title}</h4>
      {item.variant_title && <p className="text-xs text-muted-foreground">{item.variant_title}</p>}
      
      <CustomPriceInput
        item={item}
        onApplyCustomPrice={onCustomPrice}
        region={region}
      />
      
      <div className="flex items-center gap-2 mt-1">
        <p className="text-xs text-muted-foreground">× {item.quantity}</p>
        <p className="text-xs font-semibold">
          = {region?.currency_code?.toUpperCase() || "PHP"} {(item.unit_price * item.quantity).toFixed(2)}
        </p>
      </div>
    </div>
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-1">
        <Button 
          variant="outline" 
          size="icon" 
          className="h-6 w-6" 
          onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
        >
          <Minus className="h-3 w-3" />
        </Button>
        <span className="w-6 text-center text-xs">{item.quantity}</span>
        <Button 
          variant="outline" 
          size="icon" 
          className="h-6 w-6" 
          onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
        >
          <Plus className="h-3 w-3" />
        </Button>
      </div>
      <Button variant="ghost" size="sm" className="h-6 px-1 text-destructive" onClick={() => onRemove(item.id)}>
        <Trash2 className="h-3 w-3" />
      </Button>
    </div>
  </div>
);

// Main Cart Sidebar Component
interface CartSidebarProps {
  cartItems: CartItem[];
  cartTotal: number;
  isLoading: boolean;
  region?: Region;
  selectedTableIds: string[];
  selectedCustomer: Customer | null;
  orderNotes: string;
  onUpdateQuantity: (lineId: string, quantity: number) => Promise<void>;
  onRemoveFromCart: (lineId: string) => Promise<void>;
  onClearCart: () => Promise<void>;
  onTablesChange: (tableIds: string[]) => void;
  onCustomerChange: (customer: Customer | null) => void;
  onNotesChange: (notes: string) => void;
  onCheckout: () => void;
  onSaveDraft: () => Promise<void>;
  onCustomPrice: (itemId: string, variantId: string, price: number, quantity?: number) => Promise<void>;
  cart?: any;
  user?: any;
}

export function CartSidebar({
  cartItems,
  cartTotal,
  isLoading,
  region,
  selectedTableIds,
  selectedCustomer,
  orderNotes,
  onUpdateQuantity,
  onRemoveFromCart,
  onClearCart,
  onTablesChange,
  onCustomerChange,
  onNotesChange,
  onCheckout,
  onSaveDraft,
  onCustomPrice,
  cart,
  user
}: CartSidebarProps) {
  const [occupiedTableIds, setOccupiedTableIds] = useState<string[]>([]);
  const [printOpen, setPrintOpen] = useState(false);

  useEffect(() => {
    const loadOccupiedTables = () => {
      const stored = localStorage.getItem("simple-tables");
      if (stored) {
        const tables = JSON.parse(stored);
        const occupied = tables
          .filter((t: any) => t.status === "occupied" || t.status === "reserved")
          .map((t: any) => t.id);
        setOccupiedTableIds(occupied);
      } else {
        // Initialize 10 default tables if none exist
        const defaultTables: SimpleTable[] = [];
        for (let i = 1; i <= 10; i++) {
          let capacity = 4;
          if (i === 9 || i === 10) capacity = 8;
          if (i === 1 || i === 2) capacity = 2;
          
          defaultTables.push({
            id: `table-${i}`,
            name: `Table ${i}`,
            number: i.toString(),
            capacity: capacity,
            status: "available",
          });
        }
        localStorage.setItem("simple-tables", JSON.stringify(defaultTables));
      }
    };
    
    loadOccupiedTables();
    window.addEventListener("storage", loadOccupiedTables);
    return () => window.removeEventListener("storage", loadOccupiedTables);
  }, []);

  // Calculate pricing summary
  const customPricedItems = cartItems.filter(item => item.is_custom_priced);
  const regularItems = cartItems.filter(item => !item.is_custom_priced);

  // Calculate tax if region has tax rate
  const taxAmount = cartTotal * ((region?.tax_rate || 0) / 100);
  const grandTotal = cartTotal + taxAmount;

  return (
    <>
      <PrintDialog open={printOpen} onOpenChange={setPrintOpen} cart={cart} />
      
      <div className="border-b p-3 flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-4 w-4" />
            <h2 className="font-semibold text-sm">Current Order</h2>
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" className="h-7" onClick={() => setPrintOpen(true)}>
              <Printer className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="sm" className="h-7" onClick={onSaveDraft}>
              <Save className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="sm" className="h-7 text-destructive" onClick={onClearCart}>
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
        
        <MultiTableSelector 
          selectedTableIds={selectedTableIds}
          onTablesChange={onTablesChange}
          disabledTables={occupiedTableIds.filter(id => !selectedTableIds.includes(id))}
        />
        
        <div className="mt-3">
          <CustomerSelector 
            user={user}
            selectedCustomer={selectedCustomer}
            onSelectCustomer={onCustomerChange}
            onClear={() => onCustomerChange(null)}
          />
        </div>

        {/* Pricing Strategy Badge */}
        {cart?.metadata?.pricing_strategy && cart.metadata.pricing_strategy !== 'default' && (
          <div className="mt-3 p-2 bg-muted rounded-md">
            <div className="flex items-center gap-2 text-xs">
              <Tag className="h-3 w-3" />
              <span className="font-medium">Pricing Strategy:</span>
              <Badge variant="outline" className="text-[10px]">
                {cart.metadata.pricing_strategy === 'price_list' && 'Price List Applied'}
                {cart.metadata.pricing_strategy === 'customer_group' && 'Customer Group Pricing'}
                {cart.metadata.pricing_strategy === 'custom' && 'Custom Pricing Active'}
              </Badge>
            </div>
            {customPricedItems.length > 0 && (
              <div className="text-xs text-muted-foreground mt-1">
                {customPricedItems.length} item(s) have custom prices
              </div>
            )}
          </div>
        )}
      </div>
      
      <div className="flex-1 overflow-auto">
        <ScrollArea className="max-h-[40vh]">
          <div className="space-y-2 p-3">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : cartItems.length === 0 ? (
              <div className="text-center py-8">
                <ShoppingCart className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">Cart is empty</p>
              </div>
            ) : (
              <>
                {/* Custom Priced Items Section */}
                {customPricedItems.length > 0 && (
                  <div className="mb-4">
                    {customPricedItems.map((item) => (
                      <CartItemComponent
                        key={item.id}
                        item={item}
                        onUpdateQuantity={onUpdateQuantity}
                        onRemove={onRemoveFromCart}
                        onCustomPrice={onCustomPrice}
                        region={region}
                      />
                    ))}
                  </div>
                )}
                
                {/* Regular Items Section */}
                {regularItems.length > 0 && (
                  <div className="mb-4">
                    {regularItems.map((item) => (
                      <CartItemComponent
                        key={item.id}
                        item={item}
                        onUpdateQuantity={onUpdateQuantity}
                        onRemove={onRemoveFromCart}
                        onCustomPrice={onCustomPrice}
                        region={region}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </ScrollArea>
      </div>
      
      <div className="border-t p-3 flex-shrink-0">
        <div className="space-y-2 mb-3">
          <div className="flex justify-between text-sm">
            <span>Subtotal</span>
            <span>{region?.currency_code?.toUpperCase() || "PHP"} {cartTotal.toFixed(2)}</span>
          </div>
          {taxAmount > 0 && (
            <div className="flex justify-between text-sm">
              <span>Tax ({region?.tax_rate || 0}%)</span>
              <span>{region?.currency_code?.toUpperCase() || "PHP"} {taxAmount.toFixed(2)}</span>
            </div>
          )}
          {cart?.metadata?.pricing_strategy === 'price_list' && (
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Price List Applied</span>
              <span>Special pricing active</span>
            </div>
          )}
          <Separator />
          <div className="flex justify-between text-sm font-bold">
            <span>Total</span>
            <span>{region?.currency_code?.toUpperCase() || "PHP"} {grandTotal.toFixed(2)}</span>
          </div>
        </div>
        
        <Input
          placeholder="Order notes..."
          value={orderNotes}
          onChange={(e) => onNotesChange(e.target.value)}
          className="text-xs h-8 mb-3"
        />
        
        <Button 
          size="sm" 
          className="w-full" 
          onClick={onCheckout} 
          disabled={cartItems.length === 0}
        >
          <CreditCard className="mr-1 h-3 w-3" />
          Checkout
        </Button>
      </div>
    </>
  );
}