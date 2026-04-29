const { loadDietCalcProfile, saveDietCalcProfile } = require('../../utils/dietCalcProfile.js');
const { isLoggedIn, promptLogin } = require('../../utils/auth.js');

const ACTIVITY_LIST = [
  { key: 'sedentary', label: '久坐 (办公室为主)' },
  { key: 'light', label: '轻度 (每周运动 1–3 次)' },
  { key: 'moderate', label: '中度 (每周 3–5 次)' },
  { key: 'active', label: '活跃 (每天运动或重体力)' },
  { key: 'athlete', label: '运动员/极高强度' },
];

function pickActivityIndex(k) {
  const i = ACTIVITY_LIST.findIndex((x) => x.key === k);
  return i >= 0 ? i : 2;
}

Page({
  data: {
    height: '',
    age: '',
    gender: 'male',
    activityIndex: 2,
    activityList: ACTIVITY_LIST,
  },

  onLoad() {
    const p = loadDietCalcProfile();
    this.setData({
      height: p.height || '',
      age: p.age || '',
      gender: p.gender || 'male',
      activityIndex: pickActivityIndex(p.activity),
    });
  },

  onHeightInput(e) {
    this.setData({ height: (e && e.detail && e.detail.value) != null ? String(e.detail.value) : '' });
  },
  onAgeInput(e) {
    this.setData({ age: (e && e.detail && e.detail.value) != null ? String(e.detail.value) : '' });
  },
  onGenderTap(e) {
    const g = e && e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.g;
    if (g !== 'male' && g !== 'female') return;
    this.setData({ gender: g });
  },
  onActivityChange(e) {
    const v = e && e.detail && e.detail.value;
    const i = parseInt(v, 10);
    if (Number.isNaN(i) || i < 0 || i >= ACTIVITY_LIST.length) return;
    this.setData({ activityIndex: i });
  },

  onSave() {
    if (!isLoggedIn()) {
      promptLogin({ content: '保存身体与营养信息前需先完成微信授权' });
      return;
    }
    const { height, age, gender, activityIndex, activityList } = this.data;
    const act = activityList[activityIndex] && activityList[activityIndex].key;
    saveDietCalcProfile({ height, age, gender, activity: act || 'moderate' });
    wx.showToast({ title: '已保存', icon: 'success' });
    setTimeout(() => {
      wx.navigateBack({ fail: () => {} });
    }, 500);
  },
});
