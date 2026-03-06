const email = process.argv[2] || 'admin@medflow.com';

async function testOtp() {
    console.log(`Starting OTP flow test for ${email}...`);

    // Ensure we have secrets
    const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || ''; // We normally use service role for backend logic, but simulating the insert here.

    // In a real edge function we'd use SUPABASE_SERVICE_ROLE_KEY to bypass RLS,
    // so let's simulate that here with the DB logic if needed, but since we are just testing
    // the Resend email integration, let's just trigger the fetch directly.

    const resendApiKey = 're_Md1etcyC_8pWwSKD4BsY2XLgpLMFeNaYY';
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    console.log(`Generated code: ${code}`);
    console.log(`Sending email via Resend...`);

    const emailRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            from: 'MedFlow Auth <onboarding@resend.dev>',
            to: email,
            subject: 'Your MedFlow Login Code',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 12px;">
                    <div style="text-align: center; margin-bottom: 24px;">
                        <h2 style="color: #111827; margin-top: 16px;">MedFlow Admin</h2>
                    </div>
                    <p style="color: #4b5563; line-height: 1.5;">Here is your secure login code.</p>
                    <div style="background-color: #f3f4f6; padding: 16px; border-radius: 8px; text-align: center; margin: 24px 0;">
                        <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #1f2937;">${code}</span>
                    </div>
                </div>
            `
        })
    });

    if (!emailRes.ok) {
        const text = await emailRes.text();
        console.error('RESEND ERROR:', text);
    } else {
        const data = await emailRes.json();
        console.log('SUCCESS! Resend response:', data);
    }
}

testOtp().catch(console.error);
