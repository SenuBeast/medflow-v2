import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuth } from './hooks/useAuth';
import LoginPage from './pages/LoginPage';
import POSPage from './pages/POSPage';
import ReceiptPage from './pages/ReceiptPage';
import { ProtectedRoute } from './components/ProtectedRoute';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  const { isInitialized } = useAuth();

  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center h-screen w-screen bg-pos-bg text-pos-primary">
        <div className="animate-pulse flex gap-2 items-center">
          <div className="w-4 h-4 rounded-full bg-pos-primary animate-bounce" />
          <div className="w-4 h-4 rounded-full bg-pos-primary animate-bounce delay-75" />
          <div className="w-4 h-4 rounded-full bg-pos-primary animate-bounce delay-150" />
        </div>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          {/* POS Dashboard */}
          <Route element={<ProtectedRoute requiredPermission="sales.create" />}>
            <Route path="/" element={<POSPage />} />
          </Route>

          {/* Receipt View */}
          <Route element={<ProtectedRoute requiredPermission="sales.create" />}>
            <Route path="/receipt/:id" element={<ReceiptPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
