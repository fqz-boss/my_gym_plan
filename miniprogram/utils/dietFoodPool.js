/**
 * 健身向健康食物池：按早/中/晚归类。每条为「1 个标准份」的近似营养。
 * grams：该标准份的可食部约重(g)，ml 类按 1g≈1ml 近似，便于合计克重与科普展示。
 */
const MEAL_TYPES = ['breakfast', 'lunch', 'dinner'];

const POOL = {
  breakfast: [
    { id: 'bf_egg', name: '煮鸡蛋', portion: '1个', grams: 50, kcal: 72, protein: 6.3, carbs: 0.4, fat: 4.8, category: '蛋白', meal: 'breakfast', advice: '市售鸡蛋约 50g/个(去壳可食部)。全蛋约 72kcal。减脂期常见搭配：1 个全蛋 + 额外鸡蛋白。' },
    { id: 'bf_oat', name: '燕麦片（干）', portion: '50g', grams: 50, kcal: 190, protein: 6.5, carbs: 32, fat: 3.5, category: '主食', meal: 'breakfast' },
    { id: 'bf_milk', name: '低脂牛奶', portion: '250ml', grams: 250, kcal: 105, protein: 8, carbs: 12, fat: 2.5, category: '乳制品', meal: 'breakfast', macroKey: 'carbs' },
    { id: 'bf_yogurt', name: '无糖希腊酸奶', portion: '150g', grams: 150, kcal: 120, protein: 15, carbs: 5, fat: 3, category: '乳制品', meal: 'breakfast' },
    { id: 'bf_bread', name: '全麦吐司', portion: '1片约30g', grams: 30, kcal: 75, protein: 3.5, carbs: 14, fat: 1, category: '主食', meal: 'breakfast' },
    { id: 'bf_corn', name: '玉米', portion: '1段约100g（熟）', grams: 100, kcal: 96, protein: 3.4, carbs: 21, fat: 1.2, category: '主食', meal: 'breakfast' },
    { id: 'bf_mantou', name: '馒头', portion: '1个约50g', grams: 50, kcal: 117, protein: 3.5, carbs: 24, fat: 0.5, category: '主食', meal: 'breakfast' },
    { id: 'bf_banana', name: '香蕉', portion: '1根约100g', grams: 100, kcal: 89, protein: 1.1, carbs: 23, fat: 0.3, category: '水果', meal: 'breakfast' },
    { id: 'bf_apple', name: '苹果', portion: '1个约180g', grams: 180, kcal: 95, protein: 0.5, carbs: 25, fat: 0.3, category: '水果', meal: 'breakfast' },
    { id: 'bf_blueberry', name: '蓝莓', portion: '60g', grams: 60, kcal: 34, protein: 0.4, carbs: 8, fat: 0.2, category: '水果', meal: 'breakfast' },
    { id: 'bf_spinach', name: '菠菜（少油清炒）', portion: '100g', grams: 100, kcal: 45, protein: 2.5, carbs: 3, fat: 2.5, category: '蔬菜', meal: 'breakfast' },
    { id: 'bf_nut', name: '巴旦木', portion: '15g', grams: 15, kcal: 88, protein: 3, carbs: 3, fat: 7.5, category: '优质脂肪', meal: 'breakfast' },
    { id: 'bf_cottage', name: '低脂白干酪', portion: '100g', grams: 100, kcal: 90, protein: 16, carbs: 3, fat: 1.5, category: '蛋白', meal: 'breakfast' },
    { id: 'bf_chia', name: '奇亚籽', portion: '10g', grams: 10, kcal: 48, protein: 1.5, carbs: 4, fat: 3, category: '纤维', meal: 'breakfast' },
  ],
  lunch: [
    { id: 'ln_rice', name: '糙米饭（熟）', portion: '200g', grams: 200, kcal: 260, protein: 5, carbs: 55, fat: 2, category: '主食', meal: 'lunch' },
    { id: 'ln_quinoa', name: '藜麦饭（熟）', portion: '180g', grams: 180, kcal: 220, protein: 8, carbs: 40, fat: 3, category: '主食', meal: 'lunch' },
    { id: 'ln_chicken', name: '水煮鸡胸肉', portion: '150g', grams: 150, kcal: 248, protein: 47, carbs: 0, fat: 5.5, category: '蛋白', meal: 'lunch' },
    { id: 'ln_beef', name: '牛肉', portion: '瘦牛里脊/牛腱 瘦切100g·少油', grams: 100, kcal: 180, protein: 26, carbs: 0, fat: 8, category: '蛋白', meal: 'lunch' },
    { id: 'ln_thigh', name: '去皮鸡腿肉', portion: '蒸或烤 150g（生重约同）', grams: 150, kcal: 220, protein: 30, carbs: 0, fat: 10, category: '蛋白', meal: 'lunch' },
    { id: 'ln_fish', name: '巴沙鱼（蒸）', portion: '150g', grams: 150, kcal: 135, protein: 28, carbs: 0, fat: 2.5, category: '蛋白', meal: 'lunch' },
    { id: 'ln_broc', name: '西兰花', portion: '150g', grams: 150, kcal: 51, protein: 4, carbs: 10, fat: 0.5, category: '蔬菜', meal: 'lunch' },
    { id: 'ln_aspar', name: '芦笋', portion: '120g', grams: 120, kcal: 30, protein: 3, carbs: 5, fat: 0.2, category: '蔬菜', meal: 'lunch' },
    { id: 'ln_tomato', name: '番茄', portion: '150g', grams: 150, kcal: 27, protein: 1.3, carbs: 5.5, fat: 0.3, category: '蔬菜', meal: 'lunch' },
    { id: 'ln_tofu', name: '北豆腐', portion: '150g', grams: 150, kcal: 120, protein: 12, carbs: 4, fat: 7, category: '蛋白', meal: 'lunch' },
    { id: 'ln_sweet', name: '红薯（蒸）', portion: '150g', grams: 150, kcal: 135, protein: 1.5, carbs: 32, fat: 0.2, category: '主食', meal: 'lunch' },
    { id: 'ln_salad', name: '混合生菜沙拉', portion: '1碗约120g', grams: 120, kcal: 35, protein: 1.5, carbs: 6, fat: 0.5, category: '蔬菜', meal: 'lunch' },
    { id: 'ln_olive', name: '橄榄油（凉拌用）', portion: '5g', grams: 5, kcal: 45, protein: 0, carbs: 0, fat: 5, category: '优质脂肪', meal: 'lunch' },
  ],
  dinner: [
    { id: 'dn_salmon', name: '三文鱼（烤）', portion: '120g', grams: 120, kcal: 250, protein: 25, carbs: 0, fat: 16, category: '蛋白', meal: 'dinner' },
    { id: 'dn_cod', name: '鳕鱼（蒸）', portion: '150g', grams: 150, kcal: 120, protein: 27, carbs: 0, fat: 1, category: '蛋白', meal: 'dinner' },
    { id: 'dn_shrimp', name: '白灼虾', portion: '150g', grams: 150, kcal: 140, protein: 30, carbs: 1, fat: 1.5, category: '蛋白', meal: 'dinner' },
    { id: 'dn_mixed', name: '杂粮饭（熟）', portion: '150g', grams: 150, kcal: 195, protein: 4.5, carbs: 40, fat: 1.5, category: '主食', meal: 'dinner' },
    { id: 'dn_pumpkin', name: '蒸南瓜', portion: '200g', grams: 200, kcal: 90, protein: 2, carbs: 20, fat: 0.2, category: '蔬菜', meal: 'dinner' },
    { id: 'dn_cucumber', name: '黄瓜', portion: '150g', grams: 150, kcal: 24, protein: 1, carbs: 4, fat: 0.2, category: '蔬菜', meal: 'dinner' },
    { id: 'dn_kiwi', name: '猕猴桃', portion: '1个约100g', grams: 100, kcal: 60, protein: 1, carbs: 14, fat: 0.5, category: '水果', meal: 'dinner' },
    { id: 'dn_broth', name: '菌菇时蔬汤（少油）', portion: '1碗约300ml', grams: 300, kcal: 50, protein: 2, carbs: 5, fat: 2, category: '蔬菜', meal: 'dinner' },
    { id: 'dn_thigh', name: '去皮鸡腿肉', portion: '蒸或烤 120g', grams: 120, kcal: 176, protein: 24, carbs: 0, fat: 8, category: '蛋白', meal: 'dinner' },
    { id: 'dn_beef', name: '牛肉', portion: '瘦切80g·少油煎/炒', grams: 80, kcal: 150, protein: 21, carbs: 0, fat: 7, category: '蛋白', meal: 'dinner' },
    { id: 'dn_turkey', name: '火鸡胸（烤）', portion: '100g', grams: 100, kcal: 135, protein: 30, carbs: 0, fat: 0.5, category: '蛋白', meal: 'dinner' },
    { id: 'dn_eggwh', name: '鸡蛋白', portion: '3个', grams: 100, kcal: 50, protein: 11, carbs: 0.6, fat: 0, category: '蛋白', meal: 'dinner' },
    { id: 'dn_avo', name: '牛油果', portion: '1/4个约40g', grams: 40, kcal: 64, protein: 0.8, carbs: 3.5, fat: 5.8, category: '优质脂肪', meal: 'dinner' },
    { id: 'dn_zucchini', name: '西葫芦（清炒）', portion: '200g', grams: 200, kcal: 36, protein: 2, carbs: 6, fat: 1, category: '蔬菜', meal: 'dinner' },
  ],
};

const BY_ID = {};
['breakfast', 'lunch', 'dinner'].forEach((k) => {
  (POOL[k] || []).forEach((item) => {
    BY_ID[item.id] = item;
  });
});

function getPoolByMeal(type) {
  return (POOL[type] || []).slice();
}

function findFoodById(id) {
  return BY_ID[id] || null;
}

function round1(x) {
  return Math.round(x * 10) / 10;
}

/** 比展示用：整数不保留小数，否则一位小数 */
function fmtNum(x) {
  const n = Number(x);
  if (Number.isNaN(n)) return '—';
  const r = round1(n);
  if (Math.abs(r - Math.round(r)) < 0.05) return String(Math.round(r));
  return r.toFixed(1);
}

/** 每份 1–50 份 */
function normalizeQty(q) {
  const n = Math.round(Number(q));
  if (Number.isNaN(n) || n < 1) return 1;
  return Math.min(50, n);
}

function genericAdvice(p) {
  return `以下营养按标准份量「${p.portion}」及约重 ${p.grams != null ? p.grams + 'g' : '（见品名）'} 估算。食材大小、部位与烹饪用油不同会有偏差，建议以厨房秤与成分表为准。`;
}

/** 按分类/条目约定显示「蛋白 / 碳水 / 脂肪」哪一项；可在池子里用 macroKey 覆盖 */
const AMOUNT_MACRO_LABELS = { protein: '蛋白', carbs: '碳水', fat: '脂肪' };
const AMOUNT_MACRO_BY_CATEGORY = {
  蛋白: 'protein',
  主食: 'carbs',
  水果: 'carbs',
  蔬菜: 'carbs',
  纤维: 'carbs',
  优质脂肪: 'fat',
  坚果: 'fat',
  乳制品: 'protein',
};

function getAmountMacroKey(item) {
  if (item.macroKey === 'protein' || item.macroKey === 'carbs' || item.macroKey === 'fat') {
    return item.macroKey;
  }
  return AMOUNT_MACRO_BY_CATEGORY[item.category] || 'protein';
}

function totalAmountMacroGrams(item, qty, macroKey) {
  const q = normalizeQty(qty);
  if (macroKey === 'protein') return round1((item.protein || 0) * q);
  if (macroKey === 'carbs') return round1((item.carbs || 0) * q);
  return round1((item.fat || 0) * q);
}

/**
 * 副标题极短一行：总可食部克重 + 与分类对应的一项宏量（按池子 1 份标量×份数）
 * 例：200g 碳水110g、100g 蛋白12.6g
 */
function formatAmountLine(item, qty) {
  const q = normalizeQty(qty);
  const mKey = getAmountMacroKey(item);
  const mLabel = AMOUNT_MACRO_LABELS[mKey] || '蛋白';
  const mG = totalAmountMacroGrams(item, q, mKey);
  if (item.grams == null) {
    return `${mLabel}${fmtNum(mG)}g`;
  }
  const totalG = Math.round(item.grams * q);
  return `${totalG}g ${mLabel}${fmtNum(mG)}g`;
}

/**
 * 将食物池条目 + 份数 转为可存入计划的一行
 * @param {object} item
 * @param {number} [qty]
 */
function toPlannedFood(item, qty) {
  if (!item) return null;
  const q = normalizeQty(qty);
  return {
    id: item.id,
    name: item.name,
    portion: item.portion,
    qty: q,
    amount: formatAmountLine(item, q),
    grams: item.grams != null ? Math.round(item.grams * q) : undefined,
    kcal: Math.round(item.kcal * q),
    protein: round1(item.protein * q),
    carbs: round1(item.carbs * q),
    fat: round1(item.fat * q),
  };
}

/**
 * 长按/详情面板用：单条食物完整说明
 * @param {string} id
 * @param {number} [qty] 选餐弹层中当前选中的份数
 */
function getFoodDetailForId(id, qty) {
  const p = findFoodById(id);
  if (!p) return null;
  const q = normalizeQty(qty);
  const totalG = p.grams != null ? Math.round(p.grams * q) : null;
  const k100 = p.grams && p.grams > 0 ? Math.round((p.kcal / p.grams) * 100) : null;
  return {
    id: p.id,
    name: p.name,
    category: p.category,
    portion: p.portion,
    portionGrams: p.grams,
    qty: q,
    totalGrams: totalG,
    kcal: Math.round(p.kcal * q),
    protein: round1(p.protein * q),
    carbs: round1(p.carbs * q),
    fat: round1(p.fat * q),
    kcalPer100g: k100,
    /** 每份（×1 时与表内一致，便于理解「一份」 */
    perPortion: {
      kcal: p.kcal,
      protein: round1(p.protein),
      carbs: round1(p.carbs),
      fat: round1(p.fat),
    },
    advice: p.advice || genericAdvice(p),
  };
}

module.exports = {
  POOL,
  MEAL_TYPES,
  getPoolByMeal,
  findFoodById,
  toPlannedFood,
  normalizeQty,
  getFoodDetailForId,
  formatAmountLine,
  getAmountMacroKey,
};
