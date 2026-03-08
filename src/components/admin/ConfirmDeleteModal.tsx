import { AlertTriangle } from 'lucide-react';
import { Button } from '../ui/Button';
import type { Role } from '../../lib/types';

export function ConfirmDeleteModal({
    role,
    onConfirm,
    onClose,
    loading,
}: {
    role: Role;
    onConfirm: () => void;
    onClose: () => void;
    loading: boolean;
}) {
    return (
        <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 bg-danger/10 border border-danger/20 rounded-xl">
                <AlertTriangle size={20} className="text-danger shrink-0 mt-0.5" />
                <div>
                    <h3 className="text-sm font-bold text-danger">Delete "{role.name}"?</h3>
                    <p className="text-xs text-danger/80 mt-1 leading-relaxed">
                        This action cannot be undone. Users assigned this role will immediately lose access and will need a reassignment.
                    </p>
                </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
                <Button variant="secondary" onClick={onClose}>Cancel</Button>
                <Button variant="danger" loading={loading} onClick={onConfirm}>Delete Role</Button>
            </div>
        </div>
    );
}
