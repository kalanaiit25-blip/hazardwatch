/* ===================================================================
   charts.js — Chart.js rendering for all dashboard pages
   Colours pulled from CSS custom properties so light/dark mode
   is handled automatically without any JS theme detection.
   =================================================================== */

/* Read a CSS variable from :root */
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
function text3Color() { return cssVar('--text-3')  || '#8b96a0'; }
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

/* ── Shared axis defaults ── */
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

/* ── Overview: Flood AUC-ROC ── */
function chartOverviewAuc(){
  const fd = MODELS.filter(m => m.target === 'flood_risk');
  makeChart('ovAuc', {
    type: 'bar',
    data: {
      labels: fd.map(m => m.model.replace('LogisticRegression','LR')),
      datasets: [{
        data: fd.map(m => m.auc),
        backgroundColor: fd.map(m => m.arch === 'distributed' ? COLORS.dist : COLORS.cent),
        borderRadius: 4,
        borderSkipped: false,
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
        y: yAxis({ min: 0.88, max: 0.94 }),
      }
    }
  });
}

/* ── Overview: PR-AUC ── */
function chartOverviewPrauc(){
  const fd = MODELS.filter(m => m.target === 'flood_risk');
  makeChart('ovPrauc', {
    type: 'bar',
    data: {
      labels: fd.map(m => m.model.replace('LogisticRegression','LR')),
      datasets: [{
        data: fd.map(m => m.prauc),
        backgroundColor: fd.map(m => m.arch === 'distributed' ? COLORS.dist : COLORS.cent),
        borderRadius: 4,
        borderSkipped: false,
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

/* ── Overview: Training time ── */
function chartOverviewTime(){
  const fd = MODELS.filter(m => m.target === 'flood_risk');
  makeChart('ovTime', {
    type: 'bar',
    data: {
      labels: fd.map(m => m.model.replace('LogisticRegression','LR')),
      datasets: [{
        data: fd.map(m => m.time),
        backgroundColor: fd.map(m => m.arch === 'distributed' ? COLORS.dist : COLORS.cent),
        borderRadius: 4,
        borderSkipped: false,
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

/* ── Models: AUC + F1 ── */
function chartModelMetric(id, metric, min, max){
  const fd = MODELS.filter(m => m.target === 'flood_risk');
  makeChart(id, {
    type: 'bar',
    data: {
      labels: fd.map(m => m.model.replace('LogisticRegression','LR')),
      datasets: [{
        data: fd.map(m => m[metric]),
        backgroundColor: fd.map(m => m.arch === 'distributed' ? COLORS.dist : COLORS.cent),
        borderRadius: 4,
        borderSkipped: false,
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: c => ' ' + Number(c.raw).toFixed(4) } },
      },
      scales: {
        x: xAxis({ ticks: { font: { size:9 }, color: textColor(), maxRotation: 40 } }),
        y: yAxis({ min, max }),
      }
    }
  });
}

/* ── Map page: 7-day forecast ── */
function chartForecast(district){
  const days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  let flood, land;
  if(district){
    const sf = district.flood_rate != null ? district.flood_rate / 100 : district.f || 0;
    const sl = district.ls_rate    != null ? district.ls_rate    / 100 : district.l || 0;
    const seed = sf * 10;
    flood = days.map((_,i) => _clamp(sf + Math.sin(i*1.3+seed)*0.12));
    land  = days.map((_,i) => _clamp(sl + Math.cos(i*0.9+seed)*0.10));
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
        legend: {
          display: true,
          labels: { font: baseFont(), color: textColor(), boxWidth: 10, usePointStyle: true },
        },
        tooltip: { callbacks: { label: c => ' ' + c.dataset.label + ': ' + (c.raw*100).toFixed(0)+'%' } },
      },
      scales: {
        x: xAxis(),
        y: yAxis({ min:0, max:1,
          ticks: { callback: v => (v*100).toFixed(0)+'%', font: baseFont(), color: textColor() },
        }),
      }
    }
  });
}

function _clamp(v){ return Math.max(0.01, Math.min(0.97, v)); }

/* ── Scalability: training time line ── */
function chartScalability(){
  const fl = SCALABILITY.flood;
  makeChart('scaleChart', {
    type: 'line',
    data: {
      labels: fl.map(d => (Number(d.frac)*100).toFixed(0)+'%'),
      datasets: [
        { label:'PySpark RF', data:fl.map(d=>d.sparkT), borderColor: COLORS.dist,
          backgroundColor: 'rgba(26,111,186,0.06)', tension:0.3, fill:true, pointRadius:5, borderWidth:2 },
        { label:'sklearn RF', data:fl.map(d=>d.sklT), borderColor: COLORS.cent,
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

/* ── Data sources: doughnut ── */
function chartDataSrc(){
  makeChart('srcChart', {
    type: 'doughnut',
    data: {
      labels: ['SRTM (5)','SoilGrids (4)','CHIRPS (3)','ESA/MODIS (2)','SMAP (1)'],
      datasets:[{
        data:[5,4,3,2,1],
        backgroundColor:[
          cssVar('--flood')    || '#1a6fba',
          cssVar('--ok')       || '#1b7c5e',
          cssVar('--compound') || '#b91c1c',
          cssVar('--land')     || '#8a5c0f',
          cssVar('--warn')     || '#a35f0a',
        ],
        borderWidth: 0,
        hoverOffset: 4,
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display:true, position:'right', labels:{ font: baseFont(), color: textColor(), boxWidth:10, padding:12 } },
      },
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
