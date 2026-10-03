import { del, put } from '@vercel/blob';
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { NextRequest, NextResponse } from 'next/server';

const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '');
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const ALLOWED_BUCKETS = new Set(['profile-photos', 'social-posts']);
const MAX_BYTES = 12 * 1024 * 1024;

type User = { id: string };
type UploadPayload = { bucket?: unknown; path?: unknown; accessToken?: unknown };

async function currentUserFromAccessToken(accessToken: string): Promise<User | null> {
  if (!accessToken || !SUPABASE_URL || !SUPABASE_KEY) return null;
  const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${accessToken}` },
    cache: 'no-store',
  }).catch(() => null);
  if (!response?.ok) return null;
  const user = await response.json().catch(() => null);
  return user?.id ? { id: String(user.id) } : null;
}

async function currentUser(request: NextRequest): Promise<User | null> {
  const authorization = request.headers.get('authorization') || '';
  if (!authorization.startsWith('Bearer ')) return null;
  return currentUserFromAccessToken(authorization.slice('Bearer '.length).trim());
}

function safePath(value: string) {
  return value
    .replace(/^\/+|\\/g, '')
    .split('/')
    .filter(Boolean)
    .map((part) => part.replace(/[^a-zA-Z0-9._-]/g, '_'))
    .join('/');
}

function parseUploadPayload(clientPayload?: string | null): UploadPayload {
  if (!clientPayload) return {};
  try {
    const value = JSON.parse(clientPayload);
    return value && typeof value === 'object' ? (value as UploadPayload) : {};
  } catch {
    return {};
  }
}

export async function POST(request: NextRequest) {
  let body: HandleUploadBody;
  try {
    body = (await request.json()) as HandleUploadBody;
  } catch {
    return NextResponse.json({ error: 'Invalid Blob upload request.' }, { status: 400 });
  }

  try {
    const token = (process.env.BLOB_READ_WRITE_TOKEN || '').trim();
    const jsonResponse = await handleUpload({
      body,
      request,
      ...(token && token !== '[SENSITIVE]' ? { token } : {}),
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const payload = parseUploadPayload(clientPayload);
        const bucket = String(payload.bucket || '').trim();
        const rawPath = String(payload.path || '').trim();
        const accessToken = String(payload.accessToken || '').trim();

        if (!ALLOWED_BUCKETS.has(bucket)) throw new Error('Unsupported image bucket.');
        if (!rawPath) throw new Error('Image path is required.');
        if (!accessToken) throw new Error('Unauthorized');

        const user = await currentUserFromAccessToken(accessToken);
        if (!user) throw new Error('Unauthorized');

        const path = safePath(rawPath);
        if (!path || !path.startsWith(`${user.id}/`)) {
          throw new Error('Image path does not belong to the signed-in user.');
        }

        const expectedPathname = `${bucket}/${path}`;
        if (safePath(pathname) !== expectedPathname) {
          throw new Error('Invalid image upload path.');
        }

        return {
          allowedContentTypes: ['image/*'],
          maximumSizeInBytes: MAX_BYTES,
          addRandomSuffix: true,
          cacheControlMaxAge: 31536000,
          tokenPayload: JSON.stringify({ userId: user.id, bucket, path }),
        };
      },
      onUploadCompleted: async () => {
        // Database rows are updated by the existing profile/post flows after
        // upload() returns the Blob URL to the browser. Nothing to do here.
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'Blob upload failed.';
    const status = message === 'Unauthorized' ? 401 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PUT(request: NextRequest) {
  const user = await currentUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const bucket = String(request.nextUrl.searchParams.get('bucket') || '').trim();
  const rawPath = String(request.nextUrl.searchParams.get('path') || '').trim();
  if (!ALLOWED_BUCKETS.has(bucket)) return NextResponse.json({ error: 'Unsupported image bucket.' }, { status: 400 });
  if (!rawPath) return NextResponse.json({ error: 'Image path is required.' }, { status: 400 });

  const path = safePath(rawPath);
  if (!path || !path.startsWith(`${user.id}/`)) {
    return NextResponse.json({ error: 'Image path does not belong to the signed-in user.' }, { status: 403 });
  }

  const contentType = String(request.headers.get('content-type') || '').toLowerCase();
  if (!contentType.startsWith('image/')) return NextResponse.json({ error: 'Only image uploads are allowed.' }, { status: 415 });
  const declaredLength = Number(request.headers.get('content-length') || '0');
  const fallbackLimit = Math.floor(3.5 * 1024 * 1024);
  if (declaredLength > fallbackLimit) return NextResponse.json({ error: 'Fallback image payload is too large.' }, { status: 413 });

  try {
    const bytes = await request.arrayBuffer();
    if (bytes.byteLength > fallbackLimit) return NextResponse.json({ error: 'Fallback image payload is too large.' }, { status: 413 });
    const token = (process.env.BLOB_READ_WRITE_TOKEN || '').trim();
    const result = await put(`${bucket}/${path}`, Buffer.from(bytes), {
      access: 'public',
      addRandomSuffix: true,
      contentType,
      ...(token && token !== '[SENSITIVE]' ? { token } : {}),
    });
    return NextResponse.json({ url: result.url, pathname: result.pathname });
  } catch (cause) {
    return NextResponse.json({ error: cause instanceof Error ? cause.message : 'Blob upload failed.' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const user = await currentUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const payload = await request.json().catch(() => ({}));
  const url = String(payload?.url || '').trim();
  if (!/^https:\/\/[^/]+\.public\.blob\.vercel-storage\.com\//i.test(url)) {
    return NextResponse.json({ error: 'Invalid Blob URL.' }, { status: 400 });
  }
  try {
    const token = (process.env.BLOB_READ_WRITE_TOKEN || '').trim();
    const oidcToken = (process.env.VERCEL_OIDC_TOKEN || '').trim();
    const storeId = (process.env.BLOB_STORE_ID || '').trim();
    const credentials: Record<string, string> = {};
    if (token && token !== '[SENSITIVE]') credentials.token = token;
    else if (oidcToken && storeId) {
      credentials.oidcToken = oidcToken;
      credentials.storeId = storeId;
    }
    await del(url, credentials as any);
    return NextResponse.json({ ok: true });
  } catch (cause) {
    return NextResponse.json({ error: cause instanceof Error ? cause.message : 'Blob delete failed.' }, { status: 500 });
  }
}
