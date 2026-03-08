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
    const { id, label, icon: Icon } = item;
    const isActive = activeSection === id;

    return (
        <button
            onClick={() => setActiveSection(id)}
            className={clsx(
                'relative flex items-center gap-2 px-4 py-4 text-sm font-bold transition-all whitespace-nowrap group',
                isActive ? 'text-brand' : 'text-text-dim hover:text-text-main'
            )}
        >
            <Icon size={16} className={clsx('transition-colors', isActive ? 'text-brand' : 'text-text-dim group-hover:text-text-main')} />
            {label}
            {isActive && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand rounded-t-full shadow-[0_-2px_6px_rgba(20,110,245,0.3)] animate-in fade-in slide-in-from-bottom-1 duration-300" />
            )}
        </button>
    );
}

export function AdminPage() {
    const [activeSection, setActiveSection] = useState<SectionId>('users');

    const currentNav = NAV_ITEMS.find(n => n.id === activeSection);

    return (
        <div className="max-w-[1400px] mx-auto space-y-6">
            <header className="flex flex-col gap-1">
                <div className="flex items-center gap-2 text-sm text-text-sub">
                    <span className="font-medium">Admin Panel</span>
                    <ChevronRight size={13} />
                    <span className="text-text-main font-semibold">{currentNav?.label}</span>
                </div>
            </header>

            <div className="flex flex-col border-b border-border-dim overflow-x-auto no-scrollbar">
                <nav className="flex items-center">
                    {NAV_ITEMS.map(item => (
                        <NavItemVisible
                            key={item.id}
                            item={item}
                            activeSection={activeSection}
                            setActiveSection={setActiveSection}
                        />
                    ))}
                </nav>
            </div>

            {/* Section Content */}
            <main className="min-w-0">
                <div className="mb-6">
                    <h2 className="text-xl font-bold text-text-main">{currentNav?.label}</h2>
                    <p className="text-sm text-text-sub mt-1">{currentNav?.description}</p>
                </div>

                <PermissionGuard
                    permission={currentNav?.permission as import('../../lib/constants').PermissionKey ?? PERMISSIONS.ADMIN_ACCESS_PANEL}
                    fallback={
                        <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
                            <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center">
                                <Shield size={28} className="text-gray-300" />
                            </div>
                            <div>
                                <p className="font-bold text-text-main text-lg">Access Denied</p>
                                <p className="text-text-dim text-sm mt-1">You don't have permission to view this section.</p>
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
