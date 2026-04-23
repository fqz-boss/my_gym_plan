/** 与 H5 一致：从日志中按动作名取该训练日下最近一次组数据 */
function extractLastSetsByExerciseName(logs, dayType) {
  const map = new Map();
  for (const log of logs || []) {
    if (log.type !== dayType) continue;
    for (const ex of log.exercises || []) {
      const name = (ex.name || '').trim();
      if (!name || map.has(name)) continue;
      map.set(name, Array.isArray(ex.sets) ? ex.sets : []);
    }
  }
  return map;
}

/**
 * @returns {Array<Array<{weight:string,reps:string}>>} 与 plan.exercises 一一对应
 */
function buildDefaultMatrixFromHistory(planExercises, nameToSets) {
  return planExercises.map((ex) => {
    const key = (ex.name || '').trim();
    const lastSets = nameToSets.get(key) || [];
    const n = parseInt(ex.sets, 10) || 4;
    const row = [];
    for (let i = 0; i < n; i += 1) {
      const src = lastSets[i] || lastSets[lastSets.length - 1] || {};
      const w = src.weight;
      const r = src.reps;
      row.push({
        weight: w != null && String(w).trim() !== '' ? String(w) : '',
        reps: r != null && String(r).trim() !== '' ? String(r) : '',
      });
    }
    return row;
  });
}

/** 仅对仍为空的 weight/reps 网格填入；返回填入的格子数 */
function applyPrefillToExerciseRows(exerciseRows, matrix) {
  let filled = 0;
  exerciseRows.forEach((ex, ei) => {
    const mRow = matrix[ei] || [];
    (ex.sets || []).forEach((s, si) => {
      const d = mRow[si] || mRow[mRow.length - 1] || { weight: '', reps: '' };
      const w0 = s.weight != null ? String(s.weight).trim() : '';
      const r0 = s.reps != null ? String(s.reps).trim() : '';
      if (d.weight !== '' && w0 === '') {
        s.weight = d.weight;
        filled += 1;
      }
      if (d.reps !== '' && r0 === '') {
        s.reps = d.reps;
        filled += 1;
      }
    });
  });
  return filled;
}

module.exports = {
  extractLastSetsByExerciseName,
  buildDefaultMatrixFromHistory,
  applyPrefillToExerciseRows,
};
