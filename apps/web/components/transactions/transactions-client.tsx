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
  deleteTransaction,
  // Category actions
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getCategoryTree,
  searchCategories,
  getCategoriesByType,
} from '@/lib/actions/transactions';
import type { Transaction, TransactionCategory } from '@/types/transactions';
import { TransactionForm } from './transaction-form';

// ============================================
// CONSTANTS
// ============================================

const ITEMS_PER_PAGE = 10;

const TRANSACTION_TYPES = [
  { value: 'expense', label: 'Expense', icon: <TrendingDown className="h-4 w-4" />, color: 'text-red-500' },
  { value: 'income', label: 'Income', icon: <TrendingUp className="h-4 w-4" />, color: 'text-green-500' },
  { value: 'transfer', label: 'Transfer', icon: <Banknote className="h-4 w-4" />, color: 'text-blue-500' },
];

const TRANSACTION_STATUS = [
  { value: 'pending', label: 'Pending', variant: 'warning' as const },
  { value: 'completed', label: 'Completed', variant: 'success' as const },
  { value: 'failed', label: 'Failed', variant: 'destructive' as const },
  { value: 'cancelled', label: 'Cancelled', variant: 'destructive' as const },
  { value: 'refunded', label: 'Refunded', variant: 'secondary' as const },
];

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'credit_card', label: 'Credit Card' },
  { value: 'debit_card', label: 'Debit Card' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'digital_wallet', label: 'Digital Wallet' },
  { value: 'check', label: 'Check' },
  { value: 'other', label: 'Other' },
];

// ============================================
// TRANSACTIONS TABLE
// ============================================

interface TransactionsTableProps {
  transactions: Transaction[];
  categories: TransactionCategory[];
  onEdit: (transaction: Transaction) => void;
  onDelete: (transaction: Transaction) => void;
  onRefresh?: () => void;
  isMobile?: boolean;
  isLoading?: boolean;
}

const TransactionsTable = ({
  transactions,
  categories,
  onEdit,
  onDelete,
  onRefresh,
  isMobile = false,
  isLoading = false,
}: TransactionsTableProps) => {
  const getCategory = (id: string) => categories.find((c) => c.id === id);

  const TransactionTypeBadge = ({ type }: { type: string }) => {
    const config: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' }> = {
      expense: { label: 'Expense', variant: 'secondary' },
      income: { label: 'Income', variant: 'success' },
      transfer: { label: 'Transfer', variant: 'outline' },
    };
    const { label, variant } = config[type] || config.expense;
    return <Badge variant={variant as any} className="text-xs">{label}</Badge>;
  };

  const StatusBadge = ({ status }: { status?: string }) => {
    const config: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' }> = {
      pending: { label: 'Pending', variant: 'warning' },
      completed: { label: 'Completed', variant: 'success' },
      failed: { label: 'Failed', variant: 'destructive' },
      cancelled: { label: 'Cancelled', variant: 'destructive' },
      refunded: { label: 'Refunded', variant: 'secondary' },
    };
    const { label, variant } = status ? config[status] : config.pending;
    return <Badge variant={variant as any} className="text-xs">{label}</Badge>;
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
                    {transaction.status && <StatusBadge status={transaction.status} />}
                    {category && (
                      <Badge variant="outline" className="gap-1 text-xs">
                        <span className={cn("w-1.5 h-1.5 rounded-full", category.color)} />
                        {category.icon && <span>{category.icon}</span>}
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
                  {format(new Date(transaction.transaction_date || transaction.created_at), 'MMM dd, yyyy')}
                </span>
                {/* <div className="flex items-center gap-2">
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
                </div> */}
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
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : transactions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No transactions found
                </TableCell>
              </TableRow>
            ) : (
              transactions.map((transaction) => {
                const category = getCategory(transaction.category_id);
                return (
                  <TableRow key={transaction.id} className="hover:bg-muted/20">
                    <TableCell className="text-sm">
                      {format(new Date(transaction.transaction_date || transaction.created_at), 'MMM dd, yyyy')}
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
                      {category ? (
                        <Badge variant="outline" className="gap-1 text-xs">
                          <span className={cn("w-1.5 h-1.5 rounded-full", category.color)} />
                          {category.icon && <span>{category.icon}</span>}
                          {category.name}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
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
                        {/* <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => onEdit(transaction)}
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button> */}
                        {/* <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => onDelete(transaction)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button> */}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
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
  initialCategories?: TransactionCategory[];
}

export function TransactionsClient({ 
  initialData, 
  user, 
  initialCategories = [] 
}: TransactionsClientProps) {
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
  const [categories, setCategories] = useState<TransactionCategory[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCategoriesLoading, setIsCategoriesLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(initialData?.count || 0);
  const [totalPages, setTotalPages] = useState(initialData?.total_pages || 1);
  const [dateRange, setDateRange] = useState<{ from: Date | null; to: Date | null }>(getInitialDateRange());
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(true);
  const [filters, setFilters] = useState({
    type: searchParams.get('type') || 'all',
    category_id: searchParams.get('category_id') || 'all',
    status: searchParams.get('status') || 'all',
    search: searchParams.get('search') || '',
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

  // Fetch categories on mount
  useEffect(() => {
    if (initialCategories.length === 0) {
      fetchCategories();
    }
  }, []);

  // Update URL with filters
  const updateUrlParams = useCallback((params: Record<string, any>) => {
    const urlParams = new URLSearchParams(searchParams.toString());

    Object.entries(params).forEach(([key, value]) => {
      if (value && value !== 'all' && value !== '') {
        urlParams.set(key, value);
      } else {
        urlParams.delete(key);
      }
    });

    router.push(`${pathname}?${urlParams.toString()}`);
  }, [router, pathname, searchParams]);

  // Fetch categories from server
  const fetchCategories = useCallback(async () => {
    setIsCategoriesLoading(true);
    try {
      const result = await listCategories({
        limit: 200,
        is_active: true,
        order_by: 'name',
        order_direction: 'ASC',
      });


      console.log(result, 'RSD CCAT')
      if (result.categories) {
        setCategories(result.categories);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast.error('Failed to load categories');
    } finally {
      setIsCategoriesLoading(false);
    }
  }, []);

  // Fetch transactions
  const fetchTransactions = useCallback(async (page?: number) => {
    const pageNum = page || currentPage;
    const offset = (pageNum - 1) * ITEMS_PER_PAGE;

    const queryFilters: Record<string, any> = {};
    if (dateRange.from) queryFilters.date_from = dateRange.from.toISOString();
    if (dateRange.to) queryFilters.date_to = dateRange.to.toISOString();
    if (filters.type && filters.type !== 'all') queryFilters.type = filters.type;
    if (filters.category_id && filters.category_id !== 'all') queryFilters.category_id = filters.category_id;
    if (filters.status && filters.status !== 'all') queryFilters.status = filters.status;
    if (filters.search) queryFilters.search = filters.search;
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
  }, [dateRange, filters.type, filters.category_id, filters.status, filters.search]);

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

  // Handle search
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFilters(prev => ({ ...prev, search: value }));
    updateUrlParams({ search: value });
  };

  // Handle save transaction
  const handleSaveTransaction = async (data: any) => {
    setIsLoading(true);
    try {
      const transactionData = {
        ...data,
        amount: parseFloat(data.amount),
        customer_id: user?.id,
        transaction_date: new Date(data.date).toISOString(),
        tax_amount: data.is_taxable ? parseFloat(data.tax_amount || 0) : 0,
        notes: data.notes || '',
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
        // Refresh categories to get any new ones
        fetchCategories();
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

  // ============================================
  // CATEGORY CRUD OPERATIONS
  // ============================================

  // Handle add category
  const handleAddCategory = async (categoryData: any) => {
    try {
      const result = await createCategory({
        name: categoryData.name,
        type: categoryData.type || 'expense',
        icon: categoryData.icon || null,
        color: categoryData.color || null,
        description: categoryData.description || null,
        is_active: true,
        is_taxable: categoryData.is_taxable || false,
        tax_rate: categoryData.tax_rate || null,
      });

      if (result.success && result.category) {
        setCategories(prev => [...prev, result.category]);
        toast.success(`Category "${result.category.name}" created successfully`);
        return result.category;
      } else {
        toast.error(result.error || 'Failed to create category');
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error adding category:', error);
      toast.error('Failed to create category');
      throw error;
    }
  };

  // Handle update category
  const handleUpdateCategory = async (id: string, data: any) => {
    try {
      const result = await updateCategory(id, data);
      if (result.success && result.category) {
        setCategories(prev => 
          prev.map(c => c.id === id ? result.category : c)
        );
        toast.success(`Category updated successfully`);
        return result.category;
      } else {
        toast.error(result.error || 'Failed to update category');
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error updating category:', error);
      toast.error('Failed to update category');
      throw error;
    }
  };

  // Handle delete category
  const handleDeleteCategory = async (id: string) => {
    try {
      const result = await deleteCategory(id);
      if (result.success) {
        setCategories(prev => prev.filter(c => c.id !== id));
        // If the deleted category was selected, clear it
        if (filters.category_id === id) {
          setFilters(prev => ({ ...prev, category_id: 'all' }));
          updateUrlParams({ category_id: 'all' });
        }
        toast.success('Category deleted successfully');
      } else {
        toast.error(result.error || 'Failed to delete category');
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error deleting category:', error);
      toast.error('Failed to delete category');
      throw error;
    }
  };

  // Handle refresh categories
  const handleRefreshCategories = async () => {
    await fetchCategories();
    toast.info('Categories refreshed');
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

    return Object.values(totals)
      .filter(item => item.total !== 0)
      .sort((a, b) => b.total - a.total);
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
    
    return { 
      totalIncome, 
      totalExpenses, 
      totalTransfers,
      netCashFlow: totalIncome - totalExpenses - totalTransfers,
      total: totalIncome + totalExpenses + totalTransfers 
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
    const to: Date = now;

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

  // Filter options for categories dropdown
  const categoryOptions = useMemo(() => {
    const uniqueCategories = new Map();
    categories.forEach(cat => {
      if (cat.is_active !== false) {
        uniqueCategories.set(cat.id, cat);
      }
    });
    return Array.from(uniqueCategories.values());
  }, [categories]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Transactions</h1>
          <p className="text-sm text-muted-foreground">Track all cash flow including income, expenses, and transfers</p>
        </div>
        <Button 
          onClick={() => {
            setEditingTransaction(null);
            setIsFormOpen(true);
          }} 
          size="sm" 
          className="gap-1"
        >
          <Plus className="h-4 w-4" />
          Add Transaction
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Net Cash Flow', value: totals.netCashFlow, icon: Wallet, color: totals.netCashFlow >= 0 ? 'text-green-500' : 'text-red-500' },
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
                    key={`${category?.id || 'uncategorized'}_${index}`}
                    className="flex items-center gap-2 bg-muted/30 rounded-full px-3 py-1.5 text-sm"
                  >
                    {category ? (
                      <>
                        <span className={cn("w-2 h-2 rounded-full", category.color)} />
                        <span>{category.icon || '📦'}</span>
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
      <div className="flex flex-col lg:flex-row items-start lg:items-center gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-muted-foreground">Date:</span>
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

        <div className="flex items-center gap-2 flex-wrap flex-1">
          <div className="relative flex-1 min-w-[150px]">
            <Input
              type="search"
              placeholder="Search transactions..."
              value={filters.search}
              onChange={handleSearch}
              className="h-8 text-sm pl-8"
            />
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground">
              🔍
            </span>
          </div>

          <Select
            value={filters.type}
            onValueChange={(value) => handleFilterChange('type', value)}
          >
            <SelectTrigger className="h-8 w-[120px] text-xs">
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
            value={filters.category_id}
            onValueChange={(value) => handleFilterChange('category_id', value)}
          >
            <SelectTrigger className="h-8 w-[130px] text-xs">
              <SelectValue placeholder="Category">
                {filters.category_id !== 'all' && categories.find(c => c.id === filters.category_id) ? (
                  <div className="flex items-center gap-2">
                    <span className={cn("w-2 h-2 rounded-full", categories.find(c => c.id === filters.category_id)?.color)} />
                    <span>{categories.find(c => c.id === filters.category_id)?.icon || '📦'}</span>
                    <span className="truncate">{categories.find(c => c.id === filters.category_id)?.name}</span>
                  </div>
                ) : (
                  <span>Category</span>
                )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categoryOptions.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  <div className="flex items-center gap-2">
                    <span className={cn("w-2 h-2 rounded-full", cat.color)} />
                    <span>{cat.icon || '📦'}</span>
                    <span className="truncate">{cat.name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filters.status}
            onValueChange={(value) => handleFilterChange('status', value)}
          >
            <SelectTrigger className="h-8 w-[120px] text-xs">
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

        <div className="flex items-center gap-2 text-sm text-muted-foreground whitespace-nowrap">
          <span>{transactions.length} of {totalCount}</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => fetchTransactions(currentPage)}
            disabled={isLoading}
          >
            <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} />
          </Button>
        </div>
      </div>

      {/* Transactions Table */}
      <TransactionsTable
        transactions={transactions}
        categories={categories}
        onEdit={(transaction) => {
          setEditingTransaction(transaction);
          setIsFormOpen(true);
        }}
        onDelete={(transaction) => setDeletingTransaction(transaction)}
        onRefresh={() => fetchTransactions(currentPage)}
        isMobile={isMobile}
        isLoading={isLoading}
      />

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
      <Dialog open={isFormOpen} onOpenChange={(open) => {
        setIsFormOpen(open);
        if (!open) setEditingTransaction(null);
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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
            loadingCategories={isCategoriesLoading}
            onAddCategory={handleAddCategory}
            onUpdateCategory={handleUpdateCategory}
            onDeleteCategory={handleDeleteCategory}
            onRefreshCategories={handleRefreshCategories}
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
              {deletingTransaction?.attachments && deletingTransaction.attachments.length > 0 && (
                <span className="block mt-2 text-yellow-600">
                  ⚠️ This transaction has {deletingTransaction.attachments.length} attachment(s) that will also be deleted.
                </span>
              )}
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