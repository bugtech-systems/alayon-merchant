"use client";

import { useState, useEffect, useMemo } from "react";
import { useInfiniteQuery, useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
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
  SheetTrigger,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  User,
  AlertCircle,
  RefreshCw,
  X,
  Loader2,
  MapPin,
  UserPlus,
  CheckCircle2,
  Edit2,
  Clock,
} from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useLocalStorage } from "@/hooks/use-local-storage";

// Import types and API functions
import {
  MedusaProduct,
  MedusaProductVariant,
  MedusaProductCategory,
  CartItem,
  DraftOrder,
  Region,
  listCategories,
  listProductsWithSort,
} from "../lib/pos-api";

// Import sub-components
import { ProductCard } from "./product-card";
import { CategoryCard } from "./category-card";
import { CartItemComponent } from "./cart-item";
import { CustomerSearch } from "./customer-search";
import { TableGrid } from "./table-grid";

interface PosContentProps {
  region: Region | null;
}

export default function PosContent({ region }: PosContentProps) {
  const { toast } = useToast();
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [cartItems, setCartItems] = useLocalStorage<CartItem[]>("pos-cart", []);
  const [draftOrders, setDraftOrders] = useLocalStorage<DraftOrder[]>("pos-drafts", []);
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("products");
  const [sortBy, setSortBy] = useState<"created_at" | "title" | "price">("created_at");
  const [checkoutDialogOpen, setCheckoutDialogOpen] = useState(false);
  const [assignTableDialogOpen, setAssignTableDialogOpen] = useState(false);
  const [assignCustomerDialogOpen, setAssignCustomerDialogOpen] = useState(false);
  const [selectedTable, setSelectedTable] = useState<{ table: any; section: any } | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [currentPlacement, setCurrentPlacement] = useState<any>(null);
  const [orderNotes, setOrderNotes] = useState("");
  const [isCheckingOut, setIsCheckingOut] = useState(false);

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
      const queryParams: any = { limit: 24 };
      if (selectedCategoryId !== "all") queryParams.category_id = [selectedCategoryId];
      if (searchQuery) queryParams.q = searchQuery;
      if (sortBy === "title") queryParams.order = "title";
      else if (sortBy === "price") queryParams.order = "variants.prices.amount";
      
      return listProductsWithSort({
        page: pageParam,
        queryParams,
        sortBy,
        countryCode: "ph",
      });
    },
    getNextPageParam: (lastPage) => lastPage.nextPage,
    initialPageParam: 1,
    staleTime: 2 * 60 * 1000,
    enabled: !!region,
  });

  const products = useMemo(() => {
    if (!productsData?.pages) return [];
    return productsData.pages.flatMap(page => page.response.products);
  }, [productsData]);

  const totalProductsCount = productsData?.pages[0]?.response.count || 0;

  // Load draft from localStorage on mount
  useEffect(() => {
    const savedDraftId = localStorage.getItem("current_draft_id");
    if (savedDraftId) {
      const draft = draftOrders.find(d => d.id === savedDraftId);
      if (draft && draft.status === "active") {
        setCartItems(draft.items);
        setCurrentDraftId(draft.id);
        setSelectedCustomer(draft.customer || null);
        setCurrentPlacement(draft.placement || null);
        setOrderNotes(draft.notes || "");
      }
    }
  }, []);

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
  };
  
  const removeFromCart = (id: string) => {
    setCartItems(prev => prev.filter(item => item.id !== id));
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
  };
  
  const handleCheckout = async () => {
    setIsCheckingOut(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    if (currentDraftId) {
      setDraftOrders(prev => prev.map(d => d.id === currentDraftId ? { ...d, status: "completed" } : d));
    }
    
    clearCart();
    setIsCheckingOut(false);
    setCheckoutDialogOpen(false);
    
    toast({ title: "Order completed", description: "Your order has been placed successfully" });
  };
  
  // Calculate totals
  const subtotal = cartItems.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);
  const taxRate = region?.tax_rate || 0.12;
  const tax = subtotal * taxRate;
  const total = subtotal + tax;
  const itemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  
  if (categoriesError) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-destructive" />
          <h2 className="mt-4 text-lg font-semibold">Failed to load data</h2>
          <p className="text-muted-foreground">Please check your connection and try again</p>
          <Button className="mt-4" onClick={() => window.location.reload()}>Retry</Button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Main Content Area with Tabs */}
      <div className="flex-1 overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10">
            <div className="flex items-center justify-between px-6 py-2">
              <TabsList>
                <TabsTrigger value="products">Products</TabsTrigger>
                <TabsTrigger value="tables">Tables</TabsTrigger>
                <TabsTrigger value="customers">Customers</TabsTrigger>
              </TabsList>
              
              {/* Cart Summary - Mobile */}
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm" className="lg:hidden relative">
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    Cart
                    {itemCount > 0 && (
                      <Badge className="absolute -right-2 -top-2 px-1.5 py-0.5 min-w-[18px] h-[18px] flex items-center justify-center">
                        {itemCount}
                      </Badge>
                    )}
                  </Button>
                </SheetTrigger>
                <SheetContent side="bottom" className="h-[85vh] rounded-t-xl">
                  <SheetHeader>
                    <SheetTitle className="flex items-center justify-between">
                      <span>Your Order</span>
                      <Button variant="ghost" size="sm" onClick={clearCart}>Clear</Button>
                    </SheetTitle>
                  </SheetHeader>
                  <ScrollArea className="h-[calc(85vh-180px)] mt-4">
                    <div className="space-y-3">
                      {cartItems.map((item) => (
                        <CartItemComponent
                          key={item.id}
                          item={item}
                          onUpdateQuantity={updateQuantity}
                          onRemove={removeFromCart}
                          region={region}
                          onAddNote={addItemNote}
                        />
                      ))}
                    </div>
                  </ScrollArea>
                  <div className="border-t pt-4 mt-4">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Subtotal</span>
                        <span>{region?.currency_code?.toUpperCase() || "PHP"} {subtotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Tax</span>
                        <span>{region?.currency_code?.toUpperCase() || "PHP"} {tax.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between font-bold text-lg">
                        <span>Total</span>
                        <span>{region?.currency_code?.toUpperCase() || "PHP"} {total.toFixed(2)}</span>
                      </div>
                    </div>
                    <Button className="w-full mt-4" onClick={() => setCheckoutDialogOpen(true)}>
                      Checkout
                    </Button>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
          
          {/* Products Tab */}
          <TabsContent value="products" className="flex-1 overflow-y-auto m-0">
            <div className="p-6">
              {/* Search and Filters */}
              <div className="flex gap-3 mb-6">
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
              
              {/* Categories */}
              <div className="flex gap-2 overflow-x-auto pb-4 mb-6 scrollbar-thin">
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
              
              {/* Products Grid */}
              {productsLoading && !productsData ? (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                  {[...Array(10)].map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="aspect-square rounded-lg bg-muted" />
                      <div className="mt-3 h-4 w-3/4 rounded bg-muted" />
                      <div className="mt-2 h-3 w-1/2 rounded bg-muted" />
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
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
                        {isFetchingNextPage ? <Loader2 className="h-4 w-4 animate-spin" /> : "Load More"}
                      </Button>
                    </div>
                  )}
                  
                  {products.length === 0 && !productsLoading && (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                      <Package className="h-16 w-16 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-semibold">No products found</h3>
                      <Button variant="outline" className="mt-4" onClick={() => { setSearchQuery(""); setSelectedCategoryId("all"); }}>
                        Clear filters
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          </TabsContent>
          
          {/* Tables Tab */}
          <TabsContent value="tables" className="flex-1 overflow-y-auto m-0 p-6">
            <TableGrid onSelectTable={(table, section) => {
              setSelectedTable({ table, section });
              setAssignTableDialogOpen(true);
            }} />
          </TabsContent>
          
          {/* Customers Tab */}
          <TabsContent value="customers" className="flex-1 overflow-y-auto m-0 p-6">
            <div className="max-w-md mx-auto">
              <h2 className="text-2xl font-bold mb-6">Customer Management</h2>
              <CustomerSearch onSelectCustomer={(customer) => {
                setSelectedCustomer(customer);
                setAssignCustomerDialogOpen(false);
                toast({ title: "Customer assigned", description: `${customer.first_name} ${customer.last_name} has been assigned` });
              }} />
            </div>
          </TabsContent>
        </Tabs>
      </div>
      
      {/* Cart Sidebar - Desktop */}
      <aside className="hidden lg:flex w-96 flex-col border-l bg-card">
        <div className="border-b p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              <h2 className="font-semibold">Current Order</h2>
            </div>
            <Button variant="ghost" size="sm" onClick={clearCart} className="text-destructive">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Assignment Info */}
          <div className="flex flex-wrap gap-2">
            {!currentPlacement ? (
              <Button variant="outline" size="sm" onClick={() => setAssignTableDialogOpen(true)}>
                <MapPin className="mr-1 h-3 w-3" />Assign Table
              </Button>
            ) : (
              <Badge variant="secondary" className="gap-1">
                <MapPin className="h-3 w-3" />{currentPlacement.name}
                <button onClick={() => setCurrentPlacement(null)} className="ml-1 hover:text-destructive">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            
            {!selectedCustomer ? (
              <Button variant="outline" size="sm" onClick={() => setAssignCustomerDialogOpen(true)}>
                <UserPlus className="mr-1 h-3 w-3" />Assign Customer
              </Button>
            ) : (
              <Badge variant="secondary" className="gap-1">
                <User className="h-3 w-3" />{selectedCustomer.first_name} {selectedCustomer.last_name}
                <button onClick={() => setSelectedCustomer(null)} className="ml-1 hover:text-destructive">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
          </div>
          
          {orderNotes && (
            <p className="text-xs text-muted-foreground mt-2 italic">📝 {orderNotes}</p>
          )}
        </div>
        
        <ScrollArea className="flex-1">
          <div className="space-y-3 p-4">
            {cartItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <ShoppingCart className="h-12 w-12 text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">Your cart is empty</p>
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
        
        <div className="border-t p-4">
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
          
          <div className="mt-3">
            <Input
              placeholder="Add order notes..."
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
            <Button variant="outline" className="flex-1" onClick={saveDraft}>
              Save Draft
            </Button>
            <Button className="flex-1 bg-primary hover:bg-primary/90" onClick={() => setCheckoutDialogOpen(true)} disabled={cartItems.length === 0}>
              Checkout
            </Button>
          </div>
        </div>
      </aside>
      
      {/* Dialogs */}
      <Dialog open={assignTableDialogOpen} onOpenChange={