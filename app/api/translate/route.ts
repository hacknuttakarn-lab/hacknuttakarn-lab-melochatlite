import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const GOOGLE_TRANSLATE_URL = 'https://translation.googleapis.com/language/translate/v2';
const ALLOWED_LANGUAGES = new Set(['th', 'en', 'de', 'zh', 'ja', 'ko']);

function normalizeLanguage(value: unknown) {
  const raw = String(value ?? '').trim().toLowerCase().replace('_', '-');
  const base = raw.split('-')[0];
  return ALLOWED_LANGUAGES.has(base) ? base : '';
}
function numberValue(value: unknown) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}
function textValue(value: unknown) {
  return String(value ?? '').trim().toLowerCase();
}

async function rpc<T>(request: NextRequest, name: string, body: Record<string, unknown> = {}) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '');
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const authorization = request.headers.get('authorization') || '';
  if (!url || !key || !authorization) return { data: null as T | null, error: 'AUTH_REQUIRED' };
  const response = await fetch(`${url}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: { apikey: key, Authorization: authorization, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store',
  });
  if (!response.ok) {
    let message = `HTTP ${response.status}`;
    try {
      const p = await response.json();
      message = String(p?.message || p?.error || p?.hint || message);
    } catch {}
    return { data: null as T | null, error: message };
  }
  return { data: (await response.json()) as T, error: null as string | null };
}

export async function POST(request: NextRequest) {
  const requestId = randomUUID().slice(0, 8);
  try {
    const apiKey = process.env.GOOGLE_CLOUD_TRANSLATE_API_KEY?.trim();
    if (!apiKey) {
      console.error('[Melo Translation]', requestId, 'configuration: missing GOOGLE_CLOUD_TRANSLATE_API_KEY');
      return NextResponse.json({ error: 'TRANSLATION_NOT_CONFIGURED', diagnostic: 'GOOGLE_API_KEY_MISSING', stage: 'configuration', requestId }, { status: 503 });
    }

    const body = await request.json();
    const text = typeof body?.text === 'string' ? body.text.trim() : '';
    const target = normalizeLanguage(body?.target);
    const supportScope = body?.scope === 'support';

    if (!text) return NextResponse.json({ translatedText: '', detectedSourceLanguage: '', skipped: true, requestId });
    if (!target) return NextResponse.json({ error: 'INVALID_TARGET_LANGUAGE', stage: 'request', requestId }, { status: 400 });
    if (text.length > 5000) return NextResponse.json({ error: 'TEXT_TOO_LONG', stage: 'request', requestId }, { status: 400 });

    const usage = await rpc<Record<string, unknown>>(request, 'melo_get_my_plan_usage_v25');
    if (usage.error || !usage.data) {
      console.error('[Melo Translation]', requestId, 'plan usage failed:', usage.error || 'NO_USAGE');
      return NextResponse.json({ error: 'AUTH_REQUIRED', diagnostic: usage.error || 'NO_USAGE', stage: 'plan_usage', requestId }, { status: 401 });
    }

    const admin = usage.data.is_admin === true;
    const baseLimit = numberValue(usage.data.translation_limit ?? usage.data.translation_monthly_limit);
    const addonLimit = numberValue(usage.data.addon_translation_limit);
    const bonusLimit = numberValue(usage.data.bonus_translation_limit);
    const totalLimit = numberValue(usage.data.translation_total_limit ?? (baseLimit + addonLimit + bonusLimit));
    const totalUsed = numberValue(usage.data.translation_total_used ?? (numberValue(usage.data.base_translation_used) + numberValue(usage.data.addon_translation_used)));
    const planCode = textValue(usage.data.plan_code ?? usage.data.current_plan_code ?? usage.data.code);
    const planAllows = usage.data.can_use_translation === true || ['premium', 'premium_plus'].includes(planCode) || totalLimit > 0;

    if (!supportScope && !admin && !planAllows) {
      console.warn('[Melo Translation]', requestId, 'plan not eligible', { planCode, totalLimit });
      return NextResponse.json({ error: 'PLAN_UPGRADE_REQUIRED', diagnostic: `plan=${planCode || 'unknown'};limit=${totalLimit}`, stage: 'entitlement', requestId }, { status: 403 });
    }
    if (!supportScope && !admin && totalLimit - totalUsed < text.length) {
      return NextResponse.json({ error: 'TRANSLATION_QUOTA_EXCEEDED', remaining: Math.max(0, totalLimit - totalUsed), stage: 'quota', requestId }, { status: 402 });
    }

    const cached = await rpc<Array<{ translated_text: string; original_language: string | null; translation_character_count: number }>>(
      request,
      'melo_get_cached_translation_v25',
      { p_original: text, p_target: target },
    );
    const cacheRow = Array.isArray(cached.data) ? cached.data[0] : undefined;
    if (cacheRow?.translated_text) {
      return NextResponse.json({ translatedText: cacheRow.translated_text, detectedSourceLanguage: normalizeLanguage(cacheRow.original_language), skipped: false, cached: true, requestId });
    }

    // Use the documented v2 API key query parameter. This is more portable for
    // Cloud Translation Basic than depending on proxy handling of X-Goog-Api-Key.
    const googleResponse = await fetch(`${GOOGLE_TRANSLATE_URL}?key=${encodeURIComponent(apiKey)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ q: text, target, format: 'text' }),
      cache: 'no-store',
    });
    const payload = await googleResponse.json().catch(() => ({}));
    if (!googleResponse.ok) {
      const providerMessage = String(payload?.error?.message || 'Unknown translation error');
      console.error('[Melo Translation]', requestId, 'Google API error', googleResponse.status, providerMessage);
      return NextResponse.json({ error: 'TRANSLATION_FAILED', diagnostic: providerMessage, providerStatus: googleResponse.status, stage: 'google_translate', requestId }, { status: 502 });
    }

    const result = payload?.data?.translations?.[0];
    const translatedText = typeof result?.translatedText === 'string' ? result.translatedText : text;
    const detectedSourceLanguage = normalizeLanguage(result?.detectedSourceLanguage);

    if (detectedSourceLanguage && detectedSourceLanguage === target) {
      return NextResponse.json({ translatedText: text, detectedSourceLanguage, skipped: true, requestId });
    }

    if (!supportScope && !admin) {
      const recorded = await rpc<Record<string, unknown>>(request, 'melo_record_translation_v25', {
        p_original: text,
        p_original_language: detectedSourceLanguage || null,
        p_translated: translatedText,
        p_target: target,
        p_provider: 'google',
      });
      if (recorded.error) {
        const quota = recorded.error.includes('PLAN_QUOTA_EXCEEDED');
        const upgrade = recorded.error.includes('PLAN_UPGRADE_REQUIRED');
        console.error('[Melo Translation]', requestId, 'usage recording failed:', recorded.error);
        return NextResponse.json({
          error: quota ? 'TRANSLATION_QUOTA_EXCEEDED' : upgrade ? 'PLAN_UPGRADE_REQUIRED' : 'TRANSLATION_USAGE_FAILED',
          diagnostic: recorded.error,
          stage: 'usage_recording',
          requestId,
        }, { status: quota ? 402 : upgrade ? 403 : 500 });
      }
    }

    return NextResponse.json({ translatedText, detectedSourceLanguage, skipped: false, cached: false, requestId });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[Melo Translation]', requestId, 'route error:', message);
    return NextResponse.json({ error: 'TRANSLATION_FAILED', diagnostic: message, stage: 'route', requestId }, { status: 500 });
  }
}
