const { getPlan, savePlan, getDraft, saveDraft } = require('./storage.js');

function remapDraftOrder(day) {
  const draft = getDraft();
  if (!draft || draft.day !== day || !Array.isArray(draft.exercises)) return;
  const planEx = getPlan()[day].exercises;
  const nameMap = new Map();
  draft.exercises.forEach((ex) => {
    if (ex && ex.name != null) nameMap.set(ex.name, Array.isArray(ex.sets) ? ex.sets.slice() : []);
  });
  draft.exercises = planEx.map((ex) => ({
    name: ex.name,
    sets: nameMap.has(ex.name) ? nameMap.get(ex.name) : [],
  }));
  saveDraft(draft);
}

/**
 * 与 H5 `planMoveEx` 行为一致；toIdx 为 0..n（n 表示末尾之后）
 */
function movePlanExercise(day, fromIdx, toIdx) {
  const plan = getPlan();
  const arr = plan[day].exercises;
  const n = arr.length;
  if (fromIdx < 0 || fromIdx >= n) return false;
  let t = Math.max(0, Math.min(toIdx, n));
  if (t === fromIdx) return false;
  const next = arr.slice();
  const [item] = next.splice(fromIdx, 1);
  let insertAt = t;
  if (fromIdx < t) insertAt = t - 1;
  insertAt = Math.max(0, Math.min(insertAt, next.length));
  if (insertAt === fromIdx) return false;
  next.splice(insertAt, 0, item);
  plan[day].exercises = next;
  savePlan(plan);
  remapDraftOrder(day);
  return true;
}

module.exports = { movePlanExercise, remapDraftOrder };
