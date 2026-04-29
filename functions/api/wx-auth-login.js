/**
 * POST /api/wx-auth-login
 * （使用单层路径，避免嵌套 functions/api/auth/... 在生产环境未命中导致 POST 405）
 * Body: { code: string }
 * 环境变量: WECHAT_MINI_APPID, WECHAT_MINI_SECRET, AUTH_TOKEN_SECRET(可选)
 */
function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json; charset=utf-8',
  };
}

function b64urlJson(obj) {
  const s = JSON.stringify(obj);
  const b = btoa(unescape(encodeURIComponent(s)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  return b;
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
  const u8 = new Uint8Array(mac);
  const bin = btoa(String.fromCharCode(...u8));
  return bin.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function buildSessionToken(payload, signSecret) {
  const p = b64urlJson(payload);
  const sig = await hmacSha256B64u(signSecret, p);
  return `${p}.${sig}`;
}

async function handlePost(context) {
  const { request, env } = context;
  const origin = request.headers.get('Origin') || '*';
  const appid = env.WECHAT_MINI_APPID;
  const appSecret = env.WECHAT_MINI_SECRET;
  const signSecret = env.AUTH_TOKEN_SECRET || appSecret;

  if (!appid || !appSecret) {
    return new Response(
      JSON.stringify({
        error: '服务端未配置微信密钥（请设置 WECHAT_MINI_APPID / WECHAT_MINI_SECRET）',
        notConfigured: true,
      }),
      { status: 503, headers: corsHeaders(origin) }
    );
  }

  let code;
  try {
    const j = await request.json();
    code = j && j.code;
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: corsHeaders(origin),
    });
  }
  if (!code) {
    return new Response(JSON.stringify({ error: '缺少 code' }), {
      status: 400,
      headers: corsHeaders(origin),
    });
  }

  const wxUrl = `https://api.weixin.qq.com/sns/jscode2session?appid=${encodeURIComponent(
    appid
  )}&secret=${encodeURIComponent(appSecret)}&js_code=${encodeURIComponent(code)}&grant_type=authorization_code`;

  let wxRes;
  try {
    wxRes = await fetch(wxUrl);
  } catch (e) {
    return new Response(JSON.stringify({ error: 'wechat request failed' }), {
      status: 502,
      headers: corsHeaders(origin),
    });
  }
  const wx = await wxRes.json();
  if (wx.errcode) {
    return new Response(
      JSON.stringify({ error: wx.errmsg || 'jscode2session 失败', errcode: wx.errcode }),
      { status: 400, headers: corsHeaders(origin) }
    );
  }
  const { openid } = wx;
  if (!openid) {
    return new Response(JSON.stringify({ error: '未返回 openid' }), {
      status: 500,
      headers: corsHeaders(origin),
    });
  }

  const exp = Date.now() + 30 * 24 * 60 * 60 * 1000;
  const token = await buildSessionToken({ v: 1, o: openid, exp }, signSecret);
  return new Response(JSON.stringify({ token, openid, expiresAt: exp }), {
    status: 200,
    headers: corsHeaders(origin),
  });
}

/**
 * 统一入口，避免仅导出 onRequestPost 时部分环境下未注册导致 POST 405
 */
/**
 * GET：仅用于排查环境变量是否注入到当前部署的 Function（不返回任何密钥内容）
 */
function handleGetEnvProbe(context) {
  const origin = context.request.headers.get('Origin') || '*';
  const { env } = context;
  const id = env && env.WECHAT_MINI_APPID;
  const sec = env && env.WECHAT_MINI_SECRET;
  const appIdSet = !!(id && String(id).trim());
  const secretSet = !!(sec && String(sec).trim());
  return new Response(
    JSON.stringify({
      ok: true,
      wechatEnv: { appIdSet, secretSet },
      hint: appIdSet && secretSet
        ? 'Variables visible to Function. Use POST with JSON body { "code": "<wx.login code>" }.'
        : 'Function does not see WECHAT_MINI_APPID / WECHAT_MINI_SECRET. In Pages: Settings → Variables (Production) + redeploy.',
    }),
    { status: 200, headers: corsHeaders(origin) }
  );
}

export async function onRequest(context) {
  const m = context.request.method;
  const origin = context.request.headers.get('Origin') || '*';
  if (m === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }
  if (m === 'GET') {
    return handleGetEnvProbe(context);
  }
  if (m === 'POST') {
    return handlePost(context);
  }
  return new Response(JSON.stringify({ error: 'Method Not Allowed', use: 'POST' }), {
    status: 405,
    headers: corsHeaders(origin),
  });
}
