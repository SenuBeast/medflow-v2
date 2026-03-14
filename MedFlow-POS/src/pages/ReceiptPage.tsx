import { useParams, Link } from 'react-router-dom';
import { PHARMACY_CONFIG } from '../lib/constants';

export default function ReceiptPage() {
    const { id } = useParams();

    return (
        <div className="min-h-screen bg-pos-bg flex items-center justify-center p-8 text-pos-text">
            <div className="max-w-md w-full bg-card text-main p-8 shadow-2xl">
                <div className="text-center mb-6">
                    <h1 className="text-2xl font-bold font-mono">{PHARMACY_CONFIG.name}</h1>
                    <p className="text-sm">{PHARMACY_CONFIG.address}</p>
                    <p className="text-sm mt-2 font-mono">Receipt: {id}</p>
                    <p className="text-sm font-mono">{new Date().toLocaleString()}</p>
                </div>

                <div className="border-t border-b border-dashed border-border-dim py-4 my-4">
                    {/* Items will go here */}
                    <div className="flex justify-between mb-2 text-sm font-mono">
                        <span>1x Aspirin 500mg</span>
                        <span>{PHARMACY_CONFIG.currency_symbol}12.50</span>
                    </div>
                </div>

                <div className="mb-8">
                    <div className="flex justify-between text-sm">
                        <span>Subtotal</span>
                        <span className="font-mono">{PHARMACY_CONFIG.currency_symbol}12.50</span>
                    </div>
                    <div className="flex justify-between text-sm mt-1">
                        <span>Tax ({PHARMACY_CONFIG.tax_rate}%)</span>
                        <span className="font-mono">{PHARMACY_CONFIG.currency_symbol}1.06</span>
                    </div>
                    <div className="flex justify-between font-bold text-lg mt-2 pt-2 border-t border-border-dim">
                        <span>Total</span>
                        <span className="font-mono">{PHARMACY_CONFIG.currency_symbol}13.56</span>
                    </div>
                </div>

                <div className="text-center border-t border-border-dim pt-6 mt-6">
                    <p className="text-sm italic font-medium opacity-80">Thank you for your business!</p>
                </div>
            </div>

            <div className="fixed bottom-8 right-8 flex gap-4 print:hidden">
                <button
                    onClick={() => window.print()}
                    className="bg-pos-surface border border-pos-border px-6 py-3 font-bold uppercase tracking-widest text-sm hover:bg-pos-surface-hover transition-colors shadow-lg"
                >
                    Print
                </button>
                <Link
                    to="/"
                    className="bg-pos-primary text-pos-bg px-6 py-3 font-bold uppercase tracking-widest text-sm hover:bg-pos-primary-hover transition-colors shadow-lg"
                >
                    New Sale
                </Link>
            </div>
        </div>
    );
}
