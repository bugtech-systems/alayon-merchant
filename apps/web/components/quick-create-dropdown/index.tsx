import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { CreateCustomerModal } from './modals/create-customer-modal';
import { CreateTeamMemberModal } from './modals/create-team-member-modal';
// import { CreateDraftOrderModal } from './modals/create-draft-order-modal';

type ModalType = 'customer' | 'team' | 'draft' | 'transaction' | null;

export const QuickCreateDropdown: React.FC = () => {
  const [activeModal, setActiveModal] = useState<ModalType>(null);

  const openModal = (modal: ModalType) => setActiveModal(modal);
  const closeModal = () => setActiveModal(null);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="default" className="bg-green-600 hover:bg-green-700 flex-1">
            <Plus className="mr-2 h-4 w-4" />
            Quick Create
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem onClick={() => openModal('customer')}>
            Create Customer
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => openModal('team')}>
            Create Team Member
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => openModal('draft')}>
            Create Draft Order
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => openModal('transaction')}>
            Create Transaction
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <CreateCustomerModal open={activeModal === 'customer'} onOpenChange={closeModal} />
      <CreateTeamMemberModal open={activeModal === 'team'} onOpenChange={closeModal} />
      {/* <CreateDraftOrderModal open={activeModal === 'draft'} onOpenChange={closeModal} /> */}
      {/* <CreateTransactionModal open={activeModal === 'transaction'} onOpenChange={closeModal} /> */}
    </>
  );
};