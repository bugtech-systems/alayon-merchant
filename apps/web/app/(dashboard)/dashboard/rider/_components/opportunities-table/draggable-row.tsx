// opportunities-table/draggable-row.tsx
"use client";

import * as React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVerticalIcon } from "lucide-react";
import { flexRender, type Row } from "@tanstack/react-table";
import { TableCell, TableRow } from "@/components/ui/table";
import type { WaterDeliveryOrder } from "./schema";

interface DraggableWaterDeliveryRowProps {
  row: Row<WaterDeliveryOrder>;
  onClick?: () => void;
}

export function DraggableWaterDeliveryRow({ row, onClick }: DraggableWaterDeliveryRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: row.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <TableRow
      ref={setNodeRef}
      style={style}
      data-state={row.getIsSelected() && "selected"}
      className="group cursor-pointer hover:bg-muted/50"
      onClick={onClick}
    >
      {/* Drag Handle Cell */}
      <TableCell className="w-[30px] p-0">
        <div
          {...attributes}
          {...listeners}
          className="flex items-center justify-center h-full w-full opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
        >
          <GripVerticalIcon className="size-4 text-muted-foreground" />
        </div>
      </TableCell>
      
      {/* Regular Cells */}
      {row.getVisibleCells().map((cell) => {
        // Skip the first cell if it's the drag handle column
        if (cell.column.id === "dragHandle") return null;
        return (
          <TableCell key={cell.id}>
            {flexRender(cell.column.columnDef.cell, cell.getContext())}
          </TableCell>
        );
      })}
    </TableRow>
  );
}