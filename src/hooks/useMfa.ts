import { useCallback, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { getMfaAssuranceState, normalizeTotpCode } from '../lib/mfa';

interface TotpEnrollmentData {
    factorId: string;
    qrCode: string;
    secret: string;
    uri: string;
}

interface PasswordAuthError {
    code?: string;
    message?: string;
}

const verifierUrl = (import.meta.env.VITE_SUPABASE_URL as string) || 'https://placeholder.supabase.co';
const verifierAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || 'placeholder-key';

const verifierClient = createClient(
    verifierUrl,
    verifierAnonKey,
    {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false,
        },
    }
);

async function confirmCurrentPassword(email: string, password: string): Promise<void> {
    if (!password.trim()) {
        throw new Error('Current password is required.');
    }

    const { data, error } = await verifierClient.auth.signInWithPassword({ email, password });
    if (error) {
        const authError = error as PasswordAuthError;
        const code = authError.code ?? '';
        if (code === 'mfa_required' || code === 'insufficient_aal') {
            return;
        }

        throw new Error(code === 'invalid_credentials' ? 'Current password is incorrect.' : (authError.message ?? 'Password confirmation failed.'));
    }

    if (data.session) {
        await verifierClient.auth.signOut({ scope: 'local' });
    }
}

export function useMfa() {
    const [isLoading, setIsLoading] = useState(false);
    const [verifiedTotpFactorIds, setVerifiedTotpFactorIds] = useState<string[]>([]);

    const refreshFactors = useCallback(async () => {
        const { data, error } = await supabase.auth.mfa.listFactors();
        if (error) throw error;

        const factorIds = data.totp.map((factor) => factor.id);
        setVerifiedTotpFactorIds(factorIds);

        return {
            verifiedTotpFactors: data.totp,
            allFactors: data.all,
        };
    }, []);

    const getPrimaryTotpFactorId = useCallback(async (): Promise<string> => {
        const { verifiedTotpFactors } = await refreshFactors();
        const factor = verifiedTotpFactors[0];
        if (!factor) throw new Error('No verified authenticator app is configured.');
        return factor.id;
    }, [refreshFactors]);

    const enrollTotp = useCallback(async (friendlyName = 'MedFlow Authenticator'): Promise<TotpEnrollmentData> => {
        setIsLoading(true);
        try {
            const { data: factorData, error: factorsError } = await supabase.auth.mfa.listFactors();
            if (factorsError) throw factorsError;

            const staleUnverifiedTotpFactors = factorData.all.filter(
                (factor) => factor.factor_type === 'totp' && factor.status === 'unverified'
            );

            for (const factor of staleUnverifiedTotpFactors) {
                const { error: cleanupError } = await supabase.auth.mfa.unenroll({ factorId: factor.id });
                if (cleanupError) throw cleanupError;
            }

            const { data, error } = await supabase.auth.mfa.enroll({
                factorType: 'totp',
                friendlyName,
                issuer: 'MedFlow',
            });
            if (error) throw error;
            if (data.type !== 'totp') throw new Error('Unexpected MFA factor type returned.');

            return {
                factorId: data.id,
                qrCode: data.totp.qr_code,
                secret: data.totp.secret,
                uri: data.totp.uri,
            };
        } finally {
            setIsLoading(false);
        }
    }, []);

    const verifyTotpCodeForFactor = useCallback(async (factorId: string, code: string): Promise<void> => {
        const normalized = normalizeTotpCode(code);
        if (normalized.length !== 6) {
            throw new Error('Enter a valid 6-digit authenticator code.');
        }

        setIsLoading(true);
        try {
            const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
            if (challengeError) throw challengeError;

            const { error: verifyError } = await supabase.auth.mfa.verify({
                factorId,
                challengeId: challenge.id,
                code: normalized,
            });

            if (verifyError) throw verifyError;
            await refreshFactors();
        } finally {
            setIsLoading(false);
        }
    }, [refreshFactors]);

    const verifySignInTotp = useCallback(async (code: string): Promise<void> => {
        const factorId = await getPrimaryTotpFactorId();
        await verifyTotpCodeForFactor(factorId, code);
    }, [getPrimaryTotpFactorId, verifyTotpCodeForFactor]);

    const disableTotp = useCallback(async (password: string): Promise<void> => {
        setIsLoading(true);
        try {
            const { data: userData, error: userError } = await supabase.auth.getUser();
            if (userError) throw userError;
            if (!userData.user?.email) throw new Error('Unable to validate the current user account.');

            await confirmCurrentPassword(userData.user.email, password);

            const factorId = await getPrimaryTotpFactorId();
            const { error } = await supabase.auth.mfa.unenroll({ factorId });
            if (error) throw error;

            await refreshFactors();
        } finally {
            setIsLoading(false);
        }
    }, [getPrimaryTotpFactorId, refreshFactors]);

    const mfaEnabled = verifiedTotpFactorIds.length > 0;

    return {
        isLoading,
        mfaEnabled,
        verifiedTotpFactorIds,
        refreshFactors,
        enrollTotp,
        verifyTotpCodeForFactor,
        verifySignInTotp,
        disableTotp,
        getMfaAssuranceState,
    };
}
