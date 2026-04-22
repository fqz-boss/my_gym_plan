const { PLANS } = require('./defaults.js');

const PLAN_KEY = 'gym_plan';
const DRAFT_KEY = 'gym_draft';

function defaultPlan() {
  return JSON.parse(JSON.stringify(PLANS));
}

function getPlan() {
  try {
    const raw = wx.getStorageSync(PLAN_KEY);
    if (raw) return typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch (e) {}
  return defaultPlan();
}

function savePlan(plan) {
  wx.setStorageSync(PLAN_KEY, plan);
}

function ensurePlanInit() {
  const v = wx.getStorageSync(PLAN_KEY);
  if (!v) savePlan(defaultPlan());
}

function getDraft() {
  try {
    const raw = wx.getStorageSync(DRAFT_KEY);
    if (raw) return typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch (e) {}
  return null;
}

function saveDraft(obj) {
  if (obj) {
    wx.setStorageSync(DRAFT_KEY, obj);
  } else {
    try {
      wx.removeStorageSync(DRAFT_KEY);
    } catch (e) {}
  }
}

function clearDraft() {
  try {
    wx.removeStorageSync(DRAFT_KEY);
  } catch (e) {}
}

module.exports = {
  getPlan,
  savePlan,
  ensurePlanInit,
  getDraft,
  saveDraft,
  clearDraft,
};
