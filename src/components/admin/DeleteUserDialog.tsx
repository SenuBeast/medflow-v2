import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import type { User } from '../../lib/types';

interface DeleteUserDialogProps {
    user: User;
    loading: boolean;
    onClose: () => void;
    onConfirm: () => void;
}

export function DeleteUserDialog({
    loading,
    onClose,
    onConfirm,
}: DeleteUserDialogProps) {
    const confirmationValue = 'Delete';
    const [confirmationInput, setConfirmationInput] = useState('');

    return (
        <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-xl border border-danger/20 bg-danger/10 p-4">
                <AlertTriangle size={20} className="mt-0.5 shrink-0 text-danger" />
                <div>
                    <h3 className="text-sm font-bold text-danger">Permanently Delete User</h3>
                    <p className="mt-1 text-sm leading-relaxed text-danger/90">
                        This action will permanently remove the user from MedFlow. This cannot be undone.
                    </p>
                </div>
            </div>

            <div className="rounded-xl border border-border-dim bg-surface-dim/40 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-text-dim">Type to confirm</p>
                <p className="mt-1 text-sm text-text-sub">
                    Enter <span className="font-semibold text-text-main">Delete</span> to continue.
                </p>
            </div>

            <Input
                label="Confirmation"
                value={confirmationInput}
                onChange={(event) => setConfirmationInput(event.target.value)}
                placeholder={confirmationValue}
                autoFocus
            />

            <div className="flex justify-end gap-3">
                <Button variant="secondary" onClick={onClose}>
                    Cancel
                </Button>
                <Button
                    variant="danger"
                    loading={loading}
                    disabled={confirmationInput.trim() !== confirmationValue}
                    onClick={onConfirm}
                >
                    Delete Permanently
                </Button>
            </div>
        </div>
    );
}
