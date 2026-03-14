import { createClient } from '@supabase/supabase-js';
import { isEmbedded } from './environment';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn(
        '[MedFlow] Supabase environment variables are not set. ' +
        'Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file.'
    );
}

const embedded = isEmbedded();

export const supabase = createClient(
    supabaseUrl || 'https://placeholder.supabase.co',
    supabaseAnonKey || 'placeholder-key',
    {
        auth: {
            persistSession: !embedded,
            autoRefreshToken: !embedded,
            detectSessionInUrl: !embedded,
        },
    }
);
