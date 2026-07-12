# HazardWatch Compound Flood & Landslide Risk Platform - Sri Lanka

**Live dashboard:** [kalanaiit25-blip.github.io/hazardwatch](https://kalanaiit25-blip.github.io/hazardwatch/)

A distributed machine learning framework for **compound flood and landslide risk prediction** across Sri Lanka, developed as an MSc Big Data Analytics dissertation project.

---

## Motivation

In November 2025, **Cyclone Ditwah** triggered simultaneous flooding and landslides across all 25 districts of Sri Lanka, affecting over **1.8 million people**. Existing hazard-modelling approaches largely treat flood and landslide risk as separate problems, evaluated on random data splits that don't reflect how a real cyclone actually behaves in space and time. HazardWatch was built to address that gap.

## What it does

HazardWatch integrates terrain, soil, land-cover, and rainfall data into a unified 1km² grid across Sri Lanka, then trains and compares both distributed and centralised machine learning models to predict flood and landslide risk with the Cyclone Ditwah event held out as a real-world spatial validation test.

### Core research contributions

1. **Integrated compound hazard modelling** - flood and landslide risk predicted within a single unified framework, rather than as isolated problems.
2. **Distributed vs. centralised scalability comparison** - PySpark MLlib models benchmarked against centralised scikit-learn / XGBoost models on accuracy and training time.
3. **Event-based spatial-holdout validation** - Cyclone Ditwah used as an out-of-sample, geographically-held-out test rather than a random train/test split, for a more realistic measure of real-world performance.

## Data & scale

- **53,945** grid cells at 1km² resolution
- Covering **323 DS divisions** across all **25 districts** of Sri Lanka
- **15 base geospatial features** (elevation, slope, TWI, SPI, aspect, soil composition, organic carbon, land cover, NDVI, soil moisture, and multi-day rainfall aggregates)
- Sources: SRTM, SoilGrids, ESA WorldCover, SMAP, CHIRPS, and Google Earth Engine

## Models

**12 models** trained across two hazard targets (flood, landslide):

| Framework | Algorithms |
|---|---|
| PySpark MLlib (distributed) | Random Forest, Gradient-Boosted Trees, Logistic Regression |
| scikit-learn / XGBoost (centralised) | Random Forest, Gradient-Boosted Trees, XGBoost |

## Dashboard features

- Interactive Leaflet map of predicted risk across Sri Lanka
- Model performance comparison (Analytics, Models, and Scalability views)
- District and DS-division level exploration
- Cyclone Ditwah spatial-holdout validation results

## Tech stack

- **Distributed ML:** PySpark 3.4.1 (MLlib)
- **Centralised ML:** scikit-learn, XGBoost
- **Geospatial processing:** GeoPandas, Rasterio, Shapely, WhiteboxTools
- **Pipeline:** Google Colab + Google Drive, six sequential notebooks (data acquisition -> feature engineering -> distributed training -> evaluation -> dashboard generation)
- **Frontend:** Leaflet.js, Chart.js, Tailwind CSS, vanilla JavaScript
- **Deployment:** GitHub Pages (static site, data-driven via a generated `data.js`)

## Author

**Kalana Rathnayake**
MSc Big Data Analytics, Robert Gordon University (RGU), in partnership with the Informatics Institute of Technology (IIT), Sri Lanka
Module: CMM799  

---

*This project is an academic dissertation and is intended for research and educational purposes.*
