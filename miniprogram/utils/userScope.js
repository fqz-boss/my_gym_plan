const DEVICE_KEY = 'gym_device_id_v1';

function ensureDeviceId() {
  try {
    const cur = wx.getStorageSync(DEVICE_KEY);
    if (cur && String(cur).trim()) return String(cur).trim();
  } catch (e) {}
  const id = `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
  try {
    wx.setStorageSync(DEVICE_KEY, id);
  } catch (e) {}
  return id;
}

/**
 * @returns {string} e.g. "u:<openid>:" or "guest:<deviceId>:"
 */
function scopePrefix() {
  try {
    const { readSession } = require('./auth.js');
    const s = readSession();
    if (s && !s.localOnly && s.openid && String(s.openid).trim()) {
      return `u:${String(s.openid).trim()}:`;
    }
    // localOnly 或未登录：用设备级 guest 空间，避免多微信切号串本地数据
    return `guest:${ensureDeviceId()}:`;
  } catch (e) {
    return `guest:${ensureDeviceId()}:`;
  }
}

function scopedKey(key) {
  return scopePrefix() + String(key);
}

module.exports = { scopedKey, scopePrefix, ensureDeviceId };

