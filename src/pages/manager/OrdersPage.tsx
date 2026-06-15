import { useEffect, useState, useCallback } from 'react';
import { useOrderStore } from '../../store/orderStore';
import { useNotificationStore } from '../../store/notificationStore';
import {
  fetchManagerOrders,
  createOrder,
  assignOrder,
  flagOrder,
  resolveOrder,
  fetchWorkersStatus,
  fetchProducts,
  type WorkerStatus,
} from '../../api/manager/managerApi';
import type { WorkerProduct } from '../../types/workerApi';

// ─── Helper: Format Date ────────────────────────────────────────────────────────
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

export default function OrdersPage() {
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

  // Local Pagination State
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Modals & Active Actions State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [assigningOrderId, setAssigningOrderId] = useState<number | null>(null);
  const [flaggingOrderId, setFlaggingOrderId] = useState<number | null>(null);
  const [resolvingOrderId, setResolvingOrderId] = useState<number | null>(null);

  // Workers Availability State
  const [workers, setWorkers] = useState<WorkerStatus[]>([]);
  const [loadingWorkers, setLoadingWorkers] = useState(false);
  const [selectedWorkerId, setSelectedWorkerId] = useState<number | null>(null);

  // Products State (for Create Order Form)
  const [products, setProducts] = useState<WorkerProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);

  // Form State: Create Order
  const [recipientName, setRecipientName] = useState('');
  const [recipientContact, setRecipientContact] = useState('');
  const [deliveryDeadline, setDeliveryDeadline] = useState('');
  const [formItems, setFormItems] = useState<Array<{ product_id: number; quantity: number }>>([
    { product_id: 0, quantity: 1 },
  ]);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [createOrderError, setCreateOrderError] = useState<string | null>(null);

  // Form State: Flag Reason
  const [flagReason, setFlagReason] = useState('');
  const [isSubmittingFlag, setIsSubmittingFlag] = useState(false);
  const [flagError, setFlagError] = useState<string | null>(null);

  // Submitting States for Assign & Resolve
  const [isAssigning, setIsAssigning] = useState(false);
  const [isResolving, setIsResolving] = useState(false);

  // ─── Fetch Orders ─────────────────────────────────────────────────────────────
  const fetchOrders = useCallback(
    async (targetPage = page) => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetchManagerOrders(targetPage);
        setOrders(response.data);
        setPage(response.current_page);
        setTotalPages(response.last_page);
      } catch (err: any) {
        const errMsg =
          err?.response?.data?.message || 'Failed to load orders. Please try again.';
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

  // ─── Fetch Products for Create Order ──────────────────────────────────────────
  const loadAllProducts = async () => {
    setLoadingProducts(true);
    try {
      let allProducts: WorkerProduct[] = [];
      let currentPage = 1;
      let hasMore = true;
      while (hasMore) {
        const res = await fetchProducts(currentPage);
        allProducts = [...allProducts, ...res.data];
        if (res.current_page >= res.last_page) {
          hasMore = false;
        } else {
          currentPage++;
        }
      }
      setProducts(allProducts);
      // Set default product_id for initial item if products exist
      if (allProducts.length > 0) {
        setFormItems([{ product_id: allProducts[0].id, quantity: 1 }]);
      }
    } catch (err) {
      console.error('Failed to load products', err);
    } finally {
      setLoadingProducts(false);
    }
  };

  useEffect(() => {
    if (isCreateModalOpen) {
      loadAllProducts();
    }
  }, [isCreateModalOpen]);

  // ─── Fetch Workers for Assignment ─────────────────────────────────────────────
  const loadWorkers = async () => {
    setLoadingWorkers(true);
    setSelectedWorkerId(null);
    try {
      const res = await fetchWorkersStatus();
      setWorkers(res.workers);
    } catch (err) {
      console.error('Failed to load workers status', err);
    } finally {
      setLoadingWorkers(false);
    }
  };

  useEffect(() => {
    if (assigningOrderId !== null) {
      loadWorkers();
    }
  }, [assigningOrderId]);

  // ─── Create Order Actions ─────────────────────────────────────────────────────
  const handleAddItem = () => {
    const defaultProductId = products[0]?.id || 0;
    setFormItems([...formItems, { product_id: defaultProductId, quantity: 1 }]);
  };

  const handleRemoveItem = (index: number) => {
    const updated = [...formItems];
    updated.splice(index, 1);
    setFormItems(updated);
  };

  const handleItemProductChange = (index: number, val: number) => {
    const updated = [...formItems];
    updated[index].product_id = val;
    setFormItems(updated);
  };

  const handleItemQuantityChange = (index: number, val: number) => {
    const updated = [...formItems];
    updated[index].quantity = val;
    setFormItems(updated);
  };

  const handleCreateOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateOrderError(null);

    // Validate
    if (!recipientName.trim() || !recipientContact.trim() || !deliveryDeadline) {
      setCreateOrderError('Please fill in all recipient and deadline details.');
      return;
    }

    if (formItems.length === 0) {
      setCreateOrderError('At least one item is required.');
      return;
    }

    for (const item of formItems) {
      if (!item.product_id) {
        setCreateOrderError('Please select a valid product for all items.');
        return;
      }
      if (item.quantity < 1) {
        setCreateOrderError('Quantity must be 1 or greater.');
        return;
      }
    }

    setIsSubmittingOrder(true);
    try {
      await createOrder({
        recipient_name: recipientName.trim(),
        recipient_contact: recipientContact.trim(),
        delivery_deadline: deliveryDeadline,
        items: formItems,
      });

      addNotification({
        id: Math.random().toString(),
        message: 'Order created successfully.',
        type: 'success',
        createdAt: new Date(),
      });

      setIsCreateModalOpen(false);
      // Reset form
      setRecipientName('');
      setRecipientContact('');
      setDeliveryDeadline('');
      setFormItems([{ product_id: 0, quantity: 1 }]);
      // Reload page 1 to display the newly created order
      fetchOrders(1);
    } catch (err: any) {
      const errMsg =
        err?.response?.data?.message || 'Failed to create order. Please try again.';
      setCreateOrderError(errMsg);
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  // ─── Assign Worker Action ─────────────────────────────────────────────────────
  const handleAssignWorkerSubmit = async () => {
    if (assigningOrderId === null || selectedWorkerId === null) return;

    setIsAssigning(true);
    try {
      const selectedWorker = workers.find((w) => w.id === selectedWorkerId);
      await assignOrder(assigningOrderId, selectedWorkerId);

      updateOrder(assigningOrderId, {
        status: 'assigned',
        worker_id: selectedWorkerId,
        worker: selectedWorker ? { id: selectedWorker.id, name: selectedWorker.name } : null,
      });

      addNotification({
        id: Math.random().toString(),
        message: 'Worker assigned successfully.',
        type: 'success',
        createdAt: new Date(),
      });

      setAssigningOrderId(null);
    } catch (err: any) {
      const errMsg =
        err?.response?.data?.message || 'Failed to assign worker. Please try again.';
      addNotification({
        id: Math.random().toString(),
        message: errMsg,
        type: 'error',
        createdAt: new Date(),
      });
    } finally {
      setIsAssigning(false);
    }
  };

  // ─── Flag Order Action ────────────────────────────────────────────────────────
  const handleFlagOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (flaggingOrderId === null) return;
    const trimmedReason = flagReason.trim();
    if (!trimmedReason) {
      setFlagError('Please enter a reason for flagging.');
      return;
    }

    setIsSubmittingFlag(true);
    setFlagError(null);
    try {
      await flagOrder(flaggingOrderId, trimmedReason);

      updateOrder(flaggingOrderId, {
        status: 'flagged',
        flag_reason: trimmedReason,
      });

      addNotification({
        id: Math.random().toString(),
        message: 'Order flagged successfully.',
        type: 'success',
        createdAt: new Date(),
      });

      setFlaggingOrderId(null);
      setFlagReason('');
    } catch (err: any) {
      const errMsg =
        err?.response?.data?.message || 'Failed to flag order. Please try again.';
      setFlagError(errMsg);
    } finally {
      setIsSubmittingFlag(false);
    }
  };

  // ─── Resolve Flag Action ──────────────────────────────────────────────────────
  const handleResolveConfirm = async () => {
    if (resolvingOrderId === null) return;

    setIsResolving(true);
    try {
      await resolveOrder(resolvingOrderId);

      updateOrder(resolvingOrderId, {
        status: 'assigned',
        flag_reason: null,
      });

      addNotification({
        id: Math.random().toString(),
        message: 'Order flag resolved successfully.',
        type: 'success',
        createdAt: new Date(),
      });

      setResolvingOrderId(null);
    } catch (err: any) {
      const errMsg =
        err?.response?.data?.message || 'Failed to resolve flag. Please try again.';
      addNotification({
        id: Math.random().toString(),
        message: errMsg,
        type: 'error',
        createdAt: new Date(),
      });
    } finally {
      setIsResolving(false);
    }
  };

  // Status badge styling
  const badgeStyles = {
    unassigned: 'bg-gray-50 text-gray-600 border-gray-200',
    assigned: 'bg-blue-50 text-blue-700 border-blue-200',
    delivered: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    flagged: 'bg-rose-50 text-rose-700 border-rose-200',
  };

  return (
    <div className="space-y-6">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Orders</h1>
          <p className="text-sm text-gray-500 mt-1">
            Monitor and manage all system-wide orders here.
          </p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          id="create-order-btn"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all cursor-pointer"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Create Order
        </button>
      </div>

      {/* Main Content Area */}
      {isLoading ? (
        // Loading State: Skeleton Table Rows
        <div className="border border-gray-200 rounded-2xl bg-white shadow-xs overflow-hidden">
          <div className="animate-pulse">
            <div className="bg-gray-50/50 border-b border-gray-100 h-12 w-full flex items-center px-6">
              <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            </div>
            {[1, 2, 3, 4, 5].map((n) => (
              <div key={n} className="border-b border-gray-100 h-16 w-full flex items-center px-6 gap-4">
                <div className="h-4 bg-gray-200 rounded w-12"></div>
                <div className="h-4 bg-gray-200 rounded flex-1"></div>
                <div className="h-4 bg-gray-200 rounded w-28"></div>
                <div className="h-6 bg-gray-200 rounded-full w-20"></div>
                <div className="h-4 bg-gray-200 rounded w-32"></div>
                <div className="h-8 bg-gray-200 rounded-lg w-24"></div>
              </div>
            ))}
          </div>
        </div>
      ) : error ? (
        // Error State
        <div className="border border-red-200 rounded-2xl p-6 bg-red-50 text-center">
          <span className="text-lg mb-2 block">⚠️</span>
          <h3 className="text-sm font-bold text-red-900">Failed to Load Orders</h3>
          <p className="text-xs text-red-700 mt-1 mb-4">{error}</p>
          <button
            onClick={() => fetchOrders(page)}
            className="inline-flex items-center justify-center rounded-xl bg-white border border-red-200 px-4 py-2 text-xs font-semibold text-red-700 hover:bg-red-100 transition-all cursor-pointer"
          >
            Retry
          </button>
        </div>
      ) : orders.length === 0 ? (
        // Empty State
        <div className="border border-dashed border-gray-300 rounded-2xl p-12 flex flex-col items-center justify-center text-center bg-white">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 text-lg mb-4">
            📋
          </span>
          <h3 className="text-base font-bold text-gray-900">No orders yet</h3>
          <p className="text-sm text-gray-500 mt-1 max-w-sm">
            Create your first delivery order to start dispatching to workers.
          </p>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-indigo-500 transition-all cursor-pointer"
          >
            Create your first order
          </button>
        </div>
      ) : (
        // Populated State: Table Layout
        <div className="space-y-4">
          <div className="border border-gray-200 rounded-2xl bg-white shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="bg-gray-50/50 border-b border-gray-100">
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      ID
                    </th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      Recipient
                    </th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      Deadline
                    </th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      Status
                    </th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      Assigned Worker
                    </th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {orders.map((order) => {
                    const badgeStyle = badgeStyles[order.status] || badgeStyles.unassigned;
                    return (
                      <tr key={order.id} className="hover:bg-gray-50/40 transition-colors">
                        {/* Order ID */}
                        <td className="px-6 py-4 text-sm font-extrabold text-gray-900">
                          #{order.id}
                        </td>
                        {/* Recipient */}
                        <td className="px-6 py-4">
                          <div className="text-sm font-bold text-gray-900">
                            {order.recipient_name}
                          </div>
                          <div className="text-xs text-gray-500 mt-0.5">
                            {order.recipient_contact}
                          </div>
                        </td>
                        {/* Deadline */}
                        <td className="px-6 py-4 text-sm font-semibold text-gray-800">
                          {formatDate(order.delivery_deadline)}
                        </td>
                        {/* Status */}
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${badgeStyle} capitalize`}
                          >
                            {order.status}
                          </span>
                          {order.status === 'flagged' && order.flag_reason && (
                            <div className="mt-1.5 text-xs text-rose-600 bg-rose-50 border border-rose-100 rounded-lg p-2 max-w-xs leading-relaxed">
                              <span className="font-bold block uppercase tracking-wider text-[9px] text-rose-800">
                                Reason
                              </span>
                              {order.flag_reason}
                            </div>
                          )}
                        </td>
                        {/* Assigned Worker */}
                        <td className="px-6 py-4">
                          {order.worker_id !== null && order.worker ? (
                            <div className="flex items-center gap-2">
                              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-50 text-indigo-700 text-[10px] font-bold uppercase border border-indigo-100">
                                {order.worker.name.charAt(0)}
                              </span>
                              <span className="text-sm font-bold text-gray-900">
                                {order.worker.name}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs font-medium text-gray-400 italic">
                              Unassigned
                            </span>
                          )}
                        </td>
                        {/* Actions */}
                        <td className="px-6 py-4">
                          {order.status === 'unassigned' && (
                            <button
                              onClick={() => setAssigningOrderId(order.id)}
                              id={`assign-worker-${order.id}`}
                              className="inline-flex items-center justify-center rounded-lg border border-indigo-200 bg-white px-3 py-1.5 text-xs font-bold text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700 transition-all cursor-pointer"
                            >
                              Assign Worker
                            </button>
                          )}
                          {order.status === 'assigned' && (
                            <button
                              onClick={() => setFlaggingOrderId(order.id)}
                              id={`flag-order-${order.id}`}
                              className="inline-flex items-center justify-center rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-50 hover:text-rose-700 transition-all cursor-pointer"
                            >
                              Flag Order
                            </button>
                          )}
                          {order.status === 'flagged' && (
                            <button
                              onClick={() => setResolvingOrderId(order.id)}
                              id={`resolve-flag-${order.id}`}
                              className="inline-flex items-center justify-center rounded-lg border border-emerald-200 bg-white px-3 py-1.5 text-xs font-bold text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 transition-all cursor-pointer"
                            >
                              Resolve
                            </button>
                          )}
                          {order.status === 'delivered' && (
                            <span className="text-xs font-medium text-gray-400 italic">
                              None
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination Controls */}
          <div className="flex items-center justify-between border-t border-gray-100 pt-4 px-1">
            <button
              onClick={() => fetchOrders(page - 1)}
              disabled={page <= 1 || isLoading}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              Previous
            </button>
            <span className="text-xs font-semibold text-gray-600">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => fetchOrders(page + 1)}
              disabled={page >= totalPages || isLoading}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* ─── Modal: Create Order ────────────────────────────────────────────────── */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-[fadeIn_0.2s_ease-out]">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 max-w-2xl w-full overflow-hidden p-6 animate-[scaleIn_0.2s_ease-out] flex flex-col max-h-[90vh]">
            <div className="mb-4">
              <h3 className="text-lg font-bold text-gray-900">Create Order</h3>
              <p className="text-xs text-gray-500 mt-1">
                Dispatch a new order. Add recipient details and product items.
              </p>
            </div>

            {createOrderError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl">
                {createOrderError}
              </div>
            )}

            <form onSubmit={handleCreateOrderSubmit} className="space-y-4 overflow-y-auto flex-1 pr-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Recipient Name */}
                <div>
                  <label htmlFor="recipient-name" className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                    Recipient Name
                  </label>
                  <input
                    type="text"
                    id="recipient-name"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    placeholder="e.g. John Doe"
                    required
                    disabled={isSubmittingOrder}
                    className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm placeholder-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-all"
                  />
                </div>

                {/* Recipient Contact */}
                <div>
                  <label htmlFor="recipient-contact" className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                    Recipient Contact
                  </label>
                  <input
                    type="text"
                    id="recipient-contact"
                    value={recipientContact}
                    onChange={(e) => setRecipientContact(e.target.value)}
                    placeholder="e.g. +1 555-0199"
                    required
                    disabled={isSubmittingOrder}
                    className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm placeholder-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-all"
                  />
                </div>
              </div>

              {/* Delivery Deadline */}
              <div>
                <label htmlFor="delivery-deadline" className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                  Delivery Deadline
                </label>
                <input
                  type="date"
                  id="delivery-deadline"
                  value={deliveryDeadline}
                  onChange={(e) => setDeliveryDeadline(e.target.value)}
                  required
                  disabled={isSubmittingOrder}
                  className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-all"
                />
              </div>

              {/* Items Section */}
              <div className="border-t border-gray-100 pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Order Items
                  </span>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    disabled={isSubmittingOrder || loadingProducts}
                    className="inline-flex items-center justify-center gap-1 rounded-lg border border-indigo-200 bg-white px-2.5 py-1.5 text-xs font-bold text-indigo-600 hover:bg-indigo-50 transition-all cursor-pointer"
                  >
                    + Add Item
                  </button>
                </div>

                {loadingProducts ? (
                  <div className="py-4 text-center text-xs text-gray-500">
                    Loading products list...
                  </div>
                ) : (
                  <div className="space-y-3 max-h-60 overflow-y-auto">
                    {formItems.map((item, index) => (
                      <div key={index} className="flex gap-3 items-end bg-gray-50/70 p-3 rounded-xl border border-gray-100">
                        {/* Product Selection */}
                        <div className="flex-1">
                          <label htmlFor={`item-product-${index}`} className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                            Product
                          </label>
                          <select
                            id={`item-product-${index}`}
                            value={item.product_id}
                            onChange={(e) => handleItemProductChange(index, Number(e.target.value))}
                            disabled={isSubmittingOrder}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-all"
                          >
                            {products.length === 0 ? (
                              <option value="0">No products available</option>
                            ) : (
                              products.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.name} ({p.current_stock} {p.unit} in {p.warehouse?.name})
                                </option>
                              ))
                            )}
                          </select>
                        </div>

                        {/* Quantity */}
                        <div className="w-24">
                          <label htmlFor={`item-qty-${index}`} className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                            Quantity
                          </label>
                          <input
                            type="number"
                            id={`item-qty-${index}`}
                            min="1"
                            value={item.quantity}
                            onChange={(e) => handleItemQuantityChange(index, Math.max(1, Number(e.target.value)))}
                            disabled={isSubmittingOrder}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-all"
                          />
                        </div>

                        {/* Remove button */}
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(index)}
                          disabled={isSubmittingOrder || formItems.length <= 1}
                          className="p-2 text-rose-500 hover:text-rose-700 disabled:opacity-30 disabled:hover:text-rose-500 transition-colors"
                          aria-label="Remove item"
                        >
                          <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Form Controls */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  disabled={isSubmittingOrder}
                  className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-all disabled:opacity-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  id="submit-create-order"
                  disabled={isSubmittingOrder || loadingProducts || products.length === 0}
                  className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isSubmittingOrder ? 'Creating...' : 'Create Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Modal: Assign Worker ───────────────────────────────────────────────── */}
      {assigningOrderId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-[fadeIn_0.2s_ease-out]">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 max-w-md w-full overflow-hidden p-6 animate-[scaleIn_0.2s_ease-out]">
            <h3 className="text-lg font-bold text-gray-900 mb-1">Assign Worker to Order #{assigningOrderId}</h3>
            <p className="text-xs text-gray-500 mb-4">
              Select an available worker to fulfill this delivery.
            </p>

            {loadingWorkers ? (
              <div className="py-8 text-center text-sm text-gray-500 animate-pulse">
                Fetching workers status...
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto mb-6">
                {workers.length === 0 ? (
                  <p className="text-xs text-gray-500 italic text-center py-4">No active workers found.</p>
                ) : (
                  workers.map((worker) => {
                    const isAvailable = worker.status === 'Available';
                    const isSelected = selectedWorkerId === worker.id;
                    return (
                      <button
                        key={worker.id}
                        type="button"
                        disabled={!isAvailable || isAssigning}
                        onClick={() => setSelectedWorkerId(worker.id)}
                        className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all text-left ${
                          isSelected
                            ? 'border-indigo-600 bg-indigo-50/40'
                            : isAvailable
                            ? 'border-gray-200 hover:border-gray-300 bg-white cursor-pointer'
                            : 'border-gray-100 bg-gray-50/50 opacity-60 cursor-not-allowed'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold uppercase ${
                            isSelected
                              ? 'bg-indigo-600 text-white'
                              : 'bg-gray-100 text-gray-700'
                          }`}>
                            {worker.name.charAt(0)}
                          </span>
                          <span className="text-sm font-bold text-gray-800">{worker.name}</span>
                        </div>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          isAvailable
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                            : 'bg-amber-50 text-amber-700 border-amber-100'
                        }`}>
                          {worker.status}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 border-t border-gray-100 pt-4">
              <button
                type="button"
                onClick={() => setAssigningOrderId(null)}
                disabled={isAssigning}
                className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-all disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAssignWorkerSubmit}
                disabled={isAssigning || selectedWorkerId === null}
                className="rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {isAssigning ? 'Assigning...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Modal: Flag Order ──────────────────────────────────────────────────── */}
      {flaggingOrderId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-[fadeIn_0.2s_ease-out]">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 max-w-md w-full overflow-hidden p-6 animate-[scaleIn_0.2s_ease-out]">
            <h3 className="text-lg font-bold text-gray-900 mb-1">Flag Order #{flaggingOrderId}</h3>
            <p className="text-xs text-gray-500 mb-4">
              Provide a flag reason to alert management and temporarily suspend delivery operations.
            </p>

            {flagError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl">
                {flagError}
              </div>
            )}

            <form onSubmit={handleFlagOrderSubmit} className="space-y-4">
              <div>
                <textarea
                  id="flag-reason-textarea"
                  rows={4}
                  value={flagReason}
                  onChange={(e) => setFlagReason(e.target.value)}
                  placeholder="e.g. Address is incorrect, items damaged..."
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm placeholder-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-all resize-none"
                  disabled={isSubmittingFlag}
                  autoFocus
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setFlaggingOrderId(null);
                    setFlagReason('');
                  }}
                  disabled={isSubmittingFlag}
                  className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-all disabled:opacity-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  id="confirm-flag-order"
                  disabled={isSubmittingFlag || !flagReason.trim()}
                  className="rounded-xl bg-red-600 px-5 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-red-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isSubmittingFlag ? 'Flagging...' : 'Flag Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Modal: Resolve Confirmation ────────────────────────────────────────── */}
      {resolvingOrderId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-[fadeIn_0.2s_ease-out]">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 max-w-sm w-full overflow-hidden p-6 animate-[scaleIn_0.2s_ease-out] text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 text-lg mx-auto mb-4 border border-emerald-100">
              ✓
            </span>
            <h3 className="text-base font-bold text-gray-900 mb-2">Resolve Flagged Order</h3>
            <p className="text-xs text-gray-500 mb-6 leading-relaxed">
              Are you sure you want to resolve the flag on Order #{resolvingOrderId}? This will restore the status to Assigned.
            </p>

            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setResolvingOrderId(null)}
                disabled={isResolving}
                className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-all disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleResolveConfirm}
                disabled={isResolving}
                className="rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-500 transition-all disabled:opacity-50 cursor-pointer"
              >
                {isResolving ? 'Resolving...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
