import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

interface ReactivateUserPayload {
    userId: string;
    reason?: string | null;
}

export function useReactivateUser() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ userId, reason }: ReactivateUserPayload) => {
            const { data, error } = await supabase.rpc('admin_reactivate_user', {
                p_target_user_id: userId,
                p_reason: reason ?? null,
            });

            if (error) {
                const message = error.code === 'PGRST202' 
                    ? 'Backend error: The reactivation function is missing. Please sync migrations.'
                    : error.message || 'Failed to reactivate user.';
                throw new Error(message);
            }

            return data;
        },
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ['users'] });
        },
    });
}
