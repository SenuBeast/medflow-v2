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

    const inputCls = 'px-3 py-2 rounded-xl border border-border-main text-sm bg-card focus:outline-none focus:ring-2 focus:ring-blue-500/30';

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
            <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2 sm:gap-3 p-3 md:p-4 bg-card rounded-xl border border-border-dim">
                <div className="relative flex-1 min-w-0 sm:min-w-[200px]">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-dim" />
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
                    <Filter size={14} className="text-text-dim shrink-0" />
                    <select
                        className={`${inputCls} w-full sm:w-auto`}
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
                        className={`${inputCls} flex-1 sm:flex-none`}
                        value={dateFrom}
                        onChange={e => { setDateFrom(e.target.value); applyFilters({ dateFrom: e.target.value }); }}
                        title="From date"
                    />
                    <span className="text-text-dim text-sm">–</span>
                    <input
                        type="date"
                        className={`${inputCls} flex-1 sm:flex-none`}
                        value={dateTo}
                        onChange={e => { setDateTo(e.target.value); applyFilters({ dateTo: e.target.value }); }}
                        title="To date"
                    />
                </div>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-3">
                {isLoading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="h-28 bg-card rounded-xl border border-border-dim animate-pulse" />
                    ))
                ) : filtered.length === 0 ? (
                    <div className="py-12 text-center bg-card rounded-xl border border-border-dim">
                        <Receipt size={32} className="text-gray-200 mx-auto mb-3" />
                        <p className="text-text-dim text-sm">No transactions found</p>
                    </div>
                ) : (
                    filtered.map(tx => (
                        <button
                            key={tx.id}
                            onClick={() => onViewDetail(tx)}
                            className="w-full text-left p-3.5 bg-card rounded-xl border border-border-dim hover:border-blue-300 transition-colors"
                        >
                            <div className="flex items-center justify-between mb-2">
                                <span className="font-mono text-xs font-semibold text-blue-600">{tx.invoice_number}</span>
                                <StatusBadge status={tx.status as 'completed' | 'refunded' | 'partial_refund'} />
                            </div>
                            <div className="grid grid-cols-2 gap-y-1.5 text-xs">
                                <div>
                                    <span className="text-text-dim">Date</span>
                                    <p className="text-text-sub font-medium">{format(new Date(tx.created_at), 'MMM d, HH:mm')}</p>
                                </div>
                                <div>
                                    <span className="text-text-dim">Staff</span>
                                    <p className="text-text-sub font-medium truncate">{tx.seller?.full_name ?? '—'}</p>
                                </div>
                                <div>
                                    <span className="text-text-dim">Items</span>
                                    <p className="text-text-sub font-medium">{tx.items?.length ?? 0}</p>
                                </div>
                                <div>
                                    <span className="text-text-dim">Payment</span>
                                    <p className="text-text-sub font-medium capitalize">{tx.payment_method}</p>
                                </div>
                            </div>
                            <div className="flex items-center justify-between mt-2 pt-2 border-t border-border-dim">
                                <span className="text-base font-bold text-text-main">${tx.total.toFixed(2)}</span>
                                <span className="text-xs text-blue-500">View →</span>
                            </div>
                        </button>
                    ))
                )}
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block bg-card rounded-xl border border-border-dim overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-surface-dim border-b border-border-dim">
                            <tr>
                                {['Invoice #', 'Date & Time', 'Staff', 'Items', 'Payment', 'Total', 'Status', ''].map(h => (
                                    <th key={h} className="text-left text-xs font-semibold text-text-sub uppercase tracking-wide px-4 lg:px-5 py-3">
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
                                        <p className="text-text-dim text-sm">No transactions found</p>
                                    </td>
                                </tr>
                            ) : (
                                filtered.map(tx => (
                                    <tr
                                        key={tx.id}
                                        className="hover:bg-surface-dim/60 transition-colors cursor-pointer"
                                        onClick={() => onViewDetail(tx)}
                                    >
                                        <td className="px-4 lg:px-5 py-3 font-mono text-xs font-semibold text-blue-600">
                                            {tx.invoice_number}
                                        </td>
                                        <td className="px-4 lg:px-5 py-3 text-text-sub whitespace-nowrap">
                                            {format(new Date(tx.created_at), 'MMM d, yyyy · HH:mm')}
                                        </td>
                                        <td className="px-4 lg:px-5 py-3 text-text-sub">
                                            {tx.seller?.full_name ?? '—'}
                                        </td>
                                        <td className="px-4 lg:px-5 py-3 text-text-sub">
                                            {tx.items?.length ?? 0} item{(tx.items?.length ?? 0) !== 1 ? 's' : ''}
                                        </td>
                                        <td className="px-4 lg:px-5 py-3">
                                            <span className={clsx(
                                                'inline-block text-xs font-semibold px-2 py-0.5 rounded-full capitalize',
                                                tx.payment_method === 'cash' ? 'bg-green-50 text-green-700' :
                                                    tx.payment_method === 'card' ? 'bg-blue-50 text-blue-700' :
                                                        'bg-amber-50 text-amber-700'
                                            )}>
                                                {tx.payment_method}
                                            </span>
                                        </td>
                                        <td className="px-4 lg:px-5 py-3 font-bold text-text-main">
                                            ${tx.total.toFixed(2)}
                                        </td>
                                        <td className="px-4 lg:px-5 py-3">
                                            <StatusBadge status={tx.status as 'completed' | 'refunded' | 'partial_refund'} />
                                        </td>
                                        <td className="px-4 lg:px-5 py-3">
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
