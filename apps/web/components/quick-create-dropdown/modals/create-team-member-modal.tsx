// modals/create-team-member-modal.tsx
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { teamMemberSchema, TeamMemberFormData } from '../schemas';
import { createTeamMember } from '@/lib/actions/users';

interface CreateTeamMemberModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export const CreateTeamMemberModal: React.FC<CreateTeamMemberModalProps> = ({
  open,
  onOpenChange,
  onSuccess,
}) => {
  const [isLoading, setIsLoading] = React.useState(false);
  
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<TeamMemberFormData>({
    resolver: zodResolver(teamMemberSchema),
    defaultValues: {
      email: '',
      first_name: '',
      last_name: '',
      role: 'member',
      password: '',
    },
  });

  const selectedRole = watch('role');

  const onSubmit = async (data: TeamMemberFormData) => {
    setIsLoading(true);
    try {
      const user = await createTeamMember({
        email: data.email,
        first_name: data.first_name,
        last_name: data.last_name,
        role: data.role,
        password: data.password,
      });
      
      if (user) {
        toast.success(`Team member ${user.email} created successfully`);
        reset();
        onSuccess?.();
        onOpenChange(false);
      } else {
        throw new Error('Failed to create team member');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to create team member');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="text-2xl font-semibold">Create Team Member</DialogTitle>
          <DialogDescription>
            Add a new team member to manage your store. They will receive an invitation email with login instructions.
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
                placeholder="team@example.com"
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
                  placeholder="Jane"
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
                  placeholder="Smith"
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
              <Label htmlFor="role" className="text-sm font-medium">
                Role <span className="text-red-500">*</span>
              </Label>
              <Select
                value={selectedRole}
                onValueChange={(value) => setValue('role', value as any)}
                disabled={isLoading}
              >
                <SelectTrigger className={errors.role ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">
                    <div className="flex flex-col">
                      <span>Member</span>
                      <span className="text-xs text-gray-500">Basic access to orders and customers</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="admin">
                    <div className="flex flex-col">
                      <span>Admin</span>
                      <span className="text-xs text-gray-500">Full access to all features</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="developer">
                    <div className="flex flex-col">
                      <span>Developer</span>
                      <span className="text-xs text-gray-500">API access and development settings</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              {errors.role && (
                <p className="text-sm text-red-500">{errors.role.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">
                Temporary Password <span className="text-red-500">*</span>
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="Set a temporary password (8+ characters)"
                {...register('password')}
                className={errors.password ? 'border-red-500' : ''}
                disabled={isLoading}
              />
              {errors.password && (
                <p className="text-sm text-red-500">{errors.password.message}</p>
              )}
              <p className="text-xs text-gray-500">
                The user will be prompted to change this password on first login
              </p>
            </div>

            {/* Permissions Preview */}
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <Label className="text-sm font-medium">Permissions Preview</Label>
              <div className="space-y-1 text-sm">
                {selectedRole === 'admin' && (
                  <>
                    <p className="text-green-600">✓ Full access to all modules</p>
                    <p className="text-green-600">✓ Can manage team members</p>
                    <p className="text-green-600">✓ Can modify store settings</p>
                  </>
                )}
                {selectedRole === 'member' && (
                  <>
                    <p className="text-green-600">✓ View and manage orders</p>
                    <p className="text-green-600">✓ View and manage customers</p>
                    <p className="text-green-600">✓ View products</p>
                    <p className="text-gray-400">✗ Cannot manage team members</p>
                    <p className="text-gray-400">✗ Cannot modify store settings</p>
                  </>
                )}
                {selectedRole === 'developer' && (
                  <>
                    <p className="text-green-600">✓ Full API access</p>
                    <p className="text-green-600">✓ View all data</p>
                    <p className="text-green-600">✓ Access developer tools</p>
                    <p className="text-gray-400">✗ Cannot modify team members</p>
                  </>
                )}
              </div>
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
              {isLoading ? 'Creating...' : 'Create Team Member'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};