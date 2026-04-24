/**
 * 饮食规划页逻辑：日期、营养汇总、选餐弹层、存储。
 * 展示样式由 pages/diet/index.wxss 控制（Keep / Health 风卡片、无业务态字段）。
 * 预留服务端：utils/api.js 内 fetchDietByDate、saveDietForDate、requestAiDietPlan（见文件末尾注释）
 * 编辑饮食 / AI 生成：在子页保存成功后调用 saveDietToStorage + api.saveDietForDate
 */
const {
  getPoolByMeal,
  findFoodById,
  toPlannedFood,
  getFoodDetailForId,
} = require('../../utils/dietFoodPool.js');
const { recomputeDietFromMeals } = require('../../utils/dietNutrition.js');
const { loadDietForDate, saveDietToStorage } = require('../../utils/dietStorage.js');
const { foodIconForDietFood, foodIconForPoolItem } = require('../../utils/foodIcon.js');
const { tryComputeFromBody, GOALS } = require('../../utils/dietTargets.js');

const FP_TITLES = { breakfast: '早餐', lunch: '午餐', dinner: '晚餐' };
const KCAL_DEFAULT = 2000;

function computeKcalBar(nutrition, kcalTarget) {
  const c = (nutrition && Number(nutrition.calories)) || 0;
  const t = (kcalTarget > 0 ? kcalTarget : KCAL_DEFAULT) || 1;
  return Math.min(100, Math.round((c / t) * 100));
}

function pad2(n) {
  return String(n).padStart(2, '0');
}

function fpMapGetQty(map, id) {
  if (!map || !id) return 0;
  const v = map[id];
  if (v === true) return 1;
  const n = Number(v);
  return n > 0 && !Number.isNaN(n) ? n : 0;
}

function fpCountSelected(map) {
  if (!map) return 0;
  return Object.keys(map).filter((k) => fpMapGetQty(map, k) > 0).length;
}

/** @returns {string} YYYY-MM-DD */
function dateToKey(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/** @param {string} key YYYY-MM-DD */
function keyToDate(key) {
  const p = String(key).split('-');
  if (p.length < 3) return new Date();
  const y = parseInt(p[0], 10);
  const m = parseInt(p[1], 10) - 1;
  const day = parseInt(p[2], 10);
  return new Date(y, m, day);
}

/** @param {string} key YYYY-MM-DD */
function displayFmt(key) {
  const p = String(key).split('-');
  if (p.length < 3) return key;
  return `${p[0]}/${p[1]}/${p[2]}`;
}

function ensureMealFoodIcons(meals) {
  return (meals || []).map((m) => ({
    ...m,
    foods: (m.foods || []).map((f) => ({
      ...f,
      icon: f.icon || foodIconForDietFood(f),
    })),
  }));
}

Page({
  noop() {},
  data: {
    currentDate: '',
    displayDate: '',
    kcalTarget: KCAL_DEFAULT,
    kcalBarWidth: 0,
    kcalOver: false,
    /** 体重与目标，用于算建议摄入 */
    bodyWeight: '',
    bodyGoal: GOALS.CUT,
    /** 'simple' | 'advanced' — 来自 dietTargets */
    dietCalcMode: 'simple',
    dietBmr: 0,
    dietTdee: 0,
    hasBodyTarget: false,
    targetMaint: 0,
    targetProtein: 0,
    targetCarbs: 0,
    targetFat: 0,
    nutrition: {
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
    },
    meals: [],
    /* 食物池弹层（不跳转子页） */
    fpShow: false,
    fpMealIndex: 0,
    fpMealType: 'breakfast',
    fpMealTitle: '早餐',
    fpPool: [],
    fpSearchText: '',
    fpCategoryKey: 'all',
    fpCategories: [],
    fpFiltered: [],
    fpSelectedMap: {},
    fpSelectedCount: 0,
    fpSelectedKcal: 0,
    fpSelectedTags: [],
    /** 食物说明弹层（选餐/三餐列表里长按） */
    fpDetailShow: false,
    fpDetail: null,
    /** 三餐内食物：长按松手=详情；长按后拖动=删除 */
    mealPressReady: null,
    mealDragActive: false,
    mealDragGhost: null,
    mealDeleteZoneHighlight: false,
  },

  onLoad() {
    const info = wx.getSystemInfoSync();
    this._wh = (info && info.windowHeight) || 667;
    this._deleteZoneTopRatio = 0.74;
    const t = dateToKey(new Date());
    this.applyDate(t);
  },

  onShow() {
    const d = this.data.currentDate;
    if (d) this.applyDate(d);
  },

  applyDate(dateKey) {
    const bundle = loadDietForDate(dateKey);
    const meals = ensureMealFoodIcons(bundle.meals);
    const nut = bundle.nutrition || { calories: 0, protein: 0, carbs: 0, fat: 0 };
    const bp = bundle.bodyProfile || {};
    const bodyW = bp.weight != null && bp.weight !== undefined ? String(bp.weight) : '';
    let bodyG = GOALS.CUT;
    if (bp.goal === GOALS.BULK) bodyG = GOALS.BULK;
    else if (bp.goal === GOALS.MAINTAIN) bodyG = GOALS.MAINTAIN;
    this._setTargetsFromBody(bodyW, bodyG, nut, dateKey, meals, { persist: false });
  },

  /** 从体重/目标反算建议，并 setData；persist 为 true 时写入当日 diet 缓存 */
  _setTargetsFromBody(bodyW, bodyG, nut, dateKey, meals, opts) {
    const o = opts || { persist: false };
    const calc = tryComputeFromBody(bodyW, bodyG);
    const kTarget = calc ? calc.kcal : KCAL_DEFAULT;
    if (o.persist) {
      const bundle = loadDietForDate(dateKey);
      const next = {
        ...bundle,
        bodyProfile: {
          weight: bodyW,
          goal: bodyG,
        },
      };
      saveDietToStorage(dateKey, next);
    }
    this.setData({
      currentDate: dateKey,
      displayDate: displayFmt(dateKey),
      nutrition: nut,
      meals: meals != null ? meals : this.data.meals,
      bodyWeight: bodyW,
      bodyGoal: bodyG,
      dietCalcMode: calc && calc.mode ? calc.mode : 'simple',
      dietBmr: calc && calc.bmr != null ? calc.bmr : 0,
      dietTdee: calc && calc.tdee != null ? calc.tdee : 0,
      hasBodyTarget: !!calc,
      kcalTarget: kTarget,
      kcalBarWidth: computeKcalBar(nut, kTarget),
      kcalOver: (Number(nut && nut.calories) || 0) > kTarget,
      targetMaint: calc ? calc.maintenance : 0,
      targetProtein: calc ? calc.protein : 0,
      targetCarbs: calc ? calc.carbs : 0,
      targetFat: calc ? calc.fat : 0,
      mealPressReady: null,
      mealDragActive: false,
      mealDragGhost: null,
      mealDeleteZoneHighlight: false,
    });
  },

  onBodyWeightInput(e) {
    const v = (e && e.detail && e.detail.value) != null ? String(e.detail.value) : '';
    const { currentDate, bodyGoal, nutrition } = this.data;
    this._setTargetsFromBody(v, bodyGoal, nutrition, currentDate, null, { persist: true });
  },

  onBodyGoalChange(e) {
    const g = e && e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.goal;
    if (g !== GOALS.CUT && g !== GOALS.BULK && g !== GOALS.MAINTAIN) return;
    const { currentDate, bodyWeight, nutrition } = this.data;
    this._setTargetsFromBody(bodyWeight, g, nutrition, currentDate, null, { persist: true });
  },

  prevDay() {
    const d = keyToDate(this.data.currentDate);
    d.setDate(d.getDate() - 1);
    this.applyDate(dateToKey(d));
  },

  nextDay() {
    const d = keyToDate(this.data.currentDate);
    d.setDate(d.getDate() + 1);
    this.applyDate(dateToKey(d));
  },

  onDateTap() {
    console.log('[diet] onDateTap currentDate =', this.data.currentDate);
  },

  onOpenDietSettings() {
    wx.navigateTo({ url: '/pages/diet-settings/diet-settings' });
  },

  _resetMealDrag() {
    if (this._mealPressTimer) {
      clearTimeout(this._mealPressTimer);
      this._mealPressTimer = null;
    }
    this._touching = false;
    this._mealTouch = null;
    this.setData({
      mealPressReady: null,
      mealDragActive: false,
      mealDragGhost: null,
      mealDeleteZoneHighlight: false,
    });
  },

  _removeMealFood(mi, fi) {
    const dateKey = this.data.currentDate;
    if (!dateKey) return;
    const bundle = loadDietForDate(dateKey);
    const meals0 = bundle.meals || [];
    if (mi < 0 || mi >= meals0.length) return;
    const m0 = meals0[mi];
    const foods0 = m0.foods || [];
    if (fi < 0 || fi >= foods0.length) return;
    const foods = foods0.filter((_, j) => j !== fi);
    const meals = meals0.map((m, i) => (i === mi ? { ...m, foods } : m));
    const { meals: m2, nutrition } = recomputeDietFromMeals(meals);
    saveDietToStorage(dateKey, { ...bundle, meals: m2, nutrition });
    wx.showToast({ title: '已移除', icon: 'success' });
    this.applyDate(dateKey);
  },

  onMealFoodQtyInc(e) {
    const d = (e && e.currentTarget && e.currentTarget.dataset) || {};
    const mi = parseInt(String(d.mi != null && d.mi !== '' ? d.mi : '0'), 10);
    const fi = parseInt(String(d.fi != null && d.fi !== '' ? d.fi : '0'), 10);
    if (Number.isNaN(mi) || Number.isNaN(fi)) return;
    const dateKey = this.data.currentDate;
    if (!dateKey) return;
    const bundle = loadDietForDate(dateKey);
    const meals0 = bundle.meals || [];
    if (mi < 0 || mi >= meals0.length) return;
    const m0 = meals0[mi];
    const foods0 = m0.foods || [];
    if (fi < 0 || fi >= foods0.length) return;
    const f = foods0[fi];
    if (!f || !f.id) return;
    const p = findFoodById(f.id);
    if (!p) return;
    const cur0 = f.qty != null && f.qty !== '' ? Number(f.qty) : 1;
    const cur = Number.isNaN(cur0) || cur0 < 1 ? 1 : Math.floor(cur0);
    const n = cur + 1;
    if (n > 50) {
      wx.showToast({ title: '单种最多 50 份', icon: 'none' });
      return;
    }
    const nextRow = toPlannedFood(p, n);
    let icon = f.icon;
    try {
      icon = f.icon || foodIconForDietFood({ ...f, ...nextRow });
    } catch (err) {
      icon = f.icon || '';
    }
    const newFood = { ...f, ...nextRow, icon };
    const foods = foods0.map((it, j) => (j === fi ? newFood : it));
    const meals = meals0.map((mm, i) => (i === mi ? { ...m0, foods } : mm));
    const { meals: m2, nutrition } = recomputeDietFromMeals(meals);
    saveDietToStorage(dateKey, { ...bundle, meals: m2, nutrition });
    this.applyDate(dateKey);
  },

  onMealClick(e) {
    this._resetMealDrag();
    const idx = parseInt(e.currentTarget.dataset.idx, 10);
    const meal = this.data.meals[idx];
    if (!meal) return;
    const mealType = meal.type || 'breakfast';
    const title = FP_TITLES[mealType] || FP_TITLES.breakfast;
    const pool = getPoolByMeal(mealType).map((p) => ({
      ...p,
      _icon: foodIconForPoolItem(p),
    }));
    const m = {};
    (meal.foods || []).forEach((f) => {
      if (f && f.id) {
        m[f.id] = f.qty > 0 ? Number(f.qty) : 1;
      }
    });
    const categories = this._fpBuildCategories(pool);
    this.setData(
      {
        fpShow: true,
        fpMealIndex: idx,
        fpMealType: mealType,
        fpMealTitle: title,
        fpPool: pool,
        fpSearchText: '',
        fpCategoryKey: 'all',
        fpCategories: categories,
        fpSelectedMap: m,
        fpSelectedCount: fpCountSelected(m),
      },
      () => {
        this._fpRecompute();
      },
    );
  },

  _fpBuildCategories(pool) {
    const set = new Set();
    (pool || []).forEach((p) => {
      if (p && p.category) set.add(p.category);
    });
    const order = ['水果', '蔬菜', '主食', '蛋白', '乳制品', '优质脂肪', '纤维', '坚果'];
    const iconOf = (label) => {
      const m = {
        水果: '🍎',
        蔬菜: '🥬',
        主食: '🌾',
        蛋白: '🥩',
        乳制品: '🥛',
        优质脂肪: '🥑',
        纤维: '🌱',
        坚果: '🥜',
      };
      return m[label] || '🍽️';
    };
    const rest = [];
    set.forEach((c) => {
      if (order.indexOf(c) === -1) rest.push(c);
    });
    rest.sort();
    const seen = new Set();
    const out = [{ key: 'all', label: '全部', icon: '🍽️' }];
    order.forEach((c) => {
      if (set.has(c) && !seen.has(c)) {
        seen.add(c);
        out.push({ key: c, label: c, icon: iconOf(c) });
      }
    });
    rest.forEach((c) => {
      if (!seen.has(c)) {
        out.push({ key: c, label: c, icon: '📦' });
      }
    });
    return out;
  },

  _fpRecompute() {
    const { fpPool, fpSearchText, fpCategoryKey, fpSelectedMap } = this.data;
    let list = (fpPool || []).slice();
    if (fpCategoryKey && fpCategoryKey !== 'all') {
      list = list.filter((p) => p && p.category === fpCategoryKey);
    }
    const q = (fpSearchText || '').trim();
    if (q) {
      list = list.filter((p) => p && String(p.name).indexOf(q) !== -1);
    }
    list = list.map((p) => ({
      ...p,
      _selQty: fpMapGetQty(fpSelectedMap, p.id),
    }));
    let kcal = 0;
    const tags = [];
    (fpPool || []).forEach((p) => {
      if (!p) return;
      const nq = fpMapGetQty(fpSelectedMap, p.id);
      if (nq > 0) {
        kcal += (Number(p.kcal) || 0) * nq;
        tags.push({ id: p.id, name: p.name, kcal: Math.round(p.kcal * nq), qty: nq });
      }
    });
    this.setData({
      fpFiltered: list,
      fpSelectedCount: fpCountSelected(fpSelectedMap),
      fpSelectedKcal: Math.round(kcal),
      fpSelectedTags: tags,
    });
  },

  onFpSearchInput(e) {
    this.setData({ fpSearchText: (e && e.detail && e.detail.value) || '' }, () => {
      this._fpRecompute();
    });
  },

  onFpCategoryTap(e) {
    const key = e && e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.key;
    if (key === undefined || key === null) return;
    this.setData({ fpCategoryKey: key }, () => {
      this._fpRecompute();
    });
  },

  onFpTagRemove(e) {
    const id = e && e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.id;
    if (!id) return;
    const map = { ...this.data.fpSelectedMap };
    delete map[id];
    this.setData({ fpSelectedMap: map }, () => {
      this._fpRecompute();
    });
  },

  onFpTagInc(e) {
    const id = e && e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.id;
    if (!id) return;
    const map = { ...this.data.fpSelectedMap };
    const n = (fpMapGetQty(map, id) || 0) + 1;
    map[id] = Math.min(50, n);
    this.setData({ fpSelectedMap: map }, () => {
      this._fpRecompute();
    });
  },

  onFpTagDec(e) {
    const id = e && e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.id;
    if (!id) return;
    const map = { ...this.data.fpSelectedMap };
    const n = (fpMapGetQty(map, id) || 0) - 1;
    if (n < 1) {
      delete map[id];
    } else {
      map[id] = n;
    }
    this.setData({ fpSelectedMap: map }, () => {
      this._fpRecompute();
    });
  },

  onFpMaskClose() {
    this.setData({
      fpShow: false,
      fpSearchText: '',
      fpCategoryKey: 'all',
      fpDetailShow: false,
      fpDetail: null,
    });
  },

  onFpDetailClose() {
    this.setData({ fpDetailShow: false, fpDetail: null });
  },

  onFpToggle(e) {
    const id = e && e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.id
      ? e.currentTarget.dataset.id
      : '';
    if (!id) return;
    const map = { ...this.data.fpSelectedMap };
    if (fpMapGetQty(map, id) > 0) {
      delete map[id];
    } else {
      map[id] = 1;
    }
    this.setData(
      {
        fpSelectedMap: map,
        fpSelectedCount: fpCountSelected(map),
      },
      () => {
        this._fpRecompute();
      },
    );
  },

  onFpFoodLongPress(e) {
    const id = e && e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.id
      ? e.currentTarget.dataset.id
      : '';
    if (!id) return;
    const map = this.data.fpSelectedMap || {};
    const d = getFoodDetailForId(id, fpMapGetQty(map, id) || 1);
    if (!d) return;
    this.setData({ fpDetail: d, fpDetailShow: true });
  },

  onMealFoodTouchStart(e) {
    if (this.data.fpShow) return;
    const t = e.touches && e.touches[0];
    if (!t) return;
    const mi = parseInt((e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.mi) || '0', 10);
    const fi = parseInt((e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.fi) || '0', 10);
    this._touching = true;
    this._mealTouch = { mi, fi, x0: t.pageX, y0: t.pageY };
    if (this._mealPressTimer) {
      clearTimeout(this._mealPressTimer);
    }
    this._mealPressTimer = setTimeout(() => {
      this._mealPressTimer = null;
      if (!this._touching) return;
      this.setData({ mealPressReady: { mi, fi } });
      try {
        wx.vibrateShort({ type: 'light' });
      } catch (err) {
        // ignore
      }
    }, 400);
  },

  onMealFoodTouchMove(e) {
    if (this.data.fpShow) return;
    if (!this._mealTouch) return;
    const t = e.touches && e.touches[0];
    if (!t) return;
    const { x0, y0, mi, fi } = this._mealTouch;
    const dx = t.pageX - x0;
    const dy = t.pageY - y0;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (this._mealPressTimer && dist > 14) {
      clearTimeout(this._mealPressTimer);
      this._mealPressTimer = null;
    }
    const { mealPressReady, mealDragActive, meals } = this.data;
    if (mealPressReady && mealPressReady.mi === mi && mealPressReady.fi === fi) {
      if (mealDragActive || dist > 10) {
        const food = (meals[mi] && meals[mi].foods && meals[mi].foods[fi]) || null;
        if (food) {
          const inZone = t.pageY >= (this._wh || 667) * (this._deleteZoneTopRatio != null ? this._deleteZoneTopRatio : 0.74);
          const g = {
            x: t.pageX,
            y: t.pageY,
            name: food.name,
            icon: food.icon || '',
            kcal: food.kcal,
          };
          this.setData({
            mealDragActive: true,
            mealDragGhost: g,
            mealDeleteZoneHighlight: inZone,
          });
        }
      }
    }
  },

  onMealFoodTouchEnd(e) {
    this._touching = false;
    if (this._mealPressTimer) {
      clearTimeout(this._mealPressTimer);
      this._mealPressTimer = null;
    }
    const { mealPressReady, mealDragActive, meals } = this.data;
    const ch = (e && e.changedTouches && e.changedTouches[0]) || null;
    const touch = this._mealTouch;
    this._mealTouch = null;
    if (this.data.fpShow) {
      this.setData({ mealPressReady: null, mealDeleteZoneHighlight: false });
      return;
    }
    const pageY = ch ? ch.pageY : 0;
    const inDeleteZone = pageY >= (this._wh || 667) * (this._deleteZoneTopRatio != null ? this._deleteZoneTopRatio : 0.74);
    if (mealDragActive) {
      const mi0 = (mealPressReady && mealPressReady.mi) != null ? mealPressReady.mi : (touch && touch.mi);
      const fi0 = (mealPressReady && mealPressReady.fi) != null ? mealPressReady.fi : (touch && touch.fi);
      this.setData({
        mealPressReady: null,
        mealDragActive: false,
        mealDragGhost: null,
        mealDeleteZoneHighlight: false,
      });
      if (inDeleteZone && mi0 != null && fi0 != null) {
        this._removeMealFood(mi0, fi0);
      } else {
        wx.showToast({ title: '拖至屏幕底部可删除', icon: 'none' });
      }
      return;
    }
    if (mealPressReady && touch && mealPressReady.mi === touch.mi && mealPressReady.fi === touch.fi) {
      this.setData({ mealPressReady: null, mealDeleteZoneHighlight: false });
      const f = meals[mealPressReady.mi] && meals[mealPressReady.mi].foods
        && meals[mealPressReady.mi].foods[mealPressReady.fi];
      if (f && f.id) {
        const d = getFoodDetailForId(f.id, f.qty > 0 ? f.qty : 1);
        if (d) {
          this.setData({ fpDetail: d, fpDetailShow: true });
        }
      } else {
        wx.showToast({ title: '暂无该食物详情', icon: 'none' });
      }
    } else {
      this.setData({ mealPressReady: null, mealDeleteZoneHighlight: false });
    }
  },

  onFpConfirm() {
    const dateKey = this.data.currentDate;
    const mealIndex = this.data.fpMealIndex;
    const map = this.data.fpSelectedMap;
    if (!dateKey) {
      wx.showToast({ title: '日期无效', icon: 'none' });
      return;
    }
    const selectedIds = Object.keys(map).filter((k) => fpMapGetQty(map, k) > 0);
    const foods = selectedIds
      .map((iid) => {
        const item = findFoodById(iid);
        const n = fpMapGetQty(map, iid);
        return item && n > 0 ? toPlannedFood(item, n) : null;
      })
      .filter(Boolean);

    const bundle = loadDietForDate(dateKey);
    const meals = (bundle.meals || []).map((m, i) => {
      if (i !== mealIndex) return m;
      return { ...m, foods };
    });
    const { meals: m2, nutrition } = recomputeDietFromMeals(meals);
    const next = { ...bundle, meals: m2, nutrition };
    saveDietToStorage(dateKey, next);
    this.setData({
      fpShow: false,
      fpSearchText: '',
      fpCategoryKey: 'all',
    });
    this.applyDate(dateKey);
  },
});
