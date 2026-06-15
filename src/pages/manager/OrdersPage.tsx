export default function OrdersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Orders</h1>
        <p className="text-sm text-gray-500 mt-1">
          Monitor and manage all system-wide orders here.
        </p>
      </div>

      <div className="border border-dashed border-gray-300 rounded-2xl p-12 flex flex-col items-center justify-center text-center bg-white">
        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 text-lg mb-4">
          📋
        </span>
        <h3 className="text-base font-bold text-gray-900">Orders Panel</h3>
        <p className="text-sm text-gray-500 mt-1 max-w-sm">
          System-wide order lists, sorting, and manager actions will appear here.
        </p>
      </div>
    </div>
  );
}
