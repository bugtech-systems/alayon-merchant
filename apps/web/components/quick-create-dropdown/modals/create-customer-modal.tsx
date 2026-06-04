// modals/create-customer-modal.tsx (Updated with SDK action)
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
import { Label } from '@/components/ui/label';
import { customerSchema, CustomerFormData } from '../schemas';
import { createQuickCustomer } from '@/lib/actions/customer';

interface CreateCustomerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export const CreateCustomerModal: React.FC<CreateCustomerModalProps> = ({
  open,
  onOpenChange,
  onSuccess,
}) => {
  const [isLoading, setIsLoading] = React.useState(false);
  
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      email: '',
      first_name: '',
      last_name: '',
      phone: '',
      password: '',
    },
  });

  const onSubmit = async (data: CustomerFormData) => {
    setIsLoading(true);
    try {
      // The createQuickCustomer now handles both registration and profile creation
      const customer = await createQuickCustomer({
        email: data.email,
        first_name: data.first_name,
        last_name: data.last_name,
        phone: data.phone,
        password: data.password,
      });
      
      if (customer) {
        toast.success(`Customer ${customer.email} created successfully`);
        reset();
        onSuccess?.();
        onOpenChange(false);
      } else {
        throw new Error('Failed to create customer');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to create customer');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="text-2xl font-semibold">Create Customer</DialogTitle>
          <DialogDescription>
            Add a new customer to your store. They will receive a welcome email with their account details.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto">
          <div className="space-y-6 p-6">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">
                Email Address <span className="text-red-500">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="customer@example.com"
                {...register('email')}
                className={errors.email ? 'border-red-500' : ''}
                disabled={isLoading}
              />
              {errors.email && (
                <p className="text-sm text-red-500">{errors.email.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_name" className="text-sm font-medium">
                  First Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="first_name"
                  placeholder="John"
                  {...register('first_name')}
                  className={errors.first_name ? 'border-red-500' : ''}
                  disabled={isLoading}
                />
                {errors.first_name && (
                  <p className="text-sm text-red-500">{errors.first_name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="last_name" className="text-sm font-medium">
                  Last Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="last_name"
                  placeholder="Doe"
                  {...register('last_name')}
                  className={errors.last_name ? 'border-red-500' : ''}
                  disabled={isLoading}
                />
                {errors.last_name && (
                  <p className="text-sm text-red-500">{errors.last_name.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="text-sm font-medium">
                Phone Number
              </Label>
              <Input
                id="phone"
                placeholder="+1 234 567 8900"
                {...register('phone')}
                className={errors.phone ? 'border-red-500' : ''}
                disabled={isLoading}
              />
              {errors.phone && (
                <p className="text-sm text-red-500">{errors.phone.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">
                Password <span className="text-red-500">*</span>
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="Create a secure password"
                {...register('password')}
                className={errors.password ? 'border-red-500' : ''}
                disabled={isLoading}
              />
              {errors.password && (
                <p className="text-sm text-red-500">{errors.password.message}</p>
              )}
            </div>
          </div>

          <div className="border-t px-6 py-4 flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Creating...' : 'Create Customer'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};