import { useState, useEffect, useRef, type ClipboardEvent } from 'react';
import { ShieldCheck, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useToast } from '../../components/ui/Toast';
import { verifyOtp, sendOtp, maskEmail } from '../../lib/otp';
import { useAuthStore } from '../../store/authStore';

interface OTPVerificationProps {
    email: string;
    onVerified: () => void;
    onBack: () => void;
}

const RESEND_COOLDOWN = 30;

export function OTPVerification({ email, onVerified, onBack }: OTPVerificationProps) {
    const [digits, setDigits] = useState(['', '', '', '', '', '']);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [resendCooldown, setResendCooldown] = useState(0);
    const [verified, setVerified] = useState(false);
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
    const { success, error: toastError } = useToast();

    // Auto-focus first input on mount
    useEffect(() => {
        inputRefs.current[0]?.focus();
    }, []);

    // Resend cooldown timer
    useEffect(() => {
        if (resendCooldown <= 0) return;
        const t = setInterval(() => setResendCooldown(c => c - 1), 1000);
        return () => clearInterval(t);
    }, [resendCooldown]);

    const handleDigitChange = (index: number, value: string) => {
        const clean = value.replace(/\D/g, '').slice(-1);
        const next = [...digits];
        next[index] = clean;
        setDigits(next);
        setError(null);

        // Auto-advance
        if (clean && index < 5) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
        if (e.key === 'Backspace' && !digits[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
        // Submit on Enter when all 6 digits are filled
        if (e.key === 'Enter' && digits.join('').length === 6) {
            handleVerify();
        }
    };

    const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
        e.preventDefault();
        const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
        if (!pasted) return;
        const next = ['', '', '', '', '', ''];
        pasted.split('').forEach((ch, i) => { next[i] = ch; });
        setDigits(next);
        // Focus last filled or last
        const lastIdx = Math.min(pasted.length, 5);
        inputRefs.current[lastIdx]?.focus();
    };

    const handleVerify = async () => {
        const token = digits.join('');
        if (token.length < 6) { setError('Enter all 6 digits'); return; }
        setLoading(true);
        setError(null);
        try {
            const res = await verifyOtp(email, token);
            if (!res.valid) {
                if (res.error === 'expired') throw new Error('Code has expired. Please request a new one.');
                if (res.error === 'locked') throw new Error('Too many attempts. Please request a new code.');
                throw new Error('Invalid code. Please try again.');
            }

            setVerified(true);
            useAuthStore.getState().setTwoFactorVerified(true);
            success('Identity verified! Signing you in…');
            setTimeout(() => onVerified(), 1200);
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Invalid code';
            setError(msg);
            toastError('OTP verification failed');
            setDigits(['', '', '', '', '', '']);
            setTimeout(() => inputRefs.current[0]?.focus(), 50);
        } finally {
            setLoading(false);
        }
    };

    const handleResend = async () => {
        if (resendCooldown > 0) return;
        setResendCooldown(RESEND_COOLDOWN);
        setDigits(['', '', '', '', '', '']);
        setError(null);
        inputRefs.current[0]?.focus();
        try {
            await sendOtp(email);
            success('New code sent to your email');
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Failed to send code';
            toastError(msg.includes('Too many') ? msg : 'Failed to send code. Try again.');
        }
    };

    const otp = digits.join('');
    const isComplete = otp.length === 6;

    return (
        <div className="space-y-6">
            {/* Icon + Title */}
            <div className="text-center">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3 transition-colors duration-500 ${verified ? 'bg-emerald-500/20' : 'bg-blue-500/20'}`}>
                    {verified
                        ? <CheckCircle2 size={26} className="text-emerald-400" />
                        : <ShieldCheck size={26} className="text-blue-400" />
                    }
                </div>
                <h2 className="text-white font-bold text-xl">Two-Factor Verification</h2>
                <p className="text-gray-400 text-sm mt-1">
                    We sent a 6-digit code to<br />
                    <span className="text-white font-medium">{maskEmail(email)}</span>
                </p>
            </div>

            {/* OTP Inputs */}
            <div className="flex justify-center gap-3">
                {digits.map((d, i) => (
                    <input
                        key={i}
                        ref={el => { inputRefs.current[i] = el; }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={d}
                        onChange={e => handleDigitChange(i, e.target.value)}
                        onKeyDown={e => handleKeyDown(i, e)}
                        onPaste={i === 0 ? handlePaste : undefined}
                        disabled={loading || verified}
                        aria-label={`OTP digit ${i + 1}`}
                        className={`w-11 h-14 text-center text-xl font-bold rounded-xl border transition-all focus:outline-none
                            ${d ? 'bg-blue-600/20 border-blue-500/60 text-white' : 'bg-white/5 border-white/10 text-white'}
                            ${error ? 'border-red-500/60 bg-red-500/10' : ''}
                            ${verified ? 'border-emerald-500/60 bg-emerald-500/10 text-emerald-300' : ''}
                            focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/50
                            disabled:opacity-50`}
                    />
                ))}
            </div>

            {/* Error */}
            {error && (
                <div className="flex items-center gap-2 text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm">
                    <AlertCircle size={14} className="shrink-0" />
                    {error}
                </div>
            )}

            {/* Verify Button */}
            <button
                onClick={handleVerify}
                disabled={!isComplete || loading || verified}
                className="w-full py-3 rounded-xl font-semibold text-sm transition-all
                    bg-blue-600 hover:bg-blue-500 text-white
                    disabled:opacity-40 disabled:cursor-not-allowed
                    focus:outline-none focus:ring-2 focus:ring-blue-500/50
                    flex items-center justify-center gap-2"
            >
                {loading
                    ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Verifying…</>
                    : verified ? '✓ Verified!' : 'Verify Code'
                }
            </button>

            {/* Resend + Back */}
            <div className="flex items-center justify-between text-sm">
                <button onClick={onBack} className="text-gray-500 hover:text-gray-300 transition-colors">
                    ← Back
                </button>
                <button
                    onClick={handleResend}
                    disabled={resendCooldown > 0 || verified}
                    className="flex items-center gap-1.5 text-blue-400 hover:text-blue-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                    <RefreshCw size={13} />
                    {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend code'}
                </button>
            </div>
        </div>
    );
}
