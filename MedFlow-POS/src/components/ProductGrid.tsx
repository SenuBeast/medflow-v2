import ProductCard from './ProductCard';
import type { InventoryItem, ItemBatch } from '../lib/types';

type ProductGridProps = {
    products: (InventoryItem & { batches: ItemBatch[] })[];
    isLoading: boolean;
};

export default function ProductGrid({ products, isLoading }: ProductGridProps) {
    if (isLoading) {
        return (
            <div className="flex-1 overflow-auto p-4 bg-pos-bg">
                <div className="grid lg:grid-cols-4 md:grid-cols-3 sm:grid-cols-2 gap-4">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                        <div key={i} className="h-32 border border-pos-border bg-pos-surface animate-pulse" />
                    ))}
                </div>
            </div>
        );
    }

    if (products.length === 0) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center bg-pos-bg text-pos-text-muted">
                <div className="text-4xl font-mono mb-4 text-pos-border">\</div>
                <p className="uppercase tracking-widest text-sm font-bold">No Products Found</p>
                <p className="text-xs font-mono mt-2">Adjust search or filters</p>
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-y-auto p-4 bg-pos-bg no-scrollbar pb-24">
            <div className="grid lg:grid-cols-4 md:grid-cols-3 sm:grid-cols-2 lg:gap-4 gap-2">
                {products.map(product => (
                    <ProductCard key={product.id} product={product} />
                ))}
            </div>
        </div>
    );
}
