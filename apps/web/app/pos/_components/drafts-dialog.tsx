// app/(pos)/components/drafts-dialog.tsx
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Trash2,
  FolderOpen,
  Clock,
  User,
  MapPin,
  DollarSign,
  ShoppingBag,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface DraftOrder {
  id: string;
  cart_id: string;
  created_at: Date;
  updated_at: Date;
  items: any[];
  total: number;
  customer_id?: string;
  customer_name?: string;
  table_ids?: string[];
  notes?: string;
  metadata?: {
    draft_name?: string;
    is_draft?: boolean;
    saved_at?: string;
  };
}

interface DraftsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  drafts: DraftOrder[];
  onLoadDraft: (draft: DraftOrder) => Promise<void>;
  onDeleteDraft: (draftId: string) => void;
  region?: {
    currency_code: string;
  };
}

export function DraftsDialog({
  open,
  onOpenChange,
  drafts,
  onLoadDraft,
  onDeleteDraft,
  region,
}: DraftsDialogProps) {
  const [selectedDraft, setSelectedDraft] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [draftToDelete, setDraftToDelete] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<string | null>(null);

  const currencyCode = region?.currency_code?.toUpperCase() || "PHP";

  const handleLoadDraft = async (draft: DraftOrder) => {
    setIsLoading(draft.id);
    try {
      await onLoadDraft(draft);
    } finally {
      setIsLoading(null);
    }
  };

  const handleDeleteClick = (draftId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDraftToDelete(draftId);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = () => {
    if (draftToDelete) {
      onDeleteDraft(draftToDelete);
      setDeleteConfirmOpen(false);
      setDraftToDelete(null);
    }
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const draftDate = new Date(date);
    const diffHours = Math.floor((now.getTime() - draftDate.getTime()) / (1000 * 60 * 60));
    
    if (diffHours < 1) {
      return "Just now";
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    } else {
      return draftDate.toLocaleDateString() + " at " + draftDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
  };

  const getDraftSummary = (draft: DraftOrder) => {
    const itemCount = draft.items?.length || 0;
    const customerName = draft.customer_name || draft.metadata?.customer_name;
    const tableCount = draft.table_ids?.length || 0;
    const draftName = draft.metadata?.draft_name || `Draft ${new Date(draft.created_at).toLocaleDateString()}`;
    
    return { itemCount, customerName, tableCount, draftName };
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5" />
              Saved Drafts
            </DialogTitle>
            <DialogDescription>
              Load or delete saved draft orders. Drafts are automatically saved when you create them.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-hidden">
            {drafts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  <FolderOpen className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="font-medium text-lg mb-1">No saved drafts</h3>
                <p className="text-sm text-muted-foreground">
                  When you save a draft order, it will appear here.
                </p>
              </div>
            ) : (
              <ScrollArea className="h-[50vh] pr-4">
                <div className="space-y-3">
                  {drafts.map((draft) => {
                    const { itemCount, customerName, tableCount, draftName } = getDraftSummary(draft);
                    const isLoadingThis = isLoading === draft.id;
                    
                    return (
                      <div
                        key={draft.id}
                        className={cn(
                          "relative rounded-lg border transition-all",
                          selectedDraft === draft.id && "border-primary ring-2 ring-primary/20",
                          "hover:shadow-md"
                        )}
                      >
                        <div className="p-4">
                          {/* Header */}
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <h3 className="font-semibold text-base">{draftName}</h3>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="outline" className="text-[10px]">
                                  <Clock className="h-2 w-2 mr-1" />
                                  {formatDate(draft.updated_at)}
                                </Badge>
                                {draft.metadata?.is_draft && (
                                  <Badge variant="secondary" className="text-[10px] bg-yellow-100 text-yellow-700">
                                    Draft
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 px-3"
                                onClick={() => handleLoadDraft(draft)}
                                disabled={isLoadingThis}
                              >
                                {isLoadingThis ? (
                                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                                ) : (
                                  "Load"
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 px-3 text-destructive hover:text-destructive"
                                onClick={(e) => handleDeleteClick(draft.id, e)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>

                          {/* Details Grid */}
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <ShoppingBag className="h-3.5 w-3.5" />
                              <span>{itemCount} item{itemCount !== 1 ? 's' : ''}</span>
                            </div>
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <DollarSign className="h-3.5 w-3.5" />
                              <span className="font-semibold text-foreground">
                                {currencyCode} {draft.total?.toFixed(2) || "0.00"}
                              </span>
                            </div>
                            {customerName && (
                              <div className="flex items-center gap-2 text-muted-foreground col-span-2">
                                <User className="h-3.5 w-3.5" />
                                <span>Customer: {customerName}</span>
                              </div>
                            )}
                            {tableCount > 0 && (
                              <div className="flex items-center gap-2 text-muted-foreground col-span-2">
                                <MapPin className="h-3.5 w-3.5" />
                                <span>{tableCount} table{tableCount !== 1 ? 's' : ''} assigned</span>
                              </div>
                            )}
                          </div>

                          {/* Notes Preview */}
                          {draft.notes && (
                            <div className="mt-3 p-2 bg-muted/50 rounded text-xs text-muted-foreground">
                              <span className="font-medium">Notes:</span> {draft.notes}
                            </div>
                          )}

                          {/* Items Preview */}
                          {itemCount > 0 && (
                            <div className="mt-3">
                              <button
                                onClick={() => setSelectedDraft(selectedDraft === draft.id ? null : draft.id)}
                                className="text-xs text-primary hover:underline flex items-center gap-1"
                              >
                                {selectedDraft === draft.id ? "Hide items" : `Show ${itemCount} items`}
                              </button>
                              {selectedDraft === draft.id && (
                                <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
                                  {draft.items?.slice(0, 5).map((item: any, idx: number) => (
                                    <div key={idx} className="text-xs flex justify-between py-1 border-b last:border-0">
                                      <span className="truncate flex-1">
                                        {item.quantity}x {item.title}
                                      </span>
                                      <span className="font-medium ml-2">
                                        {currencyCode} {(item.unit_price * item.quantity).toFixed(2)}
                                      </span>
                                    </div>
                                  ))}
                                  {itemCount > 5 && (
                                    <div className="text-xs text-muted-foreground text-center pt-1">
                                      +{itemCount - 5} more items
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Delete Draft?
            </DialogTitle>
            <DialogDescription>
              This action cannot be undone. The draft order will be permanently deleted.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete}>
              Delete Draft
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}