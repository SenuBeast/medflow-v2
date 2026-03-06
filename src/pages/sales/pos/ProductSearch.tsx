import { useState, useEffect, useRef, useMemo } from 'react';
import { Search, ShieldAlert, AlertTriangle, Package } from 'lucide-react';
import { useInventory } from '../../../hooks/useInventory';
import type { CartItem } from '../../../lib/types';
import { clsx } from 'clsx';
import { differenceInDays } from 'date-fns';

interface ProductSearchProps {
    onAddToCart: (item: CartItem) => void;
    cartItemIds: Set<string>;
}

export function ProductSearch({ onAddToCart, cartItemIds }: ProductSearchProps) {
    const { data: items = [], isLoading } = useInventory();
    const [search, setSearch] = useState('');
    const searchRef = useRef<HTMLInputElement>(null);

    // Auto-focus on mount (keyboard-friendly POS)
    useEffect(() => {
        searchRef.current?.focus();
    }, []);

    const filtered = useMemo(() => {
        const q = search.toLowerCase().trim();
        if (!q) return items.filter(i => {
            const totalStock = (i.batches ?? []).reduce((s, b) => s + (b.status === 'active' ? b.quantity : 0), 0);
            return totalStock > 0;
        });
        return items.filter(i => {
            const totalStock = (i.batches ?? []).reduce((s, b) => s + (b.status === 'active' ? b.quantity : 0), 0);
            if (totalStock <= 0) return false;
            return (
                i.name.toLowerCase().includes(q) ||
                (i.sku?.toLowerCase() || '').includes(q) ||
                (i.generic_name?.toLowerCase() || '').includes(q)
            );
        });
    }, [items, search]);

    const handleAdd = (item: typeof items[number]) => {
        // Prefer the earliest-expiry active batch (FIFO)
        const activeBatches = (item.batches ?? [])
            .filter(b => b.status === 'active' && b.quantity > 0)
            .sort((a, b) => new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime());

        const batch = activeBatches[0];
        if (!batch) return;

        const daysToExpiry = differenceInDays(new Date(batch.expiry_date), new Date());
        const totalStock = activeBatches.reduce((s, b) => s + b.quantity, 0);

        onAddToCart({
            item_id: item.id,
            batch_id: batch.id,
            name: item.name,
            sku: item.sku,
            unit: item.unit,
            unit_price: item.selling_price ?? 0,
            quantity: 1,
            max_quantity: totalStock,
            is_controlled: item.is_controlled,
            expiry_warning: daysToExpiry <= 30,
            subtotal: item.selling_price ?? 0,
        });
    };

    return (
        <div className="flex flex-col h-full">
            {/* Search Bar */}
            <div className="p-4 border-b border-gray-100">
                <div className="relative">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        ref={searchRef}
                        type="text"
                        className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all"
                        placeholder="Search by name, SKU, barcode…"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
            </div>

            {/* Product Grid */}
            <div className="flex-1 overflow-y-auto p-4 grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3">
                {isLoading ? (
                    Array.from({ length: 8 }).map((_, i) => (
                        <div key={i} className="h-28 rounded-xl bg-gray-100 animate-pulse" />
                    ))
                ) : filtered.length === 0 ? (
                    <div className="col-span-full py-16 text-center text-gray-400">
                        <Package size={40} className="mx-auto mb-3 text-gray-200" />
                        <p className="text-sm font-medium">No products found</p>
                        <p className="text-xs mt-1">Try a different search term</p>
                    </div>
                ) : (
                    filtered.map(item => {
                        const activeBatches = (item.batches ?? []).filter(b => b.status === 'active' && b.quantity > 0);
                        const totalStock = activeBatches.reduce((s, b) => s + b.quantity, 0);
                        const earliestBatch = activeBatches.sort((a, b) => new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime())[0];
                        const daysToExpiry = earliestBatch ? differenceInDays(new Date(earliestBatch.expiry_date), new Date()) : null;
                        const isAlreadyInCart = cartItemIds.has(item.id);

                        const stockColor = totalStock === 0
                            ? 'text-red-600 bg-red-50'
                            : totalStock <= (item.minimum_order_quantity ?? 10)
                                ? 'text-amber-600 bg-amber-50'
                                : 'text-emerald-600 bg-emerald-50';

                        return (
                            <button
                                key={item.id}
                                onClick={() => handleAdd(item)}
                                disabled={totalStock === 0}
                                className={clsx(
                                    'relative text-left p-3 rounded-xl border-2 transition-all duration-150 group',
                                    isAlreadyInCart
                                        ? 'border-blue-400 bg-blue-50/60 ring-1 ring-blue-200'
                                        : 'border-gray-100 bg-white hover:border-blue-300 hover:shadow-md',
                                    totalStock === 0 && 'opacity-50 cursor-not-allowed'
                                )}
                            >
                                {/* Badges row */}
                                <div className="flex items-center gap-1 mb-2 flex-wrap">
                                    {item.is_controlled && (
                                        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-red-100 text-red-700">
                                            <ShieldAlert size={9} /> CD
                                        </span>
                                    )}
                                    {daysToExpiry !== null && daysToExpiry <= 30 && daysToExpiry > 0 && (
                                        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">
                                            <AlertTriangle size={9} /> Expiring
                                        </span>
                                    )}
                                    {isAlreadyInCart && (
                                        <span className="inline-flex text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">
                                            In Cart
                                        </span>
                                    )}
                                </div>

                                <p className="text-sm font-semibold text-gray-900 leading-tight mb-1 line-clamp-2">{item.name}</p>
                                {item.sku && <p className="text-xs text-gray-400 font-mono mb-2">{item.sku}</p>}

                                <div className="flex items-center justify-between mt-auto">
                                    <span className={clsx('text-xs font-semibold px-2 py-0.5 rounded-full', stockColor)}>
                                        {totalStock} {item.unit}
                                    </span>
                                    <span className="text-sm font-bold text-gray-900">
                                        ${(item.selling_price ?? 0).toFixed(2)}
                                    </span>
                                </div>
                            </button>
                        );
                    })
                )}
            </div>
        </div>
    );
}
