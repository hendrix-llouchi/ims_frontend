// ── Paginated wrapper returned by all list endpoints ──────────────────────────
export interface Paginated<T> {
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

// ── Order types ───────────────────────────────────────────────────────────────
export type OrderStatus =
  | 'unassigned'
  | 'assigned'
  | 'delivered'
  | 'flagged';

export interface OrderItemProduct {
  name: string;
  unit: string;
}

export interface WorkerOrderItem {
  id: number;
  product_id: number;
  quantity: number;
  product: OrderItemProduct;
}

export interface WorkerOrderWorker {
  id: number;
  name: string;
}

export interface WorkerOrder {
  id: number;
  recipient_name: string;
  recipient_contact: string;
  delivery_deadline: string;
  status: OrderStatus;
  flag_reason: string | null;
  worker_id: number | null;
  worker?: WorkerOrderWorker | null;
  items: WorkerOrderItem[];
  created_at: string;
  updated_at: string;
}

// ── Stock / Product types ─────────────────────────────────────────────────────
export interface WorkerProductWarehouse {
  id: number;
  name: string;
  location: string;
}

export interface WorkerProduct {
  id: number;
  name: string;
  type: string;
  description: string | null;
  unit: string;
  current_stock: number;
  max_stock_level: number;
  warehouse: WorkerProductWarehouse;
  created_at: string;
  updated_at: string;
}
