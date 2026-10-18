const path = require('path');
const fs = require('fs');
const initSqlJs = require('sql.js');

let db = null;
let dbPath = null;
let dbDir = null;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT);
CREATE TABLE IF NOT EXISTS clock_records (id INTEGER PRIMARY KEY AUTOINCREMENT, started_at TEXT, ended_at TEXT, category TEXT, note TEXT, source TEXT, created_at TEXT);
CREATE TABLE IF NOT EXISTS leave_records (id INTEGER PRIMARY KEY AUTOINCREMENT, date TEXT, type TEXT, reason TEXT, start_time TEXT, end_time TEXT, created_at TEXT);
CREATE TABLE IF NOT EXISTS tasks (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, detail TEXT, date TEXT, due_date TEXT, status TEXT, priority TEXT, category TEXT, plan_type TEXT, source TEXT, created_at TEXT);
CREATE TABLE IF NOT EXISTS milestones (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, stage TEXT, planned_start TEXT, planned_end TEXT, completed_at TEXT, status TEXT, achievements TEXT, attachments TEXT, problems TEXT, next_tasks TEXT, weight REAL, sort_order INTEGER, created_at TEXT);
CREATE TABLE IF NOT EXISTS progress_notes (id INTEGER PRIMARY KEY AUTOINCREMENT, milestone_id INTEGER, date TEXT, type TEXT, content TEXT, stage TEXT, source TEXT, created_at TEXT);
CREATE TABLE IF NOT EXISTS weekly_reviews (id INTEGER PRIMARY KEY AUTOINCREMENT, week_start TEXT, week_end TEXT, title TEXT, status TEXT, content TEXT, created_at TEXT, updated_at TEXT);
CREATE TABLE IF NOT EXISTS monthly_reviews (id INTEGER PRIMARY KEY AUTOINCREMENT, month TEXT, title TEXT, status TEXT, content TEXT, created_at TEXT, updated_at TEXT);
CREATE TABLE IF NOT EXISTS submissions (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, journal TEXT, zone TEXT, status TEXT, submitted_at TEXT, reviewer_opinions TEXT, revision_files TEXT, acceptance_file TEXT, published_at TEXT, notes TEXT, created_at TEXT);
CREATE TABLE IF NOT EXISTS literature (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, authors TEXT, year TEXT, journal TEXT, doi TEXT, tags TEXT, pdf_path TEXT, url TEXT, source TEXT, zotero_key TEXT, zotero_collection TEXT, status TEXT, favorite INTEGER, added_at TEXT, updated_at TEXT);
CREATE TABLE IF NOT EXISTS literature_notes (id INTEGER PRIMARY KEY AUTOINCREMENT, literature_id INTEGER, title TEXT, content TEXT, tags TEXT, source TEXT, synced_zotero INTEGER, created_at TEXT, updated_at TEXT);
CREATE TABLE IF NOT EXISTS innovation_literature (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, journal TEXT, doi TEXT, url TEXT, highlight TEXT, innovation_type TEXT, keywords TEXT, field TEXT, pdf_path TEXT, status TEXT, favorite INTEGER, week TEXT, added_at TEXT, note_content TEXT);
CREATE TABLE IF NOT EXISTS advisor_communications (id INTEGER PRIMARY KEY AUTOINCREMENT, date TEXT, type TEXT, summary TEXT, action_items TEXT, created_at TEXT);
CREATE TABLE IF NOT EXISTS advisor_questions (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, detail TEXT, status TEXT, imported_to_review INTEGER, created_at TEXT);
CREATE TABLE IF NOT EXISTS report_drafts (id INTEGER PRIMARY KEY AUTOINCREMENT, type TEXT, title TEXT, content TEXT, updated_at TEXT);
CREATE TABLE IF NOT EXISTS health_records (id INTEGER PRIMARY KEY AUTOINCREMENT, date TEXT, sleep_hours REAL, mood INTEGER, stress INTEGER, energy INTEGER, exercise_minutes INTEGER, exercise_type TEXT, notes TEXT, created_at TEXT);
CREATE TABLE IF NOT EXISTS english_records (id INTEGER PRIMARY KEY AUTOINCREMENT, date TEXT, words INTEGER, minutes INTEGER, note TEXT, created_at TEXT);
CREATE TABLE IF NOT EXISTS exam_plans (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, exam_date TEXT, daily_goal INTEGER, status TEXT, created_at TEXT);
CREATE TABLE IF NOT EXISTS habits (id INTEGER PRIMARY KEY AUTOINCREMENT, date TEXT, type TEXT, value TEXT, note TEXT, created_at TEXT);
CREATE TABLE IF NOT EXISTS achievements (id INTEGER PRIMARY KEY AUTOINCREMENT, key TEXT, title TEXT, description TEXT, unlocked_at TEXT, icon TEXT);
CREATE TABLE IF NOT EXISTS career_plans (id INTEGER PRIMARY KEY AUTOINCREMENT, track TEXT, year TEXT, title TEXT, done INTEGER DEFAULT 0, note TEXT, created_at TEXT, updated_at TEXT);
CREATE TABLE IF NOT EXISTS career_infos (id INTEGER PRIMARY KEY AUTOINCREMENT, track TEXT, category TEXT, title TEXT, source TEXT, url TEXT, date TEXT, importance TEXT, status TEXT DEFAULT 'unread', note TEXT, key_points TEXT, insight TEXT, created_at TEXT, updated_at TEXT);
CREATE TABLE IF NOT EXISTS career_nodes (id INTEGER PRIMARY KEY AUTOINCREMENT, track TEXT, phase TEXT, goal TEXT, key_nodes TEXT, status TEXT DEFAULT 'todo', review TEXT, gap TEXT, adjusted TEXT, created_at TEXT, updated_at TEXT);
CREATE TABLE IF NOT EXISTS career_labs (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, institution TEXT, country TEXT, direction TEXT, homepage TEXT, email TEXT, status TEXT DEFAULT '跟踪中', priority TEXT DEFAULT '中', traits TEXT, papers TEXT, last_paper_date TEXT, note TEXT, created_at TEXT, updated_at TEXT);
CREATE TABLE IF NOT EXISTS career_inspirations (id INTEGER PRIMARY KEY AUTOINCREMENT, date TEXT, title TEXT, content TEXT, tags TEXT, images TEXT, created_at TEXT, updated_at TEXT);
CREATE TABLE IF NOT EXISTS career_books (id INTEGER PRIMARY KEY AUTOINCREMENT, module TEXT, title TEXT, author TEXT, priority TEXT, stage TEXT, purpose TEXT, status TEXT DEFAULT '未读', review TEXT, started_at TEXT, finished_at TEXT, created_at TEXT, updated_at TEXT);
CREATE TABLE IF NOT EXISTS sync_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, provider TEXT, direction TEXT, status TEXT, message TEXT, created_at TEXT);
`;

const TABLES = new Set([
  'settings', 'clock_records', 'leave_records', 'tasks', 'milestones',
  'progress_notes', 'weekly_reviews', 'monthly_reviews', 'submissions',
  'literature', 'literature_notes', 'innovation_literature',
  'advisor_communications', 'advisor_questions', 'report_drafts',
  'health_records', 'english_records', 'exam_plans', 'habits',
  'achievements', 'career_plans', 'career_infos', 'career_nodes', 'career_labs',
  'career_inspirations', 'career_books', 'sync_logs'
]);

function normalizeRow(row) {
  if (!row) return row;
  const out = {};
  for (const key of Object.keys(row)) out[key] = row[key];
  return out;
}

function all(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows.map(normalizeRow);
}

function get(sql, params = []) {
  return all(sql, params)[0] || null;
}

function run(sql, params = []) {
  db.run(sql, params);
}

function persist() {
  if (!dbPath) return;
  const tmp = dbPath + '.tmp';
  fs.writeFileSync(tmp, Buffer.from(db.export()));
  fs.renameSync(tmp, dbPath);
}

function serializeValue(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'object') return JSON.stringify(value);
  return value;
}

function sanitizeColumns(table, row) {
  const allowed = new Set(all(`PRAGMA table_info(${table})`).map(c => c.name));
  const out = {};
  for (const [key, value] of Object.entries(row || {})) {
    if (allowed.has(key) && key !== 'id') out[key] = serializeValue(value);
  }
  return out;
}

function insertRow(table, row) {
  if (!TABLES.has(table)) throw new Error('Unknown table: ' + table);
  const clean = sanitizeColumns(table, { ...row, created_at: row.created_at || new Date().toISOString() });
  const cols = Object.keys(clean);
  if (!cols.length) return null;
  const placeholders = cols.map(() => '?').join(', ');
  run(`INSERT INTO ${table} (${cols.join(', ')}) VALUES (${placeholders})`, cols.map(c => clean[c]));
  const id = get('SELECT last_insert_rowid() AS id').id;
  persist();
  return getRow(table, id);
}

function getRow(table, id) {
  return get(`SELECT * FROM ${table} WHERE id = ?`, [id]);
}

function updateRow(table, id, row) {
  if (!TABLES.has(table)) throw new Error('Unknown table: ' + table);
  const clean = sanitizeColumns(table, row);
  const cols = Object.keys(clean);
  if (!cols.length) return getRow(table, id);
  const sets = cols.map(c => `${c} = ?`).join(', ');
  run(`UPDATE ${table} SET ${sets} WHERE id = ?`, [...cols.map(c => clean[c]), id]);
  persist();
  return getRow(table, id);
}

function deleteRow(table, id) {
  if (!TABLES.has(table)) throw new Error('Unknown table: ' + table);
  run(`DELETE FROM ${table} WHERE id = ?`, [id]);
  persist();
  return { ok: true };
}

function listRows(table, orderBy = 'rowid DESC') {
  if (!TABLES.has(table)) throw new Error('Unknown table: ' + table);
  return all(`SELECT * FROM ${table} ORDER BY ${orderBy}`);
}

function getSetting(key, fallback = null) {
  const row = get('SELECT value FROM settings WHERE key = ?', [key]);
  if (!row) return fallback;
  try { return JSON.parse(row.value); } catch { return row.value; }
}

function setSetting(key, value) {
  const serialized = typeof value === 'string' ? value : JSON.stringify(value);
  run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [key, serialized]);
  persist();
}

function migrate() {
  const tableCols = (table) => new Set(all(`PRAGMA table_info(${table})`).map(c => c.name));
  const innovationCols = tableCols('innovation_literature');
  if (!innovationCols.has('field')) run('ALTER TABLE innovation_literature ADD COLUMN field TEXT');
  if (!innovationCols.has('pdf_path')) run('ALTER TABLE innovation_literature ADD COLUMN pdf_path TEXT');
  const literatureCols = tableCols('literature');
  if (!literatureCols.has('url')) run('ALTER TABLE literature ADD COLUMN url TEXT');
  const infoCols = tableCols('career_infos');
  if (!infoCols.has('key_points')) run('ALTER TABLE career_infos ADD COLUMN key_points TEXT');
  if (!infoCols.has('insight')) run('ALTER TABLE career_infos ADD COLUMN insight TEXT');
  const inspireCols = tableCols('career_inspirations');
  if (!inspireCols.has('images')) run('ALTER TABLE career_inspirations ADD COLUMN images TEXT');
}

async function init(appDataDir) {
  dbDir = path.join(appDataDir, 'data');
  fs.mkdirSync(dbDir, { recursive: true });
  dbPath = path.join(dbDir, 'phd-workspace.db');
  const wasmPath = path.join(path.dirname(require.resolve('sql.js')), 'sql-wasm.wasm');
  const SQL = await initSqlJs({ locateFile: () => wasmPath });
  if (fs.existsSync(dbPath)) {
    db = new SQL.Database(fs.readFileSync(dbPath));
  } else {
    db = new SQL.Database();
  }
  db.exec(SCHEMA);
  migrate();
  return { dbPath, dbDir };
}

function clearAllData() {
  for (const table of TABLES) {
    if (table === 'settings') continue;
    run(`DELETE FROM ${table}`);
  }
  persist();
}

function exportSnapshot() {
  const snapshot = { version: 1, exportedAt: new Date().toISOString(), tables: {} };
  for (const table of TABLES) {
    snapshot.tables[table] = listRows(table);
  }
  return snapshot;
}

function importSnapshot(snapshot) {
  if (!snapshot || !snapshot.tables) throw new Error('备份文件格式不正确');
  for (const table of TABLES) run(`DELETE FROM ${table}`);
  for (const [table, rows] of Object.entries(snapshot.tables)) {
    if (!TABLES.has(table) || !Array.isArray(rows)) continue;
    for (const row of rows) {
      const clean = sanitizeColumns(table, row);
      const cols = Object.keys(clean);
      if (!cols.length) continue;
      run(`INSERT INTO ${table} (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`, cols.map(c => clean[c]));
    }
  }
  persist();
}

function getDbPath() { return dbPath; }
function getDbDir() { return dbDir; }

module.exports = {
  init, all, get, run, persist, insertRow, updateRow, deleteRow, listRows,
  getRow, getSetting, setSetting, clearAllData, exportSnapshot, importSnapshot,
  getDbPath, getDbDir, TABLES
};
