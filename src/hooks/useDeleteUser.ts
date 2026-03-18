import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

interface DeleteUserPayload {
    userId: string;
    reason?: string | null;
}

interface DeleteUserResponse {
    success: boolean;
    target_user_id: string;
    confirmation_value: string;
}

export function useDeleteUser() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ userId, reason }: DeleteUserPayload): Promise<DeleteUserResponse> => {
            const { data: { session } } = await supabase.auth.getSession();
            
            if (!session) {
                throw new Error('You must be logged in to perform this action.');
            }

            console.log('[DeleteUser] Invoking function for user:', userId);
            
            const { data, error } = await supabase.functions.invoke('admin-user-lifecycle', {
                body: {
                    action: 'delete-user',
                    userId,
                    reason: reason ?? null,
                },
            });

            if (error) {
                console.error('[DeleteUser] invoke error:', error);
                
                let message = 'This account cannot be deleted.';

                // FunctionsHttpError in Supabase v2 has context which might be the Response object
                if (error instanceof Error && 'context' in error) {
                    try {
                        const response = (error as any).context;
                        if (response && typeof response.json === 'function') {
                            const errorData = await response.json();
                            console.error('[DeleteUser] error response data:', errorData);
                            if (errorData.error || errorData.message) {
                                message = errorData.error || errorData.message;
                            }
                        }
                    } catch (e) {
                        console.error('[DeleteUser] Failed to parse error context:', e);
                    }
                }

                if (error.message?.includes('failed to fetch')) {
                    message = 'Backend error: The delete-user function is not deployed or unreachable.';
                } else if (data?.error || data?.message) {
                    message = data.error || data.message;
                }
                
                throw new Error(message);
            }

            if (!data?.success) {
                console.error('[DeleteUser] logical error:', data);
                // If the function returned a logical error (guardrail rejection), use the message if available
                const guardrailMessage = data?.error || data?.message;
                throw new Error(guardrailMessage || 'This account cannot be deleted.');
            }

            return data as DeleteUserResponse;
        },
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ['users'] });
        },
    });
}
