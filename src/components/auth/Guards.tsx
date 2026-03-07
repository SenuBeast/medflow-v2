import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import type { PermissionKey } from '../../lib/constants';
import { LoadingScreen } from '../ui/Spinner';
import { Loader2 } from 'lucide-react';
import { useHasPermission } from '../../lib/permissionUtils';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
    const { user, isInitialized, isLoading, isTwoFactorVerified } = useAuthStore();
    const location = useLocation();

    // Show blank/spinner while Auth decides if we have a session
    if (!isInitialized || isLoading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (!isTwoFactorVerified) {
        // Force them back to the login screen to properly restart the flow if they are unverified
        return <Navigate to="/login" replace />;
    }

    return <>{children}</>;
}

interface RouteGuardProps {
    permission: PermissionKey;
    children: ReactNode;
}

export function RouteGuard({ permission, children }: RouteGuardProps) {
    const { isInitialized, isLoading } = useAuthStore();

    if (!isInitialized || isLoading) {
        return <LoadingScreen />;
    }

    const canAccess = useHasPermission(permission);

    if (!canAccess) {
        return <Navigate to="/no-access" replace />;
    }

    return <>{children}</>;
}

interface PermissionGuardProps {
    permission: PermissionKey;
    children: ReactNode;
    fallback?: ReactNode;
}

export function PermissionGuard({
    permission,
    children,
    fallback = null,
}: PermissionGuardProps) {
    const canAccess = useHasPermission(permission);

    if (!canAccess) {
        return <>{fallback}</>;
    }

    return <>{children}</>;
}
