import { supabase } from './supabase';

export type AssuranceLevel = 'aal1' | 'aal2' | null;

export interface MfaAssuranceState {
    currentLevel: AssuranceLevel;
    nextLevel: AssuranceLevel;
    requiresChallenge: boolean;
}

export function normalizeTotpCode(value: string): string {
    return value.replace(/\D/g, '').slice(0, 6);
}

export function requiresMfaChallenge(currentLevel: AssuranceLevel, nextLevel: AssuranceLevel): boolean {
    return nextLevel === 'aal2' && currentLevel !== 'aal2';
}

export async function getMfaAssuranceState(): Promise<MfaAssuranceState> {
    const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (error) throw error;

    const currentLevel = (data.currentLevel ?? null) as AssuranceLevel;
    const nextLevel = (data.nextLevel ?? null) as AssuranceLevel;

    return {
        currentLevel,
        nextLevel,
        requiresChallenge: requiresMfaChallenge(currentLevel, nextLevel),
    };
}
