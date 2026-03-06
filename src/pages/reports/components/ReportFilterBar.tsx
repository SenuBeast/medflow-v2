import { Search, Filter, X } from 'lucide-react';
import type { ReportFilters } from '../../../lib/types';

interface ReportFilterBarProps {
    filters: ReportFilters;
    onChange: (filters: ReportFilters) => void;
    categories?: string[];
    showExpiryWindow?: boolean;
}

const inputCls = 'px-3 py-2 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all';

export function ReportFilterBar({ filters, onChange, categories = [], showExpiryWindow }: ReportFilterBarProps) {
    const set = (partial: Partial<ReportFilters>) => onChange({ ...filters, ...partial });
    const hasActive = !!(filters.dateFrom || filters.dateTo || filters.search || filters.category || filters.controlledOnly);

    return (
        <div className="bg-white border border-gray-100 rounded-2xl p-4 space-y-3">
            {/* Row 1: Search + Date range */}
            <div className="flex flex-wrap gap-3 items-center">
                <div className="relative flex-1 min-w-[200px]">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        className={`${inputCls} pl-8 w-full`}
                        placeholder="Search products, users, batches…"
                        value={filters.search ?? ''}
                        onChange={e => set({ search: e.target.value || undefined })}
                    />
                </div>
                <div className="flex items-center gap-2">
                    <input
                        type="date"
                        className={inputCls}
                        value={filters.dateFrom ?? ''}
                        onChange={e => set({ dateFrom: e.target.value || undefined })}
                        title="From date"
                    />
                    <span className="text-gray-400 text-sm">—</span>
                    <input
                        type="date"
                        className={inputCls}
                        value={filters.dateTo ?? ''}
                        onChange={e => set({ dateTo: e.target.value || undefined })}
                        title="To date"
                    />
                </div>
            </div>

            {/* Row 2: Category + Controlled toggle + Expiry window */}
            <div className="flex flex-wrap gap-3 items-center">
                <div className="flex items-center gap-2">
                    <Filter size={14} className="text-gray-400" />
                    {categories.length > 0 && (
                        <select
                            className={inputCls}
                            value={filters.category ?? ''}
                            onChange={e => set({ category: e.target.value || undefined })}
                            title="Filter by category"
                        >
                            <option value="">All categories</option>
                            {categories.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    )}
                </div>

                <label className="flex items-center gap-2 cursor-pointer select-none">
                    <div className="relative">
                        <input
                            type="checkbox"
                            className="sr-only"
                            checked={!!filters.controlledOnly}
                            onChange={e => set({ controlledOnly: e.target.checked || undefined })}
                        />
                        <div className={`w-9 h-5 rounded-full transition-colors ${filters.controlledOnly ? 'bg-red-500' : 'bg-gray-200'}`} />
                        <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${filters.controlledOnly ? 'translate-x-4' : 'translate-x-0'}`} />
                    </div>
                    <span className="text-sm text-gray-600 font-medium">Controlled only</span>
                </label>

                {showExpiryWindow && (
                    <div className="flex bg-gray-100 p-1 rounded-xl gap-1">
                        {([30, 60, 90, 'expired'] as const).map(w => (
                            <button
                                key={w}
                                onClick={() => set({ expiryWindow: w })}
                                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${(filters.expiryWindow ?? 30) === w
                                        ? 'bg-white text-gray-900 shadow-sm'
                                        : 'text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                {w === 'expired' ? 'Expired' : `${w}d`}
                            </button>
                        ))}
                    </div>
                )}

                {hasActive && (
                    <button
                        onClick={() => onChange({})}
                        className="ml-auto flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700 transition-colors"
                    >
                        <X size={12} /> Clear filters
                    </button>
                )}
            </div>
        </div>
    );
}
