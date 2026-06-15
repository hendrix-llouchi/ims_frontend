export default function StockPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Stock</h1>
        <p className="text-sm text-gray-500 mt-1">
          Monitor inventory levels and capacity across all warehouses.
        </p>
      </div>

      <div className="border border-dashed border-gray-300 rounded-2xl p-12 flex flex-col items-center justify-center text-center bg-white">
        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 text-lg mb-4">
          📦
        </span>
        <h3 className="text-base font-bold text-gray-900">Stock Control</h3>
        <p className="text-sm text-gray-500 mt-1 max-w-sm">
          Overview of stock adjustments, low-stock warnings, and threshold management.
        </p>
      </div>
    </div>
  );
}
