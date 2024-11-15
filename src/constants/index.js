// src/constants/index.js


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
    PRICE_SHOCK: {
      MILD: 0.15,    // 15% change
      MODERATE: 0.25, // 25% change
      SEVERE: 0.40    // 40% change
    },
    MARKET_INTEGRATION: {
      LOW: 0.2,      // Moran's I thresholds
      MODERATE: 0.4,
      HIGH: 0.6
    },
    VOLATILITY: {
      LOW: 0.1,      // Coefficient of variation thresholds
      MODERATE: 0.2,
      HIGH: 0.3
    },
    CLUSTER_SIZE: {
      MIN: 2,        // Minimum markets for valid cluster
      OPTIMAL: 5     // Optimal cluster size
    },
    SIGNIFICANCE: {
      P_VALUE: 0.05  // Statistical significance threshold
    }
  };
  
  export const COLOR_SCALES = {
    PRICES: ['#fee5d9', '#fcae91', '#fb6a4a', '#de2d26', '#a50f15'],
    INTEGRATION: ['#edf8e9', '#bae4b3', '#74c476', '#31a354', '#006d2c'],
    CLUSTERS: ['#e41a1c', '#377eb8', '#4daf4a', '#984ea3', '#ff7f00', '#ffff33'],
    SHOCKS: ['#ffffcc', '#ffeda0', '#fed976', '#feb24c', '#fd8d3c', '#fc4e2a']
  };
  
  export const MARKET_TYPES = {
    HUB: 'hub',
    PERIPHERAL: 'peripheral',
    ISOLATED: 'isolated'
  };
  
  export const TIME_RANGES = {
    SHORT: 3,  // 3 months
    MEDIUM: 6, // 6 months
    LONG: 12   // 12 months
  };
  
  export const COMMODITIES = {
    FOOD: [
      'beans_kidney_red',
      'beans_white',
      'wheat_flour',
      'rice_imported',
      'sugar',
      'oil_vegetable'
    ],
    FUEL: [
      'fuel_diesel',
      'fuel_petrol-gasoline',
      'fuel_gas'
    ],
    LABOR: [
      'wage_qualified_labour',
      'wage_non-qualified_labour'
    ]
  };
  
  export const DATA_FIELDS = {
    REQUIRED: [
      'time_series_data',
      'market_shocks',
      'market_clusters',
      'flow_analysis',
      'spatial_autocorrelation'
    ],
    OPTIONAL: [
      'metadata',
      'analysis_notes'
    ]
  };

  export const REGIMES = {
    North: 'north',
    South: 'south',
    Uunified: 'unified'
  };