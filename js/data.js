/* Auto-generated from trained models by Dashboard.ipynb */

const MODELS = [
  {
    "model": "sklearn_RF",
    "target": "flood_risk",
    "arch": "centralised",
    "auc": 0.9235,
    "f1": 0.9635,
    "prec": 0.9648,
    "rec": 0.9625,
    "time": 9.9,
    "prauc": 0.587
  },
  {
    "model": "PySpark_RF",
    "target": "flood_risk",
    "arch": "distributed",
    "auc": 0.9225,
    "f1": 0.9699,
    "prec": 0.9697,
    "rec": 0.9731,
    "time": 1567.8,
    "prauc": 0.6651
  },
  {
    "model": "PySpark_GBT",
    "target": "flood_risk",
    "arch": "distributed",
    "auc": 0.9216,
    "f1": 0.9673,
    "prec": 0.9662,
    "rec": 0.9694,
    "time": 1570.8,
    "prauc": 0.62
  },
  {
    "model": "sklearn_GBT",
    "target": "flood_risk",
    "arch": "centralised",
    "auc": 0.9198,
    "f1": 0.9626,
    "prec": 0.9633,
    "rec": 0.962,
    "time": 37.3,
    "prauc": 0.4271
  },
  {
    "model": "XGBoost",
    "target": "flood_risk",
    "arch": "centralised",
    "auc": 0.9174,
    "f1": 0.9531,
    "prec": 0.9635,
    "rec": 0.9463,
    "time": 2.8,
    "prauc": 0.6641
  },
  {
    "model": "LogRegression",
    "target": "flood_risk",
    "arch": "distributed",
    "auc": 0.9146,
    "f1": 0.8657,
    "prec": 0.9606,
    "rec": 0.8091,
    "time": 26.6,
    "prauc": 0.41
  },
  {
    "model": "PySpark_RF",
    "target": "landslide_risk",
    "arch": "distributed",
    "auc": 1.0,
    "f1": 0.9999,
    "prec": 0.9999,
    "rec": 0.9999,
    "time": 1765.5,
    "prauc": 0.917
  },
  {
    "model": "PySpark_GBT",
    "target": "landslide_risk",
    "arch": "distributed",
    "auc": 1.0,
    "f1": 0.9997,
    "prec": 0.9998,
    "rec": 0.9997,
    "time": 1594.3,
    "prauc": 0.91
  },
  {
    "model": "sklearn_RF",
    "target": "landslide_risk",
    "arch": "centralised",
    "auc": 1.0,
    "f1": 1.0,
    "prec": 1.0,
    "rec": 1.0,
    "time": 9.5,
    "prauc": 1.0
  },
  {
    "model": "XGBoost",
    "target": "landslide_risk",
    "arch": "centralised",
    "auc": 1.0,
    "f1": 1.0,
    "prec": 1.0,
    "rec": 1.0,
    "time": 0.7,
    "prauc": 1.0
  },
  {
    "model": "LogRegression",
    "target": "landslide_risk",
    "arch": "distributed",
    "auc": 0.9995,
    "f1": 0.9969,
    "prec": 0.9991,
    "rec": 0.9954,
    "time": 10.3,
    "prauc": 0.95
  },
  {
    "model": "sklearn_GBT",
    "target": "landslide_risk",
    "arch": "centralised",
    "auc": 0.9994,
    "f1": 0.9995,
    "prec": 0.9996,
    "rec": 0.9994,
    "time": 36.6,
    "prauc": 0.456
  }
];

const DISTRICTS = [
  {
    "name": "Colombo",
    "province": "Western",
    "lat": 6.93,
    "lon": 79.86,
    "flood": 0.104,
    "land": 0.003,
    "rain": 35.0,
    "pop": 752000,
    "x": 130,
    "y": 355
  },
  {
    "name": "Kandy",
    "province": "Central",
    "lat": 7.29,
    "lon": 80.63,
    "flood": 0.017,
    "land": 0.847,
    "rain": 39.9,
    "pop": 125000,
    "x": 175,
    "y": 295
  },
  {
    "name": "Galle",
    "province": "Southern",
    "lat": 6.05,
    "lon": 80.22,
    "flood": 0.022,
    "land": 0.785,
    "rain": 50.6,
    "pop": 99000,
    "x": 148,
    "y": 445
  },
  {
    "name": "Jaffna",
    "province": "Northern",
    "lat": 9.67,
    "lon": 80.01,
    "flood": 0.447,
    "land": 0.0,
    "rain": 28.4,
    "pop": 88000,
    "x": 158,
    "y": 55
  },
  {
    "name": "Batticaloa",
    "province": "Eastern",
    "lat": 7.72,
    "lon": 81.7,
    "flood": 0.499,
    "land": 0.001,
    "rain": 35.0,
    "pop": 93000,
    "x": 255,
    "y": 250
  },
  {
    "name": "Anuradhapura",
    "province": "North Central",
    "lat": 8.34,
    "lon": 80.4,
    "flood": 0.03,
    "land": 0.0,
    "rain": 26.4,
    "pop": 56000,
    "x": 165,
    "y": 165
  },
  {
    "name": "Ratnapura",
    "province": "Sabaragamuwa",
    "lat": 6.68,
    "lon": 80.4,
    "flood": 0.1,
    "land": 0.847,
    "rain": 69.3,
    "pop": 47000,
    "x": 165,
    "y": 380
  },
  {
    "name": "Trincomalee",
    "province": "Eastern",
    "lat": 8.57,
    "lon": 81.23,
    "flood": 0.069,
    "land": 0.0,
    "rain": 35.0,
    "pop": 80000,
    "x": 230,
    "y": 150
  },
  {
    "name": "Kurunegala",
    "province": "North Western",
    "lat": 7.48,
    "lon": 80.36,
    "flood": 0.041,
    "land": 0.034,
    "rain": 42.3,
    "pop": 31000,
    "x": 160,
    "y": 265
  },
  {
    "name": "Matara",
    "province": "Southern",
    "lat": 5.95,
    "lon": 80.53,
    "flood": 0.087,
    "land": 0.037,
    "rain": 42.1,
    "pop": 75000,
    "x": 170,
    "y": 460
  },
  {
    "name": "Badulla",
    "province": "Uva",
    "lat": 6.99,
    "lon": 81.05,
    "flood": 0.004,
    "land": 0.901,
    "rain": 40.7,
    "pop": 35000,
    "x": 215,
    "y": 330
  },
  {
    "name": "Hambantota",
    "province": "Southern",
    "lat": 6.12,
    "lon": 81.12,
    "flood": 0.192,
    "land": 0.001,
    "rain": 35.0,
    "pop": 12000,
    "x": 220,
    "y": 445
  }
];

const FI = {
  "flood": {
    "slope": 0.1619,
    "twi": 0.1279,
    "bulk_density": 0.1177,
    "spi": 0.0903,
    "org_carbon": 0.0796,
    "ndvi": 0.0738,
    "clay_pct": 0.0701,
    "sand_pct": 0.0689,
    "elevation": 0.0412,
    "land_cover": 0.0411,
    "soil_moisture": 0.0382,
    "aspect": 0.0298,
    "rain_max_mean": 0.0255,
    "rain_7d_mean": 0.0209,
    "rain_3d_mean": 0.0081
  },
  "land": {
    "slope": 0.2819,
    "elevation": 0.1777,
    "spi": 0.0963,
    "bulk_density": 0.0874,
    "soil_moisture": 0.0578,
    "rain_3d_mean": 0.048,
    "rain_7d_mean": 0.0443,
    "twi": 0.0429,
    "rain_max_mean": 0.0404,
    "land_cover": 0.0275,
    "aspect": 0.0228,
    "org_carbon": 0.0198,
    "clay_pct": 0.0186,
    "sand_pct": 0.0179,
    "ndvi": 0.0167
  }
};

// ── Feature metadata for sliders & sources ──
const FEAT_META = {
  elevation:    { label:'Elevation (m)',   src:'SRTM',      min:0,   max:2500, step:1,    def:177,  desc:'Digital elevation model (30m → 1km)' },
  slope:        { label:'Slope (°)',        src:'SRTM',      min:0,   max:60,   step:0.5,  def:5.3,  desc:'Terrain slope derived from DEM' },
  twi:          { label:'TWI',              src:'SRTM',      min:0,   max:30,   step:0.1,  def:5.9,  desc:'Topographic wetness index' },
  spi:          { label:'SPI',              src:'SRTM',      min:0,   max:10,   step:0.05, def:0.4,  desc:'Stream power index' },
  aspect:       { label:'Aspect (°)',       src:'SRTM',      min:0,   max:360,  step:1,    def:176,  desc:'Slope aspect direction' },
  clay_pct:     { label:'Clay %',           src:'SoilGrids', min:0,   max:80,   step:0.5,  def:31.2, desc:'Clay content percentage' },
  sand_pct:     { label:'Sand %',           src:'SoilGrids', min:0,   max:90,   step:0.5,  def:35.4, desc:'Sand content percentage' },
  bulk_density: { label:'Bulk density',     src:'SoilGrids', min:0.5, max:2,    step:0.05, def:1.13, desc:'Bulk density (g/cm³)' },
  org_carbon:   { label:'Org carbon',       src:'SoilGrids', min:0,   max:200,  step:1,    def:55.7, desc:'Organic carbon (g/kg)' },
  land_cover:   { label:'Land cover',       src:'ESA',       min:1,   max:20,   step:1,    def:9,    desc:'Land cover class (ESA 10m)' },
  ndvi:         { label:'NDVI',             src:'MODIS',     min:-0.2,max:1,    step:0.01, def:0.81, desc:'Vegetation index (500m)' },
  soil_moisture:{ label:'Soil moisture',    src:'SMAP',      min:0,   max:0.8,  step:0.01, def:0.32, desc:'Volumetric soil moisture' },
  rain_3d_mean: { label:'Rain 3d (mm)',     src:'CHIRPS',    min:0,   max:200,  step:1,    def:16.6, desc:'3-day mean rainfall' },
  rain_7d_mean: { label:'Rain 7d (mm)',     src:'CHIRPS',    min:0,   max:400,  step:1,    def:38.6, desc:'7-day mean rainfall' },
  rain_max_mean:{ label:'Rain max (mm)',    src:'CHIRPS',    min:0,   max:300,  step:1,    def:30.2, desc:'Maximum daily mean rainfall' },
};

// ── Feature means & stds (Cell 14.6 provenance) ──
const FEAT_STATS = {
  means: { elevation:177, slope:5.3, twi:5.9, spi:0.4, aspect:176, clay_pct:31.2, sand_pct:35.4,
           bulk_density:1.13, org_carbon:55.7, land_cover:9, ndvi:0.81, soil_moisture:0.32,
           rain_3d_mean:16.6, rain_7d_mean:38.6, rain_max_mean:30.2 },
  stds:  { elevation:305, slope:7.6, twi:4.9, spi:0.8, aspect:106, clay_pct:7.9, sand_pct:9.3,
           bulk_density:0.28, org_carbon:19.5, land_cover:3.4, ndvi:0.074, soil_moisture:0.069,
           rain_3d_mean:5.1, rain_7d_mean:12.1, rain_max_mean:8.1 }
};

// ── Scenario presets ──
const PRESETS = {
  mean:   { elevation:177, slope:5.3,  twi:5.9,  spi:0.4,  aspect:176, clay_pct:31.2, sand_pct:35.4, bulk_density:1.13, org_carbon:55.7, land_cover:9,  ndvi:0.81, soil_moisture:0.32, rain_3d_mean:16.6, rain_7d_mean:38.6,  rain_max_mean:30.2 },
  ditwah: { elevation:80,  slope:12.5, twi:8.2,  spi:1.8,  aspect:195, clay_pct:28,   sand_pct:42,   bulk_density:0.95, org_carbon:48,   land_cover:7,  ndvi:0.62, soil_moisture:0.48, rain_3d_mean:85,   rain_7d_mean:210,   rain_max_mean:145 },
  flood:  { elevation:12,  slope:0.8,  twi:12.5, spi:2.1,  aspect:200, clay_pct:42,   sand_pct:25,   bulk_density:0.88, org_carbon:68,   land_cover:4,  ndvi:0.75, soil_moisture:0.55, rain_3d_mean:45,   rain_7d_mean:120,   rain_max_mean:95 },
  dry:    { elevation:350, slope:2.1,  twi:3.8,  spi:0.15, aspect:145, clay_pct:35,   sand_pct:30,   bulk_density:1.35, org_carbon:42,   land_cover:10, ndvi:0.88, soil_moisture:0.21, rain_3d_mean:4.2,  rain_7d_mean:9.8,   rain_max_mean:7.1 },
  slide:  { elevation:620, slope:32,   twi:3.1,  spi:0.8,  aspect:290, clay_pct:22,   sand_pct:48,   bulk_density:1.05, org_carbon:38,   land_cover:5,  ndvi:0.71, soil_moisture:0.41, rain_3d_mean:58,   rain_7d_mean:155,   rain_max_mean:120 },
};

// ── Scalability data (Cell 8 flood + Cell 14.2 landslide) ──
const SCALABILITY = {
  flood: [
    { frac:25,  n:13486, sparkT:17.9, sklT:2.5,  sparkAuc:0.9133, sklAuc:0.9141 },
    { frac:50,  n:26972, sparkT:24.4, sklT:4.6,  sparkAuc:0.9342, sklAuc:0.9533 },
    { frac:100, n:53945, sparkT:38.2, sklT:12.9, sparkAuc:0.9480, sklAuc:0.9451 },
  ],
  land: [
    { frac:25,  n:13486, sparkT:25.5, sklT:2.0,  sparkAuc:0.9853, sklAuc:0.9875 },
    { frac:50,  n:26972, sparkT:25.2, sklT:4.1,  sparkAuc:0.9847, sklAuc:0.9856 },
    { frac:100, n:53945, sparkT:40.4, sklT:9.9,  sparkAuc:0.9877, sklAuc:0.9899 },
  ]
};

// ── 5-fold CV results (Cell 14.5) ──
const CV_RESULTS = [
  { model:'sklearn RF · flood',     aucMean:0.9446, aucStd:0.0043, ciLo:0.9362, ciHi:0.9530, apMean:0.6720 },
  { model:'XGBoost · flood',        aucMean:0.9474, aucStd:0.0037, ciLo:0.9400, ciHi:0.9547, apMean:0.7222 },
  { model:'sklearn RF · landslide', aucMean:0.9901, aucStd:0.0012, ciLo:0.9878, ciHi:0.9924, apMean:0.9340 },
  { model:'XGBoost · landslide',    aucMean:0.9935, aucStd:0.0011, ciLo:0.9915, ciHi:0.9956, apMean:0.9522 },
];

// ── Label correlations (Cell 12.5) ──
const CORRELATIONS = {
  flood: { slope:0.694, jrc_occurrence:0.657, log_org_carbon:0.430, log_bulk_density:0.420, clay_pct:0.408 },
  land:  { slope:0.694, log_slope:0.523, elevation:0.475, log_spi:0.337, log_rain_3d_mean:0.293 }
};

// ── Ditwah classification report (Cell 12) ──
const DITWAH_REPORT = [
  { cls:'No Risk', prec:0.99, rec:0.96, f1:0.97, support:'17,822' },
  { cls:'Risk',    prec:0.39, rec:0.69, f1:0.50, support:'728' },
];

// ── Data source provenance (Cell 14.6) ──
const DATA_SOURCES = [
  { f:'elevation',     desc:'Digital elevation model (30m → 1km)', src:'SRTM',      null:'0.0%' },
  { f:'slope',         desc:'Terrain slope from DEM',              src:'SRTM',      null:'0.0%' },
  { f:'twi',           desc:'Topographic wetness index',          src:'SRTM',      null:'0.0%' },
  { f:'spi',           desc:'Stream power index',                 src:'SRTM',      null:'0.0%' },
  { f:'aspect',        desc:'Slope aspect direction',             src:'SRTM',      null:'0.0%' },
  { f:'clay_pct',      desc:'Clay content %',                     src:'SoilGrids', null:'0.0%' },
  { f:'sand_pct',      desc:'Sand content %',                     src:'SoilGrids', null:'0.0%' },
  { f:'bulk_density',  desc:'Bulk density (g/cm³)',               src:'SoilGrids', null:'0.0%' },
  { f:'org_carbon',    desc:'Organic carbon (g/kg)',              src:'SoilGrids', null:'0.0%' },
  { f:'land_cover',    desc:'Land cover class',                   src:'ESA',       null:'0.0%' },
  { f:'ndvi',          desc:'Vegetation index (500m)',            src:'MODIS',     null:'0.0%' },
  { f:'soil_moisture', desc:'Volumetric soil moisture',          src:'SMAP',      null:'0.0%' },
  { f:'rain_3d_mean',  desc:'3-day mean rainfall (mm)',           src:'CHIRPS',    null:'0.0%' },
  { f:'rain_7d_mean',  desc:'7-day mean rainfall (mm)',           src:'CHIRPS',    null:'0.0%' },
  { f:'rain_max_mean', desc:'Max daily mean (mm)',                src:'CHIRPS',    null:'0.0%' },
];

// ── Research questions & answers ──
const RESEARCH_QS = [
  { n:'RQ1', obj:'RO1', status:'answered',
    q:'How do existing flood and landslide modelling approaches perform under non-stationary climate conditions?',
    a:'Physically-based models (HEC-RAS, TOPMODEL) assume stationary rainfall-runoff relationships invalidated by climate change. Threshold-based landslide systems rely on empirical values that break under novel extremes like Cyclone Ditwah. ML approaches (Mosavi 2018; Reichenbach 2018) improve accuracy but prioritise algorithmic performance over scalability and compound representation.' },
  { n:'RQ2', obj:'RO2', status:'answered',
    q:'What architectural and computational limitations restrict scalability of current ML hazard models?',
    a:'Three key limitations identified: (1) hazard isolation — most studies model flood and landslide independently; (2) centralised design — single-machine sklearn cannot scale to national datasets; (3) no event-based validation — cross-validation only, no stress testing against historical extreme events.' },
  { n:'RQ3', obj:'RO3', status:'answered',
    q:'How can a distributed ML framework integrate heterogeneous geospatial data for compound hazard prediction?',
    a:'Designed a PySpark 3.5.3 pipeline integrating 5 data sources (SRTM, SoilGrids, ESA WorldCover, SMAP, CHIRPS) into a 53,945-cell feature store. Spatial train/test split at 8°N prevents autocorrelation leakage. A leakage detection pipeline (correlation screen → ablation → threshold test) identifies and excludes jrc_occurrence.' },
  { n:'RQ4', obj:'RO4', status:'answered',
    q:'To what extent does distributed architecture improve performance and efficiency vs centralised approaches?',
    a:'AUC-ROC: comparable (PySpark RF 0.9225 vs sklearn RF 0.9235, Δ=−0.0010). PR-AUC: distributed leads (PySpark RF 0.6651 vs sklearn RF 0.5870, Δ=+0.0781). Training time: 3× slower at 54K rows without CV (38s vs 13s) — not 157× as raw CV figures suggest. Crossover to distributed advantage requires multi-node cluster with millions of rows.' },
  { n:'RQ5', obj:'RO5', status:'partial',
    q:'How robust is the distributed framework against extreme real-world hazard events?',
    a:'Validated on Cyclone Ditwah northern zone (18,550 test cells, lat>8°N). Flood: PySpark RF AUC=0.9282, XGBoost AUC=0.9174. Landslide: AUC=1.0000 but only 21 positives — bootstrap CI=[1.0,1.0], reported as preliminary. Framework demonstrates operational robustness for flood prediction; landslide northern validation requires richer inventory data.' },
];
