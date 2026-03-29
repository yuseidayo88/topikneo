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

function productIdToPlan(
  productId: string | null,
  ids: { monthly: string; yearly: string; lifetime: string }
): 'monthly' | 'yearly' | 'lifetime' | null {
  if (!productId) return null;
  if (productId === ids.monthly) return 'monthly';
  if (productId === ids.yearly) return 'yearly';
  if (productId === ids.lifetime) return 'lifetime';
  return null;
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
    const revenueCatSecretApiKey = Deno.env.get('REVENUECAT_SECRET_API_KEY');
    const entitlementId = Deno.env.get('REVENUECAT_ENTITLEMENT_ID') ?? 'TOPIK NEO Pro';
    const productIds = {
      monthly: Deno.env.get('REVENUECAT_PRODUCT_ID_MONTHLY') ?? 'monthly',
      yearly: Deno.env.get('REVENUECAT_PRODUCT_ID_YEARLY') ?? 'yearly',
      lifetime: Deno.env.get('REVENUECAT_PRODUCT_ID_LIFETIME') ?? 'lifetime',
    };
    const authorization =
      request.headers.get('Authorization') ??
      request.headers.get('authorization');

    if (!supabaseUrl || !anonKey || !serviceRoleKey || !revenueCatSecretApiKey) {
      return json({ error: 'Edge Function environment is not configured.' }, 500);
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

    const userData = (await authRes.json().catch(() => null)) as { id?: string } | null;
    const userId = userData?.id ?? null;
    if (!userId) {
      return json({ error: 'Failed to identify the current user. missing user id.' }, 401);
    }

    const rcRes = await fetch(
      `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(userId)}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${revenueCatSecretApiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!rcRes.ok) {
      const message = await rcRes.text().catch(() => '');
      return json(
        { error: `RevenueCat lookup failed. status=${rcRes.status} ${message}` },
        502
      );
    }

    const rcData = (await rcRes.json().catch(() => null)) as {
      subscriber?: {
        entitlements?: Record<
          string,
          { expires_date?: string | null; product_identifier?: string | null }
        >;
      };
    } | null;

    const entitlement = rcData?.subscriber?.entitlements?.[entitlementId] ?? null;
    const plan = productIdToPlan(entitlement?.product_identifier ?? null, productIds);
    const expiresAt =
      typeof entitlement?.expires_date === 'string' ? entitlement.expires_date : null;
    const isLifetime = plan === 'lifetime';
    const isActive =
      Boolean(plan) &&
      (isLifetime || (expiresAt !== null && new Date(expiresAt).getTime() > Date.now()));

    if (!isActive || !plan) {
      const { error: deleteError } = await admin
        .from('user_subscriptions')
        .delete()
        .eq('user_id', userId);
      if (deleteError) {
        return json({ error: deleteError.message }, 500);
      }
      return json({ success: true, active: false });
    }

    const { error: upsertError } = await admin.from('user_subscriptions').upsert(
      {
        user_id: userId,
        plan,
        expires_at: isLifetime ? null : expiresAt,
        lifetime: isLifetime,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );

    if (upsertError) {
      return json({ error: upsertError.message }, 500);
    }

    return json({
      success: true,
      active: true,
      plan,
      expires_at: isLifetime ? null : expiresAt,
      lifetime: isLifetime,
    });
  } catch (error) {
    return json(
      { error: error instanceof Error ? error.message : 'Unexpected sync-subscription failure.' },
      500
    );
  }
});
