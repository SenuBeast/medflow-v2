import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { clsx } from 'clsx';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { BulkInventoryEntryForm } from '../../components/inventory/BulkInventoryEntryForm';
import {
    useInventory,
    useSuppliers,
    useAddBatch,
    useCreateGrnReceipt,
    type GrnReceiptInput,
} from '../../hooks/useInventory';
import type { ItemBatch } from '../../lib/types';

type BatchPayload = Omit<ItemBatch, 'id' | 'created_at' | 'updated_at'>;
type BulkMode = 'grn' | 'batch';

export function BulkInventoryEntryPage() {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const { data: items = [], isLoading: itemsLoading } = useInventory();
    const { data: suppliers = [] } = useSuppliers();
    const addBatch = useAddBatch();
    const createGrnReceipt = useCreateGrnReceipt();

    const modeParam = searchParams.get('mode');
    const mode: BulkMode = modeParam === 'batch' ? 'batch' : 'grn';
    const defaultProductId = searchParams.get('product_id');

    const [submitting, setSubmitting] = useState(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [formVersion, setFormVersion] = useState(0);

    const subtitle = useMemo(() => {
        if (mode === 'batch') return 'Batch Intake Grid';
        return 'GRN Intake Grid';
    }, [mode]);

    const setMode = (nextMode: BulkMode) => {
        const nextParams = new URLSearchParams(searchParams);
        nextParams.set('mode', nextMode);
        setSearchParams(nextParams);
        setSuccessMessage(null);
    };

    const handleBatchSubmit = async (rows: BatchPayload[]) => {
        setSubmitting(true);
        try {
            for (let index = 0; index < rows.length; index += 1) {
                try {
                    await addBatch.mutateAsync(rows[index]);
                } catch (error) {
                    const message = error instanceof Error ? error.message : 'Failed to add batch';
                    throw new Error(`Batch row ${index + 1}: ${message}`);
                }
            }
            setSuccessMessage(`Successfully submitted ${rows.length} batch row(s).`);
            setFormVersion((prev) => prev + 1);
        } finally {
            setSubmitting(false);
        }
    };

    const handleGrnSubmit = async (rows: GrnReceiptInput[]) => {
        setSubmitting(true);
        try {
            for (let index = 0; index < rows.length; index += 1) {
                try {
                    await createGrnReceipt.mutateAsync(rows[index]);
                } catch (error) {
                    const message = error instanceof Error ? error.message : 'Failed to receive GRN row';
                    throw new Error(`GRN row ${index + 1}: ${message}`);
                }
            }
            setSuccessMessage(`Successfully submitted ${rows.length} GRN row(s).`);
            setFormVersion((prev) => prev + 1);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-xl md:text-2xl font-bold text-text-main">Bulk Inventory Entry</h1>
                    <p className="text-sm text-text-sub mt-0.5">{subtitle}</p>
                </div>
                <Button variant="secondary" icon={<ArrowLeft size={16} />} onClick={() => navigate('/inventory')}>
                    Back to Inventory
                </Button>
            </div>

            <Card className="p-3 md:p-4">
                <div className="flex flex-wrap items-center gap-2">
                    {(['grn', 'batch'] as const).map((entryMode) => (
                        <button
                            key={entryMode}
                            onClick={() => setMode(entryMode)}
                            className={clsx(
                                'px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition',
                                mode === entryMode
                                    ? 'bg-text-main text-text-inverse'
                                    : 'bg-surface-dim text-text-dim hover:text-text-main'
                            )}
                        >
                            {entryMode === 'grn' ? 'GRN Receive' : 'Add Batches'}
                        </button>
                    ))}
                </div>
            </Card>

            {successMessage && (
                <div className="p-3 rounded-xl border border-success/30 bg-success-bg text-success text-sm">
                    {successMessage}
                </div>
            )}

            {itemsLoading ? (
                <Card className="p-10 text-center text-text-dim">Loading products...</Card>
            ) : (
                <Card className="p-3 md:p-4">
                    {mode === 'batch' ? (
                        <BulkInventoryEntryForm
                            key={`batch-${defaultProductId ?? 'none'}-${formVersion}`}
                            mode="batch"
                            items={items}
                            suppliers={suppliers}
                            defaultProductId={defaultProductId}
                            onSubmit={handleBatchSubmit}
                            loading={submitting}
                            onClose={() => navigate('/inventory')}
                            initialRows={10}
                        />
                    ) : (
                        <BulkInventoryEntryForm
                            key={`grn-${defaultProductId ?? 'none'}-${formVersion}`}
                            mode="grn"
                            items={items}
                            suppliers={suppliers}
                            defaultProductId={defaultProductId}
                            onSubmit={handleGrnSubmit}
                            loading={submitting}
                            onClose={() => navigate('/inventory')}
                            initialRows={10}
                        />
                    )}
                </Card>
            )}
        </div>
    );
}

