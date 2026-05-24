"use client";

import { useState } from "react";
import {
  PlusIcon,
  CheckIcon,
  DollarSignIcon,
  TagIcon,
  FileTextIcon,
  LayersIcon,
} from "lucide-react";

import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@workspace/ui/components/dialog";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import {
  RadioGroup,
  RadioGroupItem,
} from "@workspace/ui/components/radio-group";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@workspace/ui/components/command";
import { cn } from "@workspace/ui/lib/utils";

interface TransactionFormData {
  input_type: "expenses" | "advances" | "collection";
  description: string;
  item: string;
  amount: number;
}

interface CreateTransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateTransactionDialog({
  open,
  onOpenChange,
}: CreateTransactionDialogProps) {
  const [formData, setFormData] = useState<TransactionFormData>({
    input_type: "expenses",
    description: "",
    item: "",
    amount: 0,
  });
  const [itemOptions, setItemOptions] = useState<string[]>([
    "Office supplies",
    "Client dinner",
    "Travel",
    "Software subscription",
    "Equipment",
  ]);
  const [itemPopoverOpen, setItemPopoverOpen] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Transaction data:", formData);
    // TODO: send to API
    onOpenChange(false);
    setFormData({
      input_type: "expenses",
      description: "",
      item: "",
      amount: 0,
    });
  };

  const addNewItem = (newItem: string) => {
    if (newItem.trim() && !itemOptions.includes(newItem.trim())) {
      setItemOptions((prev) => [...prev, newItem.trim()]);
      setFormData((prev) => ({ ...prev, item: newItem.trim() }));
    }
    setItemPopoverOpen(false);
  };

  const getTypeIcon = () => {
    switch (formData.input_type) {
      case "expenses":
        return <DollarSignIcon className="h-4 w-4 text-red-500" />;
      case "advances":
        return <TagIcon className="h-4 w-4 text-yellow-500" />;
      case "collection":
        return <LayersIcon className="h-4 w-4 text-green-500" />;
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getTypeIcon()}
            Create Transaction
          </DialogTitle>
          <DialogDescription>
            Add a new financial transaction to the system. Fill in all the required fields below.
          </DialogDescription>
        </DialogHeader>

        <form id="transaction-form" onSubmit={handleSubmit} className="space-y-6 py-4">
          {/* Transaction Type */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Transaction Type</Label>
            <RadioGroup
              value={formData.input_type}
              onValueChange={(val) =>
                setFormData((prev) => ({
                  ...prev,
                  input_type: val as TransactionFormData["input_type"],
                }))
              }
              className="flex flex-col space-y-3"
            >
              <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50 transition-colors cursor-pointer">
                <div className="flex items-center space-x-3">
                  <RadioGroupItem value="expenses" id="expenses" />
                  <Label htmlFor="expenses" className="font-normal cursor-pointer">
                    <span className="font-medium">Expenses</span>
                    <p className="text-xs text-muted-foreground">
                      Money spent on business operations
                    </p>
                  </Label>
                </div>
                <DollarSignIcon className="h-4 w-4 text-red-500" />
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50 transition-colors cursor-pointer">
                <div className="flex items-center space-x-3">
                  <RadioGroupItem value="advances" id="advances" />
                  <Label htmlFor="advances" className="font-normal cursor-pointer">
                    <span className="font-medium">Advances</span>
                    <p className="text-xs text-muted-foreground">
                      Pre-payments or loans to employees
                    </p>
                  </Label>
                </div>
                <TagIcon className="h-4 w-4 text-yellow-500" />
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50 transition-colors cursor-pointer">
                <div className="flex items-center space-x-3">
                  <RadioGroupItem value="collection" id="collection" />
                  <Label htmlFor="collection" className="font-normal cursor-pointer">
                    <span className="font-medium">Collection</span>
                    <p className="text-xs text-muted-foreground">
                      Incoming payments from clients
                    </p>
                  </Label>
                </div>
                <LayersIcon className="h-4 w-4 text-green-500" />
              </div>
            </RadioGroup>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-semibold">
              Description
            </Label>
            <div className="relative">
              <FileTextIcon className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, description: e.target.value }))
                }
                placeholder="Enter transaction description..."
                className="pl-9"
                required
              />
            </div>
          </div>

          {/* Item Selection */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Item / Category</Label>
            <Popover open={itemPopoverOpen} onOpenChange={setItemPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={itemPopoverOpen}
                  className="w-full justify-between h-auto py-2"
                >
                  <span className="truncate">
                    {formData.item || "Select or create an item..."}
                  </span>
                  <PlusIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                <Command>
                  <CommandInput placeholder="Search or create item..." />
                  <CommandList>
                    <CommandEmpty>
                      <button
                        type="button"
                        className="w-full p-2 text-sm text-left hover:bg-accent"
                        onClick={() => {
                          const input = document.querySelector(
                            "[cmdk-input]"
                          ) as HTMLInputElement;
                          if (input?.value) addNewItem(input.value);
                        }}
                      >
                        + Create 
                      </button>
                    </CommandEmpty>
                    <CommandGroup>
                      {itemOptions.map((opt) => (
                        <CommandItem
                          key={opt}
                          value={opt}
                          onSelect={() => {
                            setFormData((prev) => ({ ...prev, item: opt }));
                            setItemPopoverOpen(false);
                          }}
                        >
                          <CheckIcon
                            className={cn(
                              "mr-2 h-4 w-4",
                              formData.item === opt ? "opacity-100" : "opacity-0"
                            )}
                          />
                          {opt}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            <p className="text-xs text-muted-foreground">
              Choose from existing items or type a new one and click "Create"
            </p>
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <Label htmlFor="amount" className="text-sm font-semibold">
              Amount
            </Label>
            <div className="relative">
              <DollarSignIcon className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    amount: parseFloat(e.target.value) || 0,
                  }))
                }
                placeholder="0.00"
                className="pl-9"
                required
              />
            </div>
          </div>
        </form>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button type="submit" form="transaction-form">
            Save Transaction
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}