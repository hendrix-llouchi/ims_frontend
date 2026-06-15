import axiosInstance from '../axios';
import type {
  Paginated,
  WorkerOrder,
  WorkerProduct,
} from '../../types/workerApi';

// ── Orders ────────────────────────────────────────────────────────────────────

/** GET /api/worker/orders/assigned — the authenticated worker's own orders */
export async function fetchAssignedOrders(
  page = 1,
): Promise<Paginated<WorkerOrder>> {
  const res = await axiosInstance.get<Paginated<WorkerOrder>>(
    '/api/worker/orders/assigned',
    { params: { page } },
  );
  return res.data;
}

/** GET /api/worker/orders — read-only view of ALL orders in the system */
export async function fetchAllOrders(
  page = 1,
): Promise<Paginated<WorkerOrder>> {
  const res = await axiosInstance.get<Paginated<WorkerOrder>>(
    '/api/worker/orders',
    { params: { page } },
  );
  return res.data;
}

/** PATCH /api/worker/orders/{id}/deliver */
export async function deliverOrder(id: number): Promise<{ message: string; order: WorkerOrder }> {
  const res = await axiosInstance.patch<{ message: string; order: WorkerOrder }>(
    `/api/worker/orders/${id}/deliver`,
  );
  return res.data;
}

/** PATCH /api/worker/orders/{id}/flag */
export async function flagOrder(
  id: number,
  flagReason: string,
): Promise<{ message: string; order: WorkerOrder }> {
  const res = await axiosInstance.patch<{ message: string; order: WorkerOrder }>(
    `/api/worker/orders/${id}/flag`,
    { flag_reason: flagReason },
  );
  return res.data;
}

// ── Stock ─────────────────────────────────────────────────────────────────────

/** GET /api/worker/stock — read-only stock levels */
export async function fetchStock(page = 1): Promise<Paginated<WorkerProduct>> {
  const res = await axiosInstance.get<Paginated<WorkerProduct>>(
    '/api/worker/stock',
    { params: { page } },
  );
  return res.data;
}
