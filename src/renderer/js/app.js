(() => {
  const U = window.ui;
  const A = window.api;
  const I = ICONS.icon;
  const core = window.viewsCore;
  const career = window.viewsCareer;
  const extra = window.viewsExtra;

  const NAV = [
    { group: '工作台', items: [
      { id: 'overview', label: '总览首页', icon: 'home' },
      { id: 'dashboard', label: '数据仪表盘', icon: 'chart' },
      { id: 'clock', label: '科研打卡与工时', icon: 'clock' }
    ]},
    { group: '课题与论文', items: [
      { id: 'project', label: '课题核心管理', icon: 'flask' },
      { id: 'thesis', label: '毕业论文整体进度', icon: 'book' },
      { id: 'milestones', label: '关键进展 & 里程碑', icon: 'flag' }
    ]},
    { group: '毕业与职业', items: [
      { id: 'career', label: '五赛道毕业规划', icon: 'target' },
      { id: 'careerInfo', label: '赛道情报推送', icon: 'spark' },
      { id: 'careerLabs', label: '海外课题组跟踪', icon: 'send' },
      { id: 'careerInspire', label: '平日灵感库', icon: 'edit' },
      { id: 'careerBooks', label: '分模块书单', icon: 'book' }
    ]},
    { group: '任务与投稿', items: [
      { id: 'tasks', label: '任务管理中心', icon: 'check' },
      { id: 'submissions', label: '投稿全生命周期', icon: 'send' }
    ]},
    { group: '文献与同步', items: [
      { id: 'literature', label: '文献管理专区', icon: 'library' },
      { id: 'innovation', label: '创新精选文献专区', icon: 'spark' },
      { id: 'zotero', label: 'Zotero / Overleaf 同步', icon: 'sync' }
    ]},
    { group: '复盘与导师', items: [
      { id: 'weekly', label: '每周总结复盘', icon: 'calendar' },
      { id: 'monthly', label: '月度总结复盘', icon: 'calendar-check' },
      { id: 'advisor', label: '导师向上管理', icon: 'users' }
    ]},
    { group: '辅助与成就', items: [
      { id: 'health', label: '健康与学习辅助', icon: 'heart' },
      { id: 'achievements', label: '成就殿堂', icon: 'award' },
      { id: 'settings', label: '数据管理与设置', icon: 'settings' }
    ]}
  ];

  const VIEWS = { ...core, ...career, ...extra };
  let currentView = 'overview';
  let paletteItems = [];
  let paletteIndex = 0;

  const COMMANDS = [
    { cmd: '/clock', label: '快速启动科研打卡计时', run: async () => { navigate('clock'); await delay(120); core.helpers.startClockFromHome(); } },
    { cmd: '/weekly', label: '新建本周复盘文档', run: async () => { navigate('weekly'); await delay(120); extra.helpers.openWeeklyModal(); } },
    { cmd: '/monthly', label: '新建月度总结复盘文档', run: async () => { navigate('monthly'); await delay(120); extra.helpers.openMonthlyModal(); } },
    { cmd: '/milestone', label: '录入课题关键里程碑进展', run: async () => { navigate('milestones'); await delay(120); core.helpers.openMilestoneModal(); } },
    { cmd: '/task', label: '新建科研待办任务', run: async () => { navigate('tasks'); await delay(120); core.helpers.openTaskModal(); } },
    { cmd: '/literature', label: '录入普通文献精读笔记', run: async () => { navigate('literature'); await delay(120); extra.helpers.openLiteratureNoteModal(null); } },
    { cmd: '/zotero-sync', label: '手动触发 Zotero 文献双向同步', run: async () => { navigate('zotero'); await delay(200); const r = await A.zoteroSync(); U.toast(r.ok ? 'success' : 'error', r.message); refresh(); } },
    { cmd: '/overleaf-sync', label: '手动同步 Overleaf 写作进度数据', run: async () => { navigate('zotero'); await delay(200); const r = await A.overleafSync(); U.toast(r.ok ? 'success' : 'error', r.message); refresh(); } },
    { cmd: '/export-excel', label: '全量业务数据导出为 Excel 文件', run: async () => { const r = await A.exportExcel(); if (r && !r.canceled) U.toast('success', `Excel 已导出：${r.filePath}`); } },
    { cmd: '/tutor', label: '快速记录导师沟通纪要', run: async () => { navigate('advisor'); await delay(120); document.getElementById('adv-comm-add') && document.getElementById('adv-comm-add').click(); } },
    { cmd: '/innovate-ref', label: '打开创新精选文献专属阅读板块', run: () => navigate('innovation') },
    { cmd: '/refresh-innovate', label: '手动立即刷新本周创新精选文献库', run: async () => { navigate('innovation'); await delay(120); U.toast('info', '正在刷新创新精选文献…'); const r = await A.innovationRefresh(); U.toast(r.ok ? 'success' : 'error', r.message); refresh(); } },
    { cmd: '/career', label: '打开五赛道毕业与职业规划', run: () => navigate('career') }
  ];

  function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

  async function buildSidebar() {
    const sidebar = document.getElementById('sidebar');
    const collapsed = await A.settingsGet('sidebar_collapsed') || false;
    document.getElementById('app').classList.toggle('sidebar-collapsed', !!collapsed);
    const groups = NAV.map(g => `
      <div class="nav-group">
        <div class="nav-group-title">${g.group}</div>
        ${g.items.map(item => `<button class="nav-item" data-view="${item.id}" title="${item.label}">${I(item.icon, 18)}<span class="nav-text">${item.label}</span><span class="nav-badge hidden" data-badge="${item.id}"></span></button>`).join('')}
      </div>`).join('');
    sidebar.innerHTML = `
      <div class="sidebar-brand">
        <div class="brand-mark">P</div>
        <div class="brand-name"><b>PhD Master</b><span>科研一体化工作台</span></div>
      </div>
      <nav class="sidebar-nav">${groups}</nav>
      <div class="sidebar-foot">
        <button class="collapse-btn" id="sidebar-collapse">${I('chevron-left', 18)}<span class="collapse-label">收起侧边栏</span></button>
      </div>`;
    sidebar.querySelectorAll('.nav-item').forEach(btn => btn.addEventListener('click', () => navigate(btn.dataset.view)));
    sidebar.querySelector('#sidebar-collapse').addEventListener('click', async () => {
      const appEl = document.getElementById('app');
      const collapsedNow = appEl.classList.toggle('sidebar-collapsed');
      const btn = sidebar.querySelector('#sidebar-collapse');
      btn.innerHTML = `${I(collapsedNow ? 'chevron-right' : 'chevron-left', 18)}<span class="collapse-label">${collapsedNow ? '展开侧边栏' : '收起侧边栏'}</span>`;
      await A.settingsSet('sidebar_collapsed', collapsedNow);
    });
    updateNavActive();
  }

  async function buildTopbar() {
    const enabled = await A.settingsGet('command_enabled');
    const topbar = document.getElementById('topbar');
    const theme = await A.settingsGet('theme') || 'blue';
    topbar.innerHTML = `
      <div class="topbar-title"><b>PhD Master Workspace</b><span style="margin-left:8px">博士全周期科研一体化桌面工作台</span></div>
      ${enabled === false ? '' : `
      <div class="command-box">
        ${I('command', 16, 'command-icon')}
        <input class="command-input" id="command-input" placeholder="输入 /clock、/weekly、/task 等指令快速唤起功能" autocomplete="off">
        <span class="command-kbd">Ctrl K</span>
      </div>`}
      <div class="topbar-actions">
        <span class="topbar-date">${new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'short' })}</span>
        <button class="icon-btn" id="theme-toggle" title="切换主题">${I('sun', 18)}</button>
        <button class="icon-btn" id="top-settings" title="系统设置">${I('settings', 18)}</button>
      </div>`;
    document.getElementById('theme-toggle').addEventListener('click', async () => {
      const current = await A.settingsGet('theme') || 'blue';
      const next = current === 'blue' ? 'orange' : 'blue';
      await A.settingsSet('theme', next);
      applyTheme(next);
      U.toast('success', next === 'orange' ? '已切换：活力橙科研模式' : '已切换：静谧蓝专注模式');
    });
    document.getElementById('top-settings').addEventListener('click', () => navigate('settings'));
    const input = document.getElementById('command-input');
    if (input) {
      input.addEventListener('focus', () => openPalette(input));
      input.addEventListener('input', () => openPalette(input));
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closePalette();
        if (e.key === 'ArrowDown') { e.preventDefault(); movePalette(1); }
        if (e.key === 'ArrowUp') { e.preventDefault(); movePalette(-1); }
        if (e.key === 'Enter') {
          e.preventDefault();
          const item = paletteItems[paletteIndex];
          if (item) { closePalette(); item.run(); }
        }
      });
      document.addEventListener('click', (e) => {
        if (!e.target.closest('.command-box')) closePalette();
      });
    }
  }

  function openPalette(input) {
    const root = document.getElementById('palette-root');
    const q = (input.value || '').trim().toLowerCase();
    const navItems = NAV.flatMap(g => g.items).map(n => ({ cmd: `/${n.id}`, label: `打开：${n.label}`, run: () => navigate(n.id) }));
    const navMatched = navItems.filter(n => !q || n.cmd.includes(q) || n.label.toLowerCase().includes(q));
    const cmdMatched = COMMANDS.filter(c => !q || c.cmd.toLowerCase().includes(q) || c.label.toLowerCase().includes(q));
    const all = [...cmdMatched, ...navMatched].slice(0, 9);
    paletteItems = all;
    paletteIndex = 0;
    if (!all.length) {
      root.innerHTML = `<div class="palette open"><div class="palette-empty">没有匹配的指令，试试 /clock、/weekly、/task</div></div>`;
      return;
    }
    root.innerHTML = `<div class="palette open"><div class="palette-list">
      ${all.map((item, i) => `<button class="palette-item ${i === 0 ? 'selected' : ''}"><code>${item.cmd}</code><span class="palette-desc">${item.label}</span>${I('arrow-right', 14)}</button>`).join('')}
    </div></div>`;
    root.querySelectorAll('.palette-item').forEach((btn, i) => btn.addEventListener('click', () => {
      const item = paletteItems[i];
      closePalette();
      if (item) item.run();
    }));
  }

  function movePalette(delta) {
    if (!paletteItems.length) return;
    paletteIndex = (paletteIndex + delta + paletteItems.length) % paletteItems.length;
    const root = document.getElementById('palette-root');
    root.querySelectorAll('.palette-item').forEach((btn, i) => {
      btn.classList.toggle('selected', i === paletteIndex);
      if (i === paletteIndex) btn.scrollIntoView({ block: 'nearest' });
    });
  }

  function closePalette() {
    const root = document.getElementById('palette-root');
    root.innerHTML = '';
    paletteItems = [];
  }

  function updateNavActive() {
    document.querySelectorAll('.nav-item').forEach(btn => btn.classList.toggle('active', btn.dataset.view === currentView));
  }

  async function navigate(id) {
    const view = VIEWS[id];
    if (!view) return;
    currentView = id;
    updateNavActive();
    const content = document.getElementById('content');
    content.innerHTML = '<div class="empty-state">加载中…</div>';
    try {
      const html = await view.render();
      content.innerHTML = html;
      view.mount();
      content.scrollTop = 0;
      refreshBadges();
    } catch (err) {
      content.innerHTML = `<div class="empty-state">页面加载失败：${U.esc(err.message)}</div>`;
    }
  }

  async function refreshBadges() {
    try {
      const items = await A.list('innovation_literature');
      const unread = items.filter(x => x.status === 'unread').length;
      document.querySelectorAll('[data-badge="innovation"]').forEach(el => {
        el.classList.toggle('hidden', !unread);
        el.textContent = unread > 99 ? '99+' : unread;
      });
    } catch { /* ignore */ }
  }

  function applyTheme(theme) {
    const appEl = document.getElementById('app');
    appEl.classList.remove('theme-blue', 'theme-orange');
    appEl.classList.add(theme === 'orange' ? 'theme-orange' : 'theme-blue');
  }

  function refresh() {
    navigate(currentView);
  }

  async function init() {
    await buildSidebar();
    await buildTopbar();
    const theme = await A.settingsGet('theme') || 'blue';
    applyTheme(theme);
    await navigate('overview');

    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        const input = document.getElementById('command-input');
        if (input) { input.focus(); input.select(); }
      }
    });

    A.onReminder((payload) => {
      U.toast('warning', `${payload.title}：${payload.body}`);
      if (payload.type === 'innovation-unread') {
        setTimeout(() => navigate('innovation'), 600);
      }
    });

    window.app = { navigate, refresh, applyTheme };
  }

  init();
})();
