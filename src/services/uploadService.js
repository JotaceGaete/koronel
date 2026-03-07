/**
 * Subida de archivos a Cloudflare R2 mediante URLs firmadas.
 * API en /api/upload (Vercel serverless). Metadatos en Supabase (media_files).
 */
import { supabase } from '../lib/supabase';

const API_BASE = import.meta.env?.VITE_API_URL ?? '';

async function getAccessToken() {
  const { data: { session } } = await supabase?.auth?.getSession();
  return session?.access_token ?? null;
}

async function getSignedUrl({ filename, mimeType, size, entityType, entityId, accessToken }) {
  const res = await fetch(`${API_BASE}/api/upload/signed-url`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify({
      filename,
      mimeType: mimeType || 'application/octet-stream',
      size: size ?? null,
      entityType: entityType || 'misc',
      entityId: entityId ?? null,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error || `Signed URL failed: ${res.status}`);
  }
  return res.json();
}

async function uploadToR2(file, uploadUrl, mimeType) {
  const res = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': mimeType || file.type || 'application/octet-stream' },
    body: file,
  });
  if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
}

async function confirmUpload({ storageKey, mimeType, size, entityType, entityId, accessToken }) {
  const res = await fetch(`${API_BASE}/api/upload/confirm`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify({
      storageKey,
      mimeType: mimeType || null,
      size: size ?? null,
      entityType: entityType || 'misc',
      entityId: entityId ?? null,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error || `Confirm failed: ${res.status}`);
  }
  return res.json();
}

/**
 * Sube un archivo a R2 y registra metadatos en Supabase.
 * @param {File} file
 * @param {object} options - { entityType, entityId, accessToken }
 * @returns {Promise<{ url, storageKey, data }>} data = fila de media_files
 */
export async function uploadFile(file, options = {}) {
  const { entityType, entityId, accessToken: token } = options;
  const accessToken = token ?? (await getAccessToken());
  const filename = file.name || `file-${Date.now()}`;
  const mimeType = file.type || 'application/octet-stream';
  const size = file.size;

  const { uploadUrl, storageKey, publicUrl } = await getSignedUrl({
    filename,
    mimeType,
    size,
    entityType,
    entityId,
    accessToken,
  });

  await uploadToR2(file, uploadUrl, mimeType);

  const { data } = await confirmUpload({
    storageKey,
    mimeType,
    size,
    entityType,
    entityId,
    accessToken,
  });

  return { url: publicUrl, storageKey, path: storageKey, publicUrl, data };
}
