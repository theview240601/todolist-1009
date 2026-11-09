// [2/5] 날짜 계산 — D-day, 오늘 마감, 마감 지남

function todayStart() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

// '2026-11-09' 같은 글자를 날짜로 바꾼다.
function parseDate(s) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

// 마감까지 남은 날 수 (오늘 = 0, 지났으면 음수)
function daysLeft(due, today = todayStart()) {
  return Math.round((parseDate(due) - today) / 86400000);
}

function formatDate(due, today = todayStart()) {
  const d = parseDate(due);
  const sameYear = d.getFullYear() === today.getFullYear();
  return (sameYear ? '' : d.getFullYear() + '년 ') + (d.getMonth() + 1) + '월 ' + d.getDate() + '일';
}

// 마감일 옆에 붙일 글자와 색 이름
function dueInfo(task, today = todayStart()) {
  if (!task.due) return null;
  const n = daysLeft(task.due, today);
  if (n === 0) return { text: '오늘 마감', cls: 'today' };
  if (n > 0) return { text: 'D-' + n, cls: n <= 3 ? 'soon' : '' };
  return { text: -n + '일 지남', cls: 'overdue' };
}

function isOverdue(task, today = todayStart()) {
  return Boolean(!task.done && task.due && daysLeft(task.due, today) < 0);
}
