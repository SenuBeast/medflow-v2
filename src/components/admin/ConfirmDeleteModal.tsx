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
            <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-100 rounded-xl">
                <AlertTriangle size={20} className="text-red-500 shrink-0 mt-0.5" />
                <div>
                    <h3 className="text-sm font-bold text-red-900">Delete "{role.name}"?</h3>
                    <p className="text-xs text-red-700/80 mt-1 leading-relaxed">
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
