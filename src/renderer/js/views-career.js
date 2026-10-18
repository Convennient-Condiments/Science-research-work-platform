(() => {
  const U = window.ui;
  const A = window.api;
  const I = ICONS.icon;
  const C = window.charts;

  const TRACKS = {
    graduate: { label: '按期毕业（底线）', short: '按期毕业', priority: '底线', icon: 'flag', tone: 'green', desc: '按培养方案要求推进课程、开题、中期与答辩，可自行编辑为你的学校要求', req: ['入学 2 年内修完学位课程与学分', '按期完成开题并通过审核', '完成规定次数的学术报告', '按时通过中期考核、预答辩与盲审'] },
    postdoc: { label: '海外学术岗位（示例）', short: '海外深造', priority: '上限', icon: 'send', tone: 'purple', desc: '示例赛道：海外博士后 / 科研岗位，可在界面中修改为目标内容', req: ['1-2 篇高水平一作论文', '满足目标地区语言要求', '具备完整科研经历与合作经历', '推荐信与研究陈述'] },
    industry: { label: '企业研发（示例）', short: '企业就业', priority: '保底', icon: 'briefcase', tone: 'blue', desc: '示例赛道：目标行业头部企业研发岗，可自行替换企业清单', req: ['核心工具栈与实操能力', '论文 / 专利 / 项目成果', '跨学科协作与落地能力', '目标岗位画像清晰'] },
    faculty: { label: '高校教职（示例）', short: '高校教职', priority: '上限', icon: 'book', tone: 'teal', desc: '示例赛道：高校 / 科研院所教职路线', req: ['3 篇及以上一作论文', '独立课题与基金申报能力', '教学与实验室管理经验', '学术服务与影响力'] },
    xuandiao: { label: '公共部门（示例）', short: '公共部门', priority: '保底', icon: 'shield', tone: 'red', desc: '示例赛道：定向选调 / 公共部门技术岗，可自行添加目标地区', req: ['应届毕业生身份', '组织经历与荣誉加分', '笔试 + 面试备考', '履历与岗位匹配'] }
  };

  const YEARS = ['博一', '博二', '博三', '博四', '博五'];
  const INFO_CATEGORIES = ['全部', '时政', '海外机会', '企业招聘', '基金申报', '高校招聘', '选调公告', '毕业节点'];
  const LAB_STATUS = ['跟踪中', '关注中', '已套磁', '已回复', '意向确认'];
  const BOOK_MODULES = ['基础夯实', 'AI建模工程', '药物递送生物材料', '科研软实力', '发展路线专项', '文社科'];
  const BOOK_STATUS = ['未读', '在读', '已读完'];

  function trackItems(items, track) { return items.filter(x => x.track === track); }
  function progressInfo(items) {
    if (!items.length) return { done: 0, total: 0, pct: 0 };
    const done = items.filter(x => x.done).length;
    return { done, total: items.length, pct: Math.round((done / items.length) * 100) };
  }
  function parseInspireImages(item) {
    try {
      const arr = JSON.parse((item && item.images) || '[]');
      return Array.isArray(arr) ? arr : [];
    } catch { return []; }
  }

  function checkboxRow(item) {
    return `
      <label class="career-check ${item.done ? 'is-done' : ''}">
        <input type="checkbox" data-id="${item.id}" ${item.done ? 'checked' : ''}>
        <span class="career-check-text">${U.esc(item.title)}${item.note ? `<small>${U.esc(item.note)}</small>` : ''}</span>
        <button type="button" class="icon-btn career-note" data-id="${item.id}" title="备注">${I('edit', 13)}</button>
      </label>`;
  }

  function nodeStatusBadge(status) {
    if (status === 'done') return U.badge('已完成', 'green');
    if (status === 'doing') return U.badge('进行中', 'blue');
    return U.badge('待启动', 'gray');
  }

  function nodeCard(node) {
    return `
      <div class="career-node ${node.status === 'done' ? 'is-done' : ''}" data-id="${node.id}">
        <div class="career-node-top">
          <span class="badge badge-blue">${U.esc(node.phase || '')}</span>
          ${nodeStatusBadge(node.status)}
          <span class="career-node-track">${U.esc((TRACKS[node.track] || {}).label || node.track)}</span>
        </div>
        <div class="career-node-goal">${U.esc(node.goal)}</div>
        ${node.key_nodes ? `<div class="career-node-keys">关键节点：${U.esc(node.key_nodes)}</div>` : ''}
        ${node.review ? `<div class="career-node-review"><b>复盘结果：</b>${U.esc(node.review)}</div>` : ''}
        ${node.gap ? `<div class="career-node-gap"><b>差距归因：</b>${U.esc(node.gap)}</div>` : ''}
        ${node.adjusted ? `<div class="career-node-adjusted"><b>调整计划：</b>${U.esc(node.adjusted)}</div>` : ''}
        <div class="career-node-actions">
          <button class="btn btn-primary btn-xs node-review" data-id="${node.id}">${I('edit', 12)} 复盘</button>
          ${node.status !== 'done' ? `<button class="btn btn-ghost btn-xs node-done" data-id="${node.id}">标记完成</button>` : ''}
          ${node.adjusted ? `<button class="btn btn-ghost btn-xs node-task" data-id="${node.id}">生成调整任务</button>` : ''}
          <button class="btn btn-ghost btn-xs node-edit" data-id="${node.id}">${I('edit', 12)}</button>
          <button class="btn btn-ghost btn-xs node-del" data-id="${node.id}">${I('trash', 12)}</button>
        </div>
      </div>`;
  }

  function trackPanel(trackKey, items, currentYear, nodes) {
    const t = TRACKS[trackKey];
    const info = progressInfo(items);
    const trackNodes = (nodes || []).filter(n => n.track === trackKey);
    const byYear = {};
    for (const y of YEARS) byYear[y] = [];
    for (const item of items) {
      if (!byYear[item.year]) byYear[item.year] = [];
      byYear[item.year].push(item);
    }
    const timeline = YEARS.map(y => `
      <div class="career-year ${y === currentYear ? 'is-current' : ''}">
        <div class="career-year-title">${y}${y === currentYear ? '<span class="badge badge-blue">当前</span>' : ''}</div>
        <div class="career-year-items">${(byYear[y] || []).map(checkboxRow).join('') || '<div class="col-empty">暂无事项</div>'}</div>
      </div>`).join('');
    return `
      <section class="panel career-track tone-${t.tone}">
        <div class="panel-head">
          <div class="career-track-title">${I(t.icon, 20)}<div><b>${t.label}</b><span>${t.desc}</span></div></div>
          <div class="career-track-meta">
            ${U.badge(t.priority === '上限' ? '上限冲刺' : t.priority === '保底' ? '保底' : '底线', t.priority === '上限' ? 'purple' : t.priority === '保底' ? 'blue' : 'green')}
            <b>${info.done}/${info.total}</b>
          </div>
        </div>
        <div class="panel-body">
          <div class="career-req">
            <div class="career-req-title">硬性要求</div>
            <ul>${t.req.map(r => `<li>${U.esc(r)}</li>`).join('')}</ul>
          </div>
          <div class="career-progress"><div class="career-progress-track"><i style="width:${info.pct}%"></i></div><span>${info.pct}%</span></div>
          <div class="career-timeline">${timeline}</div>
          <div class="career-nodes">
            <div class="career-nodes-head"><b>阶段性目标 · 关键节点 · 复盘调整</b><button class="btn btn-ghost btn-xs node-add" data-track="${trackKey}">${I('plus', 13)} 新增节点</button></div>
            ${trackNodes.map(nodeCard).join('') || '<div class="empty-state">暂无阶段节点</div>'}
          </div>
        </div>
      </section>`;
  }

  async function renderCareer() {
    const [items, currentYear, nodes] = await Promise.all([
      A.list('career_plans', 'year ASC, id ASC'),
      A.settingsGet('career_current_year'),
      A.list('career_nodes', 'id ASC')
    ]);
    const year = currentYear || '博一';
    const mainItems = items.filter(x => x.track !== 'fixed');
    const fixedItems = items.filter(x => x.track === 'fixed');
    const allInfo = progressInfo(mainItems);
    const fixedInfo = progressInfo(fixedItems);
    const tracks = Object.keys(TRACKS).map(k => trackPanel(k, trackItems(items, k), year, nodes)).join('');
    return `
      <div class="page-head">
        <div><h1>五赛道毕业与职业规划</h1><p>ZJU 直博 · 化学生物学 · AI + 深度学习 + 药物递送 · 生物 / 材料 / 化学交叉</p></div>
        <div class="page-actions">
          ${U.formField({ name: 'career_year', label: '', type: 'select', value: year, options: YEARS.map(y => ({ value: y, label: y })) }).replace('class="field"', 'class="field career-year-select"')}
          <button class="btn btn-primary btn-sm" id="career-pushdown">${I('check', 14)} 本年度规划下发为任务</button>
        </div>
      </div>
      <div class="career-banner">
        <div class="career-ring">${C.progressRing(allInfo.pct, 96, '总体完成')}</div>
        <div class="career-constraints">
          <div class="career-chip"><b>核心约束</b><span>4-5 年毕业上限 · 5 条赛道并行铺垫 · 互不冲突 · 资源复用</span></div>
          <div class="career-chip"><b>年度固定动作</b><span>每年 1 篇成果 · 每学期 1 次学术报告 · AI 建模 + 交叉实验持续夯实</span></div>
          <div class="career-chip"><b>资源复用规则</b><span>一篇科研成果同时适配企业产业化、高校学术、海外申请核心背书</span></div>
        </div>
      </div>
      <div class="career-priority">
        ${U.badge('底线：极速毕业', 'green')}
        ${U.badge('保底：企业就业 / 公共部门', 'blue')}
        ${U.badge('上限：高校教职 / 海外深造', 'purple')}
        <span>赛道优先级排序，全部并行推进</span>
      </div>
      ${tracks}
      <section class="panel career-track tone-blue">
        <div class="panel-head">
          <div class="career-track-title">${I('target', 20)}<div><b>年度固定动作</b><span>每年 1 篇成果 · 每学期 1 次报告 · 持续 AI 建模 + 交叉实验</span></div></div>
          <div class="career-track-meta"><b>${fixedInfo.done}/${fixedInfo.total}</b></div>
        </div>
        <div class="panel-body career-fixed-grid">${fixedItems.map(checkboxRow).join('')}</div>
      </section>`;
  }

  function mountCareer() {
    const select = document.querySelector('[name="career_year"]');
    if (select) select.addEventListener('change', async () => {
      await A.settingsSet('career_current_year', select.value);
      window.app.refresh();
    });
    document.querySelectorAll('.career-check input[type="checkbox"]').forEach(input => input.addEventListener('change', async () => {
      await A.update('career_plans', input.dataset.id, { done: input.checked ? 1 : 0, updated_at: new Date().toISOString() });
      window.app.refresh();
    }));
    document.querySelectorAll('.career-note').forEach(btn => btn.addEventListener('click', () => openCareerNote(Number(btn.dataset.id))));
    document.getElementById('career-pushdown').addEventListener('click', careerPushdown);
    document.querySelectorAll('.node-add').forEach(btn => btn.addEventListener('click', () => openNodeModal(null, btn.dataset.track)));
    document.querySelectorAll('.node-review, .node-edit').forEach(btn => btn.addEventListener('click', () => openNodeModal(Number(btn.dataset.id))));
    document.querySelectorAll('.node-done').forEach(btn => btn.addEventListener('click', async () => {
      await A.update('career_nodes', btn.dataset.id, { status: 'done', updated_at: new Date().toISOString() });
      U.toast('success', '阶段节点已标记完成');
      window.app.refresh();
    }));
    document.querySelectorAll('.node-task').forEach(btn => btn.addEventListener('click', async () => {
      const nodes = await A.list('career_nodes');
      const node = nodes.find(x => x.id === Number(btn.dataset.id));
      if (!node || !node.adjusted) return;
      await A.insert('tasks', {
        title: `【规划调整】${(TRACKS[node.track] || {}).label || ''} ${node.adjusted.slice(0, 40)}`,
        detail: node.adjusted, date: U.iso(new Date()), due_date: U.iso(U.addDays(new Date(), 30)),
        status: 'todo', priority: '高', category: '规划', plan_type: 'month', source: 'career-adjusted'
      });
      U.toast('success', '调整计划已生成科研任务');
    }));
    document.querySelectorAll('.node-del').forEach(btn => btn.addEventListener('click', () => {
      U.confirmDialog({ title: '删除阶段节点', message: '确认删除该节点及复盘记录？', danger: true, onConfirm: async () => {
        await A.remove('career_nodes', btn.dataset.id);
        window.app.refresh();
      } });
    }));
  }

  function infoCard(info) {
    return `
      <div class="info-card ${info.status === 'unread' ? 'is-unread' : ''}" data-category="${U.esc(info.category || '')}" data-track="${U.esc(info.track)}">
        <div class="info-top">
          ${info.category ? U.badge(info.category, info.category === '时政' ? 'red' : info.category === '海外机会' ? 'purple' : info.category === '企业招聘' ? 'blue' : info.category === '基金申报' ? 'teal' : 'gray') : ''}
          ${info.importance ? U.badge('重要', info.importance === '高' ? 'orange' : 'gray') : ''}
          ${info.status === 'unread' ? U.badge('未读', 'orange') : U.badge('已读', 'green')}
        </div>
        <b>${U.esc(info.title)}</b>
        <span class="info-source">${U.esc(info.source || '')}${info.date ? ' · ' + U.esc(info.date) : ''}</span>
        ${info.note ? `<div class="info-note">${U.esc(info.note)}</div>` : ''}
        ${info.key_points ? `<div class="info-key"><b>关键信息</b><span>${U.esc(info.key_points)}</span></div>` : ''}
        ${info.insight ? `<div class="info-insight"><b>我的感悟</b><span>${U.esc(info.insight)}</span></div>` : ''}
        <div class="info-actions">
          ${info.url ? `<button class="btn btn-outline btn-xs info-open" data-url="${U.esc(info.url)}">${I('link', 12)} 打开</button>` : ''}
          <button class="btn btn-ghost btn-xs info-insight" data-id="${info.id}">${I('edit', 12)} 记录感悟</button>
          <button class="btn btn-ghost btn-xs info-read" data-id="${info.id}" data-status="${info.status}">${info.status === 'unread' ? '标记已读' : '标为未读'}</button>
          <button class="btn btn-ghost btn-xs info-edit" data-id="${info.id}">${I('edit', 12)}</button>
          <button class="btn btn-ghost btn-xs info-del" data-id="${info.id}">${I('trash', 12)}</button>
        </div>
      </div>`;
  }

  async function renderCareerInfo() {
    const [infos, cyclesObj] = await Promise.all([A.list('career_infos', 'id DESC'), A.settingsGet('info_cycles')]);
    const unreadByTrack = {};
    infos.forEach(i => { if (i.status === 'unread') unreadByTrack[i.track] = (unreadByTrack[i.track] || 0) + 1; });
    const cycles = cyclesObj || {};
    const cycleLine = Object.keys(TRACKS).map(k => {
      const c = cycles[k] || {};
      const days = c.nextPush ? Math.max(0, Math.ceil((new Date(c.nextPush) - Date.now()) / 86400000)) : null;
      return `<span class="cycle-item"><b>${TRACKS[k].short}</b>${days === null ? '未设置' : days === 0 ? '今天可更新' : `${days} 天后推送`}</span>`;
    }).join('');
    const tabs = `
      <button class="info-tab active" data-track="all">全部</button>
      ${Object.keys(TRACKS).map(k => `<button class="info-tab" data-track="${k}">${TRACKS[k].short}${unreadByTrack[k] ? `<span class="tab-count">${unreadByTrack[k]}</span>` : ''}</button>`).join('')}`;
    return `
      <div class="page-head"><div><h1>赛道情报推送</h1><p>五个文件夹 · 每 3 个月自动推送一轮 · 可记录关键信息与感悟</p></div>
      <div class="page-actions">
        <button class="btn btn-outline btn-sm" id="info-quarterly">${I('sync', 14)} 检查季度推送</button>
        <button class="btn btn-primary btn-sm" id="info-add">${I('plus', 14)} 新增情报</button>
      </div></div>
      <section class="panel">
        <div class="panel-body">
          <div class="info-tabs">${tabs}</div>
          <div class="info-cycle-line">每 3 个月自动推送一轮 · ${cycleLine}</div>
          <div class="info-grid" id="info-grid">${infos.map(infoCard).join('') || U.emptyState('暂无情报推送', 'spark')}</div>
        </div>
      </section>`;
  }

  function mountCareerInfo() {
    document.querySelectorAll('.info-tab').forEach(tab => tab.addEventListener('click', () => {
      document.querySelectorAll('.info-tab').forEach(t => t.classList.toggle('active', t === tab));
      const v = tab.dataset.track;
      document.querySelectorAll('#info-grid .info-card').forEach(card => {
        card.style.display = (v === 'all' || card.dataset.track === v) ? '' : 'none';
      });
    }));
    document.getElementById('info-quarterly').addEventListener('click', async () => {
      const pushed = await A.careerQuarterlyPush();
      U.toast('success', pushed.length ? `季度推送完成：${pushed.map(p => `${(TRACKS[p.track] || {}).short || p.track} ${p.count} 条`).join('；')}` : '当前没有到期的文件夹');
      window.app.refresh();
    });
    document.getElementById('info-add').addEventListener('click', () => openInfoModal());
    document.querySelectorAll('.info-insight').forEach(btn => btn.addEventListener('click', () => openInfoInsightModal(Number(btn.dataset.id))));
    document.querySelectorAll('.info-read').forEach(btn => btn.addEventListener('click', async () => {
      await A.update('career_infos', btn.dataset.id, { status: btn.dataset.status === 'unread' ? 'read' : 'unread', updated_at: new Date().toISOString() });
      window.app.refresh();
    }));
    document.querySelectorAll('.info-open').forEach(btn => btn.addEventListener('click', () => A.openExternal(btn.dataset.url)));
    document.querySelectorAll('.info-edit').forEach(btn => btn.addEventListener('click', () => openInfoModal(Number(btn.dataset.id))));
    document.querySelectorAll('.info-del').forEach(btn => btn.addEventListener('click', () => {
      U.confirmDialog({ title: '删除情报', message: '确认删除这条情报推送？', danger: true, onConfirm: async () => {
        await A.remove('career_infos', btn.dataset.id);
        window.app.refresh();
      } });
    }));
  }

  function labCard(lab) {
    let papers = [];
    try { papers = JSON.parse(lab.papers || '[]'); } catch { papers = []; }
    return `
      <div class="lab-card">
        <div class="lab-top">
          <b>${U.esc(lab.name)}</b>
          ${U.badge(lab.status || '跟踪中', lab.status === '意向确认' ? 'green' : lab.status === '已回复' ? 'blue' : lab.status === '已套磁' ? 'purple' : 'gray')}
        </div>
        <div class="lab-meta">${U.esc(lab.institution || '')}${lab.country ? ' · ' + U.esc(lab.country) : ''} · ${U.esc(lab.direction || '')}</div>
        <div class="lab-traits"><b>导师偏好学生特质</b><span>${U.esc(lab.traits || '暂未记录')}</span></div>
        <div class="lab-papers-line">${papers.length ? `最新论文 ${papers.length} 篇${lab.last_paper_date ? ' · 更新至 ' + U.esc(lab.last_paper_date) : ''}` : '暂无论文记录'}</div>
        <div class="lab-actions">
          ${lab.homepage ? `<button class="btn btn-outline btn-xs lab-open" data-url="${U.esc(lab.homepage)}">${I('link', 12)} 主页</button>` : ''}
          <button class="btn btn-ghost btn-xs lab-papers" data-id="${lab.id}">${I('book', 12)} 论文</button>
          <button class="btn btn-ghost btn-xs lab-refresh" data-id="${lab.id}">${I('sync', 12)} 拉取最新</button>
          <button class="btn btn-ghost btn-xs lab-edit" data-id="${lab.id}">${I('edit', 12)}</button>
          <button class="btn btn-ghost btn-xs lab-del" data-id="${lab.id}">${I('trash', 12)}</button>
        </div>
      </div>`;
  }

  async function renderCareerLabs() {
    const labs = await A.list('career_labs', 'id ASC');
    return `
      <div class="page-head"><div><h1>海外课题组与导师跟踪</h1><p>导师主页、研究方向、偏好学生特质 · PubMed 拉取最新论文</p></div>
      <div class="page-actions"><button class="btn btn-primary btn-sm" id="lab-add">${I('plus', 14)} 新增课题组</button></div></div>
      <section class="panel"><div class="panel-body"><div class="lab-grid">${labs.map(labCard).join('') || U.emptyState('暂无跟踪课题组', 'send')}</div></div></section>`;
  }

  function mountCareerLabs() {
    document.getElementById('lab-add').addEventListener('click', () => openLabModal());
    document.querySelectorAll('.lab-open').forEach(btn => btn.addEventListener('click', () => A.openExternal(btn.dataset.url)));
    document.querySelectorAll('.lab-papers').forEach(btn => btn.addEventListener('click', () => openLabPapersModal(Number(btn.dataset.id))));
    document.querySelectorAll('.lab-refresh').forEach(btn => btn.addEventListener('click', async () => {
      U.toast('info', '正在从 PubMed 拉取最新论文…');
      const r = await A.careerLabPapers(btn.dataset.id);
      U.toast(r.ok ? 'success' : 'error', r.message);
      window.app.refresh();
    }));
    document.querySelectorAll('.lab-edit').forEach(btn => btn.addEventListener('click', () => openLabModal(Number(btn.dataset.id))));
    document.querySelectorAll('.lab-del').forEach(btn => btn.addEventListener('click', () => {
      U.confirmDialog({ title: '删除课题组', message: '确认删除该课题组跟踪记录？', danger: true, onConfirm: async () => {
        await A.remove('career_labs', btn.dataset.id);
        window.app.refresh();
      } });
    }));
  }

  function inspireCard(item) {
    const images = parseInspireImages(item);
    return `
      <div class="inspire-card">
        <div class="inspire-top"><b>${U.esc(item.title || '随笔')}</b><span>${U.fmtDate(item.date)}</span></div>
        ${item.tags ? `<div class="inspire-tags">${item.tags.split(',').filter(Boolean).map(t => U.badge(t, 'purple')).join(' ')}</div>` : ''}
        <div class="inspire-content">${U.esc(item.content)}</div>
        ${images.length ? `<div class="inspire-images">${images.map(img => `
          <div class="inspire-image">
            <img src="${U.esc(img.path)}" alt="${U.esc(img.name)}">
            <button type="button" class="btn btn-ghost btn-xs ii-open" data-path="${U.esc(img.path)}">${I('eye', 12)} 查看</button>
          </div>`).join('')}</div>` : ''}
        <div class="inspire-actions">
          <button class="btn btn-ghost btn-xs inspire-edit" data-id="${item.id}">${I('edit', 12)} 编辑</button>
          <button class="btn btn-ghost btn-xs inspire-del" data-id="${item.id}">${I('trash', 12)}</button>
        </div>
      </div>`;
  }

  async function renderCareerInspire() {
    const inspirations = await A.list('career_inspirations', 'date DESC, id DESC');
    return `
      <div class="page-head"><div><h1>平日灵感库 · 日记随笔</h1><p>随手记录灵感、实验感悟与阅读联想 · 支持导入图片</p></div>
      <div class="page-actions"><button class="btn btn-primary btn-sm" id="inspire-add">${I('plus', 14)} 记录灵感</button></div></div>
      <section class="panel"><div class="panel-body"><div class="inspire-grid">${inspirations.map(inspireCard).join('') || U.emptyState('暂无灵感记录，随手记下第一个想法', 'spark')}</div></div></section>`;
  }

  function mountCareerInspire() {
    document.getElementById('inspire-add').addEventListener('click', () => openInspireModal());
    document.querySelectorAll('.ii-open').forEach(btn => btn.addEventListener('click', () => A.openPath(btn.dataset.path)));
    document.querySelectorAll('.inspire-edit').forEach(btn => btn.addEventListener('click', () => openInspireModal(Number(btn.dataset.id))));
    document.querySelectorAll('.inspire-del').forEach(btn => btn.addEventListener('click', () => {
      U.confirmDialog({ title: '删除灵感记录', message: '确认删除这条灵感 / 随笔？', danger: true, onConfirm: async () => {
        await A.remove('career_inspirations', btn.dataset.id);
        window.app.refresh();
      } });
    }));
  }

  function bookStatusBadge(status) {
    if (status === '已读完') return U.badge('已读完', 'green');
    if (status === '在读') return U.badge('在读', 'blue');
    return U.badge('未读', 'gray');
  }

  function bookCard(book) {
    return `
      <div class="book-card" data-module="${U.esc(book.module || '')}">
        <div class="book-top">
          <b>${U.esc(book.title)}</b>
          ${bookStatusBadge(book.status)}
        </div>
        <div class="book-meta">${U.esc(book.author || '')}${book.stage ? ' · ' + U.esc(book.stage) : ''}</div>
        <div class="book-badges">
          ${book.module ? U.badge(book.module, book.module === '文社科' ? 'purple' : book.module === '基础夯实' ? 'blue' : 'teal') : ''}
          ${U.badge(book.priority || '补充', book.priority === '必读' ? 'red' : book.priority === '精读' ? 'orange' : 'gray')}
        </div>
        <div class="book-purpose">${U.esc(book.purpose || '')}</div>
        ${book.review ? `<div class="book-review"><b>读书感受 / 灵感</b><span>${U.esc(book.review)}</span></div>` : ''}
        <div class="book-actions">
          ${book.status === '未读' ? `<button class="btn btn-outline btn-xs book-start" data-id="${book.id}">${I('play', 12)} 开始读</button>` : ''}
          ${book.status !== '已读完' ? `<button class="btn btn-primary btn-xs book-finish" data-id="${book.id}">${I('check', 12)} 读完并记录</button>` : ''}
          <button class="btn btn-ghost btn-xs book-edit" data-id="${book.id}">${I('edit', 12)}</button>
          <button class="btn btn-ghost btn-xs book-del" data-id="${book.id}">${I('trash', 12)}</button>
        </div>
      </div>`;
  }

  async function renderCareerBooks() {
    const [books, bookCyclesObj] = await Promise.all([A.list('career_books', 'module ASC, id ASC'), A.settingsGet('book_cycles')]);
    const bookCycles = bookCyclesObj || {};
    const bookDays = bookCycles.nextPush ? Math.max(0, Math.ceil((new Date(bookCycles.nextPush) - Date.now()) / 86400000)) : null;
    return `
      <div class="page-head"><div><h1>分模块定向书单</h1><p>科研必读 + 文社科经典 · 每半年精推 2 本 · 阅读灵感记录</p></div>
      <div class="page-actions">
        <button class="btn btn-outline btn-sm" id="book-push">${I('sync', 14)} 检查半年推送</button>
        <button class="btn btn-primary btn-sm" id="book-add">${I('plus', 14)} 录入纸质书 / 新增书目</button>
      </div></div>
      <section class="panel">
        <div class="panel-body">
          <div class="info-tabs" id="book-tabs">
            <button class="info-tab active" data-module="all">全部</button>
            ${BOOK_MODULES.map(m => `<button class="info-tab" data-module="${m}">${m}</button>`).join('')}
          </div>
          <div class="info-cycle-line">每 6 个月自动精推 2 本文社科经典 · ${bookDays === null ? '未设置' : bookDays === 0 ? '今天可更新' : `${bookDays} 天后推送`}</div>
          <div class="book-grid">${books.map(bookCard).join('') || U.emptyState('书单为空，可手动录入纸质书', 'book')}</div>
        </div>
      </section>`;
  }

  function mountCareerBooks() {
    document.getElementById('book-push').addEventListener('click', async () => {
      const pushed = await A.careerBookPush();
      U.toast('success', pushed.length ? `半年书单推送完成：${pushed.join('；')}` : '当前未到半年推送时间');
      window.app.refresh();
    });
    document.getElementById('book-add').addEventListener('click', () => openBookModal());
    document.querySelectorAll('#book-tabs .info-tab').forEach(tab => tab.addEventListener('click', () => {
      document.querySelectorAll('#book-tabs .info-tab').forEach(t => t.classList.toggle('active', t === tab));
      const v = tab.dataset.module;
      document.querySelectorAll('.book-card').forEach(card => {
        card.style.display = (v === 'all' || card.dataset.module === v) ? '' : 'none';
      });
    }));
    document.querySelectorAll('.book-start').forEach(btn => btn.addEventListener('click', async () => {
      await A.update('career_books', btn.dataset.id, { status: '在读', started_at: U.iso(new Date()), updated_at: new Date().toISOString() });
      U.toast('success', '已标记为在读');
      window.app.refresh();
    }));
    document.querySelectorAll('.book-finish').forEach(btn => btn.addEventListener('click', () => openBookReadModal(Number(btn.dataset.id))));
    document.querySelectorAll('.book-edit').forEach(btn => btn.addEventListener('click', () => openBookModal(Number(btn.dataset.id))));
    document.querySelectorAll('.book-del').forEach(btn => btn.addEventListener('click', () => {
      U.confirmDialog({ title: '删除书目', message: '确认从书单中删除这本书？', danger: true, onConfirm: async () => {
        await A.remove('career_books', btn.dataset.id);
        window.app.refresh();
      } });
    }));
  }

  function openCareerNote(id) {
    A.list('career_plans').then(items => {
      const item = items.find(x => x.id === id);
      if (!item) return;
      U.openModal({
        title: '规划事项备注',
        width: '520px',
        body: `<form class="form" id="career-note-form">
          <div class="field"><label>事项</label><div class="field-readonly">${U.esc(item.title)}</div></div>
          ${U.formField({ name: 'note', label: '备注 / 证据材料', type: 'textarea', rows: 4, value: item.note || '', placeholder: '记录完成时间、成果链接、关键证据…' })}
          <div class="modal-actions"><button type="button" class="btn btn-ghost" data-close>取消</button><button type="submit" class="btn btn-primary">保存</button></div>
        </form>`,
        onMount: (bodyEl, close) => {
          bodyEl.querySelector('[data-close]').addEventListener('click', close);
          bodyEl.querySelector('form').addEventListener('submit', async (e) => {
            e.preventDefault();
            await A.update('career_plans', id, { note: U.formValues(e.target).note, updated_at: new Date().toISOString() });
            U.toast('success', '备注已保存');
            close();
            window.app.refresh();
          });
        }
      });
    });
  }

  async function careerPushdown() {
    const year = await A.settingsGet('career_current_year') || '博一';
    const items = await A.list('career_plans', 'year ASC, id ASC');
    const target = items.filter(x => x.track !== 'fixed' && x.year === year && !x.done);
    if (!target.length) { U.toast('info', `${year} 的规划事项已全部完成`); return; }
    const trackLabel = id => (TRACKS[id] ? TRACKS[id].label : '');
    let count = 0;
    for (const item of target) {
      await A.insert('tasks', {
        title: `【${year}·${trackLabel(item.track)}】${item.title}`,
        detail: item.note || '', date: U.iso(new Date()), due_date: U.iso(U.addDays(new Date(), 90)),
        status: 'todo', priority: '中', category: '规划', plan_type: 'month', source: 'career-pushdown'
      });
      count++;
    }
    U.toast('success', `已将 ${count} 项 ${year} 规划下发为科研任务`);
  }

  function openInfoModal(id) {
    const load = id ? A.list('career_infos').then(rows => rows.find(r => r.id === id)) : Promise.resolve(null);
    load.then(info => {
      const trackOptions = Object.keys(TRACKS).map(k => ({ value: k, label: TRACKS[k].label }));
      const categoryOptions = INFO_CATEGORIES.filter(c => c !== '全部');
      U.openModal({
        title: id ? '编辑情报推送' : '新增赛道情报',
        width: '640px',
        body: `<form class="form" id="info-form">
          <div class="grid-2">
            ${U.formField({ name: 'track', label: '所属赛道', type: 'select', value: info?.track || 'xuandiao', options: trackOptions })}
            ${U.formField({ name: 'category', label: '情报分类', type: 'select', value: info?.category || '时政', options: categoryOptions })}
          </div>
          ${U.formField({ name: 'title', label: '情报标题', value: info?.title || '', required: true })}
          <div class="grid-2">
            ${U.formField({ name: 'source', label: '来源', value: info?.source || '' })}
            ${U.formField({ name: 'date', label: '时间 / 窗口', value: info?.date || '' })}
          </div>
          ${U.formField({ name: 'url', label: '链接', value: info?.url || '' })}
          ${U.formField({ name: 'note', label: '要点提示', type: 'textarea', rows: 3, value: info?.note || '' })}
          ${U.formField({ name: 'key_points', label: '关键信息（我的记录）', type: 'textarea', rows: 3, value: info?.key_points || '' })}
          ${U.formField({ name: 'insight', label: '我的感悟（我的记录）', type: 'textarea', rows: 3, value: info?.insight || '' })}
          <div class="grid-2">
            ${U.formField({ name: 'importance', label: '重要度', type: 'select', value: info?.importance || '中', options: ['高', '中', '低'] })}
            ${U.formField({ name: 'status', label: '标记为已读', type: 'checkbox', value: info?.status === 'read' })}
          </div>
          <div class="modal-actions"><button type="button" class="btn btn-ghost" data-close>取消</button><button type="submit" class="btn btn-primary">保存</button></div>
        </form>`,
        onMount: (bodyEl, close) => {
          bodyEl.querySelector('[data-close]').addEventListener('click', close);
          bodyEl.querySelector('form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const v = U.formValues(bodyEl.querySelector('form'));
            const payload = { ...v, status: v.status ? 'read' : 'unread', updated_at: new Date().toISOString() };
            if (id) await A.update('career_infos', id, payload);
            else await A.insert('career_infos', { ...payload, created_at: new Date().toISOString() });
            U.toast('success', '情报已保存');
            close();
            window.app.refresh();
          });
        }
      });
    });
  }

  function openInfoInsightModal(id) {
    A.list('career_infos').then(infos => {
      const info = infos.find(x => x.id === id);
      if (!info) return;
      U.openModal({
        title: '记录关键信息与感悟',
        width: '640px',
        body: `<form class="form" id="info-insight-form">
          <div class="field"><label>情报</label><div class="field-readonly">${U.esc(info.title)}</div></div>
          ${U.formField({ name: 'key_points', label: '关键信息', type: 'textarea', rows: 4, value: info.key_points || '', placeholder: '日期、数据、政策要点、申请窗口等' })}
          ${U.formField({ name: 'insight', label: '我的感悟', type: 'textarea', rows: 4, value: info.insight || '', placeholder: '这条信息对我哪条赛道有什么启发？' })}
          <div class="modal-actions"><button type="button" class="btn btn-ghost" data-close>取消</button><button type="submit" class="btn btn-primary">保存</button></div>
        </form>`,
        onMount: (bodyEl, close) => {
          bodyEl.querySelector('[data-close]').addEventListener('click', close);
          bodyEl.querySelector('form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const v = U.formValues(bodyEl.querySelector('form'));
            await A.update('career_infos', id, { key_points: v.key_points, insight: v.insight, status: 'read', updated_at: new Date().toISOString() });
            U.toast('success', '关键信息与感悟已存档');
            close();
            window.app.refresh();
          });
        }
      });
    });
  }

  function bindInspireImages(container, images) {
    const render = () => {
      container.innerHTML = `
        <div class="review-files-head"><b>灵感图片</b><span>导入本地图片 · 随灵感存档</span></div>
        <div class="inspire-images">
          ${images.length ? images.map((img, i) => `
            <div class="inspire-image">
              <img src="${U.esc(img.path)}" alt="${U.esc(img.name)}">
              <div class="inspire-image-actions">
                <button type="button" class="btn btn-ghost btn-xs ii-open" data-path="${U.esc(img.path)}">${I('eye', 12)} 查看</button>
                <button type="button" class="btn btn-ghost btn-xs ii-del" data-idx="${i}">${I('trash', 12)} 删除</button>
              </div>
            </div>`).join('') : '<div class="col-empty">暂无图片</div>'}
        </div>
        <button type="button" class="btn btn-outline btn-sm ii-import">${I('upload', 13)} 导入图片</button>`;
      container.querySelector('.ii-import').addEventListener('click', async () => {
        const r = await A.pickFile('inspiration-image');
        if (r && !r.canceled) {
          const name = r.original ? r.original.split(/[\\/]/).pop() : r.path.split(/[\\/]/).pop();
          images.push({ name, path: r.path });
          render();
        }
      });
      container.querySelectorAll('.ii-open').forEach(btn => btn.addEventListener('click', () => A.openPath(btn.dataset.path)));
      container.querySelectorAll('.ii-del').forEach(btn => btn.addEventListener('click', () => {
        images.splice(Number(btn.dataset.idx), 1);
        render();
      }));
    };
    render();
  }

  function openInspireModal(id) {
    const load = id ? A.list('career_inspirations').then(rows => rows.find(r => r.id === id)) : Promise.resolve(null);
    load.then(item => {
      const images = parseInspireImages(item);
      U.openModal({
        title: id ? '编辑灵感 / 随笔' : '记录灵感',
        width: '720px',
        body: `<form class="form" id="inspire-form">
          <div class="grid-2">
            ${U.formField({ name: 'date', label: '日期', type: 'date', value: (item?.date || U.iso(new Date())).slice(0, 10), required: true })}
            ${U.formField({ name: 'title', label: '标题', value: item?.title || '', placeholder: '如：灵感 / 随笔 / 实验感悟' })}
          </div>
          ${U.formField({ name: 'content', label: '内容', type: 'textarea', rows: 8, value: item?.content || '', required: true, placeholder: '记下想法、灵感、随笔、阅读联想…' })}
          ${U.formField({ name: 'tags', label: '标签（逗号分隔）', value: item?.tags || '' })}
          <div class="review-files" id="inspire-images"></div>
          <div class="modal-actions"><button type="button" class="btn btn-ghost" data-close>取消</button><button type="submit" class="btn btn-primary">保存</button></div>
        </form>`,
        onMount: (bodyEl, close) => {
          bodyEl.querySelector('[data-close]').addEventListener('click', close);
          bindInspireImages(bodyEl.querySelector('#inspire-images'), images);
          bodyEl.querySelector('form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const v = U.formValues(bodyEl.querySelector('form'));
            const payload = { ...v, images, updated_at: new Date().toISOString() };
            if (id) await A.update('career_inspirations', id, payload);
            else await A.insert('career_inspirations', { ...payload, created_at: new Date().toISOString() });
            U.toast('success', '灵感已存档');
            close();
            window.app.refresh();
          });
        }
      });
    });
  }

  function openNodeModal(id, trackKey) {
    const load = id ? A.list('career_nodes').then(rows => rows.find(r => r.id === id)) : Promise.resolve(null);
    load.then(node => {
      const trackOptions = Object.keys(TRACKS).map(k => ({ value: k, label: TRACKS[k].label }));
      U.openModal({
        title: id ? '阶段节点复盘' : '新增阶段目标与关键节点',
        width: '760px',
        body: `<form class="form" id="node-form">
          <div class="grid-2">
            ${U.formField({ name: 'track', label: '所属赛道', type: 'select', value: node?.track || trackKey || 'graduate', options: trackOptions })}
            ${U.formField({ name: 'phase', label: '阶段', type: 'select', value: node?.phase || '博一', options: YEARS })}
          </div>
          ${U.formField({ name: 'goal', label: '阶段目标', type: 'textarea', rows: 2, value: node?.goal || '', required: true })}
          ${U.formField({ name: 'key_nodes', label: '关键节点', type: 'textarea', rows: 3, value: node?.key_nodes || '' })}
          ${U.formField({ name: 'status', label: '状态', type: 'select', value: node?.status || 'todo', options: [{ value: 'todo', label: '待启动' }, { value: 'doing', label: '进行中' }, { value: 'done', label: '已完成' }] })}
          <div class="node-review-fields">
            ${U.formField({ name: 'review', label: '复盘结果', type: 'textarea', rows: 3, value: node?.review || '', placeholder: '完成情况、实际产出、关键证据…' })}
            ${U.formField({ name: 'gap', label: '差距归因', type: 'textarea', rows: 2, value: node?.gap || '', placeholder: '未完成 / 延迟的原因' })}
            ${U.formField({ name: 'adjusted', label: '调整计划', type: 'textarea', rows: 3, value: node?.adjusted || '', placeholder: '根据复盘结果调整下一步计划' })}
          </div>
          <div class="modal-actions"><button type="button" class="btn btn-ghost" data-close>取消</button><button type="submit" class="btn btn-primary">保存复盘</button></div>
        </form>`,
        onMount: (bodyEl, close) => {
          bodyEl.querySelector('[data-close]').addEventListener('click', close);
          bodyEl.querySelector('form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const v = U.formValues(bodyEl.querySelector('form'));
            const payload = { ...v, updated_at: new Date().toISOString() };
            if (id) await A.update('career_nodes', id, payload);
            else await A.insert('career_nodes', { ...payload, created_at: new Date().toISOString() });
            U.toast('success', id ? '复盘结果已保存，计划已更新' : '阶段节点已新增');
            close();
            window.app.refresh();
          });
        }
      });
    });
  }

  function openLabModal(id) {
    const load = id ? A.list('career_labs').then(rows => rows.find(r => r.id === id)) : Promise.resolve(null);
    load.then(lab => {
      U.openModal({
        title: id ? '编辑课题组' : '新增海外课题组',
        width: '760px',
        body: `<form class="form" id="lab-form">
          <div class="grid-2">
            ${U.formField({ name: 'name', label: '课题组 / 导师', value: lab?.name || '', required: true })}
            ${U.formField({ name: 'institution', label: '机构', value: lab?.institution || '' })}
          </div>
          <div class="grid-2">
            ${U.formField({ name: 'country', label: '国家', value: lab?.country || '' })}
            ${U.formField({ name: 'direction', label: '研究方向', value: lab?.direction || '' })}
          </div>
          <div class="grid-2">
            ${U.formField({ name: 'homepage', label: '课题组主页', value: lab?.homepage || '' })}
            ${U.formField({ name: 'email', label: '邮箱', value: lab?.email || '' })}
          </div>
          <div class="grid-2">
            ${U.formField({ name: 'status', label: '跟踪状态', type: 'select', value: lab?.status || '跟踪中', options: LAB_STATUS })}
            ${U.formField({ name: 'priority', label: '优先级', type: 'select', value: lab?.priority || '中', options: ['高', '中', '低'] })}
          </div>
          ${U.formField({ name: 'traits', label: '导师更偏好的学生特质', type: 'textarea', rows: 3, value: lab?.traits || '', placeholder: '如：偏好强编码能力 + 材料合成背景、能独立推进项目的学生' })}
          ${U.formField({ name: 'note', label: '备注', type: 'textarea', rows: 2, value: lab?.note || '' })}
          <div class="modal-actions"><button type="button" class="btn btn-ghost" data-close>取消</button><button type="submit" class="btn btn-primary">保存</button></div>
        </form>`,
        onMount: (bodyEl, close) => {
          bodyEl.querySelector('[data-close]').addEventListener('click', close);
          bodyEl.querySelector('form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const v = U.formValues(bodyEl.querySelector('form'));
            const payload = { ...v, updated_at: new Date().toISOString() };
            if (id) await A.update('career_labs', id, payload);
            else await A.insert('career_labs', { ...payload, papers: '', last_paper_date: '', created_at: new Date().toISOString() });
            U.toast('success', '课题组信息已保存');
            close();
            window.app.refresh();
          });
        }
      });
    });
  }

  function openLabPapersModal(id) {
    A.list('career_labs').then(labs => {
      const lab = labs.find(x => x.id === id);
      if (!lab) return;
      const renderPapers = (papers) => papers.map(p => `
        <div class="paper-row">
          <div class="paper-main"><b>${U.esc(p.title)}</b><span>${U.esc(p.journal || '')}${p.year ? ' · ' + U.esc(p.year) : ''}</span></div>
          <div class="paper-actions">${p.url ? `<button class="btn btn-outline btn-xs paper-open" data-url="${U.esc(p.url)}">${I('link', 12)} 打开</button>` : ''}</div>
        </div>`).join('') || '<div class="empty-state">暂无论文记录</div>';
      U.openModal({
        title: `${lab.name} · 最新论文`,
        width: '720px',
        body: `
          <div class="lab-papers-toolbar">
            <button class="btn btn-primary btn-sm" id="papers-refresh">${I('sync', 14)} 从 PubMed 拉取最新</button>
            <span class="field-help">按课题组名称 + 机构检索，最多返回 6 篇</span>
          </div>
          <div class="paper-list" id="papers-list">${renderPapers((() => { try { return JSON.parse(lab.papers || '[]'); } catch { return []; } })())}</div>
          <form class="form paper-add-form" id="papers-add">
            <div class="grid-2">
              ${U.formField({ name: 'title', label: '论文标题', required: true })}
              ${U.formField({ name: 'journal', label: '期刊' })}
            </div>
            <div class="grid-2">
              ${U.formField({ name: 'year', label: '年份', type: 'number', value: new Date().getFullYear() })}
              ${U.formField({ name: 'url', label: '链接' })}
            </div>
            <div class="modal-actions"><button type="submit" class="btn btn-ghost btn-sm">${I('plus', 13)} 手动添加论文</button></div>
          </form>
          <div class="modal-actions"><button type="button" class="btn btn-primary" id="papers-close">完成</button></div>`,
        onMount: (bodyEl, close) => {
          const listEl = bodyEl.querySelector('#papers-list');
          const bindOpen = () => {
            listEl.querySelectorAll('.paper-open').forEach(btn => btn.addEventListener('click', () => A.openExternal(btn.dataset.url)));
          };
          bindOpen();
          bodyEl.querySelector('#papers-close').addEventListener('click', close);
          bodyEl.querySelector('#papers-refresh').addEventListener('click', async () => {
            U.toast('info', '正在拉取课题组最新论文…');
            const r = await A.careerLabPapers(id);
            if (r.ok) { listEl.innerHTML = renderPapers(r.papers); bindOpen(); }
            U.toast(r.ok ? 'success' : 'error', r.message);
          });
          bodyEl.querySelector('#papers-add').addEventListener('submit', async (e) => {
            e.preventDefault();
            const v = U.formValues(e.target);
            let current = [];
            try { current = JSON.parse(lab.papers || '[]'); } catch { current = []; }
            current.push({ title: v.title, journal: v.journal, year: v.year ? String(v.year) : '', url: v.url });
            await A.update('career_labs', id, { papers: JSON.stringify(current), updated_at: new Date().toISOString() });
            listEl.innerHTML = renderPapers(current);
            bindOpen();
            e.target.reset();
          });
        }
      });
    });
  }

  function openBookModal(id) {
    const load = id ? A.list('career_books').then(rows => rows.find(r => r.id === id)) : Promise.resolve(null);
    load.then(book => {
      const stageOptions = ['博一', '博二', '博三', '博四', '博一~博二', '博二~博三', '博三~博四', '全周期'];
      U.openModal({
        title: id ? '编辑书目' : '录入纸质书 / 新增书目',
        width: '760px',
        body: `<form class="form" id="book-form">
          <div class="grid-2">
            ${U.formField({ name: 'module', label: '模块', type: 'select', value: book?.module || '文社科', options: BOOK_MODULES })}
            ${U.formField({ name: 'priority', label: '优先级', type: 'select', value: book?.priority || '补充', options: ['必读', '精读', '补充'] })}
          </div>
          <div class="grid-2">
            ${U.formField({ name: 'title', label: '书名', value: book?.title || '', required: true })}
            ${U.formField({ name: 'author', label: '作者', value: book?.author || '' })}
          </div>
          <div class="grid-2">
            ${U.formField({ name: 'stage', label: '阅读阶段', type: 'select', value: book?.stage || '全周期', options: stageOptions })}
            ${U.formField({ name: 'status', label: '阅读状态', type: 'select', value: book?.status || '未读', options: BOOK_STATUS })}
          </div>
          ${U.formField({ name: 'purpose', label: '阅读目的 / 简介', type: 'textarea', rows: 3, value: book?.purpose || '', placeholder: '为什么读这本书？对哪条赛道或课题有帮助？' })}
          <div class="modal-actions"><button type="button" class="btn btn-ghost" data-close>取消</button><button type="submit" class="btn btn-primary">保存</button></div>
        </form>`,
        onMount: (bodyEl, close) => {
          bodyEl.querySelector('[data-close]').addEventListener('click', close);
          bodyEl.querySelector('form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const v = U.formValues(bodyEl.querySelector('form'));
            const payload = { ...v, updated_at: new Date().toISOString() };
            if (id) await A.update('career_books', id, payload);
            else await A.insert('career_books', { ...payload, review: '', started_at: '', finished_at: '', created_at: new Date().toISOString() });
            U.toast('success', '书目已保存');
            close();
            window.app.refresh();
          });
        }
      });
    });
  }

  function openBookReadModal(id) {
    A.list('career_books').then(books => {
      const book = books.find(x => x.id === id);
      if (!book) return;
      U.openModal({
        title: '读完并记录读书感受',
        width: '680px',
        body: `<form class="form" id="book-read-form">
          <div class="field"><label>书目</label><div class="field-readonly">${U.esc(book.title)}${book.author ? ' · ' + U.esc(book.author) : ''}</div></div>
          ${U.formField({ name: 'review', label: '读书感受 / 灵感 / 摘录', type: 'textarea', rows: 8, value: book.review || '', required: true, placeholder: '这本书给了你什么启发？对科研或某条赛道有什么作用？' })}
          <div class="grid-2">
            ${U.formField({ name: 'status', label: '阅读状态', type: 'select', value: '已读完', options: BOOK_STATUS })}
            ${U.formField({ name: 'finished_at', label: '读完日期', type: 'date', value: U.iso(new Date()) })}
          </div>
          <div class="modal-actions"><button type="button" class="btn btn-ghost" data-close>取消</button><button type="submit" class="btn btn-primary">保存读书记录</button></div>
        </form>`,
        onMount: (bodyEl, close) => {
          bodyEl.querySelector('[data-close]').addEventListener('click', close);
          bodyEl.querySelector('form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const v = U.formValues(bodyEl.querySelector('form'));
            await A.update('career_books', id, { ...v, started_at: book.started_at || U.iso(new Date()), updated_at: new Date().toISOString() });
            U.toast('success', '读书记录已存档');
            close();
            window.app.refresh();
          });
        }
      });
    });
  }

  window.viewsCareer = {
    career: { render: renderCareer, mount: mountCareer },
    careerInfo: { render: renderCareerInfo, mount: mountCareerInfo },
    careerLabs: { render: renderCareerLabs, mount: mountCareerLabs },
    careerInspire: { render: renderCareerInspire, mount: mountCareerInspire },
    careerBooks: { render: renderCareerBooks, mount: mountCareerBooks }
  };
})();
