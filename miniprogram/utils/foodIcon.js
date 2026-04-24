/**
 * 食物名 / 食物池 id → emoji。优先按 id 一一对应，避免仅按「蛋白」等类别错配。
 * 名称侧：长关键词先匹配，减少「鱼」「鸡」误伤。
 */

/** 与 dietFoodPool 中 id 一一对应（选餐格图文一致） */
const POOL_ICON_BY_ID = {
  bf_egg: '🥚',
  bf_oat: '🥣',
  bf_milk: '🥛',
  bf_yogurt: '🥛',
  bf_bread: '🍞',
  bf_corn: '🌽',
  bf_mantou: '🫓',
  bf_banana: '🍌',
  bf_apple: '🍎',
  /* 🫐 在部分旧 Android 不显示，用 🍇 作兼容占位 */
  bf_blueberry: '🍇',
  bf_spinach: '🥬',
  bf_nut: '🥜',
  bf_cottage: '🧀',
  bf_chia: '🌱',
  ln_rice: '🍚',
  ln_quinoa: '🌾',
  ln_chicken: '🐔',
  ln_beef: '🥩',
  ln_thigh: '🍗',
  ln_fish: '🐟',
  ln_broc: '🥦',
  ln_aspar: '🌿',
  ln_tomato: '🍅',
  ln_tofu: '🥡',
  ln_sweet: '🍠',
  ln_salad: '🥗',
  ln_olive: '🫒',
  dn_salmon: '🐟',
  dn_cod: '🐟',
  dn_shrimp: '🦐',
  dn_mixed: '🍚',
  dn_pumpkin: '🎃',
  dn_cucumber: '🥒',
  dn_kiwi: '🥝',
  dn_broth: '🍲',
  dn_thigh: '🍗',
  dn_beef: '🥩',
  dn_turkey: '🦃',
  dn_eggwh: '🥚',
  dn_avo: '🥑',
  dn_zucchini: '🥒',
};

/**
 * 长词优先，再匹配短词
 * @type {Array<[string, string]>}
 */
const NAME_PATTERNS = [
  ['去皮鸡腿', '🍗'],
  ['水煮鸡胸', '🐔'],
  ['鸡蛋白', '🥚'],
  ['希腊酸奶', '🥛'],
  ['全麦吐司', '🍞'],
  ['燕麦片', '🥣'],
  ['巴沙鱼', '🐟'],
  ['糙米饭', '🍚'],
  ['藜麦饭', '🌾'],
  ['杂粮饭', '🍚'],
  ['混合生菜', '🥗'],
  ['菌菇时蔬', '🍲'],
  ['白灼虾', '🦐'],
  ['火鸡胸', '🦃'],
  ['去皮鸡', '🍗'],
  ['西兰花', '🥦'],
  ['牛油果', '🥑'],
  ['橄榄油', '🫒'],
  ['欧芹', '🌿'], // 占位防扩展
  ['鸡腿', '🍗'],
  ['鸡胸', '🐔'],
  ['牛肉', '🥩'],
  ['豆腐', '🥡'],
  ['三文鱼', '🐟'],
  ['鳕鱼', '🐟'],
  ['虾仁', '🦐'],
  ['猕猴桃', '🥝'],
  ['蓝莓', '🍇'],
  ['酸奶', '🥛'],
  ['牛奶', '🥛'],
  ['鸡蛋', '🥚'],
  ['燕麦', '🥣'],
  ['香蕉', '🍌'],
  ['苹果', '🍎'],
  ['玉米', '🌽'],
  ['馒头', '🫓'],
  ['红薯', '🍠'],
  ['番茄', '🍅'],
  ['芦笋', '🌿'],
  ['南瓜', '🎃'],
  ['黄瓜', '🥒'],
  ['沙拉', '🥗'],
  ['菠菜', '🥬'],
  ['坚果', '🥜'],
  ['米饭', '🍚'],
  ['鱼', '🐟'],
  ['虾', '🦐'],
  ['鸡', '🍗'],
  ['牛', '🥩'],
  ['面包', '🍞'],
  ['面条', '🍜'],
];

function foodIconForName(name) {
  const s = String(name || '').replace(/\s/g, '');
  if (!s) return '🍽️';
  const sorted = NAME_PATTERNS.slice().sort((a, b) => b[0].length - a[0].length);
  for (let i = 0; i < sorted.length; i += 1) {
    const [k, icon] = sorted[i];
    if (k && s.indexOf(k) !== -1) return icon;
  }
  return '🍽️';
}

/**
 * 食物池项或含 id 的对象（用于选餐格）
 * @param {{ id?: string, name?: string }} item
 */
function foodIconForPoolItem(item) {
  if (item && item.id && POOL_ICON_BY_ID[item.id]) {
    return POOL_ICON_BY_ID[item.id];
  }
  return foodIconForName(item && item.name);
}

/** 饮食计划里只按名称时 */
function foodIconForDietFood(f) {
  if (f && f.id && POOL_ICON_BY_ID[f.id]) {
    return POOL_ICON_BY_ID[f.id];
  }
  return foodIconForName(f && f.name);
}

module.exports = {
  foodIconForName,
  foodIconForPoolItem,
  foodIconForDietFood,
  POOL_ICON_BY_ID,
};
