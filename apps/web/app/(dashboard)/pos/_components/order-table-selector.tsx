// app/(pos)/components/order-table-selector.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { MapPin, Plus, X } from "lucide-react";
import SimpleTablesManager from "./simple-table-manager";
import type { SimpleTable } from "./simple-table-manager";

interface OrderTableSelectorProps {
  selectedTableIds: string[];
  onTablesChange: (tableIds: string[]) => void;
  tables?: SimpleTable[];
}

export function OrderTableSelector({ selectedTableIds, onTablesChange, tables = [] }: OrderTableSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  const getTableNames = () => {
    const selectedTables = tables.filter(t => selectedTableIds.includes(t.id));
    return selectedTables.map(t => t.name).join(", ");
  };

  const handleTableSelect = (table: SimpleTable, action: "add" | "remove") => {
    if (action === "add") {
      onTablesChange([...selectedTableIds, table.id]);
    } else {
      onTablesChange(selectedTableIds.filter(id => id !== table.id));
    }
  };

  const removeTable = (tableId: string) => {
    onTablesChange(selectedTableIds.filter(id => id !== tableId));
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">Assigned Tables</label>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Plus className="mr-1 h-3 w-3" />
              Add Table
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
            <DialogHeader>
              <DialogTitle>Select Tables</DialogTitle>
            </DialogHeader>
            <SimpleTablesManager
              onTableSelect={handleTableSelect}
              selectedTableIds={selectedTableIds}
              isSelectionMode={true}
            />
          </DialogContent>
        </Dialog>
      </div>

      {selectedTableIds.length === 0 ? (
        <div className="text-sm text-muted-foreground p-2 border rounded-md">
          No tables assigned
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {selectedTableIds.map(tableId => {
            const table = tables.find(t => t.id === tableId);
            if (!table) return null;
            return (
              <Badge key={tableId} variant="secondary" className="gap-1 py-1.5">
                <MapPin className="h-3 w-3" />
                {table.name}
                <button
                  onClick={() => removeTable(tableId)}
                  className="ml-1 hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            );
          })}
        </div>
      )}
    </div>
  );
}