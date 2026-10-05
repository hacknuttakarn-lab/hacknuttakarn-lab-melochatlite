import Stripe from 'stripe';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type AddonRow = {
  id: string;
  code: string;
  name: string;
  price: number | string;
  translation_characters: number;
  eligible_plans: string[] | null;
  is_active: boolean;
};

type UsagePayload = {
  plan_id?: string;
  plan_code?: string;
  can_buy_translation_addon?: boolean;
};

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '');
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
    if (!supabaseUrl || !supabaseKey) return jsonError('Supabase is not configured.', 500);

    const authorization = request.headers.get('authorization') || '';
    const accessToken = authorization.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
    if (!accessToken) return jsonError('Authentication required.', 401);

    const authHeaders = { apikey: supabaseKey, Authorization: `Bearer ${accessToken}` };
    const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, { headers: authHeaders, cache: 'no-store' });
    if (!userResponse.ok) return jsonError('Authentication required.', 401);
    const user = (await userResponse.json()) as { id?: string; email?: string };
    if (!user.id) return jsonError('Authentication required.', 401);

    let body: { addon_id?: unknown };
    try { body = await request.json() as { addon_id?: unknown }; }
    catch { return jsonError('Invalid request body.', 400); }
    const addonId = typeof body.addon_id === 'string' ? body.addon_id.trim() : '';
    if (!addonId) return jsonError('addon_id is required.', 400);

    const usageResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/melo_get_my_plan_usage_v25`, {
      method: 'POST',
      headers: { ...authHeaders, 'Content-Type': 'application/json' },
      body: '{}',
      cache: 'no-store',
    });
    if (!usageResponse.ok) {
      console.error('[Stripe addon checkout] Usage query failed', await usageResponse.text());
      return jsonError('Unable to validate current package.', 500);
    }
    const usage = await usageResponse.json() as UsagePayload;
    const planCode = String(usage?.plan_code || '').trim();
    const planId = String(usage?.plan_id || '').trim();
    if (!usage?.can_buy_translation_addon || !planCode || !planId) {
      return jsonError('Translation add-ons are not available for the current package.', 409);
    }

    const addonQuery = new URLSearchParams({
      select: 'id,code,name,price,translation_characters,eligible_plans,is_active',
      id: `eq.${addonId}`,
      limit: '1',
    });
    const addonResponse = await fetch(`${supabaseUrl}/rest/v1/translation_addons?${addonQuery.toString()}`, {
      headers: authHeaders,
      cache: 'no-store',
    });
    if (!addonResponse.ok) {
      console.error('[Stripe addon checkout] Add-on query failed', await addonResponse.text());
      return jsonError('Unable to load translation add-on.', 500);
    }
    const rows = await addonResponse.json() as AddonRow[];
    const addon = rows[0];
    if (!addon) return jsonError('Translation add-on not found.', 404);
    if (!addon.is_active) return jsonError('This translation add-on is not available for purchase.', 409);
    if (!Array.isArray(addon.eligible_plans) || !addon.eligible_plans.includes(planCode)) {
      return jsonError('This translation add-on is not available for the current package.', 409);
    }

    const amount = Number(addon.price);
    if (!Number.isFinite(amount) || amount <= 0) return jsonError('Translation add-on price is invalid.', 500);

    const mode = (process.env.STRIPE_CHECKOUT_MODE || '').trim().toLowerCase();
    if (mode !== 'sandbox' && mode !== 'live') return jsonError('STRIPE_CHECKOUT_MODE must be sandbox or live.', 500);
    const secretKey = (mode === 'sandbox' ? process.env.STRIPE_SECRET_KEY_TEST : process.env.STRIPE_SECRET_KEY)?.trim();
    if (!secretKey) return jsonError(mode === 'sandbox' ? 'STRIPE_SECRET_KEY_TEST is not configured.' : 'STRIPE_SECRET_KEY is not configured.', 500);

    const stripe = new Stripe(secretKey);
    const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.melochat.me').replace(/\/$/, '');
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      success_url: `${siteUrl}/premium?payment=success&item=translation-addon`,
      cancel_url: `${siteUrl}/premium?payment=cancelled&item=translation-addon`,
      customer_email: user.email || undefined,
      client_reference_id: user.id,
      line_items: [{
        quantity: 1,
        price_data: {
          currency: 'thb',
          unit_amount: Math.round(amount * 100),
          product_data: { name: `${addon.name} · +${Number(addon.translation_characters).toLocaleString('en-US')} characters` },
        },
      }],
      metadata: {
        purchase_type: 'translation_addon',
        user_id: user.id,
        plan_id: planId,
        plan_code: planCode,
        addon_id: addon.id,
        addon_code: addon.code,
        translation_characters: String(addon.translation_characters),
      },
    });

    if (!session.url) return jsonError('Stripe Checkout URL was not returned.', 502);
    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('[Stripe addon checkout] Unexpected error', error);
    return jsonError('Unable to create Stripe Checkout session.', 500);
  }
}
