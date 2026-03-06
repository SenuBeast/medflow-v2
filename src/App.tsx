import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppLayout } from './components/layout/AppLayout';
import { ProtectedRoute, RouteGuard } from './components/auth/Guards';
import { LoginPage } from './pages/auth/LoginPage';
import { AuthCallbackPage } from './pages/auth/AuthCallbackPage';
import { DashboardPage } from './pages/DashboardPage';
import { NoAccessPage } from './pages/NoAccessPage';
import { InventoryPage } from './pages/inventory/InventoryPage';
import { StockCountsPage } from './pages/inventory/StockCountsPage';
import { StockCountSessionPage } from './pages/inventory/StockCountSessionPage';
import { ControlledSubstancesPage } from './pages/inventory/ControlledSubstancesPage';
import { SalesPage } from './pages/sales/SalesPage';
import { ReportsPage } from './pages/reports/ReportsPage';
import { AdminPage } from './pages/admin/AdminPage';
import { ToastProvider } from './components/ui/Toast';
import { PERMISSIONS } from './lib/constants';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});

// Layout wrapper that handles auth guard + layout shell
function ProtectedLayout() {
  return (
    <ProtectedRoute>
      <AppLayout>
        <Outlet />
      </AppLayout>
    </ProtectedRoute>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/auth/callback" element={<AuthCallbackPage />} />
            <Route path="/no-access" element={<NoAccessPage />} />

            {/* Protected routes with AppLayout */}
            <Route element={<ProtectedLayout />}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<DashboardPage />} />

              <Route path="inventory" element={
                <RouteGuard permission={PERMISSIONS.INVENTORY_VIEW}>
                  <InventoryPage />
                </RouteGuard>
              } />
              <Route path="controlled-substances" element={
                <RouteGuard permission={PERMISSIONS.INVENTORY_CONTROLLED_VIEW}>
                  <ControlledSubstancesPage />
                </RouteGuard>
              } />
              <Route path="inventory/stock-counts" element={
                <RouteGuard permission={PERMISSIONS.STOCK_COUNTS_PERFORM}>
                  <StockCountsPage />
                </RouteGuard>
              } />
              <Route path="inventory/stock-counts/:id" element={
                <RouteGuard permission={PERMISSIONS.STOCK_COUNTS_PERFORM}>
                  <StockCountSessionPage />
                </RouteGuard>
              } />
              <Route path="sales" element={
                <RouteGuard permission={PERMISSIONS.SALES_VIEW}>
                  <SalesPage />
                </RouteGuard>
              }
              />

              <Route
                path="/reports"
                element={
                  <RouteGuard permission={PERMISSIONS.REPORTS_VIEW}>
                    <ReportsPage />
                  </RouteGuard>
                }
              />

              <Route
                path="/admin"
                element={
                  <RouteGuard permission={PERMISSIONS.ADMIN_ACCESS_PANEL}>
                    <AdminPage />
                  </RouteGuard>
                }
              />

              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Route>

            {/* Catch-all → login */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </QueryClientProvider>
  );
}

export default App;
