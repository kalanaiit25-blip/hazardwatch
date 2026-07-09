/* ===================================================================
   app.js — Application logic: navigation, page rendering, map, predict
   Single source of truth for all rendering (index.html has no inline
   duplicate copies of any of this).

   FIXES (v6) — corrected against the ACTUAL data.js schema written by
   05_Dashboard.ipynb's generate_data_js() (verified cell-by-cell against
   the notebook output, not assumed):

   1. DS_DIVISIONS / ADM_DISTRICTS field names corrected. The real fields
      are: district (= DS division name), admin_district, province, cells,
      flood (count), landslide (count), compound (count), lat, lon,
      elevation, slope, rain, ndvi, flood_rate (0-100 %), ls_rate (0-100 %),
      risk_category, flood_corrected. Previous versions invented fields
      (ds_division, flood_prob, landslide_prob, compound_risk, rain_7d,
      n_cells, flood_obs/landslide_obs, flood_pct/landslide_pct) that do
      not exist anywhere in data.js — every marker, popup, gauge, and
      geography-table row was silently rendering blank/NaN.
   2. MODELS[].target is 'flood' / 'landslide' (confirmed against an actual
      generated data.js) — not 'flood_risk'/'landslide_risk'.
   3. SUMMARY_STATS does not exist in data.js — Overview stats and the
      Models-tab / Ditwah-tab KPI cards are now computed client-side from
      MODELS, HAZARD_CATEGORIES, DS_DIVISIONS, ADM_DISTRICTS, SCALABILITY,
      and DITWAH_REPORT, all of which DO exist.
   4. Geography DS table now honours all four controls in the markup
      (search, risk-category filter, province filter, admin-district
      filter, sort) instead of only search + admin filter. Admin table
      now honours its province filter too.
   5. Predict tab performs a real nearest-neighbour lookup against
      DS_DIVISIONS' actual model-predicted rates (flood_rate/ls_rate),
      labelled honestly as a rate-based lookup, not a synthetic formula.
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

/* ── Data helpers (real data.js field names) ───────────────────────────
   flood_rate / ls_rate are already 0-100 percentages. compound is a raw
   cell COUNT (not a rate), so a 0-1 "compound rate" is derived here as
   compound / cells — this is a direct computation from real fields, not
   a fabricated number. */
function dsFloodProb(d){ return (Number(d.flood_rate) || 0) / 100; }
function dsLandProb(d){ return (Number(d.ls_rate) || 0) / 100; }
function dsCompoundRate(d){ return d.cells ? Math.min(1, (Number(d.compound) || 0) / d.cells) : 0; }

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

/* ── Summary stats (computed client-side — data.js has no SUMMARY_STATS) ─ */
function computeSummaryStats(){
  const models = (typeof MODELS !== 'undefined' ? MODELS : []);
  const ds = (typeof DS_DIVISIONS !== 'undefined' ? DS_DIVISIONS : []);
  const adm = (typeof ADM_DISTRICTS !== 'undefined' ? ADM_DISTRICTS : []);
  const cats = (typeof HAZARD_CATEGORIES !== 'undefined' ? HAZARD_CATEGORIES : []);
  const byCount = c => Number((cats.find(x => x.cls === c) || {}).count) || 0;

  const totalCells = ds.reduce((s,d) => s + (Number(d.cells)||0), 0);
  const floodPositives = byCount('Flood Risk - High') + byCount('Flood Risk - Moderate') + byCount('Flood Risk - Low');
  const landPositives  = byCount('Landslide - High') + byCount('Landslide - Moderate') + byCount('Landslide - Low');

  const bestOf = (target, metric) => {
    const rows = models.filter(m => m.target === target && m[metric] != null);
    if(!rows.length) return null;
    return rows.reduce((a,b) => (b[metric] > a[metric] ? b : a));
  };
  const bestFlood = bestOf('flood', 'prauc');
  const bestLand  = bestOf('landslide', 'prauc');

  return {
    total_cells: totalCells,
    n_ds_divisions: ds.length,
    n_districts: adm.length,
    n_models: models.length,
    n_distributed: models.filter(m => m.arch === 'distributed').length,
    n_centralised: models.filter(m => m.arch === 'centralised').length,
    flood_positives: floodPositives,
    flood_pct: totalCells ? (floodPositives/totalCells*100) : 0,
    landslide_positives: landPositives,
    landslide_pct: totalCells ? (landPositives/totalCells*100) : 0,
    best_flood_model: bestFlood ? bestFlood.model : 'N/A',
    best_flood_pr_auc: bestFlood ? bestFlood.prauc : 0,
    best_landslide_model: bestLand ? bestLand.model : 'N/A',
    best_landslide_pr_auc: bestLand ? bestLand.prauc : 0,
  };
}

/* ── Overview ───────────────────────────────────────────────────────── */
function renderOverview(){
  const s = computeSummaryStats();
  const set = (id, val) => { const el = document.getElementById(id); if(el) el.textContent = val; };
  set('statCells', Number(s.total_cells||0).toLocaleString());
  set('statFloodPositives', Number(s.flood_positives||0).toLocaleString());
  set('statFloodPositivesSub', `${s.flood_pct.toFixed(1)}% of cells`);
  set('statLandPositives', Number(s.landslide_positives||0).toLocaleString());
  set('statLandPositivesSub', `${s.landslide_pct.toFixed(1)}% of cells`);
  set('statModelsTrained', Number(s.n_models||0).toLocaleString());
  set('statModelsTrainedSub', `${s.n_distributed} distributed · ${s.n_centralised} centralised`);
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
  flood: {
    title:'Flood risk (model-predicted rate)',
    cols:['#1b7c5e','#1a6fba','#a35f0a','#b91c1c'],
    /* Legend rows in the markup are ordered High -> Minimal (top to bottom),
       i.e. legend[0]=High..legend[3]=Minimal — the reverse of cols/tier order. */
    legend:['High (\u226513%)','Moderate (6\u201313%)','Low (2\u20136%)','Minimal (<2%)'],
    value: d => d.floodProb,
    /* Thresholds calibrated against the real flood_rate distribution across
       all 323 DS divisions (p25=1.6%, p50=3.7%, p75=6.4%, p90=13.2%,
       max=25%). The previous shared thresholds (40%/70%) were above the
       real maximum, so "Moderate"/"High" could never be reached and 91%
       of divisions were stuck at "minimal". */
    tier: d => tierByThresholds(d.floodProb, [0.02, 0.06, 0.13]),
  },
  land: {
    title:'Landslide risk (model-predicted rate)',
    cols:['#1b7c5e','#8a9ecf','#7c5226','#4c3000'],
    legend:['High (\u226550%)','Moderate (25\u201350%)','Low (3\u201325%)','Minimal (<3%)'],
    value: d => d.landProb,
    /* ls_rate has a genuinely wide spread (p50=2.5%, p75=26%, p90=52%,
       p99=82%) — these thresholds roughly track that spread. */
    tier: d => tierByThresholds(d.landProb, [0.03, 0.25, 0.50]),
  },
  compound: {
    title:'Compound hazard (cells with both risks)',
    cols:['#1b7c5e','#c084fc','#8a5c0f','#b91c1c'],
    legend:['High (3+ cells)','Moderate (2 cells)','Low (1 cell)','Minimal (0 cells)'],
    value: d => d.compoundRate,
    /* `compound` is a raw count of hazard cells (0, 1, or 2 across the
       whole real dataset) — dividing it by cells-per-division (up to 880)
       crushes the ratio to under 5% everywhere, so no division could ever
       cross even a 15% floor. Colour by the raw count directly instead;
       it's already the right granularity for this field. */
    tier: d => Math.min(3, Number(d.compound) || 0),
  },
};
function tierByThresholds(v, th){
  if(v >= th[2]) return 3;
  if(v >= th[1]) return 2;
  if(v >= th[0]) return 1;
  return 0;
}

/* Mode-specific severity badge for the map popup — deliberately NOT
   d.risk_category, which is the division's single OVERALL classification
   across all hazards combined. Using it inside a mode-specific popup was
   the root cause of e.g. a division showing "HIGH RISK" while the
   currently-viewed hazard (say Flood) reads 0.0%: the badge was actually
   reflecting that division's Landslide rate, not the hazard on screen.
   Also distinguishes a value that displays as 0.0% (true zero, or a
   landslide probability too small to round above 0.0%) from tier-1
   "Minimal Risk", so the badge never claims any risk category for a
   division that's showing 0% on screen. */
function modeRiskBadge(mode, d){
  const cfg = HW_CFG[mode];
  const v = Number(cfg.value(d)) || 0;
  if(Number(v*100).toFixed(1) === '0.0'){
    return `<span class="risk-cat-badge badge-none">No Risk</span>`;
  }
  const tier = cfg.tier(d);
  const labels = ['Minimal Risk','Low Risk','Moderate Risk','High Risk'];
  const classes = ['badge-none','badge-low','badge-moderate','badge-high'];
  return `<span class="risk-cat-badge ${classes[tier]}">${labels[tier]}</span>`;
}

/* Syncs the legend rows (#hw-ld0..3 dot colours, #hw-ll0..3 labels) and the
   ranked-list panel title to the active mode. Previously both were static
   markup in index.html and never updated on hwSetMode(), so switching to
   Landslide/Compound still showed the Flood legend thresholds and the
   "— Flood" panel title. */
function updateLegendAndTitle(mode){
  const cfg = HW_CFG[mode];
  // legend rows are ordered High(0)->Minimal(3); cols/tier are ordered Minimal(0)->High(3)
  for(let row = 0; row < 4; row++){
    const tier = 3 - row;
    const dot = document.getElementById('hw-ld'+row), lbl = document.getElementById('hw-ll'+row);
    if(dot) dot.style.background = cfg.cols[tier];
    if(lbl) lbl.textContent = cfg.legend[row];
  }
  const modeLabel = { flood:'Flood', land:'Landslide', compound:'Compound' }[mode] || mode;
  const listTitle = document.getElementById('hw-list-title');
  if(listTitle) listTitle.textContent = `Risk-ranked DS divisions — ${modeLabel}`;
}

function renderMap(){
  const el = document.getElementById('hwLeafletMap');
  if(!el || typeof L === 'undefined') return;
  const raw = (typeof DS_DIVISIONS !== 'undefined' ? DS_DIVISIONS : []).filter(d => d.lat != null && d.lon != null);
  /* Pre-compute the 0-1 fields the map/list/predict UI needs, derived
     directly from the real flood_rate/ls_rate/compound fields. */
  HW_D = raw.map(d => ({
    ...d,
    floodProb: dsFloodProb(d),
    landProb: dsLandProb(d),
    compoundRate: dsCompoundRate(d),
  }));
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
  updateLegendAndTitle('flood');
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
    const v = Number(cfg.value(d)) || 0;
    const col = cfg.cols[cfg.tier(d)];
    const r = Math.round(5 + Math.min(1, v) * 15);
    const mk = L.circleMarker([d.lat, d.lon], {
      radius: r, fillColor: col, color: col, weight: 1, opacity: 0.9, fillOpacity: 0.75,
    }).addTo(hwMap)
      .bindPopup(hwPopup(d, mode))
      .on('click', () => { hwShowDetail(d); if(typeof chartForecast==='function') chartForecast(d); });
    hwMarkers.push(mk);
  });
}

function hwPopup(d, mode){
  return `<div class="hw-pop">
    <div class="hw-pop-name">${esc(d.district)}</div>
    <div style="font-size:11px;color:var(--text-2);margin-bottom:6px;">${esc(d.admin_district)} · ${esc(d.province)}</div>
    <div>Flood: <b>${pct(d.floodProb*100)}</b></div>
    <div>Landslide: <b>${pct(d.landProb*100)}</b></div>
    <div>Compound: <b>${pct(d.compoundRate*100)}</b></div>
    <div style="margin-top:4px">${modeRiskBadge(mode, d)}</div>
  </div>`;
}

function hwShowDetail(d){
  const card = document.getElementById('hw-detail-card');
  if(card) card.style.display = 'block';
  const header = document.getElementById('hw-sel-district');
  if(header) header.textContent = `${d.district} — ${d.admin_district}, ${d.province}`;
  const setBar = (valId, barId, val) => {
    const ve = document.getElementById(valId), be = document.getElementById(barId);
    if(ve) ve.textContent = pct(val*100);
    if(be) be.style.width = Math.min(100, val*100).toFixed(1)+'%';
  };
  setBar('hw-df','hw-dfb', d.floodProb||0);
  setBar('hw-dl','hw-dlb', d.landProb||0);
  setBar('hw-dc','hw-dcb', d.compoundRate||0);
}

/* Called from markup: onclick="hwSetMode('flood'|'land'|'compound', this)" */
function hwSetMode(mode, btn){
  ['flood','land','compound'].forEach(m => { const b=document.getElementById('hw-btn-'+m); if(b) b.classList.remove('active'); });
  if(btn) btn.classList.add('active');
  const lt = document.getElementById('hw-leg-title');
  if(lt) lt.textContent = HW_CFG[mode].title;
  updateLegendAndTitle(mode);
  hwDraw(mode);
  hwBuildList(mode);
}

function hwBuildList(mode){
  const el = document.getElementById('hw-district-list');
  if(!el) return;
  const cfg = HW_CFG[mode];
  /* Filter out divisions whose value for THIS mode displays as 0.0% —
     using the exact same rounding pct() uses for display, so "filtered
     out" and "shown as 0%" can never disagree. This excludes both
     literal zeros (flood, compound) and values that round to 0.0% at
     1dp (landslide is a continuous probability and is never exactly 0,
     but e.g. 0.01% is indistinguishable from zero on screen). */
  const nonZero = HW_D.filter(d => Number((cfg.value(d)||0)*100).toFixed(1) !== '0.0');
  const sorted = nonZero.slice().sort((a,b) => (cfg.value(b)||0) - (cfg.value(a)||0));
  const countEl = document.getElementById('hw-list-count');
  if(countEl) countEl.textContent = `${sorted.length} of ${HW_D.length} divisions with nonzero risk`;
  el.innerHTML = sorted.map((d,i) => {
    const v = Number(cfg.value(d)) || 0;
    const col = cfg.cols[cfg.tier(d)];
    return `<div class="hw-ditem" data-nm="${esc(d.district)}">
      <span class="hw-drank">${String(i+1).padStart(3,'0')}</span>
      <div class="hw-dcirc" style="background:${col}22;border:1.5px solid ${col};"><span style="color:${col};font-size:9px">${Math.round(v*100)}</span></div>
      <div class="hw-dinfo"><div class="hw-dname">${esc(d.district)}</div>
        <div style="font-size:10px;color:var(--text-3)">${esc(d.admin_district)}</div>
        <div class="hw-dpills">
          <span class="hw-pill" style="background:rgba(26,111,186,.12);color:var(--flood)">F:${pct((d.floodProb||0)*100)}</span>
          <span class="hw-pill" style="background:rgba(138,92,15,.12);color:var(--land)">L:${pct((d.landProb||0)*100)}</span>
        </div></div></div>`;
  }).join('');
  el.querySelectorAll('.hw-ditem').forEach(item => {
    item.addEventListener('click', () => hwFly(item.dataset.nm));
  });
}

function hwFly(name){
  const d = HW_D.find(x => x.district === name);
  if(d && hwMap){ hwMap.flyTo([d.lat, d.lon], 10, {duration:1.0}); hwShowDetail(d); }
}

/* Called from markup: oninput="hwFilter(this.value)" */
function hwFilter(q){
  const ql = (q||'').toLowerCase();
  document.querySelectorAll('.hw-ditem').forEach(item => {
    item.style.display = item.textContent.toLowerCase().includes(ql) ? '' : 'none';
  });
}

/* ── Predict (nearest-neighbour against actual model-predicted rates) ──
   The markup's sliders (rain, elev, slope, sm, rd, ndvi) come from the
   original design, but DS_DIVISIONS only carries real elevation/slope/
   rain per division — soil moisture and 'rd' aren't in the aggregated
   output, so they're kept as illustrative context inputs but do NOT
   drive the nearest-division lookup; only fields that exist in the real
   data do. This is an honest nearest-neighbour lookup, not a fabricated
   sigmoid/coefficient formula. */
const HW_S = { rain:120, elev:250, slope:12, sm:45, rd:8, ndvi:.42 };
const HW_PRESETS = {
  base:   { rain:120, elev:250,  slope:12, sm:45, rd:8,  ndvi:.42 },
  ditwah: { rain:350, elev:180,  slope:25, sm:85, rd:3,  ndvi:.28 },
  low:    { rain:200, elev:15,   slope:3,  sm:78, rd:2,  ndvi:.35 },
  dry:    { rain:50,  elev:1800, slope:8,  sm:20, rd:25, ndvi:.55 },
  hill:   { rain:280, elev:900,  slope:42, sm:72, rd:12, ndvi:.31 },
};
let hwCurModel = 'xgb'; // cosmetic only — see note in hwRun()

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

/* Finds the real DS division whose actual (elevation, slope, rain) is
   closest to the user's slider inputs and returns its real model-derived
   rates. */
function predictNearest(state){
  if(!HW_D.length) return null;
  const norm = (v, lo, hi) => Math.max(0, Math.min(1, (v-lo)/(hi-lo)));
  let best = null, bestDist = Infinity;
  for(const d of HW_D){
    const dr = norm(d.rain,0,400)      - norm(state.rain,0,400);
    const de = norm(d.elevation,0,2500)- norm(state.elev,0,2500);
    const ds = norm(d.slope,0,60)      - norm(state.slope,0,60);
    const dist = dr*dr + de*de + ds*ds;
    if(dist < bestDist){ bestDist = dist; best = d; }
  }
  return best;
}

/* Called from markup: onclick="hwRun()" */
function hwRun(){
  if(!HW_D.length){
    const raw = (typeof DS_DIVISIONS !== 'undefined' ? DS_DIVISIONS : []).filter(d => d.lat != null);
    HW_D = raw.map(d => ({ ...d, floodProb: dsFloodProb(d), landProb: dsLandProb(d), compoundRate: dsCompoundRate(d) }));
  }
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
  setGauge('hw-gv-f','hw-gf-f','hw-gs-f', match.floodProb || 0);
  setGauge('hw-gv-l','hw-gf-l','hw-gs-l', match.landProb || 0);
  setGauge('hw-gv-c','hw-gf-c','hw-gs-c', match.compoundRate || 0);

  const mb = document.getElementById('hw-mbadge');
  if(mb) mb.innerHTML = `Nearest real DS division to your inputs: <strong>${esc(match.district)}</strong> (${esc(match.admin_district)}) — showing its actual model-derived rates, not a synthetic estimate.`;

  const ip = document.getElementById('hw-interp');
  if(ip){
    const cc = predictSeverity(match.compoundRate||0);
    const dom = (match.floodProb||0) > (match.landProb||0) ? 'flood' : 'landslide';
    ip.textContent = `${cc.lbl} compound risk, dominated by ${dom} risk, based on the closest-matching real DS division (${match.district}).`;
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

  /* KPI cards: best flood AUC by architecture, best flood PR-AUC overall,
     computed directly from MODELS (target === 'flood'). */
  const flood = models.filter(m => m.target === 'flood');
  const bestBy = (arr, metric) => arr.length ? arr.reduce((a,b) => (b[metric] > a[metric] ? b : a)) : null;
  const bestDist = bestBy(flood.filter(m => m.arch === 'distributed'), 'auc');
  const bestCent = bestBy(flood.filter(m => m.arch === 'centralised'), 'auc');
  const bestPrauc = bestBy(flood, 'prauc');
  const set = (id, val) => { const el2 = document.getElementById(id); if(el2) el2.textContent = val; };
  if(bestDist){ set('mdlBestDistAuc', Number(bestDist.auc).toFixed(4)); set('mdlBestDistAucSub', `${bestDist.model.replace('_',' ')} · ${bestDist.time}s`); }
  if(bestCent){ set('mdlBestCentAuc', Number(bestCent.auc).toFixed(4)); set('mdlBestCentAucSub', `${bestCent.model.replace('_',' ')} · ${bestCent.time}s`); }
  if(bestPrauc){ set('mdlBestPrauc', Number(bestPrauc.prauc).toFixed(4)); set('mdlBestPraucSub', `${bestPrauc.model.replace('_',' ')} leads`); }

  /* AUC diff / PR-AUC diff / time ratios (distributed vs centralised, flood) */
  if(bestDist && bestCent){
    set('mdlAucDiff', (bestDist.auc - bestCent.auc >= 0 ? '+' : '') + (bestDist.auc - bestCent.auc).toFixed(4));
    set('mdlAucDiffSub', bestDist.auc >= bestCent.auc ? 'Distributed leads' : 'Centralised leads marginally');
  }
  const praucDist = bestBy(flood.filter(m => m.arch === 'distributed'), 'prauc');
  const praucCent = bestBy(flood.filter(m => m.arch === 'centralised'), 'prauc');
  if(praucDist && praucCent){
    const diff = praucDist.prauc - praucCent.prauc;
    set('mdlPraucDiff', (diff >= 0 ? '+' : '') + diff.toFixed(4));
    set('mdlPraucDiffSub', diff >= 0 ? 'Distributed leads' : 'Centralised leads');
  }
  if(bestDist && bestCent && bestCent.time){
    set('mdlTimeRatioCV', (bestDist.time / bestCent.time).toFixed(0) + '×');
  }
  const SCAL = (typeof SCALABILITY !== 'undefined' ? SCALABILITY : {});
  const floodScale = (SCAL.flood || []);
  const full = floodScale.find(r => Number(r.frac) === 1) || floodScale[floodScale.length - 1];
  if(full && full.sklT){
    set('mdlTimeRatioNoCV', (full.sparkT / full.sklT).toFixed(1) + '×');
  }
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
  const CORR = (typeof CORRELATIONS !== 'undefined' ? CORRELATIONS : {});
  if(corr){
    corr.innerHTML = Object.entries(CORR[tgt] || {}).map(([k,v]) =>
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
  if(l) l.innerHTML = mk(SCAL.land);
}

/* ── Ditwah tab ─────────────────────────────────────────────────────── */
function renderDitwah(){
  const el = document.getElementById('ditwahReport');
  const rows = (typeof DITWAH_REPORT !== 'undefined' ? DITWAH_REPORT : []);
  if(el) el.innerHTML = `<thead><tr><th>Class</th><th>Prec</th><th>Recall</th><th>F1</th><th>Support</th></tr></thead>
    <tbody>${rows.map(r=>`<tr><td>${esc(r.cls)}</td><td>${Number(r.prec).toFixed(2)}</td><td>${Number(r.rec).toFixed(2)}</td><td>${Number(r.f1).toFixed(2)}</td><td>${esc(r.support)}</td></tr>`).join('')}</tbody>`;

  /* Test-cell count IS derivable from DITWAH_REPORT (sum of support).
     Per-model AUC breakdowns shown elsewhere on this tab are not part of
     the DITWAH_REPORT schema and are documented separately in the
     dissertation methodology — left as-is rather than fabricated here. */
  const totalSupport = rows.reduce((s,r) => s + (parseInt(r.support,10) || 0), 0);
  const el2 = document.getElementById('ditwahTestCells');
  if(el2 && totalSupport) el2.textContent = totalSupport.toLocaleString();
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

/* Populates the #dsAdm select with real admin-district names (label says
   "All Admin Districts", so it must list admin_district, not province —
   province already has its own static #dsProv select in the markup). */
function populateAdminFilter(){
  const sel = document.getElementById('dsAdm');
  if(!sel || sel.dataset.loaded) return;
  const names = [...new Set((DS_DIVISIONS||[]).map(d=>d.admin_district).filter(Boolean))].sort();
  sel.insertAdjacentHTML('beforeend', names.map(n=>`<option>${esc(n)}</option>`).join(''));
  sel.dataset.loaded = '1';
}

function renderDSTable(){
  const body = document.getElementById('dsTableBody');
  if(!body || typeof DS_DIVISIONS === 'undefined') return;
  const q = (document.getElementById('dsSearch')?.value || '').toLowerCase();
  const risk = document.getElementById('dsRisk')?.value || '';
  const prov = document.getElementById('dsProv')?.value || '';
  const adm = document.getElementById('dsAdm')?.value || '';
  const sortKey = document.getElementById('dsSort')?.value || 'flood';

  let rows = DS_DIVISIONS.filter(d =>
    (!q || [d.district, d.admin_district, d.province].join(' ').toLowerCase().includes(q)) &&
    (!risk || d.risk_category === risk) &&
    (!prov || d.province === prov) &&
    (!adm  || d.admin_district === adm));

  const sortMap = {
    flood: d => d.flood, landslide: d => d.landslide, cells: d => d.cells,
    flood_rate: d => d.flood_rate, ls_rate: d => d.ls_rate,
  };
  const keyFn = sortMap[sortKey] || sortMap.flood;
  rows = rows.slice().sort((a,b) => (keyFn(b)||0) - (keyFn(a)||0));

  const count = document.getElementById('dsCount');
  if(count) count.textContent = `${rows.length.toLocaleString()} divisions`;
  body.innerHTML = rows.slice(0,500).map(d => `<tr>
    <td>${esc(d.district)}</td><td>${esc(d.admin_district)}</td><td>${esc(d.province)}</td>
    <td>${Number(d.cells).toLocaleString()}</td>
    <td>${Number(d.flood).toLocaleString()} / ${Number(d.landslide).toLocaleString()}</td>
    <td>${pct(d.flood_rate)}</td><td>${pct(d.ls_rate)}</td>
    <td>${Number(d.compound).toLocaleString()}</td>
    <td>${riskBadge(d.risk_category)}</td>
    <td>${Number(d.elevation).toFixed(1)}</td><td>${Number(d.slope).toFixed(1)}</td><td>${Number(d.rain).toFixed(1)}</td>
  </tr>`).join('');
}

function renderAdmTable(){
  const body = document.getElementById('admTableBody');
  if(!body) return;
  const q = (document.getElementById('admSearch')?.value || '').toLowerCase();
  const prov = document.getElementById('admProv')?.value || '';
  let rows = (typeof ADM_DISTRICTS !== 'undefined' ? ADM_DISTRICTS.slice() : []);
  rows = rows.filter(d =>
    (!q || [d.admin_district, d.province].join(' ').toLowerCase().includes(q)) &&
    (!prov || d.province === prov));
  rows.sort((a,b) => (b.flood + b.landslide) - (a.flood + a.landslide));
  const count = document.getElementById('admCount');
  if(count) count.textContent = `${rows.length.toLocaleString()} districts`;
  body.innerHTML = rows.map(d => `<tr>
    <td>${esc(d.admin_district)}</td><td>${esc(d.province)}</td><td>${Number(d.ds_divs).toLocaleString()}</td>
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
