// app/(dashboard)/categories/page.tsx
"use client";

import React, { useState, useCallback, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  GripVertical,
  X,
  Save,
  ChevronRight,
  Pencil,
  Trash2,
} from "lucide-react";
import toast from "react-hot-toast";

// shadcn/ui components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

// DnD kit
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// ---------- Your data layer ----------
import { listCategories } from "@/lib/data/categories";
import {
  createCategory,
  updateCategory,
  deleteCategory,      // <-- make sure this is exported
} from "@/lib/actions/categories";

// ---------- Types ----------
interface Category {
  id: string;
  name: string;
  handle?: string;
  description?: string;
  parent_category_id?: string | null;
  is_active?: boolean;
  is_internal?: boolean;
  metadata?: Record<string, any> | null;
  rank?: number;
  category_children?: Category[];
}

interface FlattenedCategory extends Category {
  depth: number;
  index: number;
}

const LIMIT = 10;

// ---------- Helpers ----------
const getRank = (cat: any): number | undefined => {
  if (cat.metadata?.rank !== undefined) {
    const n = Number(cat.metadata.rank);
    return isNaN(n) ? undefined : n;
  }
  return cat.rank;
};

const compareByRank = (a: Category, b: Category) => {
  const rankA = a.rank ?? Infinity;
  const rankB = b.rank ?? Infinity;
  return rankA - rankB;
};

function flattenTree(cats: Category[], depth = 0): FlattenedCategory[] {
  const sorted = [...cats].sort(compareByRank);
  let flat: FlattenedCategory[] = [];
  sorted.forEach((cat, idx) => {
    flat.push({ ...cat, depth, index: flat.length });
    if (cat.category_children) {
      flat = flat.concat(
        flattenTree(cat.category_children, depth + 1).map((c) => ({
          ...c,
          index: flat.length + c.index,
        }))
      );
    }
  });
  return flat;
}

function buildTree(allCats: Category[]): Category[] {
  const map = new Map<string, Category & { children: Category[] }>();
  const roots: Category[] = [];

  allCats.forEach((cat) => {
    map.set(cat.id, { ...cat, children: [] });
  });
  allCats.forEach((cat) => {
    const node = map.get(cat.id)!;
    if (cat.parent_category_id && map.has(cat.parent_category_id)) {
      map.get(cat.parent_category_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  });
  return roots;
}

export default function CategoriesPage({ user }: any) {
  const queryClient = useQueryClient();

  // ----- State -----
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  const [rankingSheetOpen, setRankingSheetOpen] = useState(false);

  // Form state
  const [formName, setFormName] = useState("");
  const [formHandle, setFormHandle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formActive, setFormActive] = useState(true);
  const [formInternal, setFormInternal] = useState(false);

  // Ranking drawer state
  const [rankingCategories, setRankingCategories] = useState<FlattenedCategory[]>([]);
  const [activeDragItem, setActiveDragItem] = useState<FlattenedCategory | null>(null);

  // ----- Fetch categories (table, paginated) -----
  const { data, isLoading, isError } = useQuery({
    queryKey: ["categories", search, page],
    queryFn: async () => {
      const result = await listCategories({
        q: search || undefined,
        company_id: user?.companyId,
        limit: LIMIT,
        offset: (page - 1) * LIMIT,
      });
      const categoriesWithRank = result.categories.map((c: any) => ({
        ...c,
        rank: getRank(c),
      }));
      return { categories: categoriesWithRank as Category[], count: result.count };
    },
  });

  const categories = data?.categories ?? [];
  const totalCount = data?.count ?? 0;
  const totalPages = Math.ceil(totalCount / LIMIT);

  // ----- All categories for ranking drawer -----
  const { data: allCategories } = useQuery({
    queryKey: ["all-categories-for-ranking", user?.companyId],
    queryFn: () =>
      listCategories({
        company_id: user?.companyId,
        limit: 1000,
      }),
    enabled: rankingSheetOpen,
  });

  useEffect(() => {
    if (allCategories) {
      const tree = buildTree(allCategories.categories);
      const flat = flattenTree(tree);
      setRankingCategories(flat);
    }
  }, [allCategories, rankingSheetOpen]);

  // ----- Mutations -----
  const createMutation = useMutation({
    mutationFn: createCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      queryClient.invalidateQueries({ queryKey: ["all-categories-for-ranking"] });
      toast.success("Category created");
      resetForm();
      setDialogOpen(false);
    },
    onError: (err: any) => toast.error(err.message || "Failed to create"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...payload }: { id: string } & any) =>
      updateCategory(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      queryClient.invalidateQueries({ queryKey: ["all-categories-for-ranking"] });
      toast.success("Category updated");
      resetForm();
      setDialogOpen(false);
    },
    onError: (err: any) => toast.error(err.message || "Failed to update"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      queryClient.invalidateQueries({ queryKey: ["all-categories-for-ranking"] });
      toast.success("Category deleted");
    },
    onError: (err: any) => toast.error(err.message || "Failed to delete"),
  });

  const updateRankingsMutation = useMutation({
    mutationFn: async (
      updates: { id: string; parent_category_id: string | null; rank: number; metadata: any }[]
    ) => {
      const promises = updates.map((u) =>
        updateCategory(u.id, {
          parent_category_id: u.parent_category_id,
          metadata: u.metadata,   // includes rank and original metadata
        })
      );
      await Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      queryClient.invalidateQueries({ queryKey: ["all-categories-for-ranking"] });
      toast.success("Rankings saved");
    },
    onError: (err: any) => toast.error(err.message || "Failed to save rankings"),
  });

  // ----- Form helpers -----
  const resetForm = () => {
    setFormName("");
    setFormHandle("");
    setFormDescription("");
    setFormActive(true);
    setFormInternal(false);
    setEditingCategory(null);
  };

  const openCreate = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEdit = (cat: Category) => {
    setEditingCategory(cat);
    setFormName(cat.name);
    setFormHandle(cat.handle || "");
    setFormDescription(cat.description || "");
    setFormActive(cat.is_active ?? true);
    setFormInternal(cat.is_internal ?? false);
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!formName.trim()) {
      toast.error("Name is required");
      return;
    }

    const baseData = {
      name: formName.trim(),
      handle: formHandle.trim() || undefined,
      description: formDescription.trim() || undefined,
      is_active: formActive,
      is_internal: formInternal,
    };

    if (editingCategory) {
      // Merge metadata: keep existing (especially company_id) and only update what's needed
      const existingMeta = editingCategory.metadata || {};
      const updatedMeta = {
        ...existingMeta,
        // If you wanted to allow editing rank here, you could add it; for now we don't change rank via edit
      };
      updateMutation.mutate({
        id: editingCategory.id,
        ...baseData,
        metadata: updatedMeta,
      });
    } else {
      createMutation.mutate({
        ...baseData,
        metadata: { company_id: user?.companyId },
      });
    }
  };

  const handleDelete = (cat: Category) => {
    if (confirm(`Delete "${cat.name}"? This action cannot be undone.`)) {
      deleteMutation.mutate(cat.id);
    }
  };

  // ----- DnD Handlers (unchanged) -----
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleDragStart = (event: DragStartEvent) => {
    const draggedItem = rankingCategories.find((c) => c.id === event.active.id);
    setActiveDragItem(draggedItem || null);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeIndex = rankingCategories.findIndex((c) => c.id === active.id);
    const overIndex = rankingCategories.findIndex((c) => c.id === over.id);
    if (activeIndex === -1 || overIndex === -1) return;

    const overRect = event.over?.rect;
    const pointerX = event.activatorEvent instanceof MouseEvent ? event.activatorEvent.clientX : 0;
    const shouldNest = overRect && pointerX > overRect.left + overRect.width * 0.3;

    const newList = [...rankingCategories];
    const activeItem = newList[activeIndex];
    const overItem = newList[overIndex];

    if (shouldNest && activeItem.parent_category_id !== overItem.id) {
      activeItem.parent_category_id = overItem.id;
      const allCats = newList.map((c) => ({ ...c }));
      const tree = buildTree(allCats as Category[]);
      const flat = flattenTree(tree);
      setRankingCategories(flat);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragItem(null);
    if (!over || active.id === over.id) return;

    const oldIndex = rankingCategories.findIndex((c) => c.id === active.id);
    const newIndex = rankingCategories.findIndex((c) => c.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const newList = arrayMove(rankingCategories, oldIndex, newIndex);
    const updated = newList.map((cat, idx) => ({
      ...cat,
      rank: idx,
    }));
    setRankingCategories(updated);
  };

  const handleSaveRankings = () => {
    const payload = rankingCategories.map((cat) => ({
      id: cat.id,
      parent_category_id: cat.parent_category_id ?? null,
      rank: cat.rank ?? cat.index,
      metadata: {
        ...(cat.metadata || {}),
        rank: cat.rank ?? cat.index,
      },
    }));
    updateRankingsMutation.mutate(payload);
  };

  // ----- Sortable item -----
  const SortableCategoryItem = ({ cat }: { cat: FlattenedCategory }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
      useSortable({ id: cat.id });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      paddingLeft: `${cat.depth * 2}rem`,
      opacity: isDragging ? 0.5 : 1,
    };

    return (
      <div
        ref={setNodeRef}
        style={style}
        className="flex items-center gap-2 py-2 px-2 border-b border-border hover:bg-muted/50 rounded-sm"
      >
        <button
          className="cursor-grab active:cursor-grabbing p-1 text-muted-foreground hover:text-foreground"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <span className="font-medium">{cat.name}</span>
        <span className="text-xs text-muted-foreground ml-auto">
          {cat.handle || ""}
        </span>
      </div>
    );
  };

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Categories</h1>
        <div className="flex gap-2">
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" /> Create
          </Button>
          <Button variant="outline" onClick={() => setRankingSheetOpen(true)}>
            <GripVertical className="h-4 w-4 mr-2" /> Edit Ranking
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative w-full sm:w-64">
        <Input
          placeholder="Search categories..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
      </div>

      {/* Categories Table */}
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead className="hidden md:table-cell">Handle</TableHead>
              <TableHead className="hidden md:table-cell">Rank</TableHead>
              <TableHead className="hidden sm:table-cell">Status</TableHead>
              <TableHead className="hidden sm:table-cell">Visibility</TableHead>
              <TableHead className="hidden sm:table-cell">Parent</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center h-24">
                  Loading...
                </TableCell>
              </TableRow>
            ) : isError ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center h-24 text-red-500">
                  Failed to load categories.
                </TableCell>
              </TableRow>
            ) : categories.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center h-24">
                  No categories found.
                </TableCell>
              </TableRow>
            ) : (
              categories.map((cat) => (
                <TableRow key={cat.id}>
                  <TableCell className="font-medium">{cat.name}</TableCell>
                  <TableCell className="hidden md:table-cell">{cat.handle || "-"}</TableCell>
                  <TableCell className="hidden md:table-cell">{cat.rank ?? "-"}</TableCell>
                  <TableCell className="hidden sm:table-cell">
                    {cat.is_active ? "Active" : "Inactive"}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    {cat.is_internal ? "Internal" : "Public"}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    {cat.parent_category_id
                      ? allCategories?.categories?.find((p) => p.id === cat.parent_category_id)?.name || "-"
                      : "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => openEdit(cat)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleDelete(cat)}
                        className="text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className={page === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
              />
            </PaginationItem>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum: number;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (page <= 3) {
                pageNum = i + 1;
              } else if (page >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = page - 2 + i;
              }
              return (
                <PaginationItem key={pageNum}>
                  <PaginationLink
                    isActive={page === pageNum}
                    onClick={() => setPage(pageNum)}
                  >
                    {pageNum}
                  </PaginationLink>
                </PaginationItem>
              );
            })}
            <PaginationItem>
              <PaginationNext
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className={page === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? "Edit Category" : "Create Category"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Category name"
              />
            </div>
            <div>
              <Label htmlFor="handle">Handle</Label>
              <Input
                id="handle"
                value={formHandle}
                onChange={(e) => setFormHandle(e.target.value)}
                placeholder="URL handle (auto-generated if empty)"
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Short description"
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="status">Status (Active)</Label>
              <Switch
                id="status"
                checked={formActive}
                onCheckedChange={setFormActive}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="visibility">Visibility (Internal)</Label>
              <Switch
                id="visibility"
                checked={formInternal}
                onCheckedChange={setFormInternal}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {editingCategory ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Ranking Sheet (unchanged) */}
      <Sheet open={rankingSheetOpen} onOpenChange={setRankingSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-xl p-0">
          <SheetHeader className="p-6 border-b">
            <SheetTitle>Edit Category Rankings</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto p-6">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={rankingCategories.map((c) => c.id)}
                strategy={verticalListSortingStrategy}
              >
                {rankingCategories.map((cat) => (
                  <SortableCategoryItem key={cat.id} cat={cat} />
                ))}
              </SortableContext>
              <DragOverlay>
                {activeDragItem ? (
                  <div className="bg-background border rounded-md shadow-lg px-4 py-2 font-medium">
                    {activeDragItem.name}
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
          </div>
          <SheetFooter className="p-6 border-t">
            <Button variant="outline" onClick={() => setRankingSheetOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveRankings} disabled={updateRankingsMutation.isPending}>
              <Save className="h-4 w-4 mr-2" /> Save Rankings
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}