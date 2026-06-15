import { useEffect, useState, useCallback } from 'react';
import axiosInstance from '../../api/axios';
import { useOrderStore } from '../../store/orderStore';
import { useNotificationStore } from '../../store/notificationStore';
import type { WorkerOrder } from '../../types/workerApi';

// ─── Flag modal ─────────────────────────────────────────────────────────────────
interface FlagModalProps {
  orderId: number;
  onClose: () => void;
  onSuccess: (reason: string) => void;
}

function FlagModal({ orderId, onClose, onSuccess }: FlagModalProps) {
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = reason.trim();
    if (!trimmed) {
      setError('Please enter a reason.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await axiosInstance.patch(`/api/worker/orders/${orderId}/flag`, {
        flag_reason: trimmed,
      });
      onSuccess(trimmed);
    } catch (err: any) {
      setError(
        err?.response?.data?.message || 'Failed to flag order. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-[fadeIn_0.2s_ease-out]">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 max-w-md w-full overflow-hidden p-6 animate-[scaleIn_0.2s_ease-out]">
        <h3 className="text-lg font-bold text-gray-900 mb-1">Flag Order #{orderId}</h3>
        <p className="text-sm text-gray-500 mb-4">
          Provide a reason for flagging this order. This alerts management immediately.
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <textarea
              id={`flag-reason-${orderId}`}
              rows={4}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Broken packaging, address is incorrect, recipient not home..."
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm placeholder-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-all resize-none"
              disabled={isSubmitting}
              autoFocus
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-200 transition-all disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              id={`submit-flag-${orderId}`}
              disabled={isSubmitting || !reason.trim()}
              className="rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Flagging...' : 'Flag Order'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Order card ─────────────────────────────────────────────────────────────────
interface OrderCardProps {
  order: WorkerOrder;
  onDeliver: (id: number) => void;
  onFlag: (id: number) => void;
  isDelivering: boolean;
}

function formatDate(dateStr: string) {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function OrderCard({ order, onDeliver, onFlag, isDelivering }: OrderCardProps) {
  const isAssigned = order.status === 'assigned';

  const badgeStyles = {
    assigned: 'bg-blue-50 text-blue-700 border-blue-200',
    delivered: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    flagged: 'bg-rose-50 text-rose-700 border-rose-200',
    unassigned: 'bg-gray-50 text-gray-600 border-gray-200',
  };

  const badgeStyle = badgeStyles[order.status] || badgeStyles.unassigned;

  return (
    <article
      id={`order-card-${order.id}`}
      className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs hover:shadow-md transition-all duration-300 flex flex-col justify-between"
    >
      <div>
        {/* Header */}
        <div className="flex justify-between items-start gap-4 mb-4">
          <div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">
              Reference
            </span>
            <span className="text-lg font-extrabold text-gray-900 mt-0.5 block">
              Order #{order.id}
            </span>
          </div>
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${badgeStyle} capitalize`}
          >
            {order.status}
          </span>
        </div>

        {/* Due Date */}
        <div className="mb-4">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">
            Deliver By
          </span>
          <span className="text-sm font-semibold text-gray-800">
            Due {formatDate(order.delivery_deadline)}
          </span>
        </div>

        {/* Recipient details */}
        <div className="mb-5 bg-gray-50/70 rounded-xl p-4 border border-gray-100">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5">
            Recipient
          </span>
          <span className="text-sm font-bold text-gray-900 block">
            {order.recipient_name}
          </span>
          <span className="text-xs text-gray-500 block mt-1">
            {order.recipient_contact}
          </span>
        </div>

        {/* Product Items */}
        <div className="mb-5">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">
            Items
          </span>
          <ul className="divide-y divide-gray-100 border-t border-b border-gray-100 py-1">
            {order.items && order.items.length > 0 ? (
              order.items.map((item) => (
                <li key={item.id} className="flex justify-between py-2 text-xs font-medium">
                  <span className="text-gray-800">{item.product?.name || 'Unknown Item'}</span>
                  <span className="text-gray-500 shrink-0">
                    {item.quantity} {item.product?.unit || 'qty'}
                  </span>
                </li>
              ))
            ) : (
              <li className="text-xs text-gray-400 py-2 italic text-center">
                No items in this order
              </li>
            )}
          </ul>
        </div>

        {/* Flag Reason if flagged */}
        {order.status === 'flagged' && order.flag_reason && (
          <div className="mb-5 bg-rose-50/50 border border-rose-100 rounded-xl p-3">
            <span className="text-[10px] font-bold text-rose-800 uppercase tracking-widest block mb-1">
              Flag Reason
            </span>
            <p className="text-xs text-rose-700 leading-relaxed font-medium">{order.flag_reason}</p>
          </div>
        )}
      </div>

      {/* Actions */}
      {isAssigned && (
        <div className="grid grid-cols-2 gap-3 mt-auto pt-4 border-t border-gray-100">
          <button
            onClick={() => onDeliver(order.id)}
            disabled={isDelivering}
            id={`deliver-order-${order.id}`}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-indigo-500 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isDelivering ? (
              <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : null}
            Mark as Delivered
          </button>
          <button
            onClick={() => onFlag(order.id)}
            disabled={isDelivering}
            id={`flag-order-${order.id}`}
            className="inline-flex items-center justify-center rounded-xl border border-rose-200 bg-white px-4 py-2.5 text-xs font-bold text-rose-600 shadow-xs hover:bg-rose-50 hover:text-rose-700 transition-all cursor-pointer disabled:opacity-50"
          >
            Flag Order
          </button>
        </div>
      )}
    </article>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────────
export default function WorkerDashboard() {
  const {
    orders,
    isLoading,
    error,
    setOrders,
    updateOrder,
    setLoading,
    setError,
  } = useOrderStore();

  const { addNotification } = useNotificationStore();

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [deliveringId, setDeliveringId] = useState<number | null>(null);
  const [selectedFlagOrderId, setSelectedFlagOrderId] = useState<number | null>(null);

  const fetchOrders = useCallback(
    async (targetPage = page) => {
      setLoading(true);
      setError(null);
      try {
        const response = await axiosInstance.get('/api/worker/orders/assigned', {
          params: { page: targetPage },
        });

        const resData = response.data;
        if (resData && Array.isArray(resData.data)) {
          setOrders(resData.data);
          setPage(resData.current_page);
          setTotalPages(resData.last_page);
        } else {
          setOrders(Array.isArray(resData) ? resData : []);
          setPage(1);
          setTotalPages(1);
        }
      } catch (err: any) {
        const errMsg =
          err?.response?.data?.message || 'Failed to load assigned orders. Please try again.';
        setError(errMsg);
      } finally {
        setLoading(false);
      }
    },
    [page, setLoading, setError, setOrders]
  );

  useEffect(() => {
    fetchOrders(1);
  }, []);

  const handleDeliver = async (id: number) => {
    setDeliveringId(id);
    try {
      await axiosInstance.patch(`/api/worker/orders/${id}/deliver`);
      updateOrder(id, { status: 'delivered' });
      addNotification({
        id: Math.random().toString(),
        message: `Order #${id} has been marked as delivered.`,
        type: 'success',
        createdAt: new Date(),
      });
    } catch (err: any) {
      const errMsg =
        err?.response?.data?.message || `Failed to deliver order #${id}. Please try again.`;
      addNotification({
        id: Math.random().toString(),
        message: errMsg,
        type: 'error',
        createdAt: new Date(),
      });
    } finally {
      setDeliveringId(null);
    }
  };

  const handleFlagSuccess = (reason: string) => {
    if (selectedFlagOrderId === null) return;
    const id = selectedFlagOrderId;
    updateOrder(id, { status: 'flagged', flag_reason: reason });
    setSelectedFlagOrderId(null);
    addNotification({
      id: Math.random().toString(),
      message: `Order #${id} has been flagged.`,
      type: 'success',
      createdAt: new Date(),
    });
  };

  return (
    <div className="space-y-6">
      {/* Heading Row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">My Orders</h1>
          <p className="text-sm text-gray-500 mt-1">
            View and manage shipments currently assigned to you.
          </p>
        </div>
        <button
          onClick={() => fetchOrders(page)}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-xs hover:bg-gray-50 hover:text-gray-950 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all cursor-pointer"
        >
          <svg
            className={`h-4.5 w-4.5 text-gray-500 ${isLoading ? 'animate-spin' : ''}`}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
            />
          </svg>
          Refresh
        </button>
      </div>

      {/* States */}
      {isLoading ? (
        // Loading State: Skeleton Cards
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="animate-pulse border border-gray-200 rounded-2xl p-6 bg-white space-y-4 shadow-xs"
            >
              <div className="flex justify-between items-center">
                <div className="h-6 w-20 bg-gray-200 rounded-lg"></div>
                <div className="h-6 w-16 bg-gray-200 rounded-full"></div>
              </div>
              <div className="space-y-2">
                <div className="h-3 w-28 bg-gray-200 rounded"></div>
                <div className="h-4 w-40 bg-gray-200 rounded-lg"></div>
              </div>
              <div className="pt-2 space-y-2">
                <div className="h-10 w-full bg-gray-250 rounded-xl"></div>
              </div>
              <div className="border-t border-gray-100 pt-4 flex gap-3">
                <div className="h-9 w-1/2 bg-gray-200 rounded-lg"></div>
                <div className="h-9 w-1/2 bg-gray-200 rounded-lg"></div>
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        // Error State
        <div className="flex flex-col items-center justify-center p-8 border border-red-100 bg-red-50/50 rounded-2xl text-center max-w-lg mx-auto">
          <span className="flex items-center justify-center h-12 w-12 rounded-full bg-red-100 text-red-600 mb-4 font-bold text-xl">
            !
          </span>
          <h3 className="text-base font-bold text-gray-950">Unable to load orders</h3>
          <p className="text-sm text-gray-600 mt-1 mb-5">{error}</p>
          <button
            onClick={() => fetchOrders(1)}
            className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all cursor-pointer"
          >
            Try Again
          </button>
        </div>
      ) : orders.length === 0 ? (
        // Empty State
        <div className="flex flex-col items-center justify-center py-16 px-4 border border-dashed border-gray-300 rounded-2xl text-center max-w-md mx-auto">
          <span className="flex items-center justify-center h-12 w-12 rounded-full bg-gray-100 text-gray-500 mb-4 text-xl">
            📋
          </span>
          <h3 className="text-base font-bold text-gray-950">No orders assigned</h3>
          <p className="text-sm text-gray-500 mt-1">
            No orders assigned to you yet.
          </p>
        </div>
      ) : (
        // Populated State
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {orders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                onDeliver={handleDeliver}
                onFlag={setSelectedFlagOrderId}
                isDelivering={deliveringId === order.id}
              />
            ))}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 pt-6">
              <button
                onClick={() => fetchOrders(page - 1)}
                disabled={page === 1}
                id="my-orders-prev"
                className="inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-xs font-semibold text-gray-700 shadow-xs hover:bg-gray-50 hover:text-gray-950 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
              >
                ← Prev
              </button>
              <span className="text-sm font-semibold text-gray-700">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => fetchOrders(page + 1)}
                disabled={page === totalPages}
                id="my-orders-next"
                className="inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-xs font-semibold text-gray-700 shadow-xs hover:bg-gray-50 hover:text-gray-950 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}

      {/* Flag Modal */}
      {selectedFlagOrderId !== null && (
        <FlagModal
          orderId={selectedFlagOrderId}
          onClose={() => setSelectedFlagOrderId(null)}
          onSuccess={handleFlagSuccess}
        />
      )}
    </div>
  );
}
