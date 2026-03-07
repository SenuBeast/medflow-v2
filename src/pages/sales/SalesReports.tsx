import { Card } from '../../components/ui/Card';
import { FileText, Download, Calendar } from 'lucide-react';

function ReportTypeCard({ title, description, icon: Icon }: { title: string, description: string, icon: React.ElementType }) {
    return (
        <Card className="p-6 flex flex-col">
            <div className="flex items-start gap-4 mb-6">
                <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
                    <Icon size={24} />
                </div>
                <div>
                    <h3 className="font-bold text-gray-900">{title}</h3>
                    <p className="text-sm text-gray-500 mt-1">{description}</p>
                </div>
            </div>
            <div className="mt-auto pt-6 border-t border-gray-100 flex gap-3">
                <button className="flex-1 flex items-center justify-center gap-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 py-2.5 rounded-xl text-sm font-semibold transition-colors">
                    <Download size={16} /> CSV
                </button>
                <button className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors">
                    <FileText size={16} /> PDF
                </button>
            </div>
        </Card>
    );
}

export function SalesReports() {
    return (
        <div className="space-y-6">
            <h2 className="text-lg font-bold text-gray-900">Download Business Reports</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <ReportTypeCard
                    title="Daily Sales Summary"
                    description="Detailed breakdown of today's sales, tax collected, and payment methods."
                    icon={Calendar}
                />
                <ReportTypeCard
                    title="Monthly Revenue"
                    description="Comprehensive month-over-month revenue trends and staff performance."
                    icon={FileText}
                />
                <ReportTypeCard
                    title="Product Sales"
                    description="Itemized report of units sold, revenue generated, and top performers."
                    icon={FileText}
                />
            </div>
        </div>
    );
}
