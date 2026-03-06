import { useState, useId } from 'react';
import { Eye, EyeOff } from 'lucide-react';

// ─── Password strength ────────────────────────────────────────────────────────
function getStrength(password: string): { score: number; label: string; color: string } {
    if (!password) return { score: 0, label: '', color: '' };
    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    const levels = [
        { label: 'Very Weak', color: 'bg-red-500' },
        { label: 'Weak', color: 'bg-orange-500' },
        { label: 'Fair', color: 'bg-amber-400' },
        { label: 'Strong', color: 'bg-blue-500' },
        { label: 'Very Strong', color: 'bg-emerald-500' },
    ];
    return { score, ...levels[Math.min(score, 4)] };
}

// ─── PasswordStrengthBar ──────────────────────────────────────────────────────
export function PasswordStrengthBar({ password }: { password: string }) {
    const { score, label, color } = getStrength(password);
    if (!password) return null;

    return (
        <div className="mt-2 space-y-1">
            <div className="flex gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                    <div
                        key={i}
                        className={`h-1 flex-1 rounded-full transition-all duration-300 ${i < score ? color : 'bg-white/10'}`}
                    />
                ))}
            </div>
            <p className={`text-[11px] font-medium transition-colors ${score <= 1 ? 'text-red-400' : score <= 2 ? 'text-amber-400' : 'text-emerald-400'
                }`}>{label}</p>
        </div>
    );
}

// ─── PasswordField ────────────────────────────────────────────────────────────
interface PasswordFieldProps {
    label: string;
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
    showStrength?: boolean;
    autoComplete?: string;
}

export function PasswordField({
    label, value, onChange, placeholder = '••••••••', showStrength = false, autoComplete = 'current-password',
}: PasswordFieldProps) {
    const [show, setShow] = useState(false);
    const id = useId();

    return (
        <div>
            <label htmlFor={id} className="block text-sm font-medium text-gray-300 mb-1.5">{label}</label>
            <div className="relative">
                <input
                    id={id}
                    type={show ? 'text' : 'password'}
                    value={value}
                    onChange={e => onChange(e.target.value)}
                    placeholder={placeholder}
                    autoComplete={autoComplete}
                    className="w-full pl-4 pr-10 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500
                        focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 text-sm transition"
                />
                <button
                    type="button"
                    onClick={() => setShow(s => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                    aria-label={show ? 'Hide password' : 'Show password'}
                >
                    {show ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
            </div>
            {showStrength && <PasswordStrengthBar password={value} />}
        </div>
    );
}
