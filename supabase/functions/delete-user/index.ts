// @ts-nocheck
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const serviceRoleKey =
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ??
      Deno.env.get('SERVICE_ROLE_KEY');
    const authorization =
      request.headers.get('Authorization') ??
      request.headers.get('authorization');

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      return json({ error: 'Supabase Edge Function environment is not configured.' }, 500);
    }
    if (!authorization) {
      return json({ error: 'Missing authorization header.' }, 401);
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const authRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
      method: 'GET',
      headers: {
        Authorization: authorization,
        apikey: anonKey,
      },
    });

    if (!authRes.ok) {
      const message = await authRes.text().catch(() => '');
      return json(
        { error: `Failed to identify the current user. auth status=${authRes.status} ${message}` },
        401
      );
    }

    const userData = await authRes.json().catch(() => null) as { id?: string } | null;
    const userId = userData?.id;
    if (!userId) {
      return json({ error: 'Failed to identify the current user. missing user id.' }, 401);
    }

    const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
    if (deleteError) {
      return json({ error: deleteError.message }, 500);
    }

    return json({ success: true });
  } catch (error) {
    return json(
      { error: error instanceof Error ? error.message : 'Unexpected delete-user failure.' },
      500
    );
  }
});
