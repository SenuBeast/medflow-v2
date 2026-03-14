import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { Role, Permission } from '../lib/types';
import { sortRoles } from '../lib/roleUtils';

export function useRoles() {
    return useQuery({
        queryKey: ['roles'],
        queryFn: async (): Promise<Role[]> => {
            const { data, error } = await supabase
                .from('roles')
                .select(`
          *,
          permissions:role_permissions (
            permission:permissions (*)
          )
        `);

            if (error) throw error;

            const roles = (data ?? []).map((role) => ({
                ...role,
                permissions: (role.permissions ?? []).map(
                    (rp: { permission: Permission }) => rp.permission
                ),
            })) as Role[];

            return sortRoles(roles);
        },
    });
}

export function useCreateRole() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async ({
            name,
            description,
            sourceRoleId,
        }: {
            name: string;
            description: string;
            sourceRoleId?: string;
        }) => {
            // Create the role
            const { data: role, error: roleError } = await supabase
                .from('roles')
                .insert({ name, description, is_system: false })
                .select()
                .single();

            if (roleError) throw roleError;

            // Copy permissions from source role if provided
            if (sourceRoleId) {
                const { data: sourcePerms, error: permError } = await supabase
                    .from('role_permissions')
                    .select('permission_id')
                    .eq('role_id', sourceRoleId);

                if (permError) throw permError;

                if (sourcePerms && sourcePerms.length > 0) {
                    const inserts = sourcePerms.map((sp: { permission_id: string }) => ({
                        role_id: role.id,
                        permission_id: sp.permission_id,
                    }));
                    const { error: insertError } = await supabase
                        .from('role_permissions')
                        .insert(inserts);
                    if (insertError) throw insertError;
                }
            }

            return role as Role;
        },
        onSuccess: () => qc.invalidateQueries({ queryKey: ['roles'] }),
    });
}

export function useUpdateRolePermissions() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async ({
            roleId,
            permissionIds,
        }: {
            roleId: string;
            permissionIds: string[];
        }) => {
            // Delete all existing
            const { error: deleteError } = await supabase
                .from('role_permissions')
                .delete()
                .eq('role_id', roleId);

            if (deleteError) throw deleteError;

            // Insert new ones (if any)
            if (permissionIds.length > 0) {
                const inserts = permissionIds.map((pid) => ({
                    role_id: roleId,
                    permission_id: pid,
                }));
                const { error: insertError } = await supabase
                    .from('role_permissions')
                    .insert(inserts);
                if (insertError) throw insertError;
            }
        },
        onSuccess: () => qc.invalidateQueries({ queryKey: ['roles'] }),
    });
}

export function useDeleteRole() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (roleId: string) => {
            const { error } = await supabase
                .from('roles')
                .delete()
                .eq('id', roleId)
                .eq('is_system', false);
            if (error) throw error;
        },
        onSuccess: () => qc.invalidateQueries({ queryKey: ['roles'] }),
    });
}

export function useAllPermissions() {
    return useQuery({
        queryKey: ['permissions'],
        queryFn: async (): Promise<Permission[]> => {
            const { data, error } = await supabase
                .from('permissions')
                .select('*')
                .order('category')
                .order('key');
            if (error) throw error;
            return (data ?? []) as Permission[];
        },
    });
}
