import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import type { PermissionKey } from '../lib/constants';
import { ShieldAlert } from 'lucide-react';

interface PermissionGuardProps {
    children: ReactNode;
    requiredPermission: PermissionKey;
}

export default function PermissionGuard({ children, requiredPermission }: PermissionGuardProps) {
    const { user, hasPermission, signOut } = useAuth();

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    if (!hasPermission(requiredPermission)) {
        return (
            <div className="flex flex-col items-center justify-center h-screen w-screen bg-pos-bg text-pos-text">
                <div className="bg-pos-surface border border-pos-accent p-8 rounded max-w-md w-full text-center">
                    <div className="w-16 h-16 bg-pos-accent/10 border border-pos-accent max-w-fit rounded text-pos-accent flex items-center justify-center mx-auto mb-4">
                        <ShieldAlert size={32} />
                    </div>
                    <h2 className="text-2xl font-bold mb-2 tracking-tight">Access Denied</h2>
                    <p className="text-pos-text-muted mb-6">
                        You need the <code className="bg-pos-bg border border-pos-border px-1 py-0.5 mx-1 font-mono text-sm">{requiredPermission}</code> permission to access the POS terminal.
                    </p>
                    <button
                        onClick={() => signOut()}
                        className="w-full bg-pos-surface-hover border border-pos-border py-3 px-4 hover:border-pos-text transition-colors uppercase tracking-widest text-sm font-semibold"
                    >
                        Switch User
                    </button>
                </div>
            </div>
        );
    }

    return <>{children}</>;
}
