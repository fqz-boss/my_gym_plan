/**
 * 全局「精算」身体档案：身高/年龄/性别/活动量（与按日 bodyProfile 分离）
 */
const { scopedKey } = require('./userScope.js');

const STORAGE_KEY = 'diet_v2_user_profile';

function getDefaultProfile() {
  return {
    height: '',
    age: '',
    gender: 'male',
    activity: 'moderate',
  };
}

function loadDietCalcProfile() {
  try {
    const raw = wx.getStorageSync(scopedKey(STORAGE_KEY));
    if (!raw || typeof raw !== 'object') return getDefaultProfile();
    return {
      ...getDefaultProfile(),
      height: raw.height != null && raw.height !== undefined ? String(raw.height) : '',
      age: raw.age != null && raw.age !== undefined ? String(raw.age) : '',
      gender: raw.gender === 'female' ? 'female' : 'male',
      activity: typeof raw.activity === 'string' && raw.activity ? raw.activity : 'moderate',
    };
  } catch (e) {
    return getDefaultProfile();
  }
}

function saveDietCalcProfile(p) {
  const next = {
    height: p && p.height != null ? String(p.height) : '',
    age: p && p.age != null ? String(p.age) : '',
    gender: p && p.gender === 'female' ? 'female' : 'male',
    activity: (p && p.activity) || 'moderate',
  };
  try {
    wx.setStorageSync(scopedKey(STORAGE_KEY), next);
  } catch (e) {
    // ignore
  }
  return next;
}

/**
 * 是否可启用 V2：身高/年龄/性别/活动 齐全且数值合法
 */
function hasDietV2Input(profile) {
  const p = profile || getDefaultProfile();
  const h = parseFloat(p.height);
  const a = parseInt(p.age, 10);
  if (Number.isNaN(h) || h < 100 || h > 250) return false;
  if (Number.isNaN(a) || a < 10 || a > 120) return false;
  if (p.gender !== 'male' && p.gender !== 'female') return false;
  const act = p.activity;
  const validActs = { sedentary: 1, light: 1, moderate: 1, active: 1, athlete: 1 };
  if (!act || !validActs[String(act)]) return false;
  return true;
}

module.exports = {
  STORAGE_KEY,
  getDefaultProfile,
  loadDietCalcProfile,
  saveDietCalcProfile,
  hasDietV2Input,
};
