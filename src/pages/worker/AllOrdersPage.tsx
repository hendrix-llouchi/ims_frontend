import { useCallback } from 'react';
import { fetchAllOrders } from '../../api/worker/workerApi';
import type { WorkerOrder } from '../../types/workerApi';
import { usePaginatedFetch } from '../../hooks/usePaginatedFetch';

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

// ─── Read-only order card ───────────────────────────────────────────────────────
function AllOrderCard({ order }: { order: WorkerOrder }) {
  const badgeStyles = {
    assigned: 'bg-blue-50 text-blue-700 border-blue-200',
    delivered: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    flagged: 'bg-rose-50 text-rose-700 border-rose-200',
    unassigned: 'bg-gray-50 text-gray-600 border-gray-200',
  };

  const badgeStyle = badgeStyles[order.status] || badgeStyles.unassigned;

  return (
    <article
      id={`all-order-card-${order.id}`}
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
        <div className="mb-4 bg-gray-50/70 rounded-xl p-4 border border-gray-100">
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

        {/* Assigned worker */}
        <div className="mb-5 bg-indigo-50/30 rounded-xl p-4 border border-indigo-50/80">
          <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest block mb-1.5">
            Assigned Worker
          </span>
          {order.worker_id !== null && order.worker ? (
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold uppercase">
                {order.worker.name.charAt(0)}
              </span>
              <span className="text-sm font-bold text-gray-900">
                {order.worker.name}
              </span>
            </div>
          ) : (
            <span className="text-sm font-medium text-gray-500 italic">
              Unassigned
            </span>
          )}
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
          <div className="bg-rose-50/50 border border-rose-100 rounded-xl p-3">
            <span className="text-[10px] font-bold text-rose-800 uppercase tracking-widest block mb-1">
              Flag Reason
            </span>
            <p className="text-xs text-rose-700 leading-relaxed font-medium">{order.flag_reason}</p>
          </div>
        )}
      </div>
    </article>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────────
export default function AllOrdersPage() {
  const fetcher = useCallback((page: number) => fetchAllOrders(page), []);

  const { data, page, setPage, totalPages, loading, error, reload } =
    usePaginatedFetch<WorkerOrder>(fetcher);

  return (
    <div className="space-y-6">
      {/* Heading Row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">All Orders</h1>
          <p className="text-sm text-gray-500 mt-1">
            View all shipments in the system.
          </p>
        </div>
        <button
          onClick={reload}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-xs hover:bg-gray-50 hover:text-gray-955 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all cursor-pointer"
        >
          <svg
            className={`h-4.5 w-4.5 text-gray-500 ${loading ? 'animate-spin' : ''}`}
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
      {loading ? (
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
                <div className="h-16 w-full bg-gray-200 rounded-xl"></div>
              </div>
              <div className="pt-2 space-y-2">
                <div className="h-16 w-full bg-gray-200 rounded-xl"></div>
              </div>
              <div className="pt-2 space-y-2">
                <div className="h-12 w-full bg-gray-200 rounded-xl"></div>
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
          <h3 className="text-base font-bold text-gray-955">Unable to load orders</h3>
          <p className="text-sm text-gray-600 mt-1 mb-5">{error}</p>
          <button
            onClick={reload}
            className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all cursor-pointer"
          >
            Try Again
          </button>
        </div>
      ) : data.length === 0 ? (
        // Empty State
        <div className="flex flex-col items-center justify-center py-16 px-4 border border-dashed border-gray-300 rounded-2xl text-center max-w-md mx-auto">
          <span className="flex items-center justify-center h-12 w-12 rounded-full bg-gray-100 text-gray-500 mb-4 text-xl">
            📋
          </span>
          <h3 className="text-base font-bold text-gray-955">No orders</h3>
          <p className="text-sm text-gray-500 mt-1">
            No orders in the system yet.
          </p>
        </div>
      ) : (
        // Populated State
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {data.map((order) => (
              <AllOrderCard key={order.id} order={order} />
            ))}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 pt-6">
              <button
                onClick={() => setPage((p) => p - 1)}
                disabled={page === 1}
                id="all-orders-prev"
                className="inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-xs font-semibold text-gray-700 shadow-xs hover:bg-gray-50 hover:text-gray-955 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
              >
                ← Prev
              </button>
              <span className="text-sm font-semibold text-gray-700">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={page === totalPages}
                id="all-orders-next"
                className="inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-xs font-semibold text-gray-700 shadow-xs hover:bg-gray-50 hover:text-gray-955 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

