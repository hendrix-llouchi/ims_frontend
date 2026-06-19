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
  products_count?: number;
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

// ── Manager worker types ──────────────────────────────────────────────────────
export interface ManagerWorker {
  id: number;
  name: string;
  age: number | null;
  phone_number: string | null;
  location: string | null;
  email: string;
  username: string;
  is_active: boolean;
}

// ── Purchase Order types ──────────────────────────────────────────────────────
export type PurchaseOrderStatus = 'pending' | 'complete' | 'incomplete';

export interface PurchaseOrderItem {
  id: number;
  purchase_order_id: number;
  product_id: number;
  quantity_ordered: number;
  quantity_received: number | null;
  product?: {
    id: number;
    name: string;
    unit?: string;
  } | null;
  created_at: string;
  updated_at: string;
}

export interface PurchaseOrder {
  id: number;
  manager_id: number;
  warehouse_id: number;
  supplier_name: string;
  expected_delivery_date: string;
  actual_arrival_date: string | null;
  status: PurchaseOrderStatus;
  warehouse?: {
    id: number;
    name: string;
  } | null;
  items: PurchaseOrderItem[];
  created_at: string;
  updated_at: string;
}

// ── Worker Flag types ─────────────────────────────────────────────────────────
export type WorkerFlagStatus = 'pending' | 'dismissed' | 'warning_issued';

export interface ManagerFlag {
  id: number;
  manager_id: number;
  worker_id: number;
  reason: string;
  status: WorkerFlagStatus;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
  worker: {
    id: number;
    name: string;
  };
  manager: {
    id: number;
    name: string;
  };
}
