import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/auth/LoginPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';
import ChangePasswordPage from './pages/auth/ChangePasswordPage';
import WorkerLayout from './pages/worker/WorkerLayout';
import MyOrdersPage from './pages/worker/MyOrdersPage';
import AllOrdersPage from './pages/worker/AllOrdersPage';
import StockPage from './pages/worker/StockPage';
import ProfilePage from './pages/worker/ProfilePage';
import ManagerDashboard from './pages/manager/ManagerDashboard';
import OwnerDashboard from './pages/owner/OwnerDashboard';
import ProtectedRoute from './components/ProtectedRoute';

export default function App() {
  return (
    <BrowserRouter>
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

          <Route path="my-orders"  element={<MyOrdersPage />} />
          <Route path="all-orders" element={<AllOrdersPage />} />
          <Route path="stock"      element={<StockPage />} />
          <Route path="profile"    element={<ProfilePage />} />

          {/* Legacy: /worker/dashboard (login redirects here) → /worker/my-orders */}
          <Route path="dashboard" element={<Navigate to="/worker/my-orders" replace />} />
        </Route>

        {/* Protected — Manager */}
        <Route
          path="/manager/dashboard"
          element={
            <ProtectedRoute requiredRole="manager">
              <ManagerDashboard />
            </ProtectedRoute>
          }
        />

        {/* Protected — Owner */}
        <Route
          path="/owner/dashboard"
          element={
            <ProtectedRoute requiredRole="owner">
              <OwnerDashboard />
            </ProtectedRoute>
          }
        />

        {/* Root → login */}
        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* Catch-all → login */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
