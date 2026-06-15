import { useCallback } from 'react';
import { fetchStock } from '../../api/worker/workerApi';
import type { WorkerProduct } from '../../types/workerApi';
import { usePaginatedFetch } from '../../hooks/usePaginatedFetch';

// Percentage calculation helper
function stockPercent(product: WorkerProduct) {
  if (!product.max_stock_level) return 0;
  return Math.min(100, Math.round((product.current_stock / product.max_stock_level) * 100));
}

function StockBar({ pct }: { pct: number }) {
  // Red if <= 30%, Amber if <= 60%, Emerald if > 60%
  const barFillColor =
    pct <= 30 ? 'bg-rose-500' : pct <= 60 ? 'bg-amber-500' : 'bg-emerald-500';

  return (
    <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
      <div className={`h-full rounded-full transition-all duration-500 ${barFillColor}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function StockCard({ product }: { product: WorkerProduct }) {
  const pct = stockPercent(product);
  // Low stock warning badge if current_stock <= max_stock_level * 0.30
  const isLow = product.max_stock_level > 0 && product.current_stock <= product.max_stock_level * 0.30;

  return (
    <article
      id={`stock-card-${product.id}`}
      className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs hover:shadow-md transition-all duration-300 flex flex-col justify-between"
    >
      <div>
        {/* Header */}
        <div className="flex justify-between items-start gap-4 mb-4">
          <div className="min-w-0 flex-1">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block truncate">
              {product.type || 'Product'}
            </span>
            <h2 className="text-lg font-extrabold text-gray-900 mt-0.5 block truncate" title={product.name}>
              {product.name}
            </h2>
          </div>
          {isLow && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border bg-rose-50 text-rose-700 border-rose-200 uppercase tracking-wider shrink-0">
              Low Stock
            </span>
          )}
        </div>

        {/* Current Stock vs Max Stock */}
        <div className="flex justify-between items-end mb-4">
          <div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">
              Current Levels
            </span>
            <span className="text-2xl font-black text-gray-900">
              {product.current_stock}
              <span className="text-sm font-semibold text-gray-500 lowercase ml-1">
                {product.unit || 'units'}
              </span>
            </span>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">
              Capacity
            </span>
            <span className="text-sm font-bold text-gray-700">
              {product.max_stock_level}
              <span className="text-xs font-normal text-gray-500 ml-1">
                max
              </span>
            </span>
          </div>
        </div>

        {/* Progress Bar & Percentage */}
        <div className="mb-4">
          <div className="flex justify-between text-xs font-bold text-gray-600 mb-1">
            <span>Utilization</span>
            <span>{pct}%</span>
          </div>
          <StockBar pct={pct} />
        </div>
      </div>

      {/* Warehouse Section */}
      <div className="border-t border-gray-100 pt-4 mt-2">
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5">
          Warehouse Location
        </span>
        <div className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-700 text-xs font-bold shrink-0">
            🏢
          </span>
          <div className="min-w-0">
            <span className="text-sm font-bold text-gray-900 block truncate" title={product.warehouse.name}>
              {product.warehouse.name}
            </span>
            {product.warehouse.location && (
              <span className="text-xs text-gray-500 block truncate" title={product.warehouse.location}>
                {product.warehouse.location}
              </span>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

function StockCardSkeleton() {
  return (
    <div className="animate-pulse border border-gray-200 rounded-2xl p-6 bg-white space-y-5 shadow-xs flex flex-col justify-between h-[280px]">
      <div>
        <div className="flex justify-between items-center mb-4">
          <div className="space-y-2 flex-1">
            <div className="h-2.5 w-16 bg-gray-200 rounded"></div>
            <div className="h-5 w-36 bg-gray-200 rounded-md"></div>
          </div>
          <div className="h-5 w-20 bg-gray-200 rounded-full shrink-0"></div>
        </div>
        <div className="flex justify-between items-end mb-4 pt-2">
          <div className="space-y-2">
            <div className="h-2.5 w-20 bg-gray-200 rounded"></div>
            <div className="h-7 w-24 bg-gray-200 rounded-md"></div>
          </div>
          <div className="space-y-2 text-right">
            <div className="h-2.5 w-12 bg-gray-200 rounded ml-auto"></div>
            <div className="h-5 w-16 bg-gray-200 rounded-md"></div>
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between">
            <div className="h-2.5 w-16 bg-gray-200 rounded"></div>
            <div className="h-2.5 w-8 bg-gray-200 rounded"></div>
          </div>
          <div className="h-2.5 w-full bg-gray-200 rounded-full"></div>
        </div>
      </div>
      <div className="border-t border-gray-100 pt-4 mt-2">
        <div className="h-2.5 w-28 bg-gray-200 rounded mb-2"></div>
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 bg-gray-200 rounded-lg shrink-0"></div>
          <div className="space-y-1.5 flex-1 min-w-0">
            <div className="h-3 w-28 bg-gray-200 rounded"></div>
            <div className="h-2.5 w-36 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function StockPage() {
  const fetcher = useCallback((page: number) => fetchStock(page), []);

  const { data, page, setPage, totalPages, loading, error, reload } =
    usePaginatedFetch<WorkerProduct>(fetcher);

  return (
    <div className="space-y-6">
      {/* Heading Row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Stock Levels</h1>
          <p className="text-sm text-gray-500 mt-1">
            Current inventory levels across all warehouses.
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
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <StockCardSkeleton key={n} />
          ))}
        </div>
      ) : error ? (
        // Error State
        <div className="flex flex-col items-center justify-center p-8 border border-red-100 bg-red-50/50 rounded-2xl text-center max-w-lg mx-auto">
          <span className="flex items-center justify-center h-12 w-12 rounded-full bg-red-100 text-red-600 mb-4 font-bold text-xl">
            !
          </span>
          <h3 className="text-base font-bold text-gray-955">Unable to load stock levels</h3>
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
            📦
          </span>
          <h3 className="text-base font-bold text-gray-955">No stock data available.</h3>
        </div>
      ) : (
        // Populated State
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {data.map((product) => (
              <StockCard key={product.id} product={product} />
            ))}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 pt-6">
              <button
                id="stock-prev"
                onClick={() => setPage((p) => p - 1)}
                disabled={page === 1}
                className="inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-xs font-semibold text-gray-700 shadow-xs hover:bg-gray-50 hover:text-gray-955 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
              >
                ← Prev
              </button>
              <span className="text-sm font-semibold text-gray-700">
                Page {page} of {totalPages}
              </span>
              <button
                id="stock-next"
                onClick={() => setPage((p) => p + 1)}
                disabled={page === totalPages}
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

