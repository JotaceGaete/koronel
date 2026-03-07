/**
 * Vercel serverless: obtiene una URL firmada (presigned) para subir un archivo a R2.
 * POST body: { filename, mimeType, size, entityType, entityId }
 * Headers: Authorization: Bearer <supabase_jwt>
 * Respuesta: { uploadUrl, storageKey, publicUrl }
 */
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { createClient } = require('@supabase/supabase-js');

const BUCKET = process.env.R2_BUCKET_NAME || 'multimedia-koronel';
const PUBLIC_URL = process.env.R2_PUBLIC_URL || 'https://multimedia.koronel.cl';
const ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const ACCESS_KEY = process.env.R2_ACCESS_KEY_ID;
const SECRET_KEY = process.env.R2_SECRET_ACCESS_KEY;
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_ANON = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

function getR2Client() {
  if (!ACCOUNT_ID || !ACCESS_KEY || !SECRET_KEY) {
    throw new Error('Missing R2 credentials (R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY)');
  }
  return new S3Client({
    region: 'auto',
    endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: ACCESS_KEY, secretAccessKey: SECRET_KEY },
  });
}

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

  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    const user = token ? await getUserFromToken(token) : null;
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { filename, mimeType, size, entityType, entityId } = req.body || {};
    if (!filename || !mimeType) {
      return res.status(400).json({ error: 'filename and mimeType required' });
    }

    const ext = filename.split('.').pop() || 'bin';
    const safeEntity = (entityType || 'misc').replace(/[^a-z0-9_-]/gi, '_');
    const safeId = (entityId || user.id).replace(/[^a-z0-9-]/gi, '');
    const key = `${safeEntity}/${safeId}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;

    const client = getR2Client();
    const command = new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      ContentType: mimeType,
    });
    const uploadUrl = await getSignedUrl(client, command, { expiresIn: 3600 });
    const publicUrl = `${PUBLIC_URL.replace(/\/$/, '')}/${key}`;

    return res.status(200).json({ uploadUrl, storageKey: key, publicUrl });
  } catch (err) {
    console.error('signed-url error:', err);
    return res.status(500).json({ error: err.message || 'Failed to generate signed URL' });
  }
};
