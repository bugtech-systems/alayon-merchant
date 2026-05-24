// contexts/cart-context.tsx
'use client'

import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react'
import type { 
  StoreCart, 
  StoreCartLineItem,
  StoreAddCartLineItem,
  StoreUpdateCartLineItem 
} from '@medusajs/types'
import { setCartId } from '@/lib/medusa/data/cookies'

// Types for Medusa cart
type MedusaCart = StoreCart
type MedusaCartLine = StoreCartLineItem

const CART_ID_KEY = 'medusa_cart_id'
const REGION_ID_KEY = 'medusa_region_id'

type CartState = {
  cart: MedusaCart | null
  isLoading: boolean
  isOpen: boolean
  isUpdating: boolean
}

type CartAction =
  | { type: 'SET_CART'; cart: MedusaCart | null }
  | { type: 'SET_LOADING'; isLoading: boolean }
  | { type: 'SET_UPDATING'; isUpdating: boolean }
  | { type: 'OPEN_CART' }
  | { type: 'CLOSE_CART' }
  | { type: 'TOGGLE_CART' }

const initialState: CartState = {
  cart: null,
  isLoading: false,
  isOpen: false,
  isUpdating: false,
}

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'SET_CART':
      return { ...state, cart: action.cart }
    case 'SET_LOADING':
      return { ...state, isLoading: action.isLoading }
    case 'SET_UPDATING':
      return { ...state, isUpdating: action.isUpdating }
    case 'OPEN_CART':
      return { ...state, isOpen: true }
    case 'CLOSE_CART':
      return { ...state, isOpen: false }
    case 'TOGGLE_CART':
      return { ...state, isOpen: !state.isOpen }
    default:
      return state
  }
}

type CartContextType = {
  cart: MedusaCart | null
  isLoading: boolean
  isOpen: boolean
  isUpdating: boolean
  cartItems: MedusaCartLine[]
  totalQuantity: number
  subtotal: number
  total: number
  openCart: () => void
  closeCart: () => void
  toggleCart: () => void
  addToCart: (variantId: string, quantity?: number, metadata?: Record<string, any>) => Promise<void>
  updateQuantity: (lineId: string, quantity: number, metadata?: Record<string, any>) => Promise<void>
  removeFromCart: (lineId: string) => Promise<void>
  clearCart: () => Promise<void>
  setRegion: (regionId: string) => Promise<void>
}

const CartContext = createContext<CartContextType | null>(null)

export function useCart() {
  const context = useContext(CartContext)
  if (!context) {
    throw new Error('useCart must be used within a CartProvider')
  }
  return context
}

export function CartProvider({ 
  children, 
  regionId: initialRegionId = 'reg_default',
  countryCode = 'us'
}: { 
  children: ReactNode
  regionId?: string
  countryCode?: string
}) {
  const [state, dispatch] = useReducer(cartReducer, initialState)

  const cartItems = state.cart?.items ?? []
  const totalQuantity = state.cart?.items?.reduce((acc, item) => acc + (item.quantity || 0), 0) ?? 0
  const subtotal = state.cart?.subtotal ?? 0
  const total = state.cart?.total ?? 0

  // Helper for API calls
  const medusaFetch = useCallback(async (endpoint: string, options: RequestInit = {}) => {
    const baseUrl = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || 'http://localhost:9000'
    const response = await fetch(`${baseUrl}/store${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      credentials: 'include',
    })
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Failed to fetch')
    }
    
    return response.json()
  }, [])

  // Fetch current cart
  const fetchCart = useCallback(async (cartId: string) => {
    try {
      const { cart } = await medusaFetch(`/carts/${cartId}`)
      if (cart) {
        dispatch({ type: 'SET_CART', cart })
      } else {
        localStorage.removeItem(CART_ID_KEY)
        dispatch({ type: 'SET_CART', cart: null })
      }
    } catch (error) {
      console.error('Error fetching cart:', error)
      localStorage.removeItem(CART_ID_KEY)
      dispatch({ type: 'SET_CART', cart: null })
    }
  }, [medusaFetch])

  // Create new cart with region
  const createNewCart = useCallback(async (regionId?: string, salesChannelId?: string) => {
    try {
      dispatch({ type: 'SET_LOADING', isLoading: true })
      
      const storedRegionId = localStorage.getItem(REGION_ID_KEY) || regionId || initialRegionId
      
      const { cart } = await medusaFetch('/carts', {
        method: 'POST',
        body: JSON.stringify({
          region_id: storedRegionId,
          sales_channel_id: salesChannelId,
          country_code: countryCode,
        }),
      })
      
      if (cart) {
        // localStorage.setItem(CART_ID_KEY, cart.id)
        setCartId(cart?.id)
        dispatch({ type: 'SET_CART', cart })
        return cart.id
      }
    } catch (error) {
      console.error('Error creating cart:', error)
    } finally {
      dispatch({ type: 'SET_LOADING', isLoading: false })
    }
    return null
  }, [medusaFetch, initialRegionId, countryCode])

  // Initialize cart on mount
  useEffect(() => {
    const initCart = async () => {
      const cartId = localStorage.getItem(CART_ID_KEY)
      const storedRegionId = localStorage.getItem(REGION_ID_KEY)
      
      if (cartId) {
        await fetchCart(cartId)
      }
      
      // Set region if not set
      if (!storedRegionId && initialRegionId) {
        localStorage.setItem(REGION_ID_KEY, initialRegionId)
      }
    }
    
    initCart()
  }, [fetchCart, initialRegionId])

  // Cart UI actions
  const openCart = useCallback(() => dispatch({ type: 'OPEN_CART' }), [])
  const closeCart = useCallback(() => dispatch({ type: 'CLOSE_CART' }), [])
  const toggleCart = useCallback(() => dispatch({ type: 'TOGGLE_CART' }), [])

  // Add to cart
  const addToCart = useCallback(
    async (variantId: string, quantity = 1, metadata?: Record<string, any>) => {
      dispatch({ type: 'SET_LOADING', isLoading: true })

      try {
        let cartId = localStorage.getItem(CART_ID_KEY)

        if (!cartId) {
          cartId = await createNewCart()
        }

        if (!cartId) {
          throw new Error('Failed to create cart')
        }

        const { cart } = await medusaFetch(`/carts/${cartId}/line-items`, {
          method: 'POST',
          body: JSON.stringify({
            variant_id: variantId,
            quantity,
            metadata,
          }),
        })

        if (cart) {
          dispatch({ type: 'SET_CART', cart })
          dispatch({ type: 'OPEN_CART' })
        }
      } catch (error) {
        console.error('Error adding to cart:', error)
        throw error
      } finally {
        dispatch({ type: 'SET_LOADING', isLoading: false })
      }
    },
    [createNewCart, medusaFetch]
  )

  // Update line item quantity
  const updateQuantity = useCallback(
    async (lineId: string, quantity: number, metadata?: Record<string, any>) => {
      const cartId = localStorage.getItem(CART_ID_KEY)
      if (!cartId) return

      dispatch({ type: 'SET_UPDATING', isUpdating: true })

      try {
        const { cart } = await medusaFetch(`/carts/${cartId}/line-items/${lineId}`, {
          method: 'POST',
          body: JSON.stringify({
            quantity,
            metadata,
          }),
        })

        if (cart) {
          dispatch({ type: 'SET_CART', cart })
        }
      } catch (error) {
        console.error('Error updating cart:', error)
      } finally {
        dispatch({ type: 'SET_UPDATING', isUpdating: false })
      }
    },
    [medusaFetch]
  )

  // Remove from cart
  const removeFromCart = useCallback(
    async (lineId: string) => {
      const cartId = localStorage.getItem(CART_ID_KEY)
      if (!cartId) return

      dispatch({ type: 'SET_UPDATING', isUpdating: true })

      try {
        const { cart } = await medusaFetch(`/carts/${cartId}/line-items/${lineId}`, {
          method: 'DELETE',
        })

        if (cart) {
          dispatch({ type: 'SET_CART', cart })
        }
      } catch (error) {
        console.error('Error removing from cart:', error)
      } finally {
        dispatch({ type: 'SET_UPDATING', isUpdating: false })
      }
    },
    [medusaFetch]
  )

  // Clear entire cart
  const clearCart = useCallback(async () => {
    const cartId = localStorage.getItem(CART_ID_KEY)
    if (!cartId) return

    dispatch({ type: 'SET_UPDATING', isUpdating: true })

    try {
      // Remove all line items
      const cart = state.cart
      if (cart?.items?.length) {
        for (const item of cart.items) {
          await medusaFetch(`/carts/${cartId}/line-items/${item.id}`, {
            method: 'DELETE',
          })
        }
      }
      
      // Refresh cart
      const { cart: updatedCart } = await medusaFetch(`/carts/${cartId}`)
      if (updatedCart) {
        dispatch({ type: 'SET_CART', cart: updatedCart })
      }
    } catch (error) {
      console.error('Error clearing cart:', error)
    } finally {
      dispatch({ type: 'SET_UPDATING', isUpdating: false })
    }
  }, [medusaFetch, state.cart])

  // Set/change region
  const setRegion = useCallback(async (regionId: string) => {
    const cartId = localStorage.getItem(CART_ID_KEY)
    
    dispatch({ type: 'SET_LOADING', isLoading: true })

    try {
      if (cartId) {
        // Update existing cart region
        const { cart } = await medusaFetch(`/carts/${cartId}`, {
          method: 'POST',
          body: JSON.stringify({ region_id: regionId }),
        })
        
        if (cart) {
          dispatch({ type: 'SET_CART', cart })
        }
      }
      
      localStorage.setItem(REGION_ID_KEY, regionId)
    } catch (error) {
      console.error('Error setting region:', error)
    } finally {
      dispatch({ type: 'SET_LOADING', isLoading: false })
    }
  }, [medusaFetch])

  return (
    <CartContext.Provider
      value={{
        cart: state.cart,
        isLoading: state.isLoading,
        isOpen: state.isOpen,
        isUpdating: state.isUpdating,
        cartItems,
        totalQuantity,
        subtotal,
        total,
        openCart,
        closeCart,
        toggleCart,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
        setRegion,
      }}
    >
      {children}
    </CartContext.Provider>
  )
}