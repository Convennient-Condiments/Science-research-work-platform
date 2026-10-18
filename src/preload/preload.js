const { contextBridge, ipcRenderer } = require('electron');

function invoke(channel, ...args) {
  return ipcRenderer.invoke(channel, ...args);
}

contextBridge.exposeInMainWorld('phd', {
  version: () => invoke('phd:version'),
  settingsGet: (key) => invoke('phd:settings:get', key),
  settingsSet: (key, value) => invoke('phd:settings:set', key, value),
  settingsAll: () => invoke('phd:settings:all'),
  list: (table, orderBy) => invoke('phd:table:list', table, orderBy),
  insert: (table, row) => invoke('phd:table:insert', table, row),
  update: (table, id, row) => invoke('phd:table:update', table, id, row),
  remove: (table, id) => invoke('phd:table:delete', table, id),
  statsOverview: () => invoke('phd:stats:overview'),
  statsWeekly: (period) => invoke('phd:stats:weekly', period),
  statsCharts: () => invoke('phd:stats:charts'),
  thesisProgress: () => invoke('phd:thesis:progress'),
  clockStart: (category, note) => invoke('phd:clock:start', category, note),
  clockStop: (id) => invoke('phd:clock:stop', id),
  clockActive: () => invoke('phd:clock:active'),
  clockToday: () => invoke('phd:clock:today'),
  reviewAutofillWeekly: (weekStart) => invoke('phd:reviews:autofillWeekly', weekStart),
  reviewAutofillMonthly: (month) => invoke('phd:reviews:autofillMonthly', month),
  reviewAggregateMonthWeeks: (month) => invoke('phd:reviews:aggregateMonthWeeks', month),
  reviewExportDocx: (type, id) => invoke('phd:reviews:exportDocx', type, id),
  reviewExportPdf: (type, id) => invoke('phd:reviews:exportPdf', type, id),
  exportExcel: () => invoke('phd:export:excel'),
  exportPng: (dataUrl) => invoke('phd:export:png', dataUrl),
  backupNow: () => invoke('phd:backup:now'),
  backupChoosePath: () => invoke('phd:backup:choosePath'),
  backupExportJson: () => invoke('phd:backup:exportJson'),
  backupImportJson: () => invoke('phd:backup:importJson'),
  zoteroSync: () => invoke('phd:integrations:zotero'),
  zoteroPush: (items) => invoke('phd:integrations:zoteroPush', items),
  overleafSync: () => invoke('phd:integrations:overleaf'),
  overleafImport: () => invoke('phd:integrations:overleafImport'),
  innovationRefresh: () => invoke('phd:integrations:innovation'),
  careerLabPapers: (labId) => invoke('phd:career:labPapers', labId),
  careerQuarterlyPush: () => invoke('phd:career:quarterlyPush'),
  careerBookPush: () => invoke('phd:career:bookPush'),
  pickFile: (purpose) => invoke('phd:file:pick', purpose),
  openPath: (filePath) => invoke('phd:file:open', filePath),
  openExternal: (url) => invoke('phd:file:openExternal', url),
  onReminder: (callback) => {
    ipcRenderer.removeAllListeners('phd:reminder');
    ipcRenderer.on('phd:reminder', (_e, payload) => callback(payload));
  }
});
