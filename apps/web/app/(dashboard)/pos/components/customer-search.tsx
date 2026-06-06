"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Search, UserPlus, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { listCustomers, createCustomer, type MedusaCustomer } from "@/lib/actions/pos";
import { useToast } from "@/hooks/use-toast";

interface CustomerSearchProps {
  onSelectCustomer: (customer: MedusaCustomer) => void;
  selectedCustomerId?: string;
}

export function CustomerSearch({ onSelectCustomer, selectedCustomerId }: CustomerSearchProps) {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ email: "", first_name: "", last_name: "", phone: "" });

  const { data: customers = [], refetch } = useQuery({
    queryKey: ["customers", searchTerm],
    queryFn: () => listCustomers(searchTerm),
    enabled: searchTerm.length > 2,
  });

  const createCustomerMutation = useMutation({
    mutationFn: createCustomer,
    onSuccess: (newCust) => {
      if (newCust) {
        onSelectCustomer(newCust);
        setShowCreateDialog(false);
        setNewCustomer({ email: "", first_name: "", last_name: "", phone: "" });
        toast({ title: "Customer created", description: `${newCust.first_name} ${newCust.last_name} has been added` });
        refetch();
      }
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create customer", variant: "destructive" });
    },
  });

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by email or phone..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
        />
      </div>

      {customers.length > 0 && (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {customers.map((customer) => (
            <button
              key={customer.id}
              onClick={() => onSelectCustomer(customer)}
              className={cn(
                "w-full text-left p-3 rounded-lg border transition-all hover:bg-accent",
                selectedCustomerId === customer.id && "border-primary bg-primary/10"
              )}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">
                    {customer.first_name} {customer.last_name}
                  </p>
                  <p className="text-sm text-muted-foreground">{customer.email}</p>
                  {customer.phone && <p className="text-xs text-muted-foreground">{customer.phone}</p>}
                </div>
                {selectedCustomerId === customer.id && <CheckCircle2 className="h-5 w-5 text-primary" />}
              </div>
            </button>
          ))}
        </div>
      )}

      <Button variant="outline" className="w-full" onClick={() => setShowCreateDialog(true)}>
        <UserPlus className="mr-2 h-4 w-4" />
        New Customer
      </Button>

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Customer</DialogTitle>
            <DialogDescription>Add a new customer to your database</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Email *"
              value={newCustomer.email}
              onChange={(e) => setNewCustomer(prev => ({ ...prev, email: e.target.value }))}
            />
            <Input
              placeholder="First Name"
              value={newCustomer.first_name}
              onChange={(e) => setNewCustomer(prev => ({ ...prev, first_name: e.target.value }))}
            />
            <Input
              placeholder="Last Name"
              value={newCustomer.last_name}
              onChange={(e) => setNewCustomer(prev => ({ ...prev, last_name: e.target.value }))}
            />
            <Input
              placeholder="Phone"
              value={newCustomer.phone}
              onChange={(e) => setNewCustomer(prev => ({ ...prev, phone: e.target.value }))}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
            <Button onClick={() => createCustomerMutation.mutate(newCustomer)} disabled={!newCustomer.email}>
              Create Customer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}