// components/dashboard/returns-borrowed-manager.tsx
"use client"

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Package, ArrowLeftRight, AlertTriangle } from 'lucide-react';

interface JagRecord {
  id: string;
  customerName: string;
  type: 'borrowed' | 'returned';
  quantity: number;
  brand: 'own_brand' | 'other_brand';
  date: Date;
  status: 'pending' | 'completed' | 'overdue';
}

export function ReturnsAndBorrowedManager() {
  const [records, setRecords] = useState<JagRecord[]>([
    {
      id: '1',
      customerName: 'John Doe',
      type: 'borrowed',
      quantity: 5,
      brand: 'own_brand',
      date: new Date('2024-01-15'),
      status: 'pending',
    },
    {
      id: '2',
      customerName: 'Jane Smith',
      type: 'returned',
      quantity: 3,
      brand: 'other_brand',
      date: new Date('2024-01-14'),
      status: 'completed',
    },
  ]);

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newRecord, setNewRecord] = useState({
    customerName: '',
    type: 'borrowed' as const,
    quantity: 1,
    brand: 'own_brand' as const,
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      case 'completed':
        return <Badge variant="default">Completed</Badge>;
      case 'overdue':
        return <Badge variant="destructive">
          <AlertTriangle className="h-3 w-3 mr-1" />
          Overdue
        </Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Jags Management</h2>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Package className="h-4 w-4 mr-2" />
              Record Transaction
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Record Jag Transaction</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>Transaction Type</Label>
                <Select
                  value={newRecord.type}
                  onValueChange={(value: 'borrowed' | 'returned') => 
                    setNewRecord({ ...newRecord, type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="borrowed">Borrowed</SelectItem>
                    <SelectItem value="returned">Returned</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Customer Name</Label>
                <Input
                  value={newRecord.customerName}
                  onChange={(e) => setNewRecord({ ...newRecord, customerName: e.target.value })}
                  placeholder="Enter customer name"
                />
              </div>
              <div>
                <Label>Quantity</Label>
                <Input
                  type="number"
                  min="1"
                  value={newRecord.quantity}
                  onChange={(e) => setNewRecord({ ...newRecord, quantity: parseInt(e.target.value) })}
                />
              </div>
              <div>
                <Label>Brand</Label>
                <Select
                  value={newRecord.brand}
                  onValueChange={(value: 'own_brand' | 'other_brand') => 
                    setNewRecord({ ...newRecord, brand: value })
                  }
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
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={() => {
                  const record: JagRecord = {
                    id: Date.now().toString(),
                    ...newRecord,
                    date: new Date(),
                    status: 'pending',
                  };
                  setRecords([record, ...records]);
                  setIsAddDialogOpen(false);
                  setNewRecord({
                    customerName: '',
                    type: 'borrowed',
                    quantity: 1,
                    brand: 'own_brand',
                  });
                }}>
                  Record Transaction
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Brand</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.map(record => (
                <TableRow key={record.id}>
                  <TableCell>{record.date.toLocaleDateString()}</TableCell>
                  <TableCell className="font-medium">{record.customerName}</TableCell>
                  <TableCell>
                    <Badge variant={record.type === 'borrowed' ? 'secondary' : 'default'}>
                      <ArrowLeftRight className="h-3 w-3 mr-1" />
                      {record.type}
                    </Badge>
                  </TableCell>
                  <TableCell>{record.quantity}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{record.brand.replace('_', ' ')}</Badge>
                  </TableCell>
                  <TableCell>{getStatusBadge(record.status)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}