import { useState } from 'react';
import { Search, UserPlus, Users2 } from 'lucide-react';
import { format } from 'date-fns';
import { clsx } from 'clsx';

import { Modal } from '../../components/ui/Modal';
import { StatusBadge, RoleBadge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { PermissionGuard } from '../../components/auth/Guards';
import { DeactivateUserDialog } from '../../components/admin/DeactivateUserDialog';
import { ReactivateUserDialog } from '../../components/admin/ReactivateUserDialog';
import { DeleteUserDialog } from '../../components/admin/DeleteUserDialog';
import { PERMISSIONS } from '../../lib/constants';
import { Avatar } from '../../components/ui/Avatar';
import { useUsers, useUpdateUserRole, useCreateUser } from '../../hooks/useUsers';
import { useDeactivateUser } from '../../hooks/useDeactivateUser';
import { useReactivateUser } from '../../hooks/useReactivateUser';
import { useDeleteUser } from '../../hooks/useDeleteUser';
import { useRoles } from '../../hooks/useRoles';
import { useToast } from '../../components/ui/Toast';
import { useAuthStore } from '../../store/authStore';
import type { Role, User } from '../../lib/types';

function CreateUserModal({ onClose }: { onClose: () => void }) {
    const { data: roles = [] } = useRoles();
    const createUser = useCreateUser();
    const { success, error } = useToast();
    const [form, setForm] = useState({ full_name: '', email: '', password: '', role_id: '' });

    const handleSubmit = async () => {
        if (!form.email || !form.password || !form.role_id) return;

        try {
            await createUser.mutateAsync(form);
            success(`User ${form.email} created successfully`);
            onClose();
        } catch (err: unknown) {
            error(err instanceof Error ? err.message : 'Failed to create user');
        }
    };

    return (
        <div className="space-y-4">
            <Input
                label="Full Name"
                placeholder="John Doe"
                value={form.full_name}
                onChange={(event) => setForm((current) => ({ ...current, full_name: event.target.value }))}
            />
            <Input
                label="Email"
                type="email"
                required
                placeholder="user@medflow.com"
                value={form.email}
                onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
            />
            <Input
                label="Password"
                type="password"
                required
                placeholder="Min. 8 characters"
                value={form.password}
                onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
            />
            <Select
                label="Role"
                required
                value={form.role_id}
                onChange={(event) => setForm((current) => ({ ...current, role_id: event.target.value }))}
            >
                <option value="">Select a role...</option>
                {roles.map((role: Role) => (
                    <option key={role.id} value={role.id}>
                        {role.name}
                    </option>
                ))}
            </Select>
            <div className="flex justify-end gap-3 pt-1">
                <Button variant="secondary" onClick={onClose}>
                    Cancel
                </Button>
                <Button
                    variant="primary"
                    loading={createUser.isPending}
                    disabled={!form.email || !form.password || !form.role_id}
                    onClick={handleSubmit}
                >
                    Create User
                </Button>
            </div>
        </div>
    );
}

function AssignRoleModal({
    userId,
    currentRoleId,
    onClose,
}: {
    userId: string;
    currentRoleId: string;
    onClose: () => void;
}) {
    const { data: roles = [] } = useRoles();
    const updateRole = useUpdateUserRole();
    const { success, error } = useToast();
    const [roleId, setRoleId] = useState(currentRoleId);

    const handleSave = async () => {
        try {
            await updateRole.mutateAsync({ userId, roleId });
            success('User updated successfully');
            onClose();
        } catch (err: unknown) {
            error(err instanceof Error ? err.message : 'Failed to update user');
        }
    };

    return (
        <div className="space-y-4">
            <Select
                label="Role"
                title="Select role"
                value={roleId}
                onChange={(event) => setRoleId(event.target.value)}
            >
                {roles.map((role: Role) => (
                    <option key={role.id} value={role.id}>
                        {role.name}
                    </option>
                ))}
            </Select>
            <div className="flex justify-end gap-3">
                <Button variant="secondary" onClick={onClose}>
                    Cancel
                </Button>
                <Button variant="primary" loading={updateRole.isPending} onClick={handleSave}>
                    Save Changes
                </Button>
            </div>
        </div>
    );
}

// Local UserAvatar removed in favor of centralized UI component

export function UsersPage() {
    const { data: users = [], isLoading } = useUsers();
    const deactivateUser = useDeactivateUser();
    const reactivateUser = useReactivateUser();
    const deleteUser = useDeleteUser();
    const currentUserId = useAuthStore((state) => state.user?.id ?? null);
    const { success, error } = useToast();

    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
    const [showCreate, setShowCreate] = useState(false);
    const [assignRoleUser, setAssignRoleUser] = useState<{ id: string; role_id: string } | null>(null);
    const [deactivateTarget, setDeactivateTarget] = useState<User | null>(null);
    const [reactivateTarget, setReactivateTarget] = useState<User | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
    const [deleteRestrictionMessage, setDeleteRestrictionMessage] = useState<string | null>(null);

    const filteredUsers = users.filter((user) => {
        const normalizedSearch = search.toLowerCase();
        const displayName = (user.full_name ?? user.email).toLowerCase();
        const email = user.email.toLowerCase();
        const matchesSearch = !search || displayName.includes(normalizedSearch) || email.includes(normalizedSearch);
        const matchesStatus = statusFilter === 'all' || (statusFilter === 'active' ? user.is_active : !user.is_active);

        return matchesSearch && matchesStatus;
    });

    const openDeleteDialog = (user: User) => {
        if (user.role?.name === 'Super Admin' || user.id === currentUserId) {
            setDeleteRestrictionMessage('This account cannot be deleted.');
            return;
        }

        setDeleteTarget(user);
    };

    const handleDeactivate = async () => {
        if (!deactivateTarget) return;

        try {
            await deactivateUser.mutateAsync({
                userId: deactivateTarget.id,
                reason: 'Deactivated from the admin panel.',
            });
            success('User deactivated');
            setDeactivateTarget(null);
        } catch (err: unknown) {
            error(err instanceof Error ? err.message : 'Failed to deactivate user');
        }
    };

    const handleReactivate = async () => {
        if (!reactivateTarget) return;

        try {
            await reactivateUser.mutateAsync({
                userId: reactivateTarget.id,
                reason: 'Reactivated from the admin panel.',
            });
            success('User reactivated');
            setReactivateTarget(null);
        } catch (err: unknown) {
            error(err instanceof Error ? err.message : 'Failed to reactivate user');
        }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;

        try {
            await deleteUser.mutateAsync({
                userId: deleteTarget.id,
                reason: 'Permanently deleted from the admin panel.',
            });
            success('User permanently deleted');
            setDeleteTarget(null);
        } catch (err: unknown) {
            setDeleteTarget(null);
            setDeleteRestrictionMessage('This account cannot be deleted.');
            error(err instanceof Error ? err.message : 'This account cannot be deleted.');
        }
    };

    const renderActions = (user: User, compact = false) => (
        <div className={clsx('flex gap-2', compact ? 'flex-col' : 'flex-nowrap items-center')}>
            <PermissionGuard permission={PERMISSIONS.ADMIN_ROLES_ASSIGN}>
                <Button
                    variant="outline"
                    size="sm"
                    className={clsx(
                        'bg-card font-bold whitespace-nowrap justify-center',
                        compact ? 'min-h-[40px] flex-1' : 'w-[110px]'
                    )}
                    onClick={() => setAssignRoleUser({ id: user.id, role_id: user.role_id })}
                >
                    Change Role
                </Button>
            </PermissionGuard>
            <PermissionGuard permission={PERMISSIONS.ADMIN_USERS_DEACTIVATE}>
                {user.is_active ? (
                    <Button
                        variant="outline"
                        size="sm"
                        className={clsx(
                            'border-amber-700/30 text-amber-700 hover:bg-amber-50 hover:border-amber-500 hover:text-amber-500 font-bold whitespace-nowrap justify-center',
                            compact ? 'min-h-[40px] flex-1' : 'w-[110px]'
                        )}
                        onClick={() => setDeactivateTarget(user)}
                    >
                        Deactivate
                    </Button>
                ) : (
                    <Button
                        variant="outline"
                        size="sm"
                        className={clsx(
                            'border-emerald-700/30 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-500 hover:text-emerald-500 font-bold whitespace-nowrap justify-center',
                            compact ? 'min-h-[40px] flex-1' : 'w-[110px]'
                        )}
                        onClick={() => setReactivateTarget(user)}
                    >
                        Activate
                    </Button>
                )}
                <Button
                    variant="outline"
                    size="sm"
                    className={clsx(
                        'border-danger/30 text-danger hover:bg-danger/10 hover:border-danger hover:text-danger font-bold whitespace-nowrap justify-center',
                        compact ? 'min-h-[40px] flex-1' : 'w-[80px]'
                    )}
                    onClick={() => openDeleteDialog(user)}
                >
                    Delete
                </Button>
            </PermissionGuard>
        </div>
    );

    return (
        <PermissionGuard permission={PERMISSIONS.ADMIN_USERS_VIEW}>
            <div className="space-y-4">
                <div className="flex flex-col flex-wrap items-stretch gap-3 sm:flex-row sm:items-center">
                    <div className="relative min-w-0 flex-1 sm:min-w-[200px]">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-dim" />
                        <input
                            type="text"
                            className="w-full rounded-xl border border-border-main bg-card py-2.5 pl-10 pr-4 text-sm font-medium text-text-main placeholder:text-text-dim transition-all focus:outline-none focus:ring-2 focus:ring-brand/30"
                            placeholder="Search by name or email..."
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                        />
                    </div>
                    <div className="flex items-center justify-between sm:justify-start">
                        <div className="flex border-b border-border-dim/50">
                            {(['all', 'active', 'inactive'] as const).map((status) => {
                                const isActiveFilter = statusFilter === status;

                                return (
                                    <button
                                        key={status}
                                        onClick={() => setStatusFilter(status)}
                                        className={clsx(
                                            'relative px-3 py-2.5 text-xs font-bold capitalize transition-all md:px-4 md:py-3 md:text-sm',
                                            isActiveFilter ? 'text-brand' : 'text-text-dim hover:text-text-main'
                                        )}
                                    >
                                        {status}
                                        {isActiveFilter && (
                                            <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-t-full bg-brand shadow-[0_-2px_6px_rgba(20,110,245,0.3)]" />
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                        <PermissionGuard permission={PERMISSIONS.ADMIN_USERS_CREATE}>
                            <Button
                                variant="primary"
                                icon={<UserPlus size={15} />}
                                onClick={() => setShowCreate(true)}
                                className="ml-3 sm:ml-0"
                            >
                                <span className="hidden sm:inline">New User</span>
                                <span className="sm:hidden">New</span>
                            </Button>
                        </PermissionGuard>
                    </div>
                </div>

                <div className="space-y-3 md:hidden">
                    {isLoading ? (
                        Array.from({ length: 3 }).map((_, index) => (
                            <div key={index} className="rounded-xl border border-border-dim bg-card p-4">
                                <div className="mb-2 h-4 animate-pulse rounded bg-gray-100" />
                                <div className="h-3 w-2/3 animate-pulse rounded bg-gray-100" />
                            </div>
                        ))
                    ) : filteredUsers.length === 0 ? (
                        <div className="rounded-xl border border-border-dim bg-card p-8 text-center">
                            <Users2 size={32} className="mx-auto mb-3 text-text-dim/20" />
                            <p className="text-sm text-text-dim">
                                {search ? 'No users match your search' : 'No users found'}
                            </p>
                        </div>
                    ) : (
                        filteredUsers.map((user) => (
                            <div key={user.id} className="space-y-3 rounded-xl border border-border-dim bg-card p-4">
                                <div className="flex items-center gap-3">
                                    <Avatar src={user.avatar_url} name={user.full_name ?? user.email} size="md" />
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-semibold text-text-main">
                                            {user.full_name ?? '—'}
                                        </p>
                                        <p className="truncate text-xs text-text-sub">{user.email}</p>
                                    </div>
                                    <StatusBadge status={user.is_active ? 'active' : 'inactive'} />
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                    <div>
                                        <span className="text-text-dim">Role</span>
                                        <div className="mt-0.5">
                                            {user.role ? (
                                                <RoleBadge roleName={user.role.name} isCustom={!user.role.is_system} size="sm" />
                                            ) : (
                                                <span className="italic text-text-dim/40">No role</span>
                                            )}
                                        </div>
                                    </div>
                                    <div>
                                        <span className="text-text-dim">Joined</span>
                                        <p className="mt-0.5 font-medium text-text-main">
                                            {format(new Date(user.created_at), 'MMM d, yyyy')}
                                        </p>
                                    </div>
                                </div>
                                {renderActions(user, true)}
                            </div>
                        ))
                    )}
                    {filteredUsers.length > 0 && (
                        <p className="pt-1 text-center text-xs text-text-dim">
                            Showing {filteredUsers.length} of {users.length} users
                        </p>
                    )}
                </div>

                <div className="hidden overflow-hidden rounded-2xl border border-border-dim bg-card shadow-sm md:block">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="border-b border-border-dim bg-surface-dim">
                                <tr>
                                    {['User', 'Email', 'Role', 'Status', 'Joined', 'Actions'].map((header) => (
                                        <th
                                            key={header}
                                            className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-text-sub lg:px-5"
                                        >
                                            {header}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border-dim/30">
                                {isLoading ? (
                                    Array.from({ length: 4 }).map((_, index) => (
                                        <tr key={index}>
                                            <td colSpan={6} className="px-5 py-3.5">
                                                <div className="h-4 animate-pulse rounded bg-gray-100" />
                                            </td>
                                        </tr>
                                    ))
                                ) : filteredUsers.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-5 py-16 text-center">
                                            <Users2 size={36} className="mx-auto mb-3 text-text-dim/20" />
                                            <p className="text-sm text-text-dim">
                                                {search ? 'No users match your search' : 'No users found'}
                                            </p>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredUsers.map((user) => (
                                        <tr key={user.id} className="transition-colors hover:bg-surface-dim/60">
                                            <td className="px-4 py-3.5 lg:px-5">
                                                <div className="flex items-center gap-3">
                                                    <Avatar src={user.avatar_url} name={user.full_name ?? user.email} size="md" />
                                                    <span className="font-semibold text-text-main">
                                                        {user.full_name ?? '—'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3.5 text-text-sub lg:px-5">{user.email}</td>
                                            <td className="px-4 py-3.5 lg:px-5">
                                                {user.role ? (
                                                    <RoleBadge roleName={user.role.name} isCustom={!user.role.is_system} />
                                                ) : (
                                                    <span className="text-xs italic text-text-dim/40">No role</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3.5 lg:px-5">
                                                <StatusBadge status={user.is_active ? 'active' : 'inactive'} />
                                            </td>
                                            <td className="px-4 py-3.5 text-xs text-text-dim lg:px-5">
                                                {format(new Date(user.created_at), 'MMM d, yyyy')}
                                            </td>
                                            <td className="px-4 py-3.5 lg:px-5">{renderActions(user)}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                    {filteredUsers.length > 0 && (
                        <div className="border-t border-border-dim px-5 py-3 text-xs text-text-dim">
                            Showing {filteredUsers.length} of {users.length} users
                        </div>
                    )}
                </div>
            </div>

            {showCreate && (
                <Modal title="Create New User" size="md" onClose={() => setShowCreate(false)}>
                    <CreateUserModal onClose={() => setShowCreate(false)} />
                </Modal>
            )}

            {assignRoleUser && (
                <Modal title="Edit User" size="sm" onClose={() => setAssignRoleUser(null)}>
                    <AssignRoleModal
                        userId={assignRoleUser.id}
                        currentRoleId={assignRoleUser.role_id}
                        onClose={() => setAssignRoleUser(null)}
                    />
                </Modal>
            )}

            {deactivateTarget && (
                <Modal title="Deactivate User" size="sm" onClose={() => setDeactivateTarget(null)}>
                    <DeactivateUserDialog
                        user={deactivateTarget}
                        loading={deactivateUser.isPending}
                        onClose={() => setDeactivateTarget(null)}
                        onConfirm={handleDeactivate}
                    />
                </Modal>
            )}

            {reactivateTarget && (
                <Modal title="Reactivate User" size="sm" onClose={() => setReactivateTarget(null)}>
                    <ReactivateUserDialog
                        user={reactivateTarget}
                        loading={reactivateUser.isPending}
                        onClose={() => setReactivateTarget(null)}
                        onConfirm={handleReactivate}
                    />
                </Modal>
            )}

            {deleteTarget && (
                <Modal title="Permanently Delete User" size="sm" onClose={() => setDeleteTarget(null)}>
                    <DeleteUserDialog
                        user={deleteTarget}
                        loading={deleteUser.isPending}
                        onClose={() => setDeleteTarget(null)}
                        onConfirm={handleDelete}
                    />
                </Modal>
            )}

            {deleteRestrictionMessage && (
                <Modal title="Cannot Delete User" size="sm" onClose={() => setDeleteRestrictionMessage(null)}>
                    <div className="space-y-4">
                        <div className="rounded-xl border border-danger/20 bg-danger/10 p-4 text-sm text-danger">
                            {deleteRestrictionMessage}
                        </div>
                        <div className="flex justify-end">
                            <Button variant="secondary" onClick={() => setDeleteRestrictionMessage(null)}>
                                Close
                            </Button>
                        </div>
                    </div>
                </Modal>
            )}
        </PermissionGuard>
    );
}
