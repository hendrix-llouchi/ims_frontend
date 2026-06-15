import { useEffect, useState, useCallback } from 'react';
import { useStockStore } from '../../store/stockStore';
import { useNotificationStore } from '../../store/notificationStore';
import {
  fetchManagerStock,
  fetchLowStockProducts,
  updateStockLevel,
} from '../../api/manager/managerApi';
import type { WorkerProduct } from '../../types/workerApi';

// Percentage calculation helper
function stockPercent(product: WorkerProduct) {
  if (!product.max_stock_level) return 0;
  return Math.min(100, Math.round((product.current_stock / product.max_stock_level) * 100));
}

export default function StockPage() {
  const {
    products,
    lowStockProducts,
    isLoading,
    error,
    setProducts,
    setLowStockProducts,
    setLoading,
    setError,
    updateProduct,
  } = useStockStore();

  const { addNotification } = useNotificationStore();

  // Tabs: 'all' or 'low'
  const [activeTab, setActiveTab] = useState<'all' | 'low'>('all');

  // Pagination state (All Stock tab only)
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Update Stock modal state
  const [updatingProduct, setUpdatingProduct] = useState<WorkerProduct | null>(null);
  const [newStockValue, setNewStockValue] = useState('');
  const [isSubmittingUpdate, setIsSubmittingUpdate] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Fetch / load data handler
  const loadStockData = useCallback(
    async (targetPage = page, targetTab = activeTab) => {
      setLoading(true);
      setError(null);
      try {
        if (targetTab === 'all') {
          const res = await fetchManagerStock(targetPage);
          setProducts(res.data);
          setPage(res.current_page);
          setTotalPages(res.last_page);
        } else {
          const res = await fetchLowStockProducts();
          setLowStockProducts(res.low_stock_products);
          setPage(1);
          setTotalPages(1);
        }
      } catch (err: unknown) {
        const axiosError = err as { response?: { data?: { message?: string } } };
        const errMsg =
          axiosError.response?.data?.message || 'Failed to load stock data. Please try again.';
        setError(errMsg);
      } finally {
        setLoading(false);
      }
    },
    [activeTab, page, setLoading, setError, setProducts, setLowStockProducts]
  );

  // Fetch data on tab or page change
  useEffect(() => {
    const timer = setTimeout(() => {
      loadStockData(page, activeTab);
    }, 0);
    return () => clearTimeout(timer);
  }, [page, activeTab, loadStockData]);

  // Tab switcher
  const handleTabChange = (tab: 'all' | 'low') => {
    setActiveTab(tab);
    setPage(1);
    setTotalPages(1);
  };

  // Modal open / close
  const openModal = (product: WorkerProduct) => {
    setUpdatingProduct(product);
    setNewStockValue(product.current_stock.toString());
    setValidationError(null);
  };

  const closeModal = () => {
    setUpdatingProduct(null);
    setNewStockValue('');
    setValidationError(null);
  };

  // Handle stock patch submit
  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!updatingProduct) return;

    const trimmed = newStockValue.trim();
    if (trimmed === '') {
      setValidationError('Stock level is required.');
      return;
    }

    const parsedStock = Number(trimmed);
    if (isNaN(parsedStock) || parsedStock < 0) {
      setValidationError('Stock level must be a positive number (0 or greater).');
      return;
    }

    if (parsedStock > updatingProduct.max_stock_level) {
      setValidationError(
        `Stock level cannot exceed maximum stock level of ${updatingProduct.max_stock_level} ${updatingProduct.unit}.`
      );
      return;
    }

    setIsSubmittingUpdate(true);
    setValidationError(null);

    try {
      const res = await updateStockLevel(updatingProduct.id, parsedStock);
      
      // Update in Zustand store
      updateProduct(res.product);

      // Show success toast
      addNotification({
        id: Math.random().toString(36).substring(7),
        message: `Successfully updated stock level for ${updatingProduct.name} to ${parsedStock} ${updatingProduct.unit}.`,
        type: 'success',
        createdAt: new Date(),
      });

      closeModal();
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { message?: string } } };
      const errMsg =
        axiosError.response?.data?.message || 'Failed to update stock. Please try again.';
      setValidationError(errMsg);
    } finally {
      setIsSubmittingUpdate(false);
    }
  };

  // Skeleton rows loader
  const renderSkeletonRows = () => {
    return Array.from({ length: 5 }).map((_, idx) => (
      <tr key={idx} className="animate-pulse">
        <td className="px-6 py-4">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-1.5"></div>
          <div className="h-3 bg-gray-100 rounded w-1/3"></div>
        </td>
        <td className="px-6 py-4">
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
        </td>
        <td className="px-6 py-4">
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-1"></div>
          <div className="h-3 bg-gray-100 rounded w-1/4"></div>
        </td>
        <td className="px-6 py-4">
          <div className="w-32 bg-gray-100 rounded-full h-2 overflow-hidden mb-1.5"></div>
          <div className="h-3 bg-gray-100 rounded w-8"></div>
        </td>
        <td className="px-6 py-4">
          <div className="h-6 bg-gray-200 rounded-full w-20"></div>
        </td>
        <td className="px-6 py-4 text-right">
          <div className="h-8 bg-gray-200 rounded-xl w-24 ml-auto"></div>
        </td>
      </tr>
    ));
  };

  // Determine items to display
  const currentItems = activeTab === 'all' ? products : lowStockProducts;
  const showPagination = activeTab === 'all' && totalPages > 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Stock Levels</h1>
          <p className="text-sm text-gray-500 mt-1">
            Monitor inventory utilization and capacity across all warehouses.
          </p>
        </div>
        <button
          onClick={() => loadStockData(page, activeTab)}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-xs hover:bg-gray-50 hover:text-gray-955 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all cursor-pointer"
        >
          <svg
            className={`h-4 w-4 text-gray-500 ${isLoading ? 'animate-spin' : ''}`}
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

      {/* Tabs Switcher */}
      <div className="flex border-b border-gray-200">
        <button
          id="tab-all-stock"
          onClick={() => handleTabChange('all')}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === 'all'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          All Stock
        </button>
        <button
          id="tab-low-stock"
          onClick={() => handleTabChange('low')}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === 'low'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          Low Stock
        </button>
      </div>

      {/* Main Content Area */}
      {error ? (
        // Error State
        <div className="border border-red-200 rounded-2xl p-6 bg-red-50 text-center max-w-lg mx-auto">
          <span className="text-2xl mb-2 block">⚠️</span>
          <h3 className="text-sm font-bold text-red-900">Failed to Load Stock Data</h3>
          <p className="text-xs text-red-700 mt-1 mb-4">{error}</p>
          <button
            onClick={() => loadStockData(page, activeTab)}
            className="inline-flex items-center justify-center rounded-xl bg-white border border-red-200 px-4 py-2 text-xs font-semibold text-red-700 hover:bg-red-100 transition-all cursor-pointer"
          >
            Retry
          </button>
        </div>
      ) : !isLoading && currentItems.length === 0 ? (
        // Empty State
        <div className="border border-dashed border-gray-300 rounded-2xl p-12 flex flex-col items-center justify-center text-center bg-white max-w-lg mx-auto">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 text-lg mb-4">
            📦
          </span>
          {activeTab === 'all' ? (
            <>
              <h3 className="text-base font-bold text-gray-900">No products in the system yet.</h3>
              <p className="text-sm text-gray-500 mt-1 max-w-sm">
                Products will appear here once they are added to the system.
              </p>
            </>
          ) : (
            <>
              <h3 className="text-base font-bold text-gray-900">No products are currently low on stock.</h3>
              <p className="text-sm text-gray-500 mt-1 max-w-sm">
                All inventory items are currently above the 30% capacity threshold.
              </p>
            </>
          )}
        </div>
      ) : (
        // Populated state table
        <div className="space-y-4">
          <div className="border border-gray-200 rounded-2xl bg-white shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="bg-gray-50/50 border-b border-gray-100">
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      Product
                    </th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      Warehouse
                    </th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      Current Stock / Max
                    </th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      Utilization
                    </th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      Status
                    </th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {isLoading ? (
                    renderSkeletonRows()
                  ) : (
                    currentItems.map((product) => {
                      const pct = stockPercent(product);
                      const isLow = pct <= 30;

                      // Utilization progress bar fill colors
                      const barFillColor =
                        pct <= 30 ? 'bg-rose-500' : pct <= 60 ? 'bg-amber-500' : 'bg-emerald-500';

                      return (
                        <tr
                          key={product.id}
                          className="hover:bg-gray-50/40 transition-colors"
                        >
                          {/* Name & Type */}
                          <td className="px-6 py-4">
                            <div className="text-sm font-bold text-gray-900">
                              {product.name}
                            </div>
                            <div className="text-xs text-gray-500 mt-0.5 capitalize">
                              {product.type}
                            </div>
                          </td>

                          {/* Warehouse */}
                          <td className="px-6 py-4">
                            <div className="text-sm font-semibold text-gray-700">
                              {product.warehouse.name}
                            </div>
                            {product.warehouse.location && (
                              <div className="text-xs text-gray-400 mt-0.5">
                                {product.warehouse.location}
                              </div>
                            )}
                          </td>

                          {/* Current Stock vs Max */}
                          <td className="px-6 py-4">
                            <div className="text-sm font-bold text-gray-900">
                              {product.current_stock}{' '}
                              <span className="text-xs font-normal text-gray-500 lowercase">
                                {product.unit}
                              </span>
                            </div>
                            <div className="text-xs text-gray-500 mt-0.5">
                              Capacity: {product.max_stock_level} max
                            </div>
                          </td>

                          {/* Utilization Bar */}
                          <td className="px-6 py-4">
                            <div className="w-32">
                              <div className="flex justify-between items-center text-xs font-bold text-gray-600 mb-1">
                                <span>{pct}%</span>
                              </div>
                              <div
                                className="w-full bg-gray-100 rounded-full h-2 overflow-hidden"
                                role="progressbar"
                                aria-valuenow={pct}
                                aria-valuemin={0}
                                aria-valuemax={100}
                              >
                                <div
                                  className={`h-full rounded-full transition-all duration-500 ${barFillColor}`}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </div>
                          </td>

                          {/* Status Badge */}
                          <td className="px-6 py-4">
                            {isLow ? (
                              <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset bg-rose-50 text-rose-700 ring-rose-600/20 uppercase tracking-wide">
                                Low Stock
                              </span>
                            ) : (
                              <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset bg-green-50 text-green-700 ring-green-600/20 uppercase tracking-wide">
                                Normal
                              </span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={() => openModal(product)}
                              className="inline-flex items-center gap-1 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 hover:text-indigo-600 hover:border-indigo-200 transition-all cursor-pointer shadow-xs"
                            >
                              Update Stock
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination Controls */}
          {showPagination && (
            <div className="flex items-center justify-between border-t border-gray-100 pt-4 px-1">
              <button
                onClick={() => loadStockData(page - 1, activeTab)}
                disabled={page <= 1 || isLoading}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-xs"
              >
                Previous
              </button>
              <span className="text-xs font-semibold text-gray-600">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => loadStockData(page + 1, activeTab)}
                disabled={page >= totalPages || isLoading}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-xs"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}

      {/* ─── Modal: Update Stock ──────────────────────────────────────────────── */}
      {updatingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-[fadeIn_0.2s_ease-out]">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 max-w-md w-full overflow-hidden p-6 animate-[scaleIn_0.2s_ease-out]">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Update Stock Level</h3>
                <p className="text-sm font-semibold text-indigo-600 mt-1">
                  {updatingProduct.name}
                </p>
              </div>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-gray-100 cursor-pointer"
                aria-label="Close modal"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-gray-50/70 rounded-xl p-4 border border-gray-100 flex justify-between items-center text-sm">
                <div>
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-widest block">
                    Current Stock
                  </span>
                  <span className="text-lg font-extrabold text-gray-900 mt-0.5">
                    {updatingProduct.current_stock} {updatingProduct.unit}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-widest block">
                    Max Capacity
                  </span>
                  <span className="text-sm font-bold text-gray-700 mt-0.5">
                    {updatingProduct.max_stock_level} {updatingProduct.unit}
                  </span>
                </div>
              </div>

              {validationError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-xl">
                  {validationError}
                </div>
              )}

              <form onSubmit={handleUpdateSubmit} className="space-y-4">
                <div>
                  <label
                    htmlFor="new-stock-input"
                    className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5"
                  >
                    New Stock Level ({updatingProduct.unit})
                  </label>
                  <input
                    id="new-stock-input"
                    type="number"
                    min="0"
                    max={updatingProduct.max_stock_level}
                    value={newStockValue}
                    onChange={(e) => {
                      setNewStockValue(e.target.value);
                      setValidationError(null);
                    }}
                    placeholder={`e.g. ${updatingProduct.current_stock}`}
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-all"
                    disabled={isSubmittingUpdate}
                    autoFocus
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-all cursor-pointer shadow-xs"
                    disabled={isSubmittingUpdate}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
                    disabled={isSubmittingUpdate}
                  >
                    {isSubmittingUpdate ? (
                      <>
                        <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          />
                        </svg>
                        Updating...
                      </>
                    ) : (
                      'Save Changes'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
