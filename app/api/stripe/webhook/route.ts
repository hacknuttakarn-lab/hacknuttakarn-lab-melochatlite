import crypto from 'node:crypto';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SIGNATURE_TOLERANCE_SECONDS = 300;

type StripeCheckoutSession = {
  id?: string;
  livemode?: boolean;
  payment_status?: string;
  amount_total?: number | null;
  currency?: string | null;
  customer_details?: { email?: string | null } | null;
  metadata?: Record<string, string | undefined> | null;
};

function verifyStripeSignature(payload: string, signatureHeader: string, secret: string): boolean {
  try {
    const parts = signatureHeader.split(',');
    const timestamp = parts.find((part) => part.startsWith('t='))?.substring(2);
    const signatures = parts.filter((part) => part.startsWith('v1=')).map((part) => part.substring(3));
    if (!timestamp || signatures.length === 0) return false;

    const timestampNumber = Number(timestamp);
    if (!Number.isFinite(timestampNumber)) return false;
    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - timestampNumber) > SIGNATURE_TOLERANCE_SECONDS) return false;

    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(`${timestamp}.${payload}`, 'utf8')
      .digest('hex');

    return signatures.some((signature) => {
      try {
        const expectedBuffer = Buffer.from(expectedSignature, 'hex');
        const receivedBuffer = Buffer.from(signature, 'hex');
        return expectedBuffer.length === receivedBuffer.length && crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
      } catch {
        return false;
      }
    });
  } catch {
    return false;
  }
}

async function fulfillPaidCheckout(
  eventId: string,
  environment: 'live' | 'sandbox',
  session: StripeCheckoutSession,
) {
  if (!session.id) throw new Error('Stripe session id is missing.');

  const metadata = session.metadata || {};
  const userId = metadata.user_id?.trim();
  const planId = metadata.plan_id?.trim();
  const offerId = metadata.offer_id?.trim();
  const durationMonths = Number(metadata.duration_months);

  if (!userId || !planId || !offerId || !Number.isInteger(durationMonths) || durationMonths <= 0) {
    throw new Error('Stripe Checkout metadata is incomplete.');
  }

  if (typeof session.livemode === 'boolean') {
    const expectedLive = environment === 'live';
    if (session.livemode !== expectedLive) throw new Error('Stripe environment does not match webhook secret.');
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '');
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!supabaseUrl || !serviceRoleKey) throw new Error('Supabase service role is not configured for Stripe fulfillment.');

  const amount = Number(session.amount_total || 0) / 100;
  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/melo_fulfill_stripe_checkout_v39`, {
    method: 'POST',
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      p_event_id: eventId,
      p_session_id: session.id,
      p_environment: environment,
      p_user_id: userId,
      p_plan_id: planId,
      p_offer_id: offerId,
      p_duration_months: durationMonths,
      p_amount: amount,
      p_currency: (session.currency || 'thb').toUpperCase(),
    }),
    cache: 'no-store',
  });

  const responseText = await response.text();
  if (!response.ok) {
    console.error('[Stripe webhook] Package fulfillment RPC failed', {
      status: response.status,
      body: responseText,
      sessionId: session.id,
    });
    throw new Error('Unable to activate paid package.');
  }

  let result: unknown = null;
  try { result = responseText ? JSON.parse(responseText) : null; } catch { result = responseText; }
  console.log('[Stripe webhook] Package fulfillment complete', { sessionId: session.id, result });
}



async function fulfillPaidTranslationAddon(
  eventId: string,
  environment: 'live' | 'sandbox',
  session: StripeCheckoutSession,
) {
  if (!session.id) throw new Error('Stripe session id is missing.');

  const metadata = session.metadata || {};
  const userId = metadata.user_id?.trim();
  const addonId = metadata.addon_id?.trim();
  if (!userId || !addonId) throw new Error('Stripe translation add-on metadata is incomplete.');

  if (typeof session.livemode === 'boolean') {
    const expectedLive = environment === 'live';
    if (session.livemode !== expectedLive) throw new Error('Stripe environment does not match webhook secret.');
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '');
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!supabaseUrl || !serviceRoleKey) throw new Error('Supabase service role is not configured for Stripe fulfillment.');

  const amount = Number(session.amount_total || 0) / 100;
  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/melo_fulfill_stripe_translation_addon_v40`, {
    method: 'POST',
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      p_event_id: eventId,
      p_session_id: session.id,
      p_environment: environment,
      p_user_id: userId,
      p_addon_id: addonId,
      p_amount: amount,
      p_currency: (session.currency || 'thb').toUpperCase(),
    }),
    cache: 'no-store',
  });

  const responseText = await response.text();
  if (!response.ok) {
    console.error('[Stripe webhook] Translation add-on fulfillment RPC failed', {
      status: response.status,
      body: responseText,
      sessionId: session.id,
    });
    throw new Error('Unable to activate translation add-on.');
  }

  let result: unknown = null;
  try { result = responseText ? JSON.parse(responseText) : null; } catch { result = responseText; }
  console.log('[Stripe webhook] Translation add-on fulfillment complete', { sessionId: session.id, result });
}

async function fulfillPaidSession(
  eventId: string,
  environment: 'live' | 'sandbox',
  session: StripeCheckoutSession,
) {
  const purchaseType = session.metadata?.purchase_type?.trim();
  if (purchaseType === 'translation_addon') {
    await fulfillPaidTranslationAddon(eventId, environment, session);
    return;
  }
  await fulfillPaidCheckout(eventId, environment, session);
}

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const stripeSignature = request.headers.get('stripe-signature');
    if (!stripeSignature) return NextResponse.json({ error: 'Missing Stripe signature.' }, { status: 400 });

    const liveSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
    const sandboxSecret = process.env.STRIPE_WEBHOOK_SECRET_TEST?.trim();
    if (!liveSecret && !sandboxSecret) {
      console.error('[Stripe webhook] No webhook secret configured.');
      return NextResponse.json({ error: 'Stripe webhook is not configured.' }, { status: 500 });
    }

    const isLive = !!liveSecret && verifyStripeSignature(rawBody, stripeSignature, liveSecret);
    const isSandbox = !isLive && !!sandboxSecret && verifyStripeSignature(rawBody, stripeSignature, sandboxSecret);
    if (!isLive && !isSandbox) {
      console.error('[Stripe webhook] Invalid Stripe signature.');
      return NextResponse.json({ error: 'Invalid Stripe signature.' }, { status: 400 });
    }

    const environment: 'live' | 'sandbox' = isLive ? 'live' : 'sandbox';
    let event: any;
    try { event = JSON.parse(rawBody); }
    catch { return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400 }); }

    console.log('[Stripe webhook] Event received', {
      environment,
      eventId: event?.id,
      eventType: event?.type,
    });

    switch (event?.type) {
      case 'checkout.session.completed': {
        const session = event.data?.object as StripeCheckoutSession;
        console.log('[Stripe webhook] Checkout completed', {
          environment,
          sessionId: session?.id,
          paymentStatus: session?.payment_status,
          customerEmail: session?.customer_details?.email,
        });

        // Card / immediately-confirmed methods arrive here as paid.
        // Async methods are fulfilled later by checkout.session.async_payment_succeeded.
        if (session?.payment_status === 'paid') {
          await fulfillPaidSession(String(event.id || ''), environment, session);
        }
        break;
      }

      case 'checkout.session.async_payment_succeeded': {
        const session = event.data?.object as StripeCheckoutSession;
        console.log('[Stripe webhook] Async payment succeeded', { environment, sessionId: session?.id });
        await fulfillPaidSession(String(event.id || ''), environment, session);
        break;
      }

      case 'checkout.session.async_payment_failed': {
        const session = event.data?.object as StripeCheckoutSession;
        console.warn('[Stripe webhook] Async payment failed', { environment, sessionId: session?.id });
        break;
      }

      default:
        console.log('[Stripe webhook] Event ignored:', event?.type);
    }

    return NextResponse.json({ received: true, environment, event: event?.type ?? null }, { status: 200 });
  } catch (error) {
    console.error('[Stripe webhook] Unexpected error:', error);
    return NextResponse.json({ error: 'Webhook processing failed.' }, { status: 500 });
  }
}
