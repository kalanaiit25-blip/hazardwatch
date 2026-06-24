/* ===================================================================
   charts.js — Chart.js rendering for all dashboard pages
   =================================================================== */

const COLORS = {
  dist: '#378add', cent: '#d85a30', flood: '#d85a30',
  land: '#534ab7', ok: '#1d9e75', grid: 'rgba(128,128,128,0.12)'
};

const chartRegistry = {};

function isDark() {
  return document.documentElement.getAttribute('data-theme') === 'dark';
}

function textColor() { return isDark() ? '#9aa7b2' : '#5b6770'; }

function baseFont() { return { size: 11, family: 'Inter, sans-serif' }; }

function destroyChart(id) {
  if (chartRegistry[id]) { chartRegistry[id].destroy(); delete chartRegistry[id]; }
}

function makeChart(id, config) {
  const el = document.getElementById(id);
  if (!el) return null;
  destroyChart(id);
  chartRegistry[id] = new Chart(el, config);
  return chartRegistry[id];
}

// ── Overview: flood AUC bar ──
function chartOverviewAuc() {
  const fd = MODELS.filter(m => m.target === 'flood_risk');
  makeChart('ovAuc', {
    type: 'bar',
    data: {
      labels: fd.map(m => m.model.replace('LogRegression', 'LR')),
      datasets: [{
        data: fd.map(m => m.auc),
        backgroundColor: fd.map(m => m.arch === 'distributed' ? COLORS.dist : COLORS.cent),
        borderRadius: 4
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => 'AUC ' + c.raw.toFixed(4) } } },
      scales: {
        x: { grid: { display: false }, ticks: { font: baseFont(), color: textColor(), maxRotation: 35 } },
        y: { min: 0.88, max: 0.935, grid: { color: COLORS.grid }, ticks: { font: baseFont(), color: textColor() } }
      }
    }
  });
}

// ── Overview: PR-AUC bar ──
function chartOverviewPrauc() {
  const fd = MODELS.filter(m => m.target === 'flood_risk');
  makeChart('ovPrauc', {
    type: 'bar',
    data: {
      labels: fd.map(m => m.model.replace('LogRegression', 'LR')),
      datasets: [{
        data: fd.map(m => m.prauc),
        backgroundColor: fd.map(m => m.arch === 'distributed' ? COLORS.dist : COLORS.cent),
        borderRadius: 4
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => 'PR-AUC ' + c.raw.toFixed(4) } } },
      scales: {
        x: { grid: { display: false }, ticks: { font: baseFont(), color: textColor(), maxRotation: 35 } },
        y: { min: 0, max: 0.9, grid: { color: COLORS.grid }, ticks: { font: baseFont(), color: textColor() } }
      }
    }
  });
}

// ── Overview: training time ──
function chartOverviewTime() {
  const fd = MODELS.filter(m => m.target === 'flood_risk');
  makeChart('ovTime', {
    type: 'bar',
    data: {
      labels: fd.map(m => m.model.replace('LogRegression', 'LR')),
      datasets: [{
        data: fd.map(m => m.time),
        backgroundColor: fd.map(m => m.arch === 'distributed' ? COLORS.dist : COLORS.cent),
        borderRadius: 4
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => c.raw + ' s' } } },
      scales: {
        x: { grid: { display: false }, ticks: { font: baseFont(), color: textColor(), maxRotation: 35 } },
        y: { grid: { color: COLORS.grid }, ticks: { font: baseFont(), color: textColor() } }
      }
    }
  });
}

// ── Models: AUC + F1 ──
function chartModelMetric(id, metric, min, max) {
  const fd = MODELS.filter(m => m.target === 'flood_risk');
  makeChart(id, {
    type: 'bar',
    data: {
      labels: fd.map(m => m.model.replace('LogRegression', 'LR')),
      datasets: [{
        data: fd.map(m => m[metric]),
        backgroundColor: fd.map(m => m.arch === 'distributed' ? COLORS.dist : COLORS.cent),
        borderRadius: 4
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => c.raw.toFixed(4) } } },
      scales: {
        x: { grid: { display: false }, ticks: { font: { size: 9 }, color: textColor(), maxRotation: 40 } },
        y: { min, max, grid: { color: COLORS.grid }, ticks: { font: baseFont(), color: textColor() } }
      }
    }
  });
}

// ── Forecast line (map page) ──
function chartForecast(district) {
  const days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  let flood, land;
  if (district) {
    const seed = district.flood * 10;
    flood = days.map((_, i) => clamp(district.flood + Math.sin(i * 1.3 + seed) * 0.12));
    land  = days.map((_, i) => clamp(district.land + Math.cos(i * 0.9 + seed) * 0.10));
  } else {
    flood = [0.58, 0.63, 0.61, 0.55, 0.48, 0.62, 0.71];
    land  = [0.42, 0.48, 0.51, 0.44, 0.38, 0.46, 0.55];
  }
  makeChart('forecastChart', {
    type: 'line',
    data: {
      labels: days,
      datasets: [
        { label: 'Flood', data: flood, borderColor: COLORS.flood, backgroundColor: 'rgba(216,90,48,0.08)',
          tension: 0.4, fill: true, pointRadius: 4, borderWidth: 2, pointStyle: 'circle' },
        { label: 'Landslide', data: land, borderColor: COLORS.land, backgroundColor: 'rgba(83,74,183,0.08)',
          tension: 0.4, fill: true, pointRadius: 4, borderWidth: 2, borderDash: [5,3], pointStyle: 'rect' }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display: true, labels: { font: baseFont(), color: textColor(), boxWidth: 10, usePointStyle: true } },
        tooltip: { callbacks: { label: c => c.dataset.label + ': ' + (c.raw * 100).toFixed(0) + '%' } }
      },
      scales: {
        x: { grid: { color: COLORS.grid }, ticks: { font: baseFont(), color: textColor() } },
        y: { min: 0, max: 1, grid: { color: COLORS.grid },
             ticks: { font: baseFont(), color: textColor(), callback: v => (v * 100).toFixed(0) + '%' } }
      }
    }
  });
}

function clamp(v) { return Math.max(0.03, Math.min(0.97, v)); }

// ── Scalability line ──
function chartScalability() {
  const fl = SCALABILITY.flood;
  makeChart('scaleChart', {
    type: 'line',
    data: {
      labels: ['25%', '50%', '100%'],
      datasets: [
        { label: 'PySpark RF', data: fl.map(d => d.sparkT), borderColor: COLORS.dist,
          backgroundColor: 'rgba(55,138,221,0.07)', tension: 0.4, fill: true, pointRadius: 5, borderWidth: 2 },
        { label: 'sklearn RF', data: fl.map(d => d.sklT), borderColor: COLORS.cent,
          backgroundColor: 'rgba(216,90,48,0.07)', tension: 0.4, fill: true, pointRadius: 5, borderWidth: 2, borderDash: [5,3] }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display: true, labels: { font: baseFont(), color: textColor(), boxWidth: 10, usePointStyle: true } },
        tooltip: { callbacks: { label: c => c.dataset.label + ': ' + c.raw + 's' } }
      },
      scales: {
        x: { grid: { color: COLORS.grid }, ticks: { font: baseFont(), color: textColor() } },
        y: { grid: { color: COLORS.grid }, ticks: { font: baseFont(), color: textColor() },
             title: { display: true, text: 'Time (s)', font: baseFont(), color: textColor() } }
      }
    }
  });
}

// ── Data source doughnut ──
function chartDataSrc() {
  makeChart('srcChart', {
    type: 'doughnut',
    data: {
      labels: ['SRTM (5)', 'SoilGrids (4)', 'CHIRPS (3)', 'ESA/MODIS (2)', 'SMAP (1)'],
      datasets: [{ data: [5, 4, 3, 2, 1],
        backgroundColor: ['#378add', '#1d9e75', '#d85a30', '#534ab7', '#ba7517'], borderWidth: 0 }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: true, position: 'right', labels: { font: baseFont(), color: textColor(), boxWidth: 10 } } }
    }
  });
}

function redrawAllCharts() {
  Object.keys(chartRegistry).forEach(id => {
    const fn = window['__redraw_' + id];
    if (fn) fn();
  });
}
