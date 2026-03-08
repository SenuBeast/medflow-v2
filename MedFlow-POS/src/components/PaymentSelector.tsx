import type { PaymentMethod } from '../lib/types';
import { useCartStore } from '../store/cartStore';

export default function PaymentSelector() {
    const { paymentMethod, setPaymentMethod } = useCartStore();

    const methods: { id: PaymentMethod; label: string }[] = [
        { id: 'cash', label: 'Cash' },
        { id: 'card', label: 'Card' },
        { id: 'split', label: 'Split' },
    ];

    return (
        <div className="grid grid-cols-3 gap-2 mb-4">
            {methods.map((method) => (
                <button
                    key={method.id}
                    onClick={() => setPaymentMethod(method.id)}
                    className={`
                        py-3 border uppercase tracking-widest text-xs font-bold transition-all
                        ${paymentMethod === method.id
                            ? 'bg-brand border-brand text-white'
                            : 'bg-background border-border-main text-text-main hover:border-brand'
                        }
                    `}
                >
                    {method.label}
                </button>
            ))}
        </div>
    );
}
