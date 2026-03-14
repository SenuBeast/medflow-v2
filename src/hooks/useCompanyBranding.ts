import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';

export interface CompanyBranding {
    companyName: string;
    companyInitials: string;
}

function buildInitials(name: string) {
    return name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part.charAt(0).toUpperCase())
        .join('') || 'MF';
}

export function useCompanyBranding() {
    const tenantId = useAuthStore((state) => state.user?.tenant_id);

    return useQuery({
        queryKey: ['company_branding', tenantId],
        queryFn: async (): Promise<CompanyBranding> => {
            if (!tenantId) {
                return {
                    companyName: 'MedFlow',
                    companyInitials: 'MF',
                };
            }

            const { data, error } = await supabase
                .from('tenants')
                .select('name')
                .eq('id', tenantId)
                .maybeSingle();

            if (error) throw error;

            const companyName = data?.name?.trim() || 'MedFlow';

            return {
                companyName,
                companyInitials: buildInitials(companyName),
            };
        },
        staleTime: 5 * 60 * 1000,
    });
}
