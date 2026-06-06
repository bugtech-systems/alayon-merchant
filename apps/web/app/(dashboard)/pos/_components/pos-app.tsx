"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useInfiniteQuery, useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Plus,
  Trash2,
  CreditCard,
  QrCode,
  ShoppingCart,
  Minus,
  DollarSign,
  Package,
  AlertCircle,
  RefreshCw,
  X,
  Loader2,
  MapPin,
  UserPlus,
  User,
  Printer,
  Save,
  History,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { listCategories, listProducts, type MedusaProduct, type MedusaProductVariant, type MedusaProductCategory, type MedusaCustomer } from "@/lib/actions/pos";

// Import local components
import { ProductCard } from "./product-card";
import { CartItemComponent } from "./cart-item";
import { CategoryCard } from "./category-card";
import { TableGrid } from "./table-grid";
import { CustomerSearch } from "./customer-search";
import { PrintDialog } from "./print-dialog";
import { type PrintOrderData } from "@/lib/print-utils";

// Types
interface CartItem {
  id: string;
  product_id: string;
  variant_id: string;
  title: string;
  thumbnail: string | null;
  quantity: number;
  unit_price: number;
  variant_title?: string;
  subtotal: number;
  total: number;
  notes?: string;
}

interface DraftOrder {
  id: string;
  draft_number: number;
  items: CartItem[];
  created_at: Date;
  updated_at: Date;
  status: "draft" | "active" | "completed" | "cancelled";
  customer_id?: string;
  customer?: MedusaCustomer;
  placement?: Placement;
  notes?: string;
}

interface Placement {
  id: string;
  type: "table" | "section";
  reference_id: string;
  name: string;
  status: "active" | "completed";
}

interface Region {
  id: string;
  name: string;
  currency_code: string;
  tax_rate: number;
}

// Mock sections data
const mockSections = [
  {
    id: "sec_1",
    name: "Main Dining",
    type: "dining" as const,
    color: "bg-blue-500",
    icon: "🍽️",
    tables: [
      { id: "tbl_1", number: "1", section_id: "sec_1", capacity: 4, status: "available" as const },
      { id: "tbl_2", number: "2", section_id: "sec_1", capacity: 2, status: "occupied" as const },
      { id: "tbl_3", number: "3", section_id: "sec_1", capacity: 6, status: "reserved" as const },
      { id: "tbl_4", number: "4", section_id: "sec_1", capacity: 4, status: "available" as const },
    ],
  },
  {
    id: "sec_2",
    name: "Bar Area",
    type: "bar" as const,
    color: "bg-amber-500",
    icon: "🍺",
    tables: [
      { id: "tbl_5", number: "5", section_id: "sec_2", capacity: 2, status: "available" as const },
      { id: "tbl_6", number: "6", section_id: "sec_2", capacity: 2, status: "occupied" as const },
    ],
  },
];

// Custom hook for localStorage
const useLocalStorage = <T,>(key: string, initialValue: T): [T, (value: T | ((val: T) => T)) => void] => {
  const [storedValue, setStoredValue] = useState<T>(initialValue);

  useEffect(() => {
    try {
      const item = window.localStorage.getItem(key);
      if (item) {
        setStoredValue(JSON.parse(item));
      }
    } catch (error) {
      console.error("Error reading from localStorage:", error);
    }
  }, [key]);

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error("Error writing to localStorage:", error);
    }
  };

  return [storedValue, setValue];
};

// Mobile Draft Card Component
const MobileDraftCard = ({ draft, onLoad, onDelete, currencyCode }: any) => (
  <div className="flex items-center justify-between p-3 rounded-lg border bg-card mb-2">
    <div className="flex-1">
      <div className="flex items-center gap-2 mb-1">
        <Badge variant="outline" className="text-xs">
          Draft #{draft.draft_number}
        </Badge>
        {draft.placement && (
          <Badge variant="secondary" className="text-xs gap-1">
            <MapPin className="h-3 w-3" />
            {draft.placement.name}
          </Badge>
        )}
      </div>
      {draft.customer && (
        <p className="text-xs text-muted-foreground">
          {draft.customer.first_name} {draft.customer.last_name}
        </p>
      )}
      <div className="flex items-center justify-between mt-2">
        <p className="text-xs text-muted-foreground">
          {draft.items.length} items
        </p>
        <p className="text-sm font-semibold">
          {currencyCode} {draft.total.toFixed(2)}
        </p>
      </div>
    </div>
    <div className="flex gap-1 ml-2">
      <Button size="sm" variant="ghost" onClick={onLoad}>
        <ShoppingCart className="h-4 w-4" />
      </Button>
      <Button size="sm" variant="ghost" onClick={onDelete} className="text-destructive">
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  </div>
);

// Mobile Drafts Sheet Component
const MobileDraftsSheet = ({ open, onOpenChange, drafts, onLoadDraft, onDeleteDraft, currencyCode }: any) => (
  <Sheet open={open} onOpenChange={onOpenChange}>
    <SheetContent side="bottom" className="h-[70vh] rounded-t-xl">
      <SheetHeader>
        <SheetTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          Saved Drafts
        </SheetTitle>
      </SheetHeader>
      <ScrollArea className="h-[calc(70vh-80px)] mt-4">
        <div className="space-y-3">
          {drafts.length === 0 ? (
            <div className="text-center py-8">
              <History className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No saved drafts</p>
              <p className="text-xs text-muted-foreground">Save your cart to continue later</p>
            </div>
          ) : (
            drafts.map((draft: DraftOrder) => (
              <MobileDraftCard
                key={draft.id}
                draft={draft}
                onLoad={() => {
                  onLoadDraft(draft);
                  onOpenChange(false);
                }}
                onDelete={() => onDeleteDraft(draft.id)}
                currencyCode={currencyCode}
              />
            ))
          )}
        </div>
      </ScrollArea>
    </SheetContent>
  </Sheet>
);

// Mobile Cart Sheet Component
const MobileCartSheet = ({ 
  open, 
  onOpenChange, 
  cartItems, 
  updateQuantity, 
  removeFromCart,
  subtotal,
  tax,
  total,
  region,
  clearCart,
  saveDraft,
  onCheckout,
  onPrint,
  onAssignTable,
  onAssignCustomer,
  currentPlacement,
  selectedCustomer,
  orderNotes,
  setOrderNotes,
  releaseTable,
  clearCustomer,
  activeDraft,
  taxRate,
  addItemNote,
}: any) => (
  <Sheet open={open} onOpenChange={onOpenChange}>
    <SheetContent side="bottom" className="h-[85vh] rounded-t-xl p-0">
      <SheetHeader className="border-b p-4">
        <SheetTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            <span>Your Order</span>
            {activeDraft && <Badge variant="outline">Draft #{activeDraft.draft_number}</Badge>}
          </div>
          <Button variant="ghost" size="sm" onClick={clearCart} className="text-destructive">
            <Trash2 className="h-4 w-4" />
          </Button>
        </SheetTitle>
      </SheetHeader>
      
      <div className="flex flex-col h-[calc(95vh-60px)]">
        <div className="flex-1  p-2">
          <div className="flex gap-2 mb-3">
            {!currentPlacement ? (
              <Button variant="outline" size="sm" className="flex-1" onClick={onAssignTable}>
                <MapPin className="mr-1 h-3 w-3" />
                Assign Table
              </Button>
            ) : (
              <Badge variant="secondary" className="flex-1 gap-1 py-2 justify-center">
                <MapPin className="h-3 w-3" />
                {currentPlacement.name}
                <button onClick={releaseTable} className="ml-1 hover:text-destructive">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            
            {!selectedCustomer ? (
              <Button variant="outline" size="sm" className="flex-1" onClick={onAssignCustomer}>
                <UserPlus className="mr-1 h-3 w-3" />
                Add Customer
              </Button>
            ) : (
              <Badge variant="secondary" className="flex-1 gap-1 py-2 justify-center">
                <User className="h-3 w-3" />
                {selectedCustomer.first_name} {selectedCustomer.last_name}
                <button onClick={clearCustomer} className="ml-1 hover:text-destructive">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
          </div>
          
          <Input
            placeholder="Add order notes..."
            value={orderNotes}
            onChange={(e) => setOrderNotes(e.target.value)}
            className="text-sm mb-3"
          />
          
          <ScrollArea className="h-[40vh] overflow-auto">
            <div className="space-y-2">
              {cartItems.length === 0 ? (
                <div className="text-center py-8">
                  <ShoppingCart className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Your cart is empty</p>
                  <p className="text-xs text-muted-foreground">Add items to get started</p>
                </div>
              ) : (
                cartItems.map((item: CartItem) => (
                  <CartItemComponent
                    key={item.id}
                    item={item}
                    onUpdateQuantity={updateQuantity}
                    onRemove={removeFromCart}
                    region={region}
                    onAddNote={addItemNote}
                  />
                ))
              )}
            </div>
          </ScrollArea>
          
          <div className="space-y-2 border-t pt-3 mt-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{region?.currency_code?.toUpperCase() || "PHP"} {subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Tax ({(taxRate * 100).toFixed(0)}%)</span>
              <span>{region?.currency_code?.toUpperCase() || "PHP"} {tax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-bold text-lg">
              <span>Total</span>
              <span>{region?.currency_code?.toUpperCase() || "PHP"} {total.toFixed(2)}</span>
            </div>
          </div>
        </div>
        
        <div className="border-t p-4 space-y-2">
          <div className="grid grid-cols-3 gap-2">
            <Button variant="outline" size="sm" className="flex-col h-auto py-2 gap-1">
              <DollarSign className="h-4 w-4 text-green-600" />
              <span className="text-xs">Cash</span>
            </Button>
            <Button variant="outline" size="sm" className="flex-col h-auto py-2 gap-1">
              <CreditCard className="h-4 w-4 text-blue-600" />
              <span className="text-xs">Card</span>
            </Button>
            <Button variant="outline" size="sm" className="flex-col h-auto py-2 gap-1">
              <QrCode className="h-4 w-4 text-purple-600" />
              <span className="text-xs">QR Code</span>
            </Button>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={saveDraft} disabled={cartItems.length === 0}>
              <Save className="mr-2 h-4 w-4" />
              Save Draft
            </Button>
            <Button variant="outline" className="flex-1" onClick={onPrint} disabled={cartItems.length === 0}>
              <Printer className="mr-2 h-4 w-4" />
              Print
            </Button>
            <Button 
              className="flex-1 bg-primary hover:bg-primary/90" 
              onClick={() => {
                onOpenChange(false);
                onCheckout();
              }} 
              disabled={cartItems.length === 0}
            >
              Checkout
            </Button>
          </div>
        </div>
      </div>
    </SheetContent>
  </Sheet>
);

interface PosAppProps {
  region?: Region | any;
}

export default function PosApp({ region }: PosAppProps) {
  const { toast } = useToast();
  const [isMobile, setIsMobile] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [cartItems, setCartItems] = useLocalStorage<CartItem[]>("pos-cart", []);
  const [draftOrders, setDraftOrders] = useLocalStorage<DraftOrder[]>("pos-drafts", []);
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"created_at" | "title" | "price">("created_at");
  const [checkoutDialogOpen, setCheckoutDialogOpen] = useState(false);
  const [assignTableDialogOpen, setAssignTableDialogOpen] = useState(false);
  const [assignCustomerDialogOpen, setAssignCustomerDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<MedusaCustomer | null>(null);
  const [currentPlacement, setCurrentPlacement] = useState<Placement | null>(null);
  const [orderNotes, setOrderNotes] = useState("");
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [sections] = useState(mockSections);
  const [printDialogOpen, setPrintDialogOpen] = useState(false);
  const [mobileCartOpen, setMobileCartOpen] = useState(false);
  const [mobileDraftsOpen, setMobileDraftsOpen] = useState(false);

  // Check if mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Fetch categories
  const { 
    data: categoriesData, 
    isLoading: categoriesLoading,
    error: categoriesError,
  } = useQuery({
    queryKey: ["categories"],
    queryFn: listCategories,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch products with infinite loading
  const {
    data: productsData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: productsLoading,
    refetch: refetchProducts,
  } = useInfiniteQuery({
    queryKey: ["products", selectedCategoryId, searchQuery, sortBy, region?.id],
    queryFn: async ({ pageParam = 1 }) => {
      const result = await listProducts({
        page: pageParam,
        limit: isMobile ? 12 : 24,
        categoryId: selectedCategoryId !== "all" ? selectedCategoryId : undefined,
        search: searchQuery || undefined,
        sortBy,
        regionId: region?.id,
      });
      
      return {
        products: result.products,
        count: result.count,
        nextPage: result.hasMore ? pageParam + 1 : null,
      };
    },
    getNextPageParam: (lastPage) => lastPage.nextPage,
    initialPageParam: 1,
    staleTime: 2 * 60 * 1000,
    enabled: !!region,
  });

  // Flatten products
  const products = useMemo(() => {
    if (!productsData?.pages) return [];
    return productsData.pages.flatMap(page => page.products);
  }, [productsData]);

  const totalProductsCount = productsData?.pages[0]?.count || 0;

  // Add to cart mutation
  const addToCartMutation = useMutation({
    mutationFn: async ({ product, variant }: { product: MedusaProduct; variant: MedusaProductVariant }) => {
      const price = variant.calculated_price?.calculated_amount || variant.prices[0]?.amount || 0;
      return {
        id: crypto.randomUUID(),
        product_id: product.id,
        variant_id: variant.id,
        title: product.title,
        thumbnail: product.thumbnail,
        quantity: 1,
        unit_price: price,
        variant_title: variant.title,
        subtotal: price,
        total: price,
      } as CartItem;
    },
    onSuccess: (newItem, variables) => {
      const existingIndex = cartItems.findIndex(
        item => item.product_id === variables.product.id && item.variant_id === variables.variant.id
      );
      
      if (existingIndex !== -1) {
        const updatedCart = [...cartItems];
        updatedCart[existingIndex] = {
          ...updatedCart[existingIndex],
          quantity: updatedCart[existingIndex].quantity + 1,
          total: updatedCart[existingIndex].unit_price * (updatedCart[existingIndex].quantity + 1),
        };
        setCartItems(updatedCart);
      } else {
        setCartItems(prev => [...prev, newItem]);
      }
      
      toast({ title: "Added to cart", description: "Item has been added to your order" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to add item to cart", variant: "destructive" });
    },
  });

  const addToCart = (product: MedusaProduct, variant: MedusaProductVariant) => {
    addToCartMutation.mutate({ product, variant });
  };
  
  const updateQuantity = (id: string, quantity: number) => {
    if (quantity <= 0) {
      setCartItems(prev => prev.filter(item => item.id !== id));
    } else {
      setCartItems(prev =>
        prev.map(item =>
          item.id === id ? { ...item, quantity, total: quantity * item.unit_price } : item
        )
      );
    }
    window.dispatchEvent(new Event("cart-updated"));
  };
  
  const removeFromCart = (id: string) => {
    setCartItems(prev => prev.filter(item => item.id !== id));
    window.dispatchEvent(new Event("cart-updated"));
  };
  
  const addItemNote = (id: string, note: string) => {
    setCartItems(prev => prev.map(item => item.id === id ? { ...item, notes: note } : item));
  };
  
  const saveDraft = () => {
    if (cartItems.length === 0 && !currentPlacement) {
      toast({ title: "Cannot save draft", description: "Add items or assign a table first", variant: "destructive" });
      return;
    }
    
    const newDraft: DraftOrder = {
      id: currentDraftId || crypto.randomUUID(),
      draft_number: currentDraftId ? (draftOrders.find(d => d.id === currentDraftId)?.draft_number || draftOrders.length + 1) : draftOrders.length + 1,
      items: [...cartItems],
      created_at: currentDraftId ? (draftOrders.find(d => d.id === currentDraftId)?.created_at || new Date()) : new Date(),
      updated_at: new Date(),
      status: "active",
      customer_id: selectedCustomer?.id,
      customer: selectedCustomer || undefined,
      placement: currentPlacement || undefined,
      notes: orderNotes,
    };
    
    const existingIndex = draftOrders.findIndex(d => d.id === newDraft.id);
    let updatedDrafts;
    if (existingIndex !== -1) {
      updatedDrafts = [...draftOrders];
      updatedDrafts[existingIndex] = newDraft;
    } else {
      updatedDrafts = [...draftOrders, newDraft];
    }
    setDraftOrders(updatedDrafts);
    setCurrentDraftId(newDraft.id);
    localStorage.setItem("current_draft_id", newDraft.id);
    
    toast({ title: "Draft saved", description: `Order saved${currentPlacement ? ` for ${currentPlacement.name}` : ""}` });
    if (isMobile) setMobileCartOpen(false);
  };
  
  const loadDraft = (draft: DraftOrder) => {
    setCartItems(draft.items);
    setCurrentDraftId(draft.id);
    setSelectedCustomer(draft.customer || null);
    setCurrentPlacement(draft.placement || null);
    setOrderNotes(draft.notes || "");
    localStorage.setItem("current_draft_id", draft.id);
    toast({ title: "Draft loaded", description: `Loaded order #${draft.draft_number}` });
    window.dispatchEvent(new Event("cart-updated"));
  };
  
  const deleteDraft = (draftId: string) => {
    setDraftOrders(prev => prev.filter(d => d.id !== draftId));
    if (currentDraftId === draftId) {
      setCurrentDraftId(null);
      localStorage.removeItem("current_draft_id");
    }
    toast({ title: "Draft deleted", description: "Draft order has been removed" });
  };
  
  const clearCart = () => {
    if (cartItems.length === 0) return;
    setCartItems([]);
    setCurrentDraftId(null);
    setSelectedCustomer(null);
    setCurrentPlacement(null);
    setOrderNotes("");
    localStorage.removeItem("current_draft_id");
    toast({ title: "Cart cleared", description: "All items have been removed" });
    if (isMobile) setMobileCartOpen(false);
    window.dispatchEvent(new Event("cart-updated"));
  };
  
  const assignTable = (table: any, section: any) => {
    const placement: Placement = {
      id: crypto.randomUUID(),
      type: "table",
      reference_id: table.id,
      name: `Table ${table.number} - ${section.name}`,
      status: "active",
    };
    setCurrentPlacement(placement);
    setAssignTableDialogOpen(false);
    toast({ title: "Table assigned", description: `Table ${table.number} has been assigned to this order` });
  };
  
  const assignCustomer = (customer: MedusaCustomer) => {
    setSelectedCustomer(customer);
    setAssignCustomerDialogOpen(false);
    toast({ title: "Customer assigned", description: `${customer.first_name} ${customer.last_name} has been assigned` });
  };
  
  const releaseTable = () => {
    setCurrentPlacement(null);
    toast({ title: "Table released", description: "Table has been unassigned" });
  };
  
  const clearCustomer = () => {
    setSelectedCustomer(null);
    toast({ title: "Customer removed", description: "Customer has been unassigned" });
  };
  
  const handleCheckout = async () => {
    setIsCheckingOut(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    if (currentDraftId) {
      setDraftOrders(prev => prev.map(d => d.id === currentDraftId ? { ...d, status: "completed" } : d));
    }
    
    setIsCheckingOut(false);
    setCheckoutDialogOpen(false);
    setPrintDialogOpen(true);
  };
  
  // Calculate totals
  const subtotal = cartItems.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);
  const taxRate = region?.tax_rate || 0.12;
  const tax = subtotal * taxRate;
  const total = subtotal + tax;
  const itemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  
  const activeDraft = draftOrders.find(d => d.id === currentDraftId);
  const activeDrafts = draftOrders.filter(d => d.status === "active");

  const preparePrintData = useCallback((): PrintOrderData => {
    return {
      orderNumber: activeDraft ? `DRAFT-${activeDraft.draft_number}` : `ORD-${Date.now()}`,
      date: new Date(),
      customer: selectedCustomer ? {
        name: `${selectedCustomer.first_name} ${selectedCustomer.last_name}`,
        email: selectedCustomer.email,
        phone: selectedCustomer.phone || undefined,
      } : undefined,
      placement: currentPlacement || undefined,
      items: cartItems.map(item => ({
        name: item.title,
        quantity: item.quantity,
        price: item.unit_price,
        total: item.unit_price * item.quantity,
        notes: item.notes,
        variant: item.variant_title,
      })),
      subtotal,
      tax,
      taxRate: taxRate,
      total,
      paymentMethod: "Cash",
      notes: orderNotes || undefined,
    };
  }, [cartItems, selectedCustomer, currentPlacement, subtotal, tax, total, orderNotes, activeDraft]);

  if (categoriesError) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-destructive" />
          <h2 className="mt-4 text-lg font-semibold">Failed to load data</h2>
          <Button className="mt-4" onClick={() => window.location.reload()}>Retry</Button>
        </div>
      </div>
    );
  }

  // Mobile Layout
  if (isMobile) {
    return (
      <div className="flex flex-col h-full overflow-hidden pb-16">
        {/* Search and Categories */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b">
          <div className="flex flex-col gap-3 p-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-10"
                />
              </div>
              <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
                <SelectTrigger className="w-[100px] h-10">
                  <SelectValue placeholder="Sort" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="created_at">Newest</SelectItem>
                  <SelectItem value="title">Name</SelectItem>
                  <SelectItem value="price">Price</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon" className="h-10 w-10" onClick={() => refetchProducts()}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="flex gap-2 overflow-x-auto pb-1">
              <button
                onClick={() => setSelectedCategoryId("all")}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-lg px-3 py-1.5 transition-all flex-shrink-0",
                  selectedCategoryId === "all"
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "bg-card hover:bg-accent"
                )}
              >
                <span className="text-sm">📋</span>
                <span className="text-xs">All</span>
              </button>
              {!categoriesLoading && categoriesData?.slice(0, 8).map((category) => (
                <CategoryCard
                  key={category.id}
                  category={category}
                  isSelected={selectedCategoryId === category.id}
                  onClick={() => setSelectedCategoryId(category.id)}
                />
              ))}
            </div>
          </div>
        </div>
        
        {/* Products Grid */}
        <div className="flex-1 overflow-y-auto p-3">
          {productsLoading && !productsData ? (
            <div className="grid grid-cols-2 gap-3">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="aspect-square rounded-lg bg-muted animate-pulse" />
              ))}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                {products.slice(0, 20).map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onAddToCart={(variant) => addToCart(product, variant)}
                    isLoading={addToCartMutation.isPending}
                    region={region}
                  />
                ))}
              </div>
              
              {hasNextPage && (
                <div className="mt-4 flex justify-center">
                  <Button variant="outline" size="sm" onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
                    {isFetchingNextPage ? <Loader2 className="h-4 w-4 animate-spin" /> : "Load More"}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Mobile Bottom Bar */}
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t bg-card p-3">
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              className="flex-1" 
              onClick={() => setMobileDraftsOpen(true)}
            >
              <History className="mr-2 h-4 w-4" />
              Drafts {activeDrafts.length > 0 && `(${activeDrafts.length})`}
            </Button>
            <Button 
              className="flex-1 bg-primary hover:bg-primary/90" 
              onClick={() => setMobileCartOpen(true)}
            >
              <ShoppingCart className="mr-2 h-4 w-4" />
              Cart • {region?.currency_code?.toUpperCase() || "PHP"} {total.toFixed(2)}
            </Button>
          </div>
        </div>

        {/* Mobile Drafts Sheet */}
        <MobileDraftsSheet
          open={mobileDraftsOpen}
          onOpenChange={setMobileDraftsOpen}
          drafts={activeDrafts}
          onLoadDraft={loadDraft}
          onDeleteDraft={deleteDraft}
          currencyCode={region?.currency_code?.toUpperCase() || "PHP"}
        />

        {/* Mobile Cart Sheet */}
        <MobileCartSheet
          open={mobileCartOpen}
          onOpenChange={setMobileCartOpen}
          cartItems={cartItems}
          updateQuantity={updateQuantity}
          removeFromCart={removeFromCart}
          addItemNote={addItemNote}
          subtotal={subtotal}
          tax={tax}
          total={total}
          region={region}
          taxRate={taxRate}
          clearCart={clearCart}
          saveDraft={saveDraft}
          onCheckout={() => setCheckoutDialogOpen(true)}
          onPrint={() => setPrintDialogOpen(true)}
          onAssignTable={() => setAssignTableDialogOpen(true)}
          onAssignCustomer={() => setAssignCustomerDialogOpen(true)}
          currentPlacement={currentPlacement}
          selectedCustomer={selectedCustomer}
          orderNotes={orderNotes}
          setOrderNotes={setOrderNotes}
          releaseTable={releaseTable}
          clearCustomer={clearCustomer}
          activeDraft={activeDraft}
        />

        {/* Dialogs */}
        <Dialog open={assignTableDialogOpen} onOpenChange={setAssignTableDialogOpen}>
          <DialogContent className="max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Assign Table</DialogTitle>
              <DialogDescription>Select a table for this order</DialogDescription>
            </DialogHeader>
            <TableGrid sections={sections} onSelectTable={(table, section) => { assignTable(table, section); }} />
            <DialogFooter>
              <Button variant="outline" onClick={() => setAssignTableDialogOpen(false)}>Cancel</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        <Dialog open={assignCustomerDialogOpen} onOpenChange={setAssignCustomerDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Assign Customer</DialogTitle>
              <DialogDescription>Search for an existing customer or create a new one</DialogDescription>
            </DialogHeader>
            <CustomerSearch onSelectCustomer={assignCustomer} />
            <DialogFooter>
              <Button variant="outline" onClick={() => setAssignCustomerDialogOpen(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        <Dialog open={checkoutDialogOpen} onOpenChange={setCheckoutDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Complete Order</DialogTitle>
              <DialogDescription>Review and confirm the order</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {currentPlacement && (
                <div className="flex items-center gap-2 text-sm bg-muted p-2 rounded">
                  <MapPin className="h-4 w-4" />
                  <span>{currentPlacement.name}</span>
                </div>
              )}
              {selectedCustomer && (
                <div className="flex items-center gap-2 text-sm bg-muted p-2 rounded">
                  <User className="h-4 w-4" />
                  <span>{selectedCustomer.first_name} {selectedCustomer.last_name}</span>
                </div>
              )}
              <Separator />
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{region?.currency_code?.toUpperCase() || "PHP"} {subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tax</span>
                  <span>{region?.currency_code?.toUpperCase() || "PHP"} {tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span>{region?.currency_code?.toUpperCase() || "PHP"} {total.toFixed(2)}</span>
                </div>
              </div>
            </div>
            <DialogFooter className="gap-2 flex-col sm:flex-row">
              <Button variant="outline" onClick={() => setCheckoutDialogOpen(false)}>Cancel</Button>
              <Button variant="outline" onClick={() => setPrintDialogOpen(true)}>Print</Button>
              <Button onClick={handleCheckout} disabled={isCheckingOut}>
                {isCheckingOut && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Confirm Order
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <PrintDialog
          open={printDialogOpen}
          onOpenChange={setPrintDialogOpen}
          orderData={preparePrintData()}
        />
      </div>
    );
  }

  // Desktop Layout - With Fixed Cart Sidebar Header/Footer and Scrollable Items
  return (
    <div className="flex h-full overflow-hidden">
      {/* Main Content - Scrollable Products Grid */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Search and Categories - Sticky Header */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b flex-shrink-0">
          <div className="flex flex-col gap-4 p-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="created_at">Newest</SelectItem>
                  <SelectItem value="title">Name</SelectItem>
                  <SelectItem value="price">Price</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon" onClick={() => refetchProducts()}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Categories Scroll */}
            <div className="flex gap-2 overflow-x-auto pb-2">
              <button
                onClick={() => setSelectedCategoryId("all")}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-lg px-4 py-2 transition-all flex-shrink-0",
                  selectedCategoryId === "all"
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "bg-card hover:bg-accent"
                )}
              >
                <span className="text-xl">📋</span>
                <span className="text-xs font-medium">All</span>
              </button>
              {!categoriesLoading && categoriesData?.map((category) => (
                <CategoryCard
                  key={category.id}
                  category={category}
                  isSelected={selectedCategoryId === category.id}
                  onClick={() => setSelectedCategoryId(category.id)}
                />
              ))}
            </div>
          </div>
        </div>
        
        {/* Products Grid - Scrollable Area */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              {selectedCategoryId === "all" ? "All Items" : categoriesData?.find(c => c.id === selectedCategoryId)?.name || "Products"}
            </h2>
            <p className="text-sm text-muted-foreground">{totalProductsCount} items</p>
          </div>
          
          {productsLoading && !productsData ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5">
              {[...Array(12)].map((_, i) => (
                <div key={i} className="aspect-square rounded-lg bg-muted animate-pulse" />
              ))}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5">
                {products.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onAddToCart={(variant) => addToCart(product, variant)}
                    isLoading={addToCartMutation.isPending}
                    region={region}
                  />
                ))}
              </div>
              
              {hasNextPage && (
                <div className="mt-8 flex justify-center">
                  <Button variant="outline" onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
                    {isFetchingNextPage ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Loading...</> : "Load More"}
                  </Button>
                </div>
              )}
              
              {products.length === 0 && !productsLoading && (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <Package className="h-16 w-16 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold">No products found</h3>
                  <p className="text-sm text-muted-foreground">
                    Try adjusting your search or category filter
                  </p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => {
                      setSearchQuery("");
                      setSelectedCategoryId("all");
                    }}
                  >
                    Clear filters
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      
      {/* Cart Sidebar - Desktop with Fixed Header and Footer */}
      <aside className="hidden w-96 flex-col border-l bg-card lg:flex">
        {/* Fixed Header */}
        <div className="border-b p-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              <h2 className="font-semibold">Current Order</h2>
              {activeDraft && <Badge variant="outline">Draft #{activeDraft.draft_number}</Badge>}
            </div>
            <Button variant="ghost" size="sm" onClick={clearCart} className="text-destructive">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="mt-2 flex flex-wrap gap-2">
            {!currentPlacement ? (
              <Button variant="outline" size="sm" onClick={() => setAssignTableDialogOpen(true)}>
                <MapPin className="mr-1 h-3 w-3" />Assign Table
              </Button>
            ) : (
              <Badge variant="secondary" className="gap-1">
                <MapPin className="h-3 w-3" />{currentPlacement.name}
                <button onClick={releaseTable} className="ml-1 hover:text-destructive"><X className="h-3 w-3" /></button>
              </Badge>
            )}
            {!selectedCustomer ? (
              <Button variant="outline" size="sm" onClick={() => setAssignCustomerDialogOpen(true)}>
                <UserPlus className="mr-1 h-3 w-3" />Assign Customer
              </Button>
            ) : (
              <Badge variant="secondary" className="gap-1">
                <User className="h-3 w-3" />{selectedCustomer.first_name} {selectedCustomer.last_name}
                <button onClick={() => setSelectedCustomer(null)} className="ml-1 hover:text-destructive"><X className="h-3 w-3" /></button>
              </Badge>
            )}
          </div>
        </div>
        
        {/* Scrollable Items Area */}
        <div className="flex-1 overflow-hidden">
          <ScrollArea className="max-h-[50vh]">
            <div className="space-y-3 p-4">
              {cartItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <ShoppingCart className="h-12 w-12 text-muted-foreground mb-3" />
                  <p className="text-sm text-muted-foreground">Your cart is empty</p>
                  <p className="text-xs text-muted-foreground">Add items to get started</p>
                </div>
              ) : (
                cartItems.map((item) => (
                  <CartItemComponent
                    key={item.id}
                    item={item}
                    onUpdateQuantity={updateQuantity}
                    onRemove={removeFromCart}
                    region={region}
                    onAddNote={addItemNote}
                  />
                ))
              )}
            </div>
          </ScrollArea>
        </div>
        
        {/* Fixed Footer with Actions */}
        <div className="border-t p-4 flex-shrink-0">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{region?.currency_code?.toUpperCase() || "PHP"} {subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Tax ({(taxRate * 100).toFixed(0)}%)</span>
              <span>{region?.currency_code?.toUpperCase() || "PHP"} {tax.toFixed(2)}</span>
            </div>
            <Separator />
            <div className="flex justify-between text-lg font-bold">
              <span>Total</span>
              <span>{region?.currency_code?.toUpperCase() || "PHP"} {total.toFixed(2)}</span>
            </div>
          </div>
          
          <div className="mt-2">
            <Input
              placeholder="Order notes..."
              value={orderNotes}
              onChange={(e) => setOrderNotes(e.target.value)}
              className="text-sm"
            />
          </div>
          
          <div className="mt-4 grid grid-cols-3 gap-2">
            <Button variant="outline" className="flex flex-col items-center py-2 h-auto gap-1">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100">
                <DollarSign className="h-4 w-4 text-green-600" />
              </div>
              <span className="text-xs">Cash</span>
            </Button>
            <Button variant="outline" className="flex flex-col items-center py-2 h-auto gap-1">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
                <CreditCard className="h-4 w-4 text-blue-600" />
              </div>
              <span className="text-xs">Card</span>
            </Button>
            <Button variant="outline" className="flex flex-col items-center py-2 h-auto gap-1">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-100">
                <QrCode className="h-4 w-4 text-purple-600" />
              </div>
              <span className="text-xs">QR Code</span>
            </Button>
          </div>
          
          <div className="mt-4 flex gap-2">
            <Button variant="outline" className="flex-1" onClick={saveDraft} disabled={cartItems.length === 0 && !currentPlacement}>
              <Save className="mr-2 h-4 w-4" />
              Save Draft
            </Button>
            <Button 
              variant="outline" 
              className="flex-1" 
              onClick={() => setPrintDialogOpen(true)} 
              disabled={cartItems.length === 0}
            >
              <Printer className="mr-2 h-4 w-4" />
              Print
            </Button>
            <Button 
              className="flex-1 bg-primary hover:bg-primary/90" 
              onClick={() => setCheckoutDialogOpen(true)} 
              disabled={cartItems.length === 0}
            >
              Checkout
            </Button>
          </div>
        </div>
      </aside>
      
      {/* Dialogs - Desktop */}
      <Dialog open={assignTableDialogOpen} onOpenChange={setAssignTableDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Table</DialogTitle>
            <DialogDescription>Select a table for this order</DialogDescription>
          </DialogHeader>
          <TableGrid sections={sections} onSelectTable={(table, section) => { assignTable(table, section); }} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignTableDialogOpen(false)}>Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={assignCustomerDialogOpen} onOpenChange={setAssignCustomerDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Customer</DialogTitle>
            <DialogDescription>Search for an existing customer or create a new one</DialogDescription>
          </DialogHeader>
          <CustomerSearch onSelectCustomer={assignCustomer} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignCustomerDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={checkoutDialogOpen} onOpenChange={setCheckoutDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Complete Order</DialogTitle>
            <DialogDescription>Review and confirm the order</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {currentPlacement && (
              <div className="flex items-center gap-2 text-sm bg-muted p-2 rounded">
                <MapPin className="h-4 w-4" />
                <span>{currentPlacement.name}</span>
              </div>
            )}
            {selectedCustomer && (
              <div className="flex items-center gap-2 text-sm bg-muted p-2 rounded">
                <User className="h-4 w-4" />
                <span>{selectedCustomer.first_name} {selectedCustomer.last_name}</span>
              </div>
            )}
            <Separator />
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{region?.currency_code?.toUpperCase() || "PHP"} {subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tax</span>
                <span>{region?.currency_code?.toUpperCase() || "PHP"} {tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold">
                <span>Total</span>
                <span>{region?.currency_code?.toUpperCase() || "PHP"} {total.toFixed(2)}</span>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setCheckoutDialogOpen(false)}>Cancel</Button>
            <Button variant="outline" onClick={() => setPrintDialogOpen(true)}>Print</Button>
            <Button onClick={handleCheckout} disabled={isCheckingOut}>
              {isCheckingOut && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <PrintDialog
        open={printDialogOpen}
        onOpenChange={setPrintDialogOpen}
        orderData={preparePrintData()}
      />
    </div>
  );
}