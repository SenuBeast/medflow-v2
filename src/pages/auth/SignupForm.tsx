import { useState, type FormEvent } from 'react';
import { Mail, AlertCircle, User } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { PasswordField } from './PasswordField';
import { useToast } from '../../components/ui/Toast';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getPasswordErrors(password: string): string[] {
    const errs: string[] = [];
    if (password.length < 8) errs.push('At least 8 characters');
    if (!/[A-Z]/.test(password)) errs.push('One uppercase letter');
    if (!/[0-9]/.test(password)) errs.push('One number');
    return errs;
}

interface SignupFormProps {
    onSignedUp: (email: string) => void;
    onSwitchToLogin: () => void;
}

export function SignupForm({ onSignedUp, onSwitchToLogin }: SignupFormProps) {
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { success, error: toastError } = useToast();

    const passwordErrors = getPasswordErrors(password);
    const passwordsMatch = password === confirm;
    const emailValid = EMAIL_RE.test(email);
    const canSubmit = fullName.trim() && emailValid && password && passwordErrors.length === 0 && passwordsMatch;

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!canSubmit) return;
        setLoading(true);
        setError(null);
        try {
            const { error: signUpError } = await supabase.auth.signUp({
                email,
                password,
                options: { data: { full_name: fullName } },
            });
            if (signUpError) throw signUpError;
            success('Account created! Check your email for the verification code.');
            onSignedUp(email);
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Sign up failed';
            setError(msg.includes('already') ? 'This email is already registered.' : msg);
            toastError('Sign up failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* Full Name */}
            <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5" htmlFor="signup-name">Full Name</label>
                <div className="relative">
                    <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                        id="signup-name"
                        type="text"
                        value={fullName}
                        onChange={e => setFullName(e.target.value)}
                        placeholder="Dr. Jane Smith"
                        autoComplete="name"
                        className="w-full pl-9 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 text-sm transition"
                    />
                </div>
            </div>

            {/* Email */}
            <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5" htmlFor="signup-email">Email Address</label>
                <div className="relative">
                    <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                        id="signup-email"
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="you@medflow.com"
                        autoComplete="email"
                        className={`w-full pl-9 pr-4 py-2.5 bg-white/5 border rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-sm transition
                            ${email && !emailValid ? 'border-red-500/50' : 'border-white/10 focus:border-blue-500/50'}`}
                    />
                </div>
                {email && !emailValid && (
                    <p className="text-red-400 text-xs mt-1">Enter a valid email address</p>
                )}
            </div>

            {/* Password */}
            <PasswordField
                label="Password"
                value={password}
                onChange={setPassword}
                placeholder="Min. 8 characters"
                showStrength
                autoComplete="new-password"
            />
            {password && passwordErrors.length > 0 && (
                <ul className="text-xs text-gray-500 space-y-0.5 -mt-2 pl-1">
                    {passwordErrors.map(e => (
                        <li key={e} className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block shrink-0" />
                            {e}
                        </li>
                    ))}
                </ul>
            )}

            {/* Confirm Password */}
            <PasswordField
                label="Confirm Password"
                value={confirm}
                onChange={setConfirm}
                placeholder="Repeat password"
                autoComplete="new-password"
            />
            {confirm && !passwordsMatch && (
                <p className="text-red-400 text-xs -mt-2">Passwords don't match</p>
            )}

            {/* Error */}
            {error && (
                <div className="flex items-center gap-2 text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm">
                    <AlertCircle size={14} className="shrink-0" /> {error}
                </div>
            )}

            {/* Submit */}
            <button
                type="submit"
                disabled={!canSubmit || loading}
                className="w-full py-3 rounded-xl font-semibold text-sm transition-all
                    bg-blue-600 hover:bg-blue-500 text-white
                    disabled:opacity-40 disabled:cursor-not-allowed
                    flex items-center justify-center gap-2 mt-1"
            >
                {loading
                    ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Creating account…</>
                    : 'Create Account'
                }
            </button>

            <p className="text-center text-sm text-gray-500">
                Already have an account?{' '}
                <button type="button" onClick={onSwitchToLogin} className="text-blue-400 hover:text-blue-300 font-medium transition-colors">
                    Sign in
                </button>
            </p>
        </form>
    );
}


