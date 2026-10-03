import crypto from 'node:crypto';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SIGNATURE_TOLERANCE_SECONDS = 300;

function verifyStripeSignature(
  payload: string,
  signatureHeader: string,
  secret: string,
): boolean {
  try {
    const parts = signatureHeader.split(',');

    const timestamp = parts
      .find((part) => part.startsWith('t='))
      ?.substring(2);

    const signatures = parts
      .filter((part) => part.startsWith('v1='))
      .map((part) => part.substring(3));

    if (!timestamp || signatures.length === 0) {
      return false;
    }

    const timestampNumber = Number(timestamp);

    if (!Number.isFinite(timestampNumber)) {
      return false;
    }

    const now = Math.floor(Date.now() / 1000);

    if (
      Math.abs(now - timestampNumber) >
      SIGNATURE_TOLERANCE_SECONDS
    ) {
      return false;
    }

    const signedPayload = `${timestamp}.${payload}`;

    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(signedPayload, 'utf8')
      .digest('hex');

    return signatures.some((signature) => {
      try {
        const expectedBuffer = Buffer.from(
          expectedSignature,
          'hex',
        );

        const receivedBuffer = Buffer.from(
          signature,
          'hex',
        );

        if (
          expectedBuffer.length !==
          receivedBuffer.length
        ) {
          return false;
        }

        return crypto.timingSafeEqual(
          expectedBuffer,
          receivedBuffer,
        );
      } catch {
        return false;
      }
    });
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  try {
    /*
     * สำคัญ:
     * ต้องอ่าน RAW BODY ก่อน JSON.parse
     * เพราะ Stripe Signature คำนวณจาก body เดิม
     */
    const rawBody = await request.text();

    const stripeSignature =
      request.headers.get('stripe-signature');

    if (!stripeSignature) {
      return NextResponse.json(
        {
          error: 'Missing Stripe signature.',
        },
        {
          status: 400,
        },
      );
    }

    /*
     * Live Webhook Secret
     * whsec_... ของ Webhook ฝั่ง Live
     */
    const liveSecret =
      process.env.STRIPE_WEBHOOK_SECRET?.trim();

    /*
     * Sandbox Webhook Secret
     * whsec_... ของ Webhook ฝั่ง Sandbox
     */
    const sandboxSecret =
      process.env.STRIPE_WEBHOOK_SECRET_TEST?.trim();

    if (!liveSecret && !sandboxSecret) {
      console.error(
        '[Stripe webhook] No webhook secret configured.',
      );

      return NextResponse.json(
        {
          error: 'Stripe webhook is not configured.',
        },
        {
          status: 500,
        },
      );
    }

    /*
     * ลองตรวจ Live ก่อน
     * ถ้าไม่ผ่านจึงลอง Sandbox
     */
    const isLive =
      !!liveSecret &&
      verifyStripeSignature(
        rawBody,
        stripeSignature,
        liveSecret,
      );

    const isSandbox =
      !isLive &&
      !!sandboxSecret &&
      verifyStripeSignature(
        rawBody,
        stripeSignature,
        sandboxSecret,
      );

    if (!isLive && !isSandbox) {
      console.error(
        '[Stripe webhook] Invalid Stripe signature.',
      );

      return NextResponse.json(
        {
          error: 'Invalid Stripe signature.',
        },
        {
          status: 400,
        },
      );
    }

    const environment = isLive
      ? 'live'
      : 'sandbox';

    let event: any;

    try {
      event = JSON.parse(rawBody);
    } catch {
      return NextResponse.json(
        {
          error: 'Invalid JSON payload.',
        },
        {
          status: 400,
        },
      );
    }

    console.log('[Stripe webhook] Event received', {
      environment,
      eventId: event?.id,
      eventType: event?.type,
    });

    switch (event?.type) {
      /*
       * Checkout สำเร็จ
       */
      case 'checkout.session.completed': {
        const session = event.data?.object;

        console.log(
          '[Stripe webhook] Checkout completed',
          {
            environment,
            sessionId: session?.id,
            paymentStatus:
              session?.payment_status,
            customerEmail:
              session?.customer_details?.email,
          },
        );

        /*
         * ขั้นต่อไป:
         * ตรงนี้จะใช้สำหรับเปิดแพ็กเกต
         * Premium / Premium+
         *
         * เช่นอ่าน:
         *
         * session.metadata.user_id
         * session.metadata.plan_id
         * session.metadata.offer_id
         *
         * แล้วอัปเดต Supabase
         */

        break;
      }

      /*
       * Payment Method ที่ชำระแบบ asynchronous
       * สำเร็จภายหลัง
       */
      case 'checkout.session.async_payment_succeeded': {
        const session = event.data?.object;

        console.log(
          '[Stripe webhook] Async payment succeeded',
          {
            environment,
            sessionId: session?.id,
          },
        );

        break;
      }

      /*
       * Payment asynchronous ล้มเหลว
       */
      case 'checkout.session.async_payment_failed': {
        const session = event.data?.object;

        console.warn(
          '[Stripe webhook] Async payment failed',
          {
            environment,
            sessionId: session?.id,
          },
        );

        break;
      }

      default: {
        console.log(
          '[Stripe webhook] Event ignored:',
          event?.type,
        );
      }
    }

    /*
     * Stripe ต้องการ HTTP 2xx
     * เพื่อถือว่า Webhook รับสำเร็จ
     */
    return NextResponse.json(
      {
        received: true,
        environment,
        event: event?.type ?? null,
      },
      {
        status: 200,
      },
    );
  } catch (error) {
    console.error(
      '[Stripe webhook] Unexpected error:',
      error,
    );

    return NextResponse.json(
      {
        error: 'Webhook processing failed.',
      },
      {
        status: 500,
      },
    );
  }
}