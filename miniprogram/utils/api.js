const { apiBase } = require('../config.js');

const DEFAULT_TIMEOUT_MS = 30000;
/** 仅对 GET 做有限重试，避免重复 POST/PUT/DELETE */
const GET_RETRIES = 2;
const RETRY_DELAY_MS = 450;

function request({ url, method, data, timeout }) {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiBase + url,
      method: method || 'GET',
      data: data || undefined,
      header: { 'Content-Type': 'application/json' },
      timeout: timeout != null ? timeout : DEFAULT_TIMEOUT_MS,
      success(res) {
        const { statusCode, data: body } = res;
        let b = body;
        if (typeof b === 'string' && b) {
          try {
            b = JSON.parse(b);
          } catch (e) {}
        }
        if (statusCode >= 200 && statusCode < 300) {
          if (statusCode === 204) resolve(null);
          else resolve(b);
        } else {
          const msg =
            b && (b.error || b.message) ? b.error || b.message : `HTTP ${statusCode}`;
          reject(new Error(msg));
        }
      },
      fail(err) {
        reject(new Error(err.errMsg || 'network error'));
      },
    });
  });
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * 带重试的 GET（弱网/跨境场景下更稳）
 * @param {{ url: string, timeout?: number }} config
 * @param {number} [attempt] 内部使用
 */
function getWithRetry(config, attempt) {
  const a = attempt != null ? attempt : 0;
  return request({
    url: config.url,
    method: 'GET',
    timeout: config.timeout,
  }).catch((err) => {
    if (a < GET_RETRIES - 1) {
      return sleep(RETRY_DELAY_MS * (a + 1)).then(() => getWithRetry(config, a + 1));
    }
    return Promise.reject(err);
  });
}

/**
 * 拉取训练记录
 * @param {{ lite?: boolean }} [options] lite=true 时不拉取 exercises 大字段，仅统计/日历用，减轻体积与等待
 * @returns {Promise<Array>}
 */
function getLogs(options) {
  const lite = options && options.lite;
  const path = lite ? '/api/logs?lite=1' : '/api/logs';
  return getWithRetry({ url: path })
    .then((body) => (Array.isArray(body) ? body : []))
    .catch(() => []);
}

function saveLog(record) {
  return request({ url: '/api/logs', method: 'POST', data: record });
}

function deleteLogById(id) {
  return request({ url: `/api/logs/${id}`, method: 'DELETE' });
}

function updateLog(id, payload) {
  return request({ url: `/api/logs/${id}`, method: 'PUT', data: payload });
}

// ——— 饮食规划（预留；接好 GET/POST 路由后把 TODO 改为真实 request）———
/**
 * 拉取某日饮食（nutrition + meals）
 * @param {string} dateKey YYYY-MM-DD
 * @returns {Promise<object|null>}
 */
function fetchDietByDate(dateKey) {
  // TODO: return getWithRetry({ url: `/api/diet?date=${encodeURIComponent(dateKey)}` }).catch(() => null);
  return Promise.resolve(null);
}

/**
 * 保存某日饮食
 * @param {string} dateKey YYYY-MM-DD
 * @param {object} payload { nutrition, meals }
 */
function saveDietForDate(dateKey, payload) {
  // TODO: return request({ url: '/api/diet', method: 'POST', data: { date: dateKey, ...payload } });
  return Promise.resolve(null);
}

/**
 * AI 生成饮食（预留）
 * @param {object} opts 如 { date, trainingType, caloriesTarget }
 */
function requestAiDietPlan(opts) {
  // TODO: return request({ url: '/api/diet/ai', method: 'POST', data: opts || {} });
  return Promise.resolve(null);
}

module.exports = {
  getLogs,
  saveLog,
  deleteLogById,
  updateLog,
  fetchDietByDate,
  saveDietForDate,
  requestAiDietPlan,
};
