import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient';
import { AppLayout } from './components/layout/AppLayout';
import { ProtectedRoute, RouteGuard } from './components/auth/Guards';
import { LoginPage } from './pages/auth/LoginPage';
import { AuthCallbackPage } from './pages/auth/AuthCallbackPage';
import { Verify2FAPage } from './pages/auth/Verify2FAPage';
import { DashboardPage } from './pages/DashboardPage';
import { NoAccessPage } from './pages/NoAccessPage';
import { InventoryPage } from './pages/inventory/InventoryPage';
import { BulkInventoryEntryPage } from './pages/inventory/BulkInventoryEntryPage';
import { GRNHistoryPage } from './pages/inventory/GRNHistoryPage';
import { StockCountsPage } from './pages/inventory/StockCountsPage';
import { StockCountSessionPage } from './pages/inventory/StockCountSessionPage';
import { ControlledSubstancesPage } from './pages/inventory/ControlledSubstancesPage';
import { SalesPage } from './pages/sales/SalesPage';
import { OverviewDashboard } from './pages/sales/OverviewDashboard';
import { TransactionsTable } from './pages/sales/TransactionsTable';
import { ProductPerformance } from './pages/sales/ProductPerformance';
import { StaffPerformance } from './pages/sales/StaffPerformance';
import { RefundsReturns } from './pages/sales/RefundsReturns';
import { SalesReports } from './pages/sales/SalesReports';
import { ReportsPage } from './pages/reports/ReportsPage';
import { AdminPage } from './pages/admin/AdminPage';
import { ProfilePage } from './pages/profile/ProfilePage';
import { ToastProvider } from './components/ui/Toast';
import { PharmacyPOSTab } from './components/pos/PharmacyPOSTab';
import { PERMISSIONS } from './lib/constants';
import { useAuthStore } from './store/authStore';
import { Loader2 } from 'lucide-react';

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
  const { isInitialized, isLoading } = useAuthStore();

  if (!isInitialized || isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/auth/callback" element={<AuthCallbackPage />} />
            <Route path="/verify-2fa" element={<Verify2FAPage />} />
            <Route path="/no-access" element={<NoAccessPage />} />

            {/* Protected routes with AppLayout */}
            <Route element={<ProtectedLayout />}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<DashboardPage />} />

              <Route path="inventory" element={
                <RouteGuard permission={PERMISSIONS.INVENTORY_PRODUCTS_VIEW}>
                  <InventoryPage />
                </RouteGuard>
              } />
              <Route path="inventory-bulk-entry" element={
                <RouteGuard permission={PERMISSIONS.INVENTORY_PRODUCTS_MANAGE}>
                  <BulkInventoryEntryPage />
                </RouteGuard>
              } />
              <Route path="inventory-grn" element={
                <RouteGuard permission={PERMISSIONS.INVENTORY_PURCHASE_MANAGE}>
                  <GRNHistoryPage />
                </RouteGuard>
              } />
              <Route path="controlled-substances" element={
                <RouteGuard permission={PERMISSIONS.INVENTORY_CONTROLLED_VIEW}>
                  <ControlledSubstancesPage />
                </RouteGuard>
              } />
              <Route path="stock-counts" element={
                <RouteGuard permission={PERMISSIONS.STOCK_COUNTS_PERFORM}>
                  <StockCountsPage />
                </RouteGuard>
              } />
              <Route path="stock-counts/:id" element={
                <RouteGuard permission={PERMISSIONS.STOCK_COUNTS_PERFORM}>
                  <StockCountSessionPage />
                </RouteGuard>
              } />
              <Route path="sales" element={
                <RouteGuard permission={PERMISSIONS.SALES_VIEW}>
                  <SalesPage />
                </RouteGuard>
              }>
                <Route index element={<Navigate to="overview" replace />} />
                <Route path="overview" element={<OverviewDashboard />} />
                <Route path="transactions" element={<TransactionsTable />} />
                <Route path="products" element={<ProductPerformance />} />
                <Route path="staff" element={<StaffPerformance />} />
                <Route path="refunds" element={<RefundsReturns />} />
                <Route path="reports" element={<SalesReports />} />
              </Route>

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

              <Route path="/profile" element={<ProfilePage />} />

              {/* Pharmacy POS — embedded iframe, visible only when POS subscription active */}
              <Route
                path="/pharmacy-pos"
                element={
                  <RouteGuard permission={PERMISSIONS.POS_ACCESS}>
                    <PharmacyPOSTab />
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
