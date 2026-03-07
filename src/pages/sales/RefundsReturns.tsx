import { Card } from '../../components/ui/Card';
import { AlertTriangle } from 'lucide-react';

export function RefundsReturns() {
    return (
        <div className="space-y-6">
            <Card className="p-12 flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mb-6">
                    <AlertTriangle size={32} />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Refunds & Returns Log</h3>
                <p className="text-gray-500 max-w-md">
                    This module provides a centralized log of all refunds processed from the Transactions tab.
                    Advanced return tracking and authorization workflows will be available in a future update.
                </p>
                <div className="mt-8 bg-gray-50 border border-gray-100 rounded-xl px-6 py-4 max-w-lg w-full">
                    <p className="text-sm text-gray-600 text-left">
                        <strong>To issue a new refund:</strong><br />
                        1. Go to the <span className="font-semibold text-gray-900">Transactions</span> tab.<br />
                        2. Find the relevant transaction.<br />
                        3. Click <strong>View</strong> and select <strong>Issue Refund</strong>.
                    </p>
                </div>
            </Card>
        </div>
    );
}
