// SendMessageDialog.tsx
"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Button } from "@workspace/ui/components/button";
import { Label } from "@workspace/ui/components/label";
import { Textarea } from "@workspace/ui/components/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover";
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Badge } from "@workspace/ui/components/badge";
import { XIcon, ChevronsUpDown, Check, Phone, Loader2, Users } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { useN8nQuery } from "@/hooks/useN8nQuery";

// Define widgets for fetching data
const branchesWidget = {
  id: "branches",
  webhook: {
    url: "/webhook/get-branches",
    queryMap: {},
  },
};

const customersWidget = {
  id: "customers",
  webhook: {
    url: "/webhook/get-customers",
    queryMap: {
      branch: "branch",
    },
  },
};

const peddlersWidget = {
  id: "peddlers",
  webhook: {
    url: "/webhook/get-peddlers",
    queryMap: {
      branch: "branch",
      customer: "customer",
    },
  },
};

interface SendMessageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SendMessageDialog({ open, onOpenChange }: SendMessageDialogProps) {
  // Local state for filters
  const [selectedBranch, setSelectedBranch] = useState<string>("all");
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([]);
  const [selectedPeddlers, setSelectedPeddlers] = useState<string[]>([]);
  const [messageContent, setMessageContent] = useState("");
  const [isFlash, setIsFlash] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // Fetch filtered data based on local state
  const { data: branches = [], isLoading: branchesLoading } = useN8nQuery({
    widget: branchesWidget,
    filters: {},
    enabled: open,
  });

  const { data: customers = [], isLoading: customersLoading } = useN8nQuery({
    widget: customersWidget,
    filters: { branch: selectedBranch !== "all" ? selectedBranch : undefined },
    enabled: open && selectedBranch !== undefined,
  });

  // Fetch peddlers based on selected branch and customers
  const { data: peddlers = [], isLoading: peddlersLoading, refetch: refetchPeddlers } = useN8nQuery({
    widget: peddlersWidget,
    filters: {
      branch: selectedBranch !== "all" ? selectedBranch : undefined,
      customer: selectedCustomers.length > 0 ? selectedCustomers.join(",") : undefined,
    },
    enabled: open && selectedBranch !== undefined,
  });

  // Reset all selections when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedBranch("all");
      setSelectedCustomers([]);
      setSelectedPeddlers([]);
      setMessageContent("");
      setIsFlash(false);
    }
  }, [open]);

  // Reset customers and peddlers when branch changes
  useEffect(() => {
    if (selectedBranch !== undefined) {
      setSelectedCustomers([]);
      setSelectedPeddlers([]);
    }
  }, [selectedBranch]);

  // Refetch peddlers when customers selection changes
  useEffect(() => {
    if (selectedBranch !== "all" && open) {
      refetchPeddlers();
    }
  }, [selectedCustomers, selectedBranch]);

  // Reset peddlers when customers change
  useEffect(() => {
    setSelectedPeddlers([]);
  }, [selectedCustomers]);

  // Get flat data arrays
  const flatCustomers = customers && customers[0]?.data ? customers[0].data : customers;
  const flatPeddlers = peddlers && peddlers[0]?.data ? peddlers[0].data : peddlers;

  // Handle branch selection
  const handleBranchChange = (value: string) => {
    setSelectedBranch(value);
  };

  // Handle customer selection toggle
  const handleCustomerToggle = (customerId: string, checked: boolean) => {
    const newSelected = checked
      ? [...selectedCustomers, customerId]
      : selectedCustomers.filter((id) => id !== customerId);
    setSelectedCustomers(newSelected);
  };

  // Select all customers
  const handleSelectAllCustomers = () => {
    const allCustomerIds = flatCustomers.map((c: any) => c.id);
    setSelectedCustomers(allCustomerIds);
  };

  // Clear all customers
  const clearCustomerFilters = () => {
    setSelectedCustomers([]);
  };

  // Handle peddler selection toggle
  const handlePeddlerToggle = (peddlerId: string, checked: boolean) => {
    const newSelected = checked
      ? [...selectedPeddlers, peddlerId]
      : selectedPeddlers.filter((id) => id !== peddlerId);
    setSelectedPeddlers(newSelected);
  };

  // Select all peddlers
  const handleSelectAllPeddlers = () => {
    const allPeddlerIds = flatPeddlers.map((p: any) => p.id);
    setSelectedPeddlers(allPeddlerIds);
  };

  // Clear all peddler filters
  const clearPeddlerFilters = () => {
    setSelectedPeddlers([]);
  };

  // Get selected customer details
  const getSelectedCustomerDetails = () => {
    return flatCustomers.filter((customer: any) => selectedCustomers.includes(customer.id));
  };

  // Get selected peddler details
  const getSelectedPeddlerDetails = () => {
    return flatPeddlers.filter((peddler: any) => selectedPeddlers.includes(peddler.id));
  };

  // Handle send message (bulk SMS)
  const handleSend = async () => {
    if (!messageContent.trim()) {
      return;
    }

    setIsSending(true);
    
    const selectedPeddlerDetails = getSelectedPeddlerDetails();
    const selectedCustomerDetails = getSelectedCustomerDetails();
    let recipients = [];
    recipients = selectedPeddlerDetails.map((peddler: any) => ({
        id: peddler.id,
        name: peddler.name,
        phone: peddler.contact_number || peddler.phone,
        branch: selectedBranch !== "all" ? selectedBranch : null,
      }));

   selectedCustomerDetails.map((c: any) => {
       recipients.push({
          id: c.id,
          name: `${c.first_name} ${c.last_name}`,
          phone: c.phone
        })
    })

        
    const messageData = {
      message: {
        content: messageContent,
        isFlash: isFlash,
        createdAt: new Date().toISOString(),
        status: "pending",
        type: "bulk_sms",
      },
      recipients: recipients,
      totalRecipients: selectedPeddlers.length,
      sentBy: "admin", // You can get this from auth context
    };

    try {
      console.log("Sending bulk SMS:", messageData);
      
      // Call n8n webhook to save and send messages
      const response = await fetch(`${process.env.NEXT_PUBLIC_N8N}/webhook/send-bulk-sms`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(messageData),
      });
      
      if (!response.ok) {
        throw new Error("Failed to send messages");
      }
      
      const result = await response.json();
      console.log("Bulk SMS sent successfully:", result);
      
      // Reset form on success
      setSelectedPeddlers([]);
      setSelectedCustomers([]);
      setMessageContent("");
      setIsFlash(false);
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to send message:", error);
    } finally {
      setIsSending(false);
    }
  };

  // Handle dialog close
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && !isSending) {
      setSelectedBranch("all");
      setSelectedCustomers([]);
      setSelectedPeddlers([]);
      setMessageContent("");
      setIsFlash(false);
    }
    onOpenChange(newOpen);
  };

  const isLoading = branchesLoading || customersLoading || peddlersLoading;
  const selectedCustomersCount = selectedCustomers.length;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Send Bulk SMS to Peddlers</DialogTitle>
          <DialogDescription>
            Select branch, customers, and peddlers to send bulk SMS messages.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid gap-4 py-4">
            {/* Branch Selection */}
            <div className="grid gap-2">
              <Label>Branch</Label>
              <BranchSelect
                branches={branches}
                value={selectedBranch}
                onChange={handleBranchChange}
              />
            </div>

            {/* Customers Multi-Select */}
            <div className="grid gap-2">
              <Label>Customers (Optional)</Label>
              <CustomersMultiSelect
                customers={flatCustomers}
                selectedCustomers={selectedCustomers}
                onToggle={handleCustomerToggle}
                onSelectAll={handleSelectAllCustomers}
                clearFilters={clearCustomerFilters}
                disabled={selectedBranch === "all"}
              />
            </div>

            {/* Selected Customers Tags */}
            {selectedCustomersCount > 0 && (
              <div className="grid gap-2">
                <Label>Selected Customers ({selectedCustomersCount})</Label>
                <div className="flex flex-wrap gap-2 p-2 border rounded-md bg-muted/30">
                  {getSelectedCustomerDetails().map((customer: any) => (
                    <Badge key={customer.id} variant="secondary" className="gap-1">
                      <Users className="h-3 w-3" />
                      {customer.first_name} {customer.last_name}
                      {customer.phone && ` - ${customer.phone}`}
                      <button
                        onClick={() => handleCustomerToggle(customer.id, false)}
                        className="ml-1 hover:text-destructive"
                      >
                        <XIcon className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Peddlers Filter */}
            <div className="grid gap-2">
              <Label>Select Peddlers</Label>
              <PeddlersFilterPopover
                peddlers={flatPeddlers}
                selectedPeddlers={selectedPeddlers}
                onToggle={handlePeddlerToggle}
                onSelectAll={handleSelectAllPeddlers}
                clearFilters={clearPeddlerFilters}
                disabled={selectedBranch === "all"}
                customerCount={selectedCustomersCount}
              />
            </div>

            {/* Selected Peddlers Tags */}
            {selectedPeddlers.length > 0 && (
              <div className="grid gap-2">
                <Label>Selected Recipients ({selectedPeddlers.length})</Label>
                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 border rounded-md bg-muted/30">
                  {getSelectedPeddlerDetails().map((peddler: any) => (
                    <Badge key={peddler.id} variant="secondary" className="gap-1">
                      <Phone className="h-3 w-3" />
                      {peddler.name} - {peddler.contact_number || peddler.phone}
                      <button
                        onClick={() => handlePeddlerToggle(peddler.id, false)}
                        className="ml-1 hover:text-destructive"
                      >
                        <XIcon className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Message Content */}
            <div className="grid gap-2">
              <Label htmlFor="message">Message Content</Label>
              <Textarea
                id="message"
                placeholder="Type your message here..."
                value={messageContent}
                onChange={(e) => setMessageContent(e.target.value)}
                rows={5}
                maxLength={160}
                className="resize-none"
              />
              <div className="text-xs text-muted-foreground text-right">
                {messageContent.length}/160 characters
              </div>
            </div>

            {/* Flash Message Toggle */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="flash">Flash Message</Label>
                <div className="text-xs text-muted-foreground">
                  Flash messages appear directly on the screen without saving to inbox
                </div>
              </div>
              <Switch
                id="flash"
                checked={isFlash}
                onCheckedChange={setIsFlash}
              />
            </div>

            {/* Summary */}
            {selectedPeddlers.length > 0 && (
              <div className="p-3 bg-primary/10 rounded-md border border-primary/20">
                <p className="text-sm font-medium">Bulk SMS Summary</p>
                <div className="text-xs text-muted-foreground mt-2 space-y-1">
                  <p>📱 Recipients: <span className="font-medium text-foreground">{selectedPeddlers.length} peddler{selectedPeddlers.length !== 1 ? 's' : ''}</span></p>
                  {selectedBranch !== "all" && (
                    <p>🏢 Branch: <span className="font-medium text-foreground">{branches.find((b: any) => b.id === selectedBranch)?.name || selectedBranch}</span></p>
                  )}
                  {selectedCustomersCount > 0 && (
                    <p>👥 Customers: <span className="font-medium text-foreground">{selectedCustomersCount} customer{selectedCustomersCount !== 1 ? 's' : ''}</span></p>
                  )}
                  <p>💬 Message: <span className="font-medium text-foreground">{messageContent.length}/160 characters</span></p>
                  <p>⚡ Flash mode: <span className="font-medium text-foreground">{isFlash ? "Enabled" : "Disabled"}</span></p>
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isSending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSend}
          >
            {isSending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              `Send to ${selectedPeddlers.length} peddler${selectedPeddlers.length !== 1 ? 's' : ''}`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Customers Multi-Select Component
function CustomersMultiSelect({
  customers,
  selectedCustomers,
  onToggle,
  onSelectAll,
  clearFilters,
  disabled,
}: {
  customers: any[];
  selectedCustomers: string[];
  onToggle: (id: string, checked: boolean) => void;
  onSelectAll: () => void;
  clearFilters: () => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const activeCount = selectedCustomers.length;
  const totalCount = customers.length;
  const isAllSelected = activeCount === totalCount && totalCount > 0;

  if (disabled) {
    return (
      <Button variant="outline" className="w-full" disabled>
        Select branch first
      </Button>
    );
  }

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-full justify-between" aria-expanded={open}>
            <span>
              Select Customers
              {activeCount > 0 && (
                <Badge className="tabular-nums ml-2" variant="secondary">
                  {activeCount}
                </Badge>
              )}
            </span>
            <ChevronsUpDown className="opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-96">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm">Select Customers</h3>
              <div className="flex gap-2">
                {activeCount > 0 && (
                  <Button variant="link" size="sm" onClick={clearFilters} className="h-auto p-0">
                    Clear
                  </Button>
                )}
                {totalCount > 0 && (
                  <Button variant="link" size="sm" onClick={onSelectAll} className="h-auto p-0">
                    {isAllSelected ? "Deselect All" : "Select All"}
                  </Button>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between border-b pb-2">
              <Badge variant="outline" className="font-medium text-xs">
                Total: {totalCount}
              </Badge>
              <Badge variant="outline" className="font-medium text-xs">
                Selected: {activeCount}
              </Badge>
            </div>
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {customers.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No customers available for this branch
                </p>
              )}
              {customers.map((customer: any) => (
                <CustomerFilterToggle
                  key={customer.id}
                  id={customer.id}
                  firstName={customer.first_name}
                  lastName={customer.last_name}
                  phone={customer.phone}
                  checked={selectedCustomers.includes(customer.id)}
                  onCheckedChange={(checked) => onToggle(customer.id, checked)}
                />
              ))}
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

function CustomerFilterToggle({
  id,
  firstName,
  lastName,
  phone,
  checked,
  onCheckedChange,
}: {
  id: string;
  firstName: string;
  lastName: string;
  phone?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex cursor-pointer items-start gap-2 p-2 rounded hover:bg-muted/50 transition-colors">
      <Checkbox 
        id={id} 
        checked={checked} 
        onCheckedChange={onCheckedChange}
        className="mt-1"
      />
      <div className="flex flex-col flex-1">
        <Label htmlFor={id} className="cursor-pointer font-medium text-sm">
          {firstName} {lastName}
        </Label>
        {phone && (
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Phone className="h-3 w-3" />
            {phone}
          </span>
        )}
      </div>
    </div>
  );
}

// Branch Select Component
function BranchSelect({ branches, value, onChange }: any) {
  const [open, setOpen] = React.useState(false);

  const selectedBranch = value === "all"
    ? "All Branches"
    : branches.find((b: any) => b.id === value)?.name || "All Branches";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-full justify-between">
          {selectedBranch}
          <ChevronsUpDown className="opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-full p-0">
        <Command>
          <CommandList>
            <CommandGroup>
              <CommandItem
                value="all"
                onSelect={() => {
                  onChange("all");
                  setOpen(false);
                }}
              >
                <div className="flex flex-col">
                  <span className="font-medium">All Branches</span>
                  <span className="text-xs text-muted-foreground">Show peddlers from all branches</span>
                </div>
                <Check className={cn("ml-auto", value === "all" ? "opacity-100" : "opacity-0")} />
              </CommandItem>

              {branches.map((b: any) => (
                <CommandItem
                  key={b.id}
                  value={b.id}
                  onSelect={() => {
                    onChange(b.id);
                    setOpen(false);
                  }}
                >
                  {b.name}
                  <Check className={cn("ml-auto", value === b.id ? "opacity-100" : "opacity-0")} />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// Peddlers Filter Popover Component
function PeddlersFilterPopover({
  peddlers,
  selectedPeddlers,
  onToggle,
  onSelectAll,
  clearFilters,
  disabled,
  customerCount,
}: {
  peddlers: any[];
  selectedPeddlers: string[];
  onToggle: (id: string, checked: boolean) => void;
  onSelectAll: () => void;
  clearFilters: () => void;
  disabled?: boolean;
  customerCount?: number;
}) {
  const [open, setOpen] = React.useState(false);
  const activeCount = selectedPeddlers.length;
  const totalCount = peddlers.length;
  const isAllSelected = activeCount === totalCount && totalCount > 0;

  if (disabled) {
    return (
      <Button variant="outline" className="w-full" disabled>
        Select branch first
      </Button>
    );
  }

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-full justify-between" aria-expanded={open}>
            <span>
              Select Peddlers
              {activeCount > 0 && (
                <Badge className="tabular-nums ml-2" variant="secondary">
                  {activeCount}
                </Badge>
              )}
            </span>
            <ChevronsUpDown className="opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-96">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm">Select Peddlers</h3>
              <div className="flex gap-2">
                {activeCount > 0 && (
                  <Button variant="link" size="sm" onClick={clearFilters} className="h-auto p-0">
                    Clear
                  </Button>
                )}
                {totalCount > 0 && (
                  <Button variant="link" size="sm" onClick={onSelectAll} className="h-auto p-0">
                    {isAllSelected ? "Deselect All" : "Select All"}
                  </Button>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between border-b pb-2">
              <Badge variant="outline" className="font-medium text-xs">
                Total: {totalCount}
              </Badge>
              <Badge variant="outline" className="font-medium text-xs">
                Selected: {activeCount}
              </Badge>
            </div>
            {customerCount && customerCount > 0 && (
              <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
                Filtered by {customerCount} selected customer{customerCount !== 1 ? 's' : ''}
              </div>
            )}
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {peddlers.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No peddlers available for selected filters
                </p>
              )}
              {peddlers.map((peddler: any) => (
                <FilterToggle
                  key={peddler.id}
                  id={peddler.id}
                  name={peddler.name}
                  phone={peddler.contact_number || peddler.phone}
                  checked={selectedPeddlers.includes(peddler.id)}
                  onCheckedChange={(checked) => onToggle(peddler.id, checked)}
                />
              ))}
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

// Filter Toggle Component
function FilterToggle({
  id,
  name,
  phone,
  checked,
  onCheckedChange,
}: {
  id: string;
  name: string;
  phone?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex cursor-pointer items-start gap-2 p-2 rounded hover:bg-muted/50 transition-colors">
      <Checkbox 
        id={id} 
        checked={checked} 
        onCheckedChange={onCheckedChange}
        className="mt-1"
      />
      <div className="flex flex-col flex-1">
        <Label htmlFor={id} className="cursor-pointer font-medium text-sm">
          {name}
        </Label>
        {phone && (
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Phone className="h-3 w-3" />
            {phone}
          </span>
        )}
      </div>
    </div>
  );
}