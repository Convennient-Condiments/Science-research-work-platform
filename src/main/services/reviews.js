const db = require('../db');
const stats = require('./stats');

function pad(n) { return String(n).padStart(2, '0'); }
function iso(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
function addDays(base, days) { const d = new Date(base); d.setDate(d.getDate() + days); return d; }
function startOfWeek(base) { const d = new Date(base); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); d.setHours(0, 0, 0, 0); return d; }

function parseContent(row, fallback) {
  try { return JSON.parse(row.content || '{}'); } catch { return { ...fallback }; }
}

function fmtHours(seconds) { return `${Math.round((seconds / 3600) * 10) / 10} 小时`; }

function autofillWeekly(weekStartISO) {
  const weekStart = startOfWeek(new Date(weekStartISO));
  const weekEnd = addDays(weekStart, 7);
  const start = iso(weekStart);
  const end = iso(weekEnd);
  const clock = db.all(`SELECT * FROM clock_records WHERE ended_at IS NOT NULL AND ended_at != '' AND ended_at >= ? AND started_at < ?`, [start, end]);
  const byCat = {};
  let total = 0;
  for (const c of clock) {
    const secs = Math.max(0, (new Date(c.ended_at) - new Date(c.started_at)) / 1000);
    byCat[c.category || '其他'] = (byCat[c.category || '其他'] || 0) + secs;
    total += secs;
  }
  const tasks = db.all(`SELECT * FROM tasks WHERE date >= ? AND date < ?`, [start, end]);
  const doneTasks = tasks.filter(t => t.status === 'done');
  const undoneTasks = tasks.filter(t => t.status !== 'done');
  const submissions = db.all(`SELECT * FROM submissions WHERE submitted_at >= ? AND submitted_at < ?`, [start, end]);
  const literatureRead = db.all(`SELECT * FROM literature WHERE status = 'read' AND updated_at >= ? AND updated_at < ?`, [start, end]);
  const literatureAdded = db.all(`SELECT * FROM literature WHERE added_at >= ? AND added_at < ?`, [start, end]);
  const notes = db.all(`SELECT * FROM progress_notes WHERE date >= ? AND date < ?`, [start, end]);
  const innovations = db.all(`SELECT * FROM innovation_literature WHERE note_content IS NOT NULL AND note_content != '' AND added_at >= ? AND added_at < ?`, [start, end]);

  const catText = Object.entries(byCat).map(([cat, secs]) => `${cat} ${fmtHours(secs)}`).join('；') || '暂无有效工时记录';
  const doneText = doneTasks.map(t => `- ${t.title}`).join('\n') || '暂无已完成任务';
  const undoneText = undoneTasks.map(t => `- ${t.title}（优先级：${t.priority || '中'}）`).join('\n') || '暂无未完成计划项';
  const subText = submissions.map(s => `- ${s.title}（${s.journal}，${s.status}）`).join('\n') || '本周无新增投稿';
  const litText = [...new Set([...literatureRead, ...literatureAdded].map(l => `- ${l.title}（${l.journal || '未标注期刊'}）`))].join('\n') || '本周无文献阅读记录';
  const noteText = notes.map(n => `- [${n.type}] ${n.content}`).join('\n') || '暂无碎片化进展速记';
  const innovationText = innovations.map(x => `- ${x.title}：${x.note_content}`).join('\n') || '';

  return {
    done: `本周有效科研工时：${fmtHours(total)}（${catText}）。\n\n已完成工作：\n${doneText}\n\n本周投稿动态：\n${subText}\n\n碎片化进展：\n${noteText}`,
    notDone: undoneText,
    harvest: `本周文献学习收获：\n${litText}${innovationText ? '\n\n创新文献笔记：\n' + innovationText : ''}`,
    questions: '',
    nextPlan: '',
    literatureHarvest: litText + (innovationText ? '\n' + innovationText : '')
  };
}

function autofillMonthly(monthISO) {
  const month = new Date(`${monthISO}-01T00:00:00`);
  const next = new Date(month.getFullYear(), month.getMonth() + 1, 1);
  const start = iso(month);
  const end = iso(next);
  const weeks = db.all(`SELECT * FROM weekly_reviews WHERE week_start >= ? AND week_start < ? ORDER BY week_start ASC`, [start, end]);
  const milestonesDone = db.all(`SELECT * FROM milestones WHERE status = 'done' AND completed_at >= ? AND completed_at < ? ORDER BY completed_at ASC`, [start, end]);
  const milestones = db.all(`SELECT * FROM milestones WHERE status = 'done' ORDER BY completed_at DESC`);
  const clockSeconds = stats.clockSecondsInRange(start, end);
  const tasks = db.all(`SELECT * FROM tasks WHERE date >= ? AND date < ?`, [start, end]);
  const submissions = db.all(`SELECT * FROM submissions WHERE submitted_at >= ? AND submitted_at < ?`, [start, end]);
  const literature = db.all(`SELECT * FROM literature WHERE added_at >= ? AND added_at < ?`, [start, end]);
  const notes = db.all(`SELECT * FROM progress_notes WHERE date >= ? AND date < ?`, [start, end]);
  const anomalies = notes.filter(n => n.type === '数据异常');
  const clockRows = db.all(`SELECT * FROM clock_records WHERE ended_at IS NOT NULL AND ended_at != '' AND ended_at >= ? AND started_at < ?`, [start, end]);
  const experiments = clockRows.filter(c => c.category === '实验操作');

  const weekSummary = weeks.map(w => {
    const c = parseContent(w, { done: '', nextPlan: '' });
    return `- ${w.title}：${c.done || '（未填写）'}`;
  }).join('\n') || '本月尚无周复盘记录';
  const milestoneText = (milestonesDone.length ? milestonesDone : milestones.slice(0, 6)).map(m => `- ${m.name}（${m.completed_at || '已完成'}）：${m.achievements || ''}`).join('\n') || '暂无完成里程碑';
  const subText = submissions.map(s => `- ${s.title}（${s.journal || '未标注'}，${s.status}）`).join('\n') || '本月无投稿操作';
  const litText = literature.map(l => `- ${l.title}（${l.journal || ''}）`).join('\n') || '本月无新增文献';
  const anomalyText = anomalies.map(n => `- ${n.date}：${n.content}`).join('\n') || '本月无重大数据异常记录';

  return {
    goals: `本月周复盘聚合：\n${weekSummary}`,
    milestones: milestoneText,
    stats: `月度总有效科研工时：${fmtHours(clockSeconds)}；文献新增 ${literature.length} 条；投稿操作 ${submissions.length} 条；实验记录 ${experiments.length} 条；任务完成 ${tasks.filter(t => t.status === 'done').length}/${tasks.length} 条。`,
    bottlenecks: `异常数据与卡点：\n${anomalyText}`,
    resources: '',
    nextMonth: ''
  };
}

function aggregateMonthWeeks(monthISO) {
  const month = new Date(`${monthISO}-01T00:00:00`);
  const next = new Date(month.getFullYear(), month.getMonth() + 1, 1);
  return db.all(`SELECT * FROM weekly_reviews WHERE week_start >= ? AND week_start < ? ORDER BY week_start ASC`, [iso(month), iso(next)]);
}

module.exports = { autofillWeekly, autofillMonthly, aggregateMonthWeeks };
