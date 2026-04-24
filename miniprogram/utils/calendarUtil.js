/** 将 log.date 规范为 YYYY-MM-DD，与农历/展示无关，仅用于键值匹配 */
function keyFromLogDate(str) {
  const p = String(str || '')
    .trim()
    .split(/[/\-.]/);
  if (p.length < 3) return null;
  const y = parseInt(p[0], 10);
  const mo = parseInt(p[1], 10);
  const d = parseInt(p[2], 10);
  if (isNaN(y) || isNaN(mo) || isNaN(d)) return null;
  return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function dateKeyFromParts(y, mon, d) {
  return `${y}-${String(mon).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/** 同一天多条记录时，按 type 去重，保留一条 */
function buildLogMapByDay(logs) {
  const logMap = {};
  (logs || []).forEach((log) => {
    const k = keyFromLogDate(log.date);
    if (!k) return;
    if (!logMap[k]) logMap[k] = [];
    const short = { push: '推', pull: '拉', leg: '腿' }[log.type] || '练';
    const cls = log.type || 'push';
    logMap[k].push({
      id: log.id,
      type: log.type,
      label: log.label || '',
      short,
      cls,
    });
  });
  Object.keys(logMap).forEach((k) => {
    const seen = new Set();
    logMap[k] = logMap[k].filter((x) => {
      if (seen.has(x.type)) return false;
      seen.add(x.type);
      return true;
    });
  });
  return logMap;
}

/**
 * 自然月周网格，周一为列首列（与常见中文月历一致）
 * @param {number} y 年
 * @param {number} m 月 0-11
 * @param {Object} logMap 见 buildLogMapByDay
 */
function buildMonthWeeks(y, m, logMap) {
  const now = new Date();
  const dim = new Date(y, m + 1, 0).getDate();
  const startPad = (new Date(y, m, 1).getDay() + 6) % 7;
  const cells = [];
  for (let i = 0; i < startPad; i += 1) {
    cells.push({
      empty: true,
      key: `pad-${y}-${m + 1}-${i}`,
      dClass: 'cal-d cal-d--empty',
    });
  }
  for (let d = 1; d <= dim; d += 1) {
    const key = dateKeyFromParts(y, m + 1, d);
    const isToday =
      y === now.getFullYear() && m === now.getMonth() && d === now.getDate();
    const dt = new Date(y, m, d);
    const isSunday = dt.getDay() === 0;
    const dayLogs = (logMap && logMap[key]) || [];
    const hasLog = dayLogs.length > 0;
    const rawT = hasLog && dayLogs[0] && (dayLogs[0].cls || dayLogs[0].type);
    const safeT = rawT && ['push', 'pull', 'leg'].indexOf(rawT) !== -1 ? rawT : 'push';
    const dParts = ['cal-d', 'cal-d--day'];
    if (hasLog) dParts.push('cal-d--has', `cal-tint-${safeT}`);
    else dParts.push('cal-tint-none');
    cells.push({
      empty: false,
      day: d,
      key,
      isToday,
      isSunday,
      logs: dayLogs,
      hasLog,
      dClass: dParts.join(' '),
    });
  }
  let tail = 0;
  while (cells.length % 7 !== 0) {
    cells.push({
      empty: true,
      key: `tail-${y}-${m + 1}-${tail}`,
      dClass: 'cal-d cal-d--empty',
    });
    tail += 1;
  }
  const calWeeks = [];
  for (let i = 0; i < cells.length; i += 7) {
    calWeeks.push(cells.slice(i, i + 7));
  }
  return {
    calTitle: `${y}年${m + 1}月`,
    calWeeks,
  };
}

module.exports = {
  keyFromLogDate,
  dateKeyFromParts,
  buildLogMapByDay,
  buildMonthWeeks,
};
