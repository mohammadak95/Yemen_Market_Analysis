// src/constants/spatialConstants.js

export const VISUALIZATION_MODES = {
    PRICES: 'prices',
    MARKET_INTEGRATION: 'integration',
    CLUSTERS: 'clusters',
    SHOCKS: 'shocks'
  };
  
  export const MAP_SETTINGS = {
    DEFAULT_CENTER: [15.3694, 44.191],
    DEFAULT_ZOOM: 6,
    MIN_ZOOM: 5,
    MAX_ZOOM: 10,
    TILE_LAYER: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    ATTRIBUTION: '© OpenStreetMap contributors'
  };
  
  export const ANALYSIS_THRESHOLDS = {
    INTEGRATION: {
      HIGH: 0.7,
      MODERATE: 0.4,
      LOW: 0.2
    },
    VOLATILITY: {
      HIGH: 0.15,
      MODERATE: 0.08,
      LOW: 0.05
    },
    SHOCK: {
      SEVERE: 0.2,
      MODERATE: 0.1,
      MILD: 0.05
    }
  };
  
  export const COLOR_SCALES = {
    PRICES: ['#fee5d9', '#fcae91', '#fb6a4a', '#de2d26', '#a50f15'],
    INTEGRATION: ['#edf8e9', '#bae4b3', '#74c476', '#31a354', '#006d2c'],
    CLUSTERS: ['#e41a1c', '#377eb8', '#4daf4a', '#984ea3', '#ff7f00', '#ffff33'],
    SHOCKS: ['#ffffcc', '#ffeda0', '#fed976', '#feb24c', '#fd8d3c', '#fc4e2a']
  };