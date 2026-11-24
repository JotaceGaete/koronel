#!/usr/bin/env node
// Verificación por PostgREST real (staging o, tras cada paso, producción) del PR de
// user_profiles. SOLO LECTURA salvo un UPDATE de full_name del usuario de prueba sobre sí mismo
// (lo deja como estaba). No usa la service role key.
//
// Uso:
//   SUPABASE_URL=... SUPABASE_ANON_KEY=... \
//   TEST_USER_EMAIL=... TEST_USER_PASSWORD=... TEST_ADMIN_EMAIL=... TEST_ADMIN_PASSWORD=... \
//   node scripts/verify-user-profiles-privacy.mjs <fase>
// fase: step1 (RPC creadas, columnas aún abiertas) | step2 (columnas cerradas)
// Usar cuentas de prueba, nunca cuentas reales de clientes.
import { createClient } from '@supabase/supabase-js';

const phase = process.argv[2];
if (!['step1', 'step2'].includes(phase)) { console.error('Fase: step1 | step2'); process.exit(2); }
const { SUPABASE_URL: url, SUPABASE_ANON_KEY: key } = process.env;
if (!url || !key) { console.error('Faltan SUPABASE_URL / SUPABASE_ANON_KEY'); process.exit(2); }

let pass = 0; let fail = 0;
const ok = (name, cond, extra = '') => {
  if (cond) { pass++; console.log(`PASS  ${name}`); } else { fail++; console.log(`FAIL  ${name} ${extra}`); }
};
const denied = (error) => !!error && (error.code === '42501' || /permission denied/i.test(error.message || ''));
const client = () => createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
async function signedIn(email, password) {
  const c = client();
  const { data, error } = await c.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`login ${email}: ${error.message}`);
  return { c, id: data.user.id };
}

const anon = client();
// --- anon
{
  const { error } = await anon.from('user_profiles').select('id, full_name, avatar_url, updated_at').limit(1);
  ok('anon lee columnas públicas', !error, error?.message);
  const r = await anon.from('user_profiles').select('email').limit(1);
  ok(phase === 'step2' ? 'anon NO lee email' : 'anon aún lee email (paso 2 pendiente)', phase === 'step2' ? denied(r.error) : !r.error, r.error?.message);
  const p = await anon.from('user_profiles').select('phone').limit(1);
  if (phase === 'step2') ok('anon NO lee phone', denied(p.error), p.error?.message);
  const star = await anon.from('user_profiles').select('*').limit(1);
  if (phase === 'step2') ok('anon NO puede select=*', denied(star.error), star.error?.message);
  const rpc1 = await anon.rpc('get_my_profile');
  ok('anon no ejecuta get_my_profile', !!rpc1.error, 'debería fallar');
  const rpc2 = await anon.rpc('admin_get_user_contacts', { p_user_ids: [] });
  ok('anon no ejecuta admin_get_user_contacts', !!rpc2.error, 'debería fallar');
  // Embeds públicos que usa la app
  const rev = await anon.from('business_reviews').select('id, user_profiles(id, full_name, avatar_url)').limit(3);
  ok('anon embed reseñas → autor', !rev.error, rev.error?.message);
  const ads = await anon.from('classified_ads').select('user_id, title, user_profiles!classified_ads_user_id_fkey(id, full_name, avatar_url, updated_at)').limit(3);
  ok('anon embed aviso → anunciante (updated_at)', !ads.error, ads.error?.message);
  const posts = await anon.from('community_posts').select('id, author:user_profiles(id, full_name, avatar_url)').limit(3);
  ok('anon embed comunidad → autor', !posts.error, posts.error?.message);
  const cnt = await anon.from('user_profiles').select('id', { count: 'exact', head: true });
  ok('anon contador de usuarios (StatsBar)', !cnt.error && typeof cnt.count === 'number', cnt.error?.message);
}

// --- usuario normal
if (process.env.TEST_USER_EMAIL) {
  const { c, id } = await signedIn(process.env.TEST_USER_EMAIL, process.env.TEST_USER_PASSWORD);
  const me = await c.rpc('get_my_profile');
  ok('usuario: get_my_profile devuelve solo su fila', !me.error && Array.isArray(me.data) && me.data.length === 1 && me.data[0].id === id, me.error?.message);
  const others = await c.from('user_profiles').select('email').neq('id', id).limit(1);
  if (phase === 'step2') ok('usuario NO lee email ajeno', denied(others.error), others.error?.message);
  const ph = await c.from('user_profiles').select('phone').neq('id', id).limit(1);
  if (phase === 'step2') ok('usuario NO lee phone ajeno', denied(ph.error), ph.error?.message);
  const contacts = await c.rpc('admin_get_user_contacts', { p_user_ids: [id] });
  ok('usuario NO ejecuta admin_get_user_contacts', !!contacts.error, 'debería fallar');
  if (phase === 'step2') {
    // Solo en step2: en step1 (sin PR #2) el UPDATE funcionaría y cambiaría el role del usuario de prueba.
    const role = await c.from('user_profiles').update({ role: 'admin' }).eq('id', id);
    ok('usuario NO se pone role=admin', denied(role.error), role.error ? role.error.message : 'EL UPDATE FUNCIONÓ: revertir role del usuario de prueba');
    const em = await c.from('user_profiles').update({ email: 'x@example.invalid' }).eq('id', id);
    ok('usuario NO cambia su email de perfil', denied(em.error), em.error?.message);
  }
  const original = me.data?.[0]?.full_name ?? null;
  const upd = await c.from('user_profiles').update({ full_name: original }).eq('id', id);
  ok('usuario actualiza su perfil (sin RETURNING)', !upd.error, upd.error?.message);
  const after = await c.rpc('get_my_profile');
  ok('usuario: role sigue siendo user', after.data?.[0]?.role !== 'admin');
}

// --- admin
if (process.env.TEST_ADMIN_EMAIL) {
  const { c, id } = await signedIn(process.env.TEST_ADMIN_EMAIL, process.env.TEST_ADMIN_PASSWORD);
  const r = await c.rpc('admin_get_user_contacts', { p_user_ids: [id] });
  ok('admin: admin_get_user_contacts responde', !r.error && Array.isArray(r.data) && r.data.length === 1 && 'email' in r.data[0], r.error?.message);
  const claims = await c.from('business_claims').select('id, claimant:user_profiles(id, full_name)').limit(3);
  ok('admin: listado de reclamos con embed público', !claims.error, claims.error?.message);
  const biz = await c.from('businesses').select('id, owner:user_profiles(id, full_name)').limit(3);
  ok('admin: listado de negocios con dueño', !biz.error, biz.error?.message);
  const ev = await c.from('events').select('id, user:user_profiles(id, full_name)').limit(3);
  ok('admin: listado de eventos con autor', !ev.error, ev.error?.message);
  if (phase === 'step2') {
    const e = await c.from('user_profiles').select('email').limit(1);
    ok('admin tampoco lee email por tabla (usa la RPC)', denied(e.error), e.error?.message);
  }
}

console.log(`== ${phase}: ${pass} PASS, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
