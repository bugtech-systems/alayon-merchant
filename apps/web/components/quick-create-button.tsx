// components/quick-create-button.tsx
"use client";

import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { PlusCircleIcon, UserPlus, Users, FileText, ShoppingCart, Package, Tag, Building2, Mail, Phone } from "lucide-react";
import { DynamicFormModal, FormConfig } from "./dynamic-form-modal";

// Types for quick create actions
export interface QuickCreateAction {
  id: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  description?: string;
  formConfig: FormConfig;
  onSuccess?: (data: any) => void;
  onError?: (error: Error) => void;
}

interface QuickCreateButtonProps {
  actions: QuickCreateAction[];
  buttonText?: string;
  buttonClassName?: string;
  align?: "start" | "center" | "end";
  side?: "top" | "right" | "bottom" | "left";
}

export function QuickCreateButton({ 
  actions, 
  buttonText = "Quick Create",
  buttonClassName = "",
  align = "end",
  side = "bottom"
}: QuickCreateButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAction, setSelectedAction] = useState<QuickCreateAction | null>(null);

  const handleActionClick = (action: QuickCreateAction) => {
    setSelectedAction(action);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedAction(null);
  };

  const handleSuccess = (data: any) => {
    if (selectedAction?.onSuccess) {
      selectedAction.onSuccess(data);
    }
    handleModalClose();
  };

  const handleError = (error: Error) => {
    if (selectedAction?.onError) {
      selectedAction.onError(error);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            className={`flex-1 min-w-8 bg-primary text-primary-foreground duration-200 ease-linear hover:bg-primary/90 hover:text-primary-foreground active:bg-primary/90 active:text-primary-foreground ${buttonClassName}`}
          >
            <PlusCircleIcon className="h-4 w-4" />
            <span>{buttonText}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align={align} side={side} className="w-64">
          <DropdownMenuLabel>Quick Create</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {actions.map((action) => (
            <DropdownMenuItem
              key={action.id}
              onClick={() => handleActionClick(action)}
              className="cursor-pointer"
            >
              <div className="flex items-center gap-2">
                {action.icon && <action.icon className="h-4 w-4" />}
                <div>
                  <div className="font-medium">{action.label}</div>
                  {action.description && (
                    <div className="text-xs text-muted-foreground">{action.description}</div>
                  )}
                </div>
              </div>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Dynamic Modal for Selected Action */}
      {selectedAction && (
        <DynamicFormModal
          isOpen={isModalOpen}
          onClose={handleModalClose}
          config={selectedAction.formConfig}
          mode="create"
          onSuccess={handleSuccess}
          onError={handleError}
        />
      )}
    </>
  );
}