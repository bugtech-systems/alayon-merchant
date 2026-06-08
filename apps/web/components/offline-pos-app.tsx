// components/offline-pos-app.tsx
"use client";

import { useState, useEffect } from 'react';
import { useOfflinePOS } from '@/hooks/use-offline-pos';
import { useOfflineMutation } from '@/hooks/use-offline-data';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Wifi, WifiOff, RefreshCw, Download, Upload } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export default function OfflinePOSApp() {
  const { 
    isOnline, 
    pendingSyncCount, 
    isSyncing, 
    manualSync,
    getProducts,
    getProductById,
    createOfflineOrder,
    getOfflineOrders,
  } = useOfflinePOS();
  
  const [products, setProducts] = useState([]);
  const [offlineOrders, setOfflineOrders] = useState([]);
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);

  // Create order mutation with offline support
  const createOrderMutation = useOfflineMutation('create_order', async (orderData: any) => {
    // This will only run when online
    const response = await fetch('/api/orders', {
      method: 'POST',
      body: JSON.stringify(orderData),
    });
    return response.json();
  });

  // Load products on mount
  useEffect(() => {
    loadProducts();
    loadOfflineOrders();
  }, []);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const data = await getProducts();
      setProducts(data);
    } catch (error) {
      console.error('Failed to load products:', error);
      toast({ title: 'Error', description: 'Failed to load products', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const loadOfflineOrders = async () => {
    const orders = await getOfflineOrders();
    setOfflineOrders(orders);
  };

  const handleCheckout = async () => {
    const orderData = {
      items: cart,
      total: cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
      customer_name: 'Walk-in Customer',
      created_at: new Date(),
    };

    const result = await createOrderMutation.mutateAsync(orderData);
    
    if (result.offline) {
      toast({
        title: 'Order Saved Offline',
        description: 'Your order will be synced when you\'re back online.',
      });
      await loadOfflineOrders();
    } else {
      toast({
        title: 'Order Complete',
        description: 'Your order has been placed successfully.',
      });
    }
    
    setCart([]);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Offline Status Bar */}
      <div className={cn(
        "sticky top-0 z-50 flex items-center justify-between px-4 py-2 text-sm",
        isOnline ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
      )}>
        <div className="flex items-center gap-2">
          {isOnline ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
          <span>{isOnline ? 'Online Mode' : 'Offline Mode'}</span>
        </div>
        
        <div className="flex items-center gap-3">
          {pendingSyncCount > 0 && (
            <Badge variant="secondary" className="gap-1">
              <Upload className="h-3 w-3" />
              {pendingSyncCount} pending
            </Badge>
          )}
          
          <Button 
            size="sm" 
            variant="ghost" 
            onClick={manualSync}
            disabled={isSyncing || !isOnline}
            className="h-8"
          >
            <RefreshCw className={cn("h-4 w-4", isSyncing && "animate-spin")} />
            <span className="ml-2 hidden sm:inline">Sync Now</span>
          </Button>
        </div>
      </div>

      {/* Offline Orders Summary */}
      {offlineOrders.length > 0 && (
        <div className="bg-blue-50 border-b border-blue-200 p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Download className="h-4 w-4 text-blue-600" />
              <span className="text-sm text-blue-700">
                {offlineOrders.filter(o => o.status === 'pending_sync').length} orders pending sync
              </span>
            </div>
            <Button 
              size="sm" 
              variant="link" 
              className="text-blue-600"
              onClick={loadOfflineOrders}
            >
              View Details
            </Button>
          </div>
        </div>
      )}

      {/* Main POS Content */}
      <div className="flex-1 overflow-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {products.map((product: any) => (
              <ProductCard
                key={product.id}
                product={product}
                onAddToCart={() => {
                  setCart(prev => [...prev, {
                    id: product.id,
                    title: product.title,
                    price: product.variants[0]?.prices[0]?.amount || 0,
                    quantity: 1,
                  }]);
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Cart Sidebar */}
      <CartSidebar
        cart={cart}
        onCheckout={handleCheckout}
        isOnline={isOnline}
        isSubmitting={createOrderMutation.isPending}
      />
    </div>
  );
}