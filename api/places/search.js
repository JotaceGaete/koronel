/**
 * Vercel serverless: busca negocios en Google Places y retorna detalles completos.
 * La API key permanece en el servidor — nunca se expone al navegador.
 *
 * POST body: { tipo: string, ciudad: string, limite?: number }
 * Response:  { places: PlaceDetail[], total: number }
 */
'use strict';

const { searchAndFetchDetails } = require('./_core');

const GOOGLE_API_KEY = process.env.GOOGLE_PLACES_API_KEY;

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!GOOGLE_API_KEY) {
    return res.status(503).json({ error: 'GOOGLE_PLACES_API_KEY no está configurada en el servidor.' });
  }

  const body   = req.body || {};
  const tipo   = (body.tipo   || '').trim();
  const ciudad = (body.ciudad || '').trim();
  const limite = Math.min(parseInt(body.limite || 20, 10), 60);

  if (!tipo || !ciudad) {
    return res.status(400).json({ error: 'Los campos "tipo" y "ciudad" son requeridos.' });
  }

  try {
    const places = await searchAndFetchDetails(tipo, ciudad, limite, GOOGLE_API_KEY);
    return res.status(200).json({ places, total: places.length });
  } catch (e) {
    console.error('places/search error:', e);
    return res.status(500).json({ error: e.message || 'Error interno' });
  }
};
