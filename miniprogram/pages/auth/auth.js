const { isLoggedIn, loginWithWeChat, isLocalSession } = require('../../utils/auth.js');
const { allowLocalAuthIfServerUnavailable } = require('../../config.js');
const { applyFromGetUserProfile } = require('../../utils/userProfile.js');

function finishLoginNavigation() {
  setTimeout(() => {
    const p = getCurrentPages();
    if (p.length >= 2) {
      wx.navigateBack();
    } else {
      wx.switchTab({ url: '/pages/train/train' });
    }
  }, 320);
}

Page({
  data: {
    btnLoading: false,
    hMsg: '',
  },

  onLoad() {
    if (isLoggedIn()) {
      setTimeout(() => {
        const p = getCurrentPages();
        if (p.length > 1) {
          wx.navigateBack();
        } else {
          wx.switchTab({ url: '/pages/train/train' });
        }
      }, 0);
    }
  },

  onShow() {
    if (!isLoggedIn()) {
      this.setData({ hMsg: '' });
    }
  },

  onWeixinLogin() {
    if (this.data.btnLoading || this._authPageLock) return;
    this._authPageLock = true;
    const endLock = () => {
      this._authPageLock = false;
      this.setData({ btnLoading: false });
    };
    const doLogin = () => {
      this.setData({ btnLoading: true, hMsg: '正在向微信与服务器申请凭证…' });
      loginWithWeChat()
        .then((r) => {
          if (!isLoggedIn()) {
            this.setData({ hMsg: r && r.err ? String(r.err) : '请重试' });
            wx.showToast({ title: (r && r.err) || '失败', icon: 'none' });
            return;
          }
          if (r && r.server) {
            wx.showToast({ title: '已登录', icon: 'success' });
            this.setData({ hMsg: '已与微信及云端建立会話' });
            finishLoginNavigation();
            return;
          }
          if (isLocalSession()) {
            if (r.err === 'SERVER_NOT_CONFIGURED' || r.err === 'server' || r.err === 'network' || r.err === 'unknown') {
              const tip = allowLocalAuthIfServerUnavailable
                ? '当前以本机会話使用。上线前请在云函数环境变量中配置 WECHAT_MINI_APPID 与 WECHAT_MINI_SECRET 以实现与微信的正式绑定。'
                : '登录异常';
              this.setData({ hMsg: tip });
              wx.showToast({ title: '已进入（本机）', icon: 'none' });
            } else {
              this.setData({ hMsg: r.err || '已登录' });
              wx.showToast({ title: '已登录', icon: 'none' });
            }
            finishLoginNavigation();
          }
        })
        .catch(() => {
          this.setData({ hMsg: '异常，请重试' });
          wx.showToast({ title: '失败', icon: 'none' });
        })
        .then(() => endLock());
    };
    if (typeof wx.getUserProfile !== 'function') {
      doLogin();
      return;
    }
    wx.getUserProfile({
      desc: '用于在首页、个人中心展示你的微信头像与昵称',
      success: (res) => {
        applyFromGetUserProfile(res);
      },
      complete: doLogin,
    });
  },
});
