// src/utils/index.js

// Core data handling
export { spatialDataHandler } from './spatialDataHandler';
export { dataProcessor } from './dataProcessor';

// Map setup
export * from './leafletSetup';

// Development utilities
export { debugUtils } from './debugUtils';
export { default as ReduxDebugWrapper } from './ReduxDebugWrapper';

// Performance monitoring
export { backgroundMonitor } from './backgroundMonitor';

// Dynamic imports
export * from './dynamicImports';

// Basic utilities
export const appUtils = {
  // Essential utility functions from appUtils.js
  normalizeRegionName: (name) => {
    if (!name) return '';
    return name.toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '_')
      .trim();
  },

  getDataPath: (fileName) => {
    const isGitHubPages = window.location.hostname.includes('github.io');
    const basePath = isGitHubPages ? '/Yemen_Market_Analysis/results' : '/results';
    return `${basePath}/${fileName}`;
  },

  formatDate: (date) => {
    if (!date) return '';
    const d = new Date(date);
    return d.toISOString().split('T')[0];
  },

  // Add any other essential utility functions here
};