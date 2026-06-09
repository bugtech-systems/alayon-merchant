// components/customers/customer-view.tsx
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

interface CustomerViewProps {
  customer: any;
}

export function CustomerView({ customer }: CustomerViewProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h3 className="font-semibold text-sm text-muted-foreground mb-1">
            Customer ID
          </h3>
          <p className="text-sm font-mono">{customer.id}</p>
        </div>
        <div>
          <h3 className="font-semibold text-sm text-muted-foreground mb-1">
            Account Status
          </h3>
          <Badge variant={customer.has_account ? 'default' : 'secondary'}>
            {customer.has_account ? 'Registered' : 'Guest'}
          </Badge>
        </div>
        <div>
          <h3 className="font-semibold text-sm text-muted-foreground mb-1">
            Email
          </h3>
          <p className="text-sm">{customer.email}</p>
        </div>
        <div>
          <h3 className="font-semibold text-sm text-muted-foreground mb-1">
            Phone
          </h3>
          <p className="text-sm">{customer.phone || '—'}</p>
        </div>
        <div>
          <h3 className="font-semibold text-sm text-muted-foreground mb-1">
            First Name
          </h3>
          <p className="text-sm">{customer.first_name || '—'}</p>
        </div>
        <div>
          <h3 className="font-semibold text-sm text-muted-foreground mb-1">
            Last Name
          </h3>
          <p className="text-sm">{customer.last_name || '—'}</p>
        </div>
        <div>
          <h3 className="font-semibold text-sm text-muted-foreground mb-1">
            Joined Date
          </h3>
          <p className="text-sm">
            {format(new Date(customer.created_at), 'PPP')}
          </p>
        </div>
        <div>
          <h3 className="font-semibold text-sm text-muted-foreground mb-1">
            Last Updated
          </h3>
          <p className="text-sm">
            {format(new Date(customer.updated_at), 'PPP')}
          </p>
        </div>
      </div>
      
      {customer.metadata && Object.keys(customer.metadata).length > 0 && (
        <div>
          <h3 className="font-semibold text-sm text-muted-foreground mb-2">
            Additional Information
          </h3>
          <pre className="bg-muted p-3 rounded-md text-sm overflow-auto">
            {JSON.stringify(customer.metadata, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}