export default function PurchaseOrdersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Purchase Orders</h1>
        <p className="text-sm text-gray-500 mt-1">
          Review and approve incoming replenishment purchase orders.
        </p>
      </div>

      <div className="border border-dashed border-gray-300 rounded-2xl p-12 flex flex-col items-center justify-center text-center bg-white">
        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 text-lg mb-4">
          🛒
        </span>
        <h3 className="text-base font-bold text-gray-900">Purchase Order Requests</h3>
        <p className="text-sm text-gray-500 mt-1 max-w-sm">
          Pending purchase orders, supplier information, and approval flow will appear here.
        </p>
      </div>
    </div>
  );
}
