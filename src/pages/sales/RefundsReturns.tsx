import { Card } from '../../components/ui/Card';
import { AlertTriangle } from 'lucide-react';

export function RefundsReturns() {
    return (
        <div className="space-y-6">
            <Card className="p-12 flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mb-6">
                    <AlertTriangle size={32} />
                </div>
                <h3 className="text-xl font-bold text-text-main mb-2">Refunds & Returns Log</h3>
                <p className="text-text-sub max-w-md">
                    This module provides a centralized log of all refunds processed from the Transactions tab.
                    Advanced return tracking and authorization workflows will be available in a future update.
                </p>
                <div className="mt-8 bg-surface-dim border border-border-dim rounded-xl px-6 py-4 max-w-lg w-full">
                    <p className="text-sm text-text-sub text-left">
                        <strong>To issue a new refund:</strong><br />
                        1. Go to the <span className="font-semibold text-text-main">Transactions</span> tab.<br />
                        2. Find the relevant transaction.<br />
                        3. Click <strong>View</strong> and select <strong>Issue Refund</strong>.
                    </p>
                </div>
            </Card>
        </div>
    );
}
