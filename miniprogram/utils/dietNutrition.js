/**
 * 根据各餐 foods（含 kcal/蛋白/碳水/脂肪）汇总为全天营养、每餐热量
 */
function sumFoods(foods) {
  let kcal = 0;
  let protein = 0;
  let carbs = 0;
  let fat = 0;
  (foods || []).forEach((f) => {
    kcal += Number(f.kcal) || 0;
    protein += Number(f.protein) || 0;
    carbs += Number(f.carbs) || 0;
    fat += Number(f.fat) || 0;
  });
  return {
    kcal: Math.round(kcal),
    protein: Math.round(protein * 10) / 10,
    carbs: Math.round(carbs * 10) / 10,
    fat: Math.round(fat * 10) / 10,
  };
}

/**
 * 更新每餐 calories，并计算全天 nutrition
 * @param {Array} meals
 * @returns {{ meals: Array, nutrition: { calories, protein, carbs, fat } }}
 */
function recomputeDietFromMeals(meals) {
  const next = (meals || []).map((m) => {
    const s = sumFoods(m.foods);
    return {
      ...m,
      calories: s.kcal,
      foods: m.foods || [],
    };
  });
  const day = { kcal: 0, protein: 0, carbs: 0, fat: 0 };
  next.forEach((m) => {
    (m.foods || []).forEach((f) => {
      day.kcal += Number(f.kcal) || 0;
      day.protein += Number(f.protein) || 0;
      day.carbs += Number(f.carbs) || 0;
      day.fat += Number(f.fat) || 0;
    });
  });
  return {
    meals: next,
    nutrition: {
      calories: Math.round(day.kcal),
      protein: Math.round(day.protein * 10) / 10,
      carbs: Math.round(day.carbs * 10) / 10,
      fat: Math.round(day.fat * 10) / 10,
    },
  };
}

module.exports = {
  sumFoods,
  recomputeDietFromMeals,
};
