import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { Order } from '../types/order';

interface OrderState {
  orders: Order[];
  isLoading: boolean;
  error: string | null;

  setOrders: (orders: Order[]) => void;
  updateOrder: (id: number, updates: Partial<Order>) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useOrderStore = create<OrderState>()(
  devtools(
    (set) => ({
      // State
      orders: [],
      isLoading: false,
      error: null,

      // Actions
      setOrders: (orders) =>
        set({ orders }, false, 'orders/setOrders'),

      updateOrder: (id, updates) =>
        set(
          (state) => ({
            orders: state.orders.map((order) =>
              order.id === id ? { ...order, ...updates } : order
            ),
          }),
          false,
          'orders/updateOrder'
        ),

      setLoading: (loading) =>
        set({ isLoading: loading }, false, 'orders/setLoading'),

      setError: (error) =>
        set({ error }, false, 'orders/setError'),
    }),
    { name: 'OrderStore' }
  )
);
