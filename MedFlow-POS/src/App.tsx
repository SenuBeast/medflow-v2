import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuth } from './hooks/useAuth';
import LoginPage from './pages/LoginPage';
import AuthCallbackPage from './pages/AuthCallbackPage';
import POSPage from './pages/POSPage';
import ReceiptPage from './pages/ReceiptPage';
import { ProtectedRoute } from './components/ProtectedRoute';
import { EmbeddedLayout } from './components/EmbeddedLayout';
import { isEmbedded } from './lib/environment';
import { listenForParentAuth } from './lib/embeddedAuth';
import { useEffect, useState } from 'react';

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
    const embedded = isEmbedded();
    const [embeddedReady, setEmbeddedReady] = useState(false);

    // When embedded, listen for auth token from MedFlow parent
    useEffect(() => {
        if (!embedded) return;

        listenForParentAuth();

        // Mark ready after a short delay for session restoration
        const timeout = setTimeout(() => setEmbeddedReady(true), 2000);
        return () => clearTimeout(timeout);
    }, [embedded]);

    // Standalone mode: show loading spinner during auth init
    if (!embedded && !isInitialized) {
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

    // Embedded mode: wait for parent token
    if (embedded && !isInitialized && !embeddedReady) {
        return (
            <EmbeddedLayout>
                <div className="flex items-center justify-center h-full">
                    <div className="flex flex-col items-center gap-3">
                        <div className="w-8 h-8 border-3 border-pos-accent border-t-transparent rounded-full animate-spin" />
                        <p className="text-sm text-pos-text-muted">Connecting to MedFlow...</p>
                    </div>
                </div>
            </EmbeddedLayout>
        );
    }

    // Embedded mode: wrap in minimal layout, skip login route
    if (embedded) {
        return (
            <QueryClientProvider client={queryClient}>
                <EmbeddedLayout>
                    <BrowserRouter>
                        <Routes>
                            <Route element={<ProtectedRoute requiredPermission="sales.create" />}>
                                <Route path="/" element={<POSPage />} />
                            </Route>
                            <Route element={<ProtectedRoute requiredPermission="sales.create" />}>
                                <Route path="/receipt/:id" element={<ReceiptPage />} />
                            </Route>
                            <Route path="*" element={<Navigate to="/" replace />} />
                        </Routes>
                    </BrowserRouter>
                </EmbeddedLayout>
            </QueryClientProvider>
        );
    }

    // Standalone mode: full POS with own login
    return (
        <QueryClientProvider client={queryClient}>
            <BrowserRouter>
                <Routes>
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/auth/callback" element={<AuthCallbackPage />} />

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
