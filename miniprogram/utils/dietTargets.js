/**
 * 根据体重(kg)与目标(减脂/增肌/维持)计算建议日热量与宏量(克)
 * - 简单模式：24×体重 粗算（与历史行为一致）
 * - 精算模式：BMR+TDEE（dietCalcV2），在身高/年龄/性别/活动 齐全时启用
 */
const { calcDietPlanV2 } = require('./dietCalcV2.js');
const { hasDietV2Input, loadDietCalcProfile } = require('./dietCalcProfile.js');

const GOALS = { CUT: 'cut', BULK: 'bulk', MAINTAIN: 'maintain' };

function round1(x) {
  return Math.round(x * 10) / 10;
}

/**
 * 粗算层：维护热量用 24×体重 作「可对照」的粗估
 * @param {number} weightKg
 * @param {'cut'|'bulk'|'maintain'} goal
 * @returns {{ kcal: number, protein: number, carbs: number, fat: number, maintenance: number, mode: 'simple' }}
 */
function computeMacroTargets(weightKg, goal) {
  const w = Math.min(200, Math.max(35, Number(weightKg) || 0));
  const isCut = goal === GOALS.CUT;
  const isBulk = goal === GOALS.BULK;

  const maintenance = 24 * w;
  let kcal = isCut ? maintenance * 0.82 : isBulk ? maintenance * 1.1 : maintenance;
  kcal = Math.round(Math.max(1200, Math.min(5500, kcal)));

  let protein = isCut ? w * 2.0 : w * 1.8;
  let fat = isCut ? w * 0.8 : w * 0.9;
  if (!isCut && !isBulk) {
    protein = w * 1.8;
    fat = w * 0.85;
  }
  const minCarbG = 40;

  let carbK = kcal - protein * 4 - fat * 9;
  let carbs = carbK / 4;
  if (carbs < minCarbG) {
    const fatMax = (kcal - protein * 4 - minCarbG * 4) / 9;
    if (fatMax >= w * 0.5) {
      fat = Math.max(w * 0.55, Math.min(fat, fatMax));
    }
    carbK = kcal - protein * 4 - fat * 9;
    carbs = Math.max(0, carbK / 4);
  }
  if (carbs < 0) {
    const maxFat = isCut ? w * 0.8 : isBulk ? w * 0.9 : w * 0.85;
    fat = (kcal - protein * 4) / 9;
    fat = Math.max(0.5 * w, Math.min(fat, maxFat));
    carbs = Math.max(0, (kcal - protein * 4 - fat * 9) / 4);
  }

  return {
    mode: 'simple',
    maintenance: Math.round(maintenance),
    kcal: Math.round(kcal),
    protein: round1(protein),
    fat: round1(fat),
    carbs: round1(Math.max(0, carbs)),
  };
}

/**
 * 统一体重校验
 * @param {string|number} weight
 */
function parseValidWeightKg(weight) {
  const w = parseFloat(weight);
  if (Number.isNaN(w) || w < 30 || w > 250) return null;
  return w;
}

function normalizeGoal(g) {
  if (g === GOALS.BULK) return GOALS.BULK;
  if (g === GOALS.MAINTAIN) return GOALS.MAINTAIN;
  return GOALS.CUT;
}

/**
 * 将 V2 结果与页面既有字段对齐
 * @param {ReturnType<typeof calcDietPlanV2>} v2
 */
function mapV2ToResult(v2) {
  return {
    mode: 'advanced',
    kcal: v2.calories,
    maintenance: v2.tdee,
    protein: v2.protein,
    fat: v2.fat,
    carbs: v2.carbs,
    bmr: v2.bmr,
    tdee: v2.tdee,
  };
}

/**
 * @param {string|number} weight
 * @param {string} goal
 * @param {object} [dietV2Profile] — 可选，不传则从 loadDietCalcProfile() 取
 * @returns {null|object} null 无有效体重
 */
function tryComputeFromBody(weight, goal, dietV2Profile) {
  const w = parseValidWeightKg(weight);
  if (w == null) return null;

  const g = normalizeGoal(goal);
  const profile = dietV2Profile != null ? dietV2Profile : loadDietCalcProfile();

  if (hasDietV2Input(profile)) {
    const h = parseFloat(profile.height);
    const age = parseInt(profile.age, 10);
    const v2 = calcDietPlanV2({
      weight: w,
      height: h,
      age,
      gender: profile.gender,
      activity: profile.activity,
      goal: g,
    });
    if (!v2 || [v2.calories, v2.bmr, v2.tdee].some((n) => Number.isNaN(n))) {
      return computeMacroTargets(w, g);
    }
    return mapV2ToResult(v2);
  }

  return computeMacroTargets(w, g);
}

module.exports = {
  GOALS,
  computeMacroTargets,
  tryComputeFromBody,
  parseValidWeightKg,
  hasDietV2Input,
  loadDietCalcProfile,
};
