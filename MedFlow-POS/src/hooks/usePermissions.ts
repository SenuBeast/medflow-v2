import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { PermissionKey } from '../lib/constants';
import { useAuthStore } from '../store/authStore';

export function usePermissions(requiredPermission: PermissionKey | string) {
    const [hasPermission, setHasPermission] = useState<boolean | null>(null);
    const [loading, setLoading] = useState(true);

    // Also check local store first for instant response if available
    const { permissions, user } = useAuthStore();

    useEffect(() => {
        async function checkPerm() {
            // 1. Check Super Admin fast path
            if (user?.role?.name === 'Super Admin') {
                setHasPermission(true);
                setLoading(false);
                return;
            }

            // 2. Check explicitly loaded permissions in Zustand store
            // The store permissions are formatted as an array of objects: [{ key: 'sales.create', ... }]
            const localMatch = permissions.some((p: { key?: string; name?: string }) => p.key === requiredPermission || p.name === requiredPermission);
            if (localMatch) {
                setHasPermission(true);
                setLoading(false);
                return;
            }

            // 3. Fallback to Database RPC check (vital for fresh sessions or cross-domain cookie auth loads)
            const { data, error } = await supabase.rpc('user_has_permission', {
                perm_key: requiredPermission
            });

            if (error) {
                console.error("Error checking permission:", error);
                setHasPermission(false);
            } else {
                setHasPermission(data === true);
            }
            setLoading(false);
        }

        if (user) {
            checkPerm();
        } else {
            // Using a microtask to avoid "synchronous setState in effect" lint warning
            Promise.resolve().then(() => {
                setLoading(false);
                setHasPermission(false);
            });
        }
    }, [requiredPermission, user, permissions]);

    return { hasPermission, loading };
}
