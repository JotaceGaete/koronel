const { getServiceSupabase, requireAdmin, importPlace } = require('./_core');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    await requireAdmin(req);
    const { placeId, place } = req.body || {};
    if (!placeId && !place) return res.status(400).json({ error: 'placeId or place required' });

    const result = await importPlace({
      supabase: getServiceSupabase(),
      placeId,
      place,
    });
    return res.status(200).json(result);
  } catch (error) {
    console.error('places import error:', error);
    return res.status(error.statusCode || 500).json({ error: error.message || 'Import failed' });
  }
};
