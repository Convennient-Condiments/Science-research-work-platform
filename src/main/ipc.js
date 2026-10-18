const { ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const db = require('./db');
const stats = require('./services/stats');
const reviews = require('./services/reviews');
const exporters = require('./services/exporters');
const backup = require('./services/backup');
const integrations = require('./services/integrations');
const careerService = require('./services/career');

function registerIpc(win) {
  ipcMain.handle('phd:version', () => require('../../package.json').version);

  ipcMain.handle('phd:settings:get', (_e, key) => db.getSetting(key, null));
  ipcMain.handle('phd:settings:set', (_e, key, value) => {
    db.setSetting(key, value);
    return db.getSetting(key, null);
  });
  ipcMain.handle('phd:settings:all', () => db.listRows('settings'));

  ipcMain.handle('phd:table:list', (_e, table, orderBy) => db.listRows(table, orderBy || 'rowid DESC'));
  ipcMain.handle('phd:table:insert', (_e, table, row) => db.insertRow(table, row));
  ipcMain.handle('phd:table:update', (_e, table, id, row) => db.updateRow(table, id, row));
  ipcMain.handle('phd:table:delete', (_e, table, id) => db.deleteRow(table, id));

  ipcMain.handle('phd:stats:overview', () => stats.overview());
  ipcMain.handle('phd:stats:weekly', (_e, period) => stats.weeklyStats(period));
  ipcMain.handle('phd:stats:charts', () => stats.charts());
  ipcMain.handle('phd:thesis:progress', () => stats.thesisProgress());

  ipcMain.handle('phd:clock:start', (_e, category, note) => {
    return db.insertRow('clock_records', { started_at: new Date().toISOString(), ended_at: '', category: category || '实验操作', note: note || '', source: 'manual' });
  });
  ipcMain.handle('phd:clock:stop', (_e, id) => {
    const row = db.getRow('clock_records', id);
    if (!row) throw new Error('记录不存在');
    return db.updateRow('clock_records', id, { ended_at: new Date().toISOString() });
  });
  ipcMain.handle('phd:clock:active', () => db.all(`SELECT * FROM clock_records WHERE ended_at IS NULL OR ended_at = '' ORDER BY started_at DESC`));
  ipcMain.handle('phd:clock:today', () => {
    const start = new Date(); start.setHours(0, 0, 0, 0);
    return db.all(`SELECT * FROM clock_records WHERE started_at >= ? ORDER BY started_at ASC`, [start.toISOString()]);
  });

  ipcMain.handle('phd:reviews:autofillWeekly', (_e, weekStart) => reviews.autofillWeekly(weekStart));
  ipcMain.handle('phd:reviews:autofillMonthly', (_e, month) => reviews.autofillMonthly(month));
  ipcMain.handle('phd:reviews:aggregateMonthWeeks', (_e, month) => reviews.aggregateMonthWeeks(month));
  ipcMain.handle('phd:reviews:exportDocx', (_e, type, id) => exporters.exportReviewDocx(win, type, id));
  ipcMain.handle('phd:reviews:exportPdf', (_e, type, id) => exporters.exportReviewPdf(win, type, id));

  ipcMain.handle('phd:export:excel', () => exporters.exportExcel(win));
  ipcMain.handle('phd:export:png', (_e, dataUrl) => exporters.savePng(win, dataUrl));

  ipcMain.handle('phd:backup:now', () => backup.backupNow());
  ipcMain.handle('phd:backup:choosePath', async () => {
    const result = await dialog.showOpenDialog(win, { properties: ['openDirectory', 'createDirectory'] });
    if (result.canceled || !result.filePaths.length) return { canceled: true };
    db.setSetting('backup_path', result.filePaths[0]);
    return { canceled: false, path: result.filePaths[0] };
  });
  ipcMain.handle('phd:backup:exportJson', () => backup.exportJson(win));
  ipcMain.handle('phd:backup:importJson', () => backup.importJson(win));

  ipcMain.handle('phd:integrations:zotero', () => integrations.zoteroSync());
  ipcMain.handle('phd:integrations:zoteroPush', (_e, items) => integrations.zoteroPush(items));
  ipcMain.handle('phd:integrations:overleaf', () => integrations.overleafSync());
  ipcMain.handle('phd:integrations:overleafImport', () => integrations.overleafImport(win));
  ipcMain.handle('phd:integrations:innovation', () => integrations.refreshInnovation());
  ipcMain.handle('phd:career:labPapers', (_e, labId) => careerService.refreshLabPapers(labId));
  ipcMain.handle('phd:career:quarterlyPush', () => careerService.pushQuarterlyInfos());
  ipcMain.handle('phd:career:bookPush', () => careerService.pushBookUpdates());

  ipcMain.handle('phd:file:pick', async (_e, purpose) => {
    const result = await dialog.showOpenDialog(win, { properties: ['openFile'] });
    if (result.canceled || !result.filePaths.length) return { canceled: true };
    const src = result.filePaths[0];
    const dir = path.join(db.getDbDir(), 'attachments');
    fs.mkdirSync(dir, { recursive: true });
    const name = `${Date.now()}-${path.basename(src)}`;
    const dest = path.join(dir, name);
    fs.copyFileSync(src, dest);
    return { canceled: false, path: dest, original: src, purpose };
  });
  ipcMain.handle('phd:file:open', (_e, filePath) => shell.openPath(filePath));
  ipcMain.handle('phd:file:openExternal', (_e, url) => shell.openExternal(url));
}

module.exports = { registerIpc };
