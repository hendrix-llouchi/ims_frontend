import { useEffect, useState, useCallback } from 'react';
import { useNotificationStore } from '../../store/notificationStore';
import {
  fetchManagerWarehouses,
  fetchWarehouseDetails,
  createWarehouse,
  updateWarehouse,
} from '../../api/manager/managerApi';
import type { WorkerProductWarehouse } from '../../types/workerApi';

export default function WarehousesPage() {
  const { addNotification } = useNotificationStore();

  // Warehouses list state
  const [warehouses, setWarehouses] = useState<WorkerProductWarehouse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination state
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Create Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createLocation, setCreateLocation] = useState('');
  const [isSubmittingCreate, setIsSubmittingCreate] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Edit Modal State
  const [editingWarehouseId, setEditingWarehouseId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Load warehouses data
  const loadWarehouses = useCallback(
    async (targetPage = page) => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetchManagerWarehouses(targetPage);
        setWarehouses(res.data || []);
        setPage(res.current_page);
        setTotalPages(res.last_page);
      } catch (err: unknown) {
        const axiosError = err as { response?: { data?: { message?: string } } };
        const errMsg =
          axiosError.response?.data?.message || 'Failed to load warehouses. Please try again.';
        setError(errMsg);
      } finally {
        setIsLoading(false);
      }
    },
    [page]
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      loadWarehouses(1);
    }, 0);
    return () => clearTimeout(timer);
  }, [loadWarehouses]);

  // Open Create Modal
  const openCreateModal = () => {
    setCreateName('');
    setCreateLocation('');
    setCreateError(null);
    setIsCreateOpen(true);
  };

  // Close Create Modal
  const closeCreateModal = () => {
    setIsCreateOpen(false);
    setCreateName('');
    setCreateLocation('');
    setCreateError(null);
  };

  // Open Edit Modal & Fetch Details
  const handleEditClick = async (warehouse: WorkerProductWarehouse) => {
    setEditingWarehouseId(warehouse.id);
    setEditName(warehouse.name);
    setEditLocation(warehouse.location);
    setEditError(null);
    setIsLoadingDetails(true);

    try {
      const res = await fetchWarehouseDetails(warehouse.id);
      if (res.warehouse) {
        setEditName(res.warehouse.name);
        setEditLocation(res.warehouse.location);
      }
    } catch (err: unknown) {
      // Fallback to row data if fetch fails, but log error
      console.warn('Failed to fetch latest warehouse details, using existing values:', err);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  // Close Edit Modal
  const closeEditModal = () => {
    setEditingWarehouseId(null);
    setEditName('');
    setEditLocation('');
    setEditError(null);
  };

  // Handle Create Submit
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const nameTrim = createName.trim();
    const locationTrim = createLocation.trim();

    if (!nameTrim || !locationTrim) {
      setCreateError('Name and location are required.');
      return;
    }

    setIsSubmittingCreate(true);
    setCreateError(null);

    try {
      await createWarehouse({ name: nameTrim, location: locationTrim });
      addNotification({
        id: Math.random().toString(36).substring(7),
        message: 'Warehouse created successfully.',
        type: 'success',
        createdAt: new Date(),
      });
      closeCreateModal();
      loadWarehouses(page);
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { message?: string } } };
      const errMsg =
        axiosError.response?.data?.message || 'Failed to create warehouse. Please try again.';
      setCreateError(errMsg);
    } finally {
      setIsSubmittingCreate(false);
    }
  };

  // Handle Edit Submit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingWarehouseId === null) return;

    const nameTrim = editName.trim();
    const locationTrim = editLocation.trim();

    if (!nameTrim || !locationTrim) {
      setEditError('Name and location are required.');
      return;
    }

    setIsSubmittingEdit(true);
    setEditError(null);

    try {
      await updateWarehouse(editingWarehouseId, { name: nameTrim, location: locationTrim });
      addNotification({
        id: Math.random().toString(36).substring(7),
        message: 'Warehouse updated successfully.',
        type: 'success',
        createdAt: new Date(),
      });
      closeEditModal();
      loadWarehouses(page);
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { message?: string } } };
      const errMsg =
        axiosError.response?.data?.message || 'Failed to update warehouse. Please try again.';
      setEditError(errMsg);
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  // Skeleton rows matching the list format
  const renderSkeletonRows = () => {
    return Array.from({ length: 5 }).map((_, idx) => (
      <tr key={idx} className="animate-pulse">
        <td className="px-6 py-4">
          <div className="h-4 bg-gray-200 rounded w-2/3 mb-1"></div>
        </td>
        <td className="px-6 py-4">
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </td>
        <td className="px-6 py-4 text-right">
          <div className="h-8 bg-gray-200 rounded-xl w-16 ml-auto"></div>
        </td>
      </tr>
    ));
  };

  // Determine if product count exists in the API response (from any warehouse in dataset)
  const hasProductCount = warehouses.some((w) => w.products_count !== undefined);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Warehouses</h1>
          <p className="text-sm text-gray-500 mt-1">
            Configure system storage facilities, details, and physical locations.
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-indigo-700 transition-all cursor-pointer"
        >
          <span>➕ Create Warehouse</span>
        </button>
      </div>

      {/* Main Content Area */}
      {error ? (
        // Error State
        <div className="border border-red-200 rounded-2xl p-6 bg-red-50 text-center max-w-lg mx-auto">
          <span className="text-2xl mb-2 block">⚠️</span>
          <h3 className="text-sm font-bold text-red-900">Failed to Load Warehouses</h3>
          <p className="text-xs text-red-700 mt-1 mb-4">{error}</p>
          <button
            onClick={() => loadWarehouses(page)}
            className="inline-flex items-center justify-center rounded-xl bg-white border border-red-200 px-4 py-2 text-xs font-semibold text-red-700 hover:bg-red-100 transition-all cursor-pointer"
          >
            Retry
          </button>
        </div>
      ) : !isLoading && warehouses.length === 0 ? (
        // Empty State
        <div className="border border-dashed border-gray-300 rounded-2xl p-12 flex flex-col items-center justify-center text-center bg-white max-w-lg mx-auto">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 text-lg mb-4">
            🏢
          </span>
          <h3 className="text-base font-bold text-gray-900 font-sans">No warehouses yet. Create your first one.</h3>
          <p className="text-sm text-gray-500 mt-1 max-w-sm">
            Set up warehouse locations to start managing stock and purchase orders.
          </p>
          <button
            onClick={openCreateModal}
            className="mt-5 inline-flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-indigo-700 transition-all cursor-pointer"
          >
            Create Warehouse
          </button>
        </div>
      ) : (
        // Populated State
        <div className="space-y-4">
          <div className="border border-gray-200 rounded-2xl bg-white shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="bg-gray-50/50 border-b border-gray-100">
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      Warehouse Name
                    </th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      Location
                    </th>
                    {hasProductCount && (
                      <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                        Products Stored
                      </th>
                    )}
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {isLoading ? (
                    renderSkeletonRows()
                  ) : (
                    warehouses.map((warehouse) => (
                      <tr key={warehouse.id} className="hover:bg-gray-50/40 transition-colors">
                        <td className="px-6 py-4">
                          <div className="text-sm font-bold text-gray-900">{warehouse.name}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-600">{warehouse.location}</div>
                        </td>
                        {hasProductCount && (
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center rounded-md bg-gray-50 px-2 py-1 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-500/10">
                              {warehouse.products_count ?? 0} items
                            </span>
                          </td>
                        )}
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => handleEditClick(warehouse)}
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
                onClick={() => loadWarehouses(page - 1)}
                disabled={page <= 1 || isLoading}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-xs"
              >
                Previous
              </button>
              <span className="text-xs font-semibold text-gray-600">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => loadWarehouses(page + 1)}
                disabled={page >= totalPages || isLoading}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-xs"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}

      {/* ─── Modal: Create Warehouse ────────────────────────────────────────── */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-[fadeIn_0.2s_ease-out]">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 max-w-md w-full overflow-hidden p-6 animate-[scaleIn_0.2s_ease-out]">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Create Warehouse</h3>
                <p className="text-xs text-gray-500 mt-0.5">Define name and address location for the storage facility.</p>
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
                <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl p-3">
                  {createError}
                </div>
              )}

              <div>
                <label htmlFor="create-name" className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                  Warehouse Name
                </label>
                <input
                  type="text"
                  id="create-name"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                  placeholder="e.g. Warehouse Alpha"
                  autoFocus
                />
              </div>

              <div>
                <label htmlFor="create-location" className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                  Location
                </label>
                <input
                  type="text"
                  id="create-location"
                  value={createLocation}
                  onChange={(e) => setCreateLocation(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                  placeholder="e.g. Industrial Road 44, Suite B"
                />
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

      {/* ─── Modal: Edit Warehouse ──────────────────────────────────────────── */}
      {editingWarehouseId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-[fadeIn_0.2s_ease-out]">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 max-w-md w-full overflow-hidden p-6 animate-[scaleIn_0.2s_ease-out]">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Edit Warehouse</h3>
                <p className="text-xs text-gray-500 mt-0.5">Update details for the selected storage facility.</p>
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
                <p className="text-xs text-gray-500 font-semibold">Loading warehouse details...</p>
              </div>
            ) : (
              <form onSubmit={handleEditSubmit} className="space-y-4">
                {editError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl p-3">
                    {editError}
                  </div>
                )}

                <div>
                  <label htmlFor="edit-name" className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                    Warehouse Name
                  </label>
                  <input
                    type="text"
                    id="edit-name"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                    placeholder="e.g. Warehouse Alpha"
                    autoFocus
                  />
                </div>

                <div>
                  <label htmlFor="edit-location" className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                    Location
                  </label>
                  <input
                    type="text"
                    id="edit-location"
                    value={editLocation}
                    onChange={(e) => setEditLocation(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                    placeholder="e.g. Industrial Road 44, Suite B"
                  />
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
