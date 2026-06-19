// components/cart/customer-selector.tsx

"use client";

import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  User,
  UserPlus,
  X,
  Search,
  Mail,
  Phone,
  Users,
  Check,
  Loader2,
  UserCheck,
  UserX,
} from "lucide-react";
import { listCustomerGroupCustomers } from "@/lib/data/customer";
import { createQuickCustomer } from "@/lib/actions";

interface Customer {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  // Add other customer fields as needed
}

interface CustomerSelectorProps {
  selected: any;
  onSelect: (customer: Customer) => Promise<void>;
  onClear: () => Promise<void>;
  isLoading?: boolean;
  customerGroupId?: string;
}

export function CustomerSelector({ 
  selected: selectedCustomer, 
  onSelect, 
  onClear,
  isLoading = false,
  customerGroupId
}: CustomerSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'search' | 'add'>('search');
  
  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Customer[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(false);
  
  // Add customer state
  const [newCustomer, setNewCustomer] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
  });
  const [isAdding, setIsAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [selected, setSelected] = useState<any>(null);

  // Fetch initial customers when dialog opens
  useEffect(() => {
    if (isOpen && customers.length === 0 && !isLoadingCustomers) {
      fetchCustomers();
    }
  }, [isOpen]);

  const fetchCustomers = async () => {
    setIsLoadingCustomers(true);
    try {
      const response = await listCustomerGroupCustomers(customerGroupId) as any;

      setCustomers(response.customers);
      setSearchResults(response.customers);
    } catch (error) {
      console.error("Error fetching customers:", error);
    } finally {
      setIsLoadingCustomers(false);
    }
  };

  // Reset form when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setActiveTab('search');
      setSearchQuery("");
      setSearchResults([]);
      setNewCustomer({ first_name: "", last_name: "", email: "", phone: "" });
      setAddError(null);
      setCustomers([]);
    }
  }, [isOpen]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      // If search is empty, show all customers
      if (customers.length === 0) {
        await fetchCustomers();
      } else {
        setSearchResults(customers);
      }
      return;
    }

    setIsSearching(true);
    try {
      const response = await listCustomerGroupCustomers(customerGroupId) as any;
      setSearchResults(response.customers);
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelect = async (customer: Customer) => {
    await onSelect(customer);
    setIsOpen(false);
  };

  const handleClear = async () => {
    await onClear();
    setSelected(null)
    setIsOpen(false);
  };

  const handleAddCustomer = async () => {
    // Validate
    if (!newCustomer.first_name.trim()) {
      setAddError("First name is required");
      return;
    }
    if (!newCustomer.last_name.trim()) {
      setAddError("Last name is required");
      return;
    }
    if (!newCustomer.email.trim()) {
      setAddError("Email is required");
      return;
    }
    if (!newCustomer.phone.trim()) {
      setAddError("Phone number is required");
      return;
    }

    setIsAdding(true);
    setAddError(null);
    try {
      // Create customer via Medusa SDK
      const response = await createQuickCustomer({
        first_name: newCustomer.first_name,
        last_name: newCustomer.last_name,
        email: newCustomer.email,
        phone: newCustomer.phone,
      });
      

        console.log(response, 'RESPP')
      // Refresh customer list
      await fetchCustomers();
      
      // Select the newly created customer
      await onSelect(response.customer);
      setIsOpen(false);
    } catch (error: any) {
      setAddError(error.message || "Failed to add customer");
    } finally {
      setIsAdding(false);
    }
  };

  const getCustomerDisplayName = (customer: Customer) => {
    return `${customer.first_name}${customer.last_name ? ` ${customer.last_name}` : ''}`;
  };

  // Auto-search on typing with debounce
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      handleSearch();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

    // Fetch initial customers when dialog opens
  useEffect(() => {
    if (customers.length && selectedCustomer) {
        let customer = customers.find(a => a.id == selectedCustomer)
      setSelected(customer);
    } else if(!selectedCustomer) {
        setSelected(null)
    }
  }, [customers, selectedCustomer]);

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium">Customer</label>
          {selected && (
            <Badge variant="secondary" className="h-4 px-1 text-[10px]">
              <UserCheck className="h-2 w-2 mr-1" />
              Selected
            </Badge>
          )}
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-6 text-xs"
          onClick={() => setIsOpen(true)}
        >
          <UserPlus className="mr-1 h-3 w-3" />
          {selected ? "Change" : "Add"}
        </Button>
      </div>

      {selected ? (
        <div className="flex items-center gap-2 p-2 rounded-md bg-muted/30 border">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <User className="h-3 w-3 text-primary" />
              </div>
              <span className="font-medium text-sm truncate">
                {getCustomerDisplayName(selected)}
              </span>
            </div>
            <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
              {selected.email && (
                <span className="flex items-center gap-1">
                  <Mail className="h-2 w-2" />
                  {selected.email}
                </span>
              )}
              {selected.phone && (
                <span className="flex items-center gap-1">
                  <Phone className="h-2 w-2" />
                  {selected.phone}
                </span>
              )}
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-muted-foreground hover:text-destructive flex-shrink-0"
            onClick={handleClear}
            disabled={isLoading}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      ) : (
        <div className="text-xs text-muted-foreground bg-muted/30 p-2 rounded-md border border-dashed text-center">
          No customer selected
        </div>
      )}

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selected ? "Change Customer" : "Add Customer"}
            </DialogTitle>
            <DialogDescription>
              Search for an existing customer or add a new one
            </DialogDescription>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
            <TabsList className="grid w-full grid-cols-2 px-2">
              <TabsTrigger value="search">Search</TabsTrigger>
              <TabsTrigger value="add">Add New</TabsTrigger>
            </TabsList>

            <TabsContent value="search" className="space-y-3">
              {/* <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, email, or phone..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 h-9"
                    autoFocus
                  />
                </div>
                {searchQuery && (
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-9 w-9"
                    onClick={() => setSearchQuery("")}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div> */}

              {searchResults.length > 0 && (
                <div className="text-xs text-muted-foreground">
                  Found {searchResults.length} customer{searchResults.length > 1 ? 's' : ''}
                </div>
              )}

              <ScrollArea className="h-72">
                {isLoadingCustomers || isSearching ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : searchResults.length > 0 ? (
                  <div className="space-y-1.5">
                    {searchResults.map((customer) => (
                      <button
                        key={customer.id}
                        onClick={() => handleSelect(customer)}
                        className="w-full p-3 rounded-lg border hover:bg-muted/50 transition-colors text-left group"
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium flex items-center gap-2">
                              {getCustomerDisplayName(customer)}
                              {selected?.id === customer.id && (
                                <Badge variant="default" className="text-[10px]">
                                  <Check className="h-2 w-2 mr-1" />
                                  Selected
                                </Badge>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground space-y-0.5 mt-1">
                              {customer.email && (
                                <div className="flex items-center gap-1">
                                  <Mail className="h-3 w-3 flex-shrink-0" />
                                  <span className="truncate">{customer.email}</span>
                                </div>
                              )}
                              {customer.phone && (
                                <div className="flex items-center gap-1">
                                  <Phone className="h-3 w-3 flex-shrink-0" />
                                  <span>{customer.phone}</span>
                                </div>
                              )}
                            </div>
                          </div>
                          <Badge 
                            variant="ghost" 
                            className="h-7 px-2 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                          >
                            Select
                          </Badge>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : searchQuery ? (
                  <div className="text-center py-8">
                    <UserX className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                    <p className="text-sm text-muted-foreground">No customers found</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Try adjusting your search or add a new customer
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3"
                      onClick={() => setActiveTab('add')}
                    >
                      <UserPlus className="h-3 w-3 mr-1" />
                      Add New Customer
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Users className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                    <p className="text-sm text-muted-foreground">Start typing to search</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Search by name, email, or phone number
                    </p>
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            <TabsContent value="add" className="space-y-3">
              <div className="space-y-3 p-2">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">First Name *</Label>
                    <Input
                      placeholder="John"
                      value={newCustomer.first_name}
                      onChange={(e) => setNewCustomer({ ...newCustomer, first_name: e.target.value })}
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Last Name *</Label>
                    <Input
                      placeholder="Doe"
                      value={newCustomer.last_name}
                      onChange={(e) => setNewCustomer({ ...newCustomer, last_name: e.target.value })}
                      className="h-9"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Email *</Label>
                  <Input
                    type="email"
                    placeholder="john@example.com"
                    value={newCustomer.email}
                    onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                    className="h-9"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Phone *</Label>
                  <Input
                    placeholder="+63 912 345 6789"
                    value={newCustomer.phone}
                    onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                    className="h-9"
                  />
                </div>

                {addError && (
                  <div className="p-2 bg-destructive/10 border border-destructive/20 rounded-md text-xs text-destructive">
                    {addError}
                  </div>
                )}

                <Button
                  onClick={handleAddCustomer}
                  disabled={isAdding}
                  className="w-full h-9"
                >
                  {isAdding ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Adding Customer...
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Add Customer
                    </>
                  )}
                </Button>

                <div className="text-[10px] text-muted-foreground text-center">
                  * Required fields
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="border-t pt-3">
            {selected && (
              <Button variant="destructive" size="sm" onClick={handleClear} disabled={isLoading}>
                <UserX className="h-3 w-3 mr-1" />
                Remove Customer
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => setIsOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}