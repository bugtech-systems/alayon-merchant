import { useState, useRef, useEffect } from 'react';
import { format } from 'date-fns';
import { 
  Plus, 
  CheckCircle, 
  Loader2, 
  Edit2, 
  Trash2, 
  X, 
  Upload, 
  File, 
  Image, 
  FileText,
  Download,
  Check,
  RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';

// Types
interface TransactionAttachment {
  id: string;
  file_name: string;
  file_url: string;
  file_size: number;
  mime_type: string;
  uploaded_at: string;
  thumbnail_url?: string;
}

interface TransactionCategory {
  id: string;
  name: string;
  type: 'income' | 'expense' | 'transfer';
  icon: string;
  color: string;
  created_at: string;
  updated_at: string;
  parent_id?: string | null;
  is_active?: boolean;
  description?: string | null;
  account_code?: string | null;
  is_taxable?: boolean;
  tax_rate?: number | null;
}

interface TransactionFormData {
  amount: string;
  description: string;
  type: string;
  category_id: string;
  date: string;
  payment_method: string;
  status: string;
  reference_number: string;
  notes: string;
  is_taxable: boolean;
  tax_amount: string;
  is_reconciled: boolean;
}

interface TransactionFormProps {
  transaction?: any;
  onSave: (data: any) => Promise<void>;
  onCancel: () => void;
  categories: TransactionCategory[];
  loadingCategories?: boolean;
  onAddCategory: (category: Omit<TransactionCategory, 'id' | 'created_at' | 'updated_at'>) => Promise<any>;
  onUpdateCategory: (id: string, data: Partial<TransactionCategory>) => Promise<any>;
  onDeleteCategory: (id: string) => Promise<any>;
  onRefreshCategories?: () => Promise<void>;
  isLoading?: boolean;
}

// Constants
const CATEGORY_COLORS = [
  'bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-green-500',
  'bg-blue-500', 'bg-purple-500', 'bg-pink-500', 'bg-indigo-500',
  'bg-teal-500', 'bg-cyan-500', 'bg-rose-500', 'bg-violet-500'
];

const ICON_MAP: Record<string, string> = {
  wallet: '💳',
  shopping: '🛍️',
  food: '🍽️',
  transport: '🚗',
  housing: '🏠',
  utilities: '💡',
  entertainment: '🎮',
  healthcare: '🏥',
  education: '📚',
  clothing: '👕',
  salary: '💰',
  gift: '🎁',
  investment: '📈',
  business: '💼',
  other: '📦',
  coffee: '☕',
  grocery: '🛒',
  rent: '🏢',
  insurance: '🛡️',
  taxes: '📋',
  travel: '✈️',
  software: '💻',
  hardware: '🖥️',
  phone: '📱',
  internet: '🌐',
  electricity: '⚡',
  water: '💧',
  gas: '⛽',
  parking: '🅿️',
  toll: '🛣️',
  maintenance: '🔧',
  repairs: '🔨',
  cleaning: '🧹',
  gardening: '🌱',
  pets: '🐾',
  charity: '🤝',
  subscriptions: '📰',
  memberships: '🏷️',
  training: '📖',
  conferences: '🎤',
  meals: '🍕',
  snacks: '🍿',
  beverages: '🥤'
};

const AVAILABLE_ICONS = Object.keys(ICON_MAP);

const TRANSACTION_TYPES = [
  { value: 'income', label: 'Income', icon: '📈' },
  { value: 'expense', label: 'Expense', icon: '📉' },
  { value: 'transfer', label: 'Transfer', icon: '🔄' },
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

const TRANSACTION_STATUS = [
  { value: 'pending', label: 'Pending' },
  { value: 'completed', label: 'Completed' },
  { value: 'failed', label: 'Failed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'refunded', label: 'Refunded' },
];

// Sub-components
const CategoryBadge = ({ category }: { category: TransactionCategory }) => {
  const colorMap: Record<string, string> = {
    'bg-red-500': 'border-red-500/20 bg-red-500/10 text-red-600',
    'bg-orange-500': 'border-orange-500/20 bg-orange-500/10 text-orange-600',
    'bg-yellow-500': 'border-yellow-500/20 bg-yellow-500/10 text-yellow-600',
    'bg-green-500': 'border-green-500/20 bg-green-500/10 text-green-600',
    'bg-blue-500': 'border-blue-500/20 bg-blue-500/10 text-blue-600',
    'bg-purple-500': 'border-purple-500/20 bg-purple-500/10 text-purple-600',
    'bg-pink-500': 'border-pink-500/20 bg-pink-500/10 text-pink-600',
    'bg-indigo-500': 'border-indigo-500/20 bg-indigo-500/10 text-indigo-600',
    'bg-teal-500': 'border-teal-500/20 bg-teal-500/10 text-teal-600',
    'bg-cyan-500': 'border-cyan-500/20 bg-cyan-500/10 text-cyan-600',
    'bg-rose-500': 'border-rose-500/20 bg-rose-500/10 text-rose-600',
    'bg-violet-500': 'border-violet-500/20 bg-violet-500/10 text-violet-600',
  };

  const colorStyle = colorMap[category.color] || 'border-gray-500/20 bg-gray-500/10 text-gray-600';

  return (
    <Badge variant="outline" className={cn("gap-1", colorStyle)}>
      <span>{ICON_MAP[category.icon || 'other']}</span>
      <span>{category.name}</span>
    </Badge>
  );
};

const EditableCategoryItem = ({
  category,
  onUpdate,
  onDelete,
  isUpdating,
}: {
  category: TransactionCategory;
  onUpdate: (id: string, data: Partial<TransactionCategory>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  isUpdating?: boolean;
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(category.name);
  const [editedIcon, setEditedIcon] = useState(category.icon);
  const [editedColor, setEditedColor] = useState(category.color);
  const [editedType, setEditedType] = useState(category.type);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleUpdate = async () => {
    if (!editedName.trim()) return;
    setIsSaving(true);
    try {
      await onUpdate(category.id, {
        name: editedName.trim(),
        icon: editedIcon,
        color: editedColor,
        type: editedType,
      });
      setIsEditing(false);
    } catch (error) {
      // Error handled by parent
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    setIsSaving(true);
    try {
      await onDelete(category.id);
      setIsDeleting(false);
    } catch (error) {
      // Error handled by parent
    } finally {
      setIsSaving(false);
    }
  };

  if (isEditing) {
    return (
      <div className="p-3 border rounded-md space-y-2 bg-muted/20">
        <Input
          value={editedName}
          onChange={(e) => setEditedName(e.target.value)}
          className="h-8"
          placeholder="Category name"
          autoFocus
          disabled={isSaving}
        />
        <div className="grid grid-cols-3 gap-2">
          <Select 
            value={editedType} 
            onValueChange={(value: any) => setEditedType(value)}
            disabled={isSaving}
          >
            <SelectTrigger className="h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TRANSACTION_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.icon} {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select 
            value={editedIcon} 
            onValueChange={setEditedIcon}
            disabled={isSaving}
          >
            <SelectTrigger className="h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {AVAILABLE_ICONS.slice(0, 20).map((icon) => (
                <SelectItem key={icon} value={icon}>
                  {ICON_MAP[icon]} {icon}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select 
            value={editedColor} 
            onValueChange={setEditedColor}
            disabled={isSaving}
          >
            <SelectTrigger className="h-8">
              <SelectValue />
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
        </div>
        <div className="flex gap-2 justify-end">
          <Button 
            type="button" 
            variant="ghost" 
            size="sm" 
            onClick={() => setIsEditing(false)}
            disabled={isSaving}
          >
            <X className="h-3 w-3 mr-1" />
            Cancel
          </Button>
          <Button 
            type="button" 
            size="sm" 
            onClick={handleUpdate}
            disabled={isSaving || !editedName.trim()}
          >
            {isSaving ? (
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            ) : (
              <Check className="h-3 w-3 mr-1" />
            )}
            Save
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between p-2 hover:bg-muted/30 rounded-md group transition-colors">
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <div className={cn("w-2 h-2 rounded-full flex-shrink-0", category.color)} />
        <span className="text-sm truncate">
          {ICON_MAP[category.icon || 'wallet']} {category.name}
        </span>
        <Badge variant="outline" className="text-xs h-5">
          {category.type}
        </Badge>
        {!category.is_active && (
          <Badge variant="secondary" className="text-xs h-5">
            Inactive
          </Badge>
        )}
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => setIsEditing(true)}
        >
          <Edit2 className="h-3 w-3" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-destructive hover:text-destructive"
          onClick={() => setIsDeleting(true)}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>

      <AlertDialog open={isDeleting} onOpenChange={setIsDeleting}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Category</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{category.name}"? This action cannot be undone.
              {category.is_active && (
                <span className="block mt-2 text-yellow-600">
                  ⚠️ This category is currently active. Consider making it inactive instead.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSaving}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete} 
              className="bg-destructive text-destructive-foreground"
              disabled={isSaving}
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

const FileAttachmentUpload = ({
  attachments,
  onUpload,
  onDelete,
  onDownload,
  isUploading,
}: {
  attachments: TransactionAttachment[];
  onUpload: (files: File[]) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onDownload: (url: string, fileName: string) => void;
  isUploading?: boolean;
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    try {
      await onUpload(Array.from(files));
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return <Image className="h-4 w-4" />;
    if (mimeType === 'application/pdf') return <FileText className="h-4 w-4" />;
    return <File className="h-4 w-4" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label>Attachments</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
        >
          {isUploading ? (
            <Loader2 className="h-3 w-3 mr-2 animate-spin" />
          ) : (
            <Upload className="h-3 w-3 mr-2" />
          )}
          {isUploading ? 'Uploading...' : 'Upload Files'}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFileUpload}
          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
        />
      </div>

      {attachments && attachments.length > 0 ? (
        <div className="grid grid-cols-1 gap-2 max-h-32 overflow-y-auto">
          {attachments.map((attachment) => (
            <div
              key={attachment.id}
              className="flex items-center justify-between p-2 bg-muted/30 rounded-md hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-2 min-w-0">
                {attachment.thumbnail_url ? (
                  <Avatar className="h-8 w-8 rounded-md">
                    <img 
                      src={attachment.thumbnail_url} 
                      alt={attachment.file_name}
                      className="h-full w-full object-cover"
                    />
                  </Avatar>
                ) : (
                  <div className="h-8 w-8 rounded-md bg-muted flex items-center justify-center">
                    {getFileIcon(attachment.mime_type)}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm truncate">{attachment.file_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(attachment.file_size)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => onDownload(attachment.file_url, attachment.file_name)}
                >
                  <Download className="h-3 w-3" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive hover:text-destructive"
                  onClick={() => onDelete(attachment.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-4 border-2 border-dashed border-muted rounded-md">
          <File className="h-8 w-8 mx-auto text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground mt-1">
            No attachments yet. Click "Upload Files" to add.
          </p>
        </div>
      )}
    </div>
  );
};

// Main Component
export const TransactionForm = ({
  transaction,
  onSave,
  onCancel,
  categories,
  loadingCategories = false,
  onAddCategory,
  onUpdateCategory,
  onDeleteCategory,
  onRefreshCategories,
  isLoading = false,
}: TransactionFormProps) => {
  const [formData, setFormData] = useState<TransactionFormData>({
    amount: transaction?.amount?.toString() || '',
    description: transaction?.description || '',
    type: transaction?.type || 'expense',
    category_id: transaction?.category_id || '',
    date: transaction?.transaction_date ? format(new Date(transaction.transaction_date), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
    payment_method: transaction?.payment_method || 'cash',
    status: transaction?.status || 'pending',
    reference_number: transaction?.reference_number || '',
    notes: transaction?.notes || '',
    is_taxable: transaction?.is_taxable || false,
    tax_amount: transaction?.tax_amount?.toString() || '',
    is_reconciled: transaction?.is_reconciled || false,
  });

  const [attachments, setAttachments] = useState<TransactionAttachment[]>(
    transaction?.attachments || []
  );
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [newCategoryData, setNewCategoryData] = useState({
    name: '',
    type: 'expense' as 'income' | 'expense' | 'transfer',
    icon: 'wallet',
    color: CATEGORY_COLORS[0],
  });
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [isUploadingFiles, setIsUploadingFiles] = useState(false);
  const [isDeletingFile, setIsDeletingFile] = useState(false);

  // Filter categories by type
  const filteredCategories = categories.filter(
    cat => cat.type === formData.type as 'income' | 'expense' | 'transfer' && cat.is_active !== false
  );

  // Reset category selection when type changes
  useEffect(() => {
    if (formData.category_id) {
      const categoryExists = categories.some(c => c.id === formData.category_id);
      if (!categoryExists) {
        setFormData(prev => ({ ...prev, category_id: '' }));
      }
    }
  }, [categories, formData.category_id]);

  const handleAddCategory = async () => {
    if (!newCategoryData.name.trim()) {
      toast.error('Category name is required');
      return;
    }

    setIsCreatingCategory(true);
    try {
      const result = await onAddCategory({
        name: newCategoryData.name.trim(),
        type: newCategoryData.type,
        icon: newCategoryData.icon,
        color: newCategoryData.color,
        is_active: true,
        description: null,
        parent_id: null,
        account_code: null,
        is_taxable: false,
        tax_rate: null,
      });

      if (result?.category) {
        setFormData(prev => ({ ...prev, category_id: result.category.id }));
        setNewCategoryData({
          name: '',
          type: 'expense',
          icon: 'wallet',
          color: CATEGORY_COLORS[0],
        });
        toast.success(`Category created successfully`);
      }
    } catch (error) {
      // Error handled by parent
    } finally {
      setIsCreatingCategory(false);
    }
  };

  const handleUpdateCategory = async (id: string, data: Partial<TransactionCategory>) => {
    try {
      await onUpdateCategory(id, data);
      toast.success('Category updated successfully');
    } catch (error) {
      // Error handled by parent
      throw error;
    }
  };

  const handleDeleteCategory = async (id: string) => {
    try {
      await onDeleteCategory(id);
      if (formData.category_id === id) {
        setFormData(prev => ({ ...prev, category_id: '' }));
      }
      toast.success('Category deleted successfully');
    } catch (error) {
      // Error handled by parent
      throw error;
    }
  };

  const handleFileUpload = async (files: File[]) => {
    setIsUploadingFiles(true);
    try {
      // Simulate upload - replace with actual API call
      const newAttachments: TransactionAttachment[] = files.map((file, index) => ({
        id: `att_${Date.now()}_${index}`,
        file_name: file.name,
        file_url: URL.createObjectURL(file),
        file_size: file.size,
        mime_type: file.type,
        uploaded_at: new Date().toISOString(),
        thumbnail_url: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
      }));
      setAttachments(prev => [...prev, ...newAttachments]);
      toast.success(`${files.length} file(s) uploaded successfully`);
    } catch (error) {
      toast.error('Failed to upload files');
      throw error;
    } finally {
      setIsUploadingFiles(false);
    }
  };

  const handleFileDelete = async (id: string) => {
    setIsDeletingFile(true);
    try {
      setAttachments(prev => prev.filter(a => a.id !== id));
      toast.success('File removed');
    } catch (error) {
      toast.error('Failed to delete file');
      throw error;
    } finally {
      setIsDeletingFile(false);
    }
  };

  const handleFileDownload = (url: string, fileName: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    if (!formData.description.trim()) {
      toast.error('Description is required');
      return;
    }
    if (!formData.category_id) {
      toast.error('Please select a category');
      return;
    }

    const submitData = {
      ...formData,
      amount: parseFloat(formData.amount),
      tax_amount: formData.tax_amount ? parseFloat(formData.tax_amount) : 0,
      transaction_date: new Date(formData.date).toISOString(),
      notes: formData.notes,
    };
    
    await onSave(submitData);
  };

  const selectedCategory = categories.find(c => c.id === formData.category_id);

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto px-1">
      {/* Basic Fields */}
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
              disabled={isLoading}
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
            disabled={isLoading}
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
          disabled={isLoading}
        />
      </div>

      {/* Type and Category */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Type *</Label>
          <Select
            value={formData.type}
            onValueChange={(value) => {
              setFormData({ ...formData, type: value, category_id: '' });
            }}
            disabled={isLoading}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              {TRANSACTION_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  <div className="flex items-center gap-2">
                    <span>{type.icon}</span>
                    {type.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Category *</Label>
            <div className="flex items-center gap-1">
              {onRefreshCategories && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={onRefreshCategories}
                  disabled={loadingCategories}
                >
                  <RefreshCw className={cn("h-3 w-3", loadingCategories && "animate-spin")} />
                </Button>
              )}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 text-xs"
                onClick={() => setShowCategoryManager(!showCategoryManager)}
              >
                <Edit2 className="h-3 w-3 mr-1" />
                Manage
              </Button>
            </div>
          </div>
          <div className="flex gap-2">
            {loadingCategories ? (
              <Skeleton className="flex-1 h-10" />
            ) : (
              <Select
                value={formData.category_id || 'none'}
                onValueChange={(value) => setFormData({ ...formData, category_id: value === 'none' ? '' : value })}
                disabled={isLoading}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select category">
                    {selectedCategory ? (
                      <div className="flex items-center gap-2">
                        <span className={cn("w-2 h-2 rounded-full", selectedCategory.color)} />
                        <span>{ICON_MAP[selectedCategory.icon || 'wallet']}</span>
                        <span className="truncate">{selectedCategory.name}</span>
                      </div>
                    ) : (
                      <span>Select category</span>
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {filteredCategories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      <div className="flex items-center gap-2">
                        <span className={cn("w-2 h-2 rounded-full", c.color)} />
                        <span>{ICON_MAP[c.icon || 'wallet']}</span>
                        <span className="truncate">{c.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          {selectedCategory && selectedCategory.description && (
            <p className="text-xs text-muted-foreground">{selectedCategory.description}</p>
          )}
        </div>
      </div>

      {/* Category Manager Dialog */}
      <Dialog open={showCategoryManager} onOpenChange={setShowCategoryManager}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Manage Categories</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="max-h-60 overflow-y-auto space-y-1">
              {loadingCategories ? (
                <div className="space-y-2">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : categories.length > 0 ? (
                categories.map((category) => (
                  <EditableCategoryItem
                    key={category.id}
                    category={category}
                    onUpdate={handleUpdateCategory}
                    onDelete={handleDeleteCategory}
                  />
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No categories yet. Create one below.
                </p>
              )}
            </div>
            
            <div className="pt-2 border-t">
              <p className="text-xs text-muted-foreground mb-2">
                Create a new category:
              </p>
              <div className="space-y-2">
                <Input
                  placeholder="Category name"
                  value={newCategoryData.name}
                  onChange={(e) => setNewCategoryData(prev => ({ ...prev, name: e.target.value }))}
                  className="h-8"
                  disabled={isCreatingCategory}
                />
                <div className="grid grid-cols-3 gap-2">
                  <Select 
                    value={newCategoryData.type} 
                    onValueChange={(value: any) => setNewCategoryData(prev => ({ ...prev, type: value }))}
                    disabled={isCreatingCategory}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TRANSACTION_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.icon} {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select 
                    value={newCategoryData.icon} 
                    onValueChange={(value) => setNewCategoryData(prev => ({ ...prev, icon: value }))}
                    disabled={isCreatingCategory}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {AVAILABLE_ICONS.slice(0, 20).map((icon) => (
                        <SelectItem key={icon} value={icon}>
                          {ICON_MAP[icon]} {icon}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select 
                    value={newCategoryData.color} 
                    onValueChange={(value) => setNewCategoryData(prev => ({ ...prev, color: value }))}
                    disabled={isCreatingCategory}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue />
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
                </div>
                <Button 
                  type="button" 
                  size="sm" 
                  className="w-full"
                  onClick={handleAddCategory}
                  disabled={isCreatingCategory || !newCategoryData.name.trim()}
                >
                  {isCreatingCategory ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4 mr-2" />
                  )}
                  Create Category
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Payment and Status */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Payment Method</Label>
          <Select
            value={formData.payment_method}
            onValueChange={(value) => setFormData({ ...formData, payment_method: value })}
            disabled={isLoading}
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
            disabled={isLoading}
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
          disabled={isLoading}
        />
      </div>

      {/* Checkboxes */}
      <div className="grid grid-cols-2 gap-4">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="is_taxable"
            checked={formData.is_taxable}
            onCheckedChange={(checked) => setFormData({ ...formData, is_taxable: checked as boolean })}
            disabled={isLoading}
          />
          <Label htmlFor="is_taxable" className="text-sm font-normal">Taxable</Label>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="is_reconciled"
            checked={formData.is_reconciled}
            onCheckedChange={(checked) => setFormData({ ...formData, is_reconciled: checked as boolean })}
            disabled={isLoading}
          />
          <Label htmlFor="is_reconciled" className="text-sm font-normal">Reconciled</Label>
        </div>
      </div>

      {/* Tax Amount */}
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
              disabled={isLoading}
            />
          </div>
        </div>
      )}

      {/* Notes */}
      <div className="space-y-2">
        <Label>Notes</Label>
        <Textarea
          placeholder="Additional notes..."
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          rows={2}
          disabled={isLoading}
        />
      </div>

      {/* File Attachments */}
      <FileAttachmentUpload
        attachments={attachments}
        onUpload={handleFileUpload}
        onDelete={handleFileDelete}
        onDownload={handleFileDownload}
        isUploading={isUploadingFiles}
      />

      {/* Selected Category Preview */}
      {selectedCategory && (
        <div className="flex items-center gap-2 p-2 bg-muted/20 rounded-md">
          <span className="text-sm text-muted-foreground">Selected:</span>
          <CategoryBadge category={selectedCategory} />
        </div>
      )}

      {/* Actions */}
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              {transaction ? 'Updating...' : 'Saving...'}
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

// Export the CategoryBadge for use elsewhere
export { CategoryBadge };