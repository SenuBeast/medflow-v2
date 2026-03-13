import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useProducts } from '../hooks/useProducts';
import { useCartStore } from '../store/cartStore';
import ProductSearch from '../components/ProductSearch';
import CategoryFilter from '../components/CategoryFilter';
import ProductGrid from '../components/ProductGrid';
import CartPanel from '../components/CartPanel';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';

export default function POSPage() {
    const { user, signOut } = useAuth();
    const { addItem } = useCartStore();

    // Local state for product filtering
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryId, setCategoryId] = useState('all');

    // Fetch products
    const { data: products, isLoading } = useProducts(categoryId, searchTerm);

    // Keyboard shortcuts
    useKeyboardShortcuts({
        'Enter': () => {
            // Check if there's exactly 1 product matched by search or just pick the top one?
            // Usually, Enter when search is focused adds the first item.
            if (searchTerm && products && products.length > 0) {
                const p = products[0];
                const activeBatches = p.batches
                    ?.filter(b => b.status === 'active' && b.quantity > 0)
                    .sort((a, b) => new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime());

                if (activeBatches && activeBatches.length > 0) {
                    const selectedBatch = activeBatches[0];
                    const baseUnit = p.base_unit || p.unit;
                    const unitOptions = (p.unit_options && p.unit_options.length > 0)
                        ? p.unit_options
                        : [{ unit_name: baseUnit, conversion_factor: 1, is_base: true }];
                    const defaultUnit = unitOptions.find((u) => u.unit_name.toLowerCase() === p.unit.toLowerCase())
                        || unitOptions.find((u) => u.is_base)
                        || unitOptions[unitOptions.length - 1];
                    const unitsPerSaleUnit = Math.max(1, Number(defaultUnit?.conversion_factor ?? 1));
                    const baseUnitPrice = Number(selectedBatch.selling_price ?? p.selling_price ?? 0);
                    const unitPrice = baseUnitPrice * unitsPerSaleUnit;
                    const maxQuantity = Math.floor(Number(selectedBatch.quantity ?? 0) / unitsPerSaleUnit);

                    if (maxQuantity <= 0) return;

                    addItem({
                        item_id: p.id,
                        batch_id: selectedBatch.id,
                        name: p.name,
                        sku: p.sku,
                        unit: defaultUnit?.unit_name ?? p.unit,
                        base_unit: baseUnit,
                        base_unit_price: baseUnitPrice,
                        units_per_sale_unit: unitsPerSaleUnit,
                        available_base_quantity: Number(selectedBatch.quantity ?? 0),
                        unit_options: unitOptions,
                        unit_price: unitPrice,
                        quantity: 1,
                        max_quantity: maxQuantity,
                        is_controlled: p.is_controlled,
                        expiry_warning: false,
                        subtotal: unitPrice
                    });
                    setSearchTerm(''); // Clear search after adding
                }
            }
        }
    });

    // Handle barcode scan
    const handleBarcodeScanned = (barcode: string) => {
        setSearchTerm(barcode); // This will trigger a re-fetch and Enter shortcut handles adding
    };

    return (
        <div className="flex h-screen w-screen overflow-hidden bg-pos-bg text-pos-text select-none">
            {/* LEFT PANEL */}
            <div className="flex-[65] flex flex-col border-r border-pos-border max-w-[65%] min-w-[65%]">
                {/* Header */}
                <div className="h-16 border-b border-pos-border px-6 flex items-center justify-between bg-pos-surface shrink-0">
                    <div className="font-bold tracking-widest uppercase flex items-center gap-3">
                        <div className="w-2 h-2 bg-pos-primary rounded-full animate-pulse" />
                        POS Terminal
                    </div>
                    <div className="flex items-center gap-6 text-sm">
                        <span className="text-pos-text-muted font-mono">{user?.full_name || user?.email}</span>
                        <button
                            onClick={signOut}
                            className="bg-pos-bg border border-pos-border px-4 py-1.5 text-xs hover:border-pos-accent hover:text-pos-accent transition-colors uppercase tracking-widest"
                        >
                            Log Out
                        </button>
                    </div>
                </div>

                {/* Search & Categories */}
                <div className="shrink-0">
                    <ProductSearch
                        searchTerm={searchTerm}
                        setSearchTerm={setSearchTerm}
                        onBarcodeScanned={handleBarcodeScanned}
                    />
                    <CategoryFilter
                        selectedCategory={categoryId}
                        onSelect={setCategoryId}
                    />
                </div>

                {/* Product Grid */}
                <ProductGrid
                    products={products || []}
                    isLoading={isLoading}
                />
            </div>

            {/* RIGHT PANEL (CART) */}
            <div className="flex-[35] flex flex-col bg-pos-surface max-w-[35%] min-w-[35%]">
                <CartPanel />
            </div>
        </div>
    );
}
