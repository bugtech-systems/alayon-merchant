"use client";

import { createContext, useContext } from "react";

export interface PosContextType {
  cartItemCount: number;
  openCart: () => void;
  closeCart: () => void;
  isCartOpen: boolean;
}

export const PosContext = createContext<PosContextType>({
  cartItemCount: 0,
  openCart: () => {},
  closeCart: () => {},
  isCartOpen: false,
});

export const usePosContext = () => useContext(PosContext);