// components/draggable-row.tsx

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { flexRender, Row } from '@tanstack/react-table';
import { GripVerticalIcon, PencilIcon, Trash2Icon } from 'lucide-react';
import { TableCell, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';

interface DraggableRowProps<TData extends { id: string | number }> {
  row: Row<TData>;
  onEdit: () => void;
  onDelete: () => void;
  isMutating?: boolean; // ✅ added
}

export function DraggableRow<TData extends { id: string | number }>({
  row,
  onEdit,
  onDelete,
  isMutating = false,
}: DraggableRowProps<TData>) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: row.original.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <TableRow ref={setNodeRef} style={style} className="group">
      {/* Drag handle */}
      <TableCell className="w-8 p-0">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab p-2 text-muted-foreground hover:text-foreground"
        >
          <GripVerticalIcon className="size-4" />
        </button>
      </TableCell>

      {/* Data cells with fallback renderer */}
      {row.getVisibleCells().map((cell) => (
        <TableCell key={cell.id}>
          {flexRender(
            cell.column.columnDef.cell ?? ((info) => info.getValue()?.toString() ?? ''),
            cell.getContext()
          )}
        </TableCell>
      ))}

      {/* Action buttons */}
      <TableCell className="w-20">
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="ghost" size="icon" onClick={onEdit} disabled={isMutating}>
            <PencilIcon className="size-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onDelete} disabled={isMutating}>
            <Trash2Icon className="size-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}