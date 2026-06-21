import React, { useEffect, useState, useCallback } from 'react';
import { fetchOwnerStock } from '../../api/owner/ownerApi';
import type { OwnerProduct } from '../../types/ownerApi';

interface WarehouseItem {
  id: number;
  name: string;
}

export default function StockOverviewPage() {
  const [products, setProducts] = useState<OwnerProduct[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters state
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState<string | number>('all');

  // Pagination state
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);

  // Debounce search term to avoid spamming requests
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1); // Reset page on new search
    }, 400);

    return () => clearTimeout(handler);
  }, [search]);

  // Reset page when warehouse changes
  const handleWarehouseFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setWarehouseFilter(e.target.value);
    setPage(1);
  };

  // Load stock data
  const loadStockData = useCallback(
    async (targetPage = page) => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetchOwnerStock({
          page: targetPage,
          search: debouncedSearch,
          warehouse_id: warehouseFilter === 'all' ? undefined : warehouseFilter,
        });

        setProducts(res.data);
        setPage(res.current_page);
        setTotalPages(res.last_page);
        setTotalProducts(res.total);

        // Dynamically collect and cache distinct warehouses from the returned products
        if (res.data && res.data.length > 0) {
          const fetchedWarehouses = res.data
            .map((p) => p.warehouse)
            .filter((w): w is { id: number; name: string } => !!w);

          setWarehouses((prev) => {
            const map = new Map(prev.map((w) => [w.id, w]));
            fetchedWarehouses.forEach((w) => {
              map.set(w.id, w);
            });
            return Array.from(map.values());
          });
        }
      } catch (err: unknown) {
        const axiosError = err as { response?: { status?: number; data?: { message?: string } } };
        let errMsg = 'Something went wrong. Please try again.';

        if (!axiosError.response) {
          errMsg = 'Unable to connect. Check your connection and try again.';
        } else if (axiosError.response.status === 403) {
          errMsg = "You don't have permission to view this page.";
        } else if (axiosError.response.status === 401) {
          // Cleared by interceptor, redirecting will happen automatically
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
    [debouncedSearch, warehouseFilter, page]
  );

  // Trigger data load when dependencies update
  useEffect(() => {
    loadStockData(page);
  }, [debouncedSearch, warehouseFilter]);

  // Renders standard skeleton loading rows
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
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Stock Overview</h1>
          <p className="text-sm text-gray-500 mt-1">
            Monitor inventory quantities, warehouse distribution, and low stock warnings.
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
            placeholder="Search by product name or type..."
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

        {/* Warehouse Filter */}
        <div className="w-full md:w-56">
          <select
            value={warehouseFilter}
            onChange={handleWarehouseFilterChange}
            className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm text-gray-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-all bg-white"
          >
            <option value="all">All Warehouses</option>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Content Area */}
      {isLoading && products.length === 0 ? (
        renderSkeletonRows()
      ) : error ? (
        /* Error state */
        <div className="border border-red-200 rounded-2xl p-8 bg-red-50 text-center">
          <span className="text-2xl mb-2 block">⚠️</span>
          <h3 className="text-base font-bold text-red-900">Failed to load stock</h3>
          <p className="text-sm text-red-700 mt-1 mb-4">{error}</p>
          <button
            onClick={() => loadStockData(page)}
            className="inline-flex items-center justify-center rounded-xl bg-white border border-red-200 px-4 py-2.5 text-xs font-bold text-red-700 hover:bg-red-100 transition-all cursor-pointer shadow-3xs"
          >
            Retry
          </button>
        </div>
      ) : products.length === 0 ? (
        /* Empty state */
        <div className="border border-dashed border-gray-300 rounded-2xl p-12 flex flex-col items-center justify-center text-center bg-white shadow-3xs">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 text-lg mb-4">
            📦
          </span>
          <h3 className="text-base font-bold text-gray-900">No products found</h3>
          <p className="text-sm text-gray-500 mt-1 max-w-sm">
            Try adjusting your search criteria or selecting a different warehouse.
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
                      Product Name
                    </th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      Type
                    </th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      Warehouse
                    </th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      Unit
                    </th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      Current Stock
                    </th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      Max Level
                    </th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      Stock Percentage
                    </th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {products.map((product) => {
                    const maxStock = product.max_stock_level || 1;
                    const stockPercentage = Math.round((product.current_stock / maxStock) * 100);
                    const isLow = stockPercentage <= 30;

                    return (
                      <tr
                        key={product.id}
                        className={[
                          'transition-colors',
                          isLow
                            ? 'bg-red-50/40 hover:bg-red-50/60'
                            : 'hover:bg-gray-50/40',
                        ].join(' ')}
                      >
                        {/* Product Name */}
                        <td className="px-6 py-4">
                          <div className="text-sm font-bold text-gray-900">{product.name}</div>
                        </td>

                        {/* Type */}
                        <td className="px-6 py-4 text-sm font-semibold text-gray-700 capitalize">
                          {product.type}
                        </td>

                        {/* Warehouse Name */}
                        <td className="px-6 py-4">
                          <div className="text-sm font-semibold text-gray-700">
                            {product.warehouse?.name || 'Unknown'}
                          </div>
                        </td>

                        {/* Unit */}
                        <td className="px-6 py-4 text-sm text-gray-500 lowercase">
                          {product.unit}
                        </td>

                        {/* Current Stock */}
                        <td className="px-6 py-4 text-sm font-bold text-gray-900">
                          {product.current_stock}
                        </td>

                        {/* Max Stock Level */}
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {product.max_stock_level}
                        </td>

                        {/* Stock Percentage */}
                        <td className="px-6 py-4 text-sm font-bold">
                          <div className="flex items-center gap-2">
                            <span className={isLow ? 'text-red-700 font-extrabold' : 'text-gray-700'}>
                              {stockPercentage}%
                            </span>
                            {isLow && (
                              <span className="inline-flex items-center gap-0.5 whitespace-nowrap rounded-md bg-red-100 px-1.5 py-0.5 text-[10px] font-extrabold text-red-700 ring-1 ring-inset ring-red-600/20">
                                ⚠️ Low Stock
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Status Indicator */}
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
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination Controls */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-gray-100 pt-4 px-1">
            <span className="text-xs font-semibold text-gray-500">
              Showing {products.length} of {totalProducts} products
            </span>
            <div className="flex items-center gap-3">
              <button
                onClick={() => loadStockData(page - 1)}
                disabled={page <= 1 || isLoading}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-xs"
              >
                Previous
              </button>
              <span className="text-xs font-semibold text-gray-600">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => loadStockData(page + 1)}
                disabled={page >= totalPages || isLoading}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-xs"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
