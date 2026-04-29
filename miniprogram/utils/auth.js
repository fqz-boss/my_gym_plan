const { apiBase, allowLocalAuthIfServerUnavailable } = require('../config.js');

const SESSION_KEY = 'gym_auth_v1';

/**
 * @returns {object | null}
 */
function readSession() {
  try {
    const raw = wx.getStorageSync(SESSION_KEY);
    if (!raw) return null;
    return typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch (e) {
    return null;
  }
}

function writeSession(s) {
  if (!s) {
    try {
      wx.removeStorageSync(SESSION_KEY);
    } catch (e) {}
    return;
  }
  try {
    wx.setStorageSync(SESSION_KEY, s);
  } catch (e) {}
}

function isLoggedIn() {
  const s = readSession();
  if (!s) return false;
  if (s.localOnly) return true;
  if (s.token && s.expiresAt && s.expiresAt <= Date.now()) {
    writeSession(null);
    return false;
  }
  if (s.token && (!s.expiresAt || s.expiresAt > Date.now())) return true;
  return false;
}

/**
 * 供 api.js 等发起请求时携带
 * @returns {string} 非服務端会話时返回空字串
 */
function getAuthToken() {
  const s = readSession();
  if (!s || s.localOnly || !s.token) return '';
  if (s.expiresAt && s.expiresAt <= Date.now()) return '';
  return s.token;
}

/**
 * 展示用：是否本机/体验会話
 * @returns {boolean}
 */
function isLocalSession() {
  const s = readSession();
  return !!(s && s.localOnly);
}

/**
 * 微信 openid 后4位，供「我的」展示
 */
function getOpenidDisplay() {
  const s = readSession();
  if (!s || !s.openid) return '';
  const o = String(s.openid);
  return o.length <= 4 ? o : o.slice(-4);
}

function clearSession() {
  writeSession(null);
}

function makeLocalSession() {
  writeSession({
    localOnly: true,
    at: Date.now(),
  });
}

/**
 * 调用 wx.login 后向服务端用 code 换会話；失败时按配置可写入本机会話
 * @returns {Promise<{ server: boolean, err?: string }>}
 */
function loginWithWeChat() {
  return new Promise((resolve) => {
    wx.login({
      success: (r) => {
        if (!r || !r.code) {
          resolve({ server: false, err: '无法获取微信登录凭证' });
          return;
        }
        const code = r.code;
        wx.request({
          url: `${apiBase}/api/wx-auth-login`,
          method: 'POST',
          header: { 'Content-Type': 'application/json' },
          data: { code },
          timeout: 20000,
          success(res) {
            const b = res.data;
            const body = typeof b === 'string' && b
              ? (() => { try { return JSON.parse(b); } catch (e) { return {}; } })()
              : b || {};
            if (res.statusCode >= 200 && res.statusCode < 300 && body && body.token) {
              writeSession({
                localOnly: false,
                token: body.token,
                openid: body.openid || '',
                expiresAt: body.expiresAt || Date.now() + 30 * 864e5 * 10,
              });
              resolve({ server: true });
              return;
            }
            const notConfigured = !!(body && body.notConfigured);
            if (notConfigured && allowLocalAuthIfServerUnavailable) {
              makeLocalSession();
              resolve({ server: false, err: 'SERVER_NOT_CONFIGURED' });
              return;
            }
            if (res.statusCode >= 500 && res.statusCode < 600 && allowLocalAuthIfServerUnavailable) {
              makeLocalSession();
              resolve({ server: false, err: 'server' });
              return;
            }
            if (res.statusCode >= 400 && res.statusCode < 500) {
              resolve({ server: false, err: (body && body.error) || `登录失败（${res.statusCode}）` });
              return;
            }
            if (allowLocalAuthIfServerUnavailable) {
              makeLocalSession();
              resolve({ server: false, err: 'unknown' });
              return;
            }
            resolve({ server: false, err: (body && body.error) || `登录失败（${res.statusCode}）` });
          },
          fail() {
            if (allowLocalAuthIfServerUnavailable) {
              makeLocalSession();
              resolve({ server: false, err: 'network' });
            } else {
              resolve({ server: false, err: '网络异常' });
            }
          },
        });
      },
      fail: () => {
        resolve({ server: false, err: '微信登录失败' });
      },
    });
  });
}

/** 在 tab 页用浮层授权，不跳转子页；与 train/diet/profile 的 openAuthOverlay 配合 */
const TAB_AUTH_ROUTES = {
  'pages/train/train': true,
  'pages/diet/index': true,
  'pages/profile/profile': true,
};

/**
 * 需要登录时：在「训练/饮食/我的」直接打开当前页上的授权浮层；其它页先系统弹窗再进授权子页
 * @param {{ title?: string, content?: string, onCancel?: function }} [opts]
 */
function promptLogin(opts) {
  const o = opts || {};
  if (isLoggedIn()) return;
  const pages = getCurrentPages();
  const page = pages[pages.length - 1];
  const route = page && page.route;
  if (route && TAB_AUTH_ROUTES[route] && page && typeof page.openAuthOverlay === 'function') {
    page.openAuthOverlay(o);
    return;
  }
  wx.showModal({
    title: o.title || '需要登录',
    content: o.content || '使用此功能前需完成微信授权',
    confirmText: '去登录',
    cancelText: '取消',
    success(res) {
      if (res.confirm) {
        wx.navigateTo({ url: '/pages/auth/auth' });
      } else if (typeof o.onCancel === 'function') {
        o.onCancel();
      }
    },
  });
}

module.exports = {
  SESSION_KEY,
  isLoggedIn,
  getAuthToken,
  isLocalSession,
  getOpenidDisplay,
  clearSession,
  loginWithWeChat,
  makeLocalSession,
  readSession,
  promptLogin,
};
