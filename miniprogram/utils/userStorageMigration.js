const { readSession } = require('./auth.js');
const { ensureDeviceId } = require('./userScope.js');

const MIG_VER = 'v1';

function openidFromSession() {
  const s = readSession();
  if (s && !s.localOnly && s.openid && String(s.openid).trim()) return String(s.openid).trim();
  return '';
}

function targetPrefix(openid) {
  return `u:${openid}:`;
}

function markKey(openid) {
  return `${targetPrefix(openid)}migrated_${MIG_VER}`;
}

function isMarked(openid) {
  try {
    return !!wx.getStorageSync(markKey(openid));
  } catch (e) {
    return false;
  }
}

function mark(openid) {
  try {
    wx.setStorageSync(markKey(openid), true);
  } catch (e) {}
}

function copyIfTargetEmpty(srcKey, dstKey) {
  try {
    const dst = wx.getStorageSync(dstKey);
    if (dst) return;
  } catch (e) {}
  try {
    const v = wx.getStorageSync(srcKey);
    if (v) wx.setStorageSync(dstKey, v);
  } catch (e) {}
}

/**
 * 将旧版本未分用户的本地缓存迁移到当前用户空间。
 * 策略：只复制、不删除（安全）；目标 key 已有数据则不覆盖。
 */
function ensureUserStorageNamespace() {
  const openid = openidFromSession();
  if (!openid) {
    // 未登录时只使用 guest 命名空间，不做迁移
    ensureDeviceId();
    return { ok: false, migrated: false };
  }
  if (isMarked(openid)) return { ok: true, migrated: false };

  const dstP = targetPrefix(openid);

  // 1) 训练计划 / 草稿
  copyIfTargetEmpty('gym_plan', `${dstP}gym_plan`);
  copyIfTargetEmpty('gym_draft', `${dstP}gym_draft`);

  // 2) 头像昵称
  copyIfTargetEmpty('gym_user_profile', `${dstP}gym_user_profile`);

  // 3) 饮食 v2 身体档案
  copyIfTargetEmpty('diet_v2_user_profile', `${dstP}diet_v2_user_profile`);

  // 4) 饮食按日缓存 diet_YYYY-MM-DD
  try {
    const info = wx.getStorageInfoSync();
    const keys = (info && info.keys) || [];
    keys.forEach((k) => {
      if (typeof k !== 'string') return;
      if (k.indexOf('diet_') !== 0) return;
      copyIfTargetEmpty(k, `${dstP}${k}`);
    });
  } catch (e) {}

  mark(openid);
  return { ok: true, migrated: true };
}

module.exports = { ensureUserStorageNamespace };

