function parseLogDateStr(str) {
  if (!str) return null;
  const p = String(str).split(/[/\-.]/);
  if (p.length < 3) return null;
  const y = parseInt(p[0], 10);
  const mo = parseInt(p[1], 10) - 1;
  const d = parseInt(p[2], 10);
  if (isNaN(y) || isNaN(mo) || isNaN(d)) return null;
  return new Date(y, mo, d);
}

function weekBounds() {
  const now = new Date();
  const day = now.getDay();
  const off = day === 0 ? -6 : 1 - day;
  const mon = new Date(now.getFullYear(), now.getMonth(), now.getDate() + off);
  mon.setHours(0, 0, 0, 0);
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  sun.setHours(23, 59, 59, 999);
  return { mon, sun };
}

function countLogsThisWeek(logs) {
  const { mon, sun } = weekBounds();
  let n = 0;
  (logs || []).forEach((l) => {
    const ld = parseLogDateStr(l.date);
    if (ld && ld >= mon && ld <= sun) n += 1;
  });
  return n;
}

function getDashGreeting() {
  const h = new Date().getHours();
  if (h < 12) return '早上好';
  if (h < 18) return '下午好';
  return '晚上好';
}

/** 训练页问候：无真实昵称/脱敏「微信用户」时用「健身伙伴」 */
function formatDashHello(nickName) {
  const g = getDashGreeting();
  const raw = nickName && String(nickName).trim();
  const n = raw && raw !== '微信用户' ? raw : '健身伙伴';
  return `${g}, ${n}`;
}

const todayLabel = { push: '推日', pull: '拉日', leg: '腿日', rest: '休息' };

function statLabelsForDay(day) {
  return {
    statToday: todayLabel[day] || '—',
  };
}

function buildDashboardData(logs, currentDay, opts) {
  const logsArr = Array.isArray(logs) ? logs : [];
  const nick = opts && opts.nickName != null ? opts.nickName : undefined;
  return {
    dashHello: formatDashHello(nick),
    ...statLabelsForDay(currentDay),
    statWeek: String(countLogsThisWeek(logsArr)),
    statTotal: String(logsArr.length),
  };
}

module.exports = {
  parseLogDateStr,
  weekBounds,
  countLogsThisWeek,
  getDashGreeting,
  formatDashHello,
  buildDashboardData,
  statLabelsForDay,
};
