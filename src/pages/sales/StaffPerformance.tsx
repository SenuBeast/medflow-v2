import { Card } from '../../components/ui/Card';
import { useSalesAnalytics } from '../../hooks/useSalesAnalytics';

export function StaffPerformance() {
    const { staffSales } = useSalesAnalytics();

    return (
        <div className="space-y-6">
            <Card className="p-0 overflow-hidden">
                <div className="p-6 border-b border-gray-100">
                    <h3 className="text-lg font-bold text-gray-900">Staff Sales Leaderboard</h3>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50/50 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                <th className="p-4 border-b border-gray-100">Rank</th>
                                <th className="p-4 border-b border-gray-100">Staff Name</th>
                                <th className="p-4 border-b border-gray-100">Transactions Count</th>
                                <th className="p-4 border-b border-gray-100 text-right">Total Revenue</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {staffSales.isLoading ? (
                                <tr>
                                    <td colSpan={4} className="p-8 text-center text-gray-400">Loading...</td>
                                </tr>
                            ) : staffSales.data?.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="p-8 text-center text-gray-400">No staff performance data available.</td>
                                </tr>
                            ) : (
                                staffSales.data?.map((staff, idx) => (
                                    <tr key={staff.staff_name} className="hover:bg-gray-50 transition-colors">
                                        <td className="p-4">
                                            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-50 text-blue-700 font-bold text-sm">
                                                #{idx + 1}
                                            </span>
                                        </td>
                                        <td className="p-4 font-medium text-gray-900">{staff.staff_name}</td>
                                        <td className="p-4 text-gray-600">{staff.transactions_count}</td>
                                        <td className="p-4 text-right font-bold text-gray-900">${Number(staff.revenue).toFixed(2)}</td>
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
