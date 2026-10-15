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
  eligible_plans: string[] | string | null;
  is_active: boolean;
};

type UsagePayload = {
  plan_id?: string;
  plan_code?: string;
  can_buy_translation_addon?: boolean;
};

function jsonError(message: string, status: number, details?: Record<string, unknown>) {
  return NextResponse.json({ error: message, ...(details || {}) }, { status });
}

function stripeErrorDetails(error: unknown, mode?: string) {
  if (error && typeof error === 'object') {
    const value = error as { code?: unknown; type?: unknown; requestId?: unknown; raw?: { requestId?: unknown } };
    return {
      code: 'STRIPE_SESSION_CREATE',
      stripe_code: typeof value.code === 'string' ? value.code : undefined,
      stripe_type: typeof value.type === 'string' ? value.type : undefined,
      request_id: typeof value.requestId === 'string' ? value.requestId : typeof value.raw?.requestId === 'string' ? value.raw.requestId : undefined,
      mode,
    };
  }
  return { code: 'STRIPE_SESSION_CREATE', mode };
}

export async function POST(request: Request) {
  try {
    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '');

    const supabaseKey =
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();

    if (!supabaseUrl || !supabaseKey) {
      return jsonError('Supabase is not configured.', 500, { code: 'SUPABASE_CONFIG_MISSING' });
    }

    // ---------------------------------------------------------
    // Authentication
    // ---------------------------------------------------------

    const authorization =
      request.headers.get('authorization') || '';

    const accessToken =
      authorization.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();

    if (!accessToken) {
      return jsonError('Authentication required.', 401, { code: 'AUTH_REQUIRED' });
    }

    const authHeaders = {
      apikey: supabaseKey,
      Authorization: `Bearer ${accessToken}`,
    };

    const userResponse = await fetch(
      `${supabaseUrl}/auth/v1/user`,
      {
        headers: authHeaders,
        cache: 'no-store',
      },
    );

    if (!userResponse.ok) {
      return jsonError('Authentication required.', 401, { code: 'AUTH_REQUIRED' });
    }

    const user = (await userResponse.json()) as {
      id?: string;
      email?: string;
    };

    if (!user.id) {
      return jsonError('Authentication required.', 401, { code: 'AUTH_REQUIRED' });
    }

    // ---------------------------------------------------------
    // Request body
    // ---------------------------------------------------------

    let body: {
      addon_id?: unknown;
    };

    try {
      body = (await request.json()) as {
        addon_id?: unknown;
      };
    } catch {
      return jsonError('Invalid request body.', 400, { code: 'INVALID_REQUEST_BODY' });
    }

    const addonId =
      typeof body.addon_id === 'string'
        ? body.addon_id.trim()
        : '';

    if (!addonId) {
      return jsonError('addon_id is required.', 400, { code: 'ADDON_ID_REQUIRED' });
    }

    // ---------------------------------------------------------
    // Current package
    // ---------------------------------------------------------

    const usageResponse = await fetch(
      `${supabaseUrl}/rest/v1/rpc/melo_get_my_plan_usage_v25`,
      {
        method: 'POST',
        headers: {
          ...authHeaders,
          'Content-Type': 'application/json',
        },
        body: '{}',
        cache: 'no-store',
      },
    );

    if (!usageResponse.ok) {
      console.error(
        '[Stripe addon checkout] Usage query failed',
        await usageResponse.text(),
      );

      return jsonError(
        'Unable to validate current package.',
        500,
        { code: 'PLAN_USAGE_QUERY_FAILED', upstream_status: usageResponse.status },
      );
    }

    const usage =
      (await usageResponse.json()) as UsagePayload;

    const planCode =
      String(usage?.plan_code || '').trim();

    const planId =
      String(usage?.plan_id || '').trim();

    /*
      Do not require can_buy_translation_addon here.

      melo_get_my_plan_usage_v25 / melo_plan_context_v25
      currently do not return that field.

      Eligibility is validated below against
      translation_addons.eligible_plans from the database.
    */

    if (!planCode || !planId) {
      return jsonError(
        'Translation add-ons are not available for the current package.',
        409,
        { code: 'PLAN_NOT_ELIGIBLE', plan_code: planCode || undefined },
      );
    }

    // ---------------------------------------------------------
    // Load add-on from DB
    // ---------------------------------------------------------

    const addonQuery = new URLSearchParams({
      select:
        'id,code,name,price,translation_characters,eligible_plans,is_active',
      id: `eq.${addonId}`,
      limit: '1',
    });

    const addonResponse = await fetch(
      `${supabaseUrl}/rest/v1/translation_addons?${addonQuery.toString()}`,
      {
        headers: authHeaders,
        cache: 'no-store',
      },
    );

    if (!addonResponse.ok) {
      console.error(
        '[Stripe addon checkout] Add-on query failed',
        await addonResponse.text(),
      );

      return jsonError(
        'Unable to load translation add-on.',
        500,
        { code: 'ADDON_QUERY_FAILED', upstream_status: addonResponse.status },
      );
    }

    const rows =
      (await addonResponse.json()) as AddonRow[];

    const addon = rows[0];

    if (!addon) {
      return jsonError(
        'Translation add-on not found.',
        404,
        { code: 'ADDON_NOT_FOUND' },
      );
    }

    if (!addon.is_active) {
      return jsonError(
        'This translation add-on is not available for purchase.',
        409,
        { code: 'ADDON_UNAVAILABLE' },
      );
    }

    // ---------------------------------------------------------
    // Normalize eligible_plans
    // ---------------------------------------------------------

    const eligiblePlans =
      Array.isArray(addon.eligible_plans)
        ? addon.eligible_plans
            .map((value) =>
              String(value)
                .trim()
                .toLowerCase(),
            )
            .filter(Boolean)
        : String(addon.eligible_plans || '')
            .replace(/[{}[\]"]/g, '')
            .split(',')
            .map((value) =>
              value
                .trim()
                .toLowerCase(),
            )
            .filter(Boolean);

    const normalizedPlanCode =
      planCode
        .trim()
        .toLowerCase();

    if (!eligiblePlans.includes(normalizedPlanCode)) {
      console.error(
        '[Stripe addon checkout] Plan not eligible',
        {
          planCode,
          normalizedPlanCode,
          eligiblePlans,
          rawEligiblePlans:
            addon.eligible_plans,
        },
      );

      return jsonError(
        'This translation add-on is not available for the current package.',
        409,
        { code: 'PLAN_NOT_ELIGIBLE', plan_code: normalizedPlanCode },
      );
    }

    // ---------------------------------------------------------
    // Price
    // ---------------------------------------------------------

    const amount = Number(addon.price);

    if (
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      return jsonError(
        'Translation add-on price is invalid.',
        500,
        { code: 'ADDON_PRICE_INVALID' },
      );
    }

    // ---------------------------------------------------------
    // Stripe environment
    // ---------------------------------------------------------

    const mode =
      (
        process.env.STRIPE_CHECKOUT_MODE ||
        ''
      )
        .trim()
        .toLowerCase();

    if (
      mode !== 'sandbox' &&
      mode !== 'live'
    ) {
      return jsonError(
        'STRIPE_CHECKOUT_MODE must be sandbox or live.',
        500,
        { code: 'STRIPE_MODE_INVALID', mode: mode || undefined },
      );
    }

    const secretKey =
      (
        mode === 'sandbox'
          ? process.env.STRIPE_SECRET_KEY_TEST
          : process.env.STRIPE_SECRET_KEY
      )?.trim();

    if (!secretKey) {
      return jsonError(
        mode === 'sandbox'
          ? 'STRIPE_SECRET_KEY_TEST is not configured.'
          : 'STRIPE_SECRET_KEY is not configured.',
        500,
        { code: 'STRIPE_KEY_MISSING', mode },
      );
    }

    // Prevent accidental environment mismatch
    if (
      mode === 'sandbox' &&
      !secretKey.startsWith('sk_test_')
    ) {
      return jsonError(
        'STRIPE_SECRET_KEY_TEST is not a valid test key.',
        500,
        { code: 'STRIPE_KEY_MISMATCH', mode },
      );
    }

    if (
      mode === 'live' &&
      !secretKey.startsWith('sk_live_')
    ) {
      return jsonError(
        'STRIPE_SECRET_KEY is not a valid live key.',
        500,
        { code: 'STRIPE_KEY_MISMATCH', mode },
      );
    }

    // ---------------------------------------------------------
    // Stripe Checkout
    // ---------------------------------------------------------

    const stripe =
      new Stripe(secretKey);

    const siteUrl =
      (
        process.env.NEXT_PUBLIC_SITE_URL ||
        'https://www.melochat.me'
      ).replace(/\/$/, '');

    let session: Stripe.Checkout.Session;
    try {
      session = await stripe.checkout.sessions.create({
        mode: 'payment',
        success_url: `${siteUrl}/premium?payment=success&item=translation-addon`,
        cancel_url: `${siteUrl}/premium?payment=cancelled&item=translation-addon`,
        customer_email: user.email || undefined,
        client_reference_id: user.id,
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: 'thb',
              unit_amount: Math.round(amount * 100),
              product_data: {
                name: `${addon.name} · +${Number(addon.translation_characters).toLocaleString('en-US')} characters`,
              },
            },
          },
        ],
        metadata: {
          purchase_type: 'translation_addon',
          user_id: user.id,
          plan_id: planId,
          plan_code: normalizedPlanCode,
          addon_id: addon.id,
          addon_code: addon.code,
          translation_characters: String(addon.translation_characters),
          stripe_environment: mode,
        },
      });
    } catch (error) {
      console.error('[Stripe addon checkout] Stripe session create failed', error);
      return jsonError('Unable to create Stripe Checkout session.', 502, stripeErrorDetails(error, mode));
    }

    if (!session.url) {
      return jsonError(
        'Stripe Checkout URL was not returned.',
        502,
        { code: 'STRIPE_URL_MISSING', mode },
      );
    }

    return NextResponse.json({
      url: session.url,
    });
  } catch (error) {
    console.error(
      '[Stripe addon checkout] Unexpected error',
      error,
    );

    return jsonError(
      'Unable to create Stripe Checkout session.',
      500,
      { code: 'CHECKOUT_ERROR' },
    );
  }
}