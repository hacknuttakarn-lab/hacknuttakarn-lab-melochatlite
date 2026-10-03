'use client';

import { upload } from '@vercel/blob/client';

const FUNCTION_FALLBACK_MAX_BYTES = 3.2 * 1024 * 1024;

export function useVercelBlobImages() {
  return String(process.env.NEXT_PUBLIC_MELO_IMAGE_STORAGE || '').trim().toLowerCase() === 'vercel_blob';
}

async function compressRasterForFunctionUpload(source: Blob): Promise<Blob> {
  if (source.size <= FUNCTION_FALLBACK_MAX_BYTES) return source;
  if (typeof window === 'undefined' || typeof document === 'undefined') return source;
  if (!String(source.type || '').toLowerCase().startsWith('image/') || source.type === 'image/svg+xml') return source;

  const objectUrl = URL.createObjectURL(source);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Unable to prepare this image for upload.'));
      img.src = objectUrl;
    });

    let width = image.naturalWidth || image.width;
    let height = image.naturalHeight || image.height;
    if (!width || !height) return source;

    const maxDimension = 2048;
    const initialScale = Math.min(1, maxDimension / Math.max(width, height));
    width = Math.max(1, Math.round(width * initialScale));
    height = Math.max(1, Math.round(height * initialScale));

    for (const quality of [0.86, 0.76, 0.66, 0.56]) {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d', { alpha: false });
      if (!context) return source;
      context.drawImage(image, 0, 0, width, height);
      const compressed = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
      if (compressed && compressed.size <= FUNCTION_FALLBACK_MAX_BYTES) return compressed;
      width = Math.max(1, Math.round(width * 0.86));
      height = Math.max(1, Math.round(height * 0.86));
    }
    return source;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

async function uploadViaFunctionFallback(input: {
  bucket: string;
  path: string;
  file: Blob;
  contentType?: string;
  accessToken: string;
}): Promise<{ url: string; pathname: string }> {
  const body = await compressRasterForFunctionUpload(input.file);
  if (body.size > FUNCTION_FALLBACK_MAX_BYTES) {
    throw new Error('Image is too large for the fallback uploader. Please choose a smaller image.');
  }

  const query = new URLSearchParams({ bucket: input.bucket, path: input.path });
  const response = await fetch(`/api/blob/image?${query.toString()}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
      'Content-Type': body.type || input.contentType || 'application/octet-stream',
    },
    body,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload?.url) {
    throw new Error(String(payload?.error || `Blob upload failed (${response.status})`));
  }
  return { url: String(payload.url), pathname: String(payload.pathname || payload.url) };
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

  try {
    const blob = await upload(pathname, input.file, {
      access: 'public',
      handleUploadUrl: '/api/blob/image',
      contentType: input.contentType || input.file.type || 'application/octet-stream',
      clientPayload: JSON.stringify({ bucket, path, accessToken: input.accessToken }),
      multipart: true,
    });
    if (!blob?.url) throw new Error('Blob upload URL was not returned.');
    return { url: blob.url, pathname: blob.pathname };
  } catch (directError) {
    try {
      return await uploadViaFunctionFallback({ ...input, bucket, path });
    } catch (fallbackError) {
      const directMessage = directError instanceof Error ? directError.message : String(directError);
      const fallbackMessage = fallbackError instanceof Error ? fallbackError.message : String(fallbackError);
      throw new Error(`Blob upload failed. Direct: ${directMessage}. Fallback: ${fallbackMessage}`);
    }
  }
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
