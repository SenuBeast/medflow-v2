import { useState, useMemo } from 'react';
import { AlertTriangle, RotateCcw, Lock, Zap } from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { useAllPermissions, useUpdateRolePermissions } from '../../hooks/useRoles';
import { CRITICAL_PERMISSIONS, PERMISSION_CATEGORIES } from '../../lib/constants';
import type { Role, Permission } from '../../lib/types';
import { clsx } from 'clsx';

// Default permission sets for system roles (for "Reset to Default")
const SYSTEM_ROLE_DEFAULTS: Record<string, string[]> = {
    'Super Admin': [], // means "all"
    'Pharmacist': [
        'inventory.view', 'inventory.add', 'inventory.edit', 'inventory.adjust',
        'inventory.controlled.view', 'inventory.controlled.manage',
        'inventory.expiry.view', 'inventory.expiry.manage', 'inventory.expiry.dispose',
        'sales.view', 'sales.create',
        'stock_counts.perform',
    ],
    'Manager': [
        'inventory.view', 'inventory.add', 'inventory.edit', 'inventory.adjust', 'inventory.bulk_import',
        'inventory.controlled.view', 'inventory.expiry.view', 'inventory.expiry.manage',
        'sales.view', 'sales.create',
        'reports.view', 'reports.export',
        'admin.access_panel', 'admin.users.view', 'admin.audit.view',
        'stock_counts.perform', 'stock_counts.approve',
    ],
    'Warehouse Staff': [
        'inventory.view', 'inventory.add', 'inventory.edit', 'inventory.adjust', 'inventory.bulk_import',
        'stock_counts.perform',
    ],
    'Accountant': [
        'reports.view', 'reports.export',
        'sales.view',
    ],
    'Viewer': [
        'inventory.view',
        'sales.view',
        'reports.view',
    ],
    'Sales Representative': [
        'inventory.view',
        'sales.view', 'sales.create',
    ],
};

interface PermissionEditorProps {
    role: Role;
    onClose: () => void;
}

function CriticalWarning({ onDismiss }: { onDismiss: () => void }) {
    return (
        <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
            <AlertTriangle size={18} className="text-amber-500 shrink-0 mt-0.5" />
            <div className="flex-1">
                <p className="text-sm font-semibold text-amber-800">Enable Critical Permission?</p>
                <p className="text-xs text-amber-600 mt-1">
                    This permission grants privileged access. Only assign it to fully trusted roles.
                </p>
            </div>
            <button onClick={onDismiss} className="text-amber-400 hover:text-amber-600 text-xs underline shrink-0 mt-0.5">
                I understand
            </button>
        </div>
    );
}

export function PermissionEditor({ role, onClose }: PermissionEditorProps) {
    const { data: allPermissions = [] } = useAllPermissions();
    const updateRolePermissions = useUpdateRolePermissions();

    const currentPermIds = useMemo(
        () => new Set((role.permissions ?? []).map((p) => p.id)),
        [role.permissions]
    );

    const [selected, setSelected] = useState<Set<string>>(new Set(currentPermIds));
    const [pendingCritical, setPendingCritical] = useState<string | null>(null);
    const [showCriticalWarning, setShowCriticalWarning] = useState(false);

    const isSuperAdmin = role.name === 'Super Admin';

    const grouped = useMemo(() => {
        const categoryMap: Record<string, Permission[]> = {};
        for (const cat of PERMISSION_CATEGORIES) {
            categoryMap[cat] = [];
        }
        for (const perm of allPermissions) {
            const cat = perm.category;
            if (!categoryMap[cat]) categoryMap[cat] = [];
            categoryMap[cat].push(perm);
        }
        return categoryMap;
    }, [allPermissions]);

    const isCritical = (key: string) =>
        CRITICAL_PERMISSIONS.some((cp) => key === cp || key.startsWith(cp.replace('*', '')));

    const handleToggle = (permId: string, permKey: string) => {
        if (isSuperAdmin) return;
        const willEnable = !selected.has(permId);
        if (willEnable && isCritical(permKey)) {
            setPendingCritical(permId);
            setShowCriticalWarning(true);
            return;
        }
        const next = new Set(selected);
        if (next.has(permId)) next.delete(permId);
        else next.add(permId);
        setSelected(next);
    };

    const confirmCritical = () => {
        if (pendingCritical) {
            const next = new Set(selected);
            next.add(pendingCritical);
            setSelected(next);
        }
        setPendingCritical(null);
        setShowCriticalWarning(false);
    };

    const handleResetToDefault = () => {
        const defaults = SYSTEM_ROLE_DEFAULTS[role.name];
        if (!defaults) return;

        if (defaults.length === 0 && role.name === 'Super Admin') {
            // All permissions
            setSelected(new Set(allPermissions.map((p) => p.id)));
        } else {
            const defaultIds = allPermissions
                .filter((p) => defaults.includes(p.key))
                .map((p) => p.id);
            setSelected(new Set(defaultIds));
        }
    };

    const handleSave = async () => {
        if (isSuperAdmin) {
            // Super admin always gets all permissions at system level
            const allIds = allPermissions.map((p) => p.id);
            await updateRolePermissions.mutateAsync({ roleId: role.id, permissionIds: allIds });
        } else {
            await updateRolePermissions.mutateAsync({
                roleId: role.id,
                permissionIds: Array.from(selected),
            });
        }
        onClose();
    };

    const canReset = role.name in SYSTEM_ROLE_DEFAULTS;

    const categoryColors: Record<string, string> = {
        Admin: 'text-red-600 bg-red-50 border-red-100',
        Inventory: 'text-blue-600 bg-blue-50 border-blue-100',
        Medical: 'text-purple-600 bg-purple-50 border-purple-100',
        Sales: 'text-green-600 bg-green-50 border-green-100',
        Reports: 'text-teal-600 bg-teal-50 border-teal-100',
    };

    return (
        <Modal
            title=""
            onClose={onClose}
            size="xl"
            footer={
                <>
                    {canReset && (
                        <Button
                            variant="ghost"
                            onClick={handleResetToDefault}
                            icon={<RotateCcw size={14} />}
                            className="mr-auto text-text-sub"
                        >
                            Reset to Default
                        </Button>
                    )}
                    <Button variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button
                        variant="primary"
                        loading={updateRolePermissions.isPending}
                        onClick={handleSave}
                    >
                        Save Permissions
                    </Button>
                </>
            }
        >
            {/* Custom header inside body */}
            <div className="flex items-center gap-3 mb-6">
                {role.is_system && (
                    <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center">
                        <Lock size={16} className="text-text-sub" />
                    </div>
                )}
                <div>
                    <h2 className="text-lg font-bold text-text-main">{role.name}</h2>
                    <p className="text-sm text-text-dim">
                        {isSuperAdmin ? 'Super Admin has all permissions' : `${selected.size} of ${allPermissions.length} permissions selected`}
                    </p>
                </div>
            </div>

            {showCriticalWarning && (
                <CriticalWarning onDismiss={confirmCritical} />
            )}

            {isSuperAdmin ? (
                <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700 flex items-center gap-2">
                    <Zap size={16} />
                    <span>Super Admin has all permissions and cannot be restricted.</span>
                </div>
            ) : (
                <div className="space-y-6">
                    {PERMISSION_CATEGORIES.map((category) => {
                        const perms = grouped[category] ?? [];
                        if (perms.length === 0) return null;
                        const catStyle = categoryColors[category] ?? 'text-text-sub bg-surface-dim border-border-dim';
                        const allSelected = perms.every((p) => selected.has(p.id));
                        return (
                            <div key={category}>
                                <div className="flex items-center justify-between mb-3">
                                    <span className={clsx('inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-full border', catStyle)}>
                                        {category}
                                    </span>
                                    <button
                                        className="text-xs text-text-dim hover:text-blue-600 transition"
                                        onClick={() => {
                                            const next = new Set(selected);
                                            if (allSelected) {
                                                perms.forEach((p) => next.delete(p.id));
                                            } else {
                                                perms.forEach((p) => next.add(p.id));
                                            }
                                            setSelected(next);
                                        }}
                                    >
                                        {allSelected ? 'Deselect all' : 'Select all'}
                                    </button>
                                </div>
                                <div className="space-y-2">
                                    {perms.map((perm) => {
                                        const critical = isCritical(perm.key);
                                        const isChecked = selected.has(perm.id);
                                        return (
                                            <label
                                                key={perm.id}
                                                className={clsx(
                                                    'flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all',
                                                    isChecked
                                                        ? critical
                                                            ? 'bg-amber-50 border-amber-200'
                                                            : 'bg-blue-50 border-blue-100'
                                                        : 'bg-card border-border-dim hover:border-border-main hover:bg-surface-dim'
                                                )}
                                            >
                                                <input
                                                    type="checkbox"
                                                    className="mt-0.5 w-4 h-4 rounded accent-blue-600 cursor-pointer shrink-0"
                                                    checked={isChecked}
                                                    onChange={() => handleToggle(perm.id, perm.key)}
                                                />
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm font-semibold text-text-main capitalize">
                                                            {perm.key.split('.').pop()?.replace(/_/g, ' ')}
                                                        </span>
                                                        {critical && (
                                                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full border border-amber-200">
                                                                <AlertTriangle size={10} />
                                                                Critical
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-text-sub mt-0.5">{perm.description}</p>
                                                </div>
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </Modal>
    );
}
