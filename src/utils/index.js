// src/utils/index.js

// Core Systems
export { unifiedDataManager } from './UnifiedDataManager';
export { spatialSystem } from './SpatialSystem';
export { dataTransformationSystem } from './DataTransformationSystem';
export { monitoringSystem } from './MonitoringSystem';

// Data Management
export { default as CacheManager } from './CacheManager';
export { default as DataValidator } from './DataValidator';

// UI and Dynamic Loading
export { lazyLoadComponent, lazyLoadSpatialComponent } from './dynamicImports';
export { initializeLeaflet } from './leafletSetup';

// Utility Functions
export {
  // Data Processing
  normalizeRegionId,
  transformProperties,
  processMarketData,
  
  // Visualization
  getColorScales,
  createCustomIcon,
  
  // File Operations
  readFileAsText,
  parseCSVData,
  
  // Market Analysis
  calculateMarketMetrics,
  processTimeSeriesData,
  
  // Validation
  validateData,
  validateDataStructure,
  
  // Cache Control
  clearCache,
  getCacheStats
} from './appUtils';