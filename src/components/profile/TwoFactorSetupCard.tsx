import { useMemo, useState, type FormEvent } from 'react';
import { Shield, Smartphone, KeyRound } from 'lucide-react';
import { normalizeTotpCode } from '../../lib/mfa';

interface TwoFactorSetupCardProps {
    qrCode: string;
    secret: string;
    onVerify: (code: string) => Promise<void> | void;
    onCancel: () => void;
    isLoading?: boolean;
    error?: string | null;
}

export function TwoFactorSetupCard({
    qrCode,
    secret,
    onVerify,
    onCancel,
    isLoading = false,
    error = null,
}: TwoFactorSetupCardProps) {
    const [code, setCode] = useState('');
    const cleanCode = useMemo(() => normalizeTotpCode(code), [code]);
    const canSubmit = cleanCode.length === 6 && !isLoading;

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!canSubmit) return;
        await onVerify(cleanCode);
    };

    return (
        <div className="rounded-2xl border border-border-dim bg-surface-dim p-4 md:p-5 space-y-4">
            <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand/10 text-brand flex items-center justify-center shrink-0">
                    <Shield size={18} />
                </div>
                <div>
                    <h4 className="text-sm md:text-base font-bold text-text-main">Set up Authenticator App</h4>
                    <p className="text-xs text-text-dim mt-1">
                        Scan this QR code with Google Authenticator, Microsoft Authenticator, or Authy.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-[180px,1fr] gap-4 items-start">
                <div className="rounded-xl bg-white p-3 w-fit">
                    <img src={qrCode} alt="MFA QR code" className="w-40 h-40" />
                </div>

                <div className="space-y-3">
                    <div className="p-3 rounded-xl border border-border-dim bg-surface">
                        <p className="text-xs text-text-sub uppercase tracking-wider font-bold mb-1 flex items-center gap-1.5">
                            <KeyRound size={12} /> Manual setup key
                        </p>
                        <code className="text-sm text-text-main break-all">{secret}</code>
                    </div>

                    <div className="p-3 rounded-xl border border-border-dim bg-surface">
                        <p className="text-xs text-text-sub uppercase tracking-wider font-bold mb-1 flex items-center gap-1.5">
                            <Smartphone size={12} /> Supported apps
                        </p>
                        <p className="text-sm text-text-main">
                            Google Authenticator, Microsoft Authenticator, Authy
                        </p>
                    </div>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                    <label htmlFor="totp-setup-code" className="block text-xs font-bold text-text-sub uppercase tracking-wider mb-1.5">
                        Enter 6-digit code
                    </label>
                    <input
                        id="totp-setup-code"
                        type="text"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        maxLength={6}
                        value={code}
                        onChange={(e) => setCode(normalizeTotpCode(e.target.value))}
                        className="w-full px-4 py-2.5 rounded-xl bg-surface border border-border-dim text-text-main text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition-all"
                        placeholder="123456"
                        disabled={isLoading}
                    />
                </div>

                {error && (
                    <div className="p-3 rounded-xl bg-danger/10 border border-danger/20 text-sm text-danger">
                        {error}
                    </div>
                )}

                <div className="flex gap-2 justify-end">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="px-4 py-2 rounded-full bg-surface border border-border-dim text-sm font-bold text-text-sub hover:bg-surface-dim transition-all"
                        disabled={isLoading}
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={!canSubmit}
                        className="px-5 py-2 rounded-full bg-brand text-white text-sm font-bold hover:bg-brand-hover transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        {isLoading ? 'Verifying...' : 'Verify and Enable'}
                    </button>
                </div>
            </form>
        </div>
    );
}
