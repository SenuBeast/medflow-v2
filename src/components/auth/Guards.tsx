import { useEffect, useState, type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import type { PermissionKey } from '../../lib/constants';
import { LoadingScreen } from '../ui/Spinner';
import { Loader2 } from 'lucide-react';
import { useHasPermission } from '../../lib/permissionUtils';
import { rehydrateAuthFromSession } from '../../hooks/useAuth';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
    const { user, isInitialized, isLoading, isTwoFactorVerified } = useAuthStore();
    const location = useLocation();
    const [isResolvingSession, setIsResolvingSession] = useState(false);
    const [confirmedSignedOut, setConfirmedSignedOut] = useState(false);

    useEffect(() => {
        let active = true;

        if (!isInitialized || isLoading || user) {
            setIsResolvingSession(false);
            setConfirmedSignedOut(false);
            return () => { active = false; };
        }

        setIsResolvingSession(true);
        void rehydrateAuthFromSession()
            .then((rehydrated) => {
                if (!active) return;
                setConfirmedSignedOut(!rehydrated);
            })
            .catch(() => {
                if (!active) return;
                setConfirmedSignedOut(true);
            })
            .finally(() => {
                if (!active) return;
                setIsResolvingSession(false);
            });

        return () => { active = false; };
    }, [isInitialized, isLoading, user]);

    // Show blank/spinner while Auth decides if we have a session
    if (!isInitialized || isLoading || isResolvingSession) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
        );
    }

    if (!user) {
        if (!confirmedSignedOut) {
            return (
                <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                </div>
            );
        }
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (!isTwoFactorVerified) {
        const next = `${location.pathname}${location.search}`;
        return <Navigate to={`/verify-2fa?next=${encodeURIComponent(next)}`} replace state={{ from: location }} />;
    }

    return <>{children}</>;
}

interface RouteGuardProps {
    permission: PermissionKey;
    children: ReactNode;
}

export function RouteGuard({ permission, children }: RouteGuardProps) {
    const { isInitialized, isLoading } = useAuthStore();
    const canAccess = useHasPermission(permission);

    if (!isInitialized || isLoading) {
        return <LoadingScreen />;
    }

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
