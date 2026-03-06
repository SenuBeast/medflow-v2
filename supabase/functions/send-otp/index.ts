/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Simple rate limiting: 3 attempts per 10 minutes per email
const RATE_LIMIT_MINUTES = 10;
const MAX_ATTEMPTS_PER_WINDOW = 3;

// ─── Email Template Builders ──────────────────────────────────────────────────
// Templates are inlined here because Supabase Edge Function deployments only
// bundle index.ts — adjacent files are NOT available in the edge runtime.

function buildHtmlEmail(otpCode: string, userEmail: string, appName: string): string {
  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="x-apple-disable-message-reformatting">
  <title>Your ${appName} Verification Code</title>
  <!--[if mso]>
  <noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript>
  <![endif]-->
  <style>
    body { margin:0;padding:0;word-spacing:normal;background-color:#F9FAFB;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; }
    table,td,div,h1,p { font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; }
    @media (prefers-color-scheme:dark) {
      body,.email-wrapper { background-color:#111827 !important; }
      .email-container { background-color:#1F2937 !important;border:1px solid #374151 !important; }
      .header,.footer { border-color:#374151 !important;background-color:#1F2937 !important; }
      .logo { color:#60A5FA !important; }
      .greeting,.otp-code { color:#F9FAFB !important; }
      .message,.warning { color:#D1D5DB !important; }
      .otp-wrapper { background-color:#374151 !important; }
      .otp-label { color:#9CA3AF !important; }
      .security-box { background-color:rgba(16,185,129,0.1) !important;color:#34D399 !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#F9FAFB;">
  <div role="article" aria-roledescription="email" lang="en" style="background-color:#F9FAFB;">
    <div class="email-wrapper" style="padding:40px 20px;text-align:center;background-color:#F9FAFB;">
      <!--[if mso]><table role="presentation" align="center" style="width:480px;"><tr><td><![endif]-->
      <div class="email-container" style="max-width:480px;margin:0 auto;background-color:#ffffff;border-radius:12px;box-shadow:0 4px 6px rgba(0,0,0,0.05),0 1px 3px rgba(0,0,0,0.1);overflow:hidden;text-align:left;">
        <div class="header" style="text-align:center;padding:24px;border-bottom:1px solid #E5E7EB;background-color:#ffffff;">
          <span class="logo" style="font-size:24px;font-weight:bold;color:#2563EB;letter-spacing:-0.5px;">${appName}</span>
        </div>
        <div class="content" style="padding:32px 24px;background-color:#ffffff;">
          <div class="greeting" style="font-size:18px;margin-bottom:16px;color:#111827;font-weight:600;">Hello,</div>
          <div class="message" style="font-size:16px;line-height:24px;color:#4B5563;margin-bottom:32px;">
            Use the following one-time password (OTP) to complete your login. This code is valid for <strong>5 minutes</strong>.
          </div>
          <div class="otp-wrapper" style="background-color:#F3F4F6;border-left:4px solid #2563EB;border-radius:8px;padding:24px;text-align:center;margin-bottom:32px;">
            <span class="otp-label" style="font-size:13px;text-transform:uppercase;letter-spacing:1px;color:#6B7280;margin-bottom:8px;display:block;font-weight:600;">Your verification code</span>
            <div class="otp-code" style="font-size:36px;font-weight:700;letter-spacing:10px;color:#111827;margin:0;cursor:default;">${otpCode}</div>
          </div>
          <div class="security-box" style="font-size:14px;line-height:20px;background-color:#ECFDF5;color:#065F46;padding:16px;border-radius:6px;margin-bottom:24px;">
            <div style="font-weight:600;margin-bottom:4px;">Security Notice</div>
            <div>Do not share this code with anyone. ${appName} staff will never ask you for this password.</div>
          </div>
          <div class="warning" style="font-size:14px;line-height:22px;color:#6B7280;padding-top:16px;border-top:1px dashed #E5E7EB;">
            If you didn't request this code or attempted to log in to ${appName} using ${userEmail}, you can safely ignore this email.
          </div>
        </div>
        <div class="footer" style="padding:24px;text-align:center;background-color:#F9FAFB;border-top:1px solid #E5E7EB;">
          <div style="font-size:12px;line-height:18px;color:#9CA3AF;margin-bottom:8px;">
            ${appName} &copy; 2026<br>This is an automated message. Please do not reply to this email.
          </div>
          <div style="font-size:12px;line-height:18px;color:#9CA3AF;">
            Need help? Contact <a href="mailto:support@medflow.com" style="color:#2563EB;text-decoration:none;">support@medflow.com</a>
          </div>
        </div>
      </div>
      <!--[if mso]></td></tr></table><![endif]-->
    </div>
  </div>
</body>
</html>`;
}

function buildTextEmail(otpCode: string, userEmail: string, appName: string): string {
  return `Hello,

Use the following one-time password (OTP) to complete your login. This code is valid for 5 minutes.

Your verification code: ${otpCode}

Security Notice: Do not share this code with anyone. ${appName} staff will never ask you for this password.

If you didn't request this code or attempted to log in to ${appName} using ${userEmail}, you can safely ignore this email.

---
${appName} © 2026
This is an automated message. Please do not reply to this email.
Need help? Contact support@medflow.com`;
}

// ─── Handler ──────────────────────────────────────────────────────────────────

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { email } = await req.json();
    if (!email) throw new Error('Email is required');

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 1. Look up user — auto-provision if this is a new Google OAuth user
    const { data: users, error: userError } = await supabaseClient
      .from('users')
      .select('id')
      .eq('email', email)
      .limit(1);

    let userId: string;

    if (userError || !users || users.length === 0) {
      // New user via Google OAuth: check Supabase Auth for the uid first
      const { data: authUser } = await supabaseClient.auth.admin.getUserByEmail(email);

      if (!authUser?.user) {
        // Email not in Auth system at all — silent success (anti-enumeration)
        console.log(`Email ${email} not in auth. Failing silently.`);
        return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // Auto-provision: fetch Viewer role and create users row
      const { data: viewerRole } = await supabaseClient
        .from('roles')
        .select('id')
        .eq('name', 'Viewer')
        .single();

      if (!viewerRole) throw new Error('Viewer role not found in roles table');

      const fullName = (authUser.user.user_metadata?.full_name as string) ?? email.split('@')[0];

      const { data: newUser, error: insertUserError } = await supabaseClient
        .from('users')
        .insert({
          id: authUser.user.id,
          email,
          full_name: fullName,
          role_id: viewerRole.id,
          is_active: true,
        })
        .select('id')
        .single();

      if (insertUserError) throw insertUserError;
      userId = newUser.id;
      console.log(`[send-otp] Auto-provisioned new Google user: ${email}`);
    } else {
      userId = users[0].id;
    }


    // 2. Check rate limit
    const { count, error: countError } = await supabaseClient
      .from('otp_codes')
      .select('*', { count: 'exact', head: true })
      .eq('email', email)
      .gte('created_at', new Date(Date.now() - RATE_LIMIT_MINUTES * 60 * 1000).toISOString());

    if (countError) throw countError;
    if (count && count >= MAX_ATTEMPTS_PER_WINDOW) {
      console.log(`Rate limit exceeded for ${email}`);
      return new Response(JSON.stringify({ error: 'Too many requests. Please wait 10 minutes.' }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 3. Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    // 4. Save to DB
    const { error: insertError } = await supabaseClient
      .from('otp_codes')
      .insert({ user_id: userId, email, code, expires_at: expiresAt });

    if (insertError) throw insertError;

    // 5. Send Email via Resend
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) throw new Error('Missing RESEND_API_KEY');

    // DEV BYPASS: skip real email delivery for internal test domains
    if (email.endsWith('@test.com') || email.endsWith('@medflow.com')) {
      console.log(`[DEV BYPASS] Mocking email delivery for ${email}. Code is: ${code}`);
      return new Response(JSON.stringify({ success: true, message: "Mock email delivered" }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const appName = "MedFlow";
    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'MedFlow Auth <onboarding@resend.dev>',
        to: email,
        subject: `Your ${appName} Login Code`,
        html: buildHtmlEmail(code, email, appName),
        text: buildTextEmail(code, email, appName),
      })
    });

    if (!emailRes.ok) {
      const errBody = await emailRes.text();
      throw new Error(`Resend API Error: ${errBody}`);
    }

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error: unknown) {
    console.error('send-otp Error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
