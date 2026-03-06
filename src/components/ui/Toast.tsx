import { useEffect, useState, createContext, useContext, useCallback } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { clsx } from 'clsx';

// ─── Types ────────────────────────────────────────────────────────────────────
type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
    id: string;
    type: ToastType;
    message: string;
}

interface ToastContextValue {
    toast: (message: string, type?: ToastType) => void;
    success: (message: string) => void;
    error: (message: string) => void;
    warning: (message: string) => void;
    info: (message: string) => void;
}

// ─── Context ──────────────────────────────────────────────────────────────────
const ToastContext = createContext<ToastContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────
export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const remove = useCallback((id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const add = useCallback((message: string, type: ToastType = 'info') => {
        const id = `${Date.now()}-${Math.random()}`;
        setToasts(prev => [...prev.slice(-4), { id, type, message }]);
        setTimeout(() => remove(id), 4000);
    }, [remove]);

    const value: ToastContextValue = {
        toast: add,
        success: (m) => add(m, 'success'),
        error: (m) => add(m, 'error'),
        warning: (m) => add(m, 'warning'),
        info: (m) => add(m, 'info'),
    };

    return (
        <ToastContext.Provider value={value}>
            {children}
            {/* Portal-style fixed container */}
            <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2 pointer-events-none" aria-live="polite">
                {toasts.map(t => (
                    <ToastItem key={t.id} toast={t} onRemove={remove} />
                ))}
            </div>
        </ToastContext.Provider>
    );
}

// ─── Single Toast Item ────────────────────────────────────────────────────────
function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const t = setTimeout(() => setVisible(true), 10);
        return () => clearTimeout(t);
    }, []);

    const config = {
        success: { icon: CheckCircle, bg: 'bg-emerald-600', border: 'border-emerald-500' },
        error: { icon: XCircle, bg: 'bg-red-600', border: 'border-red-500' },
        warning: { icon: AlertTriangle, bg: 'bg-amber-500', border: 'border-amber-400' },
        info: { icon: Info, bg: 'bg-blue-600', border: 'border-blue-500' },
    }[toast.type];

    const Icon = config.icon;

    return (
        <div
            className={clsx(
                'pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl border text-white text-sm font-medium min-w-[260px] max-w-sm transition-all duration-300',
                config.bg, config.border,
                visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            )}
        >
            <Icon size={16} className="shrink-0" />
            <span className="flex-1">{toast.message}</span>
            <button
                onClick={() => onRemove(toast.id)}
                className="hover:opacity-70 transition-opacity"
                title="Dismiss"
            >
                <X size={14} />
            </button>
        </div>
    );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
// eslint-disable-next-line react-refresh/only-export-components
export function useToast(): ToastContextValue {
    const ctx = useContext(ToastContext);
    if (!ctx) throw new Error('useToast must be used within ToastProvider');
    return ctx;
}
