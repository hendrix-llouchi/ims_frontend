import { useEffect, useState, useCallback } from 'react';
import { useNotificationStore } from '../../store/notificationStore';
import {
  fetchPurchaseOrders,
  createPurchaseOrder,
  fetchPurchaseOrderDetails,
  receivePurchaseOrder,
  fetchSharedWarehouses,
  fetchSharedProducts,
} from '../../api/manager/managerApi';
import type {
  PurchaseOrder,
  WorkerProduct,
  WorkerProductWarehouse,
} from '../../types/workerApi';

// Helper: Format Date
function formatDate(dateStr: string | null | undefined) {
  if (!dateStr) return 'Pending';
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

// Helper: Current Date string (YYYY-MM-DD)
function getTodayString() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

interface CreatePOFormItem {
  product_id: number;
  quantity_ordered: number;
}

interface ReceivePOFormItem {
  purchase_order_item_id: number;
  quantity_received: number;
  product_name: string;
  quantity_ordered: number;
}

export default function PurchaseOrdersPage() {
  const { addNotification } = useNotificationStore();

  // List & pagination state
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Modal open states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false);

  // Dropdown options (loaded when Create modal opens)
  const [warehouses, setWarehouses] = useState<WorkerProductWarehouse[]>([]);
  const [products, setProducts] = useState<WorkerProduct[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);

  // Create PO form state
  const [supplierName, setSupplierName] = useState('');
  const [warehouseId, setWarehouseId] = useState<number>(0);
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('');
  const [createPOItems, setCreatePOItems] = useState<CreatePOFormItem[]>([
    { product_id: 0, quantity_ordered: 1 },
  ]);
  const [createValidationError, setCreateValidationError] = useState<string | null>(null);
  const [isSubmittingCreate, setIsSubmittingCreate] = useState(false);

  // Receive PO form state
  const [receivingPO, setReceivingPO] = useState<PurchaseOrder | null>(null);
  const [loadingReceiveDetails, setLoadingReceiveDetails] = useState(false);
  const [actualArrivalDate, setActualArrivalDate] = useState(getTodayString());
  const [receiveStatus, setReceiveStatus] = useState<'complete' | 'incomplete'>('complete');
  const [receivePOItems, setReceivePOItems] = useState<ReceivePOFormItem[]>([]);
  const [receiveValidationError, setReceiveValidationError] = useState<string | null>(null);
  const [isSubmittingReceive, setIsSubmittingReceive] = useState(false);

  // ─── Fetch Purchase Orders List ──────────────────────────────────────────────
  const loadPurchaseOrders = useCallback(async (targetPage = page) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetchPurchaseOrders(targetPage);
      setPurchaseOrders(res.data);
      setPage(res.current_page);
      setTotalPages(res.last_page);
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { message?: string } } };
      setError(
        axiosError.response?.data?.message ||
          'Failed to load purchase orders. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  }, [page]);

  useEffect(() => {
    loadPurchaseOrders(1);
  }, []);

  // ─── Fetch Dropdown Options for Create PO ───────────────────────────────────
  const loadOptionsData = async () => {
    setLoadingOptions(true);
    setCreateValidationError(null);
    try {
      // Fetch all Warehouses
      let allWarehouses: WorkerProductWarehouse[] = [];
      let wPage = 1;
      let wHasMore = true;
      while (wHasMore) {
        const res = await fetchSharedWarehouses(wPage);
        allWarehouses = [...allWarehouses, ...res.data];
        if (res.current_page >= res.last_page) {
          wHasMore = false;
        } else {
          wPage++;
        }
      }
      setWarehouses(allWarehouses);

      // Fetch all Products
      let allProducts: WorkerProduct[] = [];
      let pPage = 1;
      let pHasMore = true;
      while (pHasMore) {
        const res = await fetchSharedProducts(pPage);
        allProducts = [...allProducts, ...res.data];
        if (res.current_page >= res.last_page) {
          pHasMore = false;
        } else {
          pPage++;
        }
      }
      setProducts(allProducts);
    } catch (err) {
      console.error('Failed to load shared warehouses or products', err);
      setCreateValidationError('Failed to load warehouses or products. Please retry.');
    } finally {
      setLoadingOptions(false);
    }
  };

  useEffect(() => {
    if (isCreateModalOpen) {
      loadOptionsData();
      // Reset Create Form
      setSupplierName('');
      setWarehouseId(0);
      setExpectedDeliveryDate('');
      setCreatePOItems([{ product_id: 0, quantity_ordered: 1 }]);
    }
  }, [isCreateModalOpen]);

  // Filter products by selected warehouse
  const filteredProducts = products.filter(
    (p) => p.warehouse?.id === warehouseId
  );

  // Reset items when warehouse changes to prevent cross-warehouse product ordering
  const handleWarehouseChange = (id: number) => {
    setWarehouseId(id);
    setCreatePOItems([{ product_id: 0, quantity_ordered: 1 }]);
  };

  // ─── Manage Create PO Items Section ─────────────────────────────────────────
  const addCreatePOItem = () => {
    setCreatePOItems([...createPOItems, { product_id: 0, quantity_ordered: 1 }]);
  };

  const removeCreatePOItem = (index: number) => {
    if (createPOItems.length === 1) return;
    const updated = [...createPOItems];
    updated.splice(index, 1);
    setCreatePOItems(updated);
  };

  const handleCreateItemChange = (
    index: number,
    field: keyof CreatePOFormItem,
    value: number
  ) => {
    const updated = [...createPOItems];
    updated[index] = {
      ...updated[index],
      [field]: value,
    };
    setCreatePOItems(updated);
    setCreateValidationError(null);
  };

  // ─── Submit Create Purchase Order ────────────────────────────────────────────
  const handleCreatePOSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateValidationError(null);

    const supplier = supplierName.trim();
    if (!supplier) {
      setCreateValidationError('Supplier name is required.');
      return;
    }
    if (!warehouseId) {
      setCreateValidationError('Please select a warehouse.');
      return;
    }
    if (!expectedDeliveryDate) {
      setCreateValidationError('Please select an expected delivery date.');
      return;
    }

    // Items validation
    if (createPOItems.length === 0) {
      setCreateValidationError('At least one item is required.');
      return;
    }

    const itemPayloads: Array<{ product_id: number; quantity_ordered: number }> = [];
    const seenProductIds = new Set<number>();

    for (let i = 0; i < createPOItems.length; i++) {
      const item = createPOItems[i];
      if (item.product_id === 0) {
        setCreateValidationError(`Please select a valid product for item ${i + 1}.`);
        return;
      }
      if (item.quantity_ordered <= 0) {
        setCreateValidationError(`Quantity for item ${i + 1} must be at least 1.`);
        return;
      }
      if (seenProductIds.has(item.product_id)) {
        setCreateValidationError('Duplicate products in items list. Please combine them.');
        return;
      }
      seenProductIds.add(item.product_id);
      itemPayloads.push({
        product_id: item.product_id,
        quantity_ordered: item.quantity_ordered,
      });
    }

    setIsSubmittingCreate(true);
    try {
      const res = await createPurchaseOrder({
        supplier_name: supplier,
        warehouse_id: warehouseId,
        expected_delivery_date: expectedDeliveryDate,
        items: itemPayloads,
      });

      addNotification({
        id: Math.random().toString(36).substring(7),
        message: res.message || 'Purchase order created successfully.',
        type: 'success',
        createdAt: new Date(),
      });

      setIsCreateModalOpen(false);
      loadPurchaseOrders(1);
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { message?: string } } };
      setCreateValidationError(
        axiosError.response?.data?.message || 'Failed to create Purchase Order.'
      );
    } finally {
      setIsSubmittingCreate(false);
    }
  };

  // ─── Open Receive Delivery Modal (Fetch Detailed Details) ───────────────────
  const openReceiveModal = async (po: PurchaseOrder) => {
    setIsReceiveModalOpen(true);
    setLoadingReceiveDetails(true);
    setReceivingPO(po);
    setReceiveValidationError(null);
    setActualArrivalDate(getTodayString());
    setReceiveStatus('complete');
    setReceivePOItems([]);

    try {
      const res = await fetchPurchaseOrderDetails(po.id);
      const detailedPO = res.purchase_order;
      setReceivingPO(detailedPO);

      const itemsForForm = detailedPO.items.map((item) => ({
        purchase_order_item_id: item.id,
        quantity_received: item.quantity_ordered, // prefilled to match ordered
        product_name: item.product?.name || 'Unknown Product',
        quantity_ordered: item.quantity_ordered,
      }));
      setReceivePOItems(itemsForForm);
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { message?: string } } };
      setReceiveValidationError(
        axiosError.response?.data?.message || 'Failed to fetch Purchase Order details.'
      );
    } finally {
      setLoadingReceiveDetails(false);
    }
  };

  const handleReceiveItemChange = (index: number, val: number) => {
    const updated = [...receivePOItems];
    updated[index].quantity_received = val;
    setReceivePOItems(updated);
    setReceiveValidationError(null);
  };

  // ─── Submit Receive Delivery ─────────────────────────────────────────────────
  const handleReceiveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setReceiveValidationError(null);

    if (!receivingPO) return;
    if (!actualArrivalDate) {
      setReceiveValidationError('Please select actual arrival date.');
      return;
    }

    // Items validation
    for (let i = 0; i < receivePOItems.length; i++) {
      const item = receivePOItems[i];
      if (item.quantity_received < 0) {
        setReceiveValidationError(`Quantity received for ${item.product_name} cannot be negative.`);
        return;
      }
    }

    setIsSubmittingReceive(true);
    try {
      const res = await receivePurchaseOrder(receivingPO.id, {
        status: receiveStatus,
        actual_arrival_date: actualArrivalDate,
        items: receivePOItems.map((item) => ({
          purchase_order_item_id: item.purchase_order_item_id,
          quantity_received: item.quantity_received,
        })),
      });

      addNotification({
        id: Math.random().toString(36).substring(7),
        message: res.message || 'Delivery received successfully.',
        type: 'success',
        createdAt: new Date(),
      });

      setIsReceiveModalOpen(false);
      loadPurchaseOrders(page); // refresh current page
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { message?: string } } };
      setReceiveValidationError(
        axiosError.response?.data?.message || 'Failed to log received stock.'
      );
    } finally {
      setIsSubmittingReceive(false);
    }
  };

  // ─── Skeleton Loading Rows ──────────────────────────────────────────────────
  const renderSkeletonRows = () => {
    return Array.from({ length: 5 }).map((_, idx) => (
      <tr key={idx} className="animate-pulse">
        <td className="px-6 py-4">
          <div className="h-4 bg-gray-200 rounded w-12"></div>
        </td>
        <td className="px-6 py-4">
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
        </td>
        <td className="px-6 py-4">
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </td>
        <td className="px-6 py-4">
          <div className="h-4 bg-gray-200 rounded w-24"></div>
        </td>
        <td className="px-6 py-4">
          <div className="h-4 bg-gray-200 rounded w-24"></div>
        </td>
        <td className="px-6 py-4">
          <div className="h-6 bg-gray-200 rounded-full w-16"></div>
        </td>
        <td className="px-6 py-4 text-right">
          <div className="h-8 bg-gray-200 rounded-xl w-32 ml-auto"></div>
        </td>
      </tr>
    ));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Purchase Orders</h1>
          <p className="text-sm text-gray-500 mt-1">
            Create replenishment orders when stock is low and log incoming deliveries.
          </p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all cursor-pointer"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Create Purchase Order
        </button>
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs overflow-hidden">
        {error && (
          <div className="m-6 p-4 bg-red-50 border border-red-200 text-red-700 text-sm font-semibold rounded-xl flex items-center justify-between">
            <span>{error}</span>
            <button
              onClick={() => loadPurchaseOrders(1)}
              className="text-red-800 hover:text-red-950 underline text-xs ml-4 cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50 text-xs font-bold text-gray-400 uppercase tracking-wider">
                <th className="px-6 py-4">PO ID</th>
                <th className="px-6 py-4">Supplier</th>
                <th className="px-6 py-4">Warehouse</th>
                <th className="px-6 py-4">Expected Delivery</th>
                <th className="px-6 py-4">Actual Arrival</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
              {isLoading ? (
                renderSkeletonRows()
              ) : purchaseOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center">
                    <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-50 text-gray-400 text-lg mx-auto mb-3">
                      📦
                    </span>
                    <p className="text-gray-900 font-bold">No purchase orders found</p>
                    <p className="text-xs text-gray-500 mt-1 max-w-xs mx-auto">
                      All purchase orders will appear here. Start by creating a replenishment order.
                    </p>
                    <button
                      onClick={() => setIsCreateModalOpen(true)}
                      className="mt-4 inline-flex items-center justify-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition-all cursor-pointer"
                    >
                      Create First PO
                    </button>
                  </td>
                </tr>
              ) : (
                purchaseOrders.map((po) => {
                  let statusBadgeClass = 'bg-gray-50 text-gray-700 ring-gray-600/10';
                  if (po.status === 'complete') {
                    statusBadgeClass = 'bg-emerald-50 text-emerald-700 ring-emerald-600/10';
                  } else if (po.status === 'incomplete') {
                    statusBadgeClass = 'bg-rose-50 text-rose-700 ring-rose-600/10';
                  }

                  return (
                    <tr key={po.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 font-bold text-gray-900">#{po.id}</td>
                      <td className="px-6 py-4 font-semibold text-gray-800">{po.supplier_name}</td>
                      <td className="px-6 py-4 text-gray-600">{po.warehouse?.name || 'Unknown'}</td>
                      <td className="px-6 py-4 text-gray-600">{formatDate(po.expected_delivery_date)}</td>
                      <td className="px-6 py-4 text-gray-600">{formatDate(po.actual_arrival_date)}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-bold ring-1 ring-inset capitalize ${statusBadgeClass}`}>
                          {po.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {po.status === 'pending' ? (
                          <button
                            onClick={() => openReceiveModal(po)}
                            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-100 transition-all cursor-pointer"
                          >
                            Receive Delivery
                          </button>
                        ) : (
                          <span className="text-xs text-gray-400 font-medium italic">No action</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {!isLoading && totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-100 bg-white px-6 py-4">
            <button
              onClick={() => loadPurchaseOrders(page - 1)}
              disabled={page === 1}
              className="inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer shadow-xs"
            >
              Previous
            </button>
            <span className="text-xs text-gray-500 font-semibold">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => loadPurchaseOrders(page + 1)}
              disabled={page === totalPages}
              className="inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer shadow-xs"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* ─── Modal: Create Purchase Order ────────────────────────────────────── */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-[fadeIn_0.2s_ease-out]">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 animate-[scaleIn_0.2s_ease-out]">
            <div className="flex justify-between items-start mb-6 border-b border-gray-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Create Purchase Order</h3>
                <p className="text-xs text-gray-500 mt-1">
                  Place a new replenishment request. Make sure to select products belonging to the selected warehouse.
                </p>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-gray-100 cursor-pointer"
                aria-label="Close modal"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {createValidationError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-xl">
                {createValidationError}
              </div>
            )}

            <form onSubmit={handleCreatePOSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Supplier Name */}
                <div>
                  <label htmlFor="supplier-input" className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                    Supplier Name
                  </label>
                  <input
                    id="supplier-input"
                    type="text"
                    required
                    value={supplierName}
                    onChange={(e) => {
                      setSupplierName(e.target.value);
                      setCreateValidationError(null);
                    }}
                    placeholder="e.g. Acme Supplies Inc."
                    className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-all"
                  />
                </div>

                {/* Warehouse */}
                <div>
                  <label htmlFor="warehouse-select" className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                    Warehouse
                  </label>
                  <select
                    id="warehouse-select"
                    required
                    value={warehouseId}
                    onChange={(e) => {
                      handleWarehouseChange(Number(e.target.value));
                      setCreateValidationError(null);
                    }}
                    className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-all"
                  >
                    <option value={0}>Select Warehouse</option>
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name} ({w.location})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Expected Delivery Date */}
                <div className="md:col-span-2">
                  <label htmlFor="expected-date-input" className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                    Expected Delivery Date
                  </label>
                  <input
                    id="expected-date-input"
                    type="date"
                    required
                    value={expectedDeliveryDate}
                    onChange={(e) => {
                      setExpectedDeliveryDate(e.target.value);
                      setCreateValidationError(null);
                    }}
                    className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-all"
                  />
                </div>
              </div>

              {/* Items Section */}
              <div className="space-y-4">
                <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                  <h4 className="text-xs font-bold text-gray-900 uppercase tracking-widest">
                    Items section ({createPOItems.length})
                  </h4>
                  <button
                    type="button"
                    onClick={addCreatePOItem}
                    disabled={warehouseId === 0 || loadingOptions}
                    className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700 hover:bg-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
                  >
                    + Add another item
                  </button>
                </div>

                {warehouseId === 0 ? (
                  <p className="text-xs text-gray-500 italic text-center py-4 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                    Please select a warehouse first to load its available products.
                  </p>
                ) : loadingOptions ? (
                  <p className="text-xs text-gray-500 italic text-center py-4">
                    Loading warehouse products...
                  </p>
                ) : filteredProducts.length === 0 ? (
                  <p className="text-xs text-red-600 font-semibold text-center py-4 bg-red-50/50 rounded-xl border border-dashed border-red-200">
                    No products found registered at this warehouse.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {createPOItems.map((item, index) => (
                      <div key={index} className="flex gap-3 items-end bg-gray-50/60 p-3 rounded-xl border border-gray-100">
                        {/* Product Selector */}
                        <div className="flex-1">
                          <label htmlFor={`product-select-${index}`} className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                            Product
                          </label>
                          <select
                            id={`product-select-${index}`}
                            required
                            value={item.product_id}
                            onChange={(e) =>
                              handleCreateItemChange(index, 'product_id', Number(e.target.value))
                            }
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs bg-white focus:border-indigo-500 focus:outline-none transition-all"
                          >
                            <option value={0}>Select Product</option>
                            {filteredProducts.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name} (Capacity: {p.current_stock}/{p.max_stock_level} {p.unit})
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Quantity Ordered */}
                        <div className="w-32">
                          <label htmlFor={`quantity-input-${index}`} className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                            Quantity Ordered
                          </label>
                          <input
                            id={`quantity-input-${index}`}
                            type="number"
                            required
                            min="1"
                            value={item.quantity_ordered}
                            onChange={(e) =>
                              handleCreateItemChange(index, 'quantity_ordered', Number(e.target.value))
                            }
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none transition-all"
                          />
                        </div>

                        {/* Delete Button */}
                        {createPOItems.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeCreatePOItem(index)}
                            className="text-red-500 hover:text-red-700 p-2 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                            aria-label="Remove item"
                          >
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 border-t border-gray-100 pt-4">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-all cursor-pointer shadow-xs"
                  disabled={isSubmittingCreate}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingCreate || warehouseId === 0 || filteredProducts.length === 0}
                  className="rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-indigo-500 shadow-sm transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmittingCreate ? 'Creating PO...' : 'Submit PO'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Modal: Receive Delivery ─────────────────────────────────────────── */}
      {isReceiveModalOpen && receivingPO && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-[fadeIn_0.2s_ease-out]">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 max-w-xl w-full max-h-[90vh] overflow-y-auto p-6 animate-[scaleIn_0.2s_ease-out]">
            <div className="flex justify-between items-start mb-6 border-b border-gray-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Log Received Delivery</h3>
                <p className="text-xs text-gray-500 mt-1">
                  Log received quantities for Purchase Order #{receivingPO.id} from {receivingPO.supplier_name}.
                </p>
              </div>
              <button
                onClick={() => setIsReceiveModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-gray-100 cursor-pointer"
                aria-label="Close modal"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {loadingReceiveDetails ? (
              <div className="flex flex-col items-center justify-center py-12 space-y-3">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600"></div>
                <p className="text-xs text-gray-500 font-semibold">Fetching PO details...</p>
              </div>
            ) : (
              <>
                {receiveValidationError && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-xl">
                    {receiveValidationError}
                  </div>
                )}

                <form onSubmit={handleReceiveSubmit} className="space-y-6">
                  {/* Delivery Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50/60 p-4 rounded-xl border border-gray-100">
                    <div>
                      <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                        Expected Delivery Date
                      </span>
                      <span className="text-sm font-semibold text-gray-800 mt-0.5 block">
                        {formatDate(receivingPO.expected_delivery_date)}
                      </span>
                    </div>

                    <div>
                      <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                        Warehouse Destination
                      </span>
                      <span className="text-sm font-semibold text-gray-800 mt-0.5 block">
                        {receivingPO.warehouse?.name || 'Unknown'}
                      </span>
                    </div>
                  </div>

                  {/* Date & Status Inputs */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="arrival-date-input" className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                        Actual Arrival Date
                      </label>
                      <input
                        id="arrival-date-input"
                        type="date"
                        required
                        value={actualArrivalDate}
                        max={getTodayString()}
                        onChange={(e) => {
                          setActualArrivalDate(e.target.value);
                          setReceiveValidationError(null);
                        }}
                        className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-all"
                      />
                    </div>

                    <div>
                      <label htmlFor="receive-status-select" className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                        Delivery Status
                      </label>
                      <select
                        id="receive-status-select"
                        required
                        value={receiveStatus}
                        onChange={(e) => {
                          setReceiveStatus(e.target.value as 'complete' | 'incomplete');
                          setReceiveValidationError(null);
                        }}
                        className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-all"
                      >
                        <option value="complete">Complete (Fully received)</option>
                        <option value="incomplete">Incomplete (Short delivery / missing items)</option>
                      </select>
                    </div>
                  </div>

                  {/* Items List */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-gray-900 uppercase tracking-widest border-b border-gray-100 pb-2">
                      Received quantities
                    </h4>

                    {receivePOItems.length === 0 ? (
                      <p className="text-xs text-gray-500 italic py-2">No items listed in this PO.</p>
                    ) : (
                      <div className="space-y-3 max-h-[30vh] overflow-y-auto pr-1">
                        {receivePOItems.map((item, index) => (
                          <div key={item.purchase_order_item_id} className="flex gap-4 items-center bg-gray-50/60 p-3 rounded-xl border border-gray-100">
                            {/* Product & Ordered Info */}
                            <div className="flex-1">
                              <span className="text-xs font-bold text-gray-900 block">{item.product_name}</span>
                              <span className="text-[10px] text-gray-500 block mt-0.5">
                                Ordered: {item.quantity_ordered} items
                              </span>
                            </div>

                            {/* Quantity Received Input */}
                            <div className="w-32">
                              <label htmlFor={`received-qty-${index}`} className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                                Qty Received
                              </label>
                              <input
                                id={`received-qty-${index}`}
                                type="number"
                                required
                                min="0"
                                value={item.quantity_received}
                                onChange={(e) =>
                                  handleReceiveItemChange(index, Number(e.target.value))
                                }
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none transition-all"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center justify-end gap-3 border-t border-gray-100 pt-4">
                    <button
                      type="button"
                      onClick={() => setIsReceiveModalOpen(false)}
                      className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-all cursor-pointer shadow-xs"
                      disabled={isSubmittingReceive}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmittingReceive || receivePOItems.length === 0}
                      className="rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-indigo-500 shadow-sm transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSubmittingReceive ? 'Logging Delivery...' : 'Log Delivery'}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
