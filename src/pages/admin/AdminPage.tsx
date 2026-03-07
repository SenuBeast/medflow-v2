import { useState } from 'react';
import { Users, Shield, ScrollText, Settings, ChevronRight } from 'lucide-react';
import { clsx } from 'clsx';

import { useHasPermission } from '../../lib/permissionUtils';
import { PERMISSIONS } from '../../lib/constants';

import { UsersPage } from './UsersPage';
import { RoleManagementPage } from './RoleManagementPage';
import { SystemSettingsPage } from './SystemSettingsPage';
import { AuditLogTable } from '../../components/admin/AuditLogTable';
import { PermissionGuard } from '../../components/auth/Guards';

// ─── Nav Config ───────────────────────────────────────────────────────────────
type SectionId = 'users' | 'roles' | 'audit' | 'settings';

interface NavItem {
    id: SectionId;
    label: string;
    description: string;
    icon: React.ElementType;
    permission: string;
}

const NAV_ITEMS: NavItem[] = [
    {
        id: 'users',
        label: 'Users',
        description: 'Manage staff accounts',
        icon: Users,
        permission: PERMISSIONS.ADMIN_USERS_VIEW,
    },
    {
        id: 'roles',
        label: 'Roles & Permissions',
        description: 'Configure access levels',
        icon: Shield,
        permission: PERMISSIONS.ADMIN_ROLES_MANAGE,
    },
    {
        id: 'audit',
        label: 'Audit Logs',
        description: 'View system activity',
        icon: ScrollText,
        permission: PERMISSIONS.ADMIN_AUDIT_VIEW,
    },
    {
        id: 'settings',
        label: 'System Settings',
        description: 'Application configuration',
        icon: Settings,
        permission: PERMISSIONS.ADMIN_ACCESS_PANEL,
    },
];

// ─── Main Admin Page ──────────────────────────────────────────────────────────
// Per-item hook to reactively check permissions
function NavItemVisible({ item, activeSection, setActiveSection }: { item: NavItem; activeSection: SectionId; setActiveSection: (id: SectionId) => void }) {
    const canAccess = useHasPermission(item.permission);
    if (!canAccess) return null;
    const { id, label, description, icon: Icon } = item;
    return (
        <button
            onClick={() => setActiveSection(id)}
            className={clsx(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all group',
                activeSection === id
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-gray-700 hover:bg-gray-100'
            )}
        >
            <div className={clsx(
                'w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors',
                activeSection === id ? 'bg-white/20' : 'bg-gray-100 group-hover:bg-gray-200'
            )}>
                <Icon size={15} className={activeSection === id ? 'text-white' : 'text-gray-500'} />
            </div>
            <div className="flex-1 min-w-0">
                <p className={clsx('text-sm font-semibold truncate', activeSection === id ? 'text-white' : 'text-gray-800')}>
                    {label}
                </p>
                <p className={clsx('text-xs truncate', activeSection === id ? 'text-blue-100' : 'text-gray-400')}>
                    {description}
                </p>
            </div>
            <ChevronRight size={13} className={clsx('shrink-0 transition-opacity', activeSection === id ? 'text-white opacity-80' : 'opacity-0 group-hover:opacity-40')} />
        </button>
    );
}

export function AdminPage() {
    const [activeSection, setActiveSection] = useState<SectionId>('users');

    const currentNav = NAV_ITEMS.find(n => n.id === activeSection);

    return (
        <div className="flex gap-6 max-w-[1400px] mx-auto">
            {/* ── Admin Left Sidebar ───────────────────────────────────── */}
            <aside className="w-60 shrink-0">
                <div className="sticky top-0">
                    <div className="mb-4">
                        <h1 className="text-lg font-bold text-gray-900">Admin Panel</h1>
                        <p className="text-xs text-gray-400 mt-0.5">System configuration</p>
                    </div>

                    <nav className="space-y-1">
                        {NAV_ITEMS.map(item => (
                            <NavItemVisible
                                key={item.id}
                                item={item}
                                activeSection={activeSection}
                                setActiveSection={setActiveSection}
                            />
                        ))}
                    </nav>

                    {/* Danger zone hint */}
                    <div className="mt-6 p-3 bg-amber-50 border border-amber-100 rounded-xl">
                        <p className="text-xs font-semibold text-amber-800">⚠️ Admin Area</p>
                        <p className="text-[11px] text-amber-600 mt-0.5">Changes here affect all users and clinical workflows.</p>
                    </div>
                </div>
            </aside>

            {/* ── Content Area ─────────────────────────────────────────── */}
            <main className="flex-1 min-w-0">
                {/* Breadcrumb */}
                <div className="flex items-center gap-2 mb-5 text-sm text-gray-500">
                    <span className="font-medium text-gray-700">Admin</span>
                    <ChevronRight size={13} />
                    <span className="text-gray-900 font-semibold">{currentNav?.label}</span>
                </div>

                {/* Section Header */}
                <div className="mb-5">
                    <h2 className="text-xl font-bold text-gray-900">{currentNav?.label}</h2>
                    <p className="text-sm text-gray-500 mt-0.5">{currentNav?.description}</p>
                </div>

                {/* Section Content */}
                <PermissionGuard
                    permission={currentNav?.permission as import('../../lib/constants').PermissionKey ?? PERMISSIONS.ADMIN_ACCESS_PANEL}
                    fallback={
                        <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
                            <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center">
                                <Shield size={28} className="text-gray-300" />
                            </div>
                            <div>
                                <p className="font-bold text-gray-900 text-lg">Access Denied</p>
                                <p className="text-gray-400 text-sm mt-1">You don't have permission to view this section.</p>
                            </div>
                        </div>
                    }
                >
                    {activeSection === 'users' && <UsersPage />}
                    {activeSection === 'roles' && <RoleManagementPage />}
                    {activeSection === 'audit' && <AuditLogTable />}
                    {activeSection === 'settings' && <SystemSettingsPage />}
                </PermissionGuard>
            </main>
        </div>
    );
}
