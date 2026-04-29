/**
 * GET /api/logs - 获取全部训练记录（按时间倒序）
 * POST /api/logs - 新增一条训练记录
 */

function corsHeaders(origin = '*') {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json; charset=utf-8',
  };
}

import { requireAuth, hasGymLogsUserIdColumn } from '../_auth.js';

async function maybeClaimLegacyLogs(env, request, openid) {
  // 首登认领：仅当表已包含 user_id 列时执行
  if (!env || !env.DB) return;
  const hasCol = await hasGymLogsUserIdColumn(env.DB);
  if (!hasCol) return;

  // 若该用户已有数据则不认领
  const mine = await env.DB.prepare('SELECT COUNT(1) AS c FROM gym_logs WHERE user_id = ?')
    .bind(openid)
    .first();
  const mineCount = mine && mine.c != null ? Number(mine.c) : 0;
  if (mineCount > 0) return;

  // 存在未归属旧数据才认领
  const legacy = await env.DB.prepare('SELECT COUNT(1) AS c FROM gym_logs WHERE user_id IS NULL OR user_id = ?')
    .bind('')
    .first();
  const legacyCount = legacy && legacy.c != null ? Number(legacy.c) : 0;
  if (legacyCount <= 0) return;

  // 一次性认领全部旧数据：避免后续用户串号
  await env.DB.prepare('UPDATE gym_logs SET user_id = ? WHERE user_id IS NULL OR user_id = ?')
    .bind(openid, '')
    .run();
  return;
}

export async function onRequestGet(context) {
  const { env, request } = context;
  if (!env.DB) {
    return new Response(
      JSON.stringify({ error: 'D1 未绑定: 请在 Pages 绑定 DB 变量名 DB，并检查 wrangler.toml 的 database_id' }),
      { status: 503, headers: corsHeaders('*') }
    );
  }
  const origin = request.headers.get('Origin') || '*';
  const auth = await requireAuth(request, env);
  if (!auth.ok) {
    return new Response(JSON.stringify({ error: auth.error }), {
      status: auth.status,
      headers: corsHeaders(origin),
    });
  }
  const openid = auth.openid;
  await maybeClaimLegacyLogs(env, request, openid);

  const hasCol = await hasGymLogsUserIdColumn(env.DB);
  if (!hasCol) {
    return new Response(
      JSON.stringify({
        error: 'DB schema missing user_id. Please migrate gym_logs to add user_id.',
        hint: "Run: ALTER TABLE gym_logs ADD COLUMN user_id TEXT; then create index on (user_id, timestamp).",
      }),
      { status: 503, headers: corsHeaders(origin) }
    );
  }
  let url;
  try {
    url = new URL(request.url);
  } catch (e) {
    url = { searchParams: { get: () => null } };
  }
  const lite = url.searchParams.get('lite') === '1' || url.searchParams.get('lite') === 'true';
  try {
    if (lite) {
      const { results } = await env.DB.prepare(
        'SELECT id, date, timestamp, type, label FROM gym_logs WHERE user_id = ? ORDER BY timestamp DESC'
      )
        .bind(openid)
        .all();
      const logs = results.map((row) => ({
        id: row.id,
        date: row.date,
        timestamp: row.timestamp,
        type: row.type,
        label: row.label,
        exercises: [],
      }));
      return new Response(JSON.stringify(logs), {
        status: 200,
        headers: {
          ...corsHeaders(origin),
        },
      });
    }
    const { results } = await env.DB.prepare(
      'SELECT id, date, timestamp, type, label, exercises FROM gym_logs WHERE user_id = ? ORDER BY timestamp DESC'
    )
      .bind(openid)
      .all();
    const logs = results.map((row) => ({
      id: row.id,
      date: row.date,
      timestamp: row.timestamp,
      type: row.type,
      label: row.label,
      exercises: JSON.parse(row.exercises || '[]'),
    }));
    return new Response(JSON.stringify(logs), {
      status: 200,
      headers: corsHeaders(origin),
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e.message || 'Failed to fetch logs' }),
      { status: 500, headers: corsHeaders('*') }
    );
  }
}

export async function onRequestPost(context) {
  const { env, request } = context;
  const origin = request.headers.get('Origin') || '*';
  if (!env.DB) {
    return new Response(
      JSON.stringify({ error: 'D1 未绑定' }),
      { status: 503, headers: corsHeaders(origin) }
    );
  }
  const auth = await requireAuth(request, env);
  if (!auth.ok) {
    return new Response(JSON.stringify({ error: auth.error }), {
      status: auth.status,
      headers: corsHeaders(origin),
    });
  }
  const openid = auth.openid;
  const hasCol = await hasGymLogsUserIdColumn(env.DB);
  if (!hasCol) {
    return new Response(
      JSON.stringify({ error: 'DB schema missing user_id. Please migrate gym_logs.' }),
      { status: 503, headers: corsHeaders(origin) }
    );
  }
  try {
    const body = await request.json();
    const { date, timestamp, type, label, exercises } = body;
    if (!date || timestamp == null || !type || !label || !exercises) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: corsHeaders(origin) }
      );
    }
    const exercisesStr = JSON.stringify(exercises);
    const { meta } = await env.DB.prepare(
      'INSERT INTO gym_logs (user_id, date, timestamp, type, label, exercises) VALUES (?, ?, ?, ?, ?, ?)'
    )
      .bind(openid, date, timestamp, type, label, exercisesStr)
      .run();
    const id = meta.last_row_id;
    return new Response(JSON.stringify({ id }), {
      status: 201,
      headers: corsHeaders(origin),
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e.message || 'Failed to save log' }),
      { status: 500, headers: corsHeaders(origin) }
    );
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}
