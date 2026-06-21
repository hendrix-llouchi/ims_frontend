import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/auth/LoginPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';
import ChangePasswordPage from './pages/auth/ChangePasswordPage';
import WorkerLayout from './pages/worker/WorkerLayout';
import WorkerDashboard from './pages/worker/WorkerDashboard';
import AllOrdersPage from './pages/worker/AllOrdersPage';
import StockPage from './pages/worker/StockPage';
import ProfilePage from './pages/worker/ProfilePage';
import ManagerLayout from './pages/manager/ManagerLayout';
import ManagerDashboard from './pages/manager/ManagerDashboard';
import OrdersPage from './pages/manager/OrdersPage';
import WorkersPage from './pages/manager/WorkersPage';
import ManagerStockPage from './pages/manager/StockPage';
import PurchaseOrdersPage from './pages/manager/PurchaseOrdersPage';
import FlagsPage from './pages/manager/FlagsPage';
import CreateWorkerPage from './pages/manager/CreateWorkerPage';
import WarehousesPage from './pages/manager/WarehousesPage';
import ProductsPage from './pages/manager/ProductsPage';
import OwnerLayout from './pages/owner/OwnerLayout';
import UserManagementPage from './pages/owner/UserManagementPage';
import WorkerFlagsPage from './pages/owner/WorkerFlagsPage';
import ProtectedRoute from './components/ProtectedRoute';
import Toast from './components/Toast';

export default function App() {
  return (
    <BrowserRouter>
      <Toast />
      <Routes>
        {/* Public */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        {/* Protected — any authenticated user */}
        <Route
          path="/change-password"
          element={
            <ProtectedRoute>
              <ChangePasswordPage />
            </ProtectedRoute>
          }
        />

        {/* ── Worker nested layout ──────────────────────────────────────────────
            WorkerLayout IS the route element so React Router's <Outlet /> context
            is set up correctly. The ProtectedRoute guard sits one level above each
            page route so the layout can render without breaking the outlet chain. */}
        <Route
          path="/worker"
          element={
            <ProtectedRoute requiredRole="worker">
              <WorkerLayout />
            </ProtectedRoute>
          }
        >
          {/* /worker  →  /worker/my-orders (absolute to avoid relative-path glitches) */}
          <Route index element={<Navigate to="/worker/my-orders" replace />} />

          <Route path="my-orders"  element={<WorkerDashboard />} />
          <Route path="all-orders" element={<AllOrdersPage />} />
          <Route path="stock"      element={<StockPage />} />
          <Route path="profile"    element={<ProfilePage />} />

          {/* Legacy: /worker/dashboard (login redirects here) → /worker/my-orders */}
          <Route path="dashboard" element={<Navigate to="/worker/my-orders" replace />} />
        </Route>

        {/* ── Manager nested layout ───────────────────────────────────────────── */}
        <Route
          path="/manager"
          element={
            <ProtectedRoute requiredRole="manager">
              <ManagerLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/manager/orders" replace />} />
          <Route path="dashboard" element={<ManagerDashboard />} />
          <Route path="orders" element={<OrdersPage />} />
          <Route path="workers" element={<WorkersPage />} />
          <Route path="create-worker" element={<CreateWorkerPage />} />
          <Route path="warehouses" element={<WarehousesPage />} />
          <Route path="products" element={<ProductsPage />} />
          <Route path="stock" element={<ManagerStockPage />} />
          <Route path="purchase-orders" element={<PurchaseOrdersPage />} />
          <Route path="flags" element={<FlagsPage />} />
        </Route>

        {/* Protected — Owner */}
        <Route
          path="/owner"
          element={
            <ProtectedRoute requiredRole="owner">
              <OwnerLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/owner/users" replace />} />
          <Route path="dashboard" element={<Navigate to="/owner/users" replace />} />
          <Route path="users" element={<UserManagementPage />} />
          <Route path="worker-flags" element={<WorkerFlagsPage />} />
        </Route>

        {/* Root → login */}
        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* Catch-all → login */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
