const { apiBase } = require('../config.js');

function request({ url, method, data }) {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiBase + url,
      method: method || 'GET',
      data: data || undefined,
      header: { 'Content-Type': 'application/json' },
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

function getLogs() {
  return request({ url: '/api/logs' })
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

module.exports = {
  getLogs,
  saveLog,
  deleteLogById,
  updateLog,
};
