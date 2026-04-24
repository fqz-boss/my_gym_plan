const { getPlan, savePlan, getDraft, saveDraft, clearDraft, ensurePlanInit } = require('../../utils/storage.js');
const { exerciseIconPath } = require('../../utils/exerciseIcons.js');
const { getToday, formatTitleDate } = require('../../utils/helpers.js');
const { getLogs, saveLog } = require('../../utils/api.js');
const { buildDashboardData, getDashGreeting } = require('../../utils/stats.js');
const {
  extractLastSetsByExerciseName,
  buildDefaultMatrixFromHistory,
  applyPrefillToExerciseRows,
} = require('../../utils/historyPrefill.js');
const { buildLogMapByDay, buildMonthWeeks, dateKeyFromParts } = require('../../utils/calendarUtil.js');

function isKeyInMonthCell(k, y, m) {
  const p = String(k || '').split('-');
  if (p.length < 3) return false;
  const yy = parseInt(p[0], 10);
  const mo = parseInt(p[1], 10);
  const d = parseInt(p[2], 10);
  if (isNaN(yy) || isNaN(mo) || isNaN(d)) return false;
  const maxD = new Date(y, m + 1, 0).getDate();
  return yy === y && mo === m + 1 && d >= 1 && d <= maxD;
}

function buildRows(day) {
  const plan = getPlan()[day];
  if (!plan || !plan.exercises) return [];
  const draft = getDraft();
  const rows = plan.exercises.map((ex) => ({
    name: ex.name,
    icon: exerciseIconPath(ex.name),
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
    planColor: '#4A90E2',
    btnCls: 'push',
    cardCls: 'push',
    exerciseRows: [],
    showFinish: false,
    dashHello: '你好',
    statWeek: '—',
    statToday: '推日',
    statTotal: '—',
    showCal: false,
    calTitle: '',
    calWeeks: [],
    calYear: 0,
    calMonth: 0,
    calNextDisabled: true,
    calWkNames: ['一', '二', '三', '四', '五', '六', '日'],
    calSelectedKey: '',
    calPickerValue: '',
    calPickerEnd: '',
  },
  draftTimer: null,
  _applyToken: 0,
  _calLogs: null,
  _calSelUser: false,

  onLoad() {
    ensurePlanInit();
    const n = new Date();
    this.setData({
      trainDate: formatTitleDate(),
      calPickerEnd: dateKeyFromParts(n.getFullYear(), n.getMonth() + 1, n.getDate()),
    });
    this.applyDay(this.data.currentDay, { silentPrefillToast: false });
  },

  onShow() {
    const n = new Date();
    this.setData({
      calPickerEnd: dateKeyFromParts(n.getFullYear(), n.getMonth() + 1, n.getDate()),
    });
    if (!this.draftTimer) {
      this.draftTimer = setInterval(() => this.persistDraft(), 30000);
    }
    if (this.data.currentDay && this.data.currentDay !== 'rest') {
      this.applyDay(this.data.currentDay, { silentPrefillToast: true });
    } else if (this.data.isRest) {
      this.loadStatsForDay('rest');
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

  loadStatsForDay(day) {
    getLogs({ lite: true })
      .then((logs) => {
        this.setData(buildDashboardData(logs, day));
      });
  },

  applyDay(day, opts) {
    const silentPrefillToast = (opts && opts.silentPrefillToast) || false;
    this._applyToken += 1;
    const token = this._applyToken;
    this.setData({ trainDate: formatTitleDate() });

    if (day === 'rest') {
      this.setData({
        currentDay: day,
        isRest: true,
        trainTitle: '休息日',
        planColor: '',
        btnCls: 'push',
        cardCls: 'rest',
        exerciseRows: [],
        dashHello: getDashGreeting(),
        statToday: '休息',
      });
      this.loadStatsForDay('rest');
      return;
    }
    const plan = getPlan()[day];
    if (!plan) return;
    const exerciseRows = buildRows(day);
    const hasDraft = !!getDraft();
    this.setData({
      currentDay: day,
      isRest: false,
      trainTitle: plan.label,
      planColor: plan.color,
      btnCls: plan.cls,
      cardCls: plan.cls,
      exerciseRows,
      dashHello: getDashGreeting(),
      ...buildDashboardData([], day),
    });

    getLogs()
      .then((logs) => {
        if (token !== this._applyToken || this.data.currentDay !== day) return;
        if (!this.data.isRest && this.data.currentDay === day) {
          const nameToSets = extractLastSetsByExerciseName(logs, day);
          const matrix = buildDefaultMatrixFromHistory(plan.exercises, nameToSets);
          const rows = JSON.parse(JSON.stringify(this.data.exerciseRows));
          const filled = applyPrefillToExerciseRows(rows, matrix);
          this.setData({
            exerciseRows: rows,
            ...buildDashboardData(logs, day),
          });
          if (filled > 0 && !getDraft() && !hasDraft && !silentPrefillToast) {
            wx.showToast({
              title: '已根据历史记录预填重量/次数，练完打勾即可',
              icon: 'none',
              duration: 2800,
            });
          }
        }
      });
  },

  onSwitchDay(e) {
    const d = e.currentTarget.dataset.day;
    this.applyDay(d, { silentPrefillToast: false });
  },

  onToggleTips(e) {
    const ei = e.currentTarget.dataset.ei;
    const k = `exerciseRows[${ei}].tipsOpen`;
    const cur = this.data.exerciseRows[ei].tipsOpen;
    this.setData({ [k]: !cur });
  },

  onExerciseNameInput(e) {
    const ei = parseInt(e.currentTarget.dataset.ei, 10);
    if (isNaN(ei)) return;
    const { currentDay } = this.data;
    if (!currentDay || currentDay === 'rest') return;
    const raw = e.detail.value != null ? String(e.detail.value) : '';
    const name = raw.trim() ? raw.trim() : '新动作';
    const p = getPlan();
    if (!p[currentDay] || !p[currentDay].exercises || !p[currentDay].exercises[ei]) return;
    p[currentDay].exercises[ei].name = name;
    savePlan(p);
    this.setData({
      [`exerciseRows[${ei}].name`]: name,
      [`exerciseRows[${ei}].icon`]: exerciseIconPath(name),
    });
  },

  onSetInput(e) {
    const { ei, si, f } = e.currentTarget.dataset;
    const v = e.detail.value;
    const key = `exerciseRows[${ei}].sets[${si}].${f}`;
    this.setData({ [key]: v });
  },

  onToggleDone(e) {
    const { ei, si } = e.currentTarget.dataset;
    const k = `exerciseRows[${ei}].sets[${si}].done`;
    const cur = this.data.exerciseRows[ei].sets[si].done;
    const next = !cur;
    this.setData({ [k]: next });
    if (next) {
      try {
        wx.vibrateShort({ type: 'light' });
      } catch (err) {}
    }
  },

  onAddSet(e) {
    const ei = e.currentTarget.dataset.ei;
    const sets = this.data.exerciseRows[ei].sets.slice();
    const prev = sets[sets.length - 1];
    const nw = (prev && prev.weight) || '';
    const nr = (prev && prev.reps) || '';
    sets.push({ weight: nw, reps: nr, done: false });
    this.setData({ [`exerciseRows[${ei}].sets`]: sets });
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

  onOpenCal() {
    this._calSelUser = false;
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    this.setData({ showCal: true });
    const cached = this._calLogs;
    this.renderCalMonth(y, m, Array.isArray(cached) ? cached : []);
    wx.showLoading({ title: '加载中', mask: true });
    getLogs({ lite: true })
      .then(
        (logs) => {
          this._calLogs = logs;
          this.renderCalMonth(y, m, logs);
        },
        () => {}
      )
      .then(
        () => {
          try {
            wx.hideLoading();
          } catch (e) {}
        },
        () => {
          try {
            wx.hideLoading();
          } catch (e) {}
        }
      );
  },

  renderCalMonth(y, m, logs) {
    const logMap = buildLogMapByDay(logs);
    const { calTitle, calWeeks } = buildMonthWeeks(y, m, logMap);
    const now = new Date();
    const yN = now.getFullYear();
    const mN = now.getMonth();
    const dN = now.getDate();
    const calNextDisabled = y === yN && m === mN;
    const calPickerValue = `${y}-${String(m + 1).padStart(2, '0')}-01`;
    const calPickerEnd = dateKeyFromParts(yN, mN + 1, dN);
    const todayKey = dateKeyFromParts(yN, mN + 1, dN);
    const sameView =
      y === this.data.calYear && m === this.data.calMonth;
    let calSelectedKey = '';
    if (this._calSelUser && sameView && isKeyInMonthCell(this.data.calSelectedKey, y, m)) {
      calSelectedKey = this.data.calSelectedKey;
    } else if (!this._calSelUser && y === yN && m === mN) {
      calSelectedKey = todayKey;
    }
    this.setData({
      calTitle,
      calWeeks,
      calYear: y,
      calMonth: m,
      calNextDisabled,
      calPickerValue,
      calPickerEnd,
      calSelectedKey,
    });
  },

  onPrevCalMonth() {
    this._calSelUser = false;
    let y = this.data.calYear;
    let mo = this.data.calMonth - 1;
    if (mo < 0) {
      mo = 11;
      y -= 1;
    }
    this.renderCalMonth(y, mo, this._calLogs || []);
  },

  onNextCalMonth() {
    if (this.data.calNextDisabled) return;
    this._calSelUser = false;
    let y = this.data.calYear;
    let mo = this.data.calMonth + 1;
    if (mo > 11) {
      mo = 0;
      y += 1;
    }
    this.renderCalMonth(y, mo, this._calLogs || []);
  },

  closeCal() {
    this.setData({ showCal: false });
  },

  onCalSelectDay(e) {
    const raw = e.currentTarget.dataset;
    if (raw.empty === true || raw.empty === 'true' || raw.empty === 1 || raw.empty === '1') return;
    const k = raw.key;
    if (!k || String(k).indexOf('pad-') === 0 || String(k).indexOf('tail-') === 0) return;
    const { calWeeks } = this.data;
    let cell = null;
    if (Array.isArray(calWeeks)) {
      for (let wi = 0; wi < calWeeks.length; wi += 1) {
        const wk = calWeeks[wi];
        if (!Array.isArray(wk)) continue;
        for (let ci = 0; ci < wk.length; ci += 1) {
          const c = wk[ci];
          if (c && c.key === k) {
            cell = c;
            break;
          }
        }
        if (cell) break;
      }
    }
    if (cell && cell.hasLog && cell.logs && cell.logs.length) {
      const go = (id) => {
        if (id == null) return;
        wx.navigateTo({ url: `/pages/log-edit/log-edit?id=${id}` });
      };
      if (cell.logs.length === 1) {
        go(cell.logs[0].id);
        return;
      }
      const list = cell.logs.map((t) => {
        const lb = t.label && String(t.label).trim() ? t.label : '';
        return lb ? `${t.short} · ${lb}` : `${t.short}练日`;
      });
      wx.showActionSheet({
        itemList: list,
        success: (res) => {
          const idx = res.tapIndex;
          if (idx >= 0 && idx < cell.logs.length) go(cell.logs[idx].id);
        },
      });
      return;
    }
    this._calSelUser = true;
    this.setData({ calSelectedKey: k });
  },

  onCalMonthPick(e) {
    this._calSelUser = false;
    const v = e.detail && e.detail.value;
    if (!v) return;
    const p = String(v).split(/[-/]/);
    if (p.length < 2) return;
    const y = parseInt(p[0], 10);
    const mo1 = parseInt(p[1], 10);
    if (isNaN(y) || isNaN(mo1) || mo1 < 1 || mo1 > 12) return;
    const mo = mo1 - 1;
    this.renderCalMonth(y, mo, this._calLogs || []);
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
        this.applyDay(currentDay, { silentPrefillToast: true });
        wx.showToast({ title: '训练已保存', icon: 'success' });
      })
      .catch((e) => {
        const m = e && e.message ? String(e.message) : '';
        wx.showToast({ title: m && m.length < 36 ? m : '保存失败', icon: 'none' });
      });
  },
});
