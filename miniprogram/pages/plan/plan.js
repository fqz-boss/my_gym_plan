const { getPlan, savePlan } = require('../../utils/storage.js');
const { PLAN_SECTIONS } = require('../../utils/defaults.js');
const { movePlanExercise } = require('../../utils/planReorder.js');

function hitTestToIndex(rects, y) {
  if (!rects || !rects.length) return 0;
  const last = rects[rects.length - 1];
  if (y >= last.bottom) return rects.length;
  for (let i = 0; i < rects.length; i += 1) {
    const r = rects[i];
    if (y < r.top + r.height / 2) return i;
  }
  return rects.length - 1;
}

Page({
  data: {
    plan: { push: { exercises: [] }, pull: { exercises: [] }, leg: { exercises: [] } },
    days: [
      { key: 'push', label: '推日' },
      { key: 'pull', label: '拉日' },
      { key: 'leg', label: '腿日' },
    ],
    sections: [],
    showEdit: false,
    editDay: '',
    editI: 0,
    eName: '',
    eSets: 4,
    eReps: '',
    eTips: '',
  },
  noop() {},

  onDragStart(e) {
    this._drag = { day: e.currentTarget.dataset.day, from: e.currentTarget.dataset.i };
  },
  onDragMove() {},
  onDragEnd(e) {
    if (!this._drag) return;
    const { day, from } = this._drag;
    this._drag = null;
    if (!e.changedTouches || !e.changedTouches.length) return;
    const y = e.changedTouches[0].clientY;
    const fromIdx = parseInt(from, 10);
    if (isNaN(fromIdx)) return;
    const q = wx.createSelectorQuery().in(this);
    q.selectAll(`#list-${day} .plan-ex-row`).boundingClientRect();
    q.exec((res) => {
      const rects = res[0];
      if (!rects || !rects.length) return;
      const to = hitTestToIndex(rects, y);
      if (movePlanExercise(day, fromIdx, to)) {
        this.setData({ plan: getPlan() });
      }
    });
  },

  onLoad() {
    this.refreshPlan();
    const sections = PLAN_SECTIONS.map((s) => ({
      title: s.title,
      html: s.body,
      _open: false,
    }));
    this.setData({ sections });
  },
  onShow() {
    this.refreshPlan();
  },
  refreshPlan() {
    this.setData({ plan: getPlan() });
  },
  onToggleSec(e) {
    const i = e.currentTarget.dataset.idx;
    const k = `sections[${i}]._open`;
    this.setData({ [k]: !this.data.sections[i]._open });
  },
  onOpenEdit(e) {
    const day = e.currentTarget.dataset.day;
    const i = e.currentTarget.dataset.i;
    const p = getPlan();
    const ex = p[day].exercises[i];
    this.setData({
      showEdit: true,
      editDay: day,
      editI: i,
      eName: ex.name,
      eSets: ex.sets,
      eReps: ex.reps || '',
      eTips: ex.tips || '',
    });
  },
  onCloseEdit() {
    this.setData({ showEdit: false });
  },
  onEName(e) {
    this.setData({ eName: e.detail.value });
  },
  onESets(e) {
    this.setData({ eSets: e.detail.value });
  },
  onEReps(e) {
    this.setData({ eReps: e.detail.value });
  },
  onETips(e) {
    this.setData({ eTips: e.detail.value });
  },
  onSaveEx() {
    const p = getPlan();
    const { editDay, editI, eName, eSets, eReps, eTips } = this.data;
    p[editDay].exercises[editI] = {
      name: (eName && eName.trim()) || '新动作',
      sets: parseInt(eSets, 10) || 4,
      reps: (eReps && eReps.trim()) || '8-12RM',
      tips: (eTips && eTips.trim()) || '',
    };
    savePlan(p);
    this.setData({ showEdit: false, plan: p });
    wx.showToast({ title: '已保存' });
  },
  onDeleteEx(e) {
    const day = e.currentTarget.dataset.day;
    const i = e.currentTarget.dataset.i;
    wx.showModal({
      title: '确认',
      content: '确定删除该动作？',
      success: (r) => {
        if (!r.confirm) return;
        const p = getPlan();
        p[day].exercises.splice(i, 1);
        savePlan(p);
        this.setData({ plan: p });
        wx.showToast({ title: '已删除' });
      },
    });
  },
  onAddEx(e) {
    const day = e.currentTarget.dataset.day;
    const p = getPlan();
    p[day].exercises.push({ name: '新动作', sets: 4, reps: '8-12RM', tips: '' });
    savePlan(p);
    this.setData({ plan: p });
    wx.showToast({ title: '已添加' });
  },
});
