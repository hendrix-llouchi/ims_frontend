import axiosInstance from '../axios';
import type {
  Paginated,
  WorkerOrder,
  WorkerProduct,
  ManagerWorker,
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
