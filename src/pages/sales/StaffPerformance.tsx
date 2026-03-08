import { Card } from '../../components/ui/Card';
import { useSalesAnalytics } from '../../hooks/useSalesAnalytics';

export function StaffPerformance() {
    const { staffSales } = useSalesAnalytics();

    return (
        <div className="space-y-6">
            <Card className="p-0 overflow-hidden">
                <div className="p-6 border-b border-border-dim">
                    <h3 className="text-lg font-bold text-text-main">Staff Sales Leaderboard</h3>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-surface-dim/50 text-xs font-semibold text-text-sub uppercase tracking-wider">
                                <th className="p-4 border-b border-border-dim">Rank</th>
                                <th className="p-4 border-b border-border-dim">Staff Name</th>
                                <th className="p-4 border-b border-border-dim">Transactions Count</th>
                                <th className="p-4 border-b border-border-dim text-right">Total Revenue</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {staffSales.isLoading ? (
                                <tr>
                                    <td colSpan={4} className="p-8 text-center text-text-dim">Loading...</td>
                                </tr>
                            ) : staffSales.data?.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="p-8 text-center text-text-dim">No staff performance data available.</td>
                                </tr>
                            ) : (
                                staffSales.data?.map((staff, idx) => (
                                    <tr key={staff.staff_name} className="hover:bg-surface-dim transition-colors">
                                        <td className="p-4">
                                            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-50 text-blue-700 font-bold text-sm">
                                                #{idx + 1}
                                            </span>
                                        </td>
                                        <td className="p-4 font-medium text-text-main">{staff.staff_name}</td>
                                        <td className="p-4 text-text-sub">{staff.transactions_count}</td>
                                        <td className="p-4 text-right font-bold text-text-main">${Number(staff.revenue).toFixed(2)}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
}
