import { useState } from 'react';
import { useRoles, useCreateRole } from '../../hooks/useRoles';
import { Button } from '../ui/Button';

export function CreateRoleModal({ onClose }: { onClose: () => void }) {
    const { data: roles = [] } = useRoles();
    const createRole = useCreateRole();
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [sourceId, setSourceId] = useState('');
    const [error, setError] = useState<string | null>(null);

    const inputCls = "w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/30";

    const handleCreate = async () => {
        if (!name.trim()) { setError('Role name is required'); return; }
        setError(null);
        try {
            await createRole.mutateAsync({
                name: name.trim(),
                description: description.trim(),
                sourceRoleId: sourceId || undefined,
            });
            onClose();
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Failed to create role');
        }
    };

    return (
        <div className="space-y-4">
            <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Role Name *</label>
                <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Senior Pharmacist" />
            </div>
            <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Description</label>
                <textarea className={inputCls} rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What does this role do?" />
            </div>
            <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Copy Permissions From (optional)</label>
                <select className={inputCls} title="Copy permissions from" aria-label="Copy permissions from" value={sourceId} onChange={(e) => setSourceId(e.target.value)}>
                    <option value="">Start empty</option>
                    {roles.map((r) => (
                        <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                </select>
            </div>
            {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <Button variant="secondary" onClick={onClose}>Cancel</Button>
                <Button variant="primary" loading={createRole.isPending} onClick={handleCreate}>Create Role</Button>
            </div>
        </div>
    );
}
