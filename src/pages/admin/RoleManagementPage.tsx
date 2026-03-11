import { useState } from 'react';
import { Shield, Plus } from 'lucide-react';
import { useRoles, useDeleteRole } from '../../hooks/useRoles';
import { useHasPermission } from '../../lib/permissionUtils';
import { PERMISSIONS } from '../../lib/constants';
import { Button } from '../../components/ui/Button';
import { RoleCard } from '../../components/admin/RoleCard';
import { PermissionModal } from '../../components/admin/PermissionModal';
import { Modal } from '../../components/ui/Modal';
import { CreateRoleModal } from '../../components/admin/CreateRoleModal';
import { ConfirmDeleteModal } from '../../components/admin/ConfirmDeleteModal';
import type { Role } from '../../lib/types';

export function RoleManagementPage() {
    const canManageRoles = useHasPermission(PERMISSIONS.ADMIN_ROLES_MANAGE);
    const { data: roles = [], isLoading } = useRoles();
    const deleteRole = useDeleteRole();

    const [editPermRole, setEditPermRole] = useState<Role | null>(null);
    const [showCreateRole, setShowCreateRole] = useState(false);
    const [deleteConfirmRole, setDeleteConfirmRole] = useState<Role | null>(null);

    if (!canManageRoles) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center">
                <Shield className="w-12 h-12 text-text-dim/20 mb-4" />
                <h2 className="text-lg font-bold text-text-main mb-1">Access Denied</h2>
                <p className="text-sm text-text-sub">You do not have permission to manage roles and permissions.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-text-main">Roles & Permissions</h1>
                    <p className="text-text-sub text-sm mt-1">
                        Configure system access levels and permissions for medical staff.
                    </p>
                </div>
                <Button
                    variant="primary"
                    icon={<Plus size={16} />}
                    onClick={() => setShowCreateRole(true)}
                    className="w-full sm:w-auto shadow-sm"
                >
                    Create Custom Role
                </Button>
            </div>

            {isLoading ? (
                <div className="flex justify-center items-center py-20">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand"></div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                    {roles.map((role) => (
                        <RoleCard
                            key={role.id}
                            role={role}
                            onEditPermissions={setEditPermRole}
                            onDelete={role.is_system ? undefined : setDeleteConfirmRole}
                        />
                    ))}
                </div>
            )}

            {editPermRole && (
                <PermissionModal
                    role={editPermRole}
                    onClose={() => setEditPermRole(null)}
                />
            )}

            {showCreateRole && (
                <Modal title="Create Custom Role" size="md" onClose={() => setShowCreateRole(false)}>
                    <CreateRoleModal onClose={() => setShowCreateRole(false)} />
                </Modal>
            )}

            {deleteConfirmRole && (
                <Modal title="Confirm Deletion" size="sm" onClose={() => setDeleteConfirmRole(null)}>
                    <ConfirmDeleteModal
                        role={deleteConfirmRole}
                        onClose={() => setDeleteConfirmRole(null)}
                        onConfirm={async () => {
                            await deleteRole.mutateAsync(deleteConfirmRole.id);
                            setDeleteConfirmRole(null);
                        }}
                        loading={deleteRole.isPending}
                    />
                </Modal>
            )}
        </div>
    );
}
