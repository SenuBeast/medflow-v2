import { useState } from 'react';
import { Modal } from '../../ui/Modal';
import { Button } from '../../ui/Button';
import { useCreateStockCountSession } from '../../../hooks/useStockCounts';
import { useNavigate } from 'react-router-dom';

interface CreateSessionModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function CreateSessionModal({ isOpen, onClose }: CreateSessionModalProps) {
    const [type, setType] = useState<'full' | 'partial' | 'cycle'>('full');
    const [notes, setNotes] = useState('');
    const createSession = useCreateStockCountSession();
    const navigate = useNavigate();

    const handleCreate = async () => {
        try {
            const session = await createSession.mutateAsync({ type, notes });
            onClose();
            // Automatically navigate to the new session page
            navigate(`/stock-counts/${session.id}`);
        } catch (error) {
            console.error("Failed to create session:", error);
            // Ideally should show a toast notification here
        }
    };

    if (!isOpen) return null;

    return (
        <Modal title="Initialize Stock Count" onClose={onClose} size="sm">
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Count Type
                    </label>
                    <select
                        title="Stock count type"
                        className="w-full px-3 py-2 rounded-lg border border-border-main text-sm bg-card focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                        value={type}
                        onChange={(e) => setType(e.target.value as 'full' | 'partial' | 'cycle')}
                    >
                        <option value="full">Full Count (All System Batches)</option>
                        <option value="partial">Partial Count (Specific Category/Location)</option>
                        <option value="cycle">Cycle Count (Periodic Review)</option>
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Notes (Optional)
                    </label>
                    <textarea
                        title="Session notes"
                        placeholder="e.g., Q3 Full Warehouse Audit"
                        className="w-full px-3 py-2 rounded-lg border border-border-main text-sm bg-card focus:outline-none focus:ring-2 focus:ring-blue-500/30 min-h-[80px]"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                    />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-border-dim">
                    <Button variant="secondary" onClick={onClose} disabled={createSession.isPending}>
                        Cancel
                    </Button>
                    <Button variant="primary" onClick={handleCreate} loading={createSession.isPending}>
                        Start Counting
                    </Button>
                </div>
            </div>
        </Modal>
    );
}

