import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface DeleteUserRequest {
    action: 'delete-user';
    userId: string;
    reason?: string | null;
}

interface DeleteGuardrail {
    allowed: boolean;
    error_code: string | null;
    message: string | null;
    confirmation_value: string;
}

function jsonResponse(body: Record<string, unknown>, status = 200) {
    return new Response(JSON.stringify(body), {
        status,
        headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
        },
    });
}

Deno.serve(async (request: Request) => {
    if (request.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    if (request.method !== 'POST') {
        return jsonResponse({ success: false, error: 'Method not allowed.' }, 405);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SERVICE_ROLE_KEY');
    const authHeader = request.headers.get('Authorization');

    console.log('[Lifecycle] Env check - URL:', !!supabaseUrl, 'ServiceKey:', !!serviceRoleKey);
    console.log('[Lifecycle] Auth check - Header:', !!authHeader);

    if (!supabaseUrl || !serviceRoleKey) {
        console.error('CRITICAL: Missing Supabase URL or Service Role Key in environment.');
        return jsonResponse({ 
            success: false, 
            error: 'Server configuration error: Missing API keys. Please set SERVICE_ROLE_KEY secret.' 
        }, 500);
    }

    if (!authHeader?.startsWith('Bearer ')) {
        return jsonResponse({ success: false, error: 'Missing authorization token.' }, 401);
    }

    const accessToken = authHeader.replace('Bearer ', '');
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
        },
    });

    const {
        data: { user: actor },
        error: actorError,
    } = await adminClient.auth.getUser(accessToken);

    if (actorError || !actor) {
        console.error('[Lifecycle] Auth check failed:', actorError);
        return jsonResponse({ 
            success: false, 
            error: actorError?.message || 'Unauthorized request: Could not verify user session.' 
        }, 401);
    }

    let payload: DeleteUserRequest;
    try {
        payload = await request.json() as DeleteUserRequest;
    } catch {
        return jsonResponse({ success: false, error: 'Invalid request body.' }, 400);
    }

    if (payload.action !== 'delete-user' || !payload.userId) {
        return jsonResponse({ success: false, error: 'Invalid delete request.' }, 400);
    }

    const { data: guardrail, error: guardrailError } = await adminClient
        .rpc('get_user_delete_guardrails', {
            p_actor_admin_id: actor.id,
            p_target_user_id: payload.userId,
        })
        .single<DeleteGuardrail>();

    if (guardrailError) {
        return jsonResponse({ success: false, error: guardrailError.message || 'Failed to validate delete request.' }, 500);
    }

    if (!guardrail.allowed) {
        return jsonResponse(
            {
                success: false,
                error: guardrail.message || 'This account cannot be deleted.',
                code: guardrail.error_code,
            },
            409
        );
    }

    const { error: authDeleteError } = await adminClient.auth.admin.deleteUser(payload.userId, true);
    if (authDeleteError) {
        return jsonResponse({ success: false, error: authDeleteError.message || 'Failed to remove auth user.' }, 500);
    }

    const { data: finalization, error: finalizationError } = await adminClient.rpc('admin_finalize_user_delete', {
        p_actor_admin_id: actor.id,
        p_target_user_id: payload.userId,
        p_reason: payload.reason ?? null,
    });

    if (finalizationError) {
        return jsonResponse({ success: false, error: finalizationError.message || 'Failed to finalize user deletion.' }, 500);
    }

    return jsonResponse({
        success: true,
        ...(finalization as Record<string, unknown>),
    });
});
