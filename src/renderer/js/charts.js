window.charts = (() => {
  const PALETTE = ['#2563eb', '#f97316', '#10b981', '#8b5cf6', '#ef4444', '#eab308', '#14b8a6', '#f43f5e', '#6366f1'];

  function svgWrap(inner, width = 640, height = 240) {
    return `<svg class="chart-svg" viewBox="0 0 ${width} ${height}" width="100%" height="${height}" xmlns="http://www.w3.org/2000/svg" role="img">${inner}</svg>`;
  }

  function lineChart(data, height = 240) {
    const w = 640, h = height;
    const pad = { l: 42, r: 18, t: 18, b: 30 };
    const max = Math.max(1, ...data.map(d => Number(d.value)));
    const x = i => pad.l + (i * (w - pad.l - pad.r)) / Math.max(1, data.length - 1);
    const y = v => h - pad.b - (v / max) * (h - pad.t - pad.b);
    let path = '';
    let area = '';
    data.forEach((d, i) => {
      const px = x(i), py = y(Number(d.value));
      path += `${i ? 'L' : 'M'}${px.toFixed(1)},${py.toFixed(1)}`;
      area += `${i ? 'L' : 'M'}${px.toFixed(1)},${py.toFixed(1)}`;
    });
    area += `L${x(data.length - 1)},${h - pad.b}L${x(0)},${h - pad.b}Z`;
    const grid = [0, 0.5, 1].map(f => {
      const gy = y(max * f);
      return `<line x1="${pad.l}" y1="${gy}" x2="${w - pad.r}" y2="${gy}" class="chart-gridline"/><text x="${pad.l - 8}" y="${gy + 4}" text-anchor="end" class="chart-axis">${Math.round(max * f)}</text>`;
    }).join('');
    const labels = data.map((d, i) => `<text x="${x(i)}" y="${h - 8}" text-anchor="middle" class="chart-axis">${d.label}</text>`).join('');
    const dots = data.map((d, i) => `<circle cx="${x(i)}" cy="${y(Number(d.value))}" r="3.5" class="chart-dot"><title>${d.label}: ${d.value}</title></circle>`).join('');
    return svgWrap(`${grid}<path d="${area}" class="chart-area"/><path d="${path}" class="chart-line"/>${dots}${labels}`);
  }

  function barChart(data, height = 240, keyA = 'done', keyB = 'total') {
    const w = 640, h = height;
    const pad = { l: 42, r: 18, t: 18, b: 30 };
    const max = Math.max(1, ...data.flatMap(d => [Number(d[keyA] || 0), Number(d[keyB] || 0)]));
    const bw = Math.min(46, ((w - pad.l - pad.r) / data.length) * 0.32);
    const group = (w - pad.l - pad.r) / data.length;
    let bars = '';
    const grid = [0, 0.5, 1].map(f => {
      const gy = h - pad.b - f * (h - pad.t - pad.b);
      return `<line x1="${pad.l}" y1="${gy}" x2="${w - pad.r}" y2="${gy}" class="chart-gridline"/><text x="${pad.l - 8}" y="${gy + 4}" text-anchor="end" class="chart-axis">${Math.round(max * f)}</text>`;
    }).join('');
    data.forEach((d, i) => {
      const cx = pad.l + i * group + group / 2;
      const vA = Number(d[keyA] || 0), vB = Number(d[keyB] || 0);
      const hA = (vA / max) * (h - pad.t - pad.b);
      const hB = (vB / max) * (h - pad.t - pad.b);
      bars += `<rect x="${cx - bw - 3}" y="${h - pad.b - hA}" width="${bw}" height="${Math.max(0, hA)}" rx="4" class="bar bar-a"><title>${d.label} ${keyA}: ${vA}</title></rect>`;
      bars += `<rect x="${cx + 3}" y="${h - pad.b - hB}" width="${bw}" height="${Math.max(0, hB)}" rx="4" class="bar bar-b"><title>${d.label} ${keyB}: ${vB}</title></rect>`;
      bars += `<text x="${cx}" y="${h - 8}" text-anchor="middle" class="chart-axis">${d.label}</text>`;
    });
    return svgWrap(`${grid}${bars}`);
  }

  function pieChart(data, height = 230) {
    const total = data.reduce((s, d) => s + Number(d.count || 0), 0) || 1;
    const cx = 110, cy = height / 2, r = 78;
    let angle = -90;
    let segments = '';
    data.forEach((d, i) => {
      const frac = Number(d.count || 0) / total;
      const a1 = angle;
      const a2 = angle + frac * 360;
      const large = frac > 0.5 ? 1 : 0;
      const x1 = cx + r * Math.cos((a1 * Math.PI) / 180);
      const y1 = cy + r * Math.sin((a1 * Math.PI) / 180);
      const x2 = cx + r * Math.cos((a2 * Math.PI) / 180);
      const y2 = cy + r * Math.sin((a2 * Math.PI) / 180);
      const color = PALETTE[i % PALETTE.length];
      segments += `<path d="M${cx},${cy} L${x1.toFixed(1)},${y1.toFixed(1)} A${r},${r} 0 ${large} 1 ${x2.toFixed(1)},${y2.toFixed(1)} Z" fill="${color}"><title>${d.status}: ${d.count}</title></path>`;
      angle = a2;
    });
    segments += `<circle cx="${cx}" cy="${cy}" r="${r * 0.62}" class="chart-hole"/>`;
    const legend = data.map((d, i) => `<div class="legend-item"><span class="legend-dot" style="background:${PALETTE[i % PALETTE.length]}"></span><span>${d.status}</span><b>${d.count}</b></div>`).join('');
    return `<div class="pie-wrap">${svgWrap(segments, 240, height)}<div class="chart-legend">${legend}</div></div>`;
  }

  function ganttChart(milestones, height = 300) {
    const rows = milestones.slice().sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    if (!rows.length) return '<div class="empty-state">暂无里程碑</div>';
    const allDates = rows.flatMap(m => [m.planned_start, m.planned_end]).filter(Boolean).map(d => new Date(d).getTime());
    const min = new Date(Math.min(...allDates));
    const max = new Date(Math.max(...allDates));
    const span = Math.max(1, max - min);
    const w = 720, rowH = 34, padL = 150, padT = 26;
    const h = padT + rows.length * rowH + 18;
    const x = t => padL + ((new Date(t).getTime() - min) / span) * (w - padL - 18);
    const gridMonths = [];
    const cursor = new Date(min.getFullYear(), min.getMonth(), 1);
    while (cursor <= max) {
      gridMonths.push(new Date(cursor));
      cursor.setMonth(cursor.getMonth() + 1);
    }
    const monthLines = gridMonths.map(m => {
      const px = x(m);
      return `<line x1="${px}" y1="${padT - 12}" x2="${px}" y2="${h - 18}" class="chart-gridline gantt-line"/><text x="${px}" y="${padT - 18}" text-anchor="middle" class="chart-axis">${m.getMonth() + 1}月</text>`;
    }).join('');
    const bars = rows.map((m, i) => {
      const y = padT + i * rowH + 8;
      const x1 = x(m.planned_start || min);
      const x2 = x(m.planned_end || max);
      const statusClass = m.status === 'done' ? 'gantt-done' : m.status === 'doing' ? 'gantt-doing' : 'gantt-todo';
      const label = m.name.length > 8 ? m.name.slice(0, 8) + '…' : m.name;
      return `<text x="${padL - 10}" y="${y + rowH / 2 + 4}" text-anchor="end" class="gantt-label">${label}</text>` +
        `<rect x="${x1}" y="${y}" width="${Math.max(6, x2 - x1)}" height="${rowH - 12}" rx="7" class="${statusClass}"><title>${m.name}: ${m.planned_start} ~ ${m.planned_end} (${m.status})</title></rect>` +
        (m.status === 'done' && m.completed_at ? `<circle cx="${x2 + 8}" cy="${y + (rowH - 12) / 2}" r="5" class="gantt-dot"><title>完成于 ${m.completed_at}</title></circle>` : '');
    }).join('');
    return svgWrap(`${monthLines}${bars}`, w, h);
  }

  function progressRing(percent, size = 148, label = '') {
    const r = 58, c = 2 * Math.PI * r;
    const pct = Math.max(0, Math.min(100, Number(percent) || 0));
    return `<div class="progress-ring" style="width:${size}px;height:${size}px">
      <svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
        <circle cx="${size / 2}" cy="${size / 2}" r="${r}" class="ring-track"/>
        <circle cx="${size / 2}" cy="${size / 2}" r="${r}" class="ring-bar" stroke-dasharray="${c}" stroke-dashoffset="${c - (pct / 100) * c}"/>
      </svg>
      <div class="ring-center"><b>${pct}%</b>${label ? `<span>${label}</span>` : ''}</div>
    </div>`;
  }

  async function exportPng(container) {
    const svg = container.querySelector('svg');
    if (!svg) throw new Error('未找到图表');
    const clone = svg.cloneNode(true);
    const rect = svg.getBoundingClientRect();
    const width = Math.max(600, Math.ceil(rect.width || svg.viewBox.baseVal.width));
    const height = Math.max(240, Math.ceil(rect.height || svg.viewBox.baseVal.height));
    const css = Array.from(document.styleSheets).map(s => {
      try { return Array.from(s.cssRules).map(r => r.cssText).join(''); } catch { return ''; }
    }).join('');
    const style = document.createElement('style');
    style.textContent = css;
    clone.prepend(style);
    const serialized = new XMLSerializer().serializeToString(clone);
    const url = URL.createObjectURL(new Blob([serialized], { type: 'image/svg+xml;charset=utf-8' }));
    const img = new Image();
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = url;
    });
    const canvas = document.createElement('canvas');
    canvas.width = width * 2;
    canvas.height = height * 2;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = getComputedStyle(document.body).backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    URL.revokeObjectURL(url);
    return canvas.toDataURL('image/png');
  }

  return { lineChart, barChart, pieChart, ganttChart, progressRing, exportPng, PALETTE };
})();
