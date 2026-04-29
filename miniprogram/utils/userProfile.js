const { scopedKey } = require('./userScope.js');

const KEY = 'gym_user_profile';
/** 微信对昵称脱敏时的占位，不能当真实姓名展示，也不应持久化为「已设置的称呼」 */
const PLACEHOLDER_WECHAT_NICK = '微信用户';

function normalizeDisplayNick(n) {
  const s = n && String(n).trim();
  if (!s || s === PLACEHOLDER_WECHAT_NICK) return '';
  return s;
}

function get() {
  try {
    const raw = wx.getStorageSync(scopedKey(KEY));
    if (!raw) return { nickName: '', avatarUrl: '' };
    const o = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return {
      nickName: normalizeDisplayNick(o && o.nickName),
      avatarUrl: (o && o.avatarUrl) ? String(o.avatarUrl).trim() : '',
    };
  } catch (e) {
    return { nickName: '', avatarUrl: '' };
  }
}

function set(partial) {
  const cur = get();
  const nickIn =
    partial.nickName != null ? normalizeDisplayNick(partial.nickName) : cur.nickName;
  const next = {
    nickName: nickIn,
    avatarUrl: partial.avatarUrl != null ? String(partial.avatarUrl).trim() : cur.avatarUrl,
  };
  try {
    wx.setStorageSync(scopedKey(KEY), next);
  } catch (e) {}
  return next;
}

/**
 * 将 wx.getUserProfile 的返回写入本地（须在同一次用户点击回调内先调用 getUserProfile）
 * 脱敏昵称「微信用户」不写入，真实昵称请在「我的」用 type="nickname" 或接口返回真名时才会写入
 */
function applyFromGetUserProfile(res) {
  const u = res && res.userInfo;
  if (!u) return;
  const rawNick = (u.nickName && String(u.nickName).trim()) || '';
  const av = (u.avatarUrl && String(u.avatarUrl).trim()) || '';
  if (!av && !rawNick) return;
  const next = { ...get() };
  if (av) next.avatarUrl = av;
  if (rawNick && rawNick !== PLACEHOLDER_WECHAT_NICK) {
    next.nickName = rawNick;
  }
  try {
    wx.setStorageSync(scopedKey(KEY), next);
  } catch (e) {}
}

function clear() {
  try {
    wx.removeStorageSync(scopedKey(KEY));
  } catch (e) {}
}

/** chooseAvatar 临时文件尽量 saveFile，网络 URL 直存；完成后回调 onDone 便于页面上刷新 */
function setAvatarFromChooseFile(tempPath, onDone) {
  const done = typeof onDone === 'function' ? onDone : function () {};
  const t = tempPath && String(tempPath).trim();
  if (!t) return;
  if (t.indexOf('http://') === 0 || t.indexOf('https://') === 0) {
    set({ avatarUrl: t });
    done();
    return;
  }
  wx.getFileSystemManager().saveFile({
    tempFilePath: t,
    success: (res) => {
      if (res && res.savedFilePath) set({ avatarUrl: res.savedFilePath });
      else set({ avatarUrl: t });
      done();
    },
    fail: () => {
      set({ avatarUrl: t });
      done();
    },
  });
}

module.exports = { get, set, applyFromGetUserProfile, clear, setAvatarFromChooseFile };
