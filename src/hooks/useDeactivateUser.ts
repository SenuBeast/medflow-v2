import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

interface DeactivateUserPayload {
    userId: string;
    reason?: string | null;
}

export function useDeactivateUser() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ userId, reason }: DeactivateUserPayload) => {
            const { data, error } = await supabase.rpc('admin_deactivate_user', {
                p_target_user_id: userId,
                p_reason: reason ?? null,
            });

            if (error) {
                const message = error.code === 'PGRST202' 
                    ? 'Backend error: The deactivation function is missing. Please sync migrations.'
                    : error.message || 'Failed to deactivate user.';
                throw new Error(message);
            }

            return data;
        },
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ['users'] });
        },
    });
}
