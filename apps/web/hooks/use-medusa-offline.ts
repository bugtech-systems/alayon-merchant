// lib/services/cart-sync.service.ts
import { sdk } from "@/lib/medusa/config"
import { getAuthHeaders, getCartId } from "@/lib/medusa/data/cookies"

interface OfflineCartItem {
  id: string
  variant_id: string
  quantity: number
  timestamp: number
}

interface OfflineCart {
  id: string
  items: OfflineCartItem[]
  lastSynced: number | null
}

export class CartSyncService {
  private static instance: CartSyncService
  private syncInProgress = false
  private readonly STORAGE_KEY = 'offline_cart_sync'

  static getInstance(): CartSyncService {
    if (!CartSyncService.instance) {
      CartSyncService.instance = new CartSyncService()
    }
    return CartSyncService.instance
  }

  async syncCart(): Promise<void> {
    if (this.syncInProgress) return
    this.syncInProgress = true

    try {
      const cartId = await getCartId()
      if (!cartId) return

      const offlineCart = await this.getOfflineCart()
      if (!offlineCart || offlineCart.items.length === 0) return

      const headers = await getAuthHeaders()
      
      // Process each offline item
      for (const item of offlineCart.items) {
        try {
          // Check if item already exists in server cart
          const existingItem = await this.findExistingLineItem(cartId, item.variant_id)
          
          if (existingItem) {
            // Update existing item
            await sdk.store.cart.updateLineItem(
              cartId,
              existingItem.id,
              { quantity: existingItem.quantity + item.quantity },
              {},
              headers
            )
          } else {
            // Create new line item
            await sdk.store.cart.createLineItem(
              cartId,
              { variant_id: item.variant_id, quantity: item.quantity },
              {},
              headers
            )
          }
          
          // Remove synced item from offline storage
          await this.removeSyncedItem(item.id)
        } catch (error) {
          console.error(`Failed to sync item ${item.id}:`, error)
        }
      }
      
      // Mark cart as synced
      await this.markCartSynced()
    } finally {
      this.syncInProgress = false
    }
  }

  async addOfflineItem(variantId: string, quantity: number): Promise<void> {
    const offlineCart = await this.getOfflineCart()
    const existingItem = offlineCart.items.find(item => item.variant_id === variantId)
    
    if (existingItem) {
      existingItem.quantity += quantity
    } else {
      offlineCart.items.push({
        id: crypto.randomUUID(),
        variant_id: variantId,
        quantity,
        timestamp: Date.now()
      })
    }
    
    await this.saveOfflineCart(offlineCart)
  }

  private async getOfflineCart(): Promise<OfflineCart> {
    if (typeof window === 'undefined') {
      return { id: 'offline', items: [], lastSynced: null }
    }
    
    const stored = localStorage.getItem(this.STORAGE_KEY)
    if (stored) {
      return JSON.parse(stored)
    }
    
    return { id: 'offline', items: [], lastSynced: null }
  }

  private async saveOfflineCart(cart: OfflineCart): Promise<void> {
    if (typeof window === 'undefined') return
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(cart))
  }

  private async findExistingLineItem(cartId: string, variantId: string): Promise<any> {
    const headers = await getAuthHeaders()
    const { cart } = await sdk.client.fetch(`/store/carts/${cartId}`, {
      headers,
      credentials: "include",
    })
    
    return cart.items?.find((item: any) => item.variant_id === variantId)
  }

  private async removeSyncedItem(itemId: string): Promise<void> {
    const offlineCart = await this.getOfflineCart()
    offlineCart.items = offlineCart.items.filter(item => item.id !== itemId)
    await this.saveOfflineCart(offlineCart)
  }

  private async markCartSynced(): Promise<void> {
    const offlineCart = await this.getOfflineCart()
    offlineCart.lastSynced = Date.now()
    await this.saveOfflineCart(offlineCart)
  }
}