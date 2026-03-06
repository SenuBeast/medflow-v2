/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
// E:\Projects\MedFlow-v2\supabase\functions\verify-otp\index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MAX_ATTEMPTS = 5;

serve(async (req: Request) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { email, code } = await req.json();
        if (!email || !code) throw new Error('Email and code are required');

        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        // 1. Find the latest unused OTP code for this email
        const { data: records, error: fetchError } = await supabaseClient
            .from('otp_codes')
            .select('*')
            .eq('email', email)
            .eq('used', false)
            .order('created_at', { ascending: false })
            .limit(1);

        if (fetchError) throw fetchError;

        if (!records || records.length === 0) {
            return new Response(JSON.stringify({ valid: false, error: 'invalid' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        const record = records[0];

        // 2. Check if locked out
        if (record.attempts >= MAX_ATTEMPTS) {
            return new Response(JSON.stringify({ valid: false, error: 'locked' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        // 3. Check if expired
        const now = new Date();
        const expiresAt = new Date(record.expires_at);
        if (now > expiresAt) {
            return new Response(JSON.stringify({ valid: false, error: 'expired' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        // 4. Validate code
        if (record.code !== code) {
            // Increment attempts
            await supabaseClient
                .from('otp_codes')
                .update({ attempts: record.attempts + 1 })
                .eq('id', record.id);

            return new Response(JSON.stringify({ valid: false, error: 'invalid' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        // 5. Success! Mark as used
        await supabaseClient
            .from('otp_codes')
            .update({ used: true })
            .eq('id', record.id);

        return new Response(JSON.stringify({ valid: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    } catch (error) {
        console.error('verify-otp Error:', error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});
