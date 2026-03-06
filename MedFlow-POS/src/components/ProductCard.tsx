import type { InventoryItem, ItemBatch } from '../lib/types';
import { useCartStore } from '../store/cartStore';

type ProductCardProps = {
    product: InventoryItem & { batches: ItemBatch[] };
};

export default function ProductCard({ product }: ProductCardProps) {
    const { addItem } = useCartStore();

    // Sum active batch quantities
    const totalStock = product.batches
        ?.filter(b => b.status === 'active')
        .reduce((sum, b) => sum + b.quantity, 0) || 0;

    const isOutOfStock = totalStock <= 0;
    const isLowStock = totalStock > 0 && totalStock <= (product.minimum_order_quantity || 10);

    const handleAdd = () => {
        if (isOutOfStock) return;

        // Find first active batch with stock (FIFO approach for POS)
        const activeBatches = [...(product.batches || [])]
            .filter(b => b.status === 'active' && b.quantity > 0)
            .sort((a, b) => new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime());

        if (activeBatches.length === 0) return;

        const selectedBatch = activeBatches[0];

        const now = new Date();
        const expiryDate = new Date(selectedBatch.expiry_date);
        const daysToExpiry = Math.floor((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        const expiryWarning = daysToExpiry < 30;

        addItem({
            item_id: product.id,
            batch_id: selectedBatch.id,
            name: product.name,
            sku: product.sku,
            unit: product.unit,
            unit_price: product.selling_price || 0,
            quantity: 1,
            max_quantity: selectedBatch.quantity,
            is_controlled: product.is_controlled,
            expiry_warning: expiryWarning,
            subtotal: product.selling_price || 0
        });
    };

    return (
        <div
            onClick={handleAdd}
            className={`
                relative p-4 border transition-all select-none
                ${isOutOfStock
                    ? 'border-pos-border bg-pos-bg opacity-50 cursor-not-allowed'
                    : 'border-pos-border bg-pos-surface cursor-pointer hover:border-pos-primary active:scale-[0.98]'
                }
            `}
        >
            <div className="flex justify-between items-start mb-4">
                <div className="text-xs font-mono text-pos-text-muted">{product.sku || 'NO-SKU'}</div>

                {isOutOfStock ? (
                    <div className="bg-pos-accent text-pos-bg text-[10px] font-bold px-2 py-0.5 uppercase tracking-wider">Empty</div>
                ) : isLowStock ? (
                    <div className="bg-yellow-500 text-pos-bg text-[10px] font-bold px-2 py-0.5 uppercase tracking-wider">Low Stock</div>
                ) : null}
            </div>

            <h3 className="font-bold text-sm mb-1 leading-tight line-clamp-2">{product.name}</h3>
            {product.generic_name && (
                <p className="text-[10px] text-pos-text-muted uppercase tracking-wider truncate">
                    {product.generic_name}
                </p>
            )}

            <div className="flex items-end justify-between mt-6">
                <div className="text-lg font-mono text-pos-primary font-bold">
                    ${(product.selling_price || 0).toFixed(2)}
                </div>
                <div className="text-xs font-mono text-pos-text-muted">
                    {totalStock} {product.unit}
                </div>
            </div>
        </div>
    );
}
