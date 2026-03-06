import { useState, useRef } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { UploadCloud, AlertCircle, CheckCircle2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useQueryClient } from '@tanstack/react-query';

export function BulkImportModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const queryClient = useQueryClient();

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selected = e.target.files?.[0];
        if (selected) {
            if (!selected.name.endsWith('.csv')) {
                setError('Please upload a valid CSV file.');
                setFile(null);
                return;
            }
            setFile(selected);
            setError(null);
            setSuccessMsg(null);
        }
    };

    const handleImport = async () => {
        if (!file) return;
        setLoading(true);
        setError(null);
        setSuccessMsg(null);

        try {
            const text = await file.text();
            const lines = text.split('\n');
            if (lines.length < 2) throw new Error('File is empty or missing headers');

            // Find headers
            const headers = lines[0].toLowerCase().split(',').map(h => h.trim());
            const requiredHeaders = ['name', 'category', 'minimum_order_quantity', 'unit', 'cost_price', 'selling_price', 'is_controlled'];

            const missing = requiredHeaders.filter(h => !headers.includes(h));
            if (missing.length > 0) {
                throw new Error(`Missing required columns: ${missing.join(', ')}`);
            }

            const nameIdx = headers.indexOf('name');
            const catIdx = headers.indexOf('category');
            const moqIdx = headers.indexOf('minimum_order_quantity');
            const unitIdx = headers.indexOf('unit');
            const costIdx = headers.indexOf('cost_price');
            const sellIdx = headers.indexOf('selling_price');
            const ctrlIdx = headers.indexOf('is_controlled');
            const skuIdx = headers.indexOf('sku'); // optional

            const itemsToInsert = [];

            // Parse lines
            for (let i = 1; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line) continue;

                // Extremely naïve CSV parsing (fails on quotes with commas, but sufficient for basic demo)
                const values = line.split(',').map(v => v.trim());
                if (values.length < headers.length) continue;

                itemsToInsert.push({
                    name: values[nameIdx],
                    category: values[catIdx] || null,
                    minimum_order_quantity: parseInt(values[moqIdx]) || 10,
                    unit: values[unitIdx] || 'units',
                    cost_price: parseFloat(values[costIdx]) || null,
                    selling_price: parseFloat(values[sellIdx]) || null,
                    is_controlled: values[ctrlIdx] === 'true' || values[ctrlIdx] === '1',
                    sku: skuIdx !== -1 ? (values[skuIdx] || null) : null,
                    quantity: 0 // initial quantity is 0 because batches handle stock
                });
            }

            if (itemsToInsert.length === 0) throw new Error('No valid payload rows found.');

            const { error: insertError } = await supabase.from('inventory_items').insert(itemsToInsert);
            if (insertError) throw insertError;

            setSuccessMsg(`Successfully imported ${itemsToInsert.length} items!`);
            queryClient.invalidateQueries({ queryKey: ['inventory'] });
            setFile(null);
            if (fileInputRef.current) fileInputRef.current.value = '';

            setTimeout(() => {
                onClose();
            }, 2000);

        } catch (err: unknown) {
            console.error(err);
            const msg = err instanceof Error ? err.message : 'Failed to process CSV file.';
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <Modal title="Bulk Import Inventory" onClose={onClose} size="md">
            <div className="space-y-6">
                <div className="bg-blue-50 text-blue-800 p-4 rounded-xl text-sm">
                    <p className="font-semibold mb-2">CSV Format Requirements:</p>
                    <ul className="list-disc pl-5 space-y-1 text-blue-700">
                        <li>Required Columns: <code className="bg-blue-100 px-1 rounded">name, category, minimum_order_quantity, unit, cost_price, selling_price, is_controlled</code></li>
                        <li>Optional Columns: <code className="bg-blue-100 px-1 rounded">sku</code></li>
                        <li>Note: Starting quantities are governed by batches. Import items first, then add stock batches.</li>
                    </ul>
                </div>

                {error && (
                    <div className="flex items-start gap-3 bg-red-50 text-red-700 p-4 rounded-xl text-sm">
                        <AlertCircle className="w-5 h-5 shrink-0" />
                        <p>{error}</p>
                    </div>
                )}

                {successMsg && (
                    <div className="flex items-start gap-3 bg-emerald-50 text-emerald-700 p-4 rounded-xl text-sm">
                        <CheckCircle2 className="w-5 h-5 shrink-0" />
                        <p>{successMsg}</p>
                    </div>
                )}

                {!successMsg && (
                    <div className="flex justify-center border-2 border-dashed border-gray-300 rounded-xl p-8 hover:bg-gray-50 transition-colors">
                        <div className="text-center">
                            <UploadCloud className="w-10 h-10 text-blue-500 mx-auto mb-3" />
                            <p className="text-sm font-medium text-gray-700">
                                {file ? file.name : 'Select a CSV file to upload'}
                            </p>
                            <input
                                title="CSV File Upload"
                                type="file"
                                accept=".csv"
                                className="hidden"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                            />
                            <Button
                                variant="secondary"
                                size="sm"
                                className="mt-4"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                Browse Files
                            </Button>
                        </div>
                    </div>
                )}

                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                    <Button variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button
                        variant="primary"
                        loading={loading}
                        disabled={!file || !!successMsg}
                        onClick={handleImport}
                    >
                        Start Import
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
