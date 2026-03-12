import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { clsx } from 'clsx';
import { Camera, User, Mail, Shield, Link as LinkIcon, CheckCircle, Lock, Save, Loader2, Smartphone } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useMfa } from '../../hooks/useMfa';
import { supabase } from '../../lib/supabase';
import { Card } from '../../components/ui/Card';
import { AvatarCropperModal } from '../../components/profile/AvatarCropperModal';
import { TwoFactorSetupCard } from '../../components/profile/TwoFactorSetupCard';
import { useToast } from '../../components/ui/Toast';

interface AuthErrorLike {
    code?: string;
    message?: string;
}

interface PendingTotpSetup {
    factorId: string;
    qrCode: string;
    secret: string;
    uri: string;
}

function UserAvatar({ url, name, size = 'lg' }: { url?: string | null; name?: string | null; size?: 'sm' | 'lg' }) {
    const s = size === 'lg' ? 'w-24 h-24 text-3xl' : 'w-10 h-10 text-sm';
    if (url) return <img src={url} alt={name ?? 'Avatar'} className={clsx(s, 'rounded-full object-cover ring-4 ring-border-dim')} />;

    const initials = (name ?? '?').split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();
    return (
        <div className={clsx(s, 'rounded-full bg-brand/10 text-brand font-bold flex items-center justify-center ring-4 ring-border-dim')}>
            {initials}
        </div>
    );
}

function toMfaErrorMessage(error: unknown): string {
    const authError = error as AuthErrorLike;
    if (authError?.code === 'mfa_verification_failed') return 'Invalid authenticator code.';
    if (authError?.code === 'mfa_challenge_expired') return 'Authenticator challenge expired. Try again.';
    if (authError?.code === 'mfa_verified_factor_exists') return 'Two-factor authentication is already enabled.';
    if (authError?.code === 'mfa_factor_not_found') return 'No authenticator factor found for this user.';
    if (authError?.code === 'invalid_credentials') return 'Current password is incorrect.';
    return authError?.message ?? 'Unable to complete the MFA action.';
}

export function ProfilePage() {
    const { user, linkGoogleAccount, updateProfile, refreshMfaState } = useAuth();
    const { success, error: toastError } = useToast();
    const {
        mfaEnabled,
        isLoading: mfaLoading,
        refreshFactors,
        enrollTotp,
        verifyTotpCodeForFactor,
        disableTotp,
    } = useMfa();

    const [fullName, setFullName] = useState(user?.full_name ?? '');
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [saving, setSaving] = useState(false);
    const [linking, setLinking] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [rawImageSrc, setRawImageSrc] = useState<string | null>(null);
    const [showCropper, setShowCropper] = useState(false);

    const [pendingSetup, setPendingSetup] = useState<PendingTotpSetup | null>(null);
    const [showDisableConfirm, setShowDisableConfirm] = useState(false);
    const [disablePassword, setDisablePassword] = useState('');
    const [mfaError, setMfaError] = useState<string | null>(null);

    const fileRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        void refreshFactors().catch(() => {
            setMfaError('Could not load two-factor authentication status.');
        });
    }, [refreshFactors]);

    if (!user) return null;

    const isGoogle = user.provider === 'google' || user.provider === 'email+google';
    const isEmailOnly = user.provider === 'email';
    const displayAvatar = avatarPreview ?? user.avatar_url;

    const handleAvatarChange = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setRawImageSrc(URL.createObjectURL(file));
        setShowCropper(true);
        if (fileRef.current) fileRef.current.value = '';
    };

    const handleCropComplete = (croppedFile: File) => {
        setAvatarFile(croppedFile);
        setAvatarPreview(URL.createObjectURL(croppedFile));
        setShowCropper(false);
        setRawImageSrc(null);
    };

    const handleImportGooglePhoto = async () => {
        setSaving(true);
        setError(null);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const googleAvatar = session?.user?.user_metadata?.avatar_url;
            if (!googleAvatar) throw new Error('No Google profile photo found on your account.');

            await updateProfile({ avatar_url: googleAvatar });
            setAvatarFile(null);
            setAvatarPreview(null);
            document.getElementById('avatar-menu')?.classList.add('hidden');
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Failed to import Google photo.');
        } finally {
            setSaving(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        setError(null);
        setSaveSuccess(false);
        try {
            let newAvatarUrl = user.avatar_url;

            if (avatarFile) {
                const ext = avatarFile.name.split('.').pop();
                const path = `${user.id}/avatar.${ext}`;
                const { error: uploadErr } = await supabase.storage.from('avatars').upload(path, avatarFile, { upsert: true });
                if (uploadErr) throw uploadErr;

                const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);
                newAvatarUrl = publicUrl;
            }

            await updateProfile({
                full_name: fullName,
                avatar_url: newAvatarUrl ?? undefined,
            });

            setAvatarFile(null);
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 3000);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Failed to save profile.');
        } finally {
            setSaving(false);
        }
    };

    const handleLinkGoogle = async () => {
        setLinking(true);
        setError(null);
        try {
            await linkGoogleAccount();
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Failed to link Google account.');
            setLinking(false);
        }
    };

    const handleChangePassword = async () => {
        if (!user.email) return;
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(user.email, {
            redirectTo: `${window.location.origin}/auth/callback`,
        });
        if (resetError) {
            setError(resetError.message);
            return;
        }
        success('Password reset email sent.');
    };

    const handleStartEnableMfa = async () => {
        setMfaError(null);
        setShowDisableConfirm(false);
        setDisablePassword('');
        try {
            const enrollment = await enrollTotp();
            setPendingSetup(enrollment);
        } catch (err: unknown) {
            setMfaError(toMfaErrorMessage(err));
            toastError(toMfaErrorMessage(err));
        }
    };

    const handleVerifyMfaSetup = async (code: string) => {
        if (!pendingSetup) return;
        setMfaError(null);
        try {
            await verifyTotpCodeForFactor(pendingSetup.factorId, code);
            await refreshMfaState();
            setPendingSetup(null);
            success('Two-factor authentication enabled.');
        } catch (err: unknown) {
            const message = toMfaErrorMessage(err);
            setMfaError(message);
            toastError(message);
        }
    };

    const handleDisableMfa = async () => {
        setMfaError(null);
        try {
            await disableTotp(disablePassword);
            await refreshMfaState();
            setDisablePassword('');
            setShowDisableConfirm(false);
            setPendingSetup(null);
            success('Two-factor authentication disabled.');
        } catch (err: unknown) {
            const message = toMfaErrorMessage(err);
            setMfaError(message);
            toastError(message);
        }
    };

    return (
        <div className="max-w-3xl mx-auto space-y-4 md:space-y-6 pb-12">
            <div>
                <h1 className="text-xl md:text-2xl font-bold text-text-main tracking-tight">My Profile</h1>
                <p className="text-xs md:text-sm text-text-dim mt-1">Manage your account information and security settings.</p>
            </div>

            <Card className="p-4 md:p-6">
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 md:gap-6">
                    <div className="relative shrink-0 group">
                        <UserAvatar url={displayAvatar} name={fullName || user.full_name} size="lg" />
                        <div
                            className="absolute inset-0 rounded-full bg-black/40 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                            onClick={() => {
                                const menu = document.getElementById('avatar-menu');
                                if (menu) menu.classList.toggle('hidden');
                            }}
                        >
                            <Camera size={20} className="text-white mb-1" />
                            <span className="text-[10px] text-white font-bold uppercase tracking-wider">Edit</span>
                        </div>

                        <div id="avatar-menu" className="hidden absolute top-full left-1/2 -translate-x-1/2 mt-2 w-48 bg-surface border border-border-dim rounded-xl shadow-xl overflow-hidden z-10 py-1">
                            <button
                                onClick={() => {
                                    document.getElementById('avatar-menu')?.classList.add('hidden');
                                    fileRef.current?.click();
                                }}
                                className="w-full text-left px-4 py-2 text-sm text-text-main hover:bg-surface-dim transition-colors whitespace-nowrap"
                            >
                                Upload Photo
                            </button>

                            {isGoogle && (
                                <button
                                    onClick={handleImportGooglePhoto}
                                    className="w-full text-left px-4 py-2 text-sm text-brand hover:bg-brand/10 transition-colors whitespace-nowrap"
                                >
                                    Import from Google
                                </button>
                            )}

                            {(displayAvatar || avatarFile) && (
                                <button
                                    onClick={() => {
                                        document.getElementById('avatar-menu')?.classList.add('hidden');
                                        setAvatarFile(null);
                                        setAvatarPreview(null);
                                        updateProfile({ avatar_url: '' }).catch((e) => setError(e.message));
                                    }}
                                    className="w-full text-left px-4 py-2 text-sm text-danger hover:bg-danger/10 transition-colors whitespace-nowrap border-t border-border-dim mt-1 pt-2"
                                >
                                    Remove Photo
                                </button>
                            )}
                        </div>

                        <input
                            ref={fileRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                                document.getElementById('avatar-menu')?.classList.add('hidden');
                                handleAvatarChange(e);
                            }}
                        />
                    </div>

                    <div className="flex-1 text-center sm:text-left space-y-1">
                        <h2 className="text-lg md:text-xl font-bold text-text-main">{user.full_name || 'Unnamed User'}</h2>
                        <p className="text-xs md:text-sm text-text-dim flex items-center justify-center sm:justify-start gap-1.5">
                            <Mail size={14} /> {user.email}
                        </p>
                        <div className="flex items-center justify-center sm:justify-start gap-2 pt-1">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-brand/10 text-brand text-xs font-bold border border-brand/20">
                                <Shield size={10} /> {user.role?.name ?? 'User'}
                            </span>
                            {isGoogle && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-success/10 text-success text-xs font-bold border border-success/20">
                                    <CheckCircle size={10} /> Google Connected
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </Card>

            <Card className="p-4 md:p-6 space-y-4 md:space-y-5">
                <h3 className="text-sm md:text-base font-bold text-text-main flex items-center gap-2">
                    <User size={16} className="text-brand" /> Edit Profile
                </h3>

                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-text-sub uppercase tracking-wider mb-1.5">Full Name</label>
                        <input
                            type="text"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-xl bg-surface-dim border border-border-dim text-text-main text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition-all"
                            placeholder="Your full name"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-text-sub uppercase tracking-wider mb-1.5">Email Address</label>
                        <input
                            type="email"
                            value={user.email}
                            disabled
                            className="w-full px-4 py-2.5 rounded-xl bg-surface-dim/50 border border-border-dim text-text-dim text-sm cursor-not-allowed opacity-70"
                            title={isGoogle ? 'Email is managed by Google' : 'Email cannot be changed here'}
                        />
                        <p className="text-xs text-text-dim mt-1.5">
                            {isGoogle ? 'Email is managed by your Google account.' : 'Contact an administrator to change your email.'}
                        </p>
                    </div>

                    {avatarFile && (
                        <div className="flex items-center gap-3 p-3 rounded-xl bg-success/10 border border-success/20">
                            <img src={avatarPreview ?? ''} className="w-10 h-10 rounded-lg object-cover" alt="Preview" />
                            <div>
                                <p className="text-xs font-bold text-success">New photo selected</p>
                                <p className="text-xs text-text-dim">{avatarFile.name}</p>
                            </div>
                        </div>
                    )}
                </div>

                {error && (
                    <div className="p-3 rounded-xl bg-danger/10 border border-danger/20 text-sm text-danger">{error}</div>
                )}

                <div className="flex justify-end">
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className={clsx(
                            'inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-bold transition-all active:scale-95',
                            saveSuccess ? 'bg-success text-white' : 'bg-brand text-white hover:bg-brand-hover shadow-lg shadow-brand/20'
                        )}
                    >
                        {saving ? <Loader2 size={16} className="animate-spin" /> : saveSuccess ? <CheckCircle size={16} /> : <Save size={16} />}
                        {saving ? 'Saving...' : saveSuccess ? 'Saved!' : 'Save Changes'}
                    </button>
                </div>
            </Card>

            <Card className="p-4 md:p-6 space-y-4">
                <h3 className="text-sm md:text-base font-bold text-text-main flex items-center gap-2">
                    <LinkIcon size={16} className="text-brand" /> Connected Accounts
                </h3>

                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 md:p-4 rounded-xl bg-surface-dim border border-border-dim">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-white shadow-sm border border-border-dim flex items-center justify-center shrink-0">
                            <svg viewBox="0 0 48 48" className="w-5 h-5"><path fill="#4285F4" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" /><path fill="#34A853" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" /><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" /><path fill="#EA4335" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" /></svg>
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-text-main">Google</p>
                            <p className="text-xs text-text-dim">{isGoogle ? user.email : 'Not connected'}</p>
                        </div>
                    </div>

                    {isGoogle ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-success/10 text-success text-xs font-bold border border-success/20">
                            <CheckCircle size={12} /> Connected
                        </span>
                    ) : (
                        <button
                            onClick={handleLinkGoogle}
                            disabled={linking}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand/10 text-brand text-xs font-bold border border-brand/20 hover:bg-brand hover:text-white transition-all"
                        >
                            {linking ? <Loader2 size={12} className="animate-spin" /> : <LinkIcon size={12} />}
                            {linking ? 'Connecting...' : 'Connect Google'}
                        </button>
                    )}
                </div>
            </Card>

            <Card className="p-4 md:p-6 space-y-4">
                <h3 className="text-sm md:text-base font-bold text-text-main flex items-center gap-2">
                    <Lock size={16} className="text-brand" /> Security
                </h3>

                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 md:p-4 rounded-xl bg-surface-dim border border-border-dim">
                    <div>
                        <p className="text-sm font-semibold text-text-main flex items-center gap-2">
                            <Smartphone size={14} /> Authenticator App (TOTP)
                        </p>
                        <p className="text-xs text-text-dim mt-1">
                            {mfaEnabled
                                ? 'Two-factor authentication is enabled for this account.'
                                : 'Protect your account with Google Authenticator, Microsoft Authenticator, or Authy.'}
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className={clsx(
                            'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border',
                            mfaEnabled
                                ? 'bg-success/10 text-success border-success/20'
                                : 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                        )}>
                            {mfaEnabled ? 'Enabled' : 'Disabled'}
                        </span>

                        {mfaEnabled ? (
                            <button
                                onClick={() => {
                                    setShowDisableConfirm(true);
                                    setPendingSetup(null);
                                    setMfaError(null);
                                }}
                                className="px-4 py-2 rounded-full bg-danger/10 border border-danger/20 text-sm font-bold text-danger hover:bg-danger hover:text-white transition-all"
                            >
                                Disable 2FA
                            </button>
                        ) : (
                            <button
                                onClick={handleStartEnableMfa}
                                disabled={mfaLoading}
                                className="px-4 py-2 rounded-full bg-brand text-white text-sm font-bold hover:bg-brand-hover transition-all disabled:opacity-40"
                            >
                                {mfaLoading ? 'Starting...' : 'Enable Two Factor Authentication'}
                            </button>
                        )}
                    </div>
                </div>

                {pendingSetup && (
                    <TwoFactorSetupCard
                        qrCode={pendingSetup.qrCode}
                        secret={pendingSetup.secret}
                        onVerify={handleVerifyMfaSetup}
                        onCancel={() => {
                            setPendingSetup(null);
                            setMfaError(null);
                        }}
                        isLoading={mfaLoading}
                        error={mfaError}
                    />
                )}

                {showDisableConfirm && mfaEnabled && (
                    <div className="rounded-2xl border border-border-dim bg-surface-dim p-4 space-y-3">
                        <p className="text-sm font-semibold text-text-main">Confirm your current password to disable 2FA</p>
                        <input
                            type="password"
                            value={disablePassword}
                            onChange={(e) => setDisablePassword(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-xl bg-surface border border-border-dim text-text-main text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition-all"
                            placeholder="Current password"
                        />
                        {mfaError && (
                            <div className="p-3 rounded-xl bg-danger/10 border border-danger/20 text-sm text-danger">{mfaError}</div>
                        )}
                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => {
                                    setShowDisableConfirm(false);
                                    setDisablePassword('');
                                    setMfaError(null);
                                }}
                                className="px-4 py-2 rounded-full bg-surface border border-border-dim text-sm font-bold text-text-sub hover:bg-surface-dim transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDisableMfa}
                                disabled={mfaLoading || !disablePassword.trim()}
                                className="px-4 py-2 rounded-full bg-danger text-white text-sm font-bold hover:opacity-90 transition-all disabled:opacity-40"
                            >
                                {mfaLoading ? 'Disabling...' : 'Confirm Disable'}
                            </button>
                        </div>
                    </div>
                )}

                {isEmailOnly && (
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 md:p-4 rounded-xl bg-surface-dim border border-border-dim">
                        <div>
                            <p className="text-sm font-semibold text-text-main">Password</p>
                            <p className="text-xs text-text-dim">Send a password reset link to your email.</p>
                        </div>
                        <button
                            onClick={handleChangePassword}
                            className="px-4 py-2 rounded-full bg-surface border border-border-dim text-sm font-bold text-text-sub hover:bg-surface-dim transition-all"
                        >
                            Change Password
                        </button>
                    </div>
                )}
            </Card>

            <p className="text-xs text-text-dim text-center">
                Account created {new Date(user.created_at).toLocaleDateString('en-US', { dateStyle: 'long' })}
                {user.tenant_id ? ` | Tenant ${user.tenant_id.slice(0, 8)}...` : ''}
            </p>

            {showCropper && rawImageSrc && (
                <AvatarCropperModal
                    imageSrc={rawImageSrc}
                    onClose={() => {
                        setShowCropper(false);
                        setRawImageSrc(null);
                    }}
                    onCropComplete={handleCropComplete}
                />
            )}
        </div>
    );
}
