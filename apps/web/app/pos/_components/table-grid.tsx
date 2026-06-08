"use client";

import { Badge } from "@/components/ui/badge";
import { Table } from "lucide-react";
import { cn } from "@/lib/utils";

interface Table {
  id: string;
  number: string;
  section_id: string;
  capacity: number;
  status: "available" | "occupied" | "reserved" | "cleaning";
}

interface Section {
  id: string;
  name: string;
  type: string;
  color: string;
  icon: string;
  tables?: Table[];
}

interface TableGridProps {
  sections: Section[];
  onSelectTable: (table: Table, section: Section) => void;
  selectedTableId?: string;
}

export function TableGrid({ sections, onSelectTable, selectedTableId }: TableGridProps) {
  const getStatusColor = (status: Table["status"]) => {
    switch (status) {
      case "available": return "bg-green-500 hover:bg-green-600";
      case "occupied": return "bg-red-500";
      case "reserved": return "bg-yellow-500";
      case "cleaning": return "bg-blue-400";
      default: return "bg-gray-400";
    }
  };

  const getStatusText = (status: Table["status"]) => {
    switch (status) {
      case "available": return "Available";
      case "occupied": return "Occupied";
      case "reserved": return "Reserved";
      case "cleaning": return "Cleaning";
      default: return "Unavailable";
    }
  };

  return (
    <div className="space-y-6 max-h-[60vh] overflow-y-auto p-2">
      {sections.map((section) => (
        <div key={section.id} className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">{section.icon}</span>
            <h3 className="font-semibold">{section.name}</h3>
            <Badge variant="outline" className="text-xs">
              {section.tables?.filter(t => t.status === "occupied").length || 0}/{section.tables?.length || 0} occupied
            </Badge>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {section.tables?.map((table) => (
              <button
                key={table.id}
                onClick={() => onSelectTable(table, section)}
                className={cn(
                  "flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all",
                  getStatusColor(table.status),
                  selectedTableId === table.id ? "ring-2 ring-primary ring-offset-2" : "",
                  table.status === "available" ? "cursor-pointer hover:scale-105" : "cursor-not-allowed opacity-60"
                )}
                disabled={table.status !== "available"}
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20">
                  <Table className="h-6 w-6 text-white" />
                </div>
                <span className="text-sm font-bold text-white">Table {table.number}</span>
                <span className="text-xs text-white/80">{getStatusText(table.status)}</span>
                <span className="text-xs text-white/60">Capacity: {table.capacity}</span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}