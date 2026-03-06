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

    const inputCls = 'w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30';

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
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Full Name</label>
                <input type="text" className={inputCls} placeholder="John Doe" value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} />
            </div>
            <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Email <span className="text-red-500">*</span></label>
                <input type="email" className={inputCls} placeholder="user@medflow.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            </div>
            <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Password <span className="text-red-500">*</span></label>
                <input type="password" className={inputCls} placeholder="Min. 8 characters" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
            </div>
            <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Role <span className="text-red-500">*</span></label>
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
                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
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
                <div className="flex flex-wrap items-center gap-3">
                    <div className="relative flex-1 min-w-[200px]">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            className="pl-8 pr-3 py-2 w-full rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                            placeholder="Search by name or email…"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                    <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
                        {(['all', 'active', 'inactive'] as const).map(s => (
                            <button key={s} onClick={() => setStatusFilter(s)}
                                className={clsx('px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all',
                                    statusFilter === s ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700')}>
                                {s}
                            </button>
                        ))}
                    </div>
                    <PermissionGuard permission={PERMISSIONS.ADMIN_USERS_CREATE}>
                        <Button variant="primary" icon={<UserPlus size={15} />} onClick={() => setShowCreate(true)}>
                            New User
                        </Button>
                    </PermissionGuard>
                </div>

                {/* Table */}
                <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 border-b border-gray-100">
                                <tr>
                                    {['User', 'Email', 'Role', 'Status', 'Joined', 'Actions'].map(h => (
                                        <th key={h} className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {isLoading ? (
                                    Array.from({ length: 4 }).map((_, i) => (
                                        <tr key={i}><td colSpan={6} className="px-5 py-3.5"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td></tr>
                                    ))
                                ) : filtered.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-5 py-16 text-center">
                                            <Users2 size={36} className="text-gray-200 mx-auto mb-3" />
                                            <p className="text-gray-400 text-sm">{search ? 'No users match your search' : 'No users found'}</p>
                                        </td>
                                    </tr>
                                ) : (
                                    filtered.map(user => (
                                        <tr key={user.id} className="hover:bg-gray-50/60 transition-colors">
                                            <td className="px-5 py-3.5">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center shrink-0">
                                                        <span className="text-white text-xs font-bold">
                                                            {(user.full_name ?? user.email).charAt(0).toUpperCase()}
                                                        </span>
                                                    </div>
                                                    <span className="font-semibold text-gray-900">{user.full_name ?? '—'}</span>
                                                </div>
                                            </td>
                                            <td className="px-5 py-3.5 text-gray-500">{user.email}</td>
                                            <td className="px-5 py-3.5">
                                                {user.role ? <RoleBadge roleName={user.role.name} /> : <span className="text-gray-300 text-xs">No role</span>}
                                            </td>
                                            <td className="px-5 py-3.5">
                                                <StatusBadge status={user.is_active ? 'active' : 'inactive'} />
                                            </td>
                                            <td className="px-5 py-3.5 text-xs text-gray-400">
                                                {format(new Date(user.created_at), 'MMM d, yyyy')}
                                            </td>
                                            <td className="px-5 py-3.5">
                                                <div className="flex items-center gap-2">
                                                    <PermissionGuard permission={PERMISSIONS.ADMIN_ROLES_ASSIGN}>
                                                        <Button variant="ghost" size="sm"
                                                            onClick={() => setAssignRoleUser({ id: user.id, role_id: user.role_id })}>
                                                            Role
                                                        </Button>
                                                    </PermissionGuard>
                                                    <PermissionGuard permission={PERMISSIONS.ADMIN_USERS_DEACTIVATE}>
                                                        <Button variant="ghost" size="sm"
                                                            className={user.is_active ? 'text-red-400 hover:bg-red-50 hover:text-red-600' : 'text-green-500 hover:bg-green-50'}
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
                        <div className="px-5 py-3 border-t border-gray-100 text-xs text-gray-400">
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
