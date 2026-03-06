import { useState, useMemo } from 'react';
import { ShieldAlert, RotateCcw, Lock, Zap, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
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

interface PermissionModalProps {
    role: Role;
    onClose: () => void;
}

function CriticalWarning({ onDismiss }: { onDismiss: () => void }) {
    return (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200/60 rounded-xl flex items-start gap-3 shadow-sm shadow-amber-100/20 animate-in fade-in slide-in-from-top-2">
            <ShieldAlert size={18} className="text-amber-500 shrink-0 mt-0.5" />
            <div className="flex-1">
                <p className="text-sm font-semibold text-amber-900">Enable Critical Permission?</p>
                <p className="text-xs text-amber-700/80 mt-1 leading-relaxed">
                    This permission grants privileged access that can bypass standard security controls. Only assign it to fully trusted administrative roles.
                </p>
            </div>
            <button
                onClick={onDismiss}
                className="px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-800 text-xs font-medium rounded-lg transition-colors shrink-0"
            >
                I understand
            </button>
        </div>
    );
}

export function PermissionModal({ role, onClose }: PermissionModalProps) {
    const { data: allPermissions = [] } = useAllPermissions();
    const updateRolePermissions = useUpdateRolePermissions();

    const currentPermIds = useMemo(
        () => new Set((role.permissions ?? []).map((p) => p.id)),
        [role.permissions]
    );

    const [selected, setSelected] = useState<Set<string>>(new Set(currentPermIds));
    const [pendingCritical, setPendingCritical] = useState<string | null>(null);
    const [showCriticalWarning, setShowCriticalWarning] = useState(false);

    // Track expanded state for categories to make dense UI manageable
    const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(PERMISSION_CATEGORIES));

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

    const toggleCategoryExpanded = (category: string) => {
        const next = new Set(expandedCategories);
        if (next.has(category)) next.delete(category);
        else next.add(category);
        setExpandedCategories(next);
    };

    const handleResetToDefault = () => {
        const defaults = SYSTEM_ROLE_DEFAULTS[role.name];
        if (!defaults) return;

        if (defaults.length === 0 && role.name === 'Super Admin') {
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

    return (
        <Modal
            title=""
            onClose={onClose}
            size="xl"
            footer={
                <>
                    {canReset && (
                        <button
                            onClick={handleResetToDefault}
                            className="mr-auto inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                            <RotateCcw size={14} />
                            Reset to Default
                        </button>
                    )}
                    <Button variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button
                        variant="primary"
                        loading={updateRolePermissions.isPending}
                        onClick={handleSave}
                        className="min-w-[140px]"
                    >
                        Save Configurations
                    </Button>
                </>
            }
        >
            {/* Header Area */}
            <div className="flex items-center gap-4 mb-6 pb-6 border-b border-slate-100">
                {role.is_system && (
                    <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 border border-slate-200">
                        <Lock size={20} className="text-slate-500" />
                    </div>
                )}
                <div>
                    <h2 className="text-xl font-bold text-slate-900 tracking-tight">{role.name}</h2>
                    <p className="text-sm text-slate-500 mt-0.5">
                        {isSuperAdmin
                            ? 'Super Admin implicitly holds all system permissions.'
                            : `Configured with ${selected.size} active permissions out of ${allPermissions.length} available.`}
                    </p>
                </div>
            </div>

            {showCriticalWarning && (
                <CriticalWarning onDismiss={confirmCritical} />
            )}

            {isSuperAdmin ? (
                <div className="p-6 bg-slate-50 border border-slate-200 rounded-xl text-center flex flex-col items-center">
                    <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm border border-slate-100 mb-3">
                        <Zap size={24} className="text-amber-500" />
                    </div>
                    <h3 className="text-sm font-semibold text-slate-900 mb-1">Unrestricted Access</h3>
                    <p className="text-xs text-slate-500 max-w-sm">
                        The Super Admin role is hardcoded to possess all system permissions. Granular access control cannot be applied to this role.
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    {PERMISSION_CATEGORIES.map((category) => {
                        const perms = grouped[category] ?? [];
                        if (perms.length === 0) return null;

                        const allSelected = perms.every((p) => selected.has(p.id));
                        const someSelected = perms.some((p) => selected.has(p.id));
                        const isExpanded = expandedCategories.has(category);

                        return (
                            <div key={category} className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
                                {/* Category Header (Sticky mechanism via relative/sticky depends on modal scroll setup, standard flex here) */}
                                <div
                                    className={clsx(
                                        "flex items-center justify-between p-3 bg-slate-50/80 cursor-pointer transition-colors hover:bg-slate-100/80",
                                        isExpanded && "border-b border-slate-200"
                                    )}
                                    onClick={() => toggleCategoryExpanded(category)}
                                >
                                    <div className="flex items-center gap-3">
                                        <button className="text-slate-400 hover:text-slate-600">
                                            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                        </button>
                                        <div>
                                            <h4 className="text-sm font-semibold text-slate-800">{category} Access</h4>
                                            <p className="text-xs text-slate-500">
                                                {perms.filter(p => selected.has(p.id)).length} of {perms.length} enabled
                                            </p>
                                        </div>
                                    </div>

                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation(); // prevent accordion toggle
                                            const next = new Set(selected);
                                            if (allSelected) {
                                                perms.forEach((p) => next.delete(p.id));
                                            } else {
                                                perms.forEach((p) => next.add(p.id));
                                            }
                                            setSelected(next);
                                        }}
                                        className={clsx(
                                            "px-3 py-1.5 text-xs font-medium rounded-lg transition-all",
                                            allSelected
                                                ? "bg-slate-200 text-slate-700 hover:bg-slate-300"
                                                : someSelected
                                                    ? "bg-teal-50 text-teal-700 hover:bg-teal-100"
                                                    : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                                        )}
                                    >
                                        {allSelected ? 'Deselect All' : 'Select All'}
                                    </button>
                                </div>

                                {/* Dense Permission Grid */}
                                {isExpanded && (
                                    <div className="p-3 grid grid-cols-1 md:grid-cols-2 gap-2 bg-white">
                                        {perms.map((perm) => {
                                            const critical = isCritical(perm.key);
                                            const isChecked = selected.has(perm.id);

                                            return (
                                                <label
                                                    key={perm.id}
                                                    className={clsx(
                                                        'group relative flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all duration-200',
                                                        isChecked
                                                            ? critical
                                                                ? 'bg-amber-50/50 border-amber-200/60 shadow-sm'
                                                                : 'bg-teal-50/30 border-teal-200/50 shadow-sm'
                                                            : 'bg-white border-slate-100 hover:border-slate-300 hover:bg-slate-50 hover:shadow-sm'
                                                    )}
                                                >
                                                    {/* Custom Animated Checkbox */}
                                                    <div className="relative flex items-center justify-center shrink-0 mt-0.5">
                                                        <input
                                                            type="checkbox"
                                                            className="peer sr-only"
                                                            checked={isChecked}
                                                            onChange={() => handleToggle(perm.id, perm.key)}
                                                        />
                                                        <div className={clsx(
                                                            "w-4 h-4 rounded border transition-all duration-200 flex items-center justify-center",
                                                            isChecked
                                                                ? "bg-teal-600 border-teal-600"
                                                                : "bg-white border-slate-300 group-hover:border-slate-400"
                                                        )}>
                                                            <Check size={12} strokeWidth={3} className={clsx(
                                                                "text-white transition-transform duration-200",
                                                                isChecked ? "scale-100" : "scale-0"
                                                            )} />
                                                        </div>
                                                    </div>

                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className={clsx(
                                                                "text-sm font-semibold transition-colors duration-200 tracking-tight",
                                                                isChecked ? "text-slate-900" : "text-slate-700"
                                                            )}>
                                                                {perm.key.split('.').pop()?.replace(/_/g, ' ')}
                                                            </span>
                                                            {critical && (
                                                                <span className="inline-flex items-center px-1.5 py-0.5 bg-amber-100/50 text-amber-800 text-[10px] uppercase tracking-wider font-bold rounded shadow-sm border border-amber-200/50">
                                                                    Critical
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className={clsx(
                                                            "text-xs leading-relaxed transition-colors duration-200",
                                                            isChecked ? "text-slate-600" : "text-slate-500"
                                                        )}>
                                                            {perm.description}
                                                        </p>
                                                        <div className="mt-1.5">
                                                            <span className="inline-block px-1.5 py-0.5 bg-slate-100 text-slate-500 text-[10px] font-mono rounded">
                                                                {perm.key}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </label>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </Modal>
    );
}
