import { useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Activity, Mail, AlertCircle, ArrowRight, KeyRound } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useAuthStore } from '../../store/authStore';
import { supabase } from '../../lib/supabase';
import { getMfaAssuranceState } from '../../lib/mfa';
import { PasswordField } from './PasswordField';
import { SignupForm } from './SignupForm';
import { useToast } from '../../components/ui/Toast';

function GoogleLogo() {
    return (
        <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
            <path d="M17.64 9.2a10.34 10.34 0 0 0-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.614z" fill="#4285F4" />
            <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853" />
            <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05" />
            <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335" />
        </svg>
    );
}

type AuthStep = 'login' | 'signup' | 'forgot';

function ForgotPassword({ onBack }: { onBack: () => void }) {
    const [email, setEmail] = useState('');
    const [sent, setSent] = useState(false);
    const [loading, setLoading] = useState(false);
    const { success, error: toastError } = useToast();

    const handleSend = async (e: FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/auth`,
            });
            if (error) throw error;
            setSent(true);
            success('Password reset email sent.');
        } catch {
            toastError('Failed to send reset email. Check the address.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-5">
            <div className="text-center">
                <div className="w-12 h-12 rounded-2xl bg-blue-500/20 flex items-center justify-center mx-auto mb-3">
                    <KeyRound size={22} className="text-blue-400" />
                </div>
                <h2 className="text-white font-bold text-xl">Reset Password</h2>
                <p className="text-text-dim text-sm mt-1">
                    {sent ? "We've sent a reset link to your email." : 'Enter your email to receive a password reset link.'}
                </p>
            </div>
            {!sent && (
                <form onSubmit={handleSend} className="space-y-4">
                    <div className="relative">
                        <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-sub" />
                        <input
                            type="email"
                            required
                            placeholder="your@email.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full pl-9 pr-4 py-2.5 bg-card/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-sm"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={loading || !email}
                        className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm disabled:opacity-40 flex items-center justify-center gap-2 transition-all"
                    >
                        {loading ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Sending...
                            </>
                        ) : (
                            <>
                                <ArrowRight size={15} />
                                Send Reset Link
                            </>
                        )}
                    </button>
                </form>
            )}
            <button onClick={onBack} className="w-full text-center text-sm text-text-sub hover:text-gray-300 transition-colors">
                Back to sign in
            </button>
        </div>
    );
}

function LoginForm({
    onSuccess,
    onSwitchToSignup,
    onForgotPassword,
}: {
    onSuccess: () => void;
    onSwitchToSignup: () => void;
    onForgotPassword: () => void;
}) {
    const { signIn, signInWithGoogle } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [rememberMe, setRememberMe] = useState(false);
    const [loading, setLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [attempts, setAttempts] = useState(0);
    const { error: toastError } = useToast();

    const handleGoogleSignIn = async () => {
        setGoogleLoading(true);
        try {
            await signInWithGoogle();
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Google sign-in failed';
            toastError(msg);
            setGoogleLoading(false);
        }
    };

    const isLocked = attempts >= 5;

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (isLocked) return;
        setError(null);
        setLoading(true);
        try {
            await signIn(email, password);
            onSuccess();
        } catch (err: unknown) {
            const raw = err instanceof Error ? err.message : 'Authentication failed';
            const friendly = raw.toLowerCase().includes('invalid')
                ? 'Incorrect email or password.'
                : raw.toLowerCase().includes('network')
                    ? 'Network error. Check your connection.'
                    : 'Authentication failed. Please try again.';
            setError(friendly);
            toastError(friendly);
            setAttempts((a) => a + 1);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-5">
            <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={googleLoading || loading}
                className="w-full flex items-center justify-center gap-3 py-2.5 rounded-xl border border-white/10 bg-card/5 hover:bg-card/10 text-white text-sm font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            >
                {googleLoading
                    ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    : <GoogleLogo />
                }
                {googleLoading ? 'Redirecting...' : 'Continue with Google'}
            </button>

            <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-card/10" />
                <span className="text-xs text-text-sub font-medium uppercase tracking-wider">or</span>
                <div className="flex-1 h-px bg-card/10" />
            </div>

            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1.5" htmlFor="login-email">Email Address</label>
                    <div className="relative">
                        <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-sub" />
                        <input
                            id="login-email"
                            type="email"
                            value={email}
                            onChange={(e) => { setEmail(e.target.value); setError(null); }}
                            required
                            placeholder="admin@medflow.com"
                            autoComplete="email"
                            className="w-full pl-9 pr-4 py-2.5 bg-card/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 text-sm transition"
                        />
                    </div>
                </div>

                <PasswordField
                    label="Password"
                    value={password}
                    onChange={(p: string) => { setPassword(p); setError(null); }}
                    autoComplete="current-password"
                />

                <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                            type="checkbox"
                            checked={rememberMe}
                            onChange={(e) => setRememberMe(e.target.checked)}
                            className="w-4 h-4 rounded border-white/20 bg-card/5 text-blue-600 focus:ring-blue-500/50"
                        />
                        <span className="text-sm text-text-dim">Remember me</span>
                    </label>
                    <button
                        type="button"
                        onClick={onForgotPassword}
                        className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
                    >
                        Forgot password?
                    </button>
                </div>

                {attempts >= 3 && attempts < 5 && (
                    <div className="flex items-center gap-2 text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3 text-sm">
                        <AlertCircle size={14} className="shrink-0" />
                        {5 - attempts} attempt{5 - attempts !== 1 ? 's' : ''} remaining before lockout
                    </div>
                )}

                {error && (
                    <div className="flex items-center gap-2 text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm">
                        <AlertCircle size={14} className="shrink-0" /> {error}
                    </div>
                )}

                {isLocked && (
                    <div className="text-center py-2 px-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                        Account temporarily locked. Please reset your password.
                    </div>
                )}

                <button
                    type="submit"
                    disabled={!email || !password || loading || isLocked}
                    className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                >
                    {loading ? (
                        <>
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Signing in...
                        </>
                    ) : (
                        <>
                            <ArrowRight size={15} />
                            Sign In
                        </>
                    )}
                </button>

                <p className="text-center text-sm text-text-sub">
                    Don't have an account?{' '}
                    <button type="button" onClick={onSwitchToSignup} className="text-blue-400 hover:text-blue-300 font-medium transition-colors">
                        Sign up
                    </button>
                </p>
            </form>
        </div>
    );
}

export function LoginPage() {
    const { user, isInitialized, isTwoFactorVerified } = useAuthStore();
    const location = useLocation();
    const navigate = useNavigate();
    const from = location.state?.from?.pathname || '/dashboard';

    const [step, setStep] = useState<AuthStep>('login');
    const { success, error: toastError } = useToast();

    if (isInitialized && user && isTwoFactorVerified) {
        return <Navigate to={from} replace />;
    }

    if (isInitialized && user && !isTwoFactorVerified) {
        return <Navigate to={`/verify-2fa?next=${encodeURIComponent(from)}`} replace state={{ from: location }} />;
    }

    const handleLoginSuccess = async () => {
        try {
            const assurance = await getMfaAssuranceState();
            if (assurance.requiresChallenge) {
                useAuthStore.getState().setTwoFactorVerified(false);
                navigate(`/verify-2fa?next=${encodeURIComponent(from)}`, { replace: true, state: { from: location } });
                return;
            }

            useAuthStore.getState().setTwoFactorVerified(true);
            navigate(from, { replace: true });
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Failed to evaluate MFA state.';
            toastError(msg);
        }
    };

    const handleSignedUp = (email: string) => {
        success(`Account created for ${email}. Sign in to continue.`);
        setStep('login');
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-slate-900 flex items-center justify-center p-3 sm:p-4 relative overflow-hidden">
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute -top-60 -left-40 w-[500px] h-[500px] bg-blue-700/15 rounded-full blur-3xl" />
                <div className="absolute -bottom-60 -right-40 w-[500px] h-[500px] bg-indigo-700/15 rounded-full blur-3xl" />
                <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-64 h-64 bg-blue-600/5 rounded-full blur-2xl" />
            </div>

            <div className="relative w-full max-w-[420px]">
                <div className="bg-card/[0.03] backdrop-blur-2xl border border-white/[0.08] rounded-2xl sm:rounded-3xl p-5 sm:p-8 shadow-2xl">
                    <div className="flex flex-col items-center mb-6 sm:mb-8">
                        <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mb-3 sm:mb-4 shadow-lg shadow-blue-500/25">
                            <Activity size={22} className="text-white sm:w-[26px] sm:h-[26px]" />
                        </div>
                        <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">MedFlow</h1>
                        <p className="text-text-sub text-xs sm:text-sm mt-1">Medical Inventory System</p>
                    </div>

                    {(step === 'login' || step === 'signup') && (
                        <>
                            <div className="flex bg-card/5 p-1 rounded-xl mb-6 border border-white/5">
                                {(['login', 'signup'] as const).map((s) => (
                                    <button
                                        key={s}
                                        onClick={() => setStep(s)}
                                        className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all capitalize ${step === s ? 'bg-blue-600 text-white shadow-sm' : 'text-text-sub hover:text-gray-300'}`}
                                    >
                                        {s === 'login' ? 'Sign In' : 'Sign Up'}
                                    </button>
                                ))}
                            </div>
                            {step === 'login' && (
                                <LoginForm
                                    onSuccess={handleLoginSuccess}
                                    onSwitchToSignup={() => setStep('signup')}
                                    onForgotPassword={() => setStep('forgot')}
                                />
                            )}
                            {step === 'signup' && (
                                <SignupForm onSignedUp={handleSignedUp} onSwitchToLogin={() => setStep('login')} />
                            )}
                        </>
                    )}

                    {step === 'forgot' && (
                        <ForgotPassword onBack={() => setStep('login')} />
                    )}

                    <p className="text-center text-[11px] text-gray-700 mt-6">
                        Secure - HIPAA-aware - Role-based access
                    </p>
                </div>

                <p className="text-center text-xs text-gray-700 mt-4">
                    (c) 2026 MedFlow Healthcare Systems
                </p>
            </div>
        </div>
    );
}
