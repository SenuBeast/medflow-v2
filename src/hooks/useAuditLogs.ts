import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';

export interface AuditLog {
    id: string;
    user_id: string;
    action: string;
    entity_type: string;
    entity_id: string | null;
    details: Record<string, unknown> | null;
    ip_address: string | null;
    created_at: string;
    user?: {
        full_name: string;
        email: string;
    };
}

export function useAuditLogs() {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { user } = useAuthStore();

    const fetchLogs = async () => {
        setIsLoading(true);
        const { data, error } = await supabase
            .from('audit_logs')
            .select(`
                *,
                user:users(full_name, email)
            `)
            .order('created_at', { ascending: false })
            .limit(100);

        if (!error && data) {
            setLogs(data as unknown as AuditLog[]);
        }
        setIsLoading(false);
    };

    useEffect(() => {
        if (user) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            fetchLogs();
        }
    }, [user]);

    return { logs, isLoading, refresh: fetchLogs };
}
