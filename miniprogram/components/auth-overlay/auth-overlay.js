const { isLoggedIn, loginWithWeChat, isLocalSession } = require('../../utils/auth.js');
const { allowLocalAuthIfServerUnavailable } = require('../../config.js');

Component({
  properties: {
    visible: { type: Boolean, value: false },
    /** 与 promptLogin 文案一致，说明为何需要登录 */
    hint: { type: String, value: '' },
  },
  data: {
    btnLoading: false,
    hMsg: '',
  },
  observers: {
    visible(v) {
      if (!v) {
        this.setData({ btnLoading: false, hMsg: '' });
      }
    },
  },
  methods: {
    onClose() {
      this.setData({ btnLoading: false, hMsg: '' });
      this.triggerEvent('close');
    },
    onWeixinLogin() {
      if (this.data.btnLoading || this._authProfileLock) return;
      this._authProfileLock = true;
      const { applyFromGetUserProfile } = require('../../utils/userProfile.js');
      const endLock = () => {
        this._authProfileLock = false;
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
              this.triggerEvent('success', { server: true });
              this.triggerEvent('close');
              return;
            }
            if (isLocalSession()) {
              if (r.err === 'SERVER_NOT_CONFIGURED' || r.err === 'server' || r.err === 'network' || r.err === 'unknown') {
                if (allowLocalAuthIfServerUnavailable) {
                  wx.showToast({ title: '已进入（本机）', icon: 'none' });
                }
              } else {
                wx.showToast({ title: '已登录', icon: 'none' });
              }
              this.triggerEvent('success', { server: false, local: true });
              this.triggerEvent('close');
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
  },
});
