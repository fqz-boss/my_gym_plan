const { getLogs, updateLog } = require('../../utils/api.js');
const { exerciseIconPath } = require('../../utils/exerciseIcons.js');

const TYPE_LABELS = ['推日', '拉日', '腿日'];
const TYPES = ['push', 'pull', 'leg'];
const MAP = { push: '推日', pull: '拉日', leg: '腿日' };

Page({
  data: {
    ready: false,
    id: null,
    timestamp: 0,
    date: '',
    typeIndex: 0,
    typeLabels: TYPE_LABELS,
    viewTitle: '推日',
    cardCls: 'push',
    exercises: [],
  },
  noop() {},
  onLoad(query) {
    const id = query.id;
    if (!id) {
      wx.showToast({ title: '参数错误', icon: 'none' });
      return;
    }
    getLogs()
      .catch(() => [])
      .then((logs) => {
      const log = (logs || []).find((l) => String(l.id) === String(id));
      if (!log) {
        wx.showToast({ title: '未找到记录', icon: 'none' });
        setTimeout(() => wx.navigateBack(), 500);
        return;
      }
      const _ti = TYPES.indexOf(log.type);
      const ti = _ti >= 0 ? _ti : 0;
      const cls = TYPES[ti] || 'push';
      this.setData({
        ready: true,
        id: log.id,
        timestamp: log.timestamp != null ? log.timestamp : Date.now(),
        date: log.date || '',
        typeIndex: ti,
        viewTitle: TYPE_LABELS[ti],
        cardCls: cls,
        exercises: (log.exercises || []).map((ex) => ({
          name: ex.name || '动作',
          icon: exerciseIconPath(ex.name || '动作'),
          sets: (ex.sets || []).map((s) => ({
            weight: s.weight != null ? String(s.weight) : '',
            reps: s.reps != null ? String(s.reps) : '',
            done: !!s.done,
          })),
        })),
      });
    });
  },
  onInputDate(e) {
    this.setData({ date: e.detail.value });
  },
  onPickType(e) {
    const idx = parseInt(e.detail.value, 10) || 0;
    const day = TYPES[idx] || 'push';
    this.setData({
      typeIndex: idx,
      cardCls: day,
      viewTitle: TYPE_LABELS[idx],
    });
  },
  onExName(e) {
    const eix = e.currentTarget.dataset.eix;
    const v = e.detail.value != null ? String(e.detail.value) : '';
    this.setData({
      [`exercises[${eix}].name`]: v,
      [`exercises[${eix}].icon`]: exerciseIconPath(v.trim() ? v : '新动作'),
    });
  },
  onSetInp(e) {
    const { eix, six, f } = e.currentTarget.dataset;
    const key = `exercises[${eix}].sets[${six}].${f}`;
    this.setData({ [key]: e.detail.value });
  },
  onToggleSetDone(e) {
    const { eix, six } = e.currentTarget.dataset;
    const k = `exercises[${eix}].sets[${six}].done`;
    this.setData({ [k]: !this.data.exercises[eix].sets[six].done });
  },
  onSave() {
    const { id, date, typeIndex, timestamp, exercises } = this.data;
    if (!String(date).trim()) {
      wx.showToast({ title: '请填写日期', icon: 'none' });
      return;
    }
    const type = TYPES[typeIndex] || 'push';
    const payload = {
      date: String(date).trim(),
      timestamp: timestamp || Date.now(),
      type,
      label: MAP[type] || '推日',
      exercises: (exercises || []).map((ex) => ({
        name: (ex.name || '').trim() || '动作',
        sets: (ex.sets || []).map((s) => ({
          weight: s.weight,
          reps: s.reps,
          done: !!s.done,
        })),
      })),
    };
    updateLog(id, payload)
      .then(() => {
        wx.showToast({ title: '已保存' });
        setTimeout(() => wx.navigateBack(), 500);
      })
      .catch((e) => {
        const m = e && e.message ? String(e.message) : '保存失败';
        wx.showToast({ title: m.length < 40 ? m : '保存失败', icon: 'none' });
      });
  },
});
