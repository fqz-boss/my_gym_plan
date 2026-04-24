/**
 * GET /api/logs - 获取全部训练记录（按时间倒序）
 * POST /api/logs - 新增一条训练记录
 */

function corsHeaders(origin = '*') {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json; charset=utf-8',
  };
}

export async function onRequestGet(context) {
  const { env, request } = context;
  if (!env.DB) {
    return new Response(
      JSON.stringify({ error: 'D1 未绑定: 请在 Pages 绑定 DB 变量名 DB，并检查 wrangler.toml 的 database_id' }),
      { status: 503, headers: corsHeaders('*') }
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
        'SELECT id, date, timestamp, type, label FROM gym_logs ORDER BY timestamp DESC'
      ).all();
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
          ...corsHeaders(request.headers.get('Origin') || '*'),
        },
      });
    }
    const { results } = await env.DB.prepare(
      'SELECT id, date, timestamp, type, label, exercises FROM gym_logs ORDER BY timestamp DESC'
    ).all();
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
      headers: corsHeaders(context.request.headers.get('Origin') || '*'),
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
      'INSERT INTO gym_logs (date, timestamp, type, label, exercises) VALUES (?, ?, ?, ?, ?)'
    )
      .bind(date, timestamp, type, label, exercisesStr)
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
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  });
}
