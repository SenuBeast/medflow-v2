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
        <Card className="group flex flex-col h-full hover:-translate-y-1 hover:shadow-lg transition-all duration-300 border border-slate-200/60 bg-white">
            <div className="flex items-start justify-between mb-5">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform duration-300">
                        {role.is_system ? (
                            <Lock size={18} className="text-slate-400" strokeWidth={2.5} />
                        ) : (
                            <Settings size={18} className="text-teal-600" strokeWidth={2.5} />
                        )}
                    </div>
                    <div className="min-w-0">
                        <h3 className="text-sm font-bold text-slate-900 truncate tracking-tight">{role.name}</h3>
                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-1 break-all">{role.description}</p>
                    </div>
                </div>
                {role.is_system && (
                    <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold text-slate-500 bg-slate-100/80 px-2 py-1 rounded-md border border-slate-200/60 shrink-0">
                        <ShieldCheck size={12} />
                        Core
                    </span>
                )}
            </div>

            {/* Stats Area */}
            <div className="flex flex-wrap items-center gap-2 mb-auto pb-5">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-50 border border-slate-100 rounded-lg">
                    <span className="text-sm font-bold text-slate-900 tabular-nums">{permCount}</span>
                    <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Perms</span>
                </div>
                {hasCritical && (
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-amber-50/50 border border-amber-200/50 rounded-lg text-amber-700">
                        <AlertTriangle size={12} strokeWidth={2.5} />
                        <span className="text-[10px] font-bold uppercase tracking-wider">Critical</span>
                    </div>
                )}
            </div>

            {/* Actions Footer */}
            <div className="pt-4 border-t border-slate-100 flex items-center gap-2 mt-auto">
                <Button
                    variant="ghost"
                    size="sm"
                    icon={<Settings size={14} className="text-slate-400 group-hover/btn:text-slate-600 transition-colors" />}
                    onClick={() => onEditPermissions(role)}
                    className="flex-1 justify-center bg-slate-50/50 hover:bg-slate-100 text-slate-700 font-medium group/btn"
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
