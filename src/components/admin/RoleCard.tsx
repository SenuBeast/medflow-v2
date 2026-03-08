import { Lock, Settings, AlertTriangle, ShieldCheck } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import type { Role } from '../../lib/types';
import { CRITICAL_PERMISSIONS } from '../../lib/constants';

interface RoleCardProps {
    role: Role;
    onEditPermissions: (role: Role) => void;
    onDelete?: (role: Role) => void;
}

export function RoleCard({ role, onEditPermissions, onDelete }: RoleCardProps) {
    const permCount = role.permissions?.length ?? 0;
    const hasCritical = role.permissions?.some((p) =>
        CRITICAL_PERMISSIONS.some((cp) => p.key === cp || p.key.startsWith(cp.replace('.*', '.')))
    );

    return (
        <Card className="group flex flex-col h-full hover:-translate-y-1 hover:shadow-lg transition-all duration-300 border border-border-dim bg-card">
            <div className="flex items-start justify-between mb-5">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-surface-dim border border-border-dim flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform duration-300">
                        {role.is_system ? (
                            <Lock size={18} className="text-text-dim" strokeWidth={2.5} />
                        ) : (
                            <Settings size={18} className="text-brand" strokeWidth={2.5} />
                        )}
                    </div>
                    <div className="min-w-0">
                        <h3 className="text-sm font-bold text-text-main truncate tracking-tight">{role.name}</h3>
                        <p className="text-xs text-text-dim mt-0.5 line-clamp-1 break-all">{role.description}</p>
                    </div>
                </div>
                {role.is_system && (
                    <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold text-text-sub bg-surface-elevated px-2 py-1 rounded-md border border-border-dim shrink-0">
                        <ShieldCheck size={12} />
                        Core
                    </span>
                )}
            </div>

            {/* Stats Area */}
            <div className="flex flex-wrap items-center gap-2 mb-auto pb-5">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-surface-dim border border-border-dim rounded-lg">
                    <span className="text-sm font-bold text-text-main tabular-nums">{permCount}</span>
                    <span className="text-[10px] font-semibold text-text-dim uppercase tracking-wider">Perms</span>
                </div>
                {hasCritical && (
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-warning/10 border border-warning/20 rounded-lg text-warning">
                        <AlertTriangle size={12} strokeWidth={2.5} />
                        <span className="text-[10px] font-bold uppercase tracking-wider">Critical</span>
                    </div>
                )}
            </div>

            {/* Actions Footer */}
            <div className="pt-4 border-t border-border-dim flex items-center gap-2 mt-auto">
                <Button
                    variant="ghost"
                    size="sm"
                    icon={<Settings size={14} className="text-text-dim group-hover/btn:text-text-main transition-colors" />}
                    onClick={() => onEditPermissions(role)}
                    className="flex-1 justify-center bg-surface-dim/50 hover:bg-surface-elevated text-text-sub font-medium group/btn"
                >
                    Edit Access
                </Button>
                {!role.is_system && onDelete && (
                    <Button
                        variant="danger"
                        size="sm"
                        onClick={() => onDelete(role)}
                        className="px-3"
                    >
                        Delete
                    </Button>
                )}
            </div>
        </Card>
    );
}
