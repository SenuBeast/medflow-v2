import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { ShieldCheck, AlertCircle, ArrowRight } from 'lucide-react';
import { useMfa } from '../../hooks/useMfa';
import { normalizeTotpCode } from '../../lib/mfa';
import { useAuthStore } from '../../store/authStore';

interface MfaErrorLike {
    code?: string;
    message?: string;
}

function toFriendlyError(err: unknown): string {
    const authError = err as MfaErrorLike;
    if (authError?.code === 'mfa_challenge_expired') return 'The verification challenge expired. Please try again.';
    if (authError?.code === 'mfa_verification_failed') return 'Invalid authenticator code. Please try again.';
    if (authError?.code === 'mfa_factor_not_found') return 'No authenticator app is enrolled for this account.';
    return authError?.message ?? 'Verification failed. Please try again.';
}

export function Verify2FAPage() {
    const location = useLocation();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { user, isInitialized, isLoading, isTwoFactorVerified } = useAuthStore();
    const { verifySignInTotp, getMfaAssuranceState, isLoading: verifying } = useMfa();

    const [code, setCode] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [lockSeconds, setLockSeconds] = useState(0);
    const failedAttemptsRef = useRef(0);

    const destination = useMemo(() => {
        const next = searchParams.get('next');
        if (next) return next;
        const statePath = location.state?.from?.pathname as string | undefined;
        return statePath || '/dashboard';
    }, [location.state, searchParams]);

    useEffect(() => {
        if (lockSeconds <= 0) return;
        const timer = window.setInterval(() => setLockSeconds((n) => Math.max(0, n - 1)), 1000);
        return () => window.clearInterval(timer);
    }, [lockSeconds]);

    if (isInitialized && !isLoading && !user) {
        return <Navigate to="/login" replace />;
    }

    if (isInitialized && user && isTwoFactorVerified) {
        return <Navigate to={destination} replace />;
    }

    const isLocked = lockSeconds > 0;
    const cleanCode = normalizeTotpCode(code);

    const handleVerify = async (e: FormEvent) => {
        e.preventDefault();
        if (cleanCode.length !== 6 || isLocked || verifying) return;

        setError(null);
        try {
            await verifySignInTotp(cleanCode);
            const assurance = await getMfaAssuranceState();
            if (assurance.requiresChallenge) {
                throw new Error('Authenticator verification is still required.');
            }

            useAuthStore.getState().setTwoFactorVerified(true);
            navigate(destination, { replace: true });
        } catch (err) {
            failedAttemptsRef.current += 1;
            if (failedAttemptsRef.current >= 5) {
                failedAttemptsRef.current = 0;
                setLockSeconds(30);
                setError('Too many attempts. Wait 30 seconds and try again.');
            } else {
                setError(toFriendlyError(err));
            }
            setCode('');
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-slate-900 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-card/[0.03] backdrop-blur-2xl border border-white/[0.08] rounded-3xl p-8 shadow-2xl space-y-6">
                <div className="text-center">
                    <div className="w-14 h-14 rounded-2xl bg-blue-500/20 flex items-center justify-center mx-auto mb-4">
                        <ShieldCheck size={26} className="text-blue-400" />
                    </div>
                    <h1 className="text-white font-bold text-2xl tracking-tight">Verify Two-Factor Authentication</h1>
                    <p className="text-text-sub text-sm mt-2">
                        Enter the 6-digit code from Google Authenticator, Microsoft Authenticator, or Authy.
                    </p>
                </div>

                <form onSubmit={handleVerify} className="space-y-4">
                    <div>
                        <label htmlFor="verify-2fa-code" className="block text-sm font-medium text-gray-300 mb-1.5">
                            Authenticator Code
                        </label>
                        <input
                            id="verify-2fa-code"
                            type="text"
                            inputMode="numeric"
                            autoComplete="one-time-code"
                            maxLength={6}
                            value={code}
                            onChange={(e) => {
                                setCode(normalizeTotpCode(e.target.value));
                                setError(null);
                            }}
                            className="w-full px-4 py-3 bg-card/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 text-sm transition"
                            placeholder="123456"
                            disabled={verifying || isLocked}
                        />
                    </div>

                    {error && (
                        <div className="flex items-center gap-2 text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm">
                            <AlertCircle size={14} className="shrink-0" />
                            {error}
                        </div>
                    )}

                    {isLocked && (
                        <div className="text-center text-sm text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3">
                            Verification temporarily locked. Try again in {lockSeconds}s.
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={cleanCode.length !== 6 || verifying || isLocked}
                        className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    >
                        {verifying ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Verifying...
                            </>
                        ) : (
                            <>
                                <ArrowRight size={15} />
                                Verify
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}
