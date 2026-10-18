const path = require('path');
const fs = require('fs');
const { dialog } = require('electron');
const db = require('../db');

function backupDir() {
  const configured = db.getSetting('backup_path', '');
  const dir = configured || path.join(db.getDbDir(), 'backups');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function backupNow() {
  const dir = backupDir();
  const stamp = new Date().toISOString().replace(/[-:]/g, '').slice(0, 14).replace('T', '-');
  const dest = path.join(dir, `phd-workspace-${stamp}.db`);
  fs.copyFileSync(db.getDbPath(), dest);
  const files = fs.readdirSync(dir).filter(f => f.startsWith('phd-workspace-') && f.endsWith('.db')).sort();
  while (files.length > 20) fs.unlinkSync(path.join(dir, files.shift()));
  db.setSetting('last_backup_at', new Date().toISOString());
  return { filePath: dest, dir };
}

async function exportJson(win) {
  const result = await dialog.showSaveDialog(win, {
    defaultPath: `PhD-Master-Workspace-数据备份-${new Date().toISOString().slice(0, 10)}.json`,
    filters: [{ name: 'JSON 备份包', extensions: ['json'] }]
  });
  if (result.canceled || !result.filePath) return { canceled: true };
  const snapshot = db.exportSnapshot();
  fs.writeFileSync(result.filePath, JSON.stringify(snapshot, null, 2), 'utf8');
  return { canceled: false, filePath: result.filePath };
}

async function importJson(win) {
  const result = await dialog.showOpenDialog(win, { properties: ['openFile'], filters: [{ name: 'JSON 备份包', extensions: ['json'] }] });
  if (result.canceled || !result.filePaths.length) return { canceled: true };
  const file = result.filePaths[0];
  const raw = fs.readFileSync(file, 'utf8');
  const snapshot = JSON.parse(raw);
  backupNow();
  db.importSnapshot(snapshot);
  return { canceled: false, filePath: file, message: '导入成功，原有数据已先自动备份' };
}

module.exports = { backupNow, exportJson, importJson, backupDir };
