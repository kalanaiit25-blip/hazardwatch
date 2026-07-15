/* ===================================================================
   charts.js - Chart.js rendering for all dashboard pages
   Colours pulled from CSS custom properties so light/dark mode
   is handled automatically without any JS theme detection.

   FIX (v7): confirmed directly against an actual generated data.js -
   MODELS[].target is 'flood' / 'landslide'. (An earlier pass here had
   assumed 'flood_risk'/'landslide_risk' from notebook-cell text output;
   the real emitted file uses the short form, so that assumption is
   corrected back.)
   =================================================================== */

function cssVar(name){
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

const COLORS = {
  get dist()     { return cssVar('--dist')     || '#1a6fba'; },
  get cent()     { return cssVar('--cent')     || '#8a5c0f'; },
  get flood()    { return cssVar('--flood')    || '#1a6fba'; },
  get land()     { return cssVar('--land')     || '#8a5c0f'; },
  get compound() { return cssVar('--compound') || '#b91c1c'; },
  get ok()       { return cssVar('--ok')       || '#1b7c5e'; },
  get warn()     { return cssVar('--warn')     || '#a35f0a'; },
  grid: 'rgba(128,128,128,0.10)',
};

const chartRegistry = {};

function textColor()  { return cssVar('--text-2')  || '#52616d'; }
function gridColor()  { return cssVar('--surface-3') || 'rgba(128,128,128,0.12)'; }
function baseFont()   { return { size: 11, family: "'Inter', system-ui, sans-serif" }; }

function destroyChart(id){
  if(chartRegistry[id]){ chartRegistry[id].destroy(); delete chartRegistry[id]; }
}
function makeChart(id, config){
  const el = document.getElementById(id);
  if(!el) return null;
  destroyChart(id);
  chartRegistry[id] = new Chart(el, config);
  return chartRegistry[id];
}

function xAxis(opts){
  return Object.assign({
    grid: { display: false },
    ticks: { font: baseFont(), color: textColor(), maxRotation: 35 },
    border: { display: false },
  }, opts);
}
function yAxis(opts){
  return Object.assign({
    grid: { color: gridColor(), drawBorder: false },
    ticks: { font: baseFont(), color: textColor() },
    border: { display: false },
  }, opts);
}

/* Which target the Overview page focuses on. Defaults to 'flood' (the harder,
   more imbalanced target) - matches the literal values MODELS[].target holds
   in the real data.js: 'flood' / 'landslide'. */
function modelsFor(target){
  return (typeof MODELS !== 'undefined' ? MODELS : []).filter(m => m.target === target);
}

function chartOverviewAuc(target='flood'){
  const fd = modelsFor(target);
  makeChart('ovAuc', {
    type: 'bar',
    data: {
      labels: fd.map(m => m.model.replace('LogisticRegression','LR')),
      datasets: [{
        data: fd.map(m => m.auc),
        backgroundColor: fd.map(m => m.arch === 'distributed' ? COLORS.dist : COLORS.cent),
        borderRadius: 4, borderSkipped: false,
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: c => ' AUC ' + Number(c.raw).toFixed(4) } },
      },
      scales: {
        x: xAxis({ ticks: { font: { size:10 }, color: textColor(), maxRotation: 38 } }),
        y: yAxis({ min: 0, max: 1 }),
      }
    }
  });
}

function chartOverviewPrauc(target='flood'){
  const fd = modelsFor(target);
  makeChart('ovPrauc', {
    type: 'bar',
    data: {
      labels: fd.map(m => m.model.replace('LogisticRegression','LR')),
      datasets: [{
        data: fd.map(m => m.prauc ?? m.pr_auc),
        backgroundColor: fd.map(m => m.arch === 'distributed' ? COLORS.dist : COLORS.cent),
        borderRadius: 4, borderSkipped: false,
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: c => ' PR-AUC ' + (c.raw != null ? Number(c.raw).toFixed(4) : 'N/A') } },
      },
      scales: {
        x: xAxis({ ticks: { font: { size:10 }, color: textColor(), maxRotation: 38 } }),
        y: yAxis({ min: 0, max: 1.0 }),
      }
    }
  });
}

function chartOverviewTime(target='flood'){
  const fd = modelsFor(target);
  makeChart('ovTime', {
    type: 'bar',
    data: {
      labels: fd.map(m => m.model.replace('LogisticRegression','LR')),
      datasets: [{
        data: fd.map(m => m.time),
        backgroundColor: fd.map(m => m.arch === 'distributed' ? COLORS.dist : COLORS.cent),
        borderRadius: 4, borderSkipped: false,
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: c => ' ' + c.raw + ' s' } },
      },
      scales: {
        x: xAxis({ ticks: { font: { size:10 }, color: textColor(), maxRotation: 38 } }),
        y: yAxis(),
      }
    }
  });
}

/* Models tab: draws both targets combined so distributed-vs-centralised is
   visible across the full model set, not just one hazard. */
function chartModelMetric(id, metric, min, max){
  const all = (typeof MODELS !== 'undefined' ? MODELS : []);
  makeChart(id, {
    type: 'bar',
    data: {
      labels: all.map(m => `${m.model.replace('LogisticRegression','LR')} (${m.target})`),
      datasets: [{
        data: all.map(m => m[metric]),
        backgroundColor: all.map(m => m.arch === 'distributed' ? COLORS.dist : COLORS.cent),
        borderRadius: 4, borderSkipped: false,
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: c => ' ' + Number(c.raw).toFixed(4) } },
      },
      scales: {
        x: xAxis({ ticks: { font: { size:9 }, color: textColor(), maxRotation: 45 } }),
        y: yAxis({ min, max }),
      }
    }
  });
}

/* Forecast: driven by a real DS_DIVISIONS record, enriched by app.js's
   renderMap()/hwRun() with floodProb/landProb (derived from the real
   flood_rate/ls_rate fields - see app.js dsFloodProb/dsLandProb). Not a
   fabricated formula. */
function chartForecast(division){
  const days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  let flood, land;
  if(division){
    const sf = Number(division.floodProb) || 0;
    const sl = Number(division.landProb) || 0;
    const seed = sf * 10;
    flood = days.map((_,i) => _clamp(sf + Math.sin(i*1.3+seed)*0.08));
    land  = days.map((_,i) => _clamp(sl + Math.cos(i*0.9+seed)*0.06));
  } else {
    flood = [0.14,0.18,0.17,0.12,0.10,0.16,0.21];
    land  = [0.22,0.28,0.31,0.24,0.18,0.26,0.35];
  }
  makeChart('forecastChart', {
    type: 'line',
    data: {
      labels: days,
      datasets: [
        { label:'Flood', data:flood, borderColor: COLORS.flood,
          backgroundColor: cssVar('--flood-bg') || 'rgba(26,111,186,0.08)',
          tension:0.4, fill:true, pointRadius:4, borderWidth:2, pointStyle:'circle' },
        { label:'Landslide', data:land, borderColor: COLORS.land,
          backgroundColor: cssVar('--land-bg') || 'rgba(138,92,15,0.08)',
          tension:0.4, fill:true, pointRadius:4, borderWidth:2, borderDash:[5,3], pointStyle:'rect' },
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display: true, labels: { font: baseFont(), color: textColor(), boxWidth: 10, usePointStyle: true } },
        tooltip: { callbacks: { label: c => ' ' + c.dataset.label + ': ' + (c.raw*100).toFixed(0)+'%' } },
      },
      scales: {
        x: xAxis(),
        y: yAxis({ min:0, max:1, ticks: { callback: v => (v*100).toFixed(0)+'%', font: baseFont(), color: textColor() } }),
      }
    }
  });
  const note = document.getElementById('forecastNote');
  if(note) note.textContent = division
    ? `Illustrative 7-day trend around ${division.district}'s current model-predicted rate - not a time-series forecast model.`
    : 'Select a DS division on the map to see its predicted risk level here.';
}
function _clamp(v){ return Math.max(0.01, Math.min(0.97, v)); }

function chartScalability(target='flood'){
  const rows = (typeof SCALABILITY !== 'undefined' ? SCALABILITY[target] : []) || [];
  makeChart('scaleChart', {
    type: 'line',
    data: {
      labels: rows.map(d => (Number(d.frac)*100).toFixed(0)+'%'),
      datasets: [
        { label:'PySpark RF', data: rows.map(d=>d.sparkT), borderColor: COLORS.dist,
          backgroundColor: 'rgba(26,111,186,0.06)', tension:0.3, fill:true, pointRadius:5, borderWidth:2 },
        { label:'sklearn RF', data: rows.map(d=>d.sklT), borderColor: COLORS.cent,
          backgroundColor: 'rgba(138,92,15,0.06)', tension:0.3, fill:true, pointRadius:5, borderWidth:2, borderDash:[5,3] },
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display: true, labels: { font: baseFont(), color: textColor(), boxWidth: 10, usePointStyle: true } },
        tooltip: { callbacks: { label: c => ' ' + c.dataset.label + ': ' + c.raw + 's' } },
      },
      scales: {
        x: xAxis(),
        y: yAxis({ title: { display:true, text:'Time (s)', font: baseFont(), color: textColor() } }),
      }
    }
  });
}

function chartDataSrc(){
  const src = (typeof DATA_SOURCES !== 'undefined' ? DATA_SOURCES : []);
  const counts = {};
  src.forEach(r => { counts[r.src] = (counts[r.src]||0) + 1; });
  const labels = Object.keys(counts), data = Object.values(counts);
  const palette = [COLORS.flood, COLORS.ok, COLORS.compound, COLORS.land, COLORS.warn];
  makeChart('srcChart', {
    type: 'doughnut',
    data: { labels, datasets:[{ data, backgroundColor: labels.map((_,i)=>palette[i%palette.length]), borderWidth: 0, hoverOffset: 4 }] },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display:true, position:'right', labels:{ font: baseFont(), color: textColor(), boxWidth:10, padding:12 } } },
      cutout: '62%',
    }
  });
}

function redrawAllCharts(){
  Object.keys(chartRegistry).forEach(id => {
    const fn = window['__redraw_'+id];
    if(fn) fn();
  });
}