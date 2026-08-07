// components/dashboard/sales-form.tsx
"use client"

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ShoppingCart, Plus, Trash2, DollarSign } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface SaleItem {
  id: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  bottleType: 'own_brand' | 'other_brand';
  jagsBorrowed: number;
  jagsReturned: number;
}

interface Customer {
  id: string;
  name: string;
  creditLimit: number;
  currentCredit: number;
}

interface SalesFormProps {
  customers: Customer[];
  onSubmit: (data: {
    customerId: string;
    items: SaleItem[];
    paymentMethod: string;
  }) => Promise<void>;
}

export function SalesForm({ customers, onSubmit }: SalesFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [customerId, setCustomerId] = useState('');
  const [items, setItems] = useState<SaleItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const { toast } = useToast();

  const selectedCustomer = customers.find(c => c.id === customerId);

  const addItem = () => {
    setItems([
      ...items,
      {
        id: Date.now().toString(),
        productName: '',
        quantity: 1,
        unitPrice: 0,
        bottleType: 'own_brand',
        jagsBorrowed: 0,
        jagsReturned: 0,
      },
    ]);
  };

  const removeItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const updateItem = (id: string, field: keyof SaleItem, value: any) => {
    setItems(items.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  };

  const handleSubmit = async () => {
    if (!customerId || items.length === 0) {
      toast({
        title: "Error",
        description: "Please select a customer and add at least one item.",
        variant: "destructive",
      });
      return;
    }

    try {
      await onSubmit({
        customerId,
        items,
        paymentMethod,
      });
      
      toast({
        title: "Success",
        description: "Sale recorded successfully.",
      });
      
      setIsOpen(false);
      setCustomerId('');
      setItems([]);
      setPaymentMethod('cash');
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to record sale.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full">
          <ShoppingCart className="h-4 w-4 mr-2" />
          Record Sale
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[800px]">
        <DialogHeader>
          <DialogTitle>Record New Sale</DialogTitle>
        </DialogHeader>
        
        <div className="grid gap-6 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Customer</Label>
              <Select value={customerId} onValueChange={setCustomerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select customer" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map(customer => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedCustomer && (
                <div className="mt-2 text-sm text-muted-foreground">
                  Credit Available: ${selectedCustomer.creditLimit - selectedCustomer.currentCredit}
                </div>
              )}
            </div>
            
            <div>
              <Label>Payment Method</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="credit">Credit</SelectItem>
                  <SelectItem value="mobile_money">Mobile Money</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="font-medium">Order Items</h4>
              <Button onClick={addItem} size="sm" variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Unit Price</TableHead>
                  <TableHead>Brand</TableHead>
                  <TableHead>Jags Borrowed</TableHead>
                  <TableHead>Jags Returned</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map(item => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <Input
                        value={item.productName}
                        onChange={(e) => updateItem(item.id, 'productName', e.target.value)}
                        placeholder="Product name"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateItem(item.id, 'quantity', parseInt(e.target.value))}
                        className="w-20"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.unitPrice}
                        onChange={(e) => updateItem(item.id, 'unitPrice', parseFloat(e.target.value))}
                        className="w-24"
                      />
                    </TableCell>
                    <TableCell>
                      <Select
                        value={item.bottleType}
                        onValueChange={(value) => updateItem(item.id, 'bottleType', value)}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="own_brand">Own Brand</SelectItem>
                          <SelectItem value="other_brand">Other Brand</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="0"
                        value={item.jagsBorrowed}
                        onChange={(e) => updateItem(item.id, 'jagsBorrowed', parseInt(e.target.value))}
                        className="w-20"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="0"
                        value={item.jagsReturned}
                        onChange={(e) => updateItem(item.id, 'jagsReturned', parseInt(e.target.value))}
                        className="w-20"
                      />
                    </TableCell>
                    <TableCell>
                      ${(item.quantity * item.unitPrice).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeItem(item.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {items.length > 0 && (
              <div className="flex justify-between items-center p-4 bg-muted rounded-lg">
                <div className="text-sm">
                  <div>Total Jags Borrowed: {items.reduce((sum, item) => sum + item.jagsBorrowed, 0)}</div>
                  <div>Total Jags Returned: {items.reduce((sum, item) => sum + item.jagsReturned, 0)}</div>
                </div>
                <div className="text-lg font-bold flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  {calculateTotal().toFixed(2)}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>
            Complete Sale
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}