const { Notification } = require('electron');
const db = require('../db');
const backup = require('./backup');
const integrations = require('./integrations');
const careerService = require('./career');

class ReminderService {
  constructor(win) {
    this.win = win;
    this.lastSedentary = Date.now();
    this.lastAlarmKey = '';
    this.lastUnreadNotified = '';
    this.lastOverleafNotified = '';
    this.lastInfoUnreadNotified = '';
    this.lastBookUnreadNotified = '';
    this.timers = [];
  }

  notify(type, title, body, payload = {}) {
    if (this.win && !this.win.isDestroyed()) {
      this.win.webContents.send('phd:reminder', { type, title, body, ...payload });
    }
    if (Notification.isSupported()) {
      try { new Notification({ title, body }).show(); } catch { /* ignore */ }
    }
  }

  start() {
    this.timers.push(setInterval(() => this.checkAlarms(), 30000));
    this.timers.push(setInterval(() => this.checkSedentary(), 60000));
    this.timers.push(setInterval(() => this.checkUnreadInnovation(), 600000));
    this.timers.push(setInterval(() => this.checkOverleafStale(), 600000));
    this.timers.push(setInterval(() => this.checkBackup(), 600000));
    this.timers.push(setInterval(() => this.checkScheduledSync(), 600000));
    this.timers.push(setInterval(() => this.checkQuarterlyInfos(), 1800000));
    this.timers.push(setInterval(() => this.checkBookPush(), 1800000));
    setTimeout(() => this.checkQuarterlyInfos(), 20000);
    setTimeout(() => this.checkBookPush(), 25000);
  }

  stop() {
    for (const t of this.timers) clearInterval(t);
    this.timers = [];
  }

  checkAlarms() {
    const alarms = db.getSetting('alarms', []);
    if (!Array.isArray(alarms) || !alarms.length) return;
    const now = new Date();
    const key = `${now.toDateString()}-${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const match = alarms.find(a => {
      const [h, m] = String(a.time || '').split(':').map(Number);
      return h === now.getHours() && m === now.getMinutes();
    });
    if (match && this.lastAlarmKey !== key) {
      this.lastAlarmKey = key;
      this.notify('alarm', '工作时段提醒', match.label || '自定义工作时段提醒', { label: match.label, time: match.time });
    }
  }

  checkSedentary() {
    if (!db.getSetting('sedentary_enabled', true)) return;
    const interval = Math.max(20, Number(db.getSetting('sedentary_minutes', 60)) || 60) * 60000;
    if (Date.now() - this.lastSedentary >= interval) {
      this.lastSedentary = Date.now();
      this.notify('sedentary', '久坐健康提醒', '已连续专注一段时间，起身活动 2 分钟，放松肩颈与眼睛。');
    }
  }

  checkUnreadInnovation() {
    const threeDaysAgo = new Date(Date.now() - 3 * 86400000).toISOString().slice(0, 10);
    const today = new Date().toISOString().slice(0, 10);
    const unread = db.get(`SELECT COUNT(*) AS c FROM innovation_literature WHERE status = 'unread' AND added_at <= ?`, [threeDaysAgo]);
    if (unread && unread.c > 0 && this.lastUnreadNotified !== today) {
      this.lastUnreadNotified = today;
      this.notify('innovation-unread', '创新文献待阅读', `你有 ${unread.c} 篇精选创新文献已超过 3 天未阅读，抽空看一下。`, { count: unread.c });
    }
  }

  checkOverleafStale() {
    const cfg = db.getSetting('overleaf', { enabled: false, last_sync_at: null });
    if (!cfg.enabled || !cfg.last_sync_at) return;
    const today = new Date().toISOString().slice(0, 10);
    const stale = new Date(cfg.last_sync_at).getTime() < Date.now() - 7 * 86400000;
    if (stale && this.lastOverleafNotified !== today) {
      this.lastOverleafNotified = today;
      this.notify('overleaf-stale', '论文写作预警', 'Overleaf 项目已连续 7 天没有同步更新，记得推进论文写作。');
    }
  }

  checkBackup() {
    const intervalDays = Number(db.getSetting('backup_interval_days', 3)) || 3;
    const last = db.getSetting('last_backup_at', null);
    if (last && Date.now() - new Date(last).getTime() < intervalDays * 86400000) return;
    try {
      const result = backup.backupNow();
      this.notify('backup-done', '本地备份完成', `数据已备份至：${result.filePath}`, { filePath: result.filePath });
    } catch (err) {
      this.notify('backup-error', '备份失败', err.message);
    }
  }

  checkScheduledSync() {
    const now = new Date();
    const todayKey = now.toISOString().slice(0, 10);
    const innovationCfg = db.getSetting('innovation_auto_refresh', true);
    const lastInnovation = db.getSetting('last_innovation_refresh', null);
    const lastInnovationDay = lastInnovation ? lastInnovation.slice(0, 10) : '';
    const innovationHour = Number(db.getSetting('innovation_hour', 8));
    if (innovationCfg && lastInnovationDay !== todayKey && now.getHours() >= innovationHour) {
      integrations.refreshInnovation().catch(() => {});
    }
    const zoteroCfg = db.getSetting('zotero', { auto_sync: false, last_sync_at: null });
    if (zoteroCfg.enabled && zoteroCfg.auto_sync && zoteroCfg.last_sync_at) {
      const hours = Number(zoteroCfg.sync_hours || 24);
      if (Date.now() - new Date(zoteroCfg.last_sync_at).getTime() >= hours * 3600000) {
        integrations.zoteroSync().then(r => {
          db.setSetting('zotero', { ...zoteroCfg, last_sync_at: new Date().toISOString() });
          if (!r.ok) this.notify('sync-error', 'Zotero 定时同步失败', r.message);
        });
      }
    }
  }

  checkQuarterlyInfos() {
    try {
      const pushed = careerService.pushQuarterlyInfos();
      if (pushed.length) {
        const summary = pushed.map(p => `${careerService.CYCLE_LABELS[p.track] || p.track} ${p.count} 条`).join('；');
        this.notify('info-quarterly', '赛道情报季度更新', `以下文件夹已推送新情报：${summary}，记得阅读并记录关键信息与感悟`, { pushed });
      }
      const today = new Date().toISOString().slice(0, 10);
      if (this.lastInfoUnreadNotified !== today) {
        const unread = db.all(`SELECT track, COUNT(*) AS c FROM career_infos WHERE status = 'unread' GROUP BY track`);
        const total = unread.reduce((s, r) => s + r.c, 0);
        if (total > 0) {
          this.lastInfoUnreadNotified = today;
          const detail = unread.map(r => `${careerService.CYCLE_LABELS[r.track] || r.track} ${r.c} 条`).join('；');
          this.notify('info-unread', '赛道情报待阅读', `有 ${total} 条情报待阅读（${detail}），抽空阅读并记录感悟`);
        }
      }
    } catch { /* 情报提醒失败不阻塞主流程 */ }
  }

  checkBookPush() {
    try {
      const pushed = careerService.pushBookUpdates();
      if (pushed.length) {
        this.notify('book-push', '书单半年更新', `精推 ${pushed.length} 本文社科经典：${pushed.join('；')}，记得阅读并记录读书感受`);
      }
      const today = new Date().toISOString().slice(0, 10);
      if (this.lastBookUnreadNotified !== today) {
        const unread = db.get(`SELECT COUNT(*) AS c FROM career_books WHERE status = '未读'`).c;
        if (unread > 0) {
          this.lastBookUnreadNotified = today;
          this.notify('book-unread', '书单待阅读', `还有 ${unread} 本书未读，抽空阅读并记录读书灵感`);
        }
      }
    } catch { /* 书单提醒失败不阻塞主流程 */ }
  }
}

module.exports = { ReminderService };
