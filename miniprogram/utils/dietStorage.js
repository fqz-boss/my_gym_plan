const { getPoolByMeal, toPlannedFood, findFoodById } = require('./dietFoodPool.js');
const { recomputeDietFromMeals } = require('./dietNutrition.js');
const { scopePrefix } = require('./userScope.js');

const STORAGE_PREFIX = 'diet_';

/** 无本地缓存时的默认日计划（从食物池取样例，营养已重算） */
function getDefaultDiet() {
  const meals = [
    {
      type: 'breakfast',
      name: '早餐',
      time: '07:30',
      icon: '☀️',
      foods: getPoolByMeal('breakfast')
        .slice(0, 2)
        .map(toPlannedFood)
        .filter(Boolean),
    },
    {
      type: 'lunch',
      name: '午餐',
      time: '12:15',
      icon: '🌤',
      foods: getPoolByMeal('lunch')
        .slice(0, 3)
        .map(toPlannedFood)
        .filter(Boolean),
    },
    {
      type: 'dinner',
      name: '晚餐',
      time: '19:00',
      icon: '🌙',
      foods: getPoolByMeal('dinner')
        .slice(0, 3)
        .map(toPlannedFood)
        .filter(Boolean),
    },
  ];
  const { meals: m2, nutrition } = recomputeDietFromMeals(meals);
  return { meals: m2, nutrition };
}

/**
 * 读取某日完整包；无则默认
 * @param {string} dateKey YYYY-MM-DD
 */
function loadDietForDate(dateKey) {
  const storageKey = `${scopePrefix()}${STORAGE_PREFIX}${dateKey}`;
  try {
    const raw = wx.getStorageSync(storageKey);
    if (raw) {
      const v = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (v && v.nutrition && Array.isArray(v.meals)) {
        return remergeNutritionIfNeeded(v);
      }
    }
  } catch (e) {}
  return getDefaultDiet();
}

/** 按食物 id 用池子补全 kcal/宏量（老缓存仅有 name/amount 时） */
function enrichMealFoodsFromPool(meals) {
  return (meals || []).map((m) => ({
    ...m,
    foods: (m.foods || []).map((f) => {
      if (!f || !f.id) return f;
      const p = findFoodById(f.id);
      if (!p) return f;
      const q = f.qty != null && f.qty > 0 ? Number(f.qty) : 1;
      return { ...f, ...toPlannedFood(p, q) };
    }),
  }));
}

/** 老数据无每食 kcal 时补算 */
function remergeNutritionIfNeeded(v) {
  const merged = enrichMealFoodsFromPool(v.meals);
  const { meals, nutrition } = recomputeDietFromMeals(merged);
  return { ...v, meals, nutrition };
}

function saveDietToStorage(dateKey, payload) {
  const storageKey = `${scopePrefix()}${STORAGE_PREFIX}${dateKey}`;
  try {
    wx.setStorageSync(storageKey, payload);
  } catch (e) {}
}

module.exports = {
  getDefaultDiet,
  loadDietForDate,
  saveDietToStorage,
  STORAGE_PREFIX,
};
