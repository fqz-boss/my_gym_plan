const {
  isLoggedIn,
  clearSession,
  promptLogin,
} = require('../../utils/auth.js');
const userProfile = require('../../utils/userProfile.js');
const { setAvatarFromChooseFile } = userProfile;

Page({
  data: {
    showLoggedIn: false,
    authOverlayVisible: false,
    authOverlayHint: '',
    userAvatarUrl: '',
    userNickName: '',
  },

  onLoad() {
    this._syncUserProfile();
    this._syncAuth();
  },

  onShow() {
    this._syncUserProfile();
    this._syncAuth();
  },

  _syncAuth() {
    this.setData({
      showLoggedIn: isLoggedIn(),
    });
  },

  _syncUserProfile() {
    const p = userProfile.get();
    this.setData({
      userAvatarUrl: p.avatarUrl || '',
      userNickName: p.nickName || '',
    });
  },

  onChooseAvatar(e) {
    if (!isLoggedIn()) return;
    const url = e.detail && e.detail.avatarUrl;
    if (!url) return;
    setAvatarFromChooseFile(url, () => this._syncUserProfile());
  },

  onProfileNickConfirm(e) {
    if (!isLoggedIn()) return;
    const v = e.detail && e.detail.value != null ? String(e.detail.value).trim() : '';
    userProfile.set({ nickName: v });
    this.setData({ userNickName: v });
  },

  openAuthOverlay(opts) {
    const o = opts || {};
    this.setData({
      authOverlayVisible: true,
      authOverlayHint: o.content != null && o.content !== '' ? String(o.content) : '',
    });
  },
  onAuthOverlayClose() {
    this.setData({ authOverlayVisible: false, authOverlayHint: '' });
  },
  onAuthOverlaySuccess() {
    this.setData({ authOverlayVisible: false, authOverlayHint: '' });
    this._syncUserProfile();
    this._syncAuth();
  },

  onOpenPlan() {
    if (!isLoggedIn()) {
      promptLogin({ content: '查看与编辑训练计划前需先完成微信授权' });
      return;
    }
    wx.navigateTo({ url: '/pages/plan/plan' });
  },

  onDietSettings() {
    if (!isLoggedIn()) {
      promptLogin({ content: '编辑身体与营养信息前需先完成微信授权' });
      return;
    }
    wx.navigateTo({ url: '/pages/diet-settings/diet-settings' });
  },

  onGoLogin() {
    if (isLoggedIn()) return;
    this.openAuthOverlay({ content: '' });
  },

  onLogout() {
    wx.showModal({
      title: '退出',
      content: '退出后使用部分功能时会再次提示登录',
      success: (r) => {
        if (!r.confirm) return;
        clearSession();
        userProfile.clear();
        this._syncUserProfile();
        this._syncAuth();
        wx.showToast({ title: '已退出', icon: 'none' });
      },
    });
  },
});
