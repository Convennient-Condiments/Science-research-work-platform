window.ui = (() => {
  function esc(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function toast(type, message) {
    const root = document.getElementById('toast-root');
    const item = document.createElement('div');
    item.className = `toast toast-${type || 'info'}`;
    item.innerHTML = `<span class="toast-icon">${ICONS.icon(type === 'success' ? 'check' : type === 'error' ? 'alert' : 'spark', 16)}</span><span>${esc(message)}</span>`;
    root.appendChild(item);
    requestAnimationFrame(() => item.classList.add('show'));
    setTimeout(() => {
      item.classList.remove('show');
      setTimeout(() => item.remove(), 300);
    }, 3800);
  }

  function openModal({ title, body, width = '640px', onMount }) {
    const root = document.getElementById('modal-root');
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal" style="max-width:${width}">
        <div class="modal-head">
          <div class="modal-title">${esc(title)}</div>
          <button class="icon-btn modal-close" title="关闭">${ICONS.icon('x', 18)}</button>
        </div>
        <div class="modal-body">${body}</div>
      </div>`;
    root.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('show'));
    const close = () => {
      overlay.classList.remove('show');
      setTimeout(() => overlay.remove(), 200);
    };
    overlay.querySelector('.modal-close').addEventListener('click', close);
    overlay.addEventListener('mousedown', (e) => {
      if (e.target === overlay) close();
    });
    document.addEventListener('keydown', function escKey(e) {
      if (e.key === 'Escape') {
        close();
        document.removeEventListener('keydown', escKey);
      }
    });
    if (onMount) onMount(overlay.querySelector('.modal-body'), close);
    return { overlay, bodyEl: overlay.querySelector('.modal-body'), close };
  }

  function confirmDialog({ title = '确认操作', message = '', danger = false, onConfirm }) {
    openModal({
      title,
      width: '440px',
      body: `<div class="confirm-body">${esc(message)}</div>
        <div class="modal-actions">
          <button class="btn btn-ghost modal-cancel">取消</button>
          <button class="btn ${danger ? 'btn-danger' : 'btn-primary'} modal-ok">确认</button>
        </div>`,
      onMount: (bodyEl, close) => {
        bodyEl.querySelector('.modal-cancel').addEventListener('click', close);
        bodyEl.querySelector('.modal-ok').addEventListener('click', () => {
          close();
          onConfirm && onConfirm();
        });
      }
    });
  }

  function formField({ name, label, type = 'text', value = '', options = [], placeholder = '', required = false, rows = 4, help = '', min, max, step }) {
    const id = `f_${name}_${Math.random().toString(36).slice(2, 7)}`;
    let control = '';
    if (type === 'textarea') {
      control = `<textarea id="${id}" name="${name}" rows="${rows}" placeholder="${esc(placeholder)}" ${required ? 'required' : ''}>${esc(value)}</textarea>`;
    } else if (type === 'select') {
      const opts = options.map(o => {
        const [val, text] = typeof o === 'object' ? [o.value, o.label] : [o, o];
        return `<option value="${esc(val)}" ${String(value) === String(val) ? 'selected' : ''}>${esc(text)}</option>`;
      }).join('');
      control = `<select id="${id}" name="${name}" ${required ? 'required' : ''}>${opts}</select>`;
    } else if (type === 'checkbox') {
      control = `<input id="${id}" type="checkbox" name="${name}" ${value ? 'checked' : ''}>`;
    } else {
      const stepAttr = step ? ` step="${step}"` : (type === 'number' ? ' step="any"' : '');
      const minAttr = min !== undefined ? ` min="${min}"` : '';
      const maxAttr = max !== undefined ? ` max="${max}"` : '';
      control = `<input id="${id}" type="${type}" name="${name}" value="${esc(value)}" placeholder="${esc(placeholder)}" ${required ? 'required' : ''}${stepAttr}${minAttr}${maxAttr}>`;
    }
    return `<div class="field ${type === 'checkbox' ? 'field-check' : ''}">
      <label for="${id}">${esc(label)}${required ? ' <span class="req">*</span>' : ''}</label>
      ${control}
      ${help ? `<div class="field-help">${esc(help)}</div>` : ''}
    </div>`;
  }

  function formValues(formEl) {
    const out = {};
    for (const el of formEl.querySelectorAll('[name]')) {
      if (el.type === 'checkbox') out[el.name] = el.checked ? 1 : 0;
      else if (el.type === 'number') out[el.name] = el.value === '' ? null : Number(el.value);
      else out[el.name] = el.value;
    }
    return out;
  }

  function panel(title, body, actions = '') {
    return `<section class="panel">
      <div class="panel-head">
        <h3>${esc(title)}</h3>
        ${actions ? `<div class="panel-actions">${actions}</div>` : ''}
      </div>
      <div class="panel-body">${body}</div>
    </section>`;
  }

  function statCard({ iconName, label, value, sub, accent = 'blue', badge = '' }) {
    return `<div class="stat-card accent-${accent}">
      <div class="stat-icon">${ICONS.icon(iconName, 20)}</div>
      <div class="stat-info">
        <div class="stat-value">${esc(value)}${badge ? `<span class="stat-badge">${esc(badge)}</span>` : ''}</div>
        <div class="stat-label">${esc(label)}</div>
        ${sub ? `<div class="stat-sub">${esc(sub)}</div>` : ''}
      </div>
    </div>`;
  }

  function badge(text, tone = 'gray') {
    return `<span class="badge badge-${tone}">${esc(text)}</span>`;
  }

  function table(columns, rows, empty = '暂无数据') {
    if (!rows.length) return `<div class="empty-state">${esc(empty)}</div>`;
    const head = columns.map(c => `<th>${esc(c.label)}</th>`).join('');
    const body = rows.map(r => `<tr>${columns.map(c => {
      let cell;
      if (c.render) {
        cell = c.render(r);
      } else {
        const v = r[c.key];
        cell = (typeof v === 'string' && /^<[a-zA-Z]/.test(v.trim())) ? v : esc(v);
      }
      return `<td class="${c.className || ''}">${cell}</td>`;
    }).join('')}</tr>`).join('');
    return `<div class="table-wrap"><table class="data-table"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
  }

  function emptyState(text, iconName = 'spark') {
    return `<div class="empty-state">${ICONS.icon(iconName, 26)}<div>${esc(text)}</div></div>`;
  }

  function durationLabel(seconds) {
    if (!seconds || seconds <= 0) return '0 分钟';
    const h = Math.floor(seconds / 3600);
    const m = Math.round((seconds % 3600) / 60);
    if (h === 0) return `${m} 分钟`;
    return `${h} 小时 ${m} 分钟`;
  }

  function secondsBetween(started, ended) {
    const s = new Date(started).getTime();
    const e = ended ? new Date(ended).getTime() : Date.now();
    return Math.max(0, Math.floor((e - s) / 1000));
  }

  function fmtDateTime(value) {
    if (!value) return '—';
    const d = new Date(value);
    if (isNaN(d)) return String(value);
    return d.toLocaleString('zh-CN', { hour12: false });
  }

  function fmtDate(value) {
    if (!value) return '—';
    return String(value).slice(0, 10);
  }

  function addDays(base, days) {
    const d = new Date(base);
    d.setDate(d.getDate() + days);
    return d;
  }

  function startOfWeek(base) {
    const d = new Date(base);
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    d.setHours(0, 0, 0, 0);
    return d;
  }

  function iso(d) {
    const p = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  }

  function weekLabel(weekStart) {
    const end = addDays(new Date(weekStart), 6);
    return `${String(weekStart).slice(5)} ~ ${iso(end).slice(5)}`;
  }

  function monthLabel(month) {
    return `${String(month).slice(0, 4)} 年 ${Number(String(month).slice(5, 7))} 月`;
  }

  return {
    esc, toast, openModal, confirmDialog, formField, formValues, panel, statCard,
    badge, table, emptyState, durationLabel, secondsBetween, fmtDateTime, fmtDate,
    addDays, startOfWeek, iso, weekLabel, monthLabel
  };
})();
