'use client';

import { upload } from '@vercel/blob/client';

export function useVercelBlobImages() {
  return String(process.env.NEXT_PUBLIC_MELO_IMAGE_STORAGE || '').trim().toLowerCase() === 'vercel_blob';
}

export async function uploadPublicImageBlob(input: {
  bucket: string;
  path: string;
  file: Blob;
  contentType?: string;
  accessToken: string;
}): Promise<{ url: string; pathname: string }> {
  const bucket = String(input.bucket || '').trim();
  const path = String(input.path || '').replace(/^\/+/, '');
  const pathname = `${bucket}/${path}`;

  const blob = await upload(pathname, input.file, {
    access: 'public',
    handleUploadUrl: '/api/blob/image',
    contentType: input.contentType || input.file.type || 'application/octet-stream',
    clientPayload: JSON.stringify({
      bucket,
      path,
      accessToken: input.accessToken,
    }),
    multipart: true,
  });

  if (!blob?.url) throw new Error('Blob upload URL was not returned.');
  return { url: blob.url, pathname: blob.pathname };
}

export async function deletePublicImageBlob(input: { url: string; accessToken: string }) {
  const response = await fetch('/api/blob/image', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${input.accessToken}` },
    body: JSON.stringify({ url: input.url }),
  });
  if (!response.ok && response.status !== 404) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(String(payload?.error || `Blob delete failed (${response.status})`));
  }
}
