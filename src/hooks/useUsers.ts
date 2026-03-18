import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { User } from '../lib/types';
import { useDeactivateUser } from './useDeactivateUser';
import { useReactivateUser } from './useReactivateUser';

export function useUsers() {
    return useQuery({
        queryKey: ['users'],
        queryFn: async (): Promise<User[]> => {
            const { data, error } = await supabase
                .from('users')
                .select(`
                    *,
                    role:roles!role_id (
                        id,
                        name,
                        is_system
                    )
                `)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('[useUsers] Fetch error:', error);
                throw error;
            }
            
            const users = (data ?? []) as any[];
            // Filter locally to avoid 400 errors if the column is missing in some environments
            return users.filter(u => !u.deleted_at) as User[];
        },
    });
}

export function useCreateUser() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (payload: {
            email: string;
            password: string;
            full_name: string;
            role_id: string;
        }) => {
            // Create auth user via Supabase admin API (requires service role) or signup
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: payload.email,
                password: payload.password,
            });

            if (authError) throw authError;
            if (!authData.user) throw new Error('Failed to create auth user');

            // Create user record
            const { error: profileError } = await supabase.from('users').insert({
                id: authData.user.id,
                email: payload.email,
                full_name: payload.full_name,
                role_id: payload.role_id,
                is_active: true,
            });

            if (profileError) throw profileError;
        },
        onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
    });
}

export function useUpdateUserRole() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async ({
            userId,
            roleId,
        }: {
            userId: string;
            roleId: string;
        }) => {
            const { error } = await supabase
                .from('users')
                .update({ role_id: roleId })
                .eq('id', userId);
            if (error) throw error;
        },
        onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
    });
}

export { useDeactivateUser, useReactivateUser };
export const useActivateUser = useReactivateUser;
