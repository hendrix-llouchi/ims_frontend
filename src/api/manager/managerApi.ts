import axiosInstance from '../axios';
import type {
  Paginated,
  WorkerOrder,
  WorkerProduct,
  ManagerWorker,
  PurchaseOrder,
  WorkerProductWarehouse,
  ManagerFlag,
} from '../../types/workerApi';

// ── Orders ────────────────────────────────────────────────────────────────────

/** GET /api/manager/orders — paginated system-wide orders */
export async function fetchManagerOrders(
  page = 1,
): Promise<Paginated<WorkerOrder>> {
  const res = await axiosInstance.get<Paginated<WorkerOrder>>(
    '/api/manager/orders',
    { params: { page } },
  );
  return res.data;
}

/** POST /api/manager/orders — create a new delivery order */
export async function createOrder(data: {
  recipient_name: string;
  recipient_contact: string;
  delivery_deadline: string;
  items: Array<{ product_id: number; quantity: number }>;
}): Promise<{ message: string; order: WorkerOrder }> {
  const res = await axiosInstance.post<{ message: string; order: WorkerOrder }>(
    '/api/manager/orders',
    data,
  );
  return res.data;
}

/** PATCH /api/manager/orders/{id}/assign — assign a worker */
export async function assignOrder(
  id: number,
  workerId: number,
): Promise<{ message: string; order: WorkerOrder }> {
  const res = await axiosInstance.patch<{ message: string; order: WorkerOrder }>(
    `/api/manager/orders/${id}/assign`,
    { worker_id: workerId },
  );
  return res.data;
}

/** PATCH /api/manager/orders/{id}/flag — flag an order */
export async function flagOrder(
  id: number,
  flagReason: string,
): Promise<{ message: string; order: WorkerOrder }> {
  const res = await axiosInstance.patch<{ message: string; order: WorkerOrder }>(
    `/api/manager/orders/${id}/flag`,
    { flag_reason: flagReason },
  );
  return res.data;
}

/** PATCH /api/manager/orders/{id}/resolve — resolve a flagged order */
export async function resolveOrder(
  id: number,
): Promise<{ message: string; order: WorkerOrder }> {
  const res = await axiosInstance.patch<{ message: string; order: WorkerOrder }>(
    `/api/manager/orders/${id}/resolve`,
  );
  return res.data;
}

// ── Workers ───────────────────────────────────────────────────────────────────

export interface WorkerStatus {
  id: number;
  name: string;
  status: 'Available' | 'Busy';
}

/** GET /api/manager/workers/status — fetch real-time worker availability */
export async function fetchWorkersStatus(): Promise<{ workers: WorkerStatus[] }> {
  const res = await axiosInstance.get<{ workers: WorkerStatus[] }>(
    '/api/manager/workers/status',
  );
  return res.data;
}

/** GET /api/manager/users — paginated list of all workers */
export async function fetchManagerWorkers(
  page = 1,
): Promise<Paginated<ManagerWorker>> {
  const res = await axiosInstance.get<Paginated<ManagerWorker>>(
    '/api/manager/users',
    { params: { page } },
  );
  return res.data;
}

/** POST /api/manager/flags — flag a worker */
export async function flagWorker(
  workerId: number,
  reason: string,
): Promise<{ message: string; flag: any }> {
  const res = await axiosInstance.post<{ message: string; flag: any }>(
    '/api/manager/flags',
    { worker_id: workerId, reason },
  );
  return res.data;
}

/** GET /api/manager/flags — paginated list of all flags raised by this manager */
export async function fetchManagerFlags(
  page = 1,
): Promise<Paginated<ManagerFlag>> {
  const res = await axiosInstance.get<Paginated<ManagerFlag>>(
    '/api/manager/flags',
    { params: { page } },
  );
  return res.data;
}

// ── Products ──────────────────────────────────────────────────────────────────

/** GET /api/manager/products — paginated products list */
export async function fetchProducts(
  page = 1,
): Promise<Paginated<WorkerProduct>> {
  const res = await axiosInstance.get<Paginated<WorkerProduct>>(
    '/api/manager/products',
    { params: { page } },
  );
  return res.data;
}

// ── Stock ─────────────────────────────────────────────────────────────────────

/** GET /api/manager/stock — paginated stock list */
export async function fetchManagerStock(
  page = 1,
): Promise<Paginated<WorkerProduct>> {
  const res = await axiosInstance.get<Paginated<WorkerProduct>>(
    '/api/manager/stock',
    { params: { page } },
  );
  return res.data;
}

/** PATCH /api/manager/stock/{id} — update stock level */
export async function updateStockLevel(
  id: number,
  currentStock: number,
): Promise<{ message: string; product: WorkerProduct }> {
  const res = await axiosInstance.patch<{ message: string; product: WorkerProduct }>(
    `/api/manager/stock/${id}`,
    { current_stock: currentStock },
  );
  return res.data;
}

/** GET /api/manager/stock/low — products at or below 30% threshold */
export async function fetchLowStockProducts(): Promise<{
  low_stock_products: WorkerProduct[];
}> {
  const res = await axiosInstance.get<{ low_stock_products: WorkerProduct[] }>(
    '/api/manager/stock/low',
  );
  return res.data;
}

// ── Purchase Orders ───────────────────────────────────────────────────────────

export interface CreatePurchaseOrderData {
  supplier_name: string;
  warehouse_id: number;
  expected_delivery_date: string;
  items: Array<{
    product_id: number;
    quantity_ordered: number;
  }>;
}

export interface ReceivePurchaseOrderData {
  status: 'complete' | 'incomplete';
  actual_arrival_date: string;
  items: Array<{
    purchase_order_item_id: number;
    quantity_received: number;
  }>;
}

/** GET /api/manager/purchase-orders — paginated purchase orders list */
export async function fetchPurchaseOrders(
  page = 1,
): Promise<Paginated<PurchaseOrder>> {
  const res = await axiosInstance.get<Paginated<PurchaseOrder>>(
    '/api/manager/purchase-orders',
    { params: { page } },
  );
  return res.data;
}

/** POST /api/manager/purchase-orders — create new purchase order */
export async function createPurchaseOrder(
  data: CreatePurchaseOrderData,
): Promise<{ message: string; purchase_order: PurchaseOrder }> {
  const res = await axiosInstance.post<{ message: string; purchase_order: PurchaseOrder }>(
    '/api/manager/purchase-orders',
    data,
  );
  return res.data;
}

/** GET /api/manager/purchase-orders/{id} — get details of a single purchase order */
export async function fetchPurchaseOrderDetails(
  id: number,
): Promise<{ purchase_order: PurchaseOrder }> {
  const res = await axiosInstance.get<{ purchase_order: PurchaseOrder }>(
    `/api/manager/purchase-orders/${id}`,
  );
  return res.data;
}

/** PATCH /api/manager/purchase-orders/{id}/status — log received stock */
export async function receivePurchaseOrder(
  id: number,
  data: ReceivePurchaseOrderData,
): Promise<{ message: string; purchase_order: PurchaseOrder }> {
  const res = await axiosInstance.patch<{ message: string; purchase_order: PurchaseOrder }>(
    `/api/manager/purchase-orders/${id}/status`,
    data,
  );
  return res.data;
}

// ── Shared Endpoints ──────────────────────────────────────────────────────────

/** GET /api/shared/warehouses — paginated list of warehouses */
export async function fetchSharedWarehouses(
  page = 1,
): Promise<Paginated<WorkerProductWarehouse>> {
  const res = await axiosInstance.get<Paginated<WorkerProductWarehouse>>(
    '/api/shared/warehouses',
    { params: { page } },
  );
  return res.data;
}

/** GET /api/shared/products — paginated list of products */
export async function fetchSharedProducts(
  page = 1,
): Promise<Paginated<WorkerProduct>> {
  const res = await axiosInstance.get<Paginated<WorkerProduct>>(
    '/api/shared/products',
    { params: { page } },
  );
  return res.data;
}


