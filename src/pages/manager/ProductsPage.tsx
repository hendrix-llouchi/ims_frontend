import { useEffect, useState, useCallback } from 'react';
import { useNotificationStore } from '../../store/notificationStore';
import {
  fetchProducts,
  fetchProductDetails,
  createProduct,
  updateProduct,
  fetchSharedWarehouses,
} from '../../api/manager/managerApi';
import type { WorkerProduct, WorkerProductWarehouse } from '../../types/workerApi';

const UNIT_OPTIONS = ['bags', 'boxes', 'kg', 'litres', 'units', 'other'];

export default function ProductsPage() {
  const { addNotification } = useNotificationStore();

  // Products list state
  const [products, setProducts] = useState<WorkerProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination state
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Warehouse list for dropdown options
  const [warehouses, setWarehouses] = useState<WorkerProductWarehouse[]>([]);
  const [isLoadingWarehouses, setIsLoadingWarehouses] = useState(false);

  // Create Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createType, setCreateType] = useState('');
  const [createDescription, setCreateDescription] = useState('');
  const [createUnit, setCreateUnit] = useState('');
  const [createWarehouseId, setCreateWarehouseId] = useState<number | ''>('');
  const [createMaxStock, setCreateMaxStock] = useState<number | ''>('');
  const [createCurrentStock, setCreateCurrentStock] = useState<number>(0);
  const [isSubmittingCreate, setIsSubmittingCreate] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Edit Modal State
  const [editingProductId, setEditingProductId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editType, setEditType] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editUnit, setEditUnit] = useState('');
  const [editWarehouseId, setEditWarehouseId] = useState<number | ''>('');
  const [editMaxStock, setEditMaxStock] = useState<number | ''>('');
  const [editCurrentStock, setEditCurrentStock] = useState<number>(0);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Fetch products
  const loadProducts = useCallback(
    async (targetPage = page) => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetchProducts(targetPage);
        setProducts(res.data || []);
        setPage(res.current_page);
        setTotalPages(res.last_page);
      } catch (err: unknown) {
        const axiosError = err as { response?: { data?: { message?: string } } };
        const errMsg =
          axiosError.response?.data?.message || 'Failed to load products. Please try again.';
        setError(errMsg);
      } finally {
        setIsLoading(false);
      }
    },
    [page]
  );

  // Fetch warehouses list (shared endpoint)
  const loadWarehouses = useCallback(async () => {
    setIsLoadingWarehouses(true);
    try {
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
    } catch (err) {
      console.error('Failed to load warehouses list:', err);
    } finally {
      setIsLoadingWarehouses(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadProducts(1);
      loadWarehouses();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadProducts, loadWarehouses]);

  // Open Create Modal
  const openCreateModal = () => {
    setCreateName('');
    setCreateType('');
    setCreateDescription('');
    setCreateUnit('');
    setCreateWarehouseId('');
    setCreateMaxStock('');
    setCreateCurrentStock(0);
    setCreateError(null);
    setIsCreateOpen(true);
  };

  // Close Create Modal
  const closeCreateModal = () => {
    setIsCreateOpen(false);
    setCreateName('');
    setCreateType('');
    setCreateDescription('');
    setCreateUnit('');
    setCreateWarehouseId('');
    setCreateMaxStock('');
    setCreateCurrentStock(0);
    setCreateError(null);
  };

  // Open Edit Modal
  const handleEditClick = async (product: WorkerProduct) => {
    setEditingProductId(product.id);
    setEditName(product.name);
    setEditType(product.type);
    setEditDescription(product.description || '');
    setEditUnit(product.unit);
    setEditWarehouseId(product.warehouse?.id || '');
    setEditMaxStock(product.max_stock_level);
    setEditCurrentStock(product.current_stock);
    setEditError(null);
    setIsLoadingDetails(true);

    try {
      const res = await fetchProductDetails(product.id);
      if (res.product) {
        setEditName(res.product.name);
        setEditType(res.product.type);
        setEditDescription(res.product.description || '');
        setEditUnit(res.product.unit);
        setEditWarehouseId(res.product.warehouse?.id || '');
        setEditMaxStock(res.product.max_stock_level);
        setEditCurrentStock(res.product.current_stock);
      }
    } catch (err) {
      console.warn('Failed to fetch latest product details, using list values:', err);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  // Close Edit Modal
  const closeEditModal = () => {
    setEditingProductId(null);
    setEditName('');
    setEditType('');
    setEditDescription('');
    setEditUnit('');
    setEditWarehouseId('');
    setEditMaxStock('');
    setEditCurrentStock(0);
    setEditError(null);
  };

  // Create Product Submit Handler
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const nameTrim = createName.trim();
    const typeTrim = createType.trim();
    const unitTrim = createUnit;
    const warehouseIdNum = createWarehouseId === '' ? null : Number(createWarehouseId);
    const maxStockNum = createMaxStock === '' ? null : Number(createMaxStock);

    // Validation checks
    if (
      !nameTrim ||
      !typeTrim ||
      !unitTrim ||
      warehouseIdNum === null ||
      maxStockNum === null ||
      maxStockNum <= 0
    ) {
      setCreateError('Please fill in all required fields.');
      return;
    }

    setIsSubmittingCreate(true);
    setCreateError(null);

    try {
      await createProduct({
        name: nameTrim,
        type: typeTrim,
        description: createDescription.trim() || null,
        unit: unitTrim,
        warehouse_id: warehouseIdNum,
        max_stock_level: maxStockNum,
        current_stock: createCurrentStock,
      });

      addNotification({
        id: Math.random().toString(36).substring(7),
        message: 'Product created successfully.',
        type: 'success',
        createdAt: new Date(),
      });

      closeCreateModal();
      loadProducts(page);
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { message?: string } } };
      const errMsg =
        axiosError.response?.data?.message || 'Failed to create product. Please try again.';
      setCreateError(errMsg);
    } finally {
      setIsSubmittingCreate(false);
    }
  };

  // Edit Product Submit Handler
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingProductId === null) return;

    const nameTrim = editName.trim();
    const typeTrim = editType.trim();
    const unitTrim = editUnit;
    const warehouseIdNum = editWarehouseId === '' ? null : Number(editWarehouseId);
    const maxStockNum = editMaxStock === '' ? null : Number(editMaxStock);

    // Validation checks
    if (
      !nameTrim ||
      !typeTrim ||
      !unitTrim ||
      warehouseIdNum === null ||
      maxStockNum === null ||
      maxStockNum <= 0
    ) {
      setEditError('Please fill in all required fields.');
      return;
    }

    setIsSubmittingEdit(true);
    setEditError(null);

    try {
      await updateProduct(editingProductId, {
        name: nameTrim,
        type: typeTrim,
        description: editDescription.trim() || null,
        unit: unitTrim,
        warehouse_id: warehouseIdNum,
        max_stock_level: maxStockNum,
        current_stock: editCurrentStock,
      });

      addNotification({
        id: Math.random().toString(36).substring(7),
        message: 'Product updated successfully.',
        type: 'success',
        createdAt: new Date(),
      });

      closeEditModal();
      loadProducts(page);
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { message?: string } } };
      const errMsg =
        axiosError.response?.data?.message || 'Failed to update product. Please try again.';
      setEditError(errMsg);
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  const renderSkeletonRows = () => {
    return Array.from({ length: 5 }).map((_, idx) => (
      <tr key={idx} className="animate-pulse">
        <td className="px-6 py-4">
          <div className="h-4 bg-gray-200 rounded w-2/3 mb-1"></div>
        </td>
        <td className="px-6 py-4">
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </td>
        <td className="px-6 py-4">
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </td>
        <td className="px-6 py-4">
          <div className="h-4 bg-gray-200 rounded w-1/3"></div>
        </td>
        <td className="px-6 py-4">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
        </td>
        <td className="px-6 py-4 text-right">
          <div className="h-8 bg-gray-200 rounded-xl w-16 ml-auto"></div>
        </td>
      </tr>
    ));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Products</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage your company's product metadata catalog, definitions, and categories.
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-indigo-700 transition-all cursor-pointer"
        >
          <span>➕ Create Product</span>
        </button>
      </div>

      {/* Main Content Area */}
      {error ? (
        // Error State
        <div className="border border-red-200 rounded-2xl p-6 bg-red-50 text-center max-w-lg mx-auto">
          <span className="text-2xl mb-2 block">⚠️</span>
          <h3 className="text-sm font-bold text-red-900 font-sans">Failed to Load Products</h3>
          <p className="text-xs text-red-700 mt-1 mb-4">{error}</p>
          <button
            onClick={() => loadProducts(page)}
            className="inline-flex items-center justify-center rounded-xl bg-white border border-red-200 px-4 py-2 text-xs font-semibold text-red-700 hover:bg-red-100 transition-all cursor-pointer"
          >
            Retry
          </button>
        </div>
      ) : !isLoading && products.length === 0 ? (
        // Empty State
        <div className="border border-dashed border-gray-300 rounded-2xl p-12 flex flex-col items-center justify-center text-center bg-white max-w-lg mx-auto">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 text-lg mb-4">
            📦
          </span>
          <h3 className="text-base font-bold text-gray-900 font-sans">No products yet. Create your first one.</h3>
          <p className="text-sm text-gray-500 mt-1 max-w-sm">
            Add product details to get started with purchase orders and stock tracking.
          </p>
          <button
            onClick={openCreateModal}
            className="mt-5 inline-flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-indigo-700 transition-all cursor-pointer"
          >
            Create Product
          </button>
        </div>
      ) : (
        // Populated Table State
        <div className="space-y-4">
          <div className="border border-gray-200 rounded-2xl bg-white shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="bg-gray-50/50 border-b border-gray-100">
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      Product Name
                    </th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      Type/Category
                    </th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      Warehouse
                    </th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      Unit
                    </th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      Max Stock Level
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
                    products.map((product) => (
                      <tr key={product.id} className="hover:bg-gray-50/40 transition-colors">
                        <td className="px-6 py-4">
                          <div className="text-sm font-bold text-gray-900">{product.name}</div>
                          {product.description && (
                            <div className="text-xs text-gray-400 truncate max-w-xs mt-0.5" title={product.description}>
                              {product.description}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700">
                            {product.type}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-600 font-semibold">{product.warehouse?.name || 'N/A'}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-600 capitalize">{product.unit}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900 font-bold">{product.max_stock_level}</div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => handleEditClick(product)}
                            className="inline-flex items-center gap-1 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 hover:text-indigo-600 hover:border-indigo-200 transition-all cursor-pointer shadow-xs"
                          >
                            Edit
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination Controls */}
          {!isLoading && totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-gray-100 pt-4 px-1">
              <button
                onClick={() => loadProducts(page - 1)}
                disabled={page <= 1 || isLoading}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-xs"
              >
                Previous
              </button>
              <span className="text-xs font-semibold text-gray-600">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => loadProducts(page + 1)}
                disabled={page >= totalPages || isLoading}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-xs"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}

      {/* ─── Modal: Create Product ──────────────────────────────────────────── */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-[fadeIn_0.2s_ease-out]">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 max-w-lg w-full overflow-hidden p-6 animate-[scaleIn_0.2s_ease-out]">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Create Product</h3>
                <p className="text-xs text-gray-500 mt-0.5">Add a new product with custom details, unit of measure, and default warehouse.</p>
              </div>
              <button
                onClick={closeCreateModal}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-gray-100 cursor-pointer"
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              {createError && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl p-3 animate-[pulse_1s_infinite]">
                  {createError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="create-name" className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                    Product Name *
                  </label>
                  <input
                    type="text"
                    id="create-name"
                    value={createName}
                    onChange={(e) => setCreateName(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                    placeholder="e.g. Steel Pipe"
                    autoFocus
                  />
                </div>

                <div>
                  <label htmlFor="create-type" className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                    Type/Category *
                  </label>
                  <input
                    type="text"
                    id="create-type"
                    value={createType}
                    onChange={(e) => setCreateType(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                    placeholder="e.g. Raw Materials"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="create-description" className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                  Description
                </label>
                <textarea
                  id="create-description"
                  value={createDescription}
                  onChange={(e) => setCreateDescription(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                  placeholder="Optional product description..."
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="create-unit" className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                    Unit of Measurement *
                  </label>
                  <select
                    id="create-unit"
                    value={createUnit}
                    onChange={(e) => setCreateUnit(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                  >
                    <option value="">Select a unit...</option>
                    {UNIT_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt.charAt(0).toUpperCase() + opt.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="create-warehouse" className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                    Warehouse *
                  </label>
                  <select
                    id="create-warehouse"
                    value={createWarehouseId}
                    onChange={(e) => setCreateWarehouseId(e.target.value === '' ? '' : Number(e.target.value))}
                    disabled={isLoadingWarehouses}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all disabled:opacity-50"
                  >
                    <option value="">
                      {isLoadingWarehouses ? 'Loading warehouses...' : 'Select a warehouse...'}
                    </option>
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name} ({w.location})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="create-max-stock" className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                    Max Stock Level *
                  </label>
                  <input
                    type="number"
                    id="create-max-stock"
                    min="1"
                    value={createMaxStock}
                    onChange={(e) => setCreateMaxStock(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                    placeholder="e.g. 500"
                  />
                </div>

                <div>
                  <label htmlFor="create-current-stock" className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                    Current Stock
                  </label>
                  <input
                    type="number"
                    id="create-current-stock"
                    min="0"
                    value={createCurrentStock}
                    onChange={(e) => setCreateCurrentStock(Number(e.target.value))}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                    placeholder="Default 0"
                  />
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={closeCreateModal}
                  className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingCreate}
                  className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-indigo-700 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isSubmittingCreate ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Modal: Edit Product ────────────────────────────────────────────── */}
      {editingProductId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-[fadeIn_0.2s_ease-out]">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 max-w-lg w-full overflow-hidden p-6 animate-[scaleIn_0.2s_ease-out]">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Edit Product</h3>
                <p className="text-xs text-gray-500 mt-0.5">Update details for the selected product. Warehouse cannot be changed after creation.</p>
              </div>
              <button
                onClick={closeEditModal}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-gray-100 cursor-pointer"
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            {isLoadingDetails ? (
              <div className="space-y-4 py-6 text-center">
                <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-solid border-indigo-600 border-r-transparent"></div>
                <p className="text-xs text-gray-500 font-semibold">Loading product details...</p>
              </div>
            ) : (
              <form onSubmit={handleEditSubmit} className="space-y-4">
                {editError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl p-3 animate-[pulse_1s_infinite]">
                    {editError}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="edit-name" className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                      Product Name *
                    </label>
                    <input
                      type="text"
                      id="edit-name"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                      placeholder="e.g. Steel Pipe"
                      autoFocus
                    />
                  </div>

                  <div>
                    <label htmlFor="edit-type" className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                      Type/Category *
                    </label>
                    <input
                      type="text"
                      id="edit-type"
                      value={editType}
                      onChange={(e) => setEditType(e.target.value)}
                      className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                      placeholder="e.g. Raw Materials"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="edit-description" className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                    Description
                  </label>
                  <textarea
                    id="edit-description"
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                    placeholder="Optional product description..."
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="edit-unit" className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                      Unit of Measurement *
                    </label>
                    <select
                      id="edit-unit"
                      value={editUnit}
                      onChange={(e) => setEditUnit(e.target.value)}
                      className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                    >
                      <option value="">Select a unit...</option>
                      {UNIT_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt.charAt(0).toUpperCase() + opt.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="edit-warehouse" className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                      Warehouse (Disabled)
                    </label>
                    <select
                      id="edit-warehouse"
                      value={editWarehouseId}
                      disabled={true}
                      className="w-full rounded-xl border border-gray-200 bg-gray-100 px-3 py-2 text-sm text-gray-500 focus:outline-none cursor-not-allowed"
                    >
                      <option value="">Select a warehouse...</option>
                      {warehouses.map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.name} ({w.location})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="edit-max-stock" className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                      Max Stock Level *
                    </label>
                    <input
                      type="number"
                      id="edit-max-stock"
                      min="1"
                      value={editMaxStock}
                      onChange={(e) => setEditMaxStock(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                      placeholder="e.g. 500"
                    />
                  </div>

                  <div>
                    <label htmlFor="edit-current-stock" className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                      Current Stock
                    </label>
                    <input
                      type="number"
                      id="edit-current-stock"
                      min="0"
                      value={editCurrentStock}
                      onChange={(e) => setEditCurrentStock(Number(e.target.value))}
                      className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                    />
                  </div>
                </div>

                <div className="flex gap-3 justify-end pt-2">
                  <button
                    type="button"
                    onClick={closeEditModal}
                    className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingEdit}
                    className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-indigo-700 transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {isSubmittingEdit ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
