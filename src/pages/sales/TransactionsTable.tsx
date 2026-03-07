import { useState } from 'react';
import { useSaleTransactions } from '../../hooks/useSales';
import { SalesHistoryTable } from './history/SalesHistoryTable';
import { SaleDetailDrawer } from './history/SaleDetailDrawer';
import { Modal } from '../../components/ui/Modal';
import { RefundModal } from './history/RefundModal';
import type { SaleTransaction } from '../../lib/types';

export function TransactionsTable() {
    const [historyFilters, setHistoryFilters] = useState<{ dateFrom?: string; dateTo?: string; paymentMethod?: string; }>({});
    const [selectedTx, setSelectedTx] = useState<SaleTransaction | null>(null);
    const [refundTx, setRefundTx] = useState<SaleTransaction | null>(null);

    const { data: transactions = [], isLoading: txLoading } = useSaleTransactions({
        dateFrom: historyFilters.dateFrom,
        dateTo: historyFilters.dateTo,
        paymentMethod: historyFilters.paymentMethod,
    });

    return (
        <div className="space-y-4">
            <SalesHistoryTable
                transactions={transactions}
                isLoading={txLoading}
                onViewDetail={setSelectedTx}
                onFilterChange={(f) => setHistoryFilters({
                    dateFrom: f.dateFrom || undefined,
                    dateTo: f.dateTo || undefined,
                    paymentMethod: f.paymentMethod !== 'all' ? f.paymentMethod : undefined,
                })}
            />

            <SaleDetailDrawer
                transaction={selectedTx}
                isOpen={!!selectedTx}
                onClose={() => setSelectedTx(null)}
                onRefund={(tx) => { setSelectedTx(null); setRefundTx(tx); }}
            />

            {refundTx && (
                <Modal title="Process Refund" onClose={() => setRefundTx(null)} size="md">
                    <RefundModal
                        transaction={refundTx}
                        onClose={() => setRefundTx(null)}
                        onSuccess={() => setRefundTx(null)}
                    />
                </Modal>
            )}
        </div>
    );
}
