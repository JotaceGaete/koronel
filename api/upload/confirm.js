/**
 * Vercel serverless: confirma la subida y guarda metadatos en Supabase (media_files).
 * POST body: { storageKey, mimeType, size, entityType, entityId }
 * Headers: Authorization: Bearer <supabase_jwt>
 */
const { createClient } = require('@supabase/supabase-js');

const PUBLIC_URL = process.env.R2_PUBLIC_URL || 'https://multimedia.koronel.cl';
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_ANON = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

async function getUserFromToken(token) {
  if (!SUPABASE_URL || !SUPABASE_ANON) return null;
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);
  const { data: { user } } = await supabase.auth.getUser(token);
  return user;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!SUPABASE_URL || !SUPABASE_ANON) {
    return res.status(503).json({
      error: 'Server misconfiguration: missing Supabase URL or anon key. Set SUPABASE_URL and SUPABASE_ANON_KEY in Vercel environment.',
    });
  }

  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    const user = token ? await getUserFromToken(token) : null;
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const rawBody = req.body;
    const body = typeof rawBody === 'string' ? (() => { try { return JSON.parse(rawBody); } catch { return {}; } })() : (rawBody || {});
    const { storageKey, mimeType, size, entityType, entityId } = body;
    if (!storageKey) {
      return res.status(400).json({ error: 'storageKey required', receivedKeys: Object.keys(body) });
    }

    const url = `${PUBLIC_URL.replace(/\/$/, '')}/${storageKey}`;
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const { data, error } = await supabase
      .from('media_files')
      .insert({
        url,
        storage_key: storageKey,
        mime_type: mimeType || null,
        size: size != null ? Number(size) : null,
        owner_id: user.id,
        entity_type: entityType || 'misc',
        entity_id: entityId || null,
      })
      .select()
      .single();

    if (error) {
      console.error('confirm media_files insert:', error);
      return res.status(400).json({
        error: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });
    }

    return res.status(200).json({ data });
  } catch (err) {
    console.error('confirm error:', err);
    return res.status(500).json({ error: err.message || 'Failed to confirm upload' });
  }
};
