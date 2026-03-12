import { Navigate, Outlet } from 'react-router-dom';
import { usePermissions } from '../hooks/usePermissions';
import { ShieldAlert } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

interface ProtectedRouteProps {
    requiredPermission?: string;
}

export const ProtectedRoute = ({ requiredPermission = 'sales.create' }: ProtectedRouteProps) => {
    const { hasPermission, loading } = usePermissions(requiredPermission);
    const { user, isInitialized, isLoading, signOut } = useAuth();

    if (!isInitialized || loading || isLoading) {
        return (
            <div className="flex h-screen items-center justify-center bg-pos-bg text-pos-text">
                <div className="animate-pulse flex flex-col items-center">
                    <div className="w-12 h-12 border-4 border-pos-accent border-t-transparent rounded-full animate-spin mb-4"></div>
                    <p>Verifying secure session...</p>
                </div>
            </div>
        );
    }

    if (!user) {
        // When embedded, we should NOT redirect to /login
        // We wait for the parent to send the token via postMessage
        const embedded = window.self !== window.top;
        if (embedded) {
            return (
                <div className="flex h-screen items-center justify-center bg-pos-bg text-pos-text">
                    <div className="animate-pulse flex flex-col items-center">
                        <div className="w-12 h-12 border-4 border-pos-accent border-t-transparent rounded-full animate-spin mb-4"></div>
                        <p>Authenticating with MedFlow...</p>
                    </div>
                </div>
            );
        }
        return <Navigate to="/login" replace />;
    }

    if (hasPermission === false) {
        return (
            <div className="flex flex-col items-center justify-center h-screen w-screen bg-pos-bg text-pos-text">
                <div className="bg-pos-surface border border-pos-accent p-8 rounded max-w-md w-full text-center shadow-lg">
                    <div className="w-16 h-16 bg-pos-accent/10 border border-pos-accent max-w-fit rounded text-pos-accent flex items-center justify-center mx-auto mb-4">
                        <ShieldAlert size={32} />
                    </div>
                    <h2 className="text-2xl font-bold mb-2 tracking-tight">Access Denied</h2>
                    <p className="text-pos-text-muted mb-6">
                        You need the <code className="bg-pos-bg border border-pos-border px-2 py-1 mx-1 rounded font-mono text-sm text-pos-accent">{requiredPermission}</code> permission to access the POS terminal.
                    </p>
                    <div className="flex flex-col gap-3">
                        <button
                            onClick={() => window.location.href = 'https://app.medflow.app'}
                            className="w-full bg-pos-accent hover:bg-pos-accent-hover text-pos-bg py-3 px-4 rounded transition-colors font-semibold"
                        >
                            Return to MedFlow
                        </button>
                        <button
                            onClick={() => signOut()}
                            className="w-full bg-pos-surface hover:bg-pos-surface-hover border border-pos-border py-3 px-4 rounded transition-colors text-sm font-medium"
                        >
                            Sign Out
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return <Outlet />;
};
