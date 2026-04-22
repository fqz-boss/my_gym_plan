const { getLogs, deleteLogById } = require('../../utils/api.js');

Page({
  data: {
    loading: true,
    logs: [],
  },
  onShow() {
    this.load();
  },
  load() {
    this.setData({ loading: true });
    getLogs()
      .then((raw) => {
        const logs = (raw || []).map((l) => ({ ...l, _open: false }));
        this.setData({ loading: false, logs });
      })
      .catch(() => {
        this.setData({ loading: false, logs: [] });
      });
  },
  onToggleItem(e) {
    const idx = e.currentTarget.dataset.idx;
    const k = `logs[${idx}]._open`;
    this.setData({ [k]: !this.data.logs[idx]._open });
  },
  onEdit(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/log-edit/log-edit?id=${id}` });
  },
  onDelete(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '确认',
      content: '确定删除此条记录？',
      success: (r) => {
        if (!r.confirm) return;
        deleteLogById(id)
          .then(() => {
            this.load();
            wx.showToast({ title: '已删除', icon: 'success' });
          })
          .catch(() => {
            wx.showToast({ title: '删除失败', icon: 'none' });
          });
      },
    });
  },
});
