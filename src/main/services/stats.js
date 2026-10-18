const db = require('../db');

function pad(n) { return String(n).padStart(2, '0'); }
function iso(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
function addDays(base, days) { const d = new Date(base); d.setDate(d.getDate() + days); return d; }
function startOfWeek(base) { const d = new Date(base); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); d.setHours(0, 0, 0, 0); return d; }
function startOfMonth(base) { return new Date(base.getFullYear(), base.getMonth(), 1); }

function secondsBetween(started, ended) {
  const s = new Date(started).getTime();
  const e = ended ? new Date(ended).getTime() : Date.now();
  return Math.max(0, Math.floor((e - s) / 1000));
}

function hourLabel(seconds) { return Math.round((seconds / 3600) * 10) / 10; }

function clockSecondsInRange(startISO, endISO) {
  const rows = db.all(`SELECT started_at, ended_at FROM clock_records WHERE ended_at IS NOT NULL AND ended_at != '' AND ended_at >= ? AND started_at < ?`, [startISO, endISO]);
  return rows.reduce((sum, r) => sum + secondsBetween(r.started_at, r.ended_at), 0);
}

function periodRange(period) {
  const now = new Date();
  if (period === 'day') return { start: iso(now), end: iso(addDays(now, 1)), label: '今日' };
  if (period === 'month') return { start: iso(startOfMonth(now)), end: iso(addDays(startOfMonth(now), 32)), label: '本月' };
  const monday = startOfWeek(now);
  return { start: iso(monday), end: iso(addDays(monday, 7)), label: '本周' };
}

function thesisProgress() {
  const milestones = db.listRows('milestones', 'sort_order ASC');
  const totalWeight = milestones.reduce((s, m) => s + (Number(m.weight) || 0), 0);
  const doneWeight = milestones.filter(m => m.status === 'done').reduce((s, m) => s + (Number(m.weight) || 0), 0);
  const auto = totalWeight ? Math.round((doneWeight / totalWeight) * 1000) / 10 : 0;
  const manual = db.getSetting('thesis_progress_manual', null);
  return {
    auto, manual,
    progress: manual !== null && manual !== undefined ? Number(manual) : auto,
    doneCount: milestones.filter(m => m.status === 'done').length,
    totalCount: milestones.length,
    doneWeight, totalWeight
  };
}

function overview() {
  const now = new Date();
  const todayISO = iso(now);
  const range = periodRange('week');
  const tasks = db.listRows('tasks');
  const submissions = db.listRows('submissions');
  const thesis = thesisProgress();
  const habits = db.all(`SELECT * FROM habits WHERE date >= ? AND date < ?`, [range.start, range.end]);
  const habitTypes = [...new Set(habits.map(h => h.type))];
  const habitDone = habits.filter(h => String(h.value) === 'done').length;
  const habitRate = habitTypes.length ? Math.round((habitDone / (habitTypes.length * 7)) * 100) : 0;
  const todayClock = db.all(`SELECT * FROM clock_records WHERE started_at >= ? AND started_at < ?`, [todayISO, iso(addDays(now, 1))]);
  const activeToday = todayClock.filter(c => !c.ended_at);
  const unreadInnovation = db.all(`SELECT * FROM innovation_literature WHERE status = 'unread'`);
  const upcomingMilestones = db.all(`SELECT * FROM milestones WHERE status != 'done' AND planned_end >= ? ORDER BY planned_end ASC LIMIT 5`, [todayISO]);
  const weeks = db.all(`SELECT * FROM weekly_reviews ORDER BY week_start DESC LIMIT 2`);
  const monthReviews = db.all(`SELECT * FROM monthly_reviews ORDER BY month DESC LIMIT 2`);
  const dueReviews = weeks.filter(w => w.status === 'draft').length + monthReviews.filter(m => m.status === 'draft').length;

  return {
    activeTasks: tasks.filter(t => t.status !== 'done').length,
    doneTasks: tasks.filter(t => t.status === 'done').length,
    inReviewSubmissions: submissions.filter(s => !['待投稿', '录用', '见刊'].includes(s.status)).length,
    thesis, habitRate,
    advisorPending: db.all(`SELECT * FROM advisor_questions WHERE status = '待咨询'`).length,
    dueReviews,
    achievements: db.listRows('achievements').length,
    todayClockCount: todayClock.length,
    todaySeconds: todayClock.filter(c => c.ended_at).reduce((s, c) => s + secondsBetween(c.started_at, c.ended_at), 0),
    activeToday,
    leaveToday: db.all(`SELECT * FROM leave_records WHERE date = ?`, [todayISO]),
    unreadInnovation: unreadInnovation.length,
    upcomingMilestones,
    pendingReviews: weeks.filter(w => w.status === 'draft').length + monthReviews.filter(m => m.status === 'draft').length
  };
}

function weeklyStats(period) {
  const range = periodRange(period);
  const clockSeconds = clockSecondsInRange(range.start, range.end);
  const tasks = db.all(`SELECT * FROM tasks WHERE date >= ? AND date < ?`, [range.start, range.end]);
  const habits = db.all(`SELECT * FROM habits WHERE date >= ? AND date < ?`, [range.start, range.end]);
  const habitTypes = [...new Set(habits.map(h => h.type))];
  const habitDone = habits.filter(h => String(h.value) === 'done').length;
  const communications = db.all(`SELECT * FROM advisor_communications WHERE date >= ? AND date < ?`, [range.start, range.end]);
  const submissionsNew = db.all(`SELECT * FROM submissions WHERE submitted_at >= ? AND submitted_at < ?`, [range.start, range.end]);
  return {
    label: range.label,
    focusSeconds: clockSeconds,
    focusHours: hourLabel(clockSeconds),
    clockSeconds,
    clockHours: hourLabel(clockSeconds),
    habitRate: habitTypes.length ? Math.round((habitDone / (habitTypes.length * 7)) * 100) : 0,
    advisorCount: communications.length,
    doneTasks: tasks.filter(t => t.status === 'done').length,
    totalTasks: tasks.length,
    newSubmissions: submissionsNew.length
  };
}

function dailyHours(days = 14) {
  const now = new Date();
  const out = [];
  for (let i = days - 1; i >= 0; i--) {
    const day = addDays(now, -i);
    const start = iso(day);
    const end = iso(addDays(day, 1));
    const seconds = clockSecondsInRange(start, end);
    out.push({ date: start, fullDate: start, hours: hourLabel(seconds) });
  }
  return out;
}

function monthlyTaskCompletion(months = 6) {
  const now = new Date();
  const out = [];
  for (let i = months - 1; i >= 0; i--) {
    const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const next = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
    const rows = db.all(`SELECT * FROM tasks WHERE date >= ? AND date < ?`, [iso(month), iso(next)]);
    out.push({ label: `${month.getMonth() + 1}月`, done: rows.filter(t => t.status === 'done').length, total: rows.length });
  }
  return out;
}

function monthlyLiterature(months = 6) {
  const now = new Date();
  const out = [];
  for (let i = months - 1; i >= 0; i--) {
    const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const next = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
    const rows = db.all(`SELECT * FROM literature WHERE added_at >= ? AND added_at < ?`, [iso(month), iso(next)]);
    out.push({ label: `${month.getMonth() + 1}月`, total: rows.length, read: rows.filter(r => r.status === 'read').length });
  }
  return out;
}

function charts() {
  const submissions = db.listRows('submissions');
  const statusCounts = {};
  for (const s of submissions) statusCounts[s.status || '未分类'] = (statusCounts[s.status || '未分类'] || 0) + 1;
  return {
    hoursTrend: dailyHours(14),
    taskCompletion: monthlyTaskCompletion(6),
    milestones: db.listRows('milestones', 'sort_order ASC'),
    submissionStatus: Object.entries(statusCounts).map(([status, count]) => ({ status, count })),
    literature: monthlyLiterature(6),
    thesis: thesisProgress()
  };
}

module.exports = { overview, weeklyStats, charts, thesisProgress, clockSecondsInRange, hourLabel };
