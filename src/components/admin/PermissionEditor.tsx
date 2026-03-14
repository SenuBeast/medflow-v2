import { useState, useMemo } from 'react';
import { 
    AlertTriangle, RotateCcw, Search, X, 
    Shield, Box, Pill, ShoppingBag, BarChart, Zap 
} from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { useAllPermissions, useUpdateRolePermissions } from '../../hooks/useRoles';
import { 
    CRITICAL_PERMISSIONS, 
    PERMISSION_CATEGORIES, 
    SYSTEM_ROLE_DEFAULTS 
} from '../../lib/constants';
import type { Role, Permission } from '../../lib/types';
import { clsx } from 'clsx';
import { RoleBadge } from '../../components/ui/Badge';

// Icon Map for Categories
const CategoryIcons: Record<string, any> = {
    Shield,
    Box,
    Pill,
    ShoppingBag,
    BarChart,
};

function getPermissionLabel(key: string) {
    const parts = key.split('.');
    if (parts.length === 1) return parts[0].replace(/_/g, ' ');
    
    const action = parts[parts.length - 1].replace(/_/g, ' ');
    const subject = parts[parts.length - 2].replace(/_/g, ' ');
    
    // Capitalize first letter of each
    const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
    
    // If action is "view", "manage", "create", etc., swap them for better flow: "Manage Roles" instead of "Roles manage"
    const commonActions = ['view', 'manage', 'create', 'edit', 'delete', 'add', 'adjust', 'export', 'perform', 'approve', 'deactivate', 'assign', 'refund', 'discount', 'dispense'];
    
    if (commonActions.includes(action.toLowerCase())) {
        return `${capitalize(action)} ${capitalize(subject)}`;
    }
    
    return capitalize(action);
}

interface PermissionEditorProps {
    role: Role;
    onClose: () => void;
}

function CriticalWarning({ onDismiss }: { onDismiss: () => void }) {
    return (
        <div className="mb-4 p-3 bg-[#fee2e2] border border-[#fecaca] rounded-xl flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-2">
                <AlertTriangle size={16} className="text-[#991b1b]" />
                <p className="text-xs font-bold text-[#991b1b] uppercase tracking-tight">Critical Access Required</p>
            </div>
            <button 
                onClick={onDismiss} 
                className="px-3 py-1 bg-[#991b1b] text-white text-[10px] font-bold rounded-lg hover:bg-black transition-colors"
            >
                Confirm
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
    const [searchQuery, setSearchQuery] = useState('');
    const [activeCategory, setActiveCategory] = useState<string | 'all'>('all');
    const [pendingCritical, setPendingCritical] = useState<string | null>(null);
    const [showCriticalWarning, setShowCriticalWarning] = useState(false);

    const isSuperAdmin = role.name === 'Super Admin';

    const filteredPermissions = useMemo(() => {
        return allPermissions.filter((p: Permission) => {
            const matchesSearch = 
                p.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
                p.description.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesCategory = activeCategory === 'all' || p.category === activeCategory;
            return matchesSearch && matchesCategory;
        });
    }, [allPermissions, searchQuery, activeCategory]);

    const grouped = useMemo(() => {
        const categoryMap: Record<string, Permission[]> = {};
        for (const cat of PERMISSION_CATEGORIES) {
            categoryMap[cat.id] = [];
        }
        for (const perm of filteredPermissions) {
            const cat = perm.category;
            if (!categoryMap[cat]) categoryMap[cat] = [];
            categoryMap[cat].push(perm);
        }
        return categoryMap;
    }, [filteredPermissions]);

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

        const defaultIds = allPermissions
            .filter((p: Permission) => defaults.includes(p.key))
            .map((p: Permission) => p.id);
        setSelected(new Set(defaultIds));
    };

    const handleSave = async () => {
        const allIds: string[] = isSuperAdmin 
            ? allPermissions.map((p: Permission) => p.id)
            : Array.from(selected);
            
        await updateRolePermissions.mutateAsync({
            roleId: role.id,
            permissionIds: allIds,
        });
        onClose();
    };

    return (
        <Modal
            title=""
            onClose={onClose}
            size="xl"
            footer={
                <div className="flex items-center justify-between w-full px-2">
                    {!isSuperAdmin ? (
                        <>
                            <Button
                                variant="danger"
                                onClick={handleResetToDefault}
                                className="rounded-xl px-6 bg-[#ef4444] hover:bg-[#dc2626] border-none"
                                icon={<RotateCcw size={16} />}
                            >
                                Reset to Default
                            </Button>
                            <div className="flex gap-3">
                                <Button variant="ghost" onClick={onClose} className="rounded-xl px-6">
                                    Cancel
                                </Button>
                                <Button
                                    variant="primary"
                                    loading={updateRolePermissions.isPending}
                                    onClick={handleSave}
                                    className="rounded-xl px-8"
                                >
                                    Apply Changes
                                </Button>
                            </div>
                        </>
                    ) : (
                        <div className="flex justify-end w-full">
                            <Button variant="primary" onClick={onClose} className="rounded-xl px-8">
                                Close
                            </Button>
                        </div>
                    )}
                </div>
            }
        >
            <div className="mb-8">
                <div className="flex flex-wrap items-center gap-3 mb-2">
                    <RoleBadge 
                        roleName={role.name} 
                        isCustom={!role.is_system} 
                        showLock={true}
                    />
                    {role.permissions?.some((p: any) => isCritical(p.key)) && (
                        <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-amber-500/10 border border-amber-500/50 rounded-lg text-amber-600">
                            <AlertTriangle size={10} strokeWidth={2.5} />
                            <span className="text-[10px] font-bold uppercase tracking-tight">Critical</span>
                        </div>
                    )}
                </div>
                <p className="text-text-main/80 text-sm">Manage access control for this role.</p>
            </div>

            {/* Controls: Search & Counter */}
            {!isSuperAdmin && (
                <>
                    <div className="flex flex-col md:flex-row items-center gap-4 mb-6">
                        <div className="relative flex-1 group w-full">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-dim group-focus-within:text-brand transition-colors" size={18} />
                            <input
                                type="search"
                                placeholder="Search permissions..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-12 pr-4 py-3.5 bg-surface-dim border border-border-dim focus:border-brand/50 focus:ring-4 focus:ring-brand/10 rounded-2xl text-sm transition-all focus:outline-none"
                            />
                            {searchQuery && (
                                <button 
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-text-dim hover:text-text-main"
                                >
                                    <X size={16} />
                                </button>
                            )}
                        </div>
                        <div className="flex items-center gap-1.5 text-brand shrink-0">
                            <span className="font-bold text-sm">{selected.size}</span>
                            <span className="text-[13px] font-semibold text-brand/80">permissions</span>
                        </div>
                    </div>

                    {/* Category Tabs */}
                    <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2 no-scrollbar">
                        <button
                            onClick={() => setActiveCategory('all')}
                            className={clsx(
                                'px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all duration-200',
                                activeCategory === 'all'
                                    ? 'bg-brand text-text-inverse shadow-lg shadow-brand/20'
                                    : 'bg-surface-dim text-text-dim hover:bg-border-dim hover:text-text-sub'
                            )}
                        >
                            All categories
                        </button>
                        {PERMISSION_CATEGORIES.map((cat) => {
                            const Icon = CategoryIcons[cat.icon];
                            return (
                                <button
                                    key={cat.id}
                                    onClick={() => setActiveCategory(cat.id)}
                                    className={clsx(
                                        'flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all duration-200 border border-transparent',
                                        activeCategory === cat.id
                                            ? 'bg-brand/10 text-brand border-brand/20'
                                            : 'bg-surface-dim text-text-dim hover:bg-border-dim hover:text-text-sub'
                                    )}
                                >
                                    {Icon && <Icon size={16} />}
                                    {cat.label}
                                </button>
                            );
                        })}
                    </div>
                </>
            )}

            {showCriticalWarning && !isSuperAdmin && (
                <CriticalWarning onDismiss={confirmCritical} />
            )}

            {/* Permission List Area */}
            <div className="min-h-[400px] max-h-[500px] overflow-y-auto pr-2 custom-scrollbar flex flex-col">
                {isSuperAdmin ? (
                    <div className="flex-1 flex flex-col items-center justify-center py-20 text-center animate-in fade-in zoom-in duration-500">
                        <div className="w-20 h-20 bg-amber-500/10 rounded-full flex items-center justify-center mb-6 border border-amber-500/20 shadow-lg shadow-amber-500/5">
                            <Zap size={40} className="text-amber-500 fill-amber-500/20" />
                        </div>
                        <h3 className="text-xl font-bold text-text-main mb-2">Unrestricted Access</h3>
                        <p className="text-text-dim text-sm max-w-sm leading-relaxed">
                            The Super Admin role is hardcoded to possess all system permissions.
                            <br />
                            Granular access control cannot be applied to this role.
                        </p>
                    </div>
                ) : allPermissions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="w-16 h-16 bg-surface-dim rounded-full flex items-center justify-center mb-4">
                            <Shield size={32} className="text-border-main" />
                        </div>
                        <h3 className="text-lg font-bold text-text-main">Loading permissions...</h3>
                        <p className="text-text-dim text-sm max-w-xs mt-1">Fetching the latest access control data from server.</p>
                    </div>
                ) : filteredPermissions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="w-16 h-16 bg-surface-dim rounded-full flex items-center justify-center mb-4">
                            <Search size={32} className="text-border-main" />
                        </div>
                        <h3 className="text-lg font-bold text-text-main">No permissions found</h3>
                        <p className="text-text-dim text-sm max-w-xs mt-1">Try adjusting your search query or switching categories.</p>
                    </div>
                ) : (
                    <div className="space-y-8 pb-4">
                        {PERMISSION_CATEGORIES.map((category) => {
                            const perms = grouped[category.id] ?? [];
                            if (perms.length === 0) return null;
                            const Icon = CategoryIcons[category.icon];
                            
                            return (
                                <div key={category.id} className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                                    <div className="flex items-center gap-2 mb-4">
                                        <div className="bg-brand/10 p-1.5 rounded-lg">
                                            {Icon && <Icon size={14} className="text-brand" />}
                                        </div>
                                        <h3 className="text-sm font-bold text-text-sub uppercase tracking-wider">{category.label}</h3>
                                        <div className="h-px flex-1 bg-border-dim ml-2" />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {perms.map((perm: Permission) => {
                                            const critical = isCritical(perm.key);
                                            const isChecked = selected.has(perm.id);
                                            return (
                                                <label
                                                    key={perm.id}
                                                    className={clsx(
                                                        'group flex items-start gap-4 p-4 rounded-2xl border transition-all duration-200 cursor-pointer overflow-hidden relative',
                                                        isChecked
                                                            ? 'bg-brand/10 border-brand/50'
                                                            : 'bg-card border-border-dim hover:border-text-dim/20 hover:bg-surface-dim'
                                                    )}
                                                >
                                                    {/* Selection Glow */}
                                                    {isChecked && (
                                                        <div className={clsx(
                                                            "absolute inset-0 opacity-10 bg-brand",
                                                        )} />
                                                    )}
                                                    
                                                    <div className="relative z-10 flex h-5 items-center mt-1">
                                                        <input
                                                            type="checkbox"
                                                            className={clsx(
                                                                "w-4 h-4 rounded cursor-pointer transition-all accent-brand",
                                                            )}
                                                            checked={isChecked}
                                                            onChange={() => handleToggle(perm.id, perm.key)}
                                                            disabled={isSuperAdmin}
                                                        />
                                                    </div>
                                                    
                                                    <div className="min-w-0 flex-1 relative z-10">
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <span className={clsx(
                                                                "text-sm font-bold transition-colors",
                                                                isChecked ? "text-text-main" : "text-text-sub group-hover:text-text-main"
                                                            )}>
                                                                {getPermissionLabel(perm.key)}
                                                            </span>
                                                            {critical && (
                                                                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-[#fee2e2] border border-[#fecaca] rounded-full text-[#991b1b]">
                                                                    <AlertTriangle size={10} strokeWidth={2.5} />
                                                                    <span className="text-[10px] font-bold uppercase tracking-tight">Critical</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                        <p className="text-xs text-text-dim mt-1.5 leading-relaxed truncate group-hover:whitespace-normal">
                                                            {perm.description}
                                                        </p>
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
            </div>
        </Modal>
    );
}
