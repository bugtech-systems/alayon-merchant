// hooks/use-pos-drafts.ts
import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { DraftOrder, MedusaCart, MedusaCartItem } from "../types";

export function usePosDrafts() {
  const { toast } = useToast();
  const [drafts, setDrafts] = useState<DraftOrder[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem("pos-drafts");
    if (stored) {
      setDrafts(JSON.parse(stored));
    }
  }, []);

  const saveDrafts = useCallback((newDrafts: DraftOrder[]) => {
    setDrafts(newDrafts);
    localStorage.setItem("pos-drafts", JSON.stringify(newDrafts));
  }, []);

  const saveAsDraft = useCallback(async (
    cartId: string,
    cartItems: MedusaCartItem[],
    cartTotal: number,
    selectedCustomer: any,
    selectedTableIds: string[],
    orderNotes: string,
    cartMetadata?: any
  ) => {
    if (cartItems.length === 0 && selectedTableIds.length === 0 && !selectedCustomer) {
      toast({ title: "Cannot save", description: "Add items or assign table/customer first", variant: "destructive" });
      return false;
    }
    
    const draftData: DraftOrder = {
      id: cartId,
      cart_id: cartId,
      created_at: new Date(),
      updated_at: new Date(),
      items: [...cartItems],
      total: cartTotal,
      customer_id: selectedCustomer?.id,
      customer_name: selectedCustomer?.first_name,
      table_ids: selectedTableIds,
      notes: orderNotes,
    };
    
    const updatedDrafts = [draftData, ...drafts.filter(d => d.id !== cartId)];
    saveDrafts(updatedDrafts);
    
    toast({ title: "Draft saved", description: "Order saved as draft" });
    return true;
  }, [drafts, saveDrafts, toast]);

  const deleteDraft = useCallback((draftId: string) => {
    const updatedDrafts = drafts.filter(d => d.id !== draftId);
    saveDrafts(updatedDrafts);
    toast({ title: "Draft deleted", description: "Draft order removed" });
  }, [drafts, saveDrafts, toast]);

  const loadDraft = useCallback((draftId: string): DraftOrder | undefined => {
    return drafts.find(d => d.id === draftId);
  }, [drafts]);

  return {
    drafts,
    saveAsDraft,
    deleteDraft,
    loadDraft
  };
}