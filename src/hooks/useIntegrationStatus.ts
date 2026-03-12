import { useAuthStore } from '../store/authStore';

interface IntegrationStatus {
    isIntegrated: boolean;
    isPOSActive: boolean;
    isMedFlowActive: boolean;
}

/**
 * Hardcoded to return true since the multi-tenant subscription requirement 
 * has been dropped. We now rely purely on RBAC permissions (pos.access) 
 * to govern visibility of the POS system.
 */
export function useIntegrationStatus(): IntegrationStatus & { isLoading: boolean } {
    const user = useAuthStore((s) => s.user);

    return {
        // As long as a user is logged in, treat the system as integrated
        isIntegrated: !!user,
        isPOSActive: !!user,
        isMedFlowActive: !!user,
        isLoading: false,
    };
}

