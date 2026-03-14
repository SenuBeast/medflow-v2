import { AlertTriangle } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { RoleBadge } from '../../components/ui/Badge';
import type { Role, Permission } from '../../lib/types';
import { CRITICAL_PERMISSIONS } from '../../lib/constants';
import { clsx } from 'clsx';
import { getRoleClassName } from '../../lib/roleUtils';
import './RoleCard.css';

interface RoleCardProps {
    role: Role;
    onEditPermissions: (role: Role) => void;
    onDelete?: (role: Role) => void;
}

export function RoleCard({ role, onEditPermissions, onDelete }: RoleCardProps) {
    const permCount = role.permissions?.length ?? 0;
    const hasCritical = role.permissions?.some((p: Permission) =>
        CRITICAL_PERMISSIONS.some((cp: string) => p.key === cp || p.key.startsWith(cp.replace('.*', '.')))
    );

    const roleClass = getRoleClassName(role.name);

    return (
        <Card className={clsx(
            "group flex flex-col h-full hover:-translate-y-1 hover:shadow-lg transition-all duration-300 border border-border-dim bg-card font-inter role-card",
            roleClass
        )}>
            <div className="flex items-start justify-between mb-5">
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                        <RoleBadge 
                            roleName={role.name} 
                            isCustom={!role.is_system} 
                            showLock={true} 
                        />
                        {hasCritical && (
                            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-amber-500/10 border border-amber-500/50 rounded-lg text-amber-600 shrink-0 select-none">
                                <AlertTriangle size={10} strokeWidth={2.5} />
                                <span className="text-[10px] font-bold uppercase tracking-tight">Critical</span>
                            </div>
                        )}
                    </div>
                    <p className="text-sm text-text-main/80 line-clamp-2 leading-relaxed min-h-[42px]">{role.description}</p>
                </div>
            </div>

            {/* Stats Area */}
            <div className="flex flex-wrap items-center gap-2 mb-auto pb-5">
                <div className="inline-flex items-center gap-2 text-brand">
                    <span className="text-sm font-bold tabular-nums">{permCount}</span>
                    <span className="text-[12px] font-semibold text-brand/80">permissions</span>
                </div>
            </div>

            {/* Actions Footer */}
            <div className="pt-4 border-t border-border-dim flex items-center gap-2 mt-auto">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEditPermissions(role)}
                    className="flex-1 justify-center bg-surface-dim/50 hover:bg-surface-elevated text-text-sub font-medium group/btn border border-border-dim"
                >
                    Edit Permission
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
