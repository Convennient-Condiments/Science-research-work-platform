(() => {
  const U = window.ui;
  const A = window.api;
  const I = ICONS.icon;
  const FIELD_LABELS = { biology: '生物', medicine: '医学', materials: '材料', cross: 'AI交叉' };

  function articleUrl(x) {
    if (x && typeof x.url === 'string' && /^https?:\/\//i.test(x.url)) return x.url;
    if (x && x.doi) return `https://doi.org/${x.doi}`;
    return `https://scholar.google.com/scholar?q=${encodeURIComponent((x && x.title) || '')}`;
  }

  function reviewPreview(content, keys) {
    const parts = (keys || []).map(k => content[k]).filter(v => v && String(v).trim());
    if (!parts.length) return '';
    const text = parts.join('　');
    return text.length > 180 ? text.slice(0, 180) + '…' : text;
  }

  function statusBadge(status) {
    const map = { unread: ['warning', '未读'], read: ['success', '已读'], todo: ['gray', '待办'], doing: ['primary', '进行中'], done: ['success', '已完成'], draft: ['gray', '草稿'], done2: ['success', '已定稿'] };
    const m = map[status];
    return U.badge(m ? m[1] : status, m ? m[0] : 'gray');
  }

  function bindReviewFiles(container, files) {
    const render = () => {
      container.innerHTML = `
        <div class="review-files-head"><b>重要文件</b><span>外部导入 · 本地存档</span></div>
        <div class="review-files-list">
          ${files.length ? files.map((f, i) => `
            <div class="review-file">
              <span title="${U.esc(f.path)}">${U.esc(f.name)}</span>
              <div class="review-file-actions">
                <button type="button" class="btn btn-ghost btn-xs rf-open" data-path="${U.esc(f.path)}">${I('link', 12)} 打开</button>
                <button type="button" class="btn btn-ghost btn-xs rf-del" data-idx="${i}">${I('trash', 12)} 删除</button>
              </div>
            </div>`).join('') : '<div class="col-empty">暂无导入文件</div>'}
        </div>
        <button type="button" class="btn btn-outline btn-sm rf-import">${I('upload', 13)} 导入重要文件</button>`;
      container.querySelector('.rf-import').addEventListener('click', async () => {
        const r = await A.pickFile('review');
        if (r && !r.canceled) {
          const name = r.original ? r.original.split(/[\\/]/).pop() : r.path.split(/[\\/]/).pop();
          files.push({ name, path: r.path, addedAt: new Date().toISOString() });
          render();
        }
      });
      container.querySelectorAll('.rf-open').forEach(btn => btn.addEventListener('click', () => A.openPath(btn.dataset.path)));
      container.querySelectorAll('.rf-del').forEach(btn => btn.addEventListener('click', () => {
        files.splice(Number(btn.dataset.idx), 1);
        render();
      }));
    };
    render();
  }

  async function renderLiterature() {
    const [literature, notes] = await Promise.all([A.list('literature', 'added_at DESC, id DESC'), A.list('literature_notes', 'id DESC')]);
    const readCount = literature.filter(l => l.status === 'read').length;
    const zoteroCount = literature.filter(l => l.source === 'zotero').length;
    const localCount = literature.filter(l => l.source === 'local').length;
    const rows = literature.map(l => ({
      ...l,
      tagsHtml: (l.tags || '').split(',').filter(Boolean).map(t => U.badge(t, 'blue')).join(' '),
      statusHtml: statusBadge(l.status),
      sourceHtml: U.badge({ zotero: 'Zotero', local: '本地', innovation: '创新精选' }[l.source] || l.source, l.source === 'zotero' ? 'orange' : l.source === 'innovation' ? 'purple' : 'gray'),
      meta: `${l.journal || '未知期刊'} · ${l.year || ''}`,
      op: `<div class="row-actions">
        <button class="btn btn-ghost btn-xs lit-note" data-id="${l.id}">${I('edit', 12)} 笔记</button>
        <button class="btn btn-outline btn-xs lit-open" data-id="${l.id}">${I('link', 12)} 打开原文</button>
        ${l.pdf_path ? `<button class="btn btn-ghost btn-xs lit-pdf" data-id="${l.id}">${I('download', 12)} PDF</button>` : ''}
        <button class="btn btn-ghost btn-xs lit-zotero" data-id="${l.id}">${I('sync', 12)} 同步 Zotero</button>
        ${l.status === 'unread' ? `<button class="btn btn-primary btn-xs lit-read" data-id="${l.id}">${I('eye', 12)} 标记已读</button>` : ''}
        <button class="btn btn-ghost btn-xs lit-fav" data-id="${l.id}" data-fav="${l.favorite}">${I('bookmark', 12)}</button>
        <button class="btn btn-ghost btn-xs lit-edit" data-id="${l.id}">${I('edit', 12)}</button>
        <button class="btn btn-ghost btn-xs lit-del" data-id="${l.id}">${I('trash', 12)}</button>
      </div>`
    }));
    return `
      <div class="page-head"><div><h1>文献管理专区</h1><p>个人文献库 · 精读笔记 · 文献分析</p></div>
      <div class="page-actions">
        <button class="btn btn-ghost btn-sm" id="lit-import-note">${I('file-text', 14)} 快速记笔记</button>
        <button class="btn btn-primary btn-sm" id="lit-add">${I('plus', 14)} 添加文献</button>
      </div></div>
      <div class="stat-grid stat-grid-4">
        ${U.statCard({ iconName: 'library', label: '文献总数', value: literature.length, sub: '本地优先存储', accent: 'blue' })}
        ${U.statCard({ iconName: 'book', label: '已精读', value: readCount, sub: '含精读笔记', accent: 'green' })}
        ${U.statCard({ iconName: 'sync', label: 'Zotero 来源', value: zoteroCount, sub: '可反向同步笔记', accent: 'orange' })}
        ${U.statCard({ iconName: 'spark', label: '本地 / 创新', value: `${localCount} / ${literature.filter(l => l.source === 'innovation').length}`, sub: '文献分析口径', accent: 'purple' })}
      </div>
      <div class="grid-2">
        <div class="panel">
          <div class="panel-head"><h3>文献库</h3><div class="panel-actions"><input class="input input-sm" id="lit-search" placeholder="搜索标题 / 作者 / 标签"></div></div>
          <div class="panel-body" id="lit-table">${U.table(
            [{ label: '标题', key: 'title', className: 'td-title' }, { label: '期刊/年份', key: 'meta' }, { label: '标签', key: 'tagsHtml' }, { label: '来源', key: 'sourceHtml' }, { label: '状态', key: 'statusHtml' }, { label: '操作', key: 'op' }],
            rows, '文献库为空'
          )}</div>
        </div>
        <div class="panel">
          <div class="panel-head"><h3>精读笔记与文献分析</h3><button class="btn btn-ghost btn-sm" id="note-add">${I('plus', 13)} 笔记</button></div>
          <div class="panel-body note-list">
            ${notes.slice(0, 20).map(n => `
              <div class="note-item">
                <div class="note-head"><b>${U.esc(n.title || '精读笔记')}</b><span>${U.fmtDate(n.created_at)}</span></div>
                <div class="note-content">${U.esc(n.content)}</div>
                <div class="note-actions"><button class="icon-btn note-edit" data-id="${n.id}">${I('edit', 13)}</button><button class="icon-btn note-del" data-id="${n.id}">${I('trash', 13)}</button></div>
              </div>`).join('') || U.emptyState('暂无精读笔记', 'book')}
          </div>
          <div class="tag-cloud">
            ${[...new Set(literature.flatMap(l => (l.tags || '').split(',').filter(Boolean)))].slice(0, 12).map(t => U.badge(t, 'purple')).join(' ')}
          </div>
        </div>
      </div>`;
  }

  function mountLiterature() {
    document.getElementById('lit-add').addEventListener('click', () => openLiteratureModal());
    document.getElementById('lit-import-note').addEventListener('click', () => openLiteratureNoteModal(null));
    const noteAdd = document.getElementById('note-add');
    if (noteAdd) noteAdd.addEventListener('click', () => openLiteratureNoteModal(null));
    document.querySelectorAll('.lit-note').forEach(btn => btn.addEventListener('click', () => openLiteratureNoteModal(null, Number(btn.dataset.id))));
    document.querySelectorAll('.lit-read').forEach(btn => btn.addEventListener('click', async () => {
      await A.update('literature', btn.dataset.id, { status: 'read', updated_at: new Date().toISOString() });
      U.toast('success', '已标记为已读');
      window.app.refresh();
    }));
    document.querySelectorAll('.lit-fav').forEach(btn => btn.addEventListener('click', async () => {
      await A.update('literature', btn.dataset.id, { favorite: btn.dataset.fav === '1' ? 0 : 1 });
      window.app.refresh();
    }));
    document.querySelectorAll('.lit-edit').forEach(btn => btn.addEventListener('click', () => openLiteratureModal(Number(btn.dataset.id))));
    document.querySelectorAll('.lit-del').forEach(btn => btn.addEventListener('click', () => {
      U.confirmDialog({ title: '删除文献', message: '确认删除该文献及关联记录？', danger: true, onConfirm: async () => {
        await A.remove('literature', btn.dataset.id);
        U.toast('success', '已删除');
        window.app.refresh();
      } });
    }));
    document.querySelectorAll('.lit-open').forEach(btn => btn.addEventListener('click', async () => {
      const lits = await A.list('literature');
      const l = lits.find(x => x.id === Number(btn.dataset.id));
      if (!l) return;
      await A.openExternal(articleUrl(l));
    }));
    document.querySelectorAll('.lit-pdf').forEach(btn => btn.addEventListener('click', async () => {
      const lits = await A.list('literature');
      const l = lits.find(x => x.id === Number(btn.dataset.id));
      if (l && l.pdf_path) await A.openPath(l.pdf_path);
    }));
    document.querySelectorAll('.lit-zotero').forEach(btn => btn.addEventListener('click', async () => {
      const lits = await A.list('literature');
      const l = lits.find(x => x.id === Number(btn.dataset.id));
      if (!l) return;
      U.toast('info', '正在同步到 Zotero…');
      const r = await A.zoteroPush({ title: l.title, journal: l.journal, doi: l.doi, url: l.url, tags: l.tags, highlight: '', field: '', innovation_type: '', pdf_path: l.pdf_path });
      U.toast(r.ok ? 'success' : 'error', r.message);
    }));
    document.querySelectorAll('.note-edit').forEach(btn => btn.addEventListener('click', () => openLiteratureNoteModal(Number(btn.dataset.id))));
    document.querySelectorAll('.note-del').forEach(btn => btn.addEventListener('click', () => {
      U.confirmDialog({ title: '删除笔记', message: '确认删除这条精读笔记？', danger: true, onConfirm: async () => {
        await A.remove('literature_notes', btn.dataset.id);
        window.app.refresh();
      } });
    }));
    const search = document.getElementById('lit-search');
    if (search) search.addEventListener('input', () => {
      const q = search.value.trim().toLowerCase();
      document.querySelectorAll('#lit-table .data-table tbody tr').forEach(tr => {
        tr.style.display = tr.textContent.toLowerCase().includes(q) ? '' : 'none';
      });
    });
  }

  function openLiteratureModal(id) {
    const load = id ? A.list('literature').then(rows => rows.find(r => r.id === id)) : Promise.resolve(null);
    load.then(l => {
      U.openModal({
        title: id ? '编辑文献' : '添加文献',
        width: '700px',
        body: `<form class="form" id="lit-form">
          ${U.formField({ name: 'title', label: '文献标题', value: l?.title || '', required: true })}
          <div class="grid-2">
            ${U.formField({ name: 'authors', label: '作者', value: l?.authors || '' })}
            ${U.formField({ name: 'year', label: '年份', value: l?.year || new Date().getFullYear() })}
          </div>
          <div class="grid-2">
            ${U.formField({ name: 'journal', label: '期刊', value: l?.journal || '' })}
            ${U.formField({ name: 'doi', label: 'DOI', value: l?.doi || '' })}
          </div>
          ${U.formField({ name: 'tags', label: '标签（逗号分隔）', value: l?.tags || '' })}
          ${U.formField({ name: 'url', label: '原文链接', value: l?.url || '' })}
          <div class="field"><label>PDF 附件</label><div class="path-input"><input name="pdf_path" id="lit-pdf-path" value="${U.esc(l?.pdf_path || '')}" placeholder="选择本地 PDF 文件"><button type="button" class="btn btn-outline btn-sm" id="lit-pick-pdf">${I('upload', 13)} 选择</button></div></div>
          <div class="grid-2">
            ${U.formField({ name: 'source', label: '来源', type: 'select', value: l?.source || 'local', options: [{ value: 'local', label: '本地' }, { value: 'zotero', label: 'Zotero' }, { value: 'innovation', label: '创新精选' }] })}
            ${U.formField({ name: 'status', label: '阅读状态', type: 'select', value: l?.status || 'unread', options: [{ value: 'unread', label: '未读' }, { value: 'read', label: '已读' }] })}
          </div>
          <div class="modal-actions"><button type="button" class="btn btn-ghost" data-close>取消</button><button type="submit" class="btn btn-primary">保存</button></div>
        </form>`,
        onMount: (bodyEl, close) => {
          bodyEl.querySelector('[data-close]').addEventListener('click', close);
          const pick = bodyEl.querySelector('#lit-pick-pdf');
          if (pick) pick.addEventListener('click', async () => {
            const r = await A.pickFile('pdf');
            if (r && !r.canceled) bodyEl.querySelector('#lit-pdf-path').value = r.path;
          });
          bodyEl.querySelector('form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const values = U.formValues(bodyEl.querySelector('form'));
            if (id) await A.update('literature', id, values);
            else await A.insert('literature', { ...values, favorite: 0, added_at: U.iso(new Date()) });
            U.toast('success', '文献已保存');
            close();
            window.app.refresh();
          });
        }
      });
    });
  }

  function openLiteratureNoteModal(noteId, literatureId) {
    Promise.all([A.list('literature_notes'), A.list('literature', 'title ASC')]).then(([notes, lit]) => {
      const n = noteId ? notes.find(x => x.id === noteId) : null;
      const opts = lit.map(l => ({ value: l.id, label: l.title }));
      U.openModal({
        title: noteId ? '编辑精读笔记' : '精读笔记',
        width: '680px',
        body: `<form class="form" id="note-form">
          ${U.formField({ name: 'literature_id', label: '关联文献', type: 'select', value: n?.literature_id ?? literatureId ?? '', options: [{ value: '', label: '暂不关联' }, ...opts] })}
          ${U.formField({ name: 'title', label: '笔记标题', value: n?.title || '', placeholder: '如：方法创新点拆解' })}
          ${U.formField({ name: 'content', label: '笔记内容', type: 'textarea', rows: 6, value: n?.content || '', required: true, placeholder: '核心结论、可借鉴方法、待验证假设…' })}
          ${U.formField({ name: 'tags', label: '标签（逗号分隔）', value: n?.tags || '' })}
          <div class="modal-actions"><button type="button" class="btn btn-ghost" data-close>取消</button><button type="submit" class="btn btn-primary">保存</button></div>
        </form>`,
        onMount: (bodyEl, close) => {
          bodyEl.querySelector('[data-close]').addEventListener('click', close);
          bodyEl.querySelector('form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const values = U.formValues(bodyEl.querySelector('form'));
            values.literature_id = values.literature_id === '' ? null : Number(values.literature_id);
            if (noteId) await A.update('literature_notes', noteId, { ...values, updated_at: new Date().toISOString() });
            else await A.insert('literature_notes', { ...values, source: 'local', synced_zotero: 0 });
            U.toast('success', '精读笔记已保存，可反向同步至 Zotero');
            close();
            window.app.refresh();
          });
        }
      });
    });
  }

  async function renderInnovation() {
    const items = await A.list('innovation_literature', 'added_at DESC, id DESC');
    const unread = items.filter(x => x.status === 'unread').length;
    const fav = items.filter(x => x.favorite).length;
    const today = U.iso(new Date());
    const todayCount = items.filter(x => x.added_at === today).length;
    const cards = items.map(x => `
      <div class="innovation-card ${x.status === 'unread' ? 'is-unread' : ''} ${x.favorite ? 'is-fav' : ''}" data-id="${x.id}">
        <div class="innovation-top">
          ${x.field ? U.badge(FIELD_LABELS[x.field] || x.field, x.field === 'medicine' ? 'red' : x.field === 'biology' ? 'green' : x.field === 'materials' ? 'orange' : 'purple') : ''}
          <span class="badge ${x.innovation_type === '机理创新' ? 'badge-purple' : x.innovation_type === '全新体系构建' ? 'badge-teal' : 'badge-blue'}">${U.esc(x.innovation_type)}</span>
          ${x.favorite ? U.badge('收藏', 'yellow') : ''}
          ${x.status === 'unread' ? U.badge('未读', 'orange') : ''}
        </div>
        <h4>${U.esc(x.title)}</h4>
        <div class="innovation-meta">${U.esc(x.journal)}${x.doi ? ' · ' + U.esc(x.doi) : ''}</div>
        <div class="innovation-highlight">${U.esc(x.highlight)}</div>
        ${x.note_content ? `<div class="innovation-note">${I('edit', 13)} ${U.esc(x.note_content)}</div>` : ''}
        <div class="innovation-actions">
          <button class="btn btn-outline btn-xs ino-open" data-id="${x.id}">${I('link', 12)} 打开原文</button>
          <button class="btn btn-ghost btn-xs ino-zotero" data-id="${x.id}">${I('sync', 12)} 同步 Zotero</button>
          ${x.pdf_path ? `<button class="btn btn-ghost btn-xs ino-pdf" data-id="${x.id}">${I('download', 12)} 打开 PDF</button>` : ''}
          ${x.status === 'unread' ? `<button class="btn btn-primary btn-xs ino-read" data-id="${x.id}">${I('eye', 12)} 标记已读</button>` : `<button class="btn btn-ghost btn-xs ino-unread" data-id="${x.id}">标为未读</button>`}
          <button class="btn btn-ghost btn-xs ino-note" data-id="${x.id}">${I('edit', 12)} 创新点笔记</button>
          <button class="btn btn-ghost btn-xs ino-addlib" data-id="${x.id}">${I('library', 12)} 加入文献库</button>
          <button class="btn btn-ghost btn-xs ino-to-week" data-id="${x.id}">${I('file-text', 12)} 导入周复盘</button>
          <button class="btn btn-ghost btn-xs ino-fav" data-id="${x.id}" data-fav="${x.favorite}">${I('bookmark', 12)}</button>
        </div>
      </div>`).join('') || U.emptyState('暂无创新精选文献，点击右上角刷新', 'spark');
    return `
      <div class="page-head"><div><h1>前沿创新文献精选专区</h1><p>${unread} 篇未读 · ${fav} 篇收藏 · 今日精选 ${todayCount} 篇 · 每日少而精推送</p></div>
      <div class="page-actions">
        <button class="btn btn-ghost btn-sm" id="ino-config">${I('settings', 14)} 关键词配置</button>
        <button class="btn btn-primary btn-sm" id="ino-refresh">${I('sync', 14)} 刷新今日精选</button>
      </div></div>
      <div class="innovation-grid">${cards}</div>`;
  }

  function mountInnovation() {
    document.getElementById('ino-refresh').addEventListener('click', async () => {
      U.toast('info', '正在刷新创新精选文献…');
      const r = await A.innovationRefresh();
      U.toast(r.ok ? 'success' : 'error', r.message);
      window.app.refresh();
    });
    document.getElementById('ino-config').addEventListener('click', openInnovationConfig);
    document.querySelectorAll('.ino-read').forEach(btn => btn.addEventListener('click', async () => {
      await A.update('innovation_literature', btn.dataset.id, { status: 'read' });
      window.app.refresh();
    }));
    document.querySelectorAll('.ino-unread').forEach(btn => btn.addEventListener('click', async () => {
      await A.update('innovation_literature', btn.dataset.id, { status: 'unread' });
      window.app.refresh();
    }));
    document.querySelectorAll('.ino-fav').forEach(btn => btn.addEventListener('click', async () => {
      await A.update('innovation_literature', btn.dataset.id, { favorite: btn.dataset.fav === '1' ? 0 : 1 });
      window.app.refresh();
    }));
    document.querySelectorAll('.ino-note').forEach(btn => btn.addEventListener('click', () => openInnovationNote(Number(btn.dataset.id))));
    document.querySelectorAll('.ino-addlib').forEach(btn => btn.addEventListener('click', addInnovationToLibrary));
    document.querySelectorAll('.ino-to-week').forEach(btn => btn.addEventListener('click', innovationNoteToWeekly));
    document.querySelectorAll('.ino-open').forEach(btn => btn.addEventListener('click', () => openInnovationLink(Number(btn.dataset.id))));
    document.querySelectorAll('.ino-zotero').forEach(btn => btn.addEventListener('click', () => syncInnovationToZotero(Number(btn.dataset.id))));
    document.querySelectorAll('.ino-pdf').forEach(btn => btn.addEventListener('click', () => openInnovationPdf(Number(btn.dataset.id))));
  }

  async function openInnovationLink(id) {
    const items = await A.list('innovation_literature');
    const x = items.find(i => i.id === id);
    if (!x) return;
    await A.openExternal(articleUrl(x));
  }

  async function openInnovationPdf(id) {
    const items = await A.list('innovation_literature');
    const x = items.find(i => i.id === id);
    if (!x || !x.pdf_path) { U.toast('info', '该文献暂无本地 PDF'); return; }
    await A.openPath(x.pdf_path);
  }

  async function syncInnovationToZotero(id) {
    const items = await A.list('innovation_literature');
    const x = items.find(i => i.id === id);
    if (!x) return;
    U.toast('info', '正在同步到 Zotero…');
    const r = await A.zoteroPush({ title: x.title, journal: x.journal, doi: x.doi, url: x.url, tags: [x.innovation_type, x.field, x.keywords].filter(Boolean).join(','), highlight: x.highlight, field: x.field, innovation_type: x.innovation_type, pdf_path: x.pdf_path });
    U.toast(r.ok ? 'success' : 'error', r.message);
  }

  function openInnovationConfig() {
    Promise.all([A.settingsGet('innovation_keywords'), A.settingsGet('innovation_journals'), A.settingsGet('innovation_fields'), A.settingsGet('innovation_daily_count'), A.settingsGet('innovation_hour')]).then(([keywords, journals, fields, dailyCount, hour]) => {
      const fieldList = ['biology', 'medicine', 'materials', 'cross'];
      const fieldChecks = fieldList.map(f => U.formField({ name: `field_${f}`, label: FIELD_LABELS[f] || f, type: 'checkbox', value: (fields || []).includes(f) })).join('');
      U.openModal({
        title: '创新文献检索配置',
        body: `<form class="form" id="ino-config-form">
          ${U.formField({ name: 'keywords', label: '研究方向关键词（每行一个）', type: 'textarea', rows: 4, value: (keywords || []).join('\n') })}
          ${U.formField({ name: 'journals', label: '目标期刊（每行一个）', type: 'textarea', rows: 3, value: (journals || []).join('\n') })}
          <div class="field"><label>覆盖领域（少而精，按需勾选）</label><div class="field-check-grid">${fieldChecks}</div></div>
          <div class="grid-2">
            ${U.formField({ name: 'daily_count', label: '每日精选上限', type: 'number', value: dailyCount || 5, min: 1, max: 12, help: '默认每天精筛 5 篇以内' })}
            ${U.formField({ name: 'push_hour', label: '每日推送时间（0-23 点）', type: 'number', value: hour ?? 8, min: 0, max: 23 })}
          </div>
          <div class="modal-actions"><button type="button" class="btn btn-ghost" data-close>取消</button><button type="submit" class="btn btn-primary">保存</button></div>
        </form>`,
        onMount: (bodyEl, close) => {
          bodyEl.querySelector('[data-close]').addEventListener('click', close);
          bodyEl.querySelector('form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const v = U.formValues(bodyEl.querySelector('form'));
            await A.settingsSet('innovation_keywords', v.keywords.split('\n').map(s => s.trim()).filter(Boolean));
            await A.settingsSet('innovation_journals', v.journals.split('\n').map(s => s.trim()).filter(Boolean));
            await A.settingsSet('innovation_fields', fieldList.filter(f => v[`field_${f}`]));
            await A.settingsSet('innovation_daily_count', Math.max(1, Math.min(12, Number(v.daily_count) || 5)));
            await A.settingsSet('innovation_hour', Math.max(0, Math.min(23, Number(v.push_hour) || 8)));
            U.toast('success', '检索配置已保存');
            close();
          });
        }
      });
    });
  }

  function openInnovationNote(id) {
    A.list('innovation_literature').then(items => {
      const x = items.find(i => i.id === id);
      if (!x) return;
      U.openModal({
        title: '创新点阅读笔记',
        width: '620px',
        body: `<form class="form" id="ino-note-form">
          <div class="field"><label>文献</label><div class="field-readonly">${U.esc(x.title)}</div></div>
          ${U.formField({ name: 'note_content', label: '创新点拆解笔记', type: 'textarea', rows: 6, value: x.note_content || '', required: true, placeholder: '创新在哪里？为什么重要？可以如何借鉴？' })}
          <div class="modal-actions"><button type="button" class="btn btn-ghost" data-close>取消</button><button type="submit" class="btn btn-primary">保存</button></div>
        </form>`,
        onMount: (bodyEl, close) => {
          bodyEl.querySelector('[data-close]').addEventListener('click', close);
          bodyEl.querySelector('form').addEventListener('submit', async (e) => {
            e.preventDefault();
            await A.update('innovation_literature', id, U.formValues(bodyEl.querySelector('form')));
            U.toast('success', '创新点笔记已保存');
            close();
            window.app.refresh();
          });
        }
      });
    });
  }

  async function addInnovationToLibrary(ev) {
    const id = ev.currentTarget.dataset.id;
    const items = await A.list('innovation_literature');
    const x = items.find(i => i.id === Number(id));
    if (!x) return;
    const exists = await A.list('literature');
    if (exists.some(l => l.doi && l.doi === x.doi) || exists.some(l => l.title === x.title)) {
      U.toast('info', '该文献已在文献库中');
      return;
    }
    const row = await A.insert('literature', {
      title: x.title, authors: '', year: String(new Date().getFullYear()), journal: x.journal, doi: x.doi,
      tags: [x.innovation_type, x.field].filter(Boolean).join(','), pdf_path: x.pdf_path || '', url: x.url || '', source: 'innovation',
      status: x.note_content ? 'read' : 'unread', favorite: x.favorite, added_at: U.iso(new Date())
    });
    if (x.note_content) {
      await A.insert('literature_notes', { literature_id: row.id, title: '创新点拆解', content: x.note_content, tags: x.innovation_type, source: 'innovation', synced_zotero: 0 });
    }
    U.toast('success', '已加入本地文献库');
  }

  async function innovationNoteToWeekly(ev) {
    const id = ev.currentTarget.dataset.id;
    const items = await A.list('innovation_literature');
    const x = items.find(i => i.id === Number(id));
    if (!x || !x.note_content) { U.toast('info', '请先填写创新点笔记'); return; }
    const reviews = await A.list('weekly_reviews', 'week_start DESC');
    const draft = reviews.find(r => r.status === 'draft') || reviews[0];
    if (!draft) { U.toast('info', '暂无周复盘记录'); return; }
    let content = {};
    try { content = JSON.parse(draft.content || '{}'); } catch { content = {}; }
    const line = `${x.title}：${x.note_content}`;
    content.literatureHarvest = [content.literatureHarvest, line].filter(Boolean).join('\n');
    content.harvest = [content.harvest, `创新文献：${line}`].filter(Boolean).join('\n');
    await A.update('weekly_reviews', draft.id, { content: JSON.stringify(content) });
    U.toast('success', '创新点笔记已导入周复盘文献学习收获');
  }

  async function renderZotero() {
    const [zotero, overleaf, logs, downloadPdfs] = await Promise.all([
      A.settingsGet('zotero'), A.settingsGet('overleaf'), A.list('sync_logs', 'id DESC'), A.settingsGet('zotero_download_pdfs')
    ]);
    const z = zotero || {};
    const o = overleaf || {};
    return `
      <div class="page-head"><div><h1>Zotero / Overleaf 双向同步</h1><p>第三方数据仅临时缓存，不覆盖本地自建数据</p></div></div>
      <div class="grid-2">
        <div class="panel">
          <div class="panel-head"><h3>Zotero 双向同步</h3></div>
          <div class="panel-body">
            <form class="form" id="zotero-form">
              ${U.formField({ name: 'enabled', label: '启用 Zotero 同步', type: 'checkbox', value: !!z.enabled })}
              ${U.formField({ name: 'api_key', label: 'API Key', value: z.api_key || '', help: '在 Zotero 官网 Settings → Feeds/API 中生成' })}
              ${U.formField({ name: 'user_id', label: '用户 ID', value: z.user_id || '' })}
              ${U.formField({ name: 'collections', label: '指定文件夹（逗号分隔，留空为全部）', value: (z.collections || []).join(', '), help: '按文件夹名定向同步，避免冗余' })}
              ${U.formField({ name: 'download_pdfs', label: '同步时自动下载 PDF 附件到本地', type: 'checkbox', value: downloadPdfs !== false })}
              <div class="modal-actions">
                <button type="submit" class="btn btn-primary">${I('check', 15)} 保存配置</button>
                <button type="button" class="btn btn-outline" id="zotero-sync-btn">${I('sync', 15)} 立即同步</button>
              </div>
            </form>
            <div class="field-help">双向能力：Zotero 元数据与 PDF 下行到文献库；精读笔记、标签反向回写；文献与创新精选可一键推送至 Zotero。</div>
          </div>
        </div>
        <div class="panel">
          <div class="panel-head"><h3>Overleaf 写作进度同步</h3></div>
          <div class="panel-body">
            <form class="form" id="overleaf-form">
              ${U.formField({ name: 'enabled', label: '启用 Overleaf 同步', type: 'checkbox', value: !!o.enabled })}
              ${U.formField({ name: 'project_name', label: '绑定项目名称', value: o.project_name || '' })}
              ${U.formField({ name: 'token', label: 'API Token（可选）', value: o.token || '' })}
              ${U.formField({ name: 'api_url', label: '数据接口地址（可选）', value: o.api_url || '', help: '无官方公开 API 时留空，将使用演示同步并归类为「论文撰写」工时' })}
              <div class="modal-actions">
                <button type="submit" class="btn btn-primary">${I('check', 15)} 保存配置</button>
                <button type="button" class="btn btn-outline" id="overleaf-sync-btn">${I('sync', 15)} 立即同步</button>
                <button type="button" class="btn btn-ghost" id="overleaf-import-btn">${I('upload', 15)} 导入 JSON</button>
              </div>
            </form>
            <div class="field-help">写作时长自动归入「论文撰写」有效科研工时；版本节点可一键标记为课题进展。</div>
          </div>
        </div>
      </div>
      ${U.panel('同步日志', logs.length ? U.table(
        [{ label: '时间', key: 'time' }, { label: '服务', key: 'provider' }, { label: '方向', key: 'direction' }, { label: '状态', key: 'statusHtml' }, { label: '消息', key: 'message' }],
        logs.slice(0, 30).map(l => ({ ...l, time: U.fmtDateTime(l.created_at), statusHtml: U.badge(l.status === 'ok' ? '成功' : l.status === 'warn' ? '警告' : '失败', l.status === 'ok' ? 'green' : l.status === 'warn' ? 'orange' : 'red') })),
        '暂无同步日志'
      ) : U.emptyState('暂无同步日志', 'sync'))}
    `;
  }

  function mountZotero() {
    document.getElementById('zotero-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const v = U.formValues(e.target);
      await A.settingsSet('zotero', { enabled: !!v.enabled, api_key: v.api_key, user_id: v.user_id, collections: String(v.collections || '').split(/[,，]/).map(s => s.trim()).filter(Boolean) });
      await A.settingsSet('zotero_download_pdfs', !!v.download_pdfs);
      U.toast('success', 'Zotero 配置已保存');
    });
    document.getElementById('zotero-sync-btn').addEventListener('click', async () => {
      U.toast('info', '正在同步 Zotero…');
      const r = await A.zoteroSync();
      U.toast(r.ok ? 'success' : 'error', r.message);
      window.app.refresh();
    });
    document.getElementById('overleaf-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const v = U.formValues(e.target);
      await A.settingsSet('overleaf', { enabled: !!v.enabled, project_name: v.project_name, token: v.token, api_url: v.api_url, last_sync_at: null });
      U.toast('success', 'Overleaf 配置已保存');
    });
    document.getElementById('overleaf-sync-btn').addEventListener('click', async () => {
      U.toast('info', '正在同步 Overleaf…');
      const r = await A.overleafSync();
      U.toast(r.ok ? 'success' : 'error', r.message);
      window.app.refresh();
    });
    document.getElementById('overleaf-import-btn').addEventListener('click', async () => {
      const r = await A.overleafImport();
      if (r && !r.canceled) { U.toast('success', r.message); window.app.refresh(); }
    });
  }

  async function renderWeekly() {
    const reviews = await A.list('weekly_reviews', 'week_start DESC');
    const rows = reviews.map(r => {
      let c = {};
      try { c = JSON.parse(r.content || '{}'); } catch { c = {}; }
      return { ...r, range: U.weekLabel(r.week_start), summary: reviewPreview(c, ['keyPoints', 'done', 'harvest', 'questions', 'nextPlan', 'literatureHarvest', 'notDone']), statusHtml: r.status === 'done' ? U.badge('已定稿', 'green') : U.badge('草稿', 'gray'), op: `
        <button class="btn btn-ghost btn-xs w-edit" data-id="${r.id}">${I('edit', 12)} 编辑</button>
        <button class="btn btn-ghost btn-xs w-docx" data-id="${r.id}">${I('file-text', 12)} Word</button>
        <button class="btn btn-ghost btn-xs w-pdf" data-id="${r.id}">${I('download', 12)} PDF</button>
        <button class="btn btn-ghost btn-xs w-del" data-id="${r.id}">${I('trash', 12)}</button>` };
    });
    return `
      <div class="page-head"><div><h1>每周总结复盘</h1><p>自动预填充工时、任务、投稿、文献与进展速记</p></div>
      <div class="page-actions">
        <input class="input input-sm" id="weekly-search" placeholder="按年份 / 关键词检索">
        <button class="btn btn-primary btn-sm" id="weekly-add">${I('plus', 14)} 新建周复盘</button>
      </div></div>
      ${U.panel('历史归档', U.table(
        [{ label: '周次范围', key: 'range' }, { label: '标题', key: 'title' }, { label: '核心点', key: 'summary', className: 'td-key' }, { label: '状态', key: 'statusHtml' }, { label: '操作', key: 'op' }],
        rows, '暂无周复盘'
      ))}
    `;
  }

  function mountWeekly() {
    document.getElementById('weekly-add').addEventListener('click', () => openWeeklyModal());
    document.querySelectorAll('.w-edit').forEach(btn => btn.addEventListener('click', () => openWeeklyModal(Number(btn.dataset.id))));
    document.querySelectorAll('.w-docx').forEach(btn => btn.addEventListener('click', async () => {
      const r = await A.reviewExportDocx('weekly', btn.dataset.id);
      if (r && !r.canceled) U.toast('success', `Word 已导出：${r.filePath}`);
    }));
    document.querySelectorAll('.w-pdf').forEach(btn => btn.addEventListener('click', async () => {
      const r = await A.reviewExportPdf('weekly', btn.dataset.id);
      if (r && !r.canceled) U.toast('success', `PDF 已导出：${r.filePath}`);
    }));
    document.querySelectorAll('.w-del').forEach(btn => btn.addEventListener('click', () => {
      U.confirmDialog({ title: '删除周复盘', message: '确认删除该周复盘记录？', danger: true, onConfirm: async () => {
        await A.remove('weekly_reviews', btn.dataset.id);
        window.app.refresh();
      } });
    }));
    const search = document.getElementById('weekly-search');
    if (search) search.addEventListener('input', () => {
      const q = search.value.trim().toLowerCase();
      document.querySelectorAll('.data-table tbody tr').forEach(tr => tr.style.display = tr.textContent.toLowerCase().includes(q) ? '' : 'none');
    });
  }

  function openWeeklyModal(id) {
    const monday = U.startOfWeek(new Date());
    const load = id ? A.list('weekly_reviews').then(rows => rows.find(r => r.id === id)) : Promise.resolve(null);
    load.then(r => {
      let content = {};
      try { content = JSON.parse(r?.content || '{}'); } catch { content = {}; }
      const files = Array.isArray(content.files) ? content.files : [];
      U.openModal({
        title: id ? '编辑周复盘' : '新建周复盘',
        width: '900px',
        body: `<form class="form" id="weekly-form">
          <div class="grid-3">
            ${U.formField({ name: 'week_start', label: '周开始日期', type: 'date', value: (r?.week_start || U.iso(monday)).slice(0, 10), required: true })}
            ${U.formField({ name: 'title', label: '标题', value: r?.title || '', required: true })}
            ${U.formField({ name: 'status', label: '状态', type: 'select', value: r?.status || 'draft', options: [{ value: 'draft', label: '草稿' }, { value: 'done', label: '已定稿' }] })}
          </div>
          ${U.formField({ name: 'keyPoints', label: '本期重点（可编辑）', type: 'textarea', rows: 3, value: content.keyPoints || '', placeholder: '本周最重要的一句话总结、关键结论、待办重点' })}
          ${U.formField({ name: 'done', label: '① 本周已完成工作', type: 'textarea', rows: 5, value: content.done || '' })}
          ${U.formField({ name: 'notDone', label: '② 未完成计划项与延期原因', type: 'textarea', rows: 3, value: content.notDone || '' })}
          ${U.formField({ name: 'harvest', label: '③ 本周核心收获与文献吸收要点', type: 'textarea', rows: 5, value: content.harvest || '' })}
          ${U.formField({ name: 'questions', label: '④ 当前卡点与待请教导师问题', type: 'textarea', rows: 3, value: content.questions || '' })}
          ${U.formField({ name: 'nextPlan', label: '⑤ 下周工作计划', type: 'textarea', rows: 4, value: content.nextPlan || '' })}
          ${U.formField({ name: 'literatureHarvest', label: '⑥ 文献学习收获', type: 'textarea', rows: 3, value: content.literatureHarvest || '' })}
          <div class="review-files" id="weekly-files"></div>
          <div class="modal-actions">
            <button type="button" class="btn btn-outline" id="weekly-autofill">${I('spark', 14)} 自动预填充</button>
            <button type="button" class="btn btn-ghost" data-close>取消</button>
            <button type="submit" class="btn btn-primary">保存</button>
          </div>
        </form>`,
        onMount: (bodyEl, close) => {
          bodyEl.querySelector('[data-close]').addEventListener('click', close);
          const form = bodyEl.querySelector('form');
          bindReviewFiles(bodyEl.querySelector('#weekly-files'), files);
          bodyEl.querySelector('#weekly-autofill').addEventListener('click', async () => {
            const start = form.querySelector('[name=week_start]').value || U.iso(monday);
            const filled = await A.reviewAutofillWeekly(start);
            for (const [key, val] of Object.entries(filled)) {
              const el = form.querySelector(`[name="${key}"]`);
              if (el) el.value = val;
            }
            U.toast('success', '已抓取本地数据预填充模板');
          });
          form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const v = U.formValues(form);
            const contentPayload = { keyPoints: v.keyPoints, done: v.done, notDone: v.notDone, harvest: v.harvest, questions: v.questions, nextPlan: v.nextPlan, literatureHarvest: v.literatureHarvest, files };
            const payload = { week_start: v.week_start, title: v.title, status: v.status, content: JSON.stringify(contentPayload), updated_at: new Date().toISOString() };
            if (id) await A.update('weekly_reviews', id, payload);
            else await A.insert('weekly_reviews', { ...payload, week_end: U.iso(U.addDays(new Date(v.week_start), 6)) });
            U.toast('success', '周复盘已保存');
            close();
            window.app.refresh();
          });
        }
      });
    });
  }

  async function renderMonthly() {
    const reviews = await A.list('monthly_reviews', 'month DESC');
    const rows = reviews.map(r => {
      let c = {};
      try { c = JSON.parse(r.content || '{}'); } catch { c = {}; }
      return { ...r, monthLabel: U.monthLabel(r.month), summary: reviewPreview(c, ['keyPoints', 'goals', 'milestones', 'stats', 'bottlenecks', 'nextMonth', 'resources']), statusHtml: r.status === 'done' ? U.badge('已定稿', 'green') : U.badge('草稿', 'gray'), op: `
        <button class="btn btn-ghost btn-xs m-edit" data-id="${r.id}">${I('edit', 12)} 编辑</button>
        <button class="btn btn-ghost btn-xs m-docx" data-id="${r.id}">${I('file-text', 12)} Word</button>
        <button class="btn btn-ghost btn-xs m-pdf" data-id="${r.id}">${I('download', 12)} PDF</button>
        <button class="btn btn-ghost btn-xs m-del" data-id="${r.id}">${I('trash', 12)}</button>` };
    });
    return `
      <div class="page-head"><div><h1>月度总结复盘</h1><p>自动聚合当月周复盘、里程碑、量化产出统计</p></div>
      <div class="page-actions">
        <input class="input input-sm" id="monthly-search" placeholder="按年份 / 核心点 / 关键词检索">
        <button class="btn btn-primary btn-sm" id="monthly-add">${I('plus', 14)} 新建月度复盘</button>
      </div></div>
      ${U.panel('月度复盘归档', U.table(
        [{ label: '月份', key: 'monthLabel' }, { label: '标题', key: 'title' }, { label: '核心点', key: 'summary', className: 'td-key' }, { label: '状态', key: 'statusHtml' }, { label: '操作', key: 'op' }],
        rows, '暂无月度复盘'
      ))}
    `;
  }

  function mountMonthly() {
    document.getElementById('monthly-add').addEventListener('click', () => openMonthlyModal());
    const msearch = document.getElementById('monthly-search');
    if (msearch) msearch.addEventListener('input', () => {
      const q = msearch.value.trim().toLowerCase();
      document.querySelectorAll('.data-table tbody tr').forEach(tr => tr.style.display = tr.textContent.toLowerCase().includes(q) ? '' : 'none');
    });
    document.querySelectorAll('.m-edit').forEach(btn => btn.addEventListener('click', () => openMonthlyModal(Number(btn.dataset.id))));
    document.querySelectorAll('.m-docx').forEach(btn => btn.addEventListener('click', async () => {
      const r = await A.reviewExportDocx('monthly', btn.dataset.id);
      if (r && !r.canceled) U.toast('success', `Word 已导出：${r.filePath}`);
    }));
    document.querySelectorAll('.m-pdf').forEach(btn => btn.addEventListener('click', async () => {
      const r = await A.reviewExportPdf('monthly', btn.dataset.id);
      if (r && !r.canceled) U.toast('success', `PDF 已导出：${r.filePath}`);
    }));
    document.querySelectorAll('.m-del').forEach(btn => btn.addEventListener('click', () => {
      U.confirmDialog({ title: '删除月度复盘', message: '确认删除该月度复盘？', danger: true, onConfirm: async () => {
        await A.remove('monthly_reviews', btn.dataset.id);
        window.app.refresh();
      } });
    }));
  }

  function openMonthlyModal(id) {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const load = id ? A.list('monthly_reviews').then(rows => rows.find(r => r.id === id)) : Promise.resolve(null);
    load.then(r => {
      let content = {};
      try { content = JSON.parse(r?.content || '{}'); } catch { content = {}; }
      const files = Array.isArray(content.files) ? content.files : [];
      U.openModal({
        title: id ? '编辑月度复盘' : '新建月度复盘',
        width: '920px',
        body: `<form class="form" id="monthly-form">
          <div class="grid-3">
            ${U.formField({ name: 'month', label: '月份', type: 'month', value: r?.month || currentMonth, required: true })}
            ${U.formField({ name: 'title', label: '标题', value: r?.title || '', required: true })}
            ${U.formField({ name: 'status', label: '状态', type: 'select', value: r?.status || 'draft', options: [{ value: 'draft', label: '草稿' }, { value: 'done', label: '已定稿' }] })}
          </div>
          ${U.formField({ name: 'keyPoints', label: '本期重点（可编辑）', type: 'textarea', rows: 3, value: content.keyPoints || '', placeholder: '本月最重要的一句话总结、关键结论、待办重点' })}
          ${U.formField({ name: 'goals', label: '① 月度目标完成对标情况', type: 'textarea', rows: 5, value: content.goals || '' })}
          ${U.formField({ name: 'milestones', label: '② 本月里程碑关键进展', type: 'textarea', rows: 4, value: content.milestones || '' })}
          ${U.formField({ name: 'stats', label: '③ 量化产出统计', type: 'textarea', rows: 4, value: content.stats || '' })}
          ${U.formField({ name: 'bottlenecks', label: '④ 瓶颈梳理与资源需求', type: 'textarea', rows: 3, value: content.bottlenecks || '' })}
          ${U.formField({ name: 'resources', label: '⑤ 资源诉求登记', type: 'textarea', rows: 2, value: content.resources || '' })}
          ${U.formField({ name: 'nextMonth', label: '⑥ 下月目标与优先级', type: 'textarea', rows: 4, value: content.nextMonth || '' })}
          <div class="review-files" id="monthly-files"></div>
          <div class="modal-actions">
            <button type="button" class="btn btn-outline" id="monthly-autofill">${I('spark', 14)} 一键生成初稿</button>
            <button type="button" class="btn btn-ghost" data-close>取消</button>
            <button type="submit" class="btn btn-primary">保存</button>
          </div>
        </form>`,
        onMount: (bodyEl, close) => {
          bodyEl.querySelector('[data-close]').addEventListener('click', close);
          const form = bodyEl.querySelector('form');
          bindReviewFiles(bodyEl.querySelector('#monthly-files'), files);
          bodyEl.querySelector('#monthly-autofill').addEventListener('click', async () => {
            const month = form.querySelector('[name=month]').value;
            const filled = await A.reviewAutofillMonthly(month);
            for (const [key, val] of Object.entries(filled)) {
              const el = form.querySelector(`[name="${key}"]`);
              if (el) el.value = val;
            }
            U.toast('success', '已聚合当月周复盘与业务数据生成初稿');
          });
          form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const v = U.formValues(form);
            const payload = { month: v.month, title: v.title, status: v.status, content: JSON.stringify({ keyPoints: v.keyPoints, goals: v.goals, milestones: v.milestones, stats: v.stats, bottlenecks: v.bottlenecks, resources: v.resources, nextMonth: v.nextMonth, files }), updated_at: new Date().toISOString() };
            if (id) await A.update('monthly_reviews', id, payload);
            else await A.insert('monthly_reviews', payload);
            U.toast('success', '月度复盘已保存');
            close();
            window.app.refresh();
          });
        }
      });
    });
  }

  async function renderAdvisor() {
    const [comms, questions, drafts] = await Promise.all([
      A.list('advisor_communications', 'date DESC, id DESC'),
      A.list('advisor_questions', 'id DESC'),
      A.list('report_drafts', 'id ASC')
    ]);
    return `
      <div class="page-head"><div><h1>导师向上管理</h1><p>沟通纪要、疑问归集、汇报草稿模板</p></div>
      <div class="page-actions">
        <button class="btn btn-ghost btn-sm" id="adv-import-q">${I('file-text', 14)} 问题导入周复盘</button>
        <button class="btn btn-primary btn-sm" id="adv-comm-add">${I('plus', 14)} 记录沟通</button>
      </div></div>
      <div class="grid-2">
        <div class="panel"><div class="panel-head"><h3>沟通纪要存档</h3><button class="btn btn-ghost btn-sm" id="adv-comm-add2">${I('plus', 13)} 新增</button></div>
          <div class="panel-body note-list">
            ${comms.map(c => `<div class="note-item">
              <div class="note-head"><span class="badge badge-blue">${U.esc(c.type || '沟通')}</span><span>${U.fmtDate(c.date)}</span></div>
              <div class="note-content">${U.esc(c.summary)}</div>
              ${c.action_items ? `<div class="note-stage">行动项：${U.esc(c.action_items)}</div>` : ''}
              <div class="note-actions"><button class="icon-btn comm-del" data-id="${c.id}">${I('trash', 13)}</button></div>
            </div>`).join('') || U.emptyState('暂无沟通记录', 'users')}
          </div>
        </div>
        <div class="panel"><div class="panel-head"><h3>待咨询问题归集</h3><button class="btn btn-ghost btn-sm" id="adv-q-add">${I('plus', 13)} 新增</button></div>
          <div class="panel-body question-list">
            ${questions.map(q => `<div class="question-item">
              <div class="question-top"><b>${U.esc(q.title)}</b>${q.status === '待咨询' ? U.badge('待咨询', 'orange') : U.badge('已咨询', 'green')}</div>
              ${q.detail ? `<div class="question-detail">${U.esc(q.detail)}</div>` : ''}
              <div class="note-actions">
                <button class="btn btn-ghost btn-xs q-done" data-id="${q.id}" data-status="${q.status}">${q.status === '待咨询' ? '标记已咨询' : '恢复待咨询'}</button>
                <button class="btn btn-ghost btn-xs q-del" data-id="${q.id}">${I('trash', 13)}</button>
              </div>
            </div>`).join('') || U.emptyState('暂无待咨询问题', 'search')}
          </div>
        </div>
      </div>
      <div class="panel"><div class="panel-head"><h3>汇报草稿模板</h3><button class="btn btn-primary btn-sm" id="draft-add">${I('plus', 13)} 新建草稿</button></div>
        <div class="panel-body draft-grid">
          ${drafts.map(d => `<div class="draft-card">
            <span class="badge badge-purple">${U.esc(d.type)}</span>
            <b>${U.esc(d.title)}</b>
            <div class="draft-preview">${U.esc((d.content || '').slice(0, 80))}</div>
            <div class="task-card-actions">
              <button class="btn btn-ghost btn-xs draft-edit" data-id="${d.id}">${I('edit', 12)} 编辑</button>
              <button class="btn btn-ghost btn-xs draft-copy" data-id="${d.id}">${I('file-text', 12)} 复制内容</button>
              <button class="btn btn-ghost btn-xs draft-del" data-id="${d.id}">${I('trash', 12)}</button>
            </div>
          </div>`).join('')}
        </div>
      </div>`;
  }

  function mountAdvisor() {
    const addComm = () => {
      U.openModal({
        title: '记录导师沟通',
        body: `<form class="form" id="comm-form">
          <div class="grid-2">
            ${U.formField({ name: 'date', label: '沟通日期', type: 'date', value: U.iso(new Date()), required: true })}
            ${U.formField({ name: 'type', label: '沟通类型', type: 'select', value: '线下沟通', options: ['线下沟通', '线上沟通', '周组会', '邮件沟通'] })}
          </div>
          ${U.formField({ name: 'summary', label: '沟通纪要', type: 'textarea', rows: 4, required: true })}
          ${U.formField({ name: 'action_items', label: '行动项', type: 'textarea', rows: 2 })}
          <div class="modal-actions"><button type="button" class="btn btn-ghost" data-close>取消</button><button type="submit" class="btn btn-primary">保存</button></div>
        </form>`,
        onMount: (bodyEl, close) => {
          bodyEl.querySelector('[data-close]').addEventListener('click', close);
          bodyEl.querySelector('form').addEventListener('submit', async (e) => {
            e.preventDefault();
            await A.insert('advisor_communications', U.formValues(e.target));
            U.toast('success', '沟通记录已存档');
            close();
            window.app.refresh();
          });
        }
      });
    };
    const addQ = () => {
      U.openModal({
        title: '新增待咨询问题',
        body: `<form class="form" id="q-form">
          ${U.formField({ name: 'title', label: '问题标题', required: true })}
          ${U.formField({ name: 'detail', label: '补充说明', type: 'textarea', rows: 3 })}
          <div class="modal-actions"><button type="button" class="btn btn-ghost" data-close>取消</button><button type="submit" class="btn btn-primary">保存</button></div>
        </form>`,
        onMount: (bodyEl, close) => {
          bodyEl.querySelector('[data-close]').addEventListener('click', close);
          bodyEl.querySelector('form').addEventListener('submit', async (e) => {
            e.preventDefault();
            await A.insert('advisor_questions', { ...U.formValues(e.target), status: '待咨询', imported_to_review: 0 });
            U.toast('success', '问题已归集');
            close();
            window.app.refresh();
          });
        }
      });
    };
    document.getElementById('adv-comm-add').addEventListener('click', addComm);
    document.getElementById('adv-comm-add2').addEventListener('click', addComm);
    document.getElementById('adv-q-add').addEventListener('click', addQ);
    document.getElementById('adv-import-q').addEventListener('click', async () => {
      const questions = await A.list('advisor_questions');
      const pending = questions.filter(q => q.status === '待咨询');
      const reviews = await A.list('weekly_reviews', 'week_start DESC');
      const draft = reviews.find(r => r.status === 'draft') || reviews[0];
      if (!draft) { U.toast('info', '暂无周复盘可导入'); return; }
      if (!pending.length) { U.toast('info', '没有待咨询问题'); return; }
      let c = {};
      try { c = JSON.parse(draft.content || '{}'); } catch { c = {}; }
      c.questions = pending.map(q => `- ${q.title}${q.detail ? '：' + q.detail : ''}`).join('\n');
      await A.update('weekly_reviews', draft.id, { content: JSON.stringify(c) });
      for (const q of pending) await A.update('advisor_questions', q.id, { imported_to_review: 1 });
      U.toast('success', `已将 ${pending.length} 个问题导入周复盘`);
    });
    document.querySelectorAll('.comm-del').forEach(btn => btn.addEventListener('click', async () => {
      await A.remove('advisor_communications', btn.dataset.id);
      window.app.refresh();
    }));
    document.querySelectorAll('.q-done').forEach(btn => btn.addEventListener('click', async () => {
      await A.update('advisor_questions', btn.dataset.id, { status: btn.dataset.status === '待咨询' ? '已咨询' : '待咨询' });
      window.app.refresh();
    }));
    document.querySelectorAll('.q-del').forEach(btn => btn.addEventListener('click', async () => {
      await A.remove('advisor_questions', btn.dataset.id);
      window.app.refresh();
    }));
    document.getElementById('draft-add').addEventListener('click', () => openDraftModal());
    document.querySelectorAll('.draft-edit').forEach(btn => btn.addEventListener('click', () => openDraftModal(Number(btn.dataset.id))));
    document.querySelectorAll('.draft-del').forEach(btn => btn.addEventListener('click', async () => {
      await A.remove('report_drafts', btn.dataset.id);
      window.app.refresh();
    }));
    document.querySelectorAll('.draft-copy').forEach(btn => btn.addEventListener('click', async () => {
      const drafts = await A.list('report_drafts');
      const d = drafts.find(x => x.id === Number(btn.dataset.id));
      if (!d) return;
      try { await navigator.clipboard.writeText(d.content || ''); U.toast('success', '草稿内容已复制'); }
      catch { U.toast('info', '复制失败，请手动复制'); }
    }));
  }

  function openDraftModal(id) {
    const load = id ? A.list('report_drafts').then(rows => rows.find(r => r.id === id)) : Promise.resolve(null);
    load.then(d => {
      U.openModal({
        title: id ? '编辑汇报草稿' : '新建汇报草稿',
        width: '820px',
        body: `<form class="form" id="draft-form">
          <div class="grid-2">
            ${U.formField({ name: 'type', label: '模板类型', type: 'select', value: d?.type || '周组会', options: ['周组会', '月度汇报', '阶段性课题汇报', '其他'] })}
            ${U.formField({ name: 'title', label: '草稿标题', value: d?.title || '', required: true })}
          </div>
          ${U.formField({ name: 'content', label: '草稿内容', type: 'textarea', rows: 12, value: d?.content || '' })}
          <div class="modal-actions"><button type="button" class="btn btn-ghost" data-close>取消</button><button type="submit" class="btn btn-primary">保存</button></div>
        </form>`,
        onMount: (bodyEl, close) => {
          bodyEl.querySelector('[data-close]').addEventListener('click', close);
          bodyEl.querySelector('form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const v = U.formValues(e.target);
            if (id) await A.update('report_drafts', id, { ...v, updated_at: new Date().toISOString() });
            else await A.insert('report_drafts', { ...v, updated_at: new Date().toISOString() });
            U.toast('success', '汇报草稿已保存');
            close();
            window.app.refresh();
          });
        }
      });
    });
  }

  async function renderHealth() {
    const [health, english, habits, exams] = await Promise.all([
      A.list('health_records', 'date DESC, id DESC'),
      A.list('english_records', 'date DESC, id DESC'),
      A.list('habits', 'date DESC, id DESC'),
      A.list('exam_plans', 'exam_date ASC')
    ]);
    const today = U.iso(new Date());
    const todayHealth = health.find(h => h.date === today);
    const todayEnglish = english.find(e => e.date === today);
    const todayHabits = habits.filter(h => h.date === today);
    const habitTypes = ['作息', '运动', '阅读', '英语'];
    return `
      <div class="page-head"><div><h1>健康与学习辅助</h1><p>作息、情绪、运动、英语打卡与备考倒计时</p></div>
      <div class="page-actions"><button class="btn btn-primary btn-sm" id="health-check">${I('heart', 14)} 今日健康打卡</button></div></div>
      <div class="grid-2">
        <div class="panel"><div class="panel-head"><h3>今日健康打卡</h3></div>
          <div class="panel-body health-today">
            <div class="health-line"><span>作息健康</span>${todayHealth ? U.badge(`${todayHealth.sleep_hours} 小时睡眠`, 'green') : U.badge('未打卡', 'gray')}</div>
            <div class="health-line"><span>情绪 / 压力 / 精力</span>${todayHealth ? `${'★'.repeat(todayHealth.mood)} / ${'★'.repeat(todayHealth.stress)} / ${'★'.repeat(todayHealth.energy)}` : '—'}</div>
            <div class="health-line"><span>运动</span>${todayHealth && todayHealth.exercise_minutes ? `${todayHealth.exercise_minutes} 分钟 ${todayHealth.exercise_type || ''}` : U.badge('未记录', 'gray')}</div>
            <div class="health-line"><span>英语单词</span>${todayEnglish ? `${todayEnglish.words} 词 / ${todayEnglish.minutes} 分钟` : U.badge('未打卡', 'gray')}</div>
          </div>
          <div class="habit-check-grid">
            ${habitTypes.map(h => `<button class="btn ${todayHabits.some(x => x.type === h) ? 'btn-primary' : 'btn-outline'} habit-check-btn" data-type="${h}">${I('check', 14)} ${h}${todayHabits.some(x => x.type === h) ? ' 已打卡' : ''}</button>`).join('')}
          </div>
        </div>
        <div class="panel"><div class="panel-head"><h3>专项备考倒计时</h3><button class="btn btn-ghost btn-sm" id="exam-add">${I('plus', 13)} 新增</button></div>
          <div class="panel-body exam-list">
            ${exams.map(e => {
              const days = Math.ceil((new Date(e.exam_date) - new Date()) / 86400000);
              return `<div class="exam-item"><div><b>${U.esc(e.name)}</b><span>${U.fmtDate(e.exam_date)} · 每日目标 ${e.daily_goal || 0} 词</span></div><div class="exam-count">${days >= 0 ? `${days} 天` : '已结束'}</div></div>`;
            }).join('') || U.emptyState('暂无备考计划', 'target')}
          </div>
        </div>
      </div>
      ${U.panel('近期健康记录', U.table(
        [{ label: '日期', key: 'date' }, { label: '睡眠', key: 'sleep' }, { label: '心情', key: 'mood' }, { label: '压力', key: 'stress' }, { label: '运动', key: 'exercise' }, { label: '备注', key: 'notes' }, { label: '', key: 'op' }],
        health.slice(0, 14).map(h => ({ ...h, sleep: `${h.sleep_hours ?? '—'} h`, mood: '★'.repeat(h.mood || 0) || '—', stress: '★'.repeat(h.stress || 0) || '—', exercise: h.exercise_minutes ? `${h.exercise_minutes} 分钟 ${h.exercise_type || ''}` : '—', notes: h.notes || '', op: `<button class="icon-btn health-del" data-id="${h.id}">${I('trash', 13)}</button>` })),
        '暂无健康记录'
      ))}
    `;
  }

  function mountHealth() {
    document.getElementById('health-check').addEventListener('click', openHealthModal);
    document.querySelectorAll('.habit-check-btn').forEach(btn => btn.addEventListener('click', async () => {
      const type = btn.dataset.type;
      await A.insert('habits', { date: U.iso(new Date()), type, value: 'done', note: '' });
      U.toast('success', `${type}打卡完成`);
      window.app.refresh();
    }));
    const examAdd = document.getElementById('exam-add');
    if (examAdd) examAdd.addEventListener('click', () => {
      U.openModal({
        title: '新增备考计划',
        body: `<form class="form" id="exam-form">
          ${U.formField({ name: 'name', label: '考试名称', required: true })}
          ${U.formField({ name: 'exam_date', label: '考试日期', type: 'date', required: true })}
          ${U.formField({ name: 'daily_goal', label: '每日学习目标（词/分钟）', type: 'number', value: 20 })}
          <div class="modal-actions"><button type="button" class="btn btn-ghost" data-close>取消</button><button type="submit" class="btn btn-primary">保存</button></div>
        </form>`,
        onMount: (bodyEl, close) => {
          bodyEl.querySelector('[data-close]').addEventListener('click', close);
          bodyEl.querySelector('form').addEventListener('submit', async (e) => {
            e.preventDefault();
            await A.insert('exam_plans', { ...U.formValues(e.target), status: '备考中' });
            U.toast('success', '备考计划已保存');
            close();
            window.app.refresh();
          });
        }
      });
    });
    document.querySelectorAll('.health-del').forEach(btn => btn.addEventListener('click', async () => {
      await A.remove('health_records', btn.dataset.id);
      window.app.refresh();
    }));
  }

  function openHealthModal() {
    U.openModal({
      title: '今日健康打卡',
      body: `<form class="form" id="health-form">
        ${U.formField({ name: 'date', label: '日期', type: 'date', value: U.iso(new Date()), required: true })}
        <div class="grid-3">
          ${U.formField({ name: 'sleep_hours', label: '睡眠时长', type: 'number', value: 7, step: '0.5' })}
          ${U.formField({ name: 'mood', label: '心情 (1-5)', type: 'number', value: 4, min: 1, max: 5 })}
          ${U.formField({ name: 'stress', label: '压力 (1-5)', type: 'number', value: 2, min: 1, max: 5 })}
        </div>
        <div class="grid-2">
          ${U.formField({ name: 'exercise_minutes', label: '运动分钟', type: 'number', value: 0 })}
          ${U.formField({ name: 'exercise_type', label: '运动类型', value: '', placeholder: '如：慢跑' })}
        </div>
        ${U.formField({ name: 'energy', label: '精力 (1-5)', type: 'number', value: 4, min: 1, max: 5 })}
        ${U.formField({ name: 'notes', label: '备注', type: 'textarea', rows: 2 })}
        <div class="modal-actions"><button type="button" class="btn btn-ghost" data-close>取消</button><button type="submit" class="btn btn-primary">保存</button></div>
      </form>`,
      onMount: (bodyEl, close) => {
        bodyEl.querySelector('[data-close]').addEventListener('click', close);
        bodyEl.querySelector('form').addEventListener('submit', async (e) => {
          e.preventDefault();
          const v = U.formValues(e.target);
          await A.insert('health_records', v);
          U.toast('success', '健康打卡已记录');
          close();
          window.app.refresh();
        });
      }
    });
  }

  async function renderAchievements() {
    const [achieved, tasks, milestones, submissions, literature] = await Promise.all([
      A.list('achievements'), A.list('tasks'), A.list('milestones'), A.list('submissions'), A.list('literature')
    ]);
    const all = [
      { key: 'first_clock', title: '首次打卡', desc: '完成第一次科研打卡', icon: 'clock', done: achieved.some(a => a.key === 'first_clock') },
      { key: 'streak_7', title: '连续七天专注', desc: '连续 7 天保持有效科研打卡', icon: 'flame', done: achieved.some(a => a.key === 'streak_7') },
      { key: 'streak_30', title: '月度全勤', desc: '当月打卡天数达到 20 天', icon: 'calendar-check', done: achieved.some(a => a.key === 'streak_30') },
      { key: 'milestone_3', title: '里程碑通关 x3', desc: '累计完成 3 个关键里程碑', icon: 'flag', done: achieved.some(a => a.key === 'milestone_3') },
      { key: 'milestone_5', title: '里程碑通关 x5', desc: '累计完成 5 个关键里程碑', icon: 'trophy', done: milestones.filter(m => m.status === 'done').length >= 5 },
      { key: 'submission_1', title: '首篇投稿', desc: '完成第一篇论文投稿', icon: 'send', done: achieved.some(a => a.key === 'submission_1') },
      { key: 'acceptance', title: '论文录用', desc: '论文正式录用', icon: 'award', done: submissions.some(s => ['录用', '见刊'].includes(s.status)) },
      { key: 'literature_10', title: '文献达人', desc: '精读文献累计 10 篇', icon: 'book', done: literature.filter(l => l.status === 'read').length >= 10 },
      { key: 'literature_20', title: '文献宗师', desc: '精读文献累计 20 篇', icon: 'library', done: literature.filter(l => l.status === 'read').length >= 20 },
      { key: 'health_7', title: '健康生活', desc: '连续一周记录作息健康', icon: 'heart', done: achieved.some(a => a.key === 'health_7') },
      { key: 'task_50', title: '任务收割机', desc: '累计完成任务 50 项', icon: 'check', done: tasks.filter(t => t.status === 'done').length >= 50 },
      { key: 'overleaf_pro', title: '写作达人', desc: 'Overleaf 写作同步 10 次', icon: 'file-text', done: false }
    ];
    return `
      <div class="page-head"><div><h1>成就殿堂</h1><p>已解锁 ${achieved.length} 枚 · 连续打卡、里程碑通关、论文录用激励</p></div></div>
      <div class="achievement-grid">
        ${all.map(a => `<div class="achievement-card ${a.done ? 'unlocked' : 'locked'}">
          <div class="achievement-icon">${I(a.icon, 26)}</div>
          <b>${U.esc(a.title)}</b>
          <span>${U.esc(a.desc)}</span>
          ${a.done ? U.badge('已解锁', 'green') : U.badge('未解锁', 'gray')}
        </div>`).join('')}
      </div>`;
  }

  function mountAchievements() { /* static */ }

  async function renderSettings() {
    const [theme, commandEnabled, sedentaryEnabled, sedentaryMinutes, alarms, backupPath, backupInterval, extensionHooks, zotero, overleaf, innovationAuto] = await Promise.all([
      A.settingsGet('theme'), A.settingsGet('command_enabled'), A.settingsGet('sedentary_enabled'),
      A.settingsGet('sedentary_minutes'), A.settingsGet('alarms'), A.settingsGet('backup_path'),
      A.settingsGet('backup_interval_days'), A.settingsGet('extension_hooks'), A.settingsGet('zotero'),
      A.settingsGet('overleaf'), A.settingsGet('innovation_auto_refresh')
    ]);
    const alarmRows = (alarms || []).map(a => `<div class="alarm-row" data-label="${U.esc(a.label)}" data-time="${U.esc(a.time)}"><span>${U.esc(a.label)}</span><b>${U.esc(a.time)}</b><button class="icon-btn alarm-del">${I('trash', 14)}</button></div>`).join('');
    return `
      <div class="page-head"><div><h1>数据管理与系统设置</h1><p>备份、导入导出、提醒、主题、快捷键与拓展接口</p></div></div>
      <div class="settings-tabs">
        <button class="tab active" data-tab="general">通用</button>
        <button class="tab" data-tab="backup">备份与导入导出</button>
        <button class="tab" data-tab="remind">提醒配置</button>
        <button class="tab" data-tab="integrate">第三方对接</button>
        <button class="tab" data-tab="extend">拓展接口</button>
      </div>
      <div class="settings-tab-panel active" data-panel="general">
        <div class="panel"><div class="panel-head"><h3>外观与通用</h3></div><div class="panel-body">
          <form class="form" id="general-form">
            <div class="grid-3">
              ${U.formField({ name: 'theme', label: '主题模式', type: 'select', value: theme || 'blue', options: [{ value: 'blue', label: '静谧蓝专注模式' }, { value: 'orange', label: '活力橙科研模式' }] })}
              ${U.formField({ name: 'command_enabled', label: '全局命令行开关', type: 'checkbox', value: commandEnabled !== false })}
              ${U.formField({ name: 'innovation_auto_refresh', label: '创新文献每日自动更新', type: 'checkbox', value: innovationAuto !== false })}
            </div>
            <div class="modal-actions"><button type="submit" class="btn btn-primary">保存通用设置</button></div>
          </form>
        </div></div>
      </div>
      <div class="settings-tab-panel" data-panel="backup">
        <div class="grid-2">
          <div class="panel"><div class="panel-head"><h3>本地备份</h3></div><div class="panel-body">
            <form class="form" id="backup-form">
              ${U.formField({ name: 'backup_interval_days', label: '自动备份间隔', type: 'select', value: String(backupInterval || 3), options: [{ value: '1', label: '每 1 天' }, { value: '3', label: '每 3 天' }, { value: '7', label: '每 7 天' }] })}
              <div class="field"><label>备份路径</label><div class="path-input"><input id="backup-path-input" value="${U.esc(backupPath || '')}" readonly placeholder="默认：用户数据目录/data/backups"><button type="button" class="btn btn-outline btn-sm" id="backup-path-pick">选择</button></div></div>
              <div class="modal-actions"><button type="submit" class="btn btn-primary">保存备份设置</button><button type="button" class="btn btn-outline" id="backup-now-btn">${I('database', 14)} 立即备份</button></div>
            </form>
          </div></div>
          <div class="panel"><div class="panel-head"><h3>JSON 导入 / 导出</h3></div><div class="panel-body">
            <div class="settings-actions">
              <button class="btn btn-primary" id="backup-export-json">${I('download', 15)} 导出 JSON 备份包</button>
              <button class="btn btn-outline" id="backup-import-json">${I('upload', 15)} 导入 JSON 备份包</button>
              <button class="btn btn-ghost" id="backup-export-excel">${I('database', 15)} 导出全量 Excel</button>
            </div>
            <div class="field-help">导入前会自动备份当前数据；JSON 包含全部业务表原始数据，支持手动迁移与存档。</div>
          </div></div>
        </div>
      </div>
      <div class="settings-tab-panel" data-panel="remind">
        <div class="grid-2">
          <div class="panel"><div class="panel-head"><h3>久坐与工作提醒</h3></div><div class="panel-body">
            <form class="form" id="remind-form">
              ${U.formField({ name: 'sedentary_enabled', label: '久坐健康提醒', type: 'checkbox', value: sedentaryEnabled !== false })}
              ${U.formField({ name: 'sedentary_minutes', label: '提醒间隔（分钟）', type: 'number', value: sedentaryMinutes || 60, min: 20 })}
              <div class="modal-actions"><button type="submit" class="btn btn-primary">保存提醒设置</button></div>
            </form>
          </div></div>
          <div class="panel"><div class="panel-head"><h3>自定义工作时段闹钟</h3><button class="btn btn-ghost btn-sm" id="alarm-add">${I('plus', 13)} 新增</button></div>
            <div class="panel-body alarm-list">${alarmRows || '<div class="empty-state">暂无闹钟</div>'}</div>
          </div>
        </div>
      </div>
      <div class="settings-tab-panel" data-panel="integrate">
        <div class="grid-2">
          <div class="panel"><div class="panel-head"><h3>Zotero 配置</h3></div><div class="panel-body">
            <div class="settings-actions">
              <button class="btn btn-outline btn-sm" data-go="zotero">前往 Zotero 页面</button>
              <button class="btn btn-primary btn-sm" id="setting-zotero-sync">${I('sync', 14)} 立即同步</button>
            </div>
            <div class="field-help">当前状态：${zotero?.enabled ? U.badge('已启用', 'green') : U.badge('未启用', 'gray')}</div>
          </div></div>
          <div class="panel"><div class="panel-head"><h3>Overleaf 配置</h3></div><div class="panel-body">
            <div class="settings-actions">
              <button class="btn btn-outline btn-sm" data-go="zotero">前往 Overleaf 页面</button>
              <button class="btn btn-primary btn-sm" id="setting-overleaf-sync">${I('sync', 14)} 立即同步</button>
            </div>
            <div class="field-help">当前状态：${overleaf?.enabled ? U.badge('已启用', 'green') : U.badge('未启用', 'gray')}</div>
          </div></div>
        </div>
      </div>
      <div class="settings-tab-panel" data-panel="extend">
        <div class="panel"><div class="panel-head"><h3>预留拓展接口</h3></div><div class="panel-body">
          <form class="form" id="extend-form">
            <div class="grid-3">
              ${U.formField({ name: 'notion', label: 'Notion 同步', type: 'checkbox', value: !!extensionHooks?.notion })}
              ${U.formField({ name: 'shimo', label: '石墨文档联动', type: 'checkbox', value: !!extensionHooks?.shimo })}
              ${U.formField({ name: 'cloud_backup', label: '在线网盘自动备份', type: 'checkbox', value: !!extensionHooks?.cloud_backup })}
            </div>
            <div class="field-help">当前版本预留适配层与配置项，后续可无缝接入 Notion、石墨文档、网盘自动备份能力。</div>
            <div class="modal-actions"><button type="submit" class="btn btn-primary">保存拓展配置</button></div>
          </form>
        </div></div>
      </div>`;
  }

  function mountSettings() {
    document.querySelectorAll('.settings-tabs .tab').forEach(tab => tab.addEventListener('click', () => {
      document.querySelectorAll('.settings-tabs .tab').forEach(t => t.classList.toggle('active', t === tab));
      document.querySelectorAll('.settings-tab-panel').forEach(p => p.classList.toggle('active', p.dataset.panel === tab.dataset.tab));
    }));
    document.getElementById('general-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const v = U.formValues(e.target);
      await A.settingsSet('theme', v.theme);
      await A.settingsSet('command_enabled', !!v.command_enabled);
      await A.settingsSet('innovation_auto_refresh', !!v.innovation_auto_refresh);
      window.app.applyTheme(v.theme);
      U.toast('success', '通用设置已保存');
    });
    document.getElementById('remind-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const v = U.formValues(e.target);
      await A.settingsSet('sedentary_enabled', !!v.sedentary_enabled);
      await A.settingsSet('sedentary_minutes', Number(v.sedentary_minutes) || 60);
      U.toast('success', '提醒设置已保存');
    });
    document.getElementById('backup-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const v = U.formValues(e.target);
      await A.settingsSet('backup_interval_days', Number(v.backup_interval_days));
      U.toast('success', '备份设置已保存');
    });
    document.getElementById('backup-path-pick').addEventListener('click', async () => {
      const r = await A.backupChoosePath();
      if (r && !r.canceled) document.getElementById('backup-path-input').value = r.path;
    });
    document.getElementById('backup-now-btn').addEventListener('click', async () => {
      const r = await A.backupNow();
      U.toast('success', `备份完成：${r.filePath}`);
    });
    document.getElementById('backup-export-json').addEventListener('click', async () => {
      const r = await A.backupExportJson();
      if (r && !r.canceled) U.toast('success', `备份包已导出：${r.filePath}`);
    });
    document.getElementById('backup-import-json').addEventListener('click', async () => {
      const r = await A.backupImportJson();
      if (r && !r.canceled) { U.toast('success', r.message); window.app.refresh(); }
    });
    document.getElementById('backup-export-excel').addEventListener('click', async () => {
      const r = await A.exportExcel();
      if (r && !r.canceled) U.toast('success', `Excel 已导出：${r.filePath}`);
    });
    document.getElementById('alarm-add').addEventListener('click', () => {
      U.openModal({
        title: '新增工作时段闹钟',
        body: `<form class="form" id="alarm-form">
          ${U.formField({ name: 'label', label: '提醒名称', value: '', placeholder: '如：上午工作开始' })}
          ${U.formField({ name: 'time', label: '提醒时间', type: 'time', value: '09:00' })}
          <div class="modal-actions"><button type="button" class="btn btn-ghost" data-close>取消</button><button type="submit" class="btn btn-primary">保存</button></div>
        </form>`,
        onMount: async (bodyEl, close) => {
          bodyEl.querySelector('[data-close]').addEventListener('click', close);
          bodyEl.querySelector('form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const v = U.formValues(e.target);
            const alarms = await A.settingsGet('alarms') || [];
            alarms.push({ label: v.label, time: v.time });
            await A.settingsSet('alarms', alarms);
            U.toast('success', '闹钟已添加');
            close();
            window.app.refresh();
          });
        }
      });
    });
    document.querySelectorAll('.alarm-del').forEach(btn => btn.addEventListener('click', async () => {
      const row = btn.closest('.alarm-row');
      const alarms = await A.settingsGet('alarms') || [];
      await A.settingsSet('alarms', alarms.filter(a => !(a.label === row.dataset.label && a.time === row.dataset.time)));
      window.app.refresh();
    }));
    document.getElementById('setting-zotero-sync').addEventListener('click', async () => {
      const r = await A.zoteroSync();
      U.toast(r.ok ? 'success' : 'error', r.message);
    });
    document.getElementById('setting-overleaf-sync').addEventListener('click', async () => {
      const r = await A.overleafSync();
      U.toast(r.ok ? 'success' : 'error', r.message);
    });
    document.getElementById('extend-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const v = U.formValues(e.target);
      await A.settingsSet('extension_hooks', { notion: !!v.notion, shimo: !!v.shimo, cloud_backup: !!v.cloud_backup });
      U.toast('success', '拓展配置已保存');
    });
    document.querySelectorAll('[data-go]').forEach(el => el.addEventListener('click', () => window.app.navigate(el.dataset.go)));
  }

  window.viewsExtra = {
    literature: { render: renderLiterature, mount: mountLiterature },
    innovation: { render: renderInnovation, mount: mountInnovation },
    zotero: { render: renderZotero, mount: mountZotero },
    weekly: { render: renderWeekly, mount: mountWeekly },
    monthly: { render: renderMonthly, mount: mountMonthly },
    advisor: { render: renderAdvisor, mount: mountAdvisor },
    health: { render: renderHealth, mount: mountHealth },
    achievements: { render: renderAchievements, mount: mountAchievements },
    settings: { render: renderSettings, mount: mountSettings },
    helpers: { openLiteratureNoteModal, openWeeklyModal, openMonthlyModal }
  };
})();
