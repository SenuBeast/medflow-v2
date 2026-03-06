import { useCategories } from '../hooks/useProducts';

type CategoryFilterProps = {
    selectedCategory: string;
    onSelect: (cat: string) => void;
};

export default function CategoryFilter({ selectedCategory, onSelect }: CategoryFilterProps) {
    const { data: categories, isLoading } = useCategories();

    if (isLoading) return <div className="h-10 bg-pos-surface animate-pulse" />;

    return (
        <div className="flex gap-2 p-4 border-b border-pos-border bg-pos-surface overflow-x-auto no-scrollbar">
            <button
                onClick={() => onSelect('all')}
                className={`
                    whitespace-nowrap px-4 py-2 text-xs font-bold uppercase tracking-widest transition-all border
                    ${selectedCategory === 'all'
                        ? 'bg-pos-primary border-pos-primary text-pos-bg'
                        : 'bg-pos-bg border-pos-border text-pos-text-muted hover:text-pos-text hover:border-pos-text'
                    }
                `}
            >
                All Items
            </button>

            {categories?.map(cat => (
                <button
                    key={cat}
                    onClick={() => onSelect(cat)}
                    className={`
                        whitespace-nowrap px-4 py-2 text-xs font-bold uppercase tracking-widest transition-all border
                        ${selectedCategory === cat
                            ? 'bg-pos-primary border-pos-primary text-pos-bg'
                            : 'bg-pos-bg border-pos-border text-pos-text-muted hover:text-pos-text hover:border-pos-text'
                        }
                    `}
                >
                    {cat}
                </button>
            ))}
        </div>
    );
}
