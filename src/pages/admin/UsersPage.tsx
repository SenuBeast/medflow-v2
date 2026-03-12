import { useState } from 'react';
import { Search, UserPlus, Users2 } from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { StatusBadge, RoleBadge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { PermissionGuard } from '../../components/auth/Guards';
import { PERMISSIONS } from '../../lib/constants';
import { useUsers, useUpdateUserRole, useDeactivateUser, useActivateUser, useCreateUser } from '../../hooks/useUsers';
import { useRoles } from '../../hooks/useRoles';
import { useToast } from '../../components/ui/Toast';
import type { Role } from '../../lib/types';
import { clsx } from 'clsx';
import { format } from 'date-fns';

// ─── Create User Modal ────────────────────────────────────────────────────────
function CreateUserModal({ onClose }: { onClose: () => void }) {
    const { data: roles = [] } = useRoles();
    const createUser = useCreateUser();
    const { success, error } = useToast();
    const [form, setForm] = useState({ full_name: '', email: '', password: '', role_id: '' });

    const inputCls = 'w-full px-3 py-2 rounded-xl border border-border-main text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30';

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
            <div>
                <label className="block text-xs font-semibold text-text-sub uppercase tracking-wide mb-1">Full Name</label>
                <input type="text" className={inputCls} placeholder="John Doe" value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} />
            </div>
            <div>
                <label className="block text-xs font-semibold text-text-sub uppercase tracking-wide mb-1">Email <span className="text-red-500">*</span></label>
                <input type="email" className={inputCls} placeholder="user@medflow.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            </div>
            <div>
                <label className="block text-xs font-semibold text-text-sub uppercase tracking-wide mb-1">Password <span className="text-red-500">*</span></label>
                <input type="password" className={inputCls} placeholder="Min. 8 characters" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
            </div>
            <div>
                <label className="block text-xs font-semibold text-text-sub uppercase tracking-wide mb-1">Role <span className="text-red-500">*</span></label>
                <select className={inputCls} value={form.role_id} onChange={e => setForm(f => ({ ...f, role_id: e.target.value }))} title="Select role">
                    <option value="">Select a role…</option>
                    {roles.map((r: Role) => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
            </div>
            <div className="flex justify-end gap-3 pt-1">
                <Button variant="secondary" onClick={onClose}>Cancel</Button>
                <Button variant="primary" loading={createUser.isPending} disabled={!form.email || !form.password || !form.role_id} onClick={handleSubmit}>
                    Create User
                </Button>
            </div>
        </div>
    );
}

// ─── Assign Role Modal ────────────────────────────────────────────────────────
function AssignRoleModal({ userId, currentRoleId, onClose }: { userId: string; currentRoleId: string; onClose: () => void }) {
    const { data: roles = [] } = useRoles();
    const updateRole = useUpdateUserRole();
    const { success, error } = useToast();
    const [roleId, setRoleId] = useState(currentRoleId);

    const handleSave = async () => {
        try {
            await updateRole.mutateAsync({ userId, roleId });
            success('Role assigned successfully');
            onClose();
        } catch (err: unknown) {
            error(err instanceof Error ? err.message : 'Failed to assign role');
        }
    };

    return (
        <div className="space-y-4">
            <select
                className="w-full px-3 py-2 rounded-xl border border-border-main text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                title="Select role"
                value={roleId}
                onChange={e => setRoleId(e.target.value)}
            >
                {roles.map((r: Role) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
            <div className="flex justify-end gap-3">
                <Button variant="secondary" onClick={onClose}>Cancel</Button>
                <Button variant="primary" loading={updateRole.isPending} onClick={handleSave}>Assign Role</Button>
            </div>
        </div>
    );
}

// ─── Users Page ───────────────────────────────────────────────────────────────
export function UsersPage() {
    const { data: users = [], isLoading } = useUsers();
    const deactivateUser = useDeactivateUser();
    const activateUser = useActivateUser();
    const { success, error } = useToast();

    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
    const [showCreate, setShowCreate] = useState(false);
    const [assignRoleUser, setAssignRoleUser] = useState<{ id: string; role_id: string } | null>(null);

    const filtered = users.filter(u => {
        const matchSearch = !search || (u.full_name ?? u.email).toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
        const matchStatus = statusFilter === 'all' || (statusFilter === 'active' ? u.is_active : !u.is_active);
        return matchSearch && matchStatus;
    });

    const handleToggleActive = async (userId: string, isActive: boolean) => {
        try {
            if (isActive) {
                await deactivateUser.mutateAsync(userId);
                success('User deactivated');
            } else {
                await activateUser.mutateAsync(userId);
                success('User activated');
            }
        } catch (err: unknown) {
            error(err instanceof Error ? err.message : 'Action failed');
        }
    };

    return (
        <PermissionGuard permission={PERMISSIONS.ADMIN_USERS_VIEW}>
            <div className="space-y-4">
                {/* Toolbar */}
                <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3">
                    <div className="relative flex-1 min-w-0 sm:min-w-[200px]">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-dim" />
                        <input
                            type="text"
                            className="pl-10 pr-4 py-2.5 md:py-2 w-full rounded-xl bg-card border border-border-main text-sm text-text-main placeholder:text-text-dim focus:outline-none focus:ring-2 focus:ring-brand/30 transition-all font-medium"
                            placeholder="Search by name or email…"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center justify-between sm:justify-start">
                        <div className="flex border-b border-border-dim/50">
                            {(['all', 'active', 'inactive'] as const).map(s => {
                                const isActive = statusFilter === s;
                                return (
                                    <button
                                        key={s}
                                        onClick={() => setStatusFilter(s)}
                                        className={clsx(
                                            'px-3 md:px-4 py-2.5 md:py-3 text-xs md:text-sm font-bold capitalize transition-all relative',
                                            isActive ? 'text-brand' : 'text-text-dim hover:text-text-main'
                                        )}
                                    >
                                        {s}
                                        {isActive && (
                                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand rounded-t-full shadow-[0_-2px_6px_rgba(20,110,245,0.3)]" />
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                        <PermissionGuard permission={PERMISSIONS.ADMIN_USERS_CREATE}>
                            <Button variant="primary" icon={<UserPlus size={15} />} onClick={() => setShowCreate(true)} className="ml-3 sm:ml-0">
                                <span className="hidden sm:inline">New User</span>
                                <span className="sm:hidden">New</span>
                            </Button>
                        </PermissionGuard>
                    </div>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden space-y-3">
                    {isLoading ? (
                        Array.from({ length: 3 }).map((_, i) => (
                            <div key={i} className="bg-card rounded-xl border border-border-dim p-4">
                                <div className="h-4 bg-gray-100 rounded animate-pulse mb-2" />
                                <div className="h-3 bg-gray-100 rounded animate-pulse w-2/3" />
                            </div>
                        ))
                    ) : filtered.length === 0 ? (
                        <div className="bg-card rounded-xl border border-border-dim p-8 text-center">
                            <Users2 size={32} className="text-text-dim/20 mx-auto mb-3" />
                            <p className="text-text-dim text-sm">{search ? 'No users match your search' : 'No users found'}</p>
                        </div>
                    ) : (
                        filtered.map(user => (
                            <div key={user.id} className="bg-card rounded-xl border border-border-dim p-4 space-y-3">
                                <div className="flex items-center gap-3">
                                    {user.avatar_url ? (
                                        <img
                                            src={user.avatar_url}
                                            alt={user.full_name ?? 'Avatar'}
                                            className="w-9 h-9 rounded-full object-cover ring-2 ring-border-dim shrink-0"
                                        />
                                    ) : (
                                        <div className="w-9 h-9 rounded-full bg-brand/20 border border-brand/30 flex items-center justify-center shrink-0">
                                            <span className="text-brand text-xs font-bold">
                                                {(user.full_name ?? user.email).charAt(0).toUpperCase()}
                                            </span>
                                        </div>
                                    )}
                                    <div className="min-w-0 flex-1">
                                        <p className="font-semibold text-text-main text-sm truncate">{user.full_name ?? '—'}</p>
                                        <p className="text-xs text-text-sub truncate">{user.email}</p>
                                    </div>
                                    <StatusBadge status={user.is_active ? 'active' : 'inactive'} />
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                    <div>
                                        <span className="text-text-dim">Role</span>
                                        <div className="mt-0.5">
                                            {user.role ? <RoleBadge roleName={user.role.name} size="sm" /> : <span className="text-text-dim/40 italic">No role</span>}
                                        </div>
                                    </div>
                                    <div>
                                        <span className="text-text-dim">Joined</span>
                                        <p className="font-medium text-text-main mt-0.5">{format(new Date(user.created_at), 'MMM d, yyyy')}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 pt-1">
                                    <PermissionGuard permission={PERMISSIONS.ADMIN_ROLES_ASSIGN}>
                                        <Button variant="ghost" size="sm" className="flex-1 min-h-[40px]"
                                            onClick={() => setAssignRoleUser({ id: user.id, role_id: user.role_id })}>
                                            Assign Role
                                        </Button>
                                    </PermissionGuard>
                                    <PermissionGuard permission={PERMISSIONS.ADMIN_USERS_DEACTIVATE}>
                                        <Button variant="ghost" size="sm"
                                            className={clsx('flex-1 min-h-[40px]', user.is_active ? 'text-danger hover:bg-danger/10' : 'text-success hover:bg-success/10')}
                                            onClick={() => handleToggleActive(user.id, user.is_active)}>
                                            {user.is_active ? 'Deactivate' : 'Activate'}
                                        </Button>
                                    </PermissionGuard>
                                </div>
                            </div>
                        ))
                    )}
                    {filtered.length > 0 && (
                        <p className="text-xs text-text-dim text-center pt-1">
                            Showing {filtered.length} of {users.length} users
                        </p>
                    )}
                </div>

                {/* Desktop Table */}
                <div className="hidden md:block bg-card rounded-2xl border border-border-dim overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-surface-dim border-b border-border-dim">
                                <tr>
                                    {['User', 'Email', 'Role', 'Status', 'Joined', 'Actions'].map(h => (
                                        <th key={h} className="text-left px-4 lg:px-5 py-3.5 text-xs font-semibold text-text-sub uppercase tracking-wide">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border-dim/30">
                                {isLoading ? (
                                    Array.from({ length: 4 }).map((_, i) => (
                                        <tr key={i}><td colSpan={6} className="px-5 py-3.5"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td></tr>
                                    ))
                                ) : filtered.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-5 py-16 text-center">
                                            <Users2 size={36} className="text-text-dim/20 mx-auto mb-3" />
                                            <p className="text-text-dim text-sm">{search ? 'No users match your search' : 'No users found'}</p>
                                        </td>
                                    </tr>
                                ) : (
                                    filtered.map(user => (
                                        <tr key={user.id} className="hover:bg-surface-dim/60 transition-colors">
                                            <td className="px-4 lg:px-5 py-3.5">
                                                <div className="flex items-center gap-3">
                                                    {user.avatar_url ? (
                                                        <img
                                                            src={user.avatar_url}
                                                            alt={user.full_name ?? 'Avatar'}
                                                            className="w-8 h-8 rounded-full object-cover ring-2 ring-border-dim shrink-0"
                                                        />
                                                    ) : (
                                                        <div className="w-8 h-8 rounded-full bg-brand/20 border border-brand/30 flex items-center justify-center shrink-0">
                                                            <span className="text-brand text-xs font-bold">
                                                                {(user.full_name ?? user.email).charAt(0).toUpperCase()}
                                                            </span>
                                                        </div>
                                                    )}
                                                    <span className="font-semibold text-text-main">{user.full_name ?? '—'}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 lg:px-5 py-3.5 text-text-sub">{user.email}</td>
                                            <td className="px-4 lg:px-5 py-3.5">
                                                {user.role ? <RoleBadge roleName={user.role.name} /> : <span className="text-text-dim/40 text-xs italic">No role</span>}
                                            </td>
                                            <td className="px-4 lg:px-5 py-3.5">
                                                <StatusBadge status={user.is_active ? 'active' : 'inactive'} />
                                            </td>
                                            <td className="px-4 lg:px-5 py-3.5 text-xs text-text-dim">
                                                {format(new Date(user.created_at), 'MMM d, yyyy')}
                                            </td>
                                            <td className="px-4 lg:px-5 py-3.5">
                                                <div className="flex items-center gap-2">
                                                    <PermissionGuard permission={PERMISSIONS.ADMIN_ROLES_ASSIGN}>
                                                        <Button variant="ghost" size="sm"
                                                            onClick={() => setAssignRoleUser({ id: user.id, role_id: user.role_id })}>
                                                            Role
                                                        </Button>
                                                    </PermissionGuard>
                                                    <PermissionGuard permission={PERMISSIONS.ADMIN_USERS_DEACTIVATE}>
                                                        <Button variant="ghost" size="sm"
                                                            className={user.is_active ? 'text-danger hover:bg-danger/10' : 'text-success hover:bg-success/10'}
                                                            onClick={() => handleToggleActive(user.id, user.is_active)}>
                                                            {user.is_active ? 'Deactivate' : 'Activate'}
                                                        </Button>
                                                    </PermissionGuard>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                    {filtered.length > 0 && (
                        <div className="px-5 py-3 border-t border-border-dim text-xs text-text-dim">
                            Showing {filtered.length} of {users.length} users
                        </div>
                    )}
                </div>
            </div>

            {/* Modals */}
            {showCreate && (
                <Modal title="Create New User" size="md" onClose={() => setShowCreate(false)}>
                    <CreateUserModal onClose={() => setShowCreate(false)} />
                </Modal>
            )}
            {assignRoleUser && (
                <Modal title="Assign Role" size="sm" onClose={() => setAssignRoleUser(null)}>
                    <AssignRoleModal userId={assignRoleUser.id} currentRoleId={assignRoleUser.role_id} onClose={() => setAssignRoleUser(null)} />
                </Modal>
            )}
        </PermissionGuard>
    );
}
