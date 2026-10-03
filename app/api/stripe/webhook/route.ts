import crypto from 'node:crypto';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const TOLERANCE_SECONDS = 300;

function verifyStripeSignature(
  payload: string,
  signatureHeader: string,
  webhookSecret: string,
) {
  const parts = signatureHeader.split(',');

  const timestamp = parts
    .find((part) => part.startsWith('t='))
    ?.slice(2);

  const signatures = parts
    .filter((part) => part.startsWith('v1='))
    .map((part) => part.slice(3));

  if (!timestamp || signatures.length === 0) {
    return false;
  }

  const timestampNumber = Number(timestamp);

  if (!Number.isFinite(timestampNumber)) {
    return false;
  }

  const age = Math.abs(
    Math.floor(Date.now() / 1000) - timestampNumber,
  );

  if (age > TOLERANCE_SECONDS) {
    return false;
  }

  const signedPayload = `${timestamp}.${payload}`;

  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(signedPayload, 'utf8')
    .digest('hex');

  const expectedBuffer = Buffer.from(expectedSignature, 'utf8');

  return signatures.some((signature) => {
    const actualBuffer = Buffer.from(signature, 'utf8');

    if (actualBuffer.length !== expectedBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(
      actualBuffer,
      expectedBuffer,
    );
  });
}

export async function POST(request: Request) {
  try {
    const webhookSecret =
      process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error(
        '[Stripe webhook] STRIPE_WEBHOOK_SECRET is missing',
      );

      return NextResponse.json(
        { error: 'Webhook is not configured.' },
        { status: 500 },
      );
    }

    const signature =
      request.headers.get('stripe-signature');

    if (!signature) {
      return NextResponse.json(
        { error: 'Missing Stripe signature.' },
        { status: 400 },
      );
    }

    // สำคัญ: Stripe ต้องตรวจลายเซ็นจาก RAW body
    const rawBody = await request.text();

    const valid = verifyStripeSignature(
      rawBody,
      signature,
      webhookSecret,
    );

    if (!valid) {
      console.error(
        '[Stripe webhook] Invalid signature',
      );

      return NextResponse.json(
        { error: 'Invalid Stripe signature.' },
        { status: 400 },
      );
    }

    const event = JSON.parse(rawBody);

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data?.object;

        console.log(
          '[Stripe] Checkout completed:',
          session?.id,
        );

        /*
         * ขั้นต่อไปเราจะเชื่อมตรงนี้กับระบบแพ็กเกต Melo Chat:
         *
         * - user_id
         * - plan_id
         * - offer_id
         * - duration_months
         *
         * จาก session.metadata
         *
         * แล้วเปิด Premium / Premium+ ให้อัตโนมัติ
         */
        break;
      }

      case 'checkout.session.async_payment_succeeded': {
        const session = event.data?.object;

        console.log(
          '[Stripe] Async payment succeeded:',
          session?.id,
        );

        break;
      }

      case 'checkout.session.async_payment_failed': {
        const session = event.data?.object;

        console.warn(
          '[Stripe] Async payment failed:',
          session?.id,
        );

        break;
      }

      default:
        console.log(
          '[Stripe] Unhandled event:',
          event.type,
        );
    }

    return NextResponse.json({
      received: true,
    });
  } catch (error) {
    console.error('[Stripe webhook] Error:', error);

    return NextResponse.json(
      { error: 'Webhook processing failed.' },
      { status: 500 },
    );
  }
}