/**
 * Auth helpers for Pages Functions.
 *
 * Session token format (from /api/wx-auth-login):
 *   token = "<payload_b64url>.<sig_b64url>"
 *   payload JSON: { v: 1, o: "<openid>", exp: <msEpoch> }
 *
 * Signature: HMAC-SHA256(secret, payload_b64url)
 * secret: AUTH_TOKEN_SECRET || WECHAT_MINI_SECRET
 */
 
function b64urlToBytes(s) {
  const str = String(s || '').replace(/-/g, '+').replace(/_/g, '/');
  const pad = str.length % 4 ? '='.repeat(4 - (str.length % 4)) : '';
  const b64 = str + pad;
  const bin = atob(b64);
  const u8 = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) u8[i] = bin.charCodeAt(i);
  return u8;
}

function bytesToB64url(u8) {
  const bin = String.fromCharCode(...u8);
  const b64 = btoa(bin);
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function hmacSha256B64u(secret, message) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const mac = await crypto.subtle.sign('HMAC', key, enc.encode(message));
  return bytesToB64url(new Uint8Array(mac));
}

function safeJsonParse(str) {
  try {
    return JSON.parse(str);
  } catch (e) {
    return null;
  }
}

function decodePayload(payloadB64u) {
  const u8 = b64urlToBytes(payloadB64u);
  const json = new TextDecoder().decode(u8);
  return safeJsonParse(json);
}

/**
 * @param {string} token
 * @param {string} secret
 * @returns {Promise<{ openid: string, exp: number } | null>}
 */
export async function verifySessionToken(token, secret) {
  const t = token && String(token).trim();
  if (!t) return null;
  const parts = t.split('.');
  if (parts.length !== 2) return null;
  const [payloadB64u, sigB64u] = parts;
  const expected = await hmacSha256B64u(secret, payloadB64u);
  if (expected !== sigB64u) return null;
  const p = decodePayload(payloadB64u);
  if (!p || p.v !== 1) return null;
  const openid = p.o && String(p.o).trim();
  const exp = Number(p.exp);
  if (!openid || !Number.isFinite(exp)) return null;
  if (exp <= Date.now()) return null;
  return { openid, exp };
}

/**
 * @param {Request} request
 * @param {any} env
 * @returns {Promise<{ ok: true, openid: string } | { ok: false, status: number, error: string }>}
 */
export async function requireAuth(request, env) {
  const h = request.headers.get('Authorization') || '';
  const m = h.match(/^Bearer\s+(.+)$/i);
  const token = m && m[1] ? String(m[1]).trim() : '';
  if (!token) return { ok: false, status: 401, error: 'Missing Authorization' };
  const secret = (env && (env.AUTH_TOKEN_SECRET || env.WECHAT_MINI_SECRET)) || '';
  if (!secret) return { ok: false, status: 503, error: 'Auth secret not configured' };
  const v = await verifySessionToken(token, secret);
  if (!v) return { ok: false, status: 401, error: 'Invalid token' };
  return { ok: true, openid: v.openid };
}

/**
 * PRAGMA based schema probe (safe across versions).
 * @param {any} db env.DB
 * @returns {Promise<boolean>}
 */
export async function hasGymLogsUserIdColumn(db) {
  try {
    const { results } = await db.prepare("PRAGMA table_info('gym_logs')").all();
    return (results || []).some((r) => r && r.name === 'user_id');
  } catch (e) {
    return false;
  }
}

