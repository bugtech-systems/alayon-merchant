// components/cart/drafts-manager.tsx

"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Save,
  Trash2,
  Loader2,
  Clock,
  Calendar,
  Users,
  MapPin,
  DollarSign,
  FileText,
  Search,
  X,
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import type { DraftOrder, MedusaCart } from "./types";

interface DraftsManagerProps {
  drafts: DraftOrder[];
  onLoadDraft: (draftId: string) => Promise<void>;
  onDeleteDraft: (draftId: string) => Promise<void>;
  onSaveCurrentCart: (name: string) => Promise<void>;
  onClearDrafts?: () => void;
  isLoading?: boolean;
}

export function DraftsManager({
  drafts,
  onLoadDraft,
  onDeleteDraft,
  onSaveCurrentCart,
  onClearDrafts,
  isLoading = false,
}: DraftsManagerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'amount'>('newest');

  const filteredDrafts = drafts
    .filter(draft => 
      draft.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      draft.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      draft.table_ids?.some(id => id.toLowerCase().includes(searchQuery.toLowerCase()))
    )
    .sort((a, b) => {
      if (sortBy === 'newest') {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      } else if (sortBy === 'oldest') {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      } else {
        return b.total_amount - a.total_amount;
      }
    });

  const handleSaveDraft = async () => {
    if (!draftName.trim()) return;
    await onSaveCurrentCart(draftName);
    setDraftName("");
    setShowSaveDialog(false);
    setIsOpen(true);
  };

  const handleLoadDraft = async (draftId: string) => {
    await onLoadDraft(draftId);
    setIsOpen(false);
  };

  const handleDeleteDraft = async () => {
    if (!deleteTarget) return;
    await onDeleteDraft(deleteTarget);
    setDeleteTarget(null);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="h-7 md:h-8 gap-1"
        onClick={() => setIsOpen(true)}
      >
        <Clock className="h-3 w-3 md:h-4 md:w-4" />
        <span className="hidden sm:inline">Drafts</span>
        {drafts.length > 0 && (
          <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">
            {drafts.length}
          </Badge>
        )}
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Saved Drafts</span>
              <Button
                variant="outline"
                size="sm"
                className="gap-1"
                onClick={() => setShowSaveDialog(true)}
              >
                <Save className="h-3 w-3" />
                Save Current
              </Button>
            </DialogTitle>
            <DialogDescription>
              Load previously saved orders to continue where you left off
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center gap-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
              <Input
                placeholder="Search drafts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-8"
              />
            </div>
            <select
              className="h-8 px-2 text-sm border rounded-md bg-background"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
            >
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="amount">Amount</option>
            </select>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : filteredDrafts.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No drafts found</p>
              <p className="text-xs text-muted-foreground mt-1">
                {drafts.length === 0 ? 'Save your first draft to get started' : 'Try adjusting your search'}
              </p>
            </div>
          ) : (
            <ScrollArea className="flex-1 pr-4" style={{ maxHeight: 'calc(60vh - 200px)' }}>
              <div className="space-y-3">
                {filteredDrafts.map((draft) => (
                  <div
                    key={draft.id}
                    className="p-4 rounded-lg border hover:border-primary/50 transition-colors"
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-sm truncate">{draft.name}</h4>
                          <Badge variant="secondary" className="text-[10px] whitespace-nowrap">
                            {draft.item_count} items
                          </Badge>
                        </div>
                        
                        <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
                          {draft.customer_name && (
                            <div className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {draft.customer_name}
                            </div>
                          )}
                          {draft.table_ids && draft.table_ids.length > 0 && (
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {draft.table_ids.length} table{draft.table_ids.length > 1 ? 's' : ''}
                            </div>
                          )}
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(draft.created_at)}
                          </div>
                          <div className="flex items-center gap-1 font-medium text-primary">
                            <DollarSign className="h-3 w-3" />
                            {draft.total_amount.toFixed(2)}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex gap-1 flex-shrink-0">
                        <Button
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => handleLoadDraft(draft.id)}
                        >
                          <Save className="h-3 w-3 mr-1" />
                          Load
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => setDeleteTarget(draft.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}

          <DialogFooter>
            {onClearDrafts && drafts.length > 0 && (
              <Button variant="ghost" size="sm" onClick={onClearDrafts}>
                Clear All
              </Button>
            )}
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Save Draft Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Draft Order</DialogTitle>
            <DialogDescription>
              Give this order a name to easily find it later
            </DialogDescription>
          </DialogHeader>
          <Input
            placeholder="e.g., Walk-in - Table 5 - John Doe"
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSaveDraft()}
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveDraft} disabled={!draftName.trim()}>
              <Save className="h-4 w-4 mr-2" />
              Save Draft
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Draft</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. Are you sure you want to delete this draft?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteDraft} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}