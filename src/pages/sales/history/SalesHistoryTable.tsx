import { useState } from 'react';
import { Search, Filter, Receipt } from 'lucide-react';
import type { SaleTransaction } from '../../../lib/types';
import { StatusBadge } from '../../../components/ui/Badge';
import { clsx } from 'clsx';
import { format } from 'date-fns';

interface SalesHistoryTableProps {
    transactions: SaleTransaction[];
    isLoading: boolean;
    onViewDetail: (tx: SaleTransaction) => void;
    onFilterChange: (filters: {
        search: string;
        paymentMethod: string;
        dateFrom: string;
        dateTo: string;
    }) => void;
}

export function SalesHistoryTable({ transactions, isLoading, onViewDetail, onFilterChange }: SalesHistoryTableProps) {
    const [search, setSearch] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('all');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    const applyFilters = (overrides: Partial<{ search: string; paymentMethod: string; dateFrom: string; dateTo: string }> = {}) => {
        onFilterChange({
            search: overrides.search ?? search,
            paymentMethod: overrides.paymentMethod ?? paymentMethod,
            dateFrom: overrides.dateFrom ?? dateFrom,
            dateTo: overrides.dateTo ?? dateTo,
        });
    };

    const inputCls = 'px-3 py-2 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30';

    // Client-side search on invoice number and seller name
    const filtered = transactions.filter(tx => {
        if (!search) return true;
        const q = search.toLowerCase();
        return (
            tx.invoice_number.toLowerCase().includes(q) ||
            (tx.seller?.full_name ?? '').toLowerCase().includes(q)
        );
    });

    return (
        <div className="flex flex-col gap-4">
            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3 p-4 bg-white rounded-xl border border-gray-100">
                <div className="relative flex-1 min-w-[200px]">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        className={`${inputCls} pl-8 w-full`}
                        placeholder="Search invoice # or staff…"
                        value={search}
                        onChange={e => {
                            setSearch(e.target.value);
                            applyFilters({ search: e.target.value });
                        }}
                    />
                </div>

                <div className="flex items-center gap-2">
                    <Filter size={14} className="text-gray-400" />
                    <select
                        className={inputCls}
                        value={paymentMethod}
                        onChange={e => { setPaymentMethod(e.target.value); applyFilters({ paymentMethod: e.target.value }); }}
                        title="Filter by payment method"
                    >
                        <option value="all">All payments</option>
                        <option value="cash">Cash</option>
                        <option value="card">Card</option>
                        <option value="split">Split</option>
                    </select>
                </div>

                <div className="flex items-center gap-2">
                    <input
                        type="date"
                        className={inputCls}
                        value={dateFrom}
                        onChange={e => { setDateFrom(e.target.value); applyFilters({ dateFrom: e.target.value }); }}
                        title="From date"
                    />
                    <span className="text-gray-400 text-sm">–</span>
                    <input
                        type="date"
                        className={inputCls}
                        value={dateTo}
                        onChange={e => { setDateTo(e.target.value); applyFilters({ dateTo: e.target.value }); }}
                        title="To date"
                    />
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b border-gray-100">
                            <tr>
                                {['Invoice #', 'Date & Time', 'Staff', 'Items', 'Payment', 'Total', 'Status', ''].map(h => (
                                    <th key={h} className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3.5">
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {isLoading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i}>
                                        <td colSpan={8} className="px-5 py-3.5">
                                            <div className="h-4 bg-gray-100 rounded animate-pulse" />
                                        </td>
                                    </tr>
                                ))
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-5 py-16 text-center">
                                        <Receipt size={36} className="text-gray-200 mx-auto mb-3" />
                                        <p className="text-gray-400 text-sm">No transactions found</p>
                                    </td>
                                </tr>
                            ) : (
                                filtered.map(tx => (
                                    <tr
                                        key={tx.id}
                                        className="hover:bg-gray-50/60 transition-colors cursor-pointer"
                                        onClick={() => onViewDetail(tx)}
                                    >
                                        <td className="px-5 py-3.5 font-mono text-xs font-semibold text-blue-600">
                                            {tx.invoice_number}
                                        </td>
                                        <td className="px-5 py-3.5 text-gray-600 whitespace-nowrap">
                                            {format(new Date(tx.created_at), 'MMM d, yyyy · HH:mm')}
                                        </td>
                                        <td className="px-5 py-3.5 text-gray-600">
                                            {tx.seller?.full_name ?? '—'}
                                        </td>
                                        <td className="px-5 py-3.5 text-gray-500">
                                            {tx.items?.length ?? 0} item{(tx.items?.length ?? 0) !== 1 ? 's' : ''}
                                        </td>
                                        <td className="px-5 py-3.5">
                                            <span className={clsx(
                                                'inline-block text-xs font-semibold px-2 py-0.5 rounded-full capitalize',
                                                tx.payment_method === 'cash' ? 'bg-green-50 text-green-700' :
                                                    tx.payment_method === 'card' ? 'bg-blue-50 text-blue-700' :
                                                        'bg-amber-50 text-amber-700'
                                            )}>
                                                {tx.payment_method}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3.5 font-bold text-gray-900">
                                            ${tx.total.toFixed(2)}
                                        </td>
                                        <td className="px-5 py-3.5">
                                            <StatusBadge status={tx.status as 'completed' | 'refunded' | 'partial_refund'} />
                                        </td>
                                        <td className="px-5 py-3.5">
                                            <span className="text-xs text-blue-500 hover:underline">View →</span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
