/* ===================================================================
   app.js — Application logic: navigation, page rendering, map, predict
   Single source of truth for all rendering (index.html no longer has
   inline duplicate copies of any of this).

   FIXES (v5) vs. the previous app.js / inline scripts:
   1. Map now reads the REAL DS_DIVISIONS field names from data.js
      (ds_division, district, province, lat, lon, flood_prob, ...)
      instead of a made-up schema (admin_district, flood_rate, ...)
      that didn't exist anywhere in the actual data — this is why
      every marker previously rendered at NaN,NaN with district "NA".
   2. Predict tab performs a REAL nearest-neighbour lookup against
      DS_DIVISIONS' actual model-predicted probabilities. It does not
      invent a coefficient formula — if you change the sliders, you
      see the closest real predicted outcome from the trained models,
      labelled as such.
   =================================================================== */

const initializedPages = new Set();

function esc(v){ return String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function pct(v, dp=1){ return (Number(v)||0).toFixed(dp) + '%'; }
function riskBadge(cat){
  const c = String(cat || 'No Observed Risk');
  const cls = c.includes('Compound') ? 'badge-compound' : c.includes('High') ? 'badge-high' :
              c.includes('Moderate') ? 'badge-moderate' : c.includes('Low') ? 'badge-low' : 'badge-none';
  return `<span class="risk-cat-badge ${cls}">${esc(c)}</span>`;
}

/* ── Navigation ─────────────────────────────────────────────────────── */
function initNav(){
  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const page = tab.dataset.page;
      document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      const pageEl = document.getElementById('page-' + page);
      if(pageEl) pageEl.classList.add('active');
      if(!initializedPages.has(page)){ renderPage(page); initializedPages.add(page); }
      if(page === 'map' && window.hwMap) setTimeout(() => window.hwMap.invalidateSize(), 120);
    });
  });
}

function renderPage(page){
  switch(page){
    case 'overview':     return renderOverview();
    case 'map':          return renderMap();
    case 'predict':      return renderPredict();
    case 'models':       return renderModels();
    case 'features':     return renderFeatures();
    case 'scalability':  return renderScalability();
    case 'ditwah':       return renderDitwah();
    case 'geography':    return renderGeography();
    case 'data':         return renderData();
    case 'research':     return renderResearch();
  }
}

/* ── Overview ───────────────────────────────────────────────────────── */
function renderOverview(){
  const s = SUMMARY_STATS || {};
  const set = (id, val) => { const el = document.getElementById(id); if(el) el.textContent = val; };
  set('statCells', Number(s.total_cells||0).toLocaleString());
  set('statDS', Number(s.n_ds_divisions||0).toLocaleString());
  set('statDistricts', Number(s.n_districts||0).toLocaleString());
  set('statFloodModel', s.best_flood_model || 'N/A');
  set('statFloodPR', Number(s.best_flood_pr_auc||0).toFixed(4));
  set('statLandModel', s.best_landslide_model || 'N/A');
  set('statLandPR', Number(s.best_landslide_pr_auc||0).toFixed(4));
  if(typeof chartOverviewAuc === 'function') chartOverviewAuc('flood');
  if(typeof chartOverviewPrauc === 'function') chartOverviewPrauc('flood');
  if(typeof chartOverviewTime === 'function') chartOverviewTime('flood');
}

/* ── Live Map ───────────────────────────────────────────────────────── */
/* NOTE: mode key is 'land' (not 'landslide') to match the existing markup's
   button ids (hw-btn-land) and onclick="hwSetMode('land',this)" calls. */
let hwMap = null, hwMarkers = [], hwMode = 'flood';
let HW_D = [];

const HW_CFG = {
  flood:    { field: 'flood_prob',      cols:['#1b7c5e','#1a6fba','#a35f0a','#b91c1c'], title:'Flood risk (model probability)' },
  land:     { field: 'landslide_prob',  cols:['#1b7c5e','#8a9ecf','#7c5226','#4c3000'], title:'Landslide risk (model probability)' },
  compound: { field: 'compound_risk',   cols:['#1b7c5e','#c084fc','#8a5c0f','#b91c1c'], title:'Compound hazard (max of both)' },
};
const HW_T = [0.15, 0.40, 0.70]; // Low / Moderate / High thresholds, shared across modes (all fields are 0-1 probabilities)

function hwColor(v){
  if(v >= HW_T[2]) return 3;
  if(v >= HW_T[1]) return 2;
  if(v >= HW_T[0]) return 1;
  return 0;
}

function renderMap(){
  const el = document.getElementById('hwLeafletMap');
  if(!el || typeof L === 'undefined') return;
  HW_D = (typeof DS_DIVISIONS !== 'undefined' ? DS_DIVISIONS : []).filter(d => d.lat != null && d.lon != null);
  if(!HW_D.length){ el.innerHTML = '<p class="muted" style="padding:20px">No DS division data with coordinates available.</p>'; return; }

  if(!hwMap){
    hwMap = L.map('hwLeafletMap', { center:[7.87,80.77], zoom:7, zoomControl:false });
    L.control.zoom({ position:'bottomright' }).addTo(hwMap);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:'&copy; OpenStreetMap contributors', maxZoom:19
    }).addTo(hwMap);
    hwMap.fitBounds([[5.8,79.4],[9.9,81.9]]);
    window.hwMap = hwMap;
  }
  hwDraw('flood');
  hwBuildList('flood');
  setTimeout(() => hwMap.invalidateSize(), 100);
}

function hwDraw(mode){
  if(!hwMap) return;
  hwMode = mode;
  hwMarkers.forEach(m => hwMap.removeLayer(m));
  hwMarkers = [];
  const cfg = HW_CFG[mode];
  HW_D.forEach(d => {
    const v = Number(d[cfg.field]) || 0;
    const col = cfg.cols[hwColor(v)];
    const r = Math.round(5 + Math.min(1, v) * 15);
    const mk = L.circleMarker([d.lat, d.lon], {
      radius: r, fillColor: col, color: col, weight: 1, opacity: 0.9, fillOpacity: 0.75,
    }).addTo(hwMap)
      .bindPopup(hwPopup(d))
      .on('click', () => { hwShowDetail(d); if(typeof chartForecast==='function') chartForecast(d); });
    hwMarkers.push(mk);
  });
}

function hwPopup(d){
  return `<div class="hw-pop">
    <div class="hw-pop-name">${esc(d.ds_division)}</div>
    <div style="font-size:11px;color:var(--text-2);margin-bottom:6px;">${esc(d.district)} · ${esc(d.province)}</div>
    <div>Flood: <b>${pct((d.flood_prob||0)*100)}</b></div>
    <div>Landslide: <b>${pct((d.landslide_prob||0)*100)}</b></div>
    <div>Compound: <b>${pct((d.compound_risk||0)*100)}</b></div>
    <div style="margin-top:4px">${riskBadge(d.risk_category)}</div>
  </div>`;
}

function hwShowDetail(d){
  const card = document.getElementById('hw-detail-card');
  if(card) card.style.display = 'block';
  const header = document.getElementById('hw-sel-district');
  if(header) header.textContent = `${d.ds_division} — ${d.district}, ${d.province}`;
  const setBar = (valId, barId, val) => {
    const ve = document.getElementById(valId), be = document.getElementById(barId);
    if(ve) ve.textContent = pct(val*100);
    if(be) be.style.width = Math.min(100, val*100).toFixed(1)+'%';
  };
  setBar('hw-df','hw-dfb', d.flood_prob||0);
  setBar('hw-dl','hw-dlb', d.landslide_prob||0);
  setBar('hw-dc','hw-dcb', d.compound_risk||0);
}

/* Called from markup: onclick="hwSetMode('flood'|'land'|'compound', this)" */
function hwSetMode(mode, btn){
  ['flood','land','compound'].forEach(m => { const b=document.getElementById('hw-btn-'+m); if(b) b.classList.remove('active'); });
  if(btn) btn.classList.add('active');
  const lt = document.getElementById('hw-leg-title');
  if(lt) lt.textContent = HW_CFG[mode].title;
  hwDraw(mode);
  hwBuildList(mode);
}

function hwBuildList(mode){
  const el = document.getElementById('hw-district-list');
  if(!el) return;
  const field = HW_CFG[mode].field;
  const sorted = HW_D.slice().sort((a,b) => (b[field]||0) - (a[field]||0));
  el.innerHTML = sorted.map((d,i) => {
    const v = Number(d[field]) || 0;
    const col = HW_CFG[mode].cols[hwColor(v)];
    return `<div class="hw-ditem" data-nm="${esc(d.ds_division)}">
      <span class="hw-drank">${String(i+1).padStart(3,'0')}</span>
      <div class="hw-dcirc" style="background:${col}22;border:1.5px solid ${col};"><span style="color:${col};font-size:9px">${Math.round(v*100)}</span></div>
      <div class="hw-dinfo"><div class="hw-dname">${esc(d.ds_division)}</div>
        <div style="font-size:10px;color:var(--text-3)">${esc(d.district)}</div>
        <div class="hw-dpills">
          <span class="hw-pill" style="background:rgba(26,111,186,.12);color:var(--flood)">F:${pct((d.flood_prob||0)*100)}</span>
          <span class="hw-pill" style="background:rgba(138,92,15,.12);color:var(--land)">L:${pct((d.landslide_prob||0)*100)}</span>
        </div></div></div>`;
  }).join('');
  el.querySelectorAll('.hw-ditem').forEach(item => {
    item.addEventListener('click', () => hwFly(item.dataset.nm));
  });
}

function hwFly(name){
  const d = HW_D.find(x => x.ds_division === name);
  if(d && hwMap){ hwMap.flyTo([d.lat, d.lon], 10, {duration:1.0}); hwShowDetail(d); }
}

/* Called from markup: oninput="hwFilter(this.value)" */
function hwFilter(q){
  const ql = (q||'').toLowerCase();
  document.querySelectorAll('.hw-ditem').forEach(item => {
    item.style.display = item.textContent.toLowerCase().includes(ql) ? '' : 'none';
  });
}

/* ── Predict (REAL — nearest-neighbour against actual model output) ────
   The markup's sliders (rain, elev, slope, sm, rd, ndvi) come from the
   original design, but DS_DIVISIONS only carries real elevation/slope/
   rain_7d per division (see SCHEMA.md) — soil moisture and 'rd' aren't
   in the aggregated output, so they're kept as illustrative context
   inputs but are NOT invented into the match; only fields that exist in
   real data drive the nearest-division lookup. This replaces the old
   hwCompute() sigmoid formula, which fabricated risk scores from
   hand-picked coefficients rather than reading any trained model. */
const HW_S = { rain:120, elev:250, slope:12, sm:45, rd:8, ndvi:.42 };
const HW_PRESETS = {
  base:   { rain:120, elev:250,  slope:12, sm:45, rd:8,  ndvi:.42 },
  ditwah: { rain:350, elev:180,  slope:25, sm:85, rd:3,  ndvi:.28 },
  low:    { rain:200, elev:15,   slope:3,  sm:78, rd:2,  ndvi:.35 },
  dry:    { rain:50,  elev:1800, slope:8,  sm:20, rd:25, ndvi:.55 },
  hill:   { rain:280, elev:900,  slope:42, sm:72, rd:12, ndvi:.31 },
};
let hwCurModel = 'xgb'; // cosmetic only now — see note in hwRun()

function renderPredict(){
  hwPreset('base', document.getElementById('hw-p-base'));
}

/* Called from markup: oninput="hwUpd('elev'|'ndvi'|'rain'|'rd'|'slope'|'sm', this.value[, 1])" */
function hwUpd(k, v, isNDVI){
  if(isNDVI){ HW_S[k] = v/100; const el=document.getElementById('hw-v-'+k); if(el) el.textContent=(v/100).toFixed(2); }
  else       { HW_S[k] = parseFloat(v); const el=document.getElementById('hw-v-'+k); if(el) el.textContent=v; }
  document.querySelectorAll('.hw-pbtn').forEach(b => b.classList.remove('on'));
}

/* Called from markup: onclick="hwPreset('base'|'ditwah'|'dry'|'hill'|'low', this)" */
function hwPreset(key, btn){
  const p = HW_PRESETS[key];
  if(!p) return;
  Object.assign(HW_S, p);
  ['rain','elev','slope','sm','rd'].forEach(id => {
    const r = document.getElementById('hw-r-'+id), v = document.getElementById('hw-v-'+id);
    if(r) r.value = p[id]; if(v) v.textContent = p[id];
  });
  const rn = document.getElementById('hw-r-ndvi'), vn = document.getElementById('hw-v-ndvi');
  if(rn) rn.value = p.ndvi*100; if(vn) vn.textContent = p.ndvi.toFixed(2);
  document.querySelectorAll('.hw-pbtn').forEach(b => b.classList.remove('on'));
  if(btn) btn.classList.add('on');
}

/* Called from markup: onclick="hwModel('sk'|'sp'|'xgb', this)" — retained for
   UI continuity, no longer feeds a fabricated formula. */
function hwModel(m, btn){
  hwCurModel = m;
  document.querySelectorAll('.hw-mt').forEach(b => b.classList.remove('on'));
  if(btn) btn.classList.add('on');
}

function predictSeverity(v){
  if(v >= 0.70) return { lbl:'CRITICAL', col:'#a32d2d', bg:'rgba(226,75,74,.10)' };
  if(v >= 0.40) return { lbl:'HIGH',     col:'#854f0b', bg:'rgba(186,117,23,.10)' };
  if(v >= 0.15) return { lbl:'MEDIUM',   col:'#185fa5', bg:'rgba(55,138,221,.10)' };
  return              { lbl:'LOW',       col:'#0f6e56', bg:'rgba(29,158,117,.10)' };
}

/* Finds the real DS division whose actual (elevation, slope, rain_7d) is
   closest to the user's slider inputs and returns ITS real model-predicted
   probabilities — an honest nearest-neighbour lookup, not a synthetic score. */
function predictNearest(state){
  if(!HW_D.length) return null;
  const norm = (v, lo, hi) => Math.max(0, Math.min(1, (v-lo)/(hi-lo)));
  let best = null, bestDist = Infinity;
  for(const d of HW_D){
    const dr = norm(d.rain_7d,0,400)   - norm(state.rain,0,400);
    const de = norm(d.elevation,0,2500)- norm(state.elev,0,2500);
    const ds = norm(d.slope,0,60)      - norm(state.slope,0,60);
    const dist = dr*dr + de*de + ds*ds;
    if(dist < bestDist){ bestDist = dist; best = d; }
  }
  return best;
}

/* Called from markup: onclick="hwRun()" */
function hwRun(){
  if(!HW_D.length) HW_D = (typeof DS_DIVISIONS !== 'undefined' ? DS_DIVISIONS : []).filter(d => d.lat != null);
  const match = predictNearest(HW_S);
  const ph = document.getElementById('hw-res-ph'), gw = document.getElementById('hw-gauges');
  if(!match){ if(ph) ph.textContent = 'No division data available to match against.'; return; }
  if(ph) ph.style.display = 'none';
  if(gw) gw.style.display = 'block';

  const setGauge = (valId, barId, sevId, val) => {
    const c = predictSeverity(val);
    const ve = document.getElementById(valId), be = document.getElementById(barId), se = document.getElementById(sevId);
    if(ve){ ve.textContent = pct(val*100); ve.style.color = c.col; }
    if(be){ be.style.width = (val*100)+'%'; be.style.background = c.col; }
    if(se){ se.textContent = c.lbl; se.style.cssText = `background:${c.bg};color:${c.col};`; }
  };
  setGauge('hw-gv-f','hw-gf-f','hw-gs-f', match.flood_prob || 0);
  setGauge('hw-gv-l','hw-gf-l','hw-gs-l', match.landslide_prob || 0);
  setGauge('hw-gv-c','hw-gf-c','hw-gs-c', match.compound_risk || 0);

  const mb = document.getElementById('hw-mbadge');
  if(mb) mb.innerHTML = `Nearest real DS division to your inputs: <strong>${esc(match.ds_division)}</strong> (${esc(match.district)}) — showing its actual model-predicted probabilities, not a synthetic estimate.`;

  const ip = document.getElementById('hw-interp');
  if(ip){
    const cc = predictSeverity(match.compound_risk||0);
    const dom = (match.flood_prob||0) > (match.landslide_prob||0) ? 'flood' : 'landslide';
    ip.textContent = `${cc.lbl} compound risk, dominated by ${dom} risk, based on the closest-matching real DS division (${match.ds_division}).`;
    ip.style.borderColor = cc.col; ip.style.background = cc.bg;
  }
}

/* ── Models tab ─────────────────────────────────────────────────────── */
function renderModels(){
  const el = document.getElementById('modelTable');
  const models = (typeof MODELS !== 'undefined' ? MODELS : []);
  if(el){
    const rows = models.map(m => `<tr><td>${esc(m.model)}</td><td>${esc(m.target)}</td>
      <td>${Number(m.auc).toFixed(4)}</td><td>${Number(m.prauc ?? m.pr_auc ?? 0).toFixed(4)}</td>
      <td>${Number(m.f1).toFixed(4)}</td><td>${Number(m.prec).toFixed(4)}</td><td>${Number(m.rec).toFixed(4)}</td>
      <td><span class="${m.arch==='distributed'?'arch-dist':'arch-cent'}">${esc(m.arch)}</span></td>
      <td>${Number(m.time).toFixed(1)}</td></tr>`).join('');
    el.innerHTML = `<thead><tr><th>Model</th><th>Target</th><th>AUC</th><th>PR-AUC</th><th>F1</th><th>Prec</th><th>Recall</th><th>Arch</th><th>Time (s)</th></tr></thead><tbody>${rows}</tbody>`;
  }
  if(typeof chartModelMetric === 'function'){ chartModelMetric('mdlAuc','auc',0,1); chartModelMetric('mdlF1','f1',0,1); }
}

/* ── Features tab ───────────────────────────────────────────────────── */
function renderFeatures(){
  const sel = document.getElementById('fiTarget');
  if(!sel) return;
  if(!sel.dataset.bound){ sel.addEventListener('change', renderFeatures); sel.dataset.bound = '1'; }
  const tgt = sel.value || 'flood';
  const fi = (typeof FI !== 'undefined' ? FI : {});
  const meta = (typeof FEAT_META !== 'undefined' ? FEAT_META : {});
  const sorted = Object.entries(fi[tgt] || {}).sort((a,b) => b[1]-a[1]);
  const maxV = sorted.length ? sorted[0][1] : 1;
  const color = tgt === 'flood' ? '#1a6fba' : '#8a5c0f';
  const list = document.getElementById('featList');
  if(list){
    list.innerHTML = sorted.map(([k,v]) => `<div class="feat-row">
      <div class="feat-name">${esc(meta[k]?.label || k)}</div>
      <div class="feat-src"><span class="badge b-blue">${esc(meta[k]?.src || '—')}</span></div>
      <div class="feat-track"><div class="feat-bar" style="width:${(v/maxV*100).toFixed(1)}%;background:${color}"></div></div>
      <div class="feat-val">${(v*100).toFixed(1)}%</div></div>`).join('');
  }
  const corr = document.getElementById('corrList');
  const CORRELATIONS = (typeof window.CORRELATIONS !== 'undefined' ? window.CORRELATIONS : {});
  if(corr){
    corr.innerHTML = Object.entries(CORRELATIONS[tgt] || {}).map(([k,v]) =>
      `<div class="scale-row"><span>${esc(k)}</span><b>${Number(v).toFixed(3)}</b></div>`).join('');
  }
}

/* ── Scalability tab ────────────────────────────────────────────────── */
function renderScalability(){
  const SCAL = (typeof SCALABILITY !== 'undefined' ? SCALABILITY : {});
  if(typeof chartScalability === 'function') chartScalability('flood');
  const mk = arr => `<table class="data-table"><thead><tr><th>%</th><th>N</th><th>Spark</th><th>sklearn</th><th>S-AUC</th><th>SK-AUC</th></tr></thead>
    <tbody>${(arr||[]).map(d=>`<tr><td>${(Number(d.frac)*100).toFixed(0)}%</td><td>${Number(d.n).toLocaleString()}</td>
      <td>${d.sparkT}s</td><td>${d.sklT}s</td><td>${Number(d.sparkAuc).toFixed(4)}</td><td>${Number(d.sklAuc).toFixed(4)}</td></tr>`).join('')}</tbody></table>`;
  const f = document.getElementById('scaleFlood'), l = document.getElementById('scaleLand');
  if(f) f.innerHTML = mk(SCAL.flood);
  if(l) l.innerHTML = mk(SCAL.landslide);
}

/* ── Ditwah tab ─────────────────────────────────────────────────────── */
function renderDitwah(){
  const el = document.getElementById('ditwahReport');
  const rows = (typeof DITWAH_REPORT !== 'undefined' ? DITWAH_REPORT : []);
  if(el) el.innerHTML = `<thead><tr><th>Class</th><th>Prec</th><th>Recall</th><th>F1</th><th>Support</th></tr></thead>
    <tbody>${rows.map(r=>`<tr><td>${esc(r.cls)}</td><td>${Number(r.prec).toFixed(2)}</td><td>${Number(r.rec).toFixed(2)}</td><td>${Number(r.f1).toFixed(2)}</td><td>${esc(r.support)}</td></tr>`).join('')}</tbody>`;
}

/* ── Geography tab ──────────────────────────────────────────────────── */
function renderGeography(){
  renderHazardClasses();
  populateAdminFilter();
  showGeoTab('ds');
}

function showGeoTab(tab){
  document.querySelectorAll('.geo-subtab').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  const ds = document.getElementById('geoPane-ds'), adm = document.getElementById('geoPane-adm');
  if(ds) ds.style.display = tab === 'ds' ? '' : 'none';
  if(adm) adm.style.display = tab === 'adm' ? '' : 'none';
  if(tab === 'ds') renderDSTable(); else renderAdmTable();
}

function renderHazardClasses(){
  const el = document.getElementById('hazardClassList');
  const cats = (typeof HAZARD_CATEGORIES !== 'undefined' ? HAZARD_CATEGORIES : []);
  if(!el) return;
  const max = Math.max(...cats.map(c=>Number(c.count)||0), 1);
  el.innerHTML = cats.map(c => `<div class="cls-row"><span class="cls-dot" style="background:${c.color}"></span>
    <span class="cls-name">${esc(c.cls)}</span>
    <div class="cls-track"><div class="cls-bar" style="width:${(c.count/max*100).toFixed(1)}%;background:${c.color}"></div></div>
    <span class="cls-count">${Number(c.count).toLocaleString()}</span><span class="cls-desc">${esc(c.desc||'')}</span></div>`).join('');
}

function populateAdminFilter(){
  const sel = document.getElementById('dsAdm');
  if(!sel || sel.dataset.loaded) return;
  const names = [...new Set((DS_DIVISIONS||[]).map(d=>d.province).filter(Boolean))].sort();
  sel.insertAdjacentHTML('beforeend', names.map(n=>`<option>${esc(n)}</option>`).join(''));
  sel.dataset.loaded = '1';
}

function renderDSTable(){
  const body = document.getElementById('dsTableBody');
  if(!body || typeof DS_DIVISIONS === 'undefined') return;
  const q = (document.getElementById('dsSearch')?.value || '').toLowerCase();
  const prov = document.getElementById('dsAdm')?.value || '';
  let rows = DS_DIVISIONS.filter(d =>
    (!q || [d.ds_division, d.district, d.province].join(' ').toLowerCase().includes(q)) &&
    (!prov || d.province === prov));
  rows.sort((a,b) => (b.compound_risk||0) - (a.compound_risk||0));
  const count = document.getElementById('dsCount');
  if(count) count.textContent = `${rows.length.toLocaleString()} divisions`;
  body.innerHTML = rows.slice(0,500).map(d => `<tr>
    <td>${esc(d.ds_division)}</td><td>${esc(d.district)}</td><td>${esc(d.province)}</td>
    <td>${Number(d.n_cells).toLocaleString()}</td>
    <td>${Number(d.flood_obs).toLocaleString()} / ${Number(d.landslide_obs).toLocaleString()}</td>
    <td>${pct(d.flood_pct)}</td><td>${pct(d.landslide_pct)}</td>
    <td>${riskBadge(d.risk_category)}</td>
    <td>${Number(d.elevation).toFixed(1)}</td><td>${Number(d.slope).toFixed(1)}</td><td>${Number(d.rain_7d).toFixed(1)}</td>
  </tr>`).join('');
}

function renderAdmTable(){
  const body = document.getElementById('admTableBody');
  if(!body) return;
  const q = (document.getElementById('admSearch')?.value || '').toLowerCase();
  let rows = (typeof ADM_DISTRICTS !== 'undefined' ? ADM_DISTRICTS.slice() : []);
  rows = rows.filter(d => !q || [d.district, d.province].join(' ').toLowerCase().includes(q));
  rows.sort((a,b) => (b.flood + b.landslide) - (a.flood + a.landslide));
  const count = document.getElementById('admCount');
  if(count) count.textContent = `${rows.length.toLocaleString()} districts`;
  body.innerHTML = rows.map(d => `<tr>
    <td>${esc(d.district)}</td><td>${esc(d.province)}</td><td>${Number(d.ds_count).toLocaleString()}</td>
    <td>${Number(d.cells).toLocaleString()}</td><td>${Number(d.flood).toLocaleString()}</td><td>${pct(d.flood_rate)}</td>
    <td>${Number(d.landslide).toLocaleString()}</td><td>${pct(d.ls_rate)}</td><td>${Number(d.compound).toLocaleString()}</td>
    <td>${riskBadge(d.risk_category)}</td></tr>`).join('');
}

/* ── Data sources / Research tabs ───────────────────────────────────── */
function renderData(){
  const el = document.getElementById('dataTable');
  const rows = (typeof DATA_SOURCES !== 'undefined' ? DATA_SOURCES : []);
  if(el) el.innerHTML = `<thead><tr><th>Feature</th><th>Description</th><th>Source</th><th>Null %</th></tr></thead>
    <tbody>${rows.map(r=>`<tr><td>${esc(r.f)}</td><td>${esc(r.desc)}</td><td><span class="badge b-blue">${esc(r.src)}</span></td><td>${esc(r.null)}</td></tr>`).join('')}</tbody>`;
  if(typeof chartDataSrc === 'function') chartDataSrc();
}

function renderResearch(){
  const el = document.getElementById('rqList');
  const rows = (typeof RESEARCH_QS !== 'undefined' ? RESEARCH_QS : []);
  if(el) el.innerHTML = rows.map(r => `<div class="rq-card">
    <div class="rq-num">${esc(r.n)} · Objective ${esc(r.obj)}</div>
    <div class="rq-q">${esc(r.q)}</div><div class="rq-a">${esc(r.a)}</div>
    <div class="rq-foot"><span class="rq-status ${r.status==='answered'?'b-green':'b-amber'}">${r.status === 'answered' ? 'Fully answered' : 'Partially answered'}</span></div></div>`).join('');
}

/* ── Theme / clock / boot ───────────────────────────────────────────── */
function initTheme(){
  const saved = null; // no localStorage in this environment — session-only
  const toggle = document.getElementById('themeToggle');
  if(toggle) toggle.addEventListener('click', () => {
    const cur = document.documentElement.getAttribute('data-theme');
    document.documentElement.setAttribute('data-theme', cur === 'dark' ? '' : 'dark');
    redrawAllCharts();
  });
}
function initClock(){
  const el = document.getElementById('liveClock');
  if(!el) return;
  const tick = () => { el.textContent = new Date().toLocaleTimeString('en-GB', { hour12:false }); };
  tick(); setInterval(tick, 1000);
}

document.addEventListener('DOMContentLoaded', () => {
  initTheme(); initClock(); initNav();
  renderPage('overview'); initializedPages.add('overview');
});
