import { useEffect, useRef } from 'react';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';

type ProductSearchProps = {
    searchTerm: string;
    setSearchTerm: (term: string) => void;
    onBarcodeScanned: (barcode: string) => void;
};

export default function ProductSearch({ searchTerm, setSearchTerm, onBarcodeScanned }: ProductSearchProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const barcodeBuffer = useRef('');
    const barcodeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Keyboard shortcut to focus search
    useKeyboardShortcuts({
        'F2': () => inputRef.current?.focus(),
    });

    // Global barcode listener (simulated scanner input)
    // Physical scanners act like standard keyboards but type extremely fast.
    useEffect(() => {
        const handleGlobalKeyDown = (e: KeyboardEvent) => {
            // Ignore if in an input field other than our Search input
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
                if (e.target !== inputRef.current) return;
            }

            // Simple barcode detection: fast typing of printable characters ending with Enter
            if (e.key === 'Enter') {
                if (barcodeBuffer.current.length > 5) { // Assuming barcodes are > 5 chars
                    e.preventDefault();
                    onBarcodeScanned(barcodeBuffer.current);
                    barcodeBuffer.current = '';
                }
                return;
            }

            if (e.key.length === 1) {
                barcodeBuffer.current += e.key;

                if (barcodeTimer.current) clearTimeout(barcodeTimer.current);

                // Clear buffer if typing is slow (meaning it's a human, not a scanner)
                barcodeTimer.current = setTimeout(() => {
                    barcodeBuffer.current = '';
                }, 50); // 50ms threshold between keystrokes
            }
        };

        window.addEventListener('keydown', handleGlobalKeyDown);
        return () => window.removeEventListener('keydown', handleGlobalKeyDown);
    }, [onBarcodeScanned]);

    return (
        <div className="p-4 border-b border-pos-border bg-pos-surface flex items-center gap-4">
            <div className="flex-1 relative">
                <input
                    ref={inputRef}
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search name, SKU, or scan barcode... [F2]"
                    className="w-full bg-pos-bg border border-pos-border px-4 py-4 focus:border-pos-primary focus:outline-none focus:ring-1 focus:ring-pos-primary font-mono text-sm placeholder:text-pos-text-muted/50 transition-all font-bold placeholder:uppercase placeholder:font-sans placeholder:tracking-widest"
                />

                {searchTerm && (
                    <button
                        onClick={() => setSearchTerm('')}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-pos-text-muted hover:text-pos-text"
                    >
                        [ESC]
                    </button>
                )}
            </div>

            <div className="flex flex-col text-[10px] text-pos-text-muted uppercase tracking-widest border-l border-pos-border pl-4">
                <span>Scanner Active</span>
                <span className="text-pos-primary font-bold">READY</span>
            </div>
        </div>
    );
}
