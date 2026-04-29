/**
 * DELETE /api/logs/:id - 按 id 删除一条训练记录
 */

function corsHeaders(origin = '*') {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json; charset=utf-8',
  };
}

import { requireAuth, hasGymLogsUserIdColumn } from '../../_auth.js';

/** PUT /api/logs/:id - 更新一条训练记录 */
export async function onRequestPut(context) {
  const { env, params, request } = context;
  const origin = request.headers.get('Origin') || '*';
  const id = params.id;
  if (!id) {
    return new Response(JSON.stringify({ error: 'Missing id' }), {
      status: 400,
      headers: corsHeaders(origin),
    });
  }
  if (!env.DB) {
    return new Response(JSON.stringify({ error: 'D1 未绑定' }), {
      status: 503,
      headers: corsHeaders(origin),
    });
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
    return new Response(JSON.stringify({ error: 'DB schema missing user_id. Please migrate gym_logs.' }), {
      status: 503,
      headers: corsHeaders(origin),
    });
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
      'UPDATE gym_logs SET date = ?, timestamp = ?, type = ?, label = ?, exercises = ? WHERE id = ? AND user_id = ?'
    )
      .bind(date, timestamp, type, label, exercisesStr, Number(id), openid)
      .run();
    if (meta.changes === 0) {
      return new Response(JSON.stringify({ error: 'Not found' }), {
        status: 404,
        headers: corsHeaders(origin),
      });
    }
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: corsHeaders(origin),
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e.message || 'Failed to update' }),
      { status: 500, headers: corsHeaders(origin) }
    );
  }
}

export async function onRequestDelete(context) {
  const { env, params, request } = context;
  const origin = request.headers.get('Origin') || '*';
  const id = params.id;
  if (!id) {
    return new Response(JSON.stringify({ error: 'Missing id' }), {
      status: 400,
      headers: corsHeaders(origin),
    });
  }
  if (!env.DB) {
    return new Response(JSON.stringify({ error: 'D1 未绑定' }), {
      status: 503,
      headers: corsHeaders(origin),
    });
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
    return new Response(JSON.stringify({ error: 'DB schema missing user_id. Please migrate gym_logs.' }), {
      status: 503,
      headers: corsHeaders(origin),
    });
  }
  try {
    const { meta } = await env.DB.prepare('DELETE FROM gym_logs WHERE id = ? AND user_id = ?')
      .bind(Number(id), openid)
      .run();
    if (meta.changes === 0) {
      return new Response(JSON.stringify({ error: 'Not found' }), {
        status: 404,
        headers: corsHeaders(origin),
      });
    }
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e.message || 'Failed to delete' }),
      { status: 500, headers: corsHeaders(origin) }
    );
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '86400',
      },
    });
}
