'use client';

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
  const form = new FormData();
  form.set('bucket', input.bucket);
  form.set('path', input.path);
  form.set('file', input.file, input.path.split('/').pop() || 'image');
  if (input.contentType) form.set('contentType', input.contentType);
  const response = await fetch('/api/blob/image', {
    method: 'POST',
    headers: { Authorization: `Bearer ${input.accessToken}` },
    body: form,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(String(payload?.error || `Blob upload failed (${response.status})`));
  const url = String(payload?.url || '');
  const pathname = String(payload?.pathname || '');
  if (!url) throw new Error('Blob upload URL was not returned.');
  return { url, pathname };
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
