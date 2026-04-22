const { getPlan, getDraft, saveDraft, clearDraft, ensurePlanInit } = require('../../utils/storage.js');
const { getToday, formatTitleDate } = require('../../utils/helpers.js');
const { saveLog } = require('../../utils/api.js');

function buildRows(day) {
  const plan = getPlan()[day];
  if (!plan || !plan.exercises) return [];
  const draft = getDraft();
  const rows = plan.exercises.map((ex) => ({
    name: ex.name,
    tips: ex.tips,
    repsMeta: `${ex.sets}组 × ${ex.reps}`,
    color: plan.color,
    tipsOpen: false,
    sets: Array.from({ length: ex.sets }, () => ({ weight: '', reps: '', done: false })),
  }));
  if (draft && draft.day === day && draft.exercises) {
    draft.exercises.forEach((dEx, ei) => {
      if (!rows[ei]) return;
      const dSets = dEx.sets || [];
      const need = Math.max(rows[ei].sets.length, dSets.length);
      while (rows[ei].sets.length < need) {
        rows[ei].sets.push({ weight: '', reps: '', done: false });
      }
      dSets.forEach((s, si) => {
        if (!rows[ei].sets[si]) return;
        if (s.weight != null && s.weight !== '') rows[ei].sets[si].weight = String(s.weight);
        if (s.reps != null && s.reps !== '') rows[ei].sets[si].reps = String(s.reps);
        if (s.done !== undefined) rows[ei].sets[si].done = !!s.done;
      });
    });
  }
  return rows;
}

Page({
  data: {
    currentDay: 'push',
    trainTitle: '推日',
    trainDate: '',
    isRest: false,
    planColor: '#007AFF',
    btnCls: 'push',
    exerciseRows: [],
    showFinish: false,
  },
  draftTimer: null,

  onLoad() {
    ensurePlanInit();
    this.setData({ trainDate: formatTitleDate() });
    this.rebuild();
  },

  onShow() {
    if (!this.draftTimer) {
      this.draftTimer = setInterval(() => this.persistDraft(), 30000);
    }
    if (this.data.currentDay && this.data.currentDay !== 'rest') {
      this.rebuild();
    }
  },

  onHide() {
    this.persistDraft();
    if (this.draftTimer) {
      clearInterval(this.draftTimer);
      this.draftTimer = null;
    }
  },

  onUnload() {
    if (this.draftTimer) {
      clearInterval(this.draftTimer);
      this.draftTimer = null;
    }
  },

  noop() {},

  rebuild() {
    this.applyDay(this.data.currentDay);
  },

  applyDay(day) {
    if (day === 'rest') {
      this.setData({
        currentDay: day,
        isRest: true,
        trainTitle: '休息日',
        exerciseRows: [],
        planColor: '',
        btnCls: 'push',
      });
      return;
    }
    const plan = getPlan()[day];
    if (!plan) return;
    const exerciseRows = buildRows(day);
    this.setData({
      currentDay: day,
      isRest: false,
      trainTitle: plan.label,
      planColor: plan.color,
      btnCls: plan.cls,
      exerciseRows,
    });
  },

  onSwitchDay(e) {
    const day = e.currentTarget.dataset.day;
    this.applyDay(day);
  },

  onToggleTips(e) {
    const ei = e.currentTarget.dataset.ei;
    const key = `exerciseRows[${ei}].tipsOpen`;
    const cur = this.data.exerciseRows[ei].tipsOpen;
    this.setData({ [key]: !cur });
  },

  onSetInput(e) {
    const { ei, si, f } = e.currentTarget.dataset;
    const v = e.detail.value;
    const key = `exerciseRows[${ei}].sets[${si}].${f}`;
    this.setData({ [key]: v });
  },

  onToggleDone(e) {
    const { ei, si } = e.currentTarget.dataset;
    const key = `exerciseRows[${ei}].sets[${si}].done`;
    const cur = this.data.exerciseRows[ei].sets[si].done;
    this.setData({ [key]: !cur });
  },

  onAddSet(e) {
    const ei = e.currentTarget.dataset.ei;
    const key = `exerciseRows[${ei}].sets`;
    const sets = this.data.exerciseRows[ei].sets.slice();
    sets.push({ weight: '', reps: '', done: false });
    this.setData({ [key]: sets });
  },

  persistDraft() {
    if (this.data.isRest) return;
    const ps = getCurrentPages();
    const top = ps[ps.length - 1];
    if (top && top.route && !top.route.includes('train/train')) return;
    const draft = this.collectDraft();
    if (draft) saveDraft(draft);
  },

  collectDraft() {
    if (this.data.isRest) return null;
    const { currentDay, exerciseRows } = this.data;
    const exercises = exerciseRows.map((ex) => ({
      name: ex.name,
      sets: (ex.sets || []).map((r) => ({
        weight: r.weight,
        reps: r.reps,
        done: !!r.done,
      })),
    }));
    return { day: currentDay, date: getToday(), exercises };
  },

  onSaveDraft() {
    this.persistDraft();
    wx.showToast({ title: '草稿已保存', icon: 'none' });
  },

  onOpenFinish() {
    this.setData({ showFinish: true });
  },

  onCloseFinish() {
    this.setData({ showFinish: false });
  },

  onConfirmFinish() {
    this.setData({ showFinish: false });
    if (this.data.isRest) return;
    const plan = getPlan()[this.data.currentDay];
    if (!plan) return;
    const { exerciseRows, currentDay } = this.data;
    const record = {
      date: getToday(),
      timestamp: Date.now(),
      type: currentDay,
      label: plan.label,
      exercises: exerciseRows.map((ex) => {
        const sets = [];
        (ex.sets || []).forEach((r) => {
          const w = r.weight != null ? String(r.weight).trim() : '';
          const rp = r.reps != null ? String(r.reps).trim() : '';
          if (w || rp) {
            sets.push({ weight: w, reps: rp, done: !!r.done });
          }
        });
        return { name: ex.name, sets };
      }),
    };
    saveLog(record)
      .then(() => {
        clearDraft();
        this.applyDay(currentDay);
        wx.showToast({ title: '训练已保存', icon: 'success' });
      })
      .catch((e) => {
        const m = e && e.message ? String(e.message) : '';
        wx.showToast({ title: m && m.length < 36 ? m : '保存失败', icon: 'none' });
      });
  },
});
