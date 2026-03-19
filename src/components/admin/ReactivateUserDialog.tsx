import { ShieldCheck } from 'lucide-react';
import { Button } from '../ui/Button';
import type { User } from '../../lib/types';

interface ReactivateUserDialogProps {
    user: User;
    loading: boolean;
    onClose: () => void;
    onConfirm: () => void;
}

export function ReactivateUserDialog({
    user,
    loading,
    onClose,
    onConfirm,
}: ReactivateUserDialogProps) {
    return (
        <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                <ShieldCheck size={20} className="mt-0.5 shrink-0 text-emerald-600" />
                <div>
                    <h3 className="text-sm font-bold text-emerald-900">Reactivate User</h3>
                    <p className="mt-1 text-sm leading-relaxed text-emerald-800">
                        This user account will regain system access.
                    </p>
                </div>
            </div>

            <div className="rounded-xl border border-border-dim bg-surface-dim/40 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-text-dim">User</p>
                <p className="mt-1 text-sm font-semibold text-text-main">
                    {user.full_name || user.email}
                </p>
                <p className="text-sm text-text-sub">{user.email}</p>
            </div>

            <div className="flex justify-end gap-3">
                <Button variant="secondary" onClick={onClose}>
                    Cancel
                </Button>
                <Button
                    variant="primary"
                    loading={loading}
                    onClick={onConfirm}
                    className="bg-emerald-600 hover:bg-emerald-500 border-none shadow-emerald-900/20"
                >
                    Reactivate
                </Button>
            </div>
        </div>
    );
}
