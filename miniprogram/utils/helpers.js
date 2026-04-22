function getToday() {
  const d = new Date();
  return d.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

function formatTitleDate() {
  const d = new Date();
  return d.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });
}

module.exports = { getToday, formatTitleDate };
