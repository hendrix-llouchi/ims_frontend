import React, { useEffect, useState, useCallback } from 'react';
import { fetchOwnerOrders } from '../../api/owner/ownerApi';
import type { OwnerOrder } from '../../types/ownerApi';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateStr: string | null | undefined) {
  if (!dateStr) return 'N/A';
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

function getStatusBadgeClass(status: string) {
  switch (status.toLowerCase()) {
    case 'unassigned':
      return 'bg-gray-100 text-gray-700 ring-1 ring-inset ring-gray-600/20';
    case 'assigned':
      return 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-700/10';
    case 'delivered':
      return 'bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20';
    case 'flagged':
      return 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20';
    default:
      return 'bg-gray-100 text-gray-700 ring-1 ring-inset ring-gray-600/20';
  }
}

export default function OrdersOverviewPage() {
  const [orders, setOrders] = useState<OwnerOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters state
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Pagination state
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);

  // Detail Modal state
  const [selectedOrder, setSelectedOrder] = useState<OwnerOrder | null>(null);

  // Debounce search term to avoid spamming requests
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1); // Reset page on new search
    }, 400);

    return () => clearTimeout(handler);
  }, [search]);

  // Reset page when status filter changes
  const handleStatusFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(e.target.value);
    setPage(1);
  };

  // Load orders data
  const loadOrdersData = useCallback(
    async (targetPage = page) => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetchOwnerOrders({
          page: targetPage,
          search: debouncedSearch,
          status: statusFilter === 'all' ? undefined : statusFilter,
        });

        setOrders(res.data);
        setPage(res.current_page);
        setTotalPages(res.last_page);
        setTotalOrders(res.total);
      } catch (err: unknown) {
        const axiosError = err as { response?: { status?: number; data?: { message?: string } } };
        let errMsg = 'Something went wrong. Please try again.';

        if (!axiosError.response) {
          errMsg = 'Unable to connect. Check your connection and try again.';
        } else if (axiosError.response.status === 403) {
          errMsg = "You don't have permission to view this page.";
        } else if (axiosError.response.status === 401) {
          // Redirecting will happen automatically via router / context guard
          window.location.replace('/login');
          return;
        } else if (axiosError.response.status === 500) {
          errMsg = 'Something went wrong. Please try again.';
        } else if (axiosError.response.data?.message) {
          errMsg = axiosError.response.data.message;
        }
        setError(errMsg);
      } finally {
        setIsLoading(false);
      }
    },
    [debouncedSearch, statusFilter, page]
  );

  // Trigger data load when dependencies update
  useEffect(() => {
    loadOrdersData(page);
  }, [debouncedSearch, statusFilter]);

  // Renders skeleton loader
  const renderSkeletonRows = () => (
    <div className="border border-gray-200 rounded-2xl bg-white shadow-xs overflow-hidden">
      <div className="animate-pulse">
        <div className="bg-gray-50/50 border-b border-gray-100 h-12 w-full flex items-center px-6">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
        </div>
        {[1, 2, 3, 4, 5].map((n) => (
          <div
            key={n}
            className="border-b border-gray-100 h-16 w-full flex items-center px-6 gap-4"
          >
            <div className="h-4 bg-gray-200 rounded flex-1"></div>
            <div className="h-4 bg-gray-200 rounded w-28"></div>
            <div className="h-4 bg-gray-200 rounded w-48"></div>
            <div className="h-6 bg-gray-200 rounded-full w-20"></div>
            <div className="h-8 bg-gray-200 rounded-lg w-24"></div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Orders Overview</h1>
          <p className="text-sm text-gray-500 mt-1">
            Monitor and review customer orders, assigned delivery workers, and flag resolutions.
          </p>
        </div>
      </div>

      {/* Filter & Search section */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-4 rounded-2xl border border-gray-200 shadow-3xs">
        {/* Search Input */}
        <div className="relative w-full md:max-w-md">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400">
            🔍
          </span>
          <input
            type="text"
            placeholder="Search by recipient name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-gray-300 pl-10 pr-4 py-2.5 text-sm placeholder-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-all"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          )}
        </div>

        {/* Status Filter */}
        <div className="w-full md:w-56">
          <select
            value={statusFilter}
            onChange={handleStatusFilterChange}
            className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm text-gray-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-all bg-white"
          >
            <option value="all">All Statuses</option>
            <option value="unassigned">Unassigned</option>
            <option value="assigned">Assigned</option>
            <option value="delivered">Delivered</option>
            <option value="flagged">Flagged</option>
          </select>
        </div>
      </div>

      {/* Main Content Area */}
      {isLoading && orders.length === 0 ? (
        renderSkeletonRows()
      ) : error ? (
        /* Error state */
        <div className="border border-red-200 rounded-2xl p-8 bg-red-50 text-center">
          <span className="text-2xl mb-2 block">⚠️</span>
          <h3 className="text-base font-bold text-red-900">Failed to load orders</h3>
          <p className="text-sm text-red-700 mt-1 mb-4">{error}</p>
          <button
            onClick={() => loadOrdersData(page)}
            className="inline-flex items-center justify-center rounded-xl bg-white border border-red-200 px-4 py-2.5 text-xs font-bold text-red-700 hover:bg-red-100 transition-all cursor-pointer shadow-3xs"
          >
            Retry
          </button>
        </div>
      ) : orders.length === 0 ? (
        /* Empty state */
        <div className="border border-dashed border-gray-300 rounded-2xl p-12 flex flex-col items-center justify-center text-center bg-white shadow-3xs">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 text-lg mb-4">
            📦
          </span>
          <h3 className="text-base font-bold text-gray-900">No orders found</h3>
          <p className="text-sm text-gray-500 mt-1 max-w-sm">
            Try adjusting your search criteria or selecting a different status filter.
          </p>
        </div>
      ) : (
        /* Table loaded state */
        <div className="space-y-4">
          <div className="border border-gray-200 rounded-2xl bg-white shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="bg-gray-50/50 border-b border-gray-100">
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      Recipient Name
                    </th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      Created By
                    </th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      Assigned Worker
                    </th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      Delivery Deadline
                    </th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      Status
                    </th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      Created At
                    </th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {orders.map((order) => (
                    <tr
                      key={order.id}
                      className="hover:bg-gray-50/40 transition-colors"
                    >
                      {/* Recipient Name */}
                      <td className="px-6 py-4">
                        <div className="text-sm font-bold text-gray-900">{order.recipient_name}</div>
                      </td>

                      {/* Created By (Manager Name) */}
                      <td className="px-6 py-4">
                        <div className="text-sm font-semibold text-gray-700">
                          {order.manager?.name || 'Unknown'}
                        </div>
                      </td>

                      {/* Assigned Worker */}
                      <td className="px-6 py-4">
                        <div className="text-sm font-semibold text-gray-700">
                          {order.worker?.name || <span className="text-gray-400 italic">Unassigned</span>}
                        </div>
                      </td>

                      {/* Delivery Deadline */}
                      <td className="px-6 py-4 text-sm text-gray-650">
                        {formatDate(order.delivery_deadline)}
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-wide ${getStatusBadgeClass(order.status)}`}>
                          {order.status}
                        </span>
                      </td>

                      {/* Created At */}
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {formatDate(order.created_at)}
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => setSelectedOrder(order)}
                          className="inline-flex items-center justify-center rounded-xl bg-white border border-gray-200 px-3.5 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all cursor-pointer shadow-3xs"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination Controls */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-gray-100 pt-4 px-1">
            <span className="text-xs font-semibold text-gray-500">
              Showing {orders.length} of {totalOrders} orders
            </span>
            <div className="flex items-center gap-3">
              <button
                onClick={() => loadOrdersData(page - 1)}
                disabled={page <= 1 || isLoading}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-xs"
              >
                Previous
              </button>
              <span className="text-xs font-semibold text-gray-600">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => loadOrdersData(page + 1)}
                disabled={page >= totalPages || isLoading}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-xs"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-[fadeIn_0.2s_ease-out]">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 max-w-xl w-full overflow-hidden p-6 animate-[scaleIn_0.2s_ease-out]">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
              <h3 className="text-lg font-bold text-gray-900">Order Details</h3>
              <button
                onClick={() => setSelectedOrder(null)}
                className="text-gray-400 hover:text-gray-600 text-lg cursor-pointer transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
              {/* Recipient Details & Status Badge */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                <div>
                  <h4 className="text-sm font-bold text-gray-900">{selectedOrder.recipient_name}</h4>
                  <span className="text-xs text-gray-500 font-medium">{selectedOrder.recipient_contact}</span>
                </div>
                <div>
                  <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-wide ${getStatusBadgeClass(selectedOrder.status)}`}>
                    {selectedOrder.status}
                  </span>
                </div>
              </div>

              {/* Flagged Reason Alert Box */}
              {selectedOrder.status.toLowerCase() === 'flagged' && selectedOrder.flag_reason && (
                <div className="p-3.5 bg-red-55 border border-red-100 rounded-xl text-xs text-red-750">
                  <span className="font-extrabold block text-red-800 mb-1">⚠️ FLAG REASON:</span>
                  <p className="leading-relaxed font-semibold">{selectedOrder.flag_reason}</p>
                </div>
              )}

              {/* Order Metadata Grid */}
              <div className="grid grid-cols-2 gap-4 text-xs pt-1">
                <div>
                  <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    Created By (Manager)
                  </span>
                  <span className="font-semibold text-gray-850 mt-1 block">
                    {selectedOrder.manager?.name || 'Unknown'}
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    Assigned Worker
                  </span>
                  <span className="font-semibold text-gray-850 mt-1 block">
                    {selectedOrder.worker?.name || <span className="text-gray-400 italic">Unassigned</span>}
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    Delivery Deadline
                  </span>
                  <span className="font-semibold text-gray-850 mt-1 block">
                    {formatDate(selectedOrder.delivery_deadline)}
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    Order Created At
                  </span>
                  <span className="font-semibold text-gray-855 mt-1 block">
                    {formatDate(selectedOrder.created_at)}
                  </span>
                </div>
              </div>

              {/* Line Items Section */}
              {selectedOrder.items && selectedOrder.items.length > 0 && (
                <div className="pt-2">
                  <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">
                    Order Line Items
                  </span>
                  <div className="border border-gray-150 rounded-xl overflow-hidden bg-white">
                    <table className="w-full border-collapse text-left text-xs">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-150">
                          <th className="px-4 py-2 font-bold text-gray-500 uppercase tracking-wider">Product Name</th>
                          <th className="px-4 py-2 font-bold text-gray-500 uppercase tracking-wider text-right">Quantity</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {selectedOrder.items.map((item) => (
                          <tr key={item.id} className="hover:bg-gray-50/20">
                            <td className="px-4 py-2 font-semibold text-gray-800">
                              {item.product?.name || `Product ID: ${item.product_id}`}
                            </td>
                            <td className="px-4 py-2 font-bold text-gray-700 text-right">
                              {item.quantity}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end pt-4 mt-4 border-t border-gray-100">
              <button
                onClick={() => setSelectedOrder(null)}
                className="rounded-xl border border-gray-200 bg-white px-5 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-all cursor-pointer shadow-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
