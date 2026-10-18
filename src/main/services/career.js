const db = require('../db');
const { QUARTERLY_INFO_POOL, BOOK_PUSH_POOL } = require('../seed');

const CYCLE_LABELS = { postdoc: '海外深造', industry: '企业就业', faculty: '高校教职', xuandiao: '公共部门', graduate: '按期毕业' };

async function fetchJson(url, options = {}) {
  const res = await fetch(url, { ...options, signal: AbortSignal.timeout(25000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function refreshLabPapers(labId) {
  const lab = db.getRow('career_labs', labId);
  if (!lab) return { ok: false, message: '课题组不存在' };
  const surname = String(lab.name || '').trim().split(/\s+/).slice(0, 2).join('+');
  const inst = String(lab.institution || '').replace(/[^\w\s]/g, '').trim().split(/\s+/).slice(0, 3).join('+');
  if (!surname) return { ok: false, message: '请先填写课题组名称' };
  try {
    const term = `${surname}[Author] AND ${inst}[Affiliation]`;
    const search = await fetchJson(`https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&retmode=json&retmax=8&sort=date&term=${encodeURIComponent(term)}`);
    const ids = ((search.esearchresult && search.esearchresult.idlist) || []).slice(0, 6);
    let papers = [];
    if (ids.length) {
      const summary = await fetchJson(`https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&retmode=json&id=${ids.join(',')}`);
      papers = ids.map(id => {
        const r = summary.result[id];
        if (!r || !r.title) return null;
        const doi = ((r.articleids || []).find(a => a.idtype === 'doi') || {}).value || '';
        return { title: r.title.replace(/&nbsp;/g, ' '), journal: r.fulljournalname || r.source || 'PubMed', year: (r.pubdate || '').slice(0, 4), url: `https://pubmed.ncbi.nlm.nih.gov/${id}/`, doi };
      }).filter(Boolean);
    }
    const last = (papers[0] && papers[0].year) || new Date().getFullYear();
    db.updateRow('career_labs', labId, { papers: JSON.stringify(papers), last_paper_date: String(last), updated_at: new Date().toISOString() });
    return { ok: true, papers, message: `已更新 ${papers.length} 篇最新论文` };
  } catch (err) {
    return { ok: false, message: `PubMed 拉取失败：${err.message}` };
  }
}

function pushQuarterlyInfos() {
  const cycles = db.getSetting('info_cycles', null) || {};
  const now = Date.now();
  const pushed = [];
  for (const track of Object.keys(QUARTERLY_INFO_POOL)) {
    const c = cycles[track] || { nextPush: new Date(now).toISOString(), count: 0 };
    if (now < new Date(c.nextPush).getTime()) continue;
    const pool = QUARTERLY_INFO_POOL[track] || [];
    const start = (Number(c.count) || 0) % Math.max(1, pool.length);
    let added = 0;
    for (let i = 0; i < Math.min(2, pool.length); i++) {
      const item = pool[(start + i) % pool.length];
      db.insertRow('career_infos', { track, category: item.category, title: item.title, source: item.source, url: item.url || '', date: item.date || '季度精选', importance: item.importance || '中', status: 'unread', note: item.note || '', key_points: '', insight: '', created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
      added++;
    }
    cycles[track] = { lastPush: new Date().toISOString(), nextPush: new Date(now + 90 * 86400000).toISOString(), count: (Number(c.count) || 0) + 1 };
    pushed.push({ track, count: added });
  }
  db.setSetting('info_cycles', cycles);
  return pushed;
}

function pushBookUpdates() {
  const cycle = db.getSetting('book_cycles', null) || { nextPush: new Date().toISOString(), count: 0 };
  const now = Date.now();
  if (now < new Date(cycle.nextPush).getTime()) return [];
  const pool = BOOK_PUSH_POOL || [];
  const start = (Number(cycle.count) || 0) % Math.max(1, pool.length);
  const picked = [];
  for (let i = 0; i < Math.min(2, pool.length); i++) {
    const book = pool[(start + i) % pool.length];
    picked.push(book.title);
    db.insertRow('career_books', { ...book, status: '未读', review: '', started_at: '', finished_at: '', created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
  }
  db.setSetting('book_cycles', { lastPush: new Date().toISOString(), nextPush: new Date(now + 180 * 86400000).toISOString(), count: (Number(cycle.count) || 0) + 1 });
  return picked;
}

module.exports = { refreshLabPapers, pushQuarterlyInfos, pushBookUpdates, CYCLE_LABELS };
