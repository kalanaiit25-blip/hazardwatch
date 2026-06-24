/* ===================================================================
   app.js — Application logic: navigation, rendering, prediction, map
   =================================================================== */

let currentLayer = 'flood';
let selectedDistrict = null;
const initialized = new Set();

// ── Helpers ──
function riskLevel(v) {
  if (v >= 0.75) return { txt: 'Critical', bg: 'rgba(226,75,74,0.12)', c: '#a32d2d', solid: '#d85a30' };
  if (v >= 0.50) return { txt: 'High', bg: 'rgba(186,117,23,0.12)', c: '#854f0b', solid: '#ba7517' };
  if (v >= 0.25) return { txt: 'Medium', bg: 'rgba(55,138,221,0.12)', c: '#185fa5', solid: '#378add' };
  return { txt: 'Low', bg: 'rgba(29,158,117,0.12)', c: '#0f6e56', solid: '#1d9e75' };
}
function layerColor(v) {
  if (currentLayer === 'flood') return riskLevel(v).solid;
  if (currentLayer === 'land') {
    if (v >= 0.75) return '#534ab7'; if (v >= 0.5) return '#7f77dd';
    if (v >= 0.25) return '#afa9ec'; return '#cecbf6';
  }
  if (v >= 0.5) return '#8b00ff'; if (v >= 0.25) return '#b950a0'; return '#e6a0d2';
}
function layerVal(d) {
  if (currentLayer === 'flood') return d.flood;
  if (currentLayer === 'land') return d.land;
  return (d.flood + d.land) / 2;
}

// ── Navigation ──
function initNav() {
  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const page = tab.dataset.page;
      document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById('page-' + page).classList.add('active');
      if (!initialized.has(page)) { renderPage(page); initialized.add(page); }
    });
  });
}

function renderPage(page) {
  switch (page) {
    case 'overview': renderOverview(); break;
    case 'map': renderMap(); break;
    case 'predict': renderPredict(); break;
    case 'models': renderModels(); break;
    case 'features': renderFeatures(); break;
    case 'scalability': renderScalability(); break;
    case 'ditwah': renderDitwah(); break;
    case 'data': renderData(); break;
    case 'research': renderResearch(); break;
  }
}

// ── Overview ──
function renderOverview() {
  chartOverviewAuc(); chartOverviewPrauc(); chartOverviewTime();
  const rows = CV_RESULTS.map((r, i) => `
    <tr${i % 2 ? ' style="background:var(--surface-2)"' : ''}>
      <td>${r.model}</td>
      <td style="text-align:right">${r.aucMean.toFixed(4)}</td>
      <td style="text-align:right">±${r.aucStd.toFixed(4)}</td>
      <td style="text-align:right">[${r.ciLo.toFixed(4)}, ${r.ciHi.toFixed(4)}]</td>
      <td style="text-align:right">${r.apMean.toFixed(4)}</td>
    </tr>`).join('');
  document.getElementById('cvTable').innerHTML = `
    <table><tr><th>Model</th><th style="text-align:right">AUC</th><th style="text-align:right">±std</th><th style="text-align:right">95% CI</th><th style="text-align:right">AP</th></tr>${rows}</table>`;
}

// ── Map ──
function renderMap() {
  drawMap();
  buildDistrictList();
  showOverviewDetail();
  chartForecast(null);
  initMapSearch();
  document.querySelectorAll('.layer-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      currentLayer = btn.dataset.layer;
      document.querySelectorAll('.layer-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      drawMap(); buildDistrictList();
    });
  });
}

const SL_OUTLINE = [[170,12],[182,32],[210,48],[232,75],[242,105],[245,140],[236,170],[242,200],[248,235],[252,278],[250,318],[236,348],[218,376],[204,402],[184,428],[160,452],[136,466],[116,460],[98,444],[80,422],[66,396],[56,366],[50,336],[46,306],[50,276],[57,246],[64,216],[68,186],[64,156],[58,126],[68,98],[86,72],[108,48],[136,26],[158,14],[170,12]];

function drawMap() {
  const svg = document.getElementById('mapSvg');
  if (!svg) return;
  const dark = isDark();
  const bg = dark ? '#0b1117' : '#e8f4f8';
  const land = dark ? '#1a2530' : '#f0f7f0';
  const stroke = dark ? '#2e3f50' : '#c8dde8';
  const txt = dark ? '#9aa7b2' : '#6b8a9a';

  let html = `<rect width="360" height="540" fill="${bg}" rx="8"/>`;
  html += `<text x="12" y="22" fill="${txt}" font-size="10" font-family="Inter">Indian Ocean</text>`;
  html += `<text x="258" y="510" fill="${txt}" font-size="10" font-family="Inter">Bay of Bengal</text>`;
  html += `<polygon points="${SL_OUTLINE.map(p => p.join(',')).join(' ')}" fill="${land}" stroke="${stroke}" stroke-width="1.2"/>`;

  DISTRICTS.forEach(d => {
    const v = layerVal(d);
    const r = Math.sqrt(d.pop / 752000) * 22 + 9;
    const c = layerColor(v);
    const sel = selectedDistrict && selectedDistrict.name === d.name;
    const cRgba = hexToRgba(c, 0.18);
    html += `
      <circle cx="${d.x}" cy="${d.y}" r="${r + 4}" fill="${cRgba}"/>
      <circle cx="${d.x}" cy="${d.y}" r="${r}" fill="${c}" stroke="${sel ? '#fff' : 'rgba(255,255,255,0.5)'}" stroke-width="${sel ? 2.5 : 1}"
        class="map-dot" data-name="${d.name}" style="cursor:pointer"/>
      <text x="${d.x}" y="${d.y + 3.5}" text-anchor="middle" fill="#fff" font-size="9" font-weight="500" font-family="Inter" pointer-events="none">${d.name.substring(0, 3)}</text>`;
  });

  const legendColors = currentLayer === 'land'
    ? [['#534ab7','Crit'],['#7f77dd','High'],['#afa9ec','Med'],['#cecbf6','Low']]
    : currentLayer === 'compound'
    ? [['#8b00ff','Crit'],['#b950a0','High'],['#e6a0d2','Med'],['#f0d0e8','Low']]
    : [['#d85a30','Crit'],['#ba7517','High'],['#378add','Med'],['#1d9e75','Low']];
  html += `<text x="14" y="470" fill="${txt}" font-size="9" font-family="Inter">${currentLayer} risk</text>`;
  legendColors.forEach((lc, i) => {
    html += `<rect x="${14 + i * 42}" y="478" width="18" height="11" rx="2" fill="${lc[0]}"/>
      <text x="${14 + i * 42 + 9}" y="500" text-anchor="middle" fill="${txt}" font-size="8" font-family="Inter">${lc[1]}</text>`;
  });
  html += `<text x="180" y="528" text-anchor="middle" fill="${txt}" font-size="8.5" font-family="Inter">XGBoost + PySpark RF · RGU 2506651</text>`;

  svg.innerHTML = html;

  svg.querySelectorAll('.map-dot').forEach(dot => {
    dot.addEventListener('click', () => selectDistrict(dot.dataset.name));
    dot.addEventListener('mouseenter', e => showMapTip(e, dot.dataset.name));
    dot.addEventListener('mouseleave', hideMapTip);
  });
}

function hexToRgba(hex, a) {
  if (hex.startsWith('rgb')) return hex;
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

function showMapTip(e, name) {
  const d = DISTRICTS.find(x => x.name === name);
  const tip = document.getElementById('mapTip');
  const fl = riskLevel(d.flood), ll = riskLevel(d.land);
  tip.innerHTML = `
    <div style="font-weight:600;margin-bottom:6px">${d.name}</div>
    <div style="font-size:11px;color:var(--text-2);margin-bottom:6px">${d.province} Province</div>
    <div style="display:flex;justify-content:space-between;gap:16px"><span style="color:var(--text-2)">Flood</span><span style="color:${fl.c};font-weight:500">${(d.flood*100).toFixed(0)}% ${fl.txt}</span></div>
    <div style="display:flex;justify-content:space-between;gap:16px"><span style="color:var(--text-2)">Landslide</span><span style="color:${ll.c};font-weight:500">${(d.land*100).toFixed(0)}% ${ll.txt}</span></div>
    <div style="display:flex;justify-content:space-between;gap:16px"><span style="color:var(--text-2)">Rainfall</span><span>${d.rain} mm</span></div>`;
  const card = e.target.closest('.map-card');
  const rect = card.getBoundingClientRect();
  const dotRect = e.target.getBoundingClientRect();
  tip.style.left = (dotRect.left - rect.left + 20) + 'px';
  tip.style.top = (dotRect.top - rect.top) + 'px';
  tip.style.display = 'block';
}
function hideMapTip() { document.getElementById('mapTip').style.display = 'none'; }

function buildDistrictList() {
  const sorted = [...DISTRICTS].sort((a, b) => layerVal(b) - layerVal(a));
  document.getElementById('districtList').innerHTML = sorted.map(d => {
    const fl = riskLevel(d.flood), ll = riskLevel(d.land);
    const sel = selectedDistrict && selectedDistrict.name === d.name;
    const tag = d.flood > 0.5 && d.land > 0.5 ? 'Compound' : d.flood >= 0.5 ? 'Flood risk' : d.land >= 0.5 ? 'Slide risk' : 'Moderate';
    const tagCls = d.flood > 0.5 && d.land > 0.5 ? 'b-purple' : d.flood >= 0.5 ? 'b-red' : d.land >= 0.5 ? 'b-amber' : 'b-blue';
    return `<div class="dist-item ${sel ? 'active' : ''}" data-name="${d.name}">
      <div class="dist-head"><span class="dist-name">${d.name}</span><span class="badge ${tagCls}">${tag}</span></div>
      <div class="dist-bars">
        <div class="bar-row"><span class="bar-lbl">Flood</span><div class="bar-track"><div class="bar-fill" style="width:${d.flood*100}%;background:${fl.solid}"></div></div><span class="bar-val">${(d.flood*100).toFixed(0)}%</span></div>
        <div class="bar-row"><span class="bar-lbl">Landslide</span><div class="bar-track"><div class="bar-fill" style="width:${d.land*100}%;background:${ll.solid}"></div></div><span class="bar-val">${(d.land*100).toFixed(0)}%</span></div>
      </div>
    </div>`;
  }).join('');
  document.querySelectorAll('.dist-item').forEach(item => {
    item.addEventListener('click', () => selectDistrict(item.dataset.name));
  });
}

function selectDistrict(name) {
  selectedDistrict = DISTRICTS.find(d => d.name === name);
  document.getElementById('selDistrict').textContent = `${selectedDistrict.name}, ${selectedDistrict.province} Province`;
  showDistrictDetail(selectedDistrict);
  chartForecast(selectedDistrict);
  drawMap(); buildDistrictList();
}

function showDistrictDetail(d) {
  const fl = riskLevel(d.flood), ll = riskLevel(d.land);
  const comp = (d.flood + d.land) / 2; const cl = riskLevel(comp);
  document.getElementById('districtDetail').innerHTML = `
    <div class="kpi"><div class="kpi-label">Flood risk</div><div class="kpi-val" style="color:${fl.c}">${(d.flood*100).toFixed(0)}%</div><div class="kpi-sub">${fl.txt}</div></div>
    <div class="kpi"><div class="kpi-label">Landslide risk</div><div class="kpi-val" style="color:${ll.c}">${(d.land*100).toFixed(0)}%</div><div class="kpi-sub">${ll.txt}</div></div>
    <div class="kpi"><div class="kpi-label">7-day rainfall</div><div class="kpi-val">${d.rain}</div><div class="kpi-sub">mm</div></div>
    <div class="kpi"><div class="kpi-label">Compound risk</div><div class="kpi-val" style="color:${cl.c}">${(comp*100).toFixed(0)}%</div><div class="kpi-sub">${d.flood>0.5&&d.land>0.5?'Active':'Inactive'}</div></div>`;
}

function showOverviewDetail() {
  const floodCells = Math.round(53945 * 0.028);
  const landCells = Math.round(53945 * 0.082);
  document.getElementById('districtDetail').innerHTML = `
    <div class="kpi"><div class="kpi-label">Flood-risk cells</div><div class="kpi-val" style="color:var(--flood)">${floodCells.toLocaleString()}</div><div class="kpi-sub">2.8% of grid</div></div>
    <div class="kpi"><div class="kpi-label">Landslide-risk cells</div><div class="kpi-val" style="color:var(--land)">${landCells.toLocaleString()}</div><div class="kpi-sub">8.2% of grid</div></div>
    <div class="kpi"><div class="kpi-label">Active alerts</div><div class="kpi-val" style="color:#a32d2d">5</div><div class="kpi-sub">2 critical · 2 warning</div></div>
    <div class="kpi"><div class="kpi-label">Model AUC</div><div class="kpi-val">0.922</div><div class="kpi-sub">PR-AUC 0.665</div></div>`;
}

function initMapSearch() {
  const input = document.getElementById('mapSearch');
  const results = document.getElementById('searchResults');
  input.addEventListener('input', () => {
    const q = input.value.trim().toLowerCase();
    if (!q) { results.style.display = 'none'; return; }
    const matches = DISTRICTS.filter(d => d.name.toLowerCase().includes(q) || d.province.toLowerCase().includes(q)).slice(0, 5);
    if (!matches.length) { results.style.display = 'none'; return; }
    results.style.display = 'block';
    results.innerHTML = matches.map(d => {
      const fl = riskLevel(d.flood);
      return `<div class="search-item" data-name="${d.name}">
        <i class="ti ti-map-pin" style="color:var(--text-2)"></i>
        <div style="flex:1"><div style="font-size:13px">${d.name}</div><div style="font-size:11px;color:var(--text-2)">${d.province} · Flood ${(d.flood*100).toFixed(0)}%</div></div>
        <span class="badge ${fl.txt==='Critical'?'b-red':fl.txt==='High'?'b-amber':'b-blue'}">${fl.txt}</span>
      </div>`;
    }).join('');
    results.querySelectorAll('.search-item').forEach(item => {
      item.addEventListener('click', () => {
        input.value = item.dataset.name;
        results.style.display = 'none';
        selectDistrict(item.dataset.name);
      });
    });
  });
  document.addEventListener('click', e => {
    if (!e.target.closest('.search-wrap')) results.style.display = 'none';
  });
}

// ── Predict ──
function renderPredict() {
  const grid = document.getElementById('sliderGrid');
  grid.innerHTML = Object.keys(FEAT_META).map(f => {
    const m = FEAT_META[f];
    const dp = m.step < 1 ? 2 : 0;
    return `<div class="slider-item">
      <div class="slider-top"><label>${m.label}</label><span id="sv-${f}">${m.def.toFixed(dp)}</span></div>
      <input type="range" id="sl-${f}" min="${m.min}" max="${m.max}" step="${m.step}" value="${m.def}">
    </div>`;
  }).join('');
  Object.keys(FEAT_META).forEach(f => {
    const sl = document.getElementById('sl-' + f);
    const dp = FEAT_META[f].step < 1 ? 2 : 0;
    sl.addEventListener('input', () => { document.getElementById('sv-' + f).textContent = parseFloat(sl.value).toFixed(dp); });
  });
  document.getElementById('presetSel').addEventListener('change', loadPreset);
  document.getElementById('predictBtn').addEventListener('click', runPredict);
}

function loadPreset() {
  const p = PRESETS[document.getElementById('presetSel').value];
  Object.keys(FEAT_META).forEach(f => {
    const sl = document.getElementById('sl-' + f);
    if (sl && p[f] !== undefined) {
      sl.value = p[f];
      const dp = FEAT_META[f].step < 1 ? 2 : 0;
      document.getElementById('sv-' + f).textContent = parseFloat(p[f]).toFixed(dp);
    }
  });
}

function sigmoid(x) { return 1 / (1 + Math.exp(-x)); }

function runPredict() {
  const vals = {};
  Object.keys(FEAT_META).forEach(f => { vals[f] = parseFloat(document.getElementById('sl-' + f).value); });
  let sF = 0, sL = 0;
  Object.keys(FEAT_META).forEach(f => {
    const z = (vals[f] - FEAT_STATS.means[f]) / FEAT_STATS.stds[f];
    sF += (FI.flood[f] || 0) * z;
    sL += (FI.land[f] || 0) * z;
  });
  const fp = clamp(sigmoid(sF * 3 + 0.1));
  const lp = clamp(sigmoid(sL * 3 - 0.2));
  const compound = fp > 0.5 && lp > 0.5;
  const fl = riskLevel(fp), ll = riskLevel(lp);
  const modelName = document.getElementById('modelSel').selectedOptions[0].text;

  document.getElementById('predictResult').innerHTML = `
    <div class="card-head"><i class="ti ti-activity"></i> Risk assessment — ${modelName}</div>
    ${compound ? '<div class="compound-alert"><i class="ti ti-alert-triangle"></i> Compound hazard — both thresholds exceeded</div>' : ''}
    <div class="risk-grid">
      <div class="risk-cell" style="background:${fl.bg}"><div class="risk-cell-lbl" style="color:${fl.c}">Flood risk</div><div class="risk-cell-val" style="color:${fl.c}">${(fp*100).toFixed(0)}%</div><div class="risk-cell-tag" style="color:${fl.c}">${fl.txt}</div></div>
      <div class="risk-cell" style="background:${ll.bg}"><div class="risk-cell-lbl" style="color:${ll.c}">Landslide risk</div><div class="risk-cell-val" style="color:${ll.c}">${(lp*100).toFixed(0)}%</div><div class="risk-cell-tag" style="color:${ll.c}">${ll.txt}</div></div>
    </div>
    <div class="driver-box">
      <div style="margin-bottom:5px"><b>Top flood drivers:</b> slope (16.2%) · TWI (12.8%) · bulk density (11.8%)</div>
      <div><b>Top landslide drivers:</b> slope (28.2%) · elevation (17.8%) · SPI (9.6%)</div>
    </div>`;
}

// ── Models ──
function renderModels() {
  const header = `<tr><th>Model</th><th>Target</th><th>AUC</th><th>F1</th><th>Prec</th><th>Recall</th><th>Arch</th><th>Time (s)</th></tr>`;
  const maxPrauc = Math.max(...MODELS.filter(m => m.target === 'flood_risk').map(m => m.prauc));
  const rows = MODELS.map(m => {
    const hi = m.target === 'flood_risk' && m.prauc === maxPrauc;
    return `<tr class="${hi ? 'highlight' : ''}">
      <td>${m.model}</td>
      <td><span class="badge ${m.target === 'flood_risk' ? 'b-blue' : 'b-purple'}">${m.target === 'flood_risk' ? 'flood' : 'slide'}</span></td>
      <td>${m.auc.toFixed(4)}</td><td>${m.f1.toFixed(4)}</td><td>${m.prec.toFixed(4)}</td><td>${m.rec.toFixed(4)}</td>
      <td class="${m.arch === 'distributed' ? 'arch-dist' : 'arch-cent'}">${m.arch === 'distributed' ? 'dist' : 'cent'}</td>
      <td>${m.time.toFixed(1)}</td>
    </tr>`;
  }).join('');
  document.getElementById('modelTable').innerHTML = header + rows;
  chartModelMetric('mdlAuc', 'auc', 0.88, 0.935);
  chartModelMetric('mdlF1', 'f1', 0.85, 0.975);
}

// ── Features ──
function renderFeatures() {
  const sel = document.getElementById('fiTarget');
  if (!sel.dataset.bound) { sel.addEventListener('change', renderFeatures); sel.dataset.bound = '1'; }
  const tgt = sel.value;
  const fi = FI[tgt];
  const sorted = Object.entries(fi).sort((a, b) => b[1] - a[1]);
  const maxV = sorted[0][1];
  const main = tgt === 'flood' ? '#d85a30' : '#534ab7';
  const lite = tgt === 'flood' ? '#f0997b' : '#afa9ec';
  document.getElementById('featList').innerHTML = sorted.map(([k, v], i) => `
    <div class="feat-row">
      <span class="feat-name">${FEAT_META[k] ? FEAT_META[k].label : k}</span>
      <span class="feat-src"><span class="badge b-blue">${FEAT_META[k] ? FEAT_META[k].src : '—'}</span></span>
      <div class="feat-track"><div class="feat-bar" style="width:${(v/maxV*100).toFixed(0)}%;background:${i < 5 ? main : lite}"></div></div>
      <span class="feat-val">${(v*100).toFixed(1)}%</span>
    </div>`).join('');

  const top5F = new Set(Object.entries(FI.flood).sort((a, b) => b[1] - a[1]).slice(0, 5).map(x => x[0]));
  const top5L = new Set(Object.entries(FI.land).sort((a, b) => b[1] - a[1]).slice(0, 5).map(x => x[0]));
  const shared = [...top5F].filter(x => top5L.has(x));
  document.getElementById('sharedDrivers').innerHTML = `
    <div class="chips">${shared.map(k => `<span class="chip"><i class="ti ti-star"></i> ${k}</span>`).join('')}</div>
    <p class="muted">Shared top-5 drivers: <b>${shared.join(', ')}</b>. slope and bulk_density appear in both — confirms shared physical triggers underpinning compound hazard co-occurrence.</p>`;

  const cd = CORRELATIONS[tgt] || CORRELATIONS.flood;
  document.getElementById('corrList').innerHTML = Object.entries(cd).map(([k, v]) => {
    const leak = k === 'jrc_occurrence';
    return `<div class="feat-row" ${leak ? 'style="background:rgba(226,75,74,0.08);border-radius:5px;padding:4px 6px"' : ''}>
      <span class="feat-name" ${leak ? 'style="color:#a32d2d;font-weight:500"' : ''}>${leak ? '⚠ ' + k : k}</span>
      <div class="feat-track"><div class="feat-bar" style="width:${(v*100).toFixed(0)}%;background:${v > 0.65 ? '#e24b4a' : '#378add'}"></div></div>
      <span class="feat-val">${v.toFixed(3)}</span>
    </div>`;
  }).join('');
}

// ── Scalability ──
function renderScalability() {
  chartScalability();
  const mkRows = arr => arr.map((d, i) => `
    <div class="scale-row">
      <span style="width:42px;flex-shrink:0;font-weight:500">${d.frac}%</span>
      <span style="width:58px;flex-shrink:0;color:var(--text-2)">${d.n.toLocaleString()}</span>
      <span style="width:58px;flex-shrink:0;color:var(--dist)">${d.sparkT}s</span>
      <span style="width:58px;flex-shrink:0;color:var(--cent)">${d.sklT}s</span>
      <span style="width:54px;flex-shrink:0">${d.sparkAuc.toFixed(4)}</span>
      <span style="width:54px;color:var(--cent)">${d.sklAuc.toFixed(4)}</span>
      <span class="badge ${(d.sparkT/d.sklT) < 5 ? 'b-amber' : 'b-red'}">${(d.sparkT/d.sklT).toFixed(1)}×</span>
    </div>`).join('');
  const head = `<div class="scale-row head"><span style="width:42px">%</span><span style="width:58px">N</span><span style="width:58px;color:var(--dist)">Spark</span><span style="width:58px;color:var(--cent)">sklearn</span><span style="width:54px">S-AUC</span><span style="width:54px">SK-AUC</span><span>ratio</span></div>`;
  document.getElementById('scaleFlood').innerHTML = head + mkRows(SCALABILITY.flood);
  document.getElementById('scaleLand').innerHTML = head + mkRows(SCALABILITY.land);
}

// ── Ditwah ──
function renderDitwah() {
  const header = `<tr><th>Class</th><th style="text-align:right">Prec</th><th style="text-align:right">Recall</th><th style="text-align:right">F1</th><th style="text-align:right">Support</th></tr>`;
  const rows = DITWAH_REPORT.map((r, i) => `
    <tr${i % 2 ? ' style="background:var(--surface-2)"' : ''}>
      <td style="font-weight:${r.cls === 'Risk' ? '500' : '400'}">${r.cls}</td>
      <td style="text-align:right;${r.cls === 'Risk' ? 'color:var(--flood);font-weight:500' : ''}">${r.prec.toFixed(2)}</td>
      <td style="text-align:right;${r.cls === 'Risk' ? 'color:var(--flood);font-weight:500' : ''}">${r.rec.toFixed(2)}</td>
      <td style="text-align:right;${r.cls === 'Risk' ? 'color:var(--flood);font-weight:500' : ''}">${r.f1.toFixed(2)}</td>
      <td style="text-align:right">${r.support}</td>
    </tr>`).join('');
  document.getElementById('ditwahReport').innerHTML = header + rows;
}

// ── Data ──
function renderData() {
  const header = `<tr><th>Feature</th><th>Description</th><th>Source</th><th>Null %</th></tr>`;
  const rows = DATA_SOURCES.map((r, i) => `
    <tr${i % 2 ? ' style="background:var(--surface-2)"' : ''}>
      <td style="font-family:var(--mono);font-size:11px">${r.f}</td>
      <td style="color:var(--text-2)">${r.desc}</td>
      <td><span class="badge b-blue">${r.src}</span></td>
      <td><span class="badge b-green">${r.null}</span></td>
    </tr>`).join('');
  document.getElementById('dataTable').innerHTML = header + rows;
  chartDataSrc();
}

// ── Research ──
function renderResearch() {
  document.getElementById('rqList').innerHTML = RESEARCH_QS.map(r => `
    <div class="rq-card">
      <div class="rq-num">${r.n} · Objective ${r.obj}</div>
      <div class="rq-q">${r.q}</div>
      <div class="rq-a">${r.a}</div>
      <div class="rq-foot">
        <span class="rq-status ${r.status === 'answered' ? 'b-green' : 'b-amber'}">
          <i class="ti ti-${r.status === 'answered' ? 'check' : 'alert-circle'}"></i>
          ${r.status === 'answered' ? 'Fully answered' : 'Partially answered — n=21 caveat'}
        </span>
      </div>
    </div>`).join('');
}

// ── Theme toggle ──
function initTheme() {
  const saved = 'light';
  document.documentElement.setAttribute('data-theme', saved);
  document.getElementById('themeToggle').addEventListener('click', () => {
    const cur = document.documentElement.getAttribute('data-theme');
    const next = cur === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    document.getElementById('themeToggle').innerHTML = next === 'dark'
      ? '<i class="ti ti-sun"></i>' : '<i class="ti ti-moon"></i>';
    // redraw active page charts
    initialized.forEach(p => {
      const active = document.getElementById('page-' + p).classList.contains('active');
      if (active) renderPage(p);
    });
    if (document.getElementById('page-map').classList.contains('active')) drawMap();
  });
}

// ── Live clock ──
function initClock() {
  const update = () => {
    const t = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    document.getElementById('liveTime').textContent = `Live · updated ${t}`;
  };
  update(); setInterval(update, 60000);
}

// ── Boot ──
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initNav();
  initClock();
  renderMap();
  initialized.add('map');
});
