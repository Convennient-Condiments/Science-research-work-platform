(() => {
  const U = window.ui;
  const A = window.api;
  const C = window.charts;
  const I = ICONS.icon;

  const CLOCK_CATEGORIES = ['实验操作', '文献阅读', '论文写作', '数据分析', '组会汇报'];
  const FIELD_LABELS = { biology: '生物', medicine: '医学', materials: '材料', cross: 'AI交叉' };

  function pickUrl(x) {
    if (x && typeof x.url === 'string' && /^https?:\/\//i.test(x.url)) return x.url;
    if (x && x.doi) return `https://doi.org/${x.doi}`;
    return `https://scholar.google.com/scholar?q=${encodeURIComponent((x && x.title) || '')}`;
  }

  function statusBadge(status) {
    const map = {
      done: ['success', '已完成'], doing: ['primary', '进行中'], todo: ['gray', '待办'],
      '待投稿': ['gray', '待投稿'], '投递中': ['primary', '投递中'], '外审阶段': ['warning', '外审中'],
      '返修修改': ['orange', '返修中'], '录用': ['success', '已录用'], '见刊': ['success', '已见刊'],
      unread: ['warning', '未读'], read: ['success', '已读'], draft: ['gray', '草稿'], done2: ['success', '已定稿']
    };
    const m = map[status];
    return U.badge(m ? m[1] : status, m ? m[0] : 'gray');
  }

  function metric(label, value, iconName) {
    return `<div class="metric-card"><div class="metric-icon">${I(iconName, 17)}</div><div><div class="metric-value">${U.esc(value)}</div><div class="metric-label">${U.esc(label)}</div></div></div>`;
  }

  function reminderItem(iconName, title, text, tone, go) {
    return `<button class="reminder-item tone-${tone}" data-go="${go}"><div class="reminder-icon">${I(iconName, 18)}</div><div class="reminder-text"><b>${U.esc(title)}</b><span>${U.esc(text)}</span></div>${I('arrow-right', 15)}</button>`;
  }

  async function renderOverview() {
    const [ov, weekly, active, innovations] = await Promise.all([A.statsOverview(), A.statsWeekly('week'), A.clockActive(), A.list('innovation_literature', 'added_at DESC, id DESC')]);
    const running = active[0];
    const cards = [
      U.statCard({ iconName: 'check', label: '进行中科研任务', value: ov.activeTasks, sub: `本周完成 ${ov.doneTasks} 项`, accent: 'blue' }),
      U.statCard({ iconName: 'send', label: '在投稿件', value: ov.inReviewSubmissions, sub: '覆盖外审与返修', accent: 'orange' }),
      U.statCard({ iconName: 'flag', label: '毕业论文整体进度', value: `${ov.thesis.progress}%`, sub: `里程碑 ${ov.thesis.doneCount}/${ov.thesis.totalCount}`, accent: 'green' }),
      U.statCard({ iconName: 'target', label: '习惯打卡完成率', value: `${ov.habitRate}%`, sub: '本周作息与运动', accent: 'purple' }),
      U.statCard({ iconName: 'users', label: '待处理导师事项', value: ov.advisorPending, sub: '待咨询问题归集', accent: 'red' }),
      U.statCard({ iconName: 'file-text', label: '待撰写复盘', value: ov.pendingReviews, sub: '周报与月报草稿', accent: 'yellow' }),
      U.statCard({ iconName: 'award', label: '已解锁成就', value: ov.achievements, sub: '继续积累勋章', accent: 'teal' }),
      U.statCard({ iconName: 'spark', label: '创新文献待读', value: ov.unreadInnovation, sub: '超过 3 天会弹窗提醒', accent: 'pink' })
    ].join('');

    const weeklyPanel = U.panel('周维度统计', `
      <div class="segmented" data-role="period">
        <button data-period="day" class="seg active">日</button>
        <button data-period="week" class="seg">周</button>
        <button data-period="month" class="seg">月</button>
      </div>
      <div class="metric-grid" id="weekly-metrics">
        ${metric('有效专注工时', weekly.focusHours + ' h', 'clock')}
        ${metric('打卡总时长', weekly.clockHours + ' h', 'database')}
        ${metric('习惯达标率', weekly.habitRate + '%', 'target')}
        ${metric('导师沟通', weekly.advisorCount + ' 次', 'users')}
        ${metric('完成任务', `${weekly.doneTasks}/${weekly.totalTasks}`, 'check')}
        ${metric('新增投稿', weekly.newSubmissions + ' 篇', 'send')}
      </div>
    `, `<button class="btn btn-primary btn-sm" data-go="dashboard">${I('chart', 15)} 查看仪表盘</button>`);

    const quickClock = U.panel('快捷科研打卡', `
      <div class="quick-clock">
        <div class="clock-status ${running ? 'is-running' : ''}">
          <div class="clock-status-icon">${I(running ? 'pause' : 'play', 22)}</div>
          <div>
            <div class="clock-status-title">${running ? `正在计时：${running.category}` : '当前未在工作时段'}</div>
            <div class="clock-status-sub">${running ? `开始于 ${U.fmtDateTime(running.started_at)}` : `今日打卡 ${ov.todayClockCount} 次 · 累计 ${U.durationLabel(ov.todaySeconds)}`}</div>
          </div>
        </div>
        <div class="clock-actions">
          ${CLOCK_CATEGORIES.map(c => `<button class="btn btn-ghost btn-sm clock-cat" data-cat="${c}">${I('clock', 14)} ${c}</button>`).join('')}
        </div>
        <div class="clock-quick-row">
          <button class="btn btn-primary btn-sm" id="quick-clock-start">${I('play', 15)} 开始工作</button>
          <button class="btn btn-outline btn-sm" id="quick-clock-stop" ${running ? '' : 'disabled'}>${I('pause', 15)} 结束工作</button>
          <button class="btn btn-ghost btn-sm" id="quick-leave">${I('file-text', 15)} 请假登记</button>
        </div>
        ${ov.leaveToday.length ? `<div class="clock-leave-today">${U.badge('今日请假', 'orange')} ${U.esc(ov.leaveToday.map(l => `${l.type}：${l.reason}`).join('；'))}</div>` : ''}
      </div>
    `);

    const reminders = U.panel('今日提醒', `
      <div class="reminder-list">
        ${reminderItem('spark', '创新文献待阅读', ov.unreadInnovation ? `${ov.unreadInnovation} 篇精选文献未读，建议尽快查看` : '本周创新文献已全部读完', ov.unreadInnovation ? 'orange' : 'green', 'innovation')}
        ${reminderItem('flag', '即将到期里程碑', ov.upcomingMilestones.length ? ov.upcomingMilestones.slice(0, 3).map(m => `${m.name}（${U.fmtDate(m.planned_end)}）`).join(' · ') : '暂无即将到期节点', 'blue', 'milestones')}
        ${reminderItem('file-text', '待写复盘', ov.pendingReviews ? `还有 ${ov.pendingReviews} 份复盘草稿未定稿` : '复盘均已定稿', ov.pendingReviews ? 'red' : 'green', 'weekly')}
      </div>
    `, `<button class="btn btn-ghost btn-sm" data-go="settings">${I('settings', 14)} 提醒配置</button>`);

    const commands = U.panel('全局指令速查', `
      <div class="command-chips">
        ${['/clock', '/weekly', '/monthly', '/milestone', '/task', '/literature', '/zotero-sync', '/overleaf-sync', '/export-excel', '/tutor', '/innovate-ref', '/refresh-innovate', '/career'].map(c => `<code class="chip">${c}</code>`).join('')}
      </div>
      <div class="command-tip">在顶部命令行输入以斜杠开头的指令，可快速唤起对应功能。</div>
    `);

    const todayKey = U.iso(new Date());
    const todayPicks = innovations.filter(x => x.added_at === todayKey).slice(0, 5);
    const picks = (todayPicks.length ? todayPicks : innovations.slice(0, 5));
    const dailyPicks = U.panel('今日精选推送 · 生物 / 医学 / 材料 / AI交叉', picks.length ? `
      <div class="daily-pick-list">
        ${picks.map(x => `
          <div class="daily-pick ${x.status === 'unread' ? 'is-unread' : ''}">
            <div class="daily-pick-main">
              <div class="daily-pick-meta">${x.field ? U.badge(FIELD_LABELS[x.field] || x.field, x.field === 'medicine' ? 'red' : x.field === 'biology' ? 'green' : x.field === 'materials' ? 'orange' : 'purple') : ''}${x.status === 'unread' ? U.badge('未读', 'orange') : ''}</div>
              <b>${U.esc(x.title)}</b>
              <span>${U.esc(x.journal)}${x.doi ? ' · ' + U.esc(x.doi) : ''}</span>
            </div>
            <div class="daily-pick-actions">
              <button class="btn btn-outline btn-xs" data-open-url="${U.esc(pickUrl(x))}">${I('link', 12)} 打开原文</button>
              <button class="btn btn-ghost btn-xs" data-go="innovation">${I('arrow-right', 12)} 全部精选</button>
            </div>
          </div>`).join('')}
      </div>` : U.emptyState('今日暂无精选推送，可前往创新文献专区刷新', 'spark'), `<button class="btn btn-primary btn-sm" data-go="innovation">${I('spark', 14)} 查看精选专区</button>`);

    return `
      <div class="page-head">
        <div>
          <h1>总览首页</h1>
          <p>${new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })} · 科研全周期工作台</p>
        </div>
        <div class="page-actions">
          <button class="btn btn-primary" id="overview-export-excel">${I('download', 15)} 导出 Excel</button>
        </div>
      </div>
      <div class="stat-grid">${cards}</div>
      <div class="grid-2">
        ${weeklyPanel}
        ${quickClock}
      </div>
      <div class="grid-2 grid-bottom">
        ${reminders}
        ${commands}
      </div>
      ${dailyPicks}`;
  }

  function mountOverview() {
    document.getElementById('overview-export-excel').addEventListener('click', async () => {
      const r = await A.exportExcel();
      if (r && !r.canceled) U.toast('success', `Excel 已导出：${r.filePath}`);
    });
    const segs = document.querySelectorAll('[data-role="period"] .seg');
    segs.forEach(seg => seg.addEventListener('click', async () => {
      segs.forEach(s => s.classList.toggle('active', s === seg));
      const data = await A.statsWeekly(seg.dataset.period);
      document.getElementById('weekly-metrics').innerHTML = `
        ${metric('有效专注工时', data.focusHours + ' h', 'clock')}
        ${metric('打卡总时长', data.clockHours + ' h', 'database')}
        ${metric('习惯达标率', data.habitRate + '%', 'target')}
        ${metric('导师沟通', data.advisorCount + ' 次', 'users')}
        ${metric('完成任务', `${data.doneTasks}/${data.totalTasks}`, 'check')}
        ${metric('新增投稿', data.newSubmissions + ' 篇', 'send')}`;
    }));
    document.getElementById('quick-clock-start').addEventListener('click', () => startClockFromHome());
    document.getElementById('quick-clock-stop').addEventListener('click', stopActiveClock);
    document.getElementById('quick-leave').addEventListener('click', openLeaveModal);
    document.querySelectorAll('.clock-cat').forEach(btn => btn.addEventListener('click', () => startClockFromHome(btn.dataset.cat)));
    document.querySelectorAll('[data-go]').forEach(el => el.addEventListener('click', () => {
      const go = el.dataset.go;
      if (go) window.app.navigate(go);
    }));
    document.querySelectorAll('[data-open-url]').forEach(el => el.addEventListener('click', async () => {
      const url = el.dataset.openUrl;
      if (url) await A.openExternal(url);
    }));
  }

  async function startClockFromHome(category) {
    const cat = category || '实验操作';
    const running = await A.clockActive();
    if (running.length) {
      U.confirmDialog({
        title: '已有进行中的打卡',
        message: `当前 ${running[0].category} 正在计时，是否先结束再开始新的？`,
        onConfirm: async () => {
          await A.clockStop(running[0].id);
          await A.clockStart(cat, '');
          U.toast('success', `已开始「${cat}」计时`);
          window.app.refresh();
        }
      });
      return;
    }
    await A.clockStart(cat, '');
    U.toast('success', `已开始「${cat}」计时`);
    window.app.refresh();
  }

  async function stopActiveClock() {
    const running = await A.clockActive();
    if (!running.length) return;
    const r = await A.clockStop(running[0].id);
    const secs = U.secondsBetween(r.started_at, r.ended_at);
    U.toast('success', `已结束「${r.category}」，本次 ${U.durationLabel(secs)}`);
    window.app.refresh();
  }

  function openLeaveModal() {
    U.openModal({
      title: '请假登记',
      body: `<form class="form" id="leave-form">
        ${U.formField({ name: 'date', label: '请假日期', type: 'date', value: U.iso(new Date()), required: true })}
        ${U.formField({ name: 'type', label: '请假类型', type: 'select', value: '病假', options: ['病假', '事假', '其他'] })}
        ${U.formField({ name: 'reason', label: '请假原因', type: 'textarea', rows: 3, placeholder: '简要说明原因' })}
        <div class="grid-2">
          ${U.formField({ name: 'start_time', label: '开始时间', type: 'time', value: '08:00' })}
          ${U.formField({ name: 'end_time', label: '结束时间', type: 'time', value: '18:00' })}
        </div>
        <div class="modal-actions"><button type="button" class="btn btn-ghost" data-close>取消</button><button type="submit" class="btn btn-primary">保存</button></div>
      </form>`,
      onMount: (bodyEl, close) => {
        bodyEl.querySelector('[data-close]').addEventListener('click', close);
        bodyEl.querySelector('form').addEventListener('submit', async (e) => {
          e.preventDefault();
          await A.insert('leave_records', U.formValues(bodyEl.querySelector('form')));
          U.toast('success', '请假记录已登记');
          close();
          window.app.refresh();
        });
      }
    });
  }

  async function renderDashboard() {
    const data = await A.statsCharts();
    return `
      <div class="page-head">
        <div><h1>数据可视化仪表盘</h1><p>工时、任务、里程碑、投稿与文献全量统计</p></div>
        <div class="page-actions">
          <button class="btn btn-primary" id="dash-export-excel">${I('download', 15)} 全量导出 .xlsx</button>
        </div>
      </div>
      <div class="chart-grid">
        <div class="panel chart-panel" data-chart="hours">
          <div class="panel-head"><h3>科研工时趋势（近 14 天）</h3><button class="btn btn-ghost btn-sm chart-save">${I('download', 14)} 截图</button></div>
          <div class="panel-body chart-body" id="chart-hours"></div>
        </div>
        <div class="panel chart-panel" data-chart="tasks">
          <div class="panel-head"><h3>月度任务完成率</h3><button class="btn btn-ghost btn-sm chart-save">${I('download', 14)} 截图</button></div>
          <div class="panel-body chart-body" id="chart-tasks"></div>
        </div>
        <div class="panel chart-panel chart-wide" data-chart="milestones">
          <div class="panel-head"><h3>课题里程碑甘特图</h3><button class="btn btn-ghost btn-sm chart-save">${I('download', 14)} 截图</button></div>
          <div class="panel-body chart-body" id="chart-milestones"></div>
        </div>
        <div class="panel chart-panel" data-chart="submissions">
          <div class="panel-head"><h3>投稿状态分布</h3><button class="btn btn-ghost btn-sm chart-save">${I('download', 14)} 截图</button></div>
          <div class="panel-body chart-body" id="chart-submissions"></div>
        </div>
        <div class="panel chart-panel" data-chart="literature">
          <div class="panel-head"><h3>月度文献阅读统计</h3><button class="btn btn-ghost btn-sm chart-save">${I('download', 14)} 截图</button></div>
          <div class="panel-body chart-body" id="chart-literature"></div>
        </div>
      </div>`;
  }

  function mountDashboard() {
    (async () => {
      const data = await A.statsCharts();
      document.getElementById('chart-hours').innerHTML = C.lineChart(data.hoursTrend.map(d => ({ label: d.date.slice(5), value: d.hours })));
      document.getElementById('chart-tasks').innerHTML = C.barChart(data.taskCompletion);
      document.getElementById('chart-milestones').innerHTML = C.ganttChart(data.milestones);
      document.getElementById('chart-submissions').innerHTML = C.pieChart(data.submissionStatus);
      document.getElementById('chart-literature').innerHTML = C.barChart(data.literature.map(d => ({ ...d, done: d.read, total: d.total })), 240, 'done', 'total');
    })();
    document.getElementById('dash-export-excel').addEventListener('click', async () => {
      const r = await A.exportExcel();
      if (r && !r.canceled) U.toast('success', `Excel 已导出：${r.filePath}`);
    });
    document.querySelectorAll('.chart-save').forEach(btn => btn.addEventListener('click', async () => {
      const panel = btn.closest('.chart-panel');
      try {
        const dataUrl = await C.exportPng(panel.querySelector('.chart-body'));
        const r = await A.exportPng(dataUrl);
        if (r && !r.canceled) U.toast('success', `图表截图已保存：${r.filePath}`);
      } catch (err) {
        U.toast('error', err.message);
      }
    }));
  }

  async function renderClock() {
    const [today, active, weekly, leaves] = await Promise.all([
      A.clockToday(), A.clockActive(), A.statsWeekly('week'), A.list('leave_records', 'date DESC')
    ]);
    const running = active[0];
    const totalToday = today.filter(c => c.ended_at).reduce((s, c) => s + U.secondsBetween(c.started_at, c.ended_at), 0);
    const rows = today.slice().reverse().map(c => ({
      ...c,
      dur: c.ended_at ? U.durationLabel(U.secondsBetween(c.started_at, c.ended_at)) : '计时中',
      time: `${U.fmtDateTime(c.started_at)} → ${c.ended_at ? U.fmtDateTime(c.ended_at).split(' ')[1] : '…'}`
    }));
    return `
      <div class="page-head"><div><h1>科研打卡与工时管理</h1><p>分类计时、工时统计与请假管理</p></div></div>
      <div class="grid-2">
        ${U.panel('当前工作状态', `
          <div class="clock-big-status ${running ? 'is-running' : ''}">
            <div class="clock-big-icon">${I(running ? 'pause' : 'play', 30)}</div>
            <div class="clock-big-text">
              <b>${running ? `「${running.category}」计时中` : '空闲状态'}</b>
              <span>${running ? `开始于 ${U.fmtDateTime(running.started_at)}` : '点击下方按钮开始新的科研打卡'}</span>
            </div>
          </div>
          <div class="clock-cat-grid">
            ${CLOCK_CATEGORIES.map(c => `<button class="btn btn-outline clock-start-btn" data-cat="${c}">${I('clock', 15)} ${c}</button>`).join('')}
          </div>
          <div class="clock-stop-row"><button class="btn btn-primary" id="clock-stop">${I('pause', 15)} 结束当前计时</button><button class="btn btn-ghost" id="clock-leave">${I('file-text', 15)} 请假登记</button></div>
        `)}
        ${U.panel('今日概览', `
          <div class="big-number-grid">
            <div class="big-number"><b>${today.length}</b><span>今日打卡次数</span></div>
            <div class="big-number"><b>${U.durationLabel(totalToday).replace(' 小时 ', 'h').replace(' 分钟', 'm')}</b><span>今日累计工时</span></div>
            <div class="big-number"><b>${weekly.clockHours}</b><span>本周总工时(h)</span></div>
          </div>
          ${today.length ? U.table(
            [{ label: '时间', key: 'time' }, { label: '类型', key: 'category' }, { label: '时长', key: 'dur' }, { label: '备注', key: 'note' }],
            rows.map(r => ({ ...r, note: r.note || '—' }))
          ) : U.emptyState('今天还没有打卡记录', 'clock')}
        `)}
      </div>
      ${U.panel('请假记录', leaves.length ? U.table(
        [{ label: '日期', key: 'date' }, { label: '类型', key: 'type' }, { label: '时段', key: 'time' }, { label: '原因', key: 'reason' }, { label: '', key: 'op' }],
        leaves.map(l => ({
          ...l,
          time: `${l.start_time || '—'} ~ ${l.end_time || '—'}`,
          op: `<button class="icon-btn row-del" data-id="${l.id}">${I('trash', 15)}</button>`
        }))
      ) : U.emptyState('暂无请假记录', 'file-text'), `<button class="btn btn-primary btn-sm" id="clock-leave-2">${I('plus', 14)} 新增请假</button>`)}
    `;
  }

  function mountClock() {
    document.querySelectorAll('.clock-start-btn').forEach(btn => btn.addEventListener('click', async () => {
      const active = await A.clockActive();
      if (active.length) { U.toast('warning', '请先结束当前计时'); return; }
      await A.clockStart(btn.dataset.cat, '');
      U.toast('success', `已开始「${btn.dataset.cat}」计时`);
      window.app.refresh();
    }));
    document.getElementById('clock-stop').addEventListener('click', stopActiveClock);
    document.getElementById('clock-leave').addEventListener('click', openLeaveModal);
    const l2 = document.getElementById('clock-leave-2');
    if (l2) l2.addEventListener('click', openLeaveModal);
    document.querySelectorAll('.row-del').forEach(btn => btn.addEventListener('click', async () => {
      U.confirmDialog({ title: '删除请假记录', message: '确认删除这条请假记录？', danger: true, onConfirm: async () => {
        await A.remove('leave_records', btn.dataset.id);
        U.toast('success', '已删除');
        window.app.refresh();
      } });
    }));
  }

  async function renderProject() {
    const profile = await A.settingsGet('project_profile') || { title: '', direction: '', stage: '', thesis_title: '' };
    const thesis = await A.thesisProgress();
    const milestones = await A.list('milestones', 'sort_order ASC');
    return `
      <div class="page-head"><div><h1>课题核心管理</h1><p>研究方向、课题档案与论文总进度</p></div>
      <div class="page-actions"><button class="btn btn-primary btn-sm" id="project-edit">${I('edit', 15)} 编辑课题档案</button></div></div>
      <div class="grid-2">
        <div class="panel">
          <div class="panel-head"><h3>课题档案</h3></div>
          <div class="panel-body profile-body">
            ${profileRow('论文题目', profile.thesis_title || '尚未填写')}
            ${profileRow('研究方向', profile.direction || '尚未填写')}
            ${profileRow('当前阶段', profile.stage || '尚未填写')}
            ${profileRow('课题摘要', profile.title || '尚未填写')}
          </div>
        </div>
        <div class="panel">
          <div class="panel-head"><h3>论文总进度</h3></div>
          <div class="panel-body progress-overview">
            ${C.progressRing(thesis.progress, 150, '毕业论文进度')}
            <div class="progress-meta">
              <div>已通关里程碑 <b>${thesis.doneCount}/${thesis.totalCount}</b></div>
              <div>权重完成度 <b>${thesis.doneWeight}/${thesis.totalWeight}</b></div>
              <button class="btn btn-outline btn-sm" data-go="milestones">管理里程碑</button>
            </div>
          </div>
        </div>
      </div>
      <div class="panel">
        <div class="panel-head"><h3>课题全周期节点</h3></div>
        <div class="panel-body">${C.ganttChart(milestones, Math.max(240, milestones.length * 36 + 40))}</div>
      </div>`;
  }

  function profileRow(label, value) {
    return `<div class="profile-row"><span>${U.esc(label)}</span><b>${U.esc(value)}</b></div>`;
  }

  function mountProject() {
    document.getElementById('project-edit').addEventListener('click', openProjectModal);
    document.querySelectorAll('[data-go]').forEach(el => el.addEventListener('click', () => window.app.navigate(el.dataset.go)));
  }

  function openProjectModal() {
    A.settingsGet('project_profile').then(profile => {
      const p = profile || {};
      U.openModal({
        title: '编辑课题档案',
        body: `<form class="form" id="project-form">
          ${U.formField({ name: 'thesis_title', label: '毕业论文题目', value: p.thesis_title || '' })}
          ${U.formField({ name: 'direction', label: '研究方向', value: p.direction || '' })}
          ${U.formField({ name: 'stage', label: '当前阶段', value: p.stage || '' })}
          ${U.formField({ name: 'title', label: '课题摘要', type: 'textarea', rows: 3, value: p.title || '' })}
          <div class="modal-actions"><button type="button" class="btn btn-ghost" data-close>取消</button><button type="submit" class="btn btn-primary">保存</button></div>
        </form>`,
        onMount: (bodyEl, close) => {
          bodyEl.querySelector('[data-close]').addEventListener('click', close);
          bodyEl.querySelector('form').addEventListener('submit', async (e) => {
            e.preventDefault();
            await A.settingsSet('project_profile', U.formValues(bodyEl.querySelector('form')));
            U.toast('success', '课题档案已保存');
            close();
            window.app.refresh();
          });
        }
      });
    });
  }

  async function renderThesis() {
    const thesis = await A.thesisProgress();
    const milestones = await A.list('milestones', 'sort_order ASC');
    const rows = milestones.map(m => ({
      ...m,
      plan: `${U.fmtDate(m.planned_start)} ~ ${U.fmtDate(m.planned_end)}`,
      done: m.status === 'done' ? U.fmtDate(m.completed_at) : '',
      achievements: m.achievements || '',
      op: m.status === 'done'
        ? `<span class="badge badge-success">已完成</span>`
        : `<button class="btn btn-primary btn-xs complete-milestone" data-id="${m.id}">标记完成</button>`
    }));
    return `
      <div class="page-head"><div><h1>博士毕业论文整体进度</h1><p>里程碑完成状态自动联动进度百分比</p></div></div>
      <div class="grid-2">
        <div class="panel"><div class="panel-head"><h3>当前总进度</h3></div>
          <div class="panel-body progress-overview">
            ${C.progressRing(thesis.progress, 170, '整体进度')}
            <div class="progress-meta">
              <div>自动计算 <b>${thesis.auto}%</b>（里程碑权重）</div>
              <div>已通关 <b>${thesis.doneCount}</b> / ${thesis.totalCount} 个节点</div>
              <div>权重 <b>${thesis.doneWeight}</b> / ${thesis.totalWeight}</div>
              <button class="btn btn-outline btn-sm" id="thesis-manual">手动微调进度</button>
            </div>
          </div>
        </div>
        <div class="panel"><div class="panel-head"><h3>里程碑权重</h3></div>
          <div class="panel-body weight-list">
            ${milestones.map(m => `<div class="weight-row"><span>${U.esc(m.name)}</span><div class="weight-track"><i style="width:${(m.weight / 100) * 100}%"></i></div><b>${m.weight}</b><span class="badge ${m.status === 'done' ? 'badge-success' : m.status === 'doing' ? 'badge-primary' : 'badge-gray'}">${m.status === 'done' ? '完成' : m.status === 'doing' ? '进行中' : '待启动'}</span></div>`).join('')}
          </div>
        </div>
      </div>
      ${U.panel('里程碑完成情况', U.table(
        [{ label: '节点', key: 'name' }, { label: '计划时间', key: 'plan' }, { label: '实际完成', key: 'done' }, { label: '核心成果', key: 'achievements' }, { label: '状态', key: 'op' }],
        rows, '暂无里程碑'
      ), `<button class="btn btn-primary btn-sm" data-go="milestones">${I('plus', 14)} 新建节点</button>`)}
    `;
  }

  function mountThesis() {
    document.querySelectorAll('.complete-milestone').forEach(btn => btn.addEventListener('click', async () => {
      U.confirmDialog({ title: '标记里程碑完成', message: '完成后将自动刷新毕业论文整体进度。', onConfirm: async () => {
        await A.update('milestones', btn.dataset.id, { status: 'done', completed_at: U.iso(new Date()) });
        U.toast('success', '里程碑已通关，总进度已刷新');
        window.app.refresh();
      } });
    }));
    const manual = document.getElementById('thesis-manual');
    if (manual) manual.addEventListener('click', () => {
      A.settingsGet('thesis_progress_manual').then(v => {
        U.openModal({
          title: '手动微调论文进度',
          body: `<form class="form" id="thesis-manual-form">
            <p class="field-help">不填则始终按里程碑权重自动计算。</p>
            ${U.formField({ name: 'value', label: '手动进度 (%)', type: 'number', value: v ?? '' })}
            <div class="modal-actions"><button type="button" class="btn btn-ghost" data-close>取消</button><button type="submit" class="btn btn-primary">保存</button></div>
          </form>`,
          onMount: (bodyEl, close) => {
            bodyEl.querySelector('[data-close]').addEventListener('click', close);
            bodyEl.querySelector('form').addEventListener('submit', async (e) => {
              e.preventDefault();
              const value = U.formValues(bodyEl.querySelector('form')).value;
              await A.settingsSet('thesis_progress_manual', value === '' || value === null ? null : Number(value));
              U.toast('success', '进度设置已保存');
              close();
              window.app.refresh();
            });
          }
        });
      });
    });
    document.querySelectorAll('[data-go]').forEach(el => el.addEventListener('click', () => window.app.navigate(el.dataset.go)));
  }

  async function renderMilestones() {
    const [milestones, notes] = await Promise.all([A.list('milestones', 'sort_order ASC'), A.list('progress_notes', 'date DESC')]);
    const thesis = await A.thesisProgress();
    const timeline = milestones.slice().reverse().map((m) => `
      <div class="timeline-item ${m.status === 'done' ? 'done' : m.status === 'doing' ? 'doing' : ''}">
        <div class="timeline-dot">${m.status === 'done' ? I('check', 14) : ''}</div>
        <div class="timeline-card">
          <div class="timeline-top"><b>${U.esc(m.name)}</b>${statusBadge(m.status)}<span class="timeline-date">${U.fmtDate(m.planned_start)} ~ ${U.fmtDate(m.planned_end)}</span></div>
          ${m.achievements ? `<div class="timeline-text">${U.esc(m.achievements)}</div>` : ''}
          ${m.problems ? `<div class="timeline-problem">遗留问题：${U.esc(m.problems)}</div>` : ''}
          <div class="timeline-actions">
            <button class="btn btn-ghost btn-xs m-edit" data-id="${m.id}">${I('edit', 13)} 编辑</button>
            ${m.status !== 'done' ? `<button class="btn btn-primary btn-xs m-done" data-id="${m.id}">${I('check', 13)} 完成</button>` : ''}
            <button class="btn btn-ghost btn-xs m-del" data-id="${m.id}">${I('trash', 13)}</button>
          </div>
        </div>
      </div>`).join('');
    return `
      <div class="page-head"><div><h1>课题关键性进展 & 里程碑台账</h1><p>${thesis.progress}% 论文进度 · ${thesis.doneCount}/${thesis.totalCount} 节点通关</p></div>
      <div class="page-actions">
        <button class="btn btn-ghost btn-sm" id="milestone-note">${I('edit', 14)} 碎片化进展速记</button>
        <button class="btn btn-primary btn-sm" id="milestone-add">${I('plus', 14)} 新建里程碑</button>
      </div></div>
      <div class="grid-2">
        <div class="panel"><div class="panel-head"><h3>课题全周期时间轴</h3></div><div class="panel-body timeline">${timeline || U.emptyState('暂无里程碑，先新建一个', 'flag')}</div></div>
        <div class="panel"><div class="panel-head"><h3>碎片化进展速记</h3><button class="btn btn-ghost btn-sm" id="note-add">${I('plus', 13)} 速记</button></div>
          <div class="panel-body note-list">
            ${notes.slice(0, 30).map(n => `
              <div class="note-item">
                <div class="note-head"><span class="badge ${n.type === '数据异常' ? 'badge-red' : n.type === '实验突破' ? 'badge-green' : 'badge-blue'}">${U.esc(n.type)}</span><span>${U.fmtDate(n.date)}</span></div>
                <div class="note-content">${U.esc(n.content)}</div>
                ${n.stage ? `<div class="note-stage">阶段：${U.esc(n.stage)}</div>` : ''}
                <div class="note-actions"><button class="icon-btn note-del" data-id="${n.id}">${I('trash', 13)}</button></div>
              </div>`).join('') || U.emptyState('暂无速记', 'edit')}
          </div>
        </div>
      </div>`;
  }

  function mountMilestones() {
    document.getElementById('milestone-add').addEventListener('click', () => openMilestoneModal());
    const noteAdd = document.getElementById('milestone-note') || document.getElementById('note-add');
    noteAdd.addEventListener('click', () => openProgressNoteModal());
    document.querySelectorAll('.m-edit').forEach(btn => btn.addEventListener('click', () => openMilestoneModal(Number(btn.dataset.id))));
    document.querySelectorAll('.m-done').forEach(btn => btn.addEventListener('click', async () => {
      U.confirmDialog({ title: '完成里程碑', message: '确认标记该节点完成？毕业论文总进度会自动同步拉高。', onConfirm: async () => {
        await A.update('milestones', btn.dataset.id, { status: 'done', completed_at: U.iso(new Date()) });
        U.toast('success', '里程碑已完成，进度已刷新');
        window.app.refresh();
      } });
    }));
    document.querySelectorAll('.m-del, .note-del').forEach(btn => btn.addEventListener('click', () => {
      const isNote = btn.classList.contains('note-del');
      const table = isNote ? 'progress_notes' : 'milestones';
      U.confirmDialog({ title: '删除记录', message: '确认删除这条记录？', danger: true, onConfirm: async () => {
        await A.remove(table, btn.dataset.id);
        U.toast('success', '已删除');
        window.app.refresh();
      } });
    }));
  }

  function openMilestoneModal(id) {
    const load = id ? A.list('milestones').then(rows => rows.find(r => r.id === id)) : Promise.resolve(null);
    load.then(m => {
      const preset = ['开题论证', '实验方案定型', '核心数据集产出', '小论文初稿撰写', '返修修改', '论文录用', '大论文初稿', '盲审送审', '答辩定稿'];
      U.openModal({
        title: id ? '编辑里程碑' : '新建里程碑节点',
        width: '760px',
        body: `<form class="form" id="milestone-form">
          <div class="grid-2">
            ${U.formField({ name: 'name', label: '节点名称', value: m?.name || '', required: true })}
            ${U.formField({ name: 'stage', label: '所属阶段', type: 'select', value: m?.stage || '开题论证', options: preset })}
          </div>
          <div class="grid-2">
            ${U.formField({ name: 'planned_start', label: '计划开始', type: 'date', value: (m?.planned_start || U.iso(new Date())).slice(0, 10) })}
            ${U.formField({ name: 'planned_end', label: '计划结束', type: 'date', value: (m?.planned_end || U.iso(U.addDays(new Date(), 30))).slice(0, 10) })}
          </div>
          ${U.formField({ name: 'achievements', label: '核心成果', type: 'textarea', rows: 3, value: m?.achievements || '', placeholder: '实验截图、录用通知、手稿等成果说明' })}
          ${U.formField({ name: 'problems', label: '现存遗留问题', type: 'textarea', rows: 2, value: m?.problems || '' })}
          ${U.formField({ name: 'next_tasks', label: '下一阶段承接任务', type: 'textarea', rows: 2, value: m?.next_tasks || '' })}
          ${U.formField({ name: 'weight', label: '进度权重 (0-100)', type: 'number', value: m?.weight ?? 10, help: '所有节点权重之和建议为 100，完成后按权重累计论文进度' })}
          <div class="modal-actions"><button type="button" class="btn btn-ghost" data-close>取消</button><button type="submit" class="btn btn-primary">保存</button></div>
        </form>`,
        onMount: (bodyEl, close) => {
          bodyEl.querySelector('[data-close]').addEventListener('click', close);
          bodyEl.querySelector('form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const values = U.formValues(bodyEl.querySelector('form'));
            if (id) await A.update('milestones', id, values);
            else await A.insert('milestones', { ...values, status: 'todo', completed_at: '', attachments: '' });
            U.toast('success', id ? '里程碑已更新' : '里程碑已创建');
            close();
            window.app.refresh();
          });
        }
      });
    });
  }

  function openProgressNoteModal() {
    A.list('milestones', 'sort_order ASC').then(milestones => {
      U.openModal({
        title: '碎片化进展速记',
        body: `<form class="form" id="note-form">
          <div class="grid-2">
            ${U.formField({ name: 'type', label: '速记类型', type: 'select', value: '实验突破', options: ['实验突破', '思路迭代', '数据异常', '版本节点'] })}
            ${U.formField({ name: 'stage', label: '课题阶段', type: 'select', value: '', options: [{ value: '', label: '不指定' }, ...milestones.map(m => ({ value: m.stage || m.name, label: m.name }))] })}
          </div>
          ${U.formField({ name: 'content', label: '速记内容', type: 'textarea', rows: 4, required: true, placeholder: '实验突破性结论、思路迭代、重大数据异常…' })}
          <div class="modal-actions"><button type="button" class="btn btn-ghost" data-close>取消</button><button type="submit" class="btn btn-primary">保存</button></div>
        </form>`,
        onMount: (bodyEl, close) => {
          bodyEl.querySelector('[data-close]').addEventListener('click', close);
          bodyEl.querySelector('form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const values = U.formValues(bodyEl.querySelector('form'));
            await A.insert('progress_notes', { ...values, date: U.iso(new Date()), milestone_id: null, source: 'manual' });
            U.toast('success', '速记已保存，将自动进入周/月复盘统计');
            close();
            window.app.refresh();
          });
        }
      });
    });
  }

  async function renderTasks() {
    const tasks = await A.list('tasks', 'date DESC, id DESC');
    const byStatus = {
      todo: tasks.filter(t => t.status === 'todo'),
      doing: tasks.filter(t => t.status === 'doing'),
      done: tasks.filter(t => t.status === 'done')
    };
    const col = (key, title, tone) => `
      <div class="task-col">
        <div class="task-col-head"><span class="dot dot-${tone}"></span><b>${title}</b><span class="count">${byStatus[key].length}</span></div>
        <div class="task-col-body">${byStatus[key].map(t => `
          <div class="task-card">
            <div class="task-card-top"><b>${U.esc(t.title)}</b>${U.badge(t.priority || '中', t.priority === '高' ? 'red' : t.priority === '低' ? 'gray' : 'orange')}</div>
            <div class="task-card-meta">${I('calendar', 12)} ${U.fmtDate(t.date)} ${t.due_date ? `· 截止 ${U.fmtDate(t.due_date)}` : ''}</div>
            <div class="task-card-meta">${U.badge(t.category || '其他', 'blue')} ${t.plan_type === 'week' ? U.badge('周计划', 'purple') : t.plan_type === 'month' ? U.badge('月计划', 'teal') : U.badge('当日', 'gray')}</div>
            ${t.detail ? `<div class="task-card-detail">${U.esc(t.detail)}</div>` : ''}
            <div class="task-card-actions">
              ${key !== 'done' ? `<button class="btn btn-primary btn-xs task-done" data-id="${t.id}">${I('check', 12)} 完成</button>` : `<button class="btn btn-ghost btn-xs task-reopen" data-id="${t.id}">重新打开</button>`}
              <button class="btn btn-ghost btn-xs task-edit" data-id="${t.id}">${I('edit', 12)}</button>
              <button class="btn btn-ghost btn-xs task-del" data-id="${t.id}">${I('trash', 12)}</button>
            </div>
          </div>`).join('') || '<div class="col-empty">暂无任务</div>'}</div>
      </div>`;
    return `
      <div class="page-head"><div><h1>任务管理中心</h1><p>今日科研任务、周计划拆解、月度阶段规划</p></div>
      <div class="page-actions">
        <button class="btn btn-ghost btn-sm" id="task-week">${I('calendar', 14)} 下周计划下发</button>
        <button class="btn btn-primary btn-sm" id="task-add">${I('plus', 14)} 新建任务</button>
      </div></div>
      <div class="task-board">
        ${col('todo', '待办', 'gray')}
        ${col('doing', '进行中', 'orange')}
        ${col('done', '已完成', 'green')}
      </div>`;
  }

  function mountTasks() {
    document.getElementById('task-add').addEventListener('click', () => openTaskModal());
    const weekBtn = document.getElementById('task-week');
    if (weekBtn) weekBtn.addEventListener('click', weekPlanPushdown);
    document.querySelectorAll('.task-edit').forEach(btn => btn.addEventListener('click', () => openTaskModal(Number(btn.dataset.id))));
    document.querySelectorAll('.task-done').forEach(btn => btn.addEventListener('click', async () => {
      await A.update('tasks', btn.dataset.id, { status: 'done' });
      U.toast('success', '任务已完成');
      window.app.refresh();
    }));
    document.querySelectorAll('.task-reopen').forEach(btn => btn.addEventListener('click', async () => {
      await A.update('tasks', btn.dataset.id, { status: 'todo' });
      window.app.refresh();
    }));
    document.querySelectorAll('.task-del').forEach(btn => btn.addEventListener('click', () => {
      U.confirmDialog({ title: '删除任务', message: '确认删除该任务？', danger: true, onConfirm: async () => {
        await A.remove('tasks', btn.dataset.id);
        U.toast('success', '已删除');
        window.app.refresh();
      } });
    }));
  }

  function openTaskModal(id) {
    const load = id ? A.list('tasks').then(rows => rows.find(r => r.id === id)) : Promise.resolve(null);
    load.then(t => {
      U.openModal({
        title: id ? '编辑科研任务' : '新建科研任务',
        width: '640px',
        body: `<form class="form" id="task-form">
          ${U.formField({ name: 'title', label: '任务标题', value: t?.title || '', required: true })}
          ${U.formField({ name: 'detail', label: '任务详情', type: 'textarea', rows: 3, value: t?.detail || '' })}
          <div class="grid-2">
            ${U.formField({ name: 'date', label: '任务日期', type: 'date', value: (t?.date || U.iso(new Date())).slice(0, 10) })}
            ${U.formField({ name: 'due_date', label: '截止日期', type: 'date', value: (t?.due_date || '').slice(0, 10) })}
          </div>
          <div class="grid-2">
            ${U.formField({ name: 'status', label: '状态', type: 'select', value: t?.status || 'todo', options: [{ value: 'todo', label: '待办' }, { value: 'doing', label: '进行中' }, { value: 'done', label: '已完成' }] })}
            ${U.formField({ name: 'priority', label: '优先级', type: 'select', value: t?.priority || '中', options: ['高', '中', '低'] })}
          </div>
          <div class="grid-2">
            ${U.formField({ name: 'category', label: '分类', type: 'select', value: t?.category || '实验', options: ['实验', '文献', '写作', '数据', '投稿', '汇报', '规划', '其他'] })}
            ${U.formField({ name: 'plan_type', label: '计划类型', type: 'select', value: t?.plan_type || 'day', options: [{ value: 'day', label: '当日任务' }, { value: 'week', label: '周计划' }, { value: 'month', label: '月度目标' }] })}
          </div>
          <div class="modal-actions"><button type="button" class="btn btn-ghost" data-close>取消</button><button type="submit" class="btn btn-primary">保存</button></div>
        </form>`,
        onMount: (bodyEl, close) => {
          bodyEl.querySelector('[data-close]').addEventListener('click', close);
          bodyEl.querySelector('form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const values = U.formValues(bodyEl.querySelector('form'));
            if (id) await A.update('tasks', id, values);
            else await A.insert('tasks', { ...values, source: 'manual' });
            U.toast('success', '任务已保存');
            close();
            window.app.refresh();
          });
        }
      });
    });
  }

  async function weekPlanPushdown() {
    const tasks = await A.list('tasks', 'date DESC');
    const weekTasks = tasks.filter(t => t.plan_type === 'week' && t.status !== 'done');
    if (!weekTasks.length) { U.toast('info', '本周计划已全部完成'); return; }
    U.openModal({
      title: '周计划下发为待办',
      body: `<div class="pushdown-list">${weekTasks.map(t => `
        <label class="pushdown-item"><input type="checkbox" value="${t.id}" checked><span><b>${U.esc(t.title)}</b><small>${U.esc(t.detail || '')}</small></span></label>`).join('')}</div>
        <div class="modal-actions"><button type="button" class="btn btn-ghost" data-close>取消</button><button type="button" class="btn btn-primary" id="pushdown-ok">生成当日待办</button></div>`,
      onMount: (bodyEl, close) => {
        bodyEl.querySelector('[data-close]').addEventListener('click', close);
        bodyEl.querySelector('#pushdown-ok').addEventListener('click', async () => {
          const ids = [...bodyEl.querySelectorAll('input:checked')].map(i => Number(i.value));
          for (const id of ids) {
            const t = tasks.find(x => x.id === id);
            const { id: _omit, created_at: _omit2, ...rest } = t;
            await A.insert('tasks', { ...rest, date: U.iso(new Date()), due_date: U.iso(new Date()), plan_type: 'day', status: 'todo', source: 'weekly-pushdown' });
          }
          U.toast('success', `已下发 ${ids.length} 项当日待办`);
          close();
          window.app.refresh();
        });
      }
    });
  }

  async function renderSubmissions() {
    const subs = await A.list('submissions', 'submitted_at DESC, id DESC');
    const stages = ['待投稿', '投递中', '外审阶段', '返修修改', '录用', '见刊'];
    const toneMap = { '待投稿': 'gray', '投递中': 'blue', '外审阶段': 'orange', '返修修改': 'purple', '录用': 'green', '见刊': 'teal' };
    const cols = stages.map(stage => `
      <div class="sub-col">
        <div class="sub-col-head"><span class="dot dot-${toneMap[stage]}"></span><b>${stage}</b><span class="count">${subs.filter(s => s.status === stage).length}</span></div>
        <div class="sub-col-body">
          ${subs.filter(s => s.status === stage).map(s => `
            <div class="sub-card">
              <b>${U.esc(s.title)}</b>
              <div class="sub-meta">${U.esc(s.journal || '未填期刊')} ${s.zone ? '· ' + U.esc(s.zone) : ''}</div>
              <div class="sub-meta">${s.submitted_at ? '投稿 ' + U.fmtDate(s.submitted_at) : ''}${s.published_at ? ' · 见刊 ' + U.fmtDate(s.published_at) : ''}</div>
              ${s.reviewer_opinions ? `<div class="sub-opinion">${U.esc(s.reviewer_opinions)}</div>` : ''}
              <div class="task-card-actions">
                ${stage !== '见刊' ? `<button class="btn btn-ghost btn-xs sub-next" data-id="${s.id}">${I('arrow-right', 12)} 推进状态</button>` : ''}
                <button class="btn btn-ghost btn-xs sub-edit" data-id="${s.id}">${I('edit', 12)}</button>
                <button class="btn btn-ghost btn-xs sub-del" data-id="${s.id}">${I('trash', 12)}</button>
              </div>
            </div>`).join('') || '<div class="col-empty">暂无稿件</div>'}
        </div>
      </div>`).join('');
    return `
      <div class="page-head"><div><h1>投稿全生命周期管理</h1><p>待投稿 → 投递中 → 外审 → 返修 → 录用 → 见刊</p></div>
      <div class="page-actions"><button class="btn btn-primary btn-sm" id="sub-add">${I('plus', 14)} 新建投稿</button></div></div>
      <div class="sub-board">${cols}</div>`;
  }

  function mountSubmissions() {
    document.getElementById('sub-add').addEventListener('click', () => openSubmissionModal());
    document.querySelectorAll('.sub-edit').forEach(btn => btn.addEventListener('click', () => openSubmissionModal(Number(btn.dataset.id))));
    document.querySelectorAll('.sub-del').forEach(btn => btn.addEventListener('click', () => {
      U.confirmDialog({ title: '删除投稿记录', message: '确认删除该投稿记录？', danger: true, onConfirm: async () => {
        await A.remove('submissions', btn.dataset.id);
        U.toast('success', '已删除');
        window.app.refresh();
      } });
    }));
    document.querySelectorAll('.sub-next').forEach(btn => btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      const subs = await A.list('submissions');
      const s = subs.find(x => x.id === Number(id));
      const order = ['待投稿', '投递中', '外审阶段', '返修修改', '录用', '见刊'];
      const idx = order.indexOf(s.status);
      const next = order[Math.min(order.length - 1, idx + 1)];
      const patch = {};
      if (next === '投递中') patch.submitted_at = U.iso(new Date());
      if (next === '见刊') patch.published_at = U.iso(new Date());
      await A.update('submissions', id, { ...patch, status: next });
      U.toast('success', `状态已推进为「${next}」`);
      window.app.refresh();
    }));
  }

  function openSubmissionModal(id) {
    const load = id ? A.list('submissions').then(rows => rows.find(r => r.id === id)) : Promise.resolve(null);
    load.then(s => {
      U.openModal({
        title: id ? '编辑投稿记录' : '新建投稿记录',
        width: '720px',
        body: `<form class="form" id="sub-form">
          ${U.formField({ name: 'title', label: '论文标题', value: s?.title || '', required: true })}
          <div class="grid-2">
            ${U.formField({ name: 'journal', label: '期刊名称', value: s?.journal || '' })}
            ${U.formField({ name: 'zone', label: '分区', value: s?.zone || '', placeholder: '如：中科院一区' })}
          </div>
          <div class="grid-3">
            ${U.formField({ name: 'status', label: '当前状态', type: 'select', value: s?.status || '待投稿', options: ['待投稿', '投递中', '外审阶段', '返修修改', '录用', '见刊'] })}
            ${U.formField({ name: 'submitted_at', label: '投稿时间', type: 'date', value: (s?.submitted_at || '').slice(0, 10) })}
            ${U.formField({ name: 'published_at', label: '见刊时间', type: 'date', value: (s?.published_at || '').slice(0, 10) })}
          </div>
          ${U.formField({ name: 'reviewer_opinions', label: '审稿意见', type: 'textarea', rows: 3, value: s?.reviewer_opinions || '' })}
          ${U.formField({ name: 'notes', label: '备注 / 返修计划', type: 'textarea', rows: 3, value: s?.notes || '' })}
          <div class="modal-actions"><button type="button" class="btn btn-ghost" data-close>取消</button><button type="submit" class="btn btn-primary">保存</button></div>
        </form>`,
        onMount: (bodyEl, close) => {
          bodyEl.querySelector('[data-close]').addEventListener('click', close);
          bodyEl.querySelector('form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const values = U.formValues(bodyEl.querySelector('form'));
            if (id) await A.update('submissions', id, values);
            else await A.insert('submissions', values);
            U.toast('success', '投稿记录已保存');
            close();
            window.app.refresh();
          });
        }
      });
    });
  }

  window.viewsCore = {
    overview: { render: renderOverview, mount: mountOverview },
    dashboard: { render: renderDashboard, mount: mountDashboard },
    clock: { render: renderClock, mount: mountClock },
    project: { render: renderProject, mount: mountProject },
    thesis: { render: renderThesis, mount: mountThesis },
    milestones: { render: renderMilestones, mount: mountMilestones },
    tasks: { render: renderTasks, mount: mountTasks },
    submissions: { render: renderSubmissions, mount: mountSubmissions },
    helpers: { openLeaveModal, openTaskModal, openMilestoneModal, openProgressNoteModal, startClockFromHome, stopActiveClock }
  };
})();
