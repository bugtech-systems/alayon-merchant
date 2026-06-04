import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { transactionSchema, TransactionFormData } from '../schemas';

interface CreateTransactionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CreateTransactionModal: React.FC<CreateTransactionModalProps> = ({
  open,
  onOpenChange,
}) => {
  const [isLoading, setIsLoading] = React.useState(false);
  
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<TransactionFormData>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      amount: 0,
      currency_code: 'USD',
      customer_id: '',
      reference: '',
      description: '',
    },
  });

  const onSubmit = async (data: TransactionFormData) => {
    setIsLoading(true);
    try {
      // Note: Implement your custom transaction endpoint
      const response = await fetch('/api/admin/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create transaction');
      }

      toast.success('Transaction created successfully');
      reset();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to create transaction');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="text-2xl font-semibold">Create Transaction</DialogTitle>
          <DialogDescription>
            Record a manual transaction for a customer.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto">
          <div className="space-y-6 p-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="amount" className="text-sm font-medium">
                  Amount <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  {...register('amount', { valueAsNumber: true })}
                  className={errors.amount ? 'border-red-500' : ''}
                />
                {errors.amount && (
                  <p className="text-sm text-red-500">{errors.amount.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="currency_code" className="text-sm font-medium">
                  Currency <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="currency_code"
                  placeholder="USD"
                  maxLength={3}
                  className={`uppercase ${errors.currency_code ? 'border-red-500' : ''}`}
                  {...register('currency_code')}
                />
                {errors.currency_code && (
                  <p className="text-sm text-red-500">{errors.currency_code.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="customer_id" className="text-sm font-medium">
                Customer ID <span className="text-red-500">*</span>
              </Label>
              <Input
                id="customer_id"
                placeholder="cus_..."
                {...register('customer_id')}
                className={errors.customer_id ? 'border-red-500' : ''}
              />
              {errors.customer_id && (
                <p className="text-sm text-red-500">{errors.customer_id.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="reference" className="text-sm font-medium">
                Reference Number
              </Label>
              <Input
                id="reference"
                placeholder="INV-001, TX-123, etc."
                {...register('reference')}
                className={errors.reference ? 'border-red-500' : ''}
              />
              {errors.reference && (
                <p className="text-sm text-red-500">{errors.reference.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-sm font-medium">
                Description
              </Label>
              <Textarea
                id="description"
                placeholder="Additional details about this transaction"
                className="resize-none"
                rows={3}
                {...register('description')}
              />
              {errors.description && (
                <p className="text-sm text-red-500">{errors.description.message}</p>
              )}
            </div>
          </div>

          <div className="border-t px-6 py-4 flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Creating...' : 'Create Transaction'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};