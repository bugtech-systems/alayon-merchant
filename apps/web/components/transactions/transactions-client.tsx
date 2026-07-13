// components/transactions/transactions-client.tsx
'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { format, startOfMonth, parseISO } from 'date-fns';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import {
  ChevronLeft,
  ChevronRight,
  X,
  Plus,
  Trash2,
  Edit2,
  Wallet,
  TrendingDown,
  TrendingUp,
  Package,
  FolderOpen,
  Calendar as CalendarIcon,
  Loader2,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Users,
  Building2,
  Banknote,
  Receipt,
  FileText,
  AlertCircle,
  RefreshCw,
  Filter,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  createTransaction, 
  listTransactions, 
  updateTransaction, 
  deleteTransaction 
} from '@/lib/actions/transactions';
import type { Transaction, TransactionCategory } from '@/types/transactions';

// ============================================
// CONSTANTS
// ============================================

const ITEMS_PER_PAGE = 10;

const TRANSACTION_TYPES = [
  { value: 'expense', label: 'Expense', icon: <TrendingDown className="h-4 w-4" />, color: 'text-red-500' },
  { value: 'income', label: 'Income', icon: <TrendingUp className="h-4 w-4" />, color: 'text-green-500' },
  { value: 'transfer', label: 'Transfer', icon: <Banknote className="h-4 w-4" />, color: 'text-blue-500' },
  { value: 'adjustment', label: 'Adjustment', icon: <AlertCircle className="h-4 w-4" />, color: 'text-yellow-500' },
];

const TRANSACTION_CATEGORIES = [
  { value: 'operating', label: 'Operating', icon: <FileText className="h-4 w-4" /> },
  { value: 'capital', label: 'Capital', icon: <Building2 className="h-4 w-4" /> },
  { value: 'payroll', label: 'Payroll', icon: <Users className="h-4 w-4" /> },
  { value: 'tax', label: 'Tax', icon: <Receipt className="h-4 w-4" /> },
  { value: 'other', label: 'Other', icon: <Wallet className="h-4 w-4" /> },
];

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'check', label: 'Check' },
  { value: 'credit_card', label: 'Credit Card' },
  { value: 'other', label: 'Other' },
];

const TRANSACTION_STATUS = [
  { value: 'pending', label: 'Pending', variant: 'warning' as const },
  { value: 'completed', label: 'Completed', variant: 'success' as const },
  { value: 'cancelled', label: 'Cancelled', variant: 'destructive' as const },
];

const CATEGORY_COLORS = [
  'bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500',
  'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500',
  'bg-orange-500', 'bg-cyan-500', 'bg-rose-500', 'bg-amber-500',
];

const ICON_MAP: Record<string, React.ReactNode> = {
  wallet: <Wallet className="h-4 w-4" />,
  expense: <TrendingDown className="h-4 w-4" />,
  income: <TrendingUp className="h-4 w-4" />,
  package: <Package className="h-4 w-4" />,
  users: <Users className="h-4 w-4" />,
  building: <Building2 className="h-4 w-4" />,
  banknote: <Banknote className="h-4 w-4" />,
  receipt: <Receipt className="h-4 w-4" />,
  file: <FileText className="h-4 w-4" />,
};

const AVAILABLE_ICONS = ['wallet', 'expense', 'income', 'package', 'users', 'building', 'banknote', 'receipt', 'file'];

// ============================================
// LOCAL STORAGE HELPERS
// ============================================

const STORAGE_KEY = 'transaction_categories';
const SHOW_BREAKDOWN_KEY = 'show_category_breakdown';

const loadCategories = (): TransactionCategory[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

const saveCategories = (categories: TransactionCategory[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(categories));
  } catch (error) {
    console.error('Error saving categories:', error);
  }
};

const loadBreakdownVisibility = (): boolean => {
  try {
    const stored = localStorage.getItem(SHOW_BREAKDOWN_KEY);
    return stored ? JSON.parse(stored) : true;
  } catch {
    return true;
  }
};

const saveBreakdownVisibility = (show: boolean) => {
  try {
    localStorage.setItem(SHOW_BREAKDOWN_KEY, JSON.stringify(show));
  } catch (error) {
    console.error('Error saving breakdown visibility:', error);
  }
};

// ============================================
// TRANSACTION FORM
// ============================================

interface TransactionFormProps {
  transaction?: Transaction;
  onSave: (data: any) => Promise<void>;
  onCancel: () => void;
  categories: TransactionCategory[];
  onAddCategory: (category: TransactionCategory) => void;
  isLoading?: boolean;
}

const TransactionForm = ({
  transaction,
  onSave,
  onCancel,
  categories,
  onAddCategory,
  isLoading = false,
}: TransactionFormProps) => {
  const [formData, setFormData] = useState({
    amount: transaction?.amount?.toString() || '',
    description: transaction?.description || '',
    type: transaction?.type || 'expense',
    category: transaction?.category || 'operating',
    category_id: transaction?.category_id || '',
    date: transaction?.date ? format(new Date(transaction.date), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
    payment_method: transaction?.payment_method || 'cash',
    status: transaction?.status || 'pending',
    reference_number: transaction?.reference_number || '',
    notes: transaction?.notes || '',
    is_taxable: transaction?.is_taxable || false,
    tax_amount: transaction?.tax_amount?.toString() || '',
    is_reconciled: transaction?.is_reconciled || false,
  });

  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryIcon, setNewCategoryIcon] = useState('wallet');
  const [newCategoryColor, setNewCategoryColor] = useState(CATEGORY_COLORS[0]);
  const [newCategoryType, setNewCategoryType] = useState<'income' | 'expense' | 'transfer'>('expense');

  const handleAddNewCategory = () => {
    if (!newCategoryName.trim()) return;
    if (categories.find(a => a.id == newCategoryName.trim())) return alert('Already Exists!');
    
    const category: TransactionCategory = {
      id: newCategoryName.trim(),
      name: newCategoryName.trim(),
      type: newCategoryType,
      icon: newCategoryIcon,
      color: newCategoryColor,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    onAddCategory(category);
    setFormData({ ...formData, category_id: category.id });
    setNewCategoryName('');
    setShowNewCategory(false);
    toast.success(`Category "${category.name}" created`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto px-1">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Amount *</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₱</span>
            <Input
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              className="pl-8"
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Date *</Label>
          <Input
            type="date"
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Description *</Label>
        <Input
          placeholder="Transaction description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Type *</Label>
          <Select
            value={formData.type}
            onValueChange={(value) => setFormData({ ...formData, type: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              {TRANSACTION_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  <div className="flex items-center gap-2">
                    {type.icon}
                    {type.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Category *</Label>
          <Select
            value={formData.category}
            onValueChange={(value) => setFormData({ ...formData, category: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {TRANSACTION_CATEGORIES.map((cat) => (
                <SelectItem key={cat.value} value={cat.value}>
                  <div className="flex items-center gap-2">
                    {cat.icon}
                    {cat.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Sub-Category</Label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 text-xs"
            onClick={() => setShowNewCategory(!showNewCategory)}
          >
            <Plus className="h-3 w-3 mr-1" />
            New Sub-Category
          </Button>
        </div>

        {showNewCategory && (
          <div className="space-y-2 p-3 border rounded-md bg-muted/30">
            <Input
              placeholder="Sub-category name"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              className="h-8"
            />
            <div className="grid grid-cols-2 gap-2">
              <Select value={newCategoryType} onValueChange={(value: any) => setNewCategoryType(value)}>
                <SelectTrigger className="h-8">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  {TRANSACTION_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center gap-2">
                        {type.icon}
                        {type.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={newCategoryIcon} onValueChange={setNewCategoryIcon}>
                <SelectTrigger className="h-8">
                  <SelectValue placeholder="Icon" />
                </SelectTrigger>
                <SelectContent>
                  {AVAILABLE_ICONS.map((icon) => (
                    <SelectItem key={icon} value={icon}>
                      <div className="flex items-center gap-2">
                        {ICON_MAP[icon]}
                        {icon}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Select value={newCategoryColor} onValueChange={setNewCategoryColor}>
                <SelectTrigger className="flex-1 h-8">
                  <SelectValue placeholder="Color" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORY_COLORS.map((color) => (
                    <SelectItem key={color} value={color}>
                      <div className="flex items-center gap-2">
                        <div className={cn("w-3 h-3 rounded-full", color)} />
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button type="button" size="sm" className="h-8" onClick={handleAddNewCategory}>
                Add
              </Button>
            </div>
          </div>
        )}

        <Select
          value={formData.category_id || 'none'}
          onValueChange={(value) => setFormData({ ...formData, category_id: value === 'none' ? '' : value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select sub-category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">None</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                <div className="flex items-center gap-2">
                  <span className={cn("w-2 h-2 rounded-full", c.color)} />
                  {ICON_MAP[c.icon || 'wallet']}
                  {c.name}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Payment Method</Label>
          <Select
            value={formData.payment_method}
            onValueChange={(value) => setFormData({ ...formData, payment_method: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select method" />
            </SelectTrigger>
            <SelectContent>
              {PAYMENT_METHODS.map((method) => (
                <SelectItem key={method.value} value={method.value}>
                  {method.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Status</Label>
          <Select
            value={formData.status}
            onValueChange={(value) => setFormData({ ...formData, status: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              {TRANSACTION_STATUS.map((status) => (
                <SelectItem key={status.value} value={status.value}>
                  {status.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Reference Number</Label>
        <Input
          placeholder="Invoice/Reference number"
          value={formData.reference_number}
          onChange={(e) => setFormData({ ...formData, reference_number: e.target.value })}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="is_taxable"
            checked={formData.is_taxable}
            onCheckedChange={(checked) => setFormData({ ...formData, is_taxable: checked as boolean })}
          />
          <Label htmlFor="is_taxable" className="text-sm font-normal">Taxable</Label>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="is_reconciled"
            checked={formData.is_reconciled}
            onCheckedChange={(checked) => setFormData({ ...formData, is_reconciled: checked as boolean })}
          />
          <Label htmlFor="is_reconciled" className="text-sm font-normal">Reconciled</Label>
        </div>
      </div>

      {formData.is_taxable && (
        <div className="space-y-2">
          <Label>Tax Amount</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₱</span>
            <Input
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={formData.tax_amount}
              onChange={(e) => setFormData({ ...formData, tax_amount: e.target.value })}
              className="pl-8"
            />
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label>Notes</Label>
        <Textarea
          placeholder="Additional notes..."
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          rows={2}
        />
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <CheckCircle className="h-4 w-4 mr-2" />
              {transaction ? 'Update' : 'Save'}
            </>
          )}
        </Button>
      </DialogFooter>
    </form>
  );
};

// ============================================
// TRANSACTIONS TABLE
// ============================================

interface TransactionsTableProps {
  transactions: Transaction[];
  categories: TransactionCategory[];
  onEdit: (transaction: Transaction) => void;
  onDelete: (transaction: Transaction) => void;
  isMobile?: boolean;
}

const TransactionsTable = ({
  transactions,
  categories,
  onEdit,
  onDelete,
  isMobile = false,
}: TransactionsTableProps) => {
  const getCategory = (id: string) => categories.find((c) => c.id === id);

  const TransactionTypeBadge = ({ type }: { type: string }) => {
    const config: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' }> = {
      expense: { label: 'Expense', variant: 'secondary' },
      income: { label: 'Income', variant: 'success' },
      transfer: { label: 'Transfer', variant: 'outline' },
      adjustment: { label: 'Adjustment', variant: 'warning' },
    };
    const { label, variant } = config[type] || config.expense;
    return <Badge variant={variant as any} className="text-xs">{label}</Badge>;
  };

  const StatusBadge = ({ status }: { status?: string }) => {
    const config: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' }> = {
      pending: { label: 'Pending', variant: 'warning' },
      completed: { label: 'Completed', variant: 'success' },
      cancelled: { label: 'Cancelled', variant: 'destructive' },
    };
    const { label, variant } = status ? config[status] : config.pending;
    return <Badge variant={variant as any} className="text-xs">{label}</Badge>;
  };

  const CategoryBadge = ({ category }: { category?: string }) => {
    const config: Record<string, { label: string; color: string }> = {
      operating: { label: 'Operating', color: 'bg-blue-500' },
      capital: { label: 'Capital', color: 'bg-purple-500' },
      payroll: { label: 'Payroll', color: 'bg-green-500' },
      tax: { label: 'Tax', color: 'bg-red-500' },
      other: { label: 'Other', color: 'bg-gray-500' },
    };
    const { label, color } = category ? config[category] : config.other;
    return (
      <Badge variant="outline" className="gap-1 text-xs">
        <span className={cn("w-1.5 h-1.5 rounded-full", color)} />
        {label}
      </Badge>
    );
  };

  if (isMobile) {
    return (
      <div className="space-y-3">
        {transactions.map((transaction) => {
          const category = getCategory(transaction.category_id);
          return (
            <div key={transaction.id} className="bg-card rounded-lg border p-4 space-y-3 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <TransactionTypeBadge type={transaction.type} />
                    <CategoryBadge category={transaction.category} />
                    {transaction.status && <StatusBadge status={transaction.status} />}
                    {category && (
                      <Badge variant="outline" className="gap-1 text-xs">
                        <span className={cn("w-1.5 h-1.5 rounded-full", category.color)} />
                        {ICON_MAP[category.icon || 'wallet']}
                        <span className="truncate max-w-[80px]">{category.name}</span>
                      </Badge>
                    )}
                  </div>
                  <p className="font-medium text-sm mt-1 truncate">{transaction.description}</p>
                  {transaction.reference_number && (
                    <p className="text-xs text-muted-foreground">Ref: {transaction.reference_number}</p>
                  )}
                </div>
                <div className="text-right flex-shrink-0 ml-2">
                  <span className={cn(
                    "text-lg font-bold",
                    transaction.type === 'income' ? 'text-green-600' : 
                    transaction.type === 'expense' ? 'text-red-600' : 
                    'text-blue-600'
                  )}>
                    {transaction.type === 'income' ? '+' : '-'}₱{Number(transaction.amount).toFixed(2)}
                  </span>
                  {transaction.is_taxable && (
                    <p className="text-xs text-muted-foreground">+ Tax: ₱{Number(transaction.tax_amount || 0).toFixed(2)}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <CalendarIcon className="h-3.5 w-3.5" />
                  {format(new Date(transaction.created_at), 'MMM dd, yyyy')}
                </span>
                <div className="flex items-center gap-2">
                  {transaction.payment_method && (
                    <span className="text-xs capitalize">{transaction.payment_method.replace('_', ' ')}</span>
                  )}
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => onEdit(transaction)}
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => onDelete(transaction)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg border overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow>
              <TableHead className="text-xs font-medium">Date</TableHead>
              <TableHead className="text-xs font-medium">Description</TableHead>
              <TableHead className="text-xs font-medium">Type</TableHead>
              <TableHead className="text-xs font-medium">Category</TableHead>
              <TableHead className="text-xs font-medium">Status</TableHead>
              <TableHead className="text-xs font-medium text-right">Amount</TableHead>
              <TableHead className="text-xs font-medium text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.map((transaction) => {
              const category = getCategory(transaction.category_id);
              return (
                <TableRow key={transaction.id} className="hover:bg-muted/20">
                  <TableCell className="text-sm">
                    {format(new Date(transaction.created_at), 'MMM dd, yyyy')}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium text-sm max-w-[200px] truncate">
                        {transaction.description}
                      </span>
                      {transaction.reference_number && (
                        <span className="text-xs text-muted-foreground">Ref: {transaction.reference_number}</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <TransactionTypeBadge type={transaction.type} />
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <CategoryBadge category={transaction.category} />
                      {category && (
                        <Badge variant="outline" className="gap-1 text-xs w-fit">
                          <span className={cn("w-1.5 h-1.5 rounded-full", category.color)} />
                          {ICON_MAP[category.icon || 'wallet']}
                          {category.name}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {transaction.status && <StatusBadge status={transaction.status} />}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex flex-col items-end">
                      <span className={cn(
                        "font-semibold text-sm",
                        transaction.type === 'income' ? 'text-green-600' : 
                        transaction.type === 'expense' ? 'text-red-600' : 
                        'text-blue-600'
                      )}>
                        {transaction.type === 'income' ? '+' : '-'}₱{Number(transaction.amount).toFixed(2)}
                      </span>
                      {transaction.is_taxable && (
                        <span className="text-xs text-muted-foreground">Tax: ₱{Number(transaction.tax_amount || 0).toFixed(2)}</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => onEdit(transaction)}
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => onDelete(transaction)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

// ============================================
// MAIN TRANSACTIONS CLIENT
// ============================================

interface TransactionsClientProps {
  initialData?: any;
  user: any;
}

export function TransactionsClient({ initialData, user }: TransactionsClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Get initial date range from URL params
  const getInitialDateRange = useCallback(() => {
    const dateFrom = searchParams.get('date_from');
    const dateTo = searchParams.get('date_to');

    if (dateFrom && dateTo) {
      return {
        from: parseISO(dateFrom),
        to: parseISO(dateTo),
      };
    }

    return {
      from: startOfMonth(new Date()),
      to: new Date(),
    };
  }, [searchParams]);

  // State
  const [transactions, setTransactions] = useState<Transaction[]>(initialData?.transactions || []);
  const [categories, setCategories] = useState<TransactionCategory[]>(loadCategories);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(initialData?.count || 0);
  const [totalPages, setTotalPages] = useState(initialData?.total_pages || 1);
  const [dateRange, setDateRange] = useState<{ from: Date | null; to: Date | null }>(getInitialDateRange());
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(loadBreakdownVisibility());
  const [filters, setFilters] = useState({
    type: searchParams.get('type') || 'all',
    category: searchParams.get('category') || 'all',
    status: searchParams.get('status') || 'all',
  });

  // Dialog states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [deletingTransaction, setDeletingTransaction] = useState<Transaction | null>(null);

  // Mobile detection
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Save categories to localStorage
  useEffect(() => {
    saveCategories(categories);
  }, [categories]);

  // Save breakdown visibility
  useEffect(() => {
    saveBreakdownVisibility(showBreakdown);
  }, [showBreakdown]);

  // Update URL with filters
  const updateUrlParams = useCallback((params: Record<string, any>) => {
    const urlParams = new URLSearchParams(searchParams.toString());

    Object.entries(params).forEach(([key, value]) => {
      if (value && value !== 'all') {
        urlParams.set(key, value);
      } else {
        urlParams.delete(key);
      }
    });

    router.push(`${pathname}?${urlParams.toString()}`);
  }, [router, pathname, searchParams]);

  // Fetch transactions
  const fetchTransactions = useCallback(async (page?: number) => {
    const pageNum = page || currentPage;
    const offset = (pageNum - 1) * ITEMS_PER_PAGE;

    const queryFilters: Record<string, any> = {};
    if (dateRange.from) queryFilters.date_from = dateRange.from.toISOString();
    if (dateRange.to) queryFilters.date_to = dateRange.to.toISOString();
    if (filters.type && filters.type !== 'all') queryFilters.type = filters.type;
    if (filters.category && filters.category !== 'all') queryFilters.category = filters.category;
    if (filters.status && filters.status !== 'all') queryFilters.status = filters.status;
    if (user?.id) queryFilters.customer_id = user.id;

    setIsLoading(true);
    try {
      const response = await listTransactions(ITEMS_PER_PAGE, offset, queryFilters);

      setTransactions(response.transactions || []);
      setTotalCount(response.count || 0);
      setTotalPages(response.total_pages || 1);
      return response.transactions;
    } catch (error) {
      console.error('Error fetching transactions:', error);
      toast.error('Failed to fetch transactions');
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, dateRange, filters, user]);

  // Fetch when filters change
  useEffect(() => {
    fetchTransactions(1);
    setCurrentPage(1);
  }, [dateRange, filters.type, filters.category, filters.status]);

  useEffect(() => {
    if (transactions.length && !categories.length) {
      const uniqueCategories = [...new Set(
        transactions
          .filter((a: any) => a.category_id)
          .map((a: any) => a.category_id.trim())
      )];

      let transCat = uniqueCategories.map((categoryId: string) => {
        let number = Math.floor(Math.random() * 12) + 1;
        return {
          id: categoryId,
          name: categoryId,
          type: 'expense' as const,
          icon: 'wallet',
          color: CATEGORY_COLORS[number],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as TransactionCategory;
      });
      
      setCategories(transCat);
    }
  }, [transactions]);

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    fetchTransactions(page);
  };

  // Handle date range change
  const handleDateRangeChange = (range: { from: Date | null; to: Date | null }) => {
    setDateRange(range);
    setCurrentPage(1);
    updateUrlParams({
      date_from: range.from ? range.from.toISOString().split('T')[0] : null,
      date_to: range.to ? range.to.toISOString().split('T')[0] : null,
    });
  };

  // Handle filter change
  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    updateUrlParams({ [key]: value });
  };

  // Handle create/update transaction
  const handleSaveTransaction = async (data: any) => {
    setIsLoading(true);
    try {
      const transactionData = {
        ...data,
        amount: parseFloat(data.amount),
        customer_id: user?.id,
        date: new Date(data.date).toISOString(),
        tax_amount: data.is_taxable ? parseFloat(data.tax_amount || 0) : 0,
      };

      let result;
      if (editingTransaction) {
        result = await updateTransaction(editingTransaction.id, transactionData);
        if (result.success) {
          toast.success('Transaction updated successfully');
        }
      } else {
        result = await createTransaction(transactionData);
        if (result.success) {
          toast.success('Transaction created successfully');
        }
      }

      if (result.success) {
        setIsFormOpen(false);
        setEditingTransaction(null);
        fetchTransactions(currentPage);
      }
    } catch (error) {
      console.error('Error saving transaction:', error);
      toast.error('Failed to save transaction');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle delete transaction
  const handleDeleteTransaction = async () => {
    if (!deletingTransaction) return;
    setIsLoading(true);
    try {
      const result = await deleteTransaction(deletingTransaction.id);
      if (result.success) {
        toast.success('Transaction deleted successfully');
        setDeletingTransaction(null);
        fetchTransactions(currentPage);
      }
    } catch (error) {
      console.error('Error deleting transaction:', error);
      toast.error('Failed to delete transaction');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle categories
  const handleAddCategory = (category: TransactionCategory) => {
    setCategories([...categories, category]);
  };

  // Calculate totals by category
  const categoryTotals = useMemo(() => {
    const totals: Record<string, { category: TransactionCategory | undefined; total: number; count: number }> = {};

    transactions.forEach(t => {
      const category = categories.find(c => c.id === t.category_id);
      const key = t.category_id || 'uncategorized';
      if (!totals[key]) {
        totals[key] = { category, total: 0, count: 0 };
      }
      totals[key].total += Number(t.amount);
      totals[key].count += 1;
    });

    return Object.values(totals).sort((a, b) => b.total - a.total);
  }, [transactions, categories]);

  // Calculate overall totals
  const totals = useMemo(() => {
    const totalIncome = transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + Number(t.amount), 0);
    const totalExpenses = transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + Number(t.amount), 0);
    const totalTransfers = transactions
      .filter(t => t.type === 'transfer')
      .reduce((sum, t) => sum + Number(t.amount), 0);
    const totalAdjustments = transactions
      .filter(t => t.type === 'adjustment')
      .reduce((sum, t) => sum + Number(t.amount), 0);
    
    return { 
      totalIncome, 
      totalExpenses, 
      totalTransfers,
      totalAdjustments,
      netCashFlow: totalIncome - totalExpenses,
      total: totalIncome + totalExpenses + totalTransfers + totalAdjustments 
    };
  }, [transactions]);

  // Reset date range
  const resetDateRange = () => {
    const from = startOfMonth(new Date());
    const to = new Date();
    handleDateRangeChange({ from, to });
  };

  // Quick date range presets
  const setDatePreset = (preset: 'today' | 'week' | 'month' | 'quarter' | 'year') => {
    const now = new Date();
    let from: Date;
    let to: Date = now;

    switch (preset) {
      case 'today':
        from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        from = new Date(now);
        from.setDate(now.getDate() - 7);
        break;
      case 'month':
        from = startOfMonth(now);
        break;
      case 'quarter':
        from = new Date(now);
        from.setMonth(now.getMonth() - 3);
        break;
      case 'year':
        from = new Date(now);
        from.setFullYear(now.getFullYear() - 1);
        break;
      default:
        return;
    }

    handleDateRangeChange({ from, to });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Transactions</h1>
          <p className="text-sm text-muted-foreground">Track all cash flow including income, expenses, payroll, and more</p>
        </div>
        <Button onClick={() => {
          setEditingTransaction(null);
          setIsFormOpen(true);
        }} size="sm" className="gap-1">
          <Plus className="h-4 w-4" />
          Add Transaction
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Net Cash Flow', value: totals.netCashFlow, icon: Wallet, color: 'text-primary' },
          { label: 'Income', value: totals.totalIncome, icon: TrendingUp, color: 'text-green-500' },
          { label: 'Expenses', value: totals.totalExpenses, icon: TrendingDown, color: 'text-red-500' },
          { label: 'Transfers', value: totals.totalTransfers, icon: Banknote, color: 'text-blue-500' },
        ].map((stat, index) => (
          <div key={index} className="bg-card rounded-lg border p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
                <p className={cn(
                  "text-lg font-bold mt-0.5",
                  stat.value > 0 ? 'text-green-600' : stat.value < 0 ? 'text-red-600' : ''
                )}>
                  ₱{stat.value.toFixed(2)}
                </p>
              </div>
              <div className={cn("h-8 w-8 rounded-full bg-opacity-10 flex items-center justify-center", stat.color)}>
                <stat.icon className={cn("h-4 w-4", stat.color)} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Category Breakdown - Toggleable */}
      {categoryTotals.length > 0 && (
        <div className="bg-card rounded-lg border overflow-hidden">
          <button
            onClick={() => setShowBreakdown(!showBreakdown)}
            className="w-full flex items-center justify-between p-3 hover:bg-muted/30 transition-colors"
          >
            <div className="flex items-center gap-2">
              <FolderOpen className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Category Breakdown</span>
              <Badge variant="secondary" className="text-xs">
                {categoryTotals.length}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              {showBreakdown ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          </button>

          {showBreakdown && (
            <div className="p-3 pt-0 border-t">
              <div className="flex flex-wrap gap-2">
                {categoryTotals.map(({ category, total, count }, index) => (
                  <div
                    key={`${category?.id}${index}`}
                    className="flex items-center gap-2 bg-muted/30 rounded-full px-3 py-1.5 text-sm"
                  >
                    {category ? (
                      <>
                        <span className={cn("w-2 h-2 rounded-full", category.color)} />
                        {ICON_MAP[category.icon || 'wallet']}
                        <span className="font-medium">{category.name}</span>
                      </>
                    ) : (
                      <span className="text-muted-foreground">Uncategorized</span>
                    )}
                    <span className="font-bold">₱{total.toFixed(2)}</span>
                    <span className="text-xs text-muted-foreground">({count})</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-muted-foreground">Date Range:</span>
          <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="h-8 gap-1 text-sm min-w-[180px] justify-start">
                <CalendarIcon className="h-3.5 w-3.5" />
                {dateRange.from && dateRange.to ? (
                  <>
                    {format(dateRange.from, 'MMM d')} - {format(dateRange.to, 'MMM d, yyyy')}
                  </>
                ) : (
                  'Select date range'
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <div className="p-2 border-b">
                <div className="flex gap-1 flex-wrap">
                  {['today', 'week', 'month', 'quarter', 'year'].map((preset) => (
                    <Button
                      key={preset}
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs px-2"
                      onClick={() => setDatePreset(preset as any)}
                    >
                      {preset.charAt(0).toUpperCase() + preset.slice(1)}
                    </Button>
                  ))}
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs px-2"
                    onClick={resetDateRange}
                  >
                    Reset
                  </Button>
                </div>
              </div>
              <Calendar
                mode="range"
                selected={{
                  from: dateRange.from || undefined,
                  to: dateRange.to || undefined,
                }}
                onSelect={(range) => {
                  if (range) {
                    handleDateRangeChange({
                      from: range.from || null,
                      to: range.to || null,
                    });
                  }
                }}
                initialFocus
                className="rounded-md"
              />
            </PopoverContent>
          </Popover>
          {(dateRange.from || dateRange.to) && (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={resetDateRange}>
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Select
            value={filters.type}
            onValueChange={(value) => handleFilterChange('type', value)}
          >
            <SelectTrigger className="h-8 w-[130px] text-xs">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {TRANSACTION_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  <div className="flex items-center gap-2">
                    {type.icon}
                    {type.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filters.category}
            onValueChange={(value) => handleFilterChange('category', value)}
          >
            <SelectTrigger className="h-8 w-[130px] text-xs">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {TRANSACTION_CATEGORIES.map((cat) => (
                <SelectItem key={cat.value} value={cat.value}>
                  <div className="flex items-center gap-2">
                    {cat.icon}
                    {cat.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filters.status}
            onValueChange={(value) => handleFilterChange('status', value)}
          >
            <SelectTrigger className="h-8 w-[130px] text-xs">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              {TRANSACTION_STATUS.map((status) => (
                <SelectItem key={status.value} value={status.value}>
                  {status.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1 flex items-center justify-end gap-2 text-sm text-muted-foreground">
          <span>{transactions.length} of {totalCount} transactions</span>
        </div>
      </div>

      {/* Transactions Table */}
      {isLoading && transactions.length === 0 ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : transactions.length === 0 ? (
        <div className="text-center py-12 bg-card rounded-lg border">
          <Wallet className="h-10 w-10 mx-auto mb-2 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">No transactions found</p>
          <p className="text-xs text-muted-foreground mt-1">
            {dateRange.from || dateRange.to
              ? 'Try adjusting your filters'
              : 'Add your first transaction to get started'}
          </p>
        </div>
      ) : (
        <TransactionsTable
          transactions={transactions}
          categories={categories}
          onEdit={(transaction) => {
            setEditingTransaction(transaction);
            setIsFormOpen(true);
          }}
          onDelete={(transaction) => setDeletingTransaction(transaction)}
          isMobile={isMobile}
        />
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-4 py-2 border-t">
          <div className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1 || isLoading}
              className="h-8 w-8 p-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="px-3 py-1 text-sm font-medium min-w-[2rem] text-center">
              {currentPage}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages || isLoading}
              className="h-8 w-8 p-0"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Transaction Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingTransaction ? 'Edit Transaction' : 'Add Transaction'}
            </DialogTitle>
            <DialogDescription>
              {editingTransaction ? 'Update the transaction details' : 'Record a new transaction for your accounting records'}
            </DialogDescription>
          </DialogHeader>
          <TransactionForm
            transaction={editingTransaction || undefined}
            onSave={handleSaveTransaction}
            onCancel={() => {
              setIsFormOpen(false);
              setEditingTransaction(null);
            }}
            categories={categories}
            onAddCategory={handleAddCategory}
            isLoading={isLoading}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingTransaction} onOpenChange={() => setDeletingTransaction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Transaction</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingTransaction?.description}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTransaction}
              className="bg-destructive hover:bg-destructive/90"
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}