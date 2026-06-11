import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { Product } from '../types/product';

interface StockState {
  products: Product[];
  lowStockProducts: Product[];
  isLoading: boolean;
  error: string | null;

  setProducts: (products: Product[]) => void;
  setLowStockProducts: (products: Product[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useStockStore = create<StockState>()(
  devtools(
    (set) => ({
      // State
      products: [],
      lowStockProducts: [],
      isLoading: false,
      error: null,

      // Actions
      setProducts: (products) =>
        set({ products }, false, 'stock/setProducts'),

      setLowStockProducts: (products) =>
        set({ lowStockProducts: products }, false, 'stock/setLowStockProducts'),

      setLoading: (loading) =>
        set({ isLoading: loading }, false, 'stock/setLoading'),

      setError: (error) =>
        set({ error }, false, 'stock/setError'),
    }),
    { name: 'StockStore' }
  )
);
