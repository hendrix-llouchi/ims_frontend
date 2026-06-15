import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { WorkerProduct } from '../types/workerApi';

interface StockState {
  products: WorkerProduct[];
  lowStockProducts: WorkerProduct[];
  isLoading: boolean;
  error: string | null;

  setProducts: (products: WorkerProduct[]) => void;
  setLowStockProducts: (products: WorkerProduct[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  updateProduct: (updatedProduct: WorkerProduct) => void;
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

      updateProduct: (updatedProduct) =>
        set(
          (state) => {
            const isLow =
              updatedProduct.max_stock_level > 0 &&
              updatedProduct.current_stock <= updatedProduct.max_stock_level * 0.3;

            const mergeItem = (p: WorkerProduct) => ({
              ...p,
              ...updatedProduct,
              warehouse: updatedProduct.warehouse || p.warehouse,
            });

            return {
              products: state.products.map((p) =>
                p.id === updatedProduct.id ? mergeItem(p) : p
              ),
              lowStockProducts: isLow
                ? state.lowStockProducts.some((p) => p.id === updatedProduct.id)
                  ? state.lowStockProducts.map((p) =>
                      p.id === updatedProduct.id ? mergeItem(p) : p
                    )
                  : (() => {
                      const existing = state.products.find((p) => p.id === updatedProduct.id);
                      return [...state.lowStockProducts, existing ? mergeItem(existing) : updatedProduct];
                    })()
                : state.lowStockProducts.filter((p) => p.id !== updatedProduct.id),
            };
          },
          false,
          'stock/updateProduct'
        ),
    }),
    { name: 'StockStore' }
  )
);

