import Stripe from 'stripe';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type OfferRow = {
  id: string;
  plan_id: string;
  duration_months: number;
  regular_price: number | string;
  promotion_enabled: boolean;
  promotion_price: number | string | null;
  promotion_start: string | null;
  promotion_end: string | null;
  is_active: boolean;
  subscription_plans: {
    id: string;
    code: string;
    name: string;
    is_active: boolean;
    show_on_user_packages: boolean;
    archived_at: string | null;
  } | null;
};

type CheckoutErrorDetails = {
  stripe_type?: string;
  stripe_code?: string;
  request_id?: string;
  stripe_mode?: 'sandbox' | 'live';
  upstream_status?: number;
};

function jsonError(message: string, status: number, code = 'CHECKOUT_ERROR', details?: CheckoutErrorDetails) {
  return NextResponse.json({ error: message, code, ...(details ? { details } : {}) }, { status });
}

function activePromotion(offer: OfferRow, now: number) {
  if (!offer.promotion_enabled || offer.promotion_price == null) return false;
  const start = offer.promotion_start ? Date.parse(offer.promotion_start) : null;
  const end = offer.promotion_end ? Date.parse(offer.promotion_end) : null;
  return (start == null || now >= start) && (end == null || now < end);
}

export async function POST(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '');
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
    if (!supabaseUrl || !supabaseKey) return jsonError('Supabase is not configured.', 500, 'SUPABASE_CONFIG_MISSING');

    const authorization = request.headers.get('authorization') || '';
    const accessToken = authorization.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
    if (!accessToken) return jsonError('Authentication required.', 401, 'AUTH_REQUIRED');

    const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { apikey: supabaseKey, Authorization: `Bearer ${accessToken}` },
      cache: 'no-store',
    });
    if (!userResponse.ok) {
      console.error('[Stripe checkout] Auth verification failed', { status: userResponse.status });
      return jsonError('Authentication could not be verified.', 401, 'AUTH_VERIFY_FAILED', { upstream_status: userResponse.status });
    }
    const user = (await userResponse.json()) as { id?: string; email?: string };
    if (!user.id) return jsonError('Authentication required.', 401, 'AUTH_USER_MISSING');

    let body: { offer_id?: unknown };
    try { body = await request.json() as { offer_id?: unknown }; }
    catch { return jsonError('Invalid request body.', 400, 'INVALID_REQUEST_BODY'); }
    const offerId = typeof body.offer_id === 'string' ? body.offer_id.trim() : '';
    if (!offerId) return jsonError('offer_id is required.', 400, 'OFFER_ID_REQUIRED');

    const offerQuery = new URLSearchParams({
      select: 'id,plan_id,duration_months,regular_price,promotion_enabled,promotion_price,promotion_start,promotion_end,is_active,subscription_plans!inner(id,code,name,is_active,show_on_user_packages,archived_at)',
      id: `eq.${offerId}`,
      limit: '1',
    });
    const offerResponse = await fetch(`${supabaseUrl}/rest/v1/subscription_plan_offers?${offerQuery.toString()}`, {
      headers: { apikey: supabaseKey, Authorization: `Bearer ${accessToken}` },
      cache: 'no-store',
    });
    if (!offerResponse.ok) {
      console.error('[Stripe checkout] Offer query failed', await offerResponse.text());
      return jsonError('Unable to load package offer.', 500, 'OFFER_QUERY_FAILED', { upstream_status: offerResponse.status });
    }
    const rows = await offerResponse.json() as OfferRow[];
    const offer = rows[0];
    const plan = offer?.subscription_plans;
    if (!offer || !plan) return jsonError('Package offer not found.', 404, 'OFFER_NOT_FOUND');
    if (!offer.is_active || !plan.is_active || !plan.show_on_user_packages || plan.archived_at) {
      return jsonError('This package offer is not available for purchase.', 409, 'OFFER_UNAVAILABLE');
    }
    if (plan.code === 'free' || Number(offer.duration_months) <= 0) {
      return jsonError('This package does not require Stripe Checkout.', 400, 'OFFER_NOT_PAYABLE');
    }

    const amount = activePromotion(offer, Date.now()) ? Number(offer.promotion_price) : Number(offer.regular_price);
    if (!Number.isFinite(amount) || amount <= 0) return jsonError('Package price is invalid.', 500, 'OFFER_PRICE_INVALID');
    const unitAmount = Math.round(amount * 100);

    const mode = (process.env.STRIPE_CHECKOUT_MODE || '').trim().toLowerCase();
    if (mode !== 'sandbox' && mode !== 'live') return jsonError('STRIPE_CHECKOUT_MODE must be sandbox or live.', 500, 'STRIPE_MODE_INVALID');
    const secretKey = (mode === 'sandbox' ? process.env.STRIPE_SECRET_KEY_TEST : process.env.STRIPE_SECRET_KEY)?.trim();
    if (!secretKey) return jsonError(mode === 'sandbox' ? 'STRIPE_SECRET_KEY_TEST is not configured.' : 'STRIPE_SECRET_KEY is not configured.', 500, 'STRIPE_KEY_MISSING');
    if (mode === 'sandbox' && !secretKey.startsWith('sk_test_')) return jsonError('STRIPE_SECRET_KEY_TEST is not a valid test key.', 500, 'STRIPE_KEY_MISMATCH');
    if (mode === 'live' && !secretKey.startsWith('sk_live_')) return jsonError('STRIPE_SECRET_KEY is not a valid live key.', 500, 'STRIPE_KEY_MISMATCH');

    console.log('[Stripe checkout] Creating session', { mode, userId: user.id, planCode: plan.code, offerId: offer.id, amount, currency: 'thb', keyPrefix: secretKey.slice(0, 8) });
    const stripe = new Stripe(secretKey);
    const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.melochat.me').replace(/\/$/, '');
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      success_url: `${siteUrl}/premium?payment=success`,
      cancel_url: `${siteUrl}/premium?payment=cancelled`,
      customer_email: user.email || undefined,
      client_reference_id: user.id,
      line_items: [{
        quantity: 1,
        price_data: {
          currency: 'thb',
          unit_amount: unitAmount,
          product_data: { name: `${plan.name} · ${offer.duration_months} month${offer.duration_months === 1 ? '' : 's'}` },
        },
      }],
      metadata: {
        purchase_type: 'plan',
        stripe_environment: mode,
        user_id: user.id,
        plan_id: plan.id,
        plan_code: plan.code,
        offer_id: offer.id,
        duration_months: String(offer.duration_months),
      },
    });
    if (!session.url) return jsonError('Stripe Checkout URL was not returned.', 502, 'STRIPE_URL_MISSING', { stripe_mode: mode });
    return NextResponse.json({ url: session.url });
  } catch (error) {
    const stripeError = error as { type?: string; code?: string; message?: string; requestId?: string };
    const mode = (process.env.STRIPE_CHECKOUT_MODE || '').trim().toLowerCase();
    const safeMode = mode === 'sandbox' || mode === 'live' ? mode : undefined;
    console.error('[Stripe checkout] Unexpected error', {
      mode: safeMode,
      type: stripeError?.type,
      code: stripeError?.code,
      message: stripeError?.message,
      requestId: stripeError?.requestId,
    });
    return jsonError('Unable to create Stripe Checkout session.', 500, 'STRIPE_SESSION_CREATE', {
      stripe_type: stripeError?.type,
      stripe_code: stripeError?.code,
      request_id: stripeError?.requestId,
      stripe_mode: safeMode,
    });
  }
}
