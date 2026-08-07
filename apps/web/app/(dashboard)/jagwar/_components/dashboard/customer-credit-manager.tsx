// components/dashboard/customer-credit-manager.tsx
"use client"

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Users, CreditCard, AlertCircle, Search } from 'lucide-react';

interface Customer {
  id: string;
  name: string;
  phone: string;
  creditLimit: number;
  currentCredit: number;
}

interface CustomerCreditManagerProps {
  customers: Customer[];
  onUpdateCredit: (customerId: string, amount: number) => Promise<void>;
}

export function CustomerCreditManager({ customers, onUpdateCredit }: CustomerCreditManagerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [creditAmount, setCreditAmount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.phone.includes(searchTerm)
  );

  const getCreditStatus = (customer: Customer) => {
    const percentage = (customer.currentCredit / customer.creditLimit) * 100;
    if (percentage >= 90) return 'critical';
    if (percentage >= 70) return 'warning';
    return 'ok';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Customer Credit Management
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search customers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Credit Used</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCustomers.map(customer => (
              <TableRow key={customer.id}>
                <TableCell className="font-medium">{customer.name}</TableCell>
                <TableCell>{customer.phone}</TableCell>
                <TableCell>
                  <div className="space-y-1">
                    <div className="text-sm">${customer.currentCredit} / ${customer.creditLimit}</div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${
                          getCreditStatus(customer) === 'critical' ? 'bg-red-500' :
                          getCreditStatus(customer) === 'warning' ? 'bg-yellow-500' :
                          'bg-green-500'
                        }`}
                        style={{ width: `${(customer.currentCredit / customer.creditLimit) * 100}%` }}
                      />
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={
                    getCreditStatus(customer) === 'critical' ? 'destructive' :
                    getCreditStatus(customer) === 'warning' ? 'secondary' :
                    'default'
                  }>
                    {getCreditStatus(customer) === 'critical' && <AlertCircle className="h-3 w-3 mr-1" />}
                    {getCreditStatus(customer).charAt(0).toUpperCase() + getCreditStatus(customer).slice(1)}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Dialog open={isOpen && selectedCustomer?.id === customer.id} onOpenChange={(open) => {
                    setIsOpen(open);
                    if (open) setSelectedCustomer(customer);
                  }}>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="outline">
                        <CreditCard className="h-4 w-4 mr-2" />
                        Manage Credit
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Manage Credit - {customer.name}</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div>
                          <Label>Current Credit Used</Label>
                          <div className="text-2xl font-bold">
                            ${customer.currentCredit} / ${customer.creditLimit}
                          </div>
                        </div>
                        <div>
                          <Label>Amount to Add/Subtract</Label>
                          <Input
                            type="number"
                            value={creditAmount}
                            onChange={(e) => setCreditAmount(parseFloat(e.target.value))}
                            placeholder="Enter amount (negative to reduce)"
                          />
                        </div>
                        <div className="flex justify-end gap-3">
                          <Button variant="outline" onClick={() => setIsOpen(false)}>
                            Cancel
                          </Button>
                          <Button onClick={async () => {
                            await onUpdateCredit(customer.id, creditAmount);
                            setIsOpen(false);
                            setCreditAmount(0);
                          }}>
                            Update Credit
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}