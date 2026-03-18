import { AlertTriangle } from 'lucide-react';
import { Button } from '../ui/Button';
import type { User } from '../../lib/types';

interface DeactivateUserDialogProps {
    user: User;
    loading: boolean;
    onClose: () => void;
    onConfirm: () => void;
}

export function DeactivateUserDialog({
    user,
    loading,
    onClose,
    onConfirm,
}: DeactivateUserDialogProps) {
    return (
        <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
                <AlertTriangle size={20} className="mt-0.5 shrink-0 text-amber-600" />
                <div>
                    <h3 className="text-sm font-bold text-amber-900">Deactivate User</h3>
                    <p className="mt-1 text-sm leading-relaxed text-amber-800">
                        This user will lose access to MedFlow but their historical data will remain.
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
                    className="!bg-amber-400 !text-amber-950 hover:!bg-amber-500 !font-bold !border-none !shadow-sm"
                >
                    Deactivate User
                </Button>
            </div>
        </div>
    );
}
