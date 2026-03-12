import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';

interface IntegrationStatus {
    isIntegrated: boolean;
    isPOSActive: boolean;
    isMedFlowActive: boolean;
}

export function useIntegrationStatus() {
    const user = useAuthStore((s) => s.user);
    const tenantId = user?.tenant_id;

    const { data, isLoading } = useQuery<IntegrationStatus>({
        queryKey: ['integration-status', tenantId],
        queryFn: async () => {
            if (!tenantId) return { isIntegrated: false, isPOSActive: false, isMedFlowActive: false };

            const { data: subs } = await supabase
                .from('tenant_subscriptions')
                .select('product, status')
                .eq('tenant_id', tenantId)
                .eq('status', 'active');

            const products = new Set((subs || []).map((s: { product: string }) => s.product));

            return {
                isIntegrated: products.has('medflow') && products.has('pos'),
                isPOSActive: products.has('pos'),
                isMedFlowActive: products.has('medflow'),
            };
        },
        enabled: !!tenantId,
        staleTime: 5 * 60 * 1000,
    });

    return {
        isIntegrated: data?.isIntegrated ?? false,
        isPOSActive: data?.isPOSActive ?? false,
        isMedFlowActive: data?.isMedFlowActive ?? false,
        isLoading,
    };
}
