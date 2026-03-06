import { useParams, Link } from 'react-router-dom';

export default function ReceiptPage() {
    const { id } = useParams();

    return (
        <div className="min-h-screen bg-pos-bg flex items-center justify-center p-8 text-pos-text">
            <div className="max-w-md w-full bg-white text-black p-8 shadow-2xl">
                <div className="text-center mb-6">
                    <h1 className="text-2xl font-bold font-mono">MedFlow Pharmacy</h1>
                    <p className="text-sm">123 Health Ave, Medical District</p>
                    <p className="text-sm mt-2 font-mono">Receipt: {id}</p>
                    <p className="text-sm font-mono">{new Date().toLocaleString()}</p>
                </div>

                <div className="border-t border-b border-dashed border-gray-400 py-4 my-4">
                    {/* Items will go here */}
                    <div className="flex justify-between mb-2 text-sm font-mono">
                        <span>1x Aspirin 500mg</span>
                        <span>$12.50</span>
                    </div>
                </div>

                <div className="mb-8">
                    <div className="flex justify-between text-sm">
                        <span>Subtotal</span>
                        <span className="font-mono">$12.50</span>
                    </div>
                    <div className="flex justify-between text-sm mt-1">
                        <span>Tax (8.5%)</span>
                        <span className="font-mono">$1.06</span>
                    </div>
                    <div className="flex justify-between font-bold text-lg mt-2 pt-2 border-t border-gray-400">
                        <span>Total</span>
                        <span className="font-mono">$13.56</span>
                    </div>
                </div>

                <div className="text-center">
                    <p className="text-sm">Thank you for your business!</p>
                </div>
            </div>

            <div className="fixed bottom-8 right-8 flex gap-4">
                <button
                    onClick={() => window.print()}
                    className="bg-pos-surface border border-pos-border px-6 py-3 font-bold uppercase tracking-widest text-sm hover:bg-pos-surface-hover transition-colors"
                >
                    Print
                </button>
                <Link
                    to="/"
                    className="bg-pos-primary text-pos-bg px-6 py-3 font-bold uppercase tracking-widest text-sm hover:bg-pos-primary-hover transition-colors"
                >
                    New Sale
                </Link>
            </div>
        </div>
    );
}
