const { app, BrowserWindow } = require('electron');
const path = require('path');
const db = require('./db');
const { seed, ensureSettings, ensureCareerSeed, ensureCareerExtras } = require('./seed');
const { registerIpc } = require('./ipc');
const { ReminderService } = require('./services/reminders');

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
}

const APP_ROOT = path.resolve(__dirname, '../..');
if (process.argv.includes('--smoke') || process.argv.includes('--shots')) {
  app.setPath('userData', path.join(APP_ROOT, '.smoke-data'));
} else {
  app.setPath('userData', APP_ROOT);
}

let mainWindow = null;
let reminderService = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1120,
    minHeight: 720,
    title: 'PhD Master Workspace',
    backgroundColor: '#eef2f7',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  mainWindow.once('ready-to-show', () => mainWindow.show());
  if (process.argv.includes('--shots')) {
    mainWindow.webContents.on('console-message', (_e, level, message) => {
      if (level >= 2) console.log(`[renderer:${level}] ${message}`);
    });
    setTimeout(async () => {
      try {
        const fs = require('fs');
        const shotDir = path.join(APP_ROOT, 'docs', 'screenshots');
        fs.mkdirSync(shotDir, { recursive: true });
        const ids = ['overview', 'dashboard', 'clock', 'milestones', 'project', 'thesis', 'career', 'careerInfo', 'careerLabs', 'careerInspire', 'careerBooks', 'tasks', 'submissions', 'literature', 'innovation', 'zotero', 'weekly', 'monthly', 'advisor', 'health', 'achievements', 'settings'];
        for (const id of ids) {
          try {
            await mainWindow.webContents.executeJavaScript(`window.app.navigate('${id}')`);
            await new Promise(r => setTimeout(r, 700));
            const image = await mainWindow.webContents.capturePage();
            fs.writeFileSync(path.join(shotDir, `${id}.png`), image.toPNG());
            console.log(`SHOT_OK ${id}`);
          } catch (err) {
            console.log(`SHOT_FAIL ${id}: ${err.message}`);
          }
        }
        console.log('SHOTS_DONE');
      } catch (err) {
        console.error('SHOTS_FAIL', err);
      }
      app.quit();
    }, 4000);
  } else if (process.argv.includes('--smoke')) {
    mainWindow.webContents.on('console-message', (_e, level, message) => {
      if (level >= 2) console.log(`[renderer:${level}] ${message}`);
    });
    setTimeout(async () => {
      try {
        const fs = require('fs');
        const ids = ['overview', 'dashboard', 'clock', 'milestones', 'career', 'careerInfo', 'careerLabs', 'careerInspire', 'careerBooks', 'tasks', 'submissions', 'literature', 'innovation', 'zotero', 'weekly', 'monthly', 'advisor', 'health', 'achievements', 'settings'];
        const results = [];
        for (const id of ids) {
          try {
            const info = await mainWindow.webContents.executeJavaScript(`(async () => {
              await window.app.navigate('${id}');
              await new Promise(r => setTimeout(r, 120));
              return {
                buttons: document.querySelectorAll('#content button').length,
                title: document.querySelector('.page-head h1') ? document.querySelector('.page-head h1').textContent : '',
                text: (document.querySelector('#content') || {}).innerText ? document.querySelector('#content').innerText.slice(0, 40) : ''
              }; })()`);
            results.push(`${id}:${JSON.stringify(info)}`);
          } catch (err) {
            results.push(`${id}:ERROR ${err.message}`);
          }
        }
        console.log('SMOKE_RESULTS');
        console.log(results.join('\n'));
        console.log('SMOKE_DONE');
      } catch (err) {
        console.error('SMOKE_FAIL', err);
      }
      app.quit();
    }, 5500);
  }
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

app.whenReady().then(async () => {
  await db.init(app.getPath('userData'));
  seed();
  ensureSettings();
  ensureCareerSeed();
  ensureCareerExtras();
  registerIpc(mainWindow);
  createWindow();
  reminderService = new ReminderService(mainWindow);
  reminderService.start();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  if (reminderService) reminderService.stop();
});
