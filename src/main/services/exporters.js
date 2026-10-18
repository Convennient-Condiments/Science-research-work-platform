const path = require('path');
const fs = require('fs');
const { BrowserWindow, dialog } = require('electron');
const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } = require('docx');
const XLSX = require('xlsx');
const db = require('../db');

const FONT = 'Microsoft YaHei';

const REVIEW_FIELDS = {
  weekly: [
    ['keyPoints', '本期重点'],
    ['done', '一、本周已完成工作'],
    ['notDone', '二、未完成计划项与延期原因'],
    ['harvest', '三、本周核心收获与文献吸收要点'],
    ['questions', '四、当前卡点与待请教导师问题'],
    ['nextPlan', '五、下周工作计划'],
    ['literatureHarvest', '六、文献学习收获']
  ],
  monthly: [
    ['keyPoints', '本期重点'],
    ['goals', '一、月度目标完成对标情况'],
    ['milestones', '二、本月里程碑关键进展'],
    ['stats', '三、量化产出统计'],
    ['bottlenecks', '四、瓶颈梳理与资源需求'],
    ['resources', '五、资源诉求登记'],
    ['nextMonth', '六、下月目标与优先级']
  ]
};

function parseContent(review) {
  try { return JSON.parse(review.content || '{}'); } catch { return {}; }
}

function htmlEscape(text) {
  return String(text || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/\n/g, '<br/>');
}

function buildReviewHtml(type, review) {
  const content = parseContent(review);
  const fields = REVIEW_FIELDS[type] || [];
  const sections = fields.filter(([key]) => content[key] && String(content[key]).trim()).map(([key, title]) => `
    <section>
      <h2>${title}</h2>
      <div class="body">${htmlEscape(content[key])}</div>
    </section>`).join('');
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<title>${htmlEscape(review.title || '复盘报告')}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: "Microsoft YaHei", "PingFang SC", sans-serif; color: #1f2937; margin: 40px 52px; line-height: 1.8; }
  h1 { font-size: 22px; text-align: center; margin: 0 0 6px; }
  .meta { text-align: center; color: #6b7280; font-size: 12px; margin-bottom: 28px; }
  h2 { font-size: 15px; margin: 22px 0 8px; padding-left: 10px; border-left: 4px solid #2563eb; }
  .body { font-size: 13px; white-space: pre-wrap; }
  footer { margin-top: 40px; text-align: right; color: #9ca3af; font-size: 11px; }
</style>
</head>
<body>
  <h1>${htmlEscape(review.title || '复盘报告')}</h1>
  <div class="meta">生成时间：${new Date().toLocaleString('zh-CN')}　|　状态：${review.status === 'done' ? '已定稿' : '草稿'}</div>
  ${sections}
  <footer>PhD Master Workspace · 自动生成报告</footer>
</body>
</html>`;
}

function buildReviewDocx(type, review) {
  const content = parseContent(review);
  const children = [];
  children.push(new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: review.title || '复盘报告', bold: true, size: 32, font: FONT })] }));
  children.push(new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `生成时间：${new Date().toLocaleString('zh-CN')}   状态：${review.status === 'done' ? '已定稿' : '草稿'}`, size: 18, color: '6B7280', font: FONT })] }));
  children.push(new Paragraph({ children: [new TextRun({ text: '', size: 12 })] }));
  for (const [key, title] of REVIEW_FIELDS[type] || []) {
    if (!content[key] || !String(content[key]).trim()) continue;
    children.push(new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: title, bold: true, size: 24, color: '1D4ED8', font: FONT })] }));
    children.push(new Paragraph({ children: [new TextRun({ text: content[key], size: 22, font: FONT })] }));
  }
  children.push(new Paragraph({ children: [new TextRun({ text: '', size: 12 })] }));
  children.push(new Paragraph({ children: [new TextRun({ text: 'PhD Master Workspace · 自动生成报告', size: 16, color: '9CA3AF', font: FONT })] }));
  return new Document({ sections: [{ properties: {}, children }] });
}

async function saveBuffer(win, buffer, defaultName, filters) {
  const result = await dialog.showSaveDialog(win, { defaultPath: defaultName, filters: filters || [{ name: '文件', extensions: ['*'] }] });
  if (result.canceled || !result.filePath) return { canceled: true };
  fs.writeFileSync(result.filePath, buffer);
  return { canceled: false, filePath: result.filePath };
}

async function exportReviewDocx(win, type, id) {
  const table = type === 'weekly' ? 'weekly_reviews' : 'monthly_reviews';
  const review = db.getRow(table, id);
  if (!review) throw new Error('未找到该复盘记录');
  const doc = buildReviewDocx(type, review);
  const buffer = await Packer.toBuffer(doc);
  const name = `${review.title || '复盘报告'}.docx`.replace(/[\\/:*?"<>|]/g, '_');
  return saveBuffer(win, buffer, name, [{ name: 'Word 文档', extensions: ['docx'] }]);
}

async function exportReviewPdf(win, type, id) {
  const table = type === 'weekly' ? 'weekly_reviews' : 'monthly_reviews';
  const review = db.getRow(table, id);
  if (!review) throw new Error('未找到该复盘记录');
  const html = buildReviewHtml(type, review);
  const hidden = new BrowserWindow({ show: false, webPreferences: { sandbox: true } });
  try {
    await hidden.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
    const pdf = await hidden.webContents.printToPDF({ pageSize: 'A4', printBackground: true, margins: { top: 0.5, bottom: 0.5, left: 0.5, right: 0.5 } });
    const name = `${review.title || '复盘报告'}.pdf`.replace(/[\\/:*?"<>|]/g, '_');
    return saveBuffer(win, pdf, name, [{ name: 'PDF 文档', extensions: ['pdf'] }]);
  } finally {
    hidden.destroy();
  }
}

const EXCEL_COLUMNS = {
  clock_records: ['id', 'started_at', 'ended_at', 'category', 'note', 'source'],
  leave_records: ['id', 'date', 'type', 'reason', 'start_time', 'end_time'],
  tasks: ['id', 'title', 'detail', 'date', 'due_date', 'status', 'priority', 'category', 'plan_type', 'source'],
  milestones: ['id', 'name', 'stage', 'planned_start', 'planned_end', 'completed_at', 'status', 'achievements', 'attachments', 'problems', 'next_tasks', 'weight'],
  progress_notes: ['id', 'milestone_id', 'date', 'type', 'content', 'stage', 'source'],
  weekly_reviews: ['id', 'week_start', 'week_end', 'title', 'status', 'content'],
  monthly_reviews: ['id', 'month', 'title', 'status', 'content'],
  submissions: ['id', 'title', 'journal', 'zone', 'status', 'submitted_at', 'reviewer_opinions', 'revision_files', 'acceptance_file', 'published_at', 'notes'],
  literature: ['id', 'title', 'authors', 'year', 'journal', 'doi', 'tags', 'pdf_path', 'url', 'source', 'zotero_key', 'zotero_collection', 'status', 'favorite', 'added_at'],
  literature_notes: ['id', 'literature_id', 'title', 'content', 'tags', 'source', 'synced_zotero', 'created_at'],
  innovation_literature: ['id', 'title', 'journal', 'doi', 'url', 'highlight', 'innovation_type', 'keywords', 'field', 'status', 'favorite', 'week', 'added_at', 'note_content'],
  advisor_communications: ['id', 'date', 'type', 'summary', 'action_items'],
  advisor_questions: ['id', 'title', 'detail', 'status', 'imported_to_review'],
  report_drafts: ['id', 'type', 'title', 'content', 'updated_at'],
  health_records: ['id', 'date', 'sleep_hours', 'mood', 'stress', 'energy', 'exercise_minutes', 'exercise_type', 'notes'],
  english_records: ['id', 'date', 'words', 'minutes', 'note'],
  exam_plans: ['id', 'name', 'exam_date', 'daily_goal', 'status'],
  habits: ['id', 'date', 'type', 'value', 'note'],
  achievements: ['id', 'key', 'title', 'description', 'unlocked_at', 'icon'],
  career_plans: ['id', 'track', 'year', 'title', 'done', 'note', 'updated_at'],
  career_infos: ['id', 'track', 'category', 'title', 'source', 'url', 'date', 'importance', 'status', 'note', 'key_points', 'insight', 'updated_at'],
  career_nodes: ['id', 'track', 'phase', 'goal', 'key_nodes', 'status', 'review', 'gap', 'adjusted', 'updated_at'],
  career_labs: ['id', 'name', 'institution', 'country', 'direction', 'homepage', 'email', 'status', 'priority', 'traits', 'papers', 'last_paper_date', 'note', 'updated_at'],
  career_inspirations: ['id', 'date', 'title', 'content', 'tags', 'images', 'created_at', 'updated_at'],
  career_books: ['id', 'module', 'title', 'author', 'priority', 'stage', 'purpose', 'status', 'review', 'started_at', 'finished_at', 'updated_at'],
  sync_logs: ['id', 'provider', 'direction', 'status', 'message', 'created_at']
};

const EXCEL_HEADERS = {
  clock_records: ['ID', '开始时间', '结束时间', '工时类型', '备注', '来源'],
  leave_records: ['ID', '日期', '请假类型', '原因', '开始时间', '结束时间'],
  tasks: ['ID', '任务标题', '详情', '日期', '截止日期', '状态', '优先级', '分类', '计划类型', '来源'],
  milestones: ['ID', '节点名称', '阶段', '计划开始', '计划结束', '实际完成', '状态', '核心成果', '附件', '遗留问题', '下一阶段任务', '权重'],
  progress_notes: ['ID', '里程碑ID', '日期', '速记类型', '内容', '阶段', '来源'],
  weekly_reviews: ['ID', '周开始', '周结束', '标题', '状态', '内容'],
  monthly_reviews: ['ID', '月份', '标题', '状态', '内容'],
  submissions: ['ID', '论文标题', '期刊', '分区', '状态', '投稿时间', '审稿意见', '返修文件', '录用文件', '见刊时间', '备注'],
  literature: ['ID', '标题', '作者', '年份', '期刊', 'DOI', '标签', 'PDF路径', '链接', '来源', 'Zotero Key', 'Zotero集合', '状态', '收藏', '加入时间'],
  literature_notes: ['ID', '文献ID', '笔记标题', '内容', '标签', '来源', '已同步Zotero', '创建时间'],
  innovation_literature: ['ID', '标题', '期刊', 'DOI', '链接', '创新亮点', '创新类型', '关键词', '领域', '状态', '收藏', '所属周', '加入时间', '阅读笔记'],
  advisor_communications: ['ID', '日期', '沟通类型', '摘要', '行动项'],
  advisor_questions: ['ID', '问题标题', '详情', '状态', '已导入复盘'],
  report_drafts: ['ID', '草稿类型', '标题', '内容', '更新时间'],
  health_records: ['ID', '日期', '睡眠时长', '心情', '压力', '精力', '运动分钟', '运动类型', '备注'],
  english_records: ['ID', '日期', '单词数', '分钟', '备注'],
  exam_plans: ['ID', '考试名称', '考试日期', '每日目标', '状态'],
  habits: ['ID', '日期', '习惯类型', '完成值', '备注'],
  achievements: ['ID', 'Key', '标题', '描述', '解锁时间', '图标'],
  career_plans: ['ID', '赛道', '年级', '规划事项', '完成', '备注', '更新时间'],
  career_infos: ['ID', '赛道', '分类', '情报标题', '来源', '链接', '时间', '重要度', '状态', '要点', '关键信息', '我的感悟', '更新时间'],
  career_nodes: ['ID', '赛道', '阶段', '阶段目标', '关键节点', '状态', '复盘结果', '差距归因', '调整计划', '更新时间'],
  career_labs: ['ID', '课题组', '机构', '国家', '研究方向', '主页', '邮箱', '状态', '优先级', '导师偏好特质', '最新论文', '论文更新', '备注', '更新时间'],
  career_inspirations: ['ID', '日期', '标题', '内容', '标签', '图片', '创建时间', '更新时间'],
  career_books: ['ID', '模块', '书名', '作者', '优先级', '阅读阶段', '阅读目的', '状态', '读书感受', '开始时间', '读完时间', '更新时间'],
  sync_logs: ['ID', '服务', '方向', '状态', '消息', '时间']
};

function excelRows(table) {
  const rows = db.listRows(table);
  const cols = EXCEL_COLUMNS[table] || Object.keys(rows[0] || {});
  const headers = EXCEL_HEADERS[table] || cols;
  const body = rows.map(r => cols.map(c => {
    let v = r[c];
    if (v && typeof v === 'object') v = JSON.stringify(v);
    return v === null || v === undefined ? '' : String(v);
  }));
  return [headers, ...body];
}

async function exportExcel(win) {
  const wb = XLSX.utils.book_new();
  const sheetMeta = [
    ['clock_records', '打卡工时'], ['leave_records', '请假记录'], ['tasks', '科研任务'],
    ['milestones', '课题里程碑'], ['progress_notes', '进展速记'], ['weekly_reviews', '每周复盘'],
    ['monthly_reviews', '月度复盘'], ['submissions', '投稿台账'], ['literature', '文献库'],
    ['literature_notes', '精读笔记'], ['innovation_literature', '创新精选文献'],
    ['advisor_communications', '导师沟通'], ['advisor_questions', '待咨询问题'], ['report_drafts', '汇报草稿'],
    ['health_records', '健康记录'], ['english_records', '英语打卡'], ['exam_plans', '备考计划'],
    ['habits', '习惯打卡'], ['achievements', '成就勋章'], ['career_plans', '五赛道规划'],
    ['career_infos', '赛道情报推送'], ['career_nodes', '阶段节点复盘'], ['career_labs', '海外课题组跟踪'],
    ['career_inspirations', '平日灵感库'], ['career_books', '分模块书单'], ['sync_logs', '同步日志']
  ];
  for (const [table, sheetName] of sheetMeta) {
    const ws = XLSX.utils.aoa_to_sheet(excelRows(table));
    ws['!cols'] = (EXCEL_COLUMNS[table] || []).map(() => ({ wch: 18 }));
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  }
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  return saveBuffer(win, buf, `PhD-Master-Workspace-全量数据-${new Date().toISOString().slice(0, 10)}.xlsx`, [{ name: 'Excel 工作簿', extensions: ['xlsx'] }]);
}

async function savePng(win, dataUrl) {
  const base64 = dataUrl.replace(/^data:image\/png;base64,/, '');
  const buf = Buffer.from(base64, 'base64');
  return saveBuffer(win, buf, `chart-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-')}.png`, [{ name: 'PNG 图片', extensions: ['png'] }]);
}

module.exports = { exportReviewDocx, exportReviewPdf, exportExcel, savePng, buildReviewHtml, buildReviewDocx };
