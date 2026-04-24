/**
 * 精算模式：BMR (Mifflin–St Jeor) + TDEE + 目标热量 + 宏量（碳水由剩余热量填充）
 * 不依赖第三方库。
 */

/** 活动系数：TDEE = BMR × 系数 */
const ACTIVITY_MULTIPLIER = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  athlete: 1.9,
};

const GOAL_FACTOR = {
  cut: 0.82,
  bulk: 1.1,
  maintain: 1,
};

const KCAL_MIN = 1200;
const KCAL_MAX = 5500;
const MIN_CARB_G = 40;

function safeNum(n, d = 0) {
  const x = Number(n);
  return Number.isFinite(x) && !Number.isNaN(x) ? x : d;
}

/**
 * 静息代谢率 (Mifflin–St Jeor)
 * 男: 10W + 6.25H − 5A + 5
 * 女: 10W + 6.25H − 5A − 161
 */
function calcBMR(params) {
  const w = safeNum(params && params.weight, 0);
  const h = safeNum(params && params.height, 0);
  const age = safeNum(params && params.age, 0);
  const g = params && params.gender;
  const base = 10 * w + 6.25 * h - 5 * age;
  if (g === 'female') {
    return base - 161;
  }
  return base + 5;
}

function calcTDEE(bmr, activityLevel) {
  const b = safeNum(bmr, 0);
  const m = ACTIVITY_MULTIPLIER[activityLevel] != null
    ? ACTIVITY_MULTIPLIER[activityLevel]
    : ACTIVITY_MULTIPLIER.sedentary;
  return b * m;
}

function calcTargetCalories(tdee, goal) {
  const t = safeNum(tdee, 0);
  const f = GOAL_FACTOR[goal] != null ? GOAL_FACTOR[goal] : GOAL_FACTOR.maintain;
  let k = t * f;
  k = Math.max(KCAL_MIN, Math.min(KCAL_MAX, k));
  return k;
}

/**
 * 蛋白/脂肪按 g/kg，碳水 = (总热量 − 4×P − 9×F) / 4
 * 若碳水 < 40g，则下调脂肪后重算（与粗算层逻辑一致：保护最低碳水）
 */
function calcMacros(weight, calories, goal) {
  const w = safeNum(weight, 0);
  const kcal = safeNum(calories, 0);
  const g = goal === 'cut' ? 'cut' : goal === 'bulk' ? 'bulk' : 'maintain';

  let pPerKg = 1.8;
  let fPerKg = 0.85;
  if (g === 'cut') {
    pPerKg = 2.0;
    fPerKg = 0.8;
  } else if (g === 'bulk') {
    pPerKg = 1.8;
    fPerKg = 0.9;
  } else {
    pPerKg = 1.8;
    fPerKg = 0.85;
  }

  let protein = w * pPerKg;
  let fat = w * fPerKg;
  const isCut = g === 'cut';
  const isBulk = g === 'bulk';

  let carbK = kcal - protein * 4 - fat * 9;
  let carbs = carbK / 4;
  if (carbs < MIN_CARB_G) {
    const fatMax = (kcal - protein * 4 - MIN_CARB_G * 4) / 9;
    if (fatMax >= w * 0.5) {
      const floor = isCut ? w * 0.55 : isBulk ? w * 0.6 : w * 0.57;
      fat = Math.max(floor, Math.min(fat, fatMax));
    }
    carbK = kcal - protein * 4 - fat * 9;
    carbs = Math.max(0, carbK / 4);
  }
  if (carbs < 0) {
    fat = (kcal - protein * 4) / 9;
    const minF = 0.5 * w;
    const maxF = isCut ? w * 0.8 : isBulk ? w * 0.9 : w * 0.85;
    fat = Math.max(minF, Math.min(fat, maxF));
    carbs = Math.max(0, (kcal - protein * 4 - fat * 9) / 4);
  }

  return {
    protein: Math.max(0, protein),
    fat: Math.max(0, fat),
    carbs: Math.max(0, carbs),
  };
}

/**
 * @param {object} params
 * @param {number} params.weight — kg
 * @param {number} params.height — cm
 * @param {number} params.age — 岁
 * @param {'male'|'female'} params.gender
 * @param {keyof typeof ACTIVITY_MULTIPLIER} params.activity
 * @param {'cut'|'bulk'|'maintain'} params.goal
 */
function calcDietPlanV2(params) {
  const w = safeNum(params && params.weight, 0);
  const h = safeNum(params && params.height, 0);
  const age = safeNum(params && params.age, 0);
  const gender = params && params.gender;
  const activity = (params && params.activity) || 'sedentary';
  const goal = (params && params.goal) || 'maintain';

  const bmr = calcBMR({ weight: w, height: h, age, gender: gender === 'female' ? 'female' : 'male' });
  const tdee = calcTDEE(bmr, activity);
  const kcal = calcTargetCalories(tdee, goal);
  const m = calcMacros(w, kcal, goal);

  return {
    calories: Math.round(kcal),
    protein: Math.round(m.protein),
    fat: Math.round(m.fat),
    carbs: Math.round(m.carbs),
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
  };
}

module.exports = {
  ACTIVITY_MULTIPLIER,
  calcBMR,
  calcTDEE,
  calcTargetCalories,
  calcMacros,
  calcDietPlanV2,
};
