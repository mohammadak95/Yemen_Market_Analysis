/**
 * Types and constants for market flow analysis
 */

// Flow strength thresholds
export const FLOW_THRESHOLDS = {
  HIGH: 0.7,    // Strong market flow
  MEDIUM: 0.4,  // Moderate market flow
  LOW: 0.2      // Weak market flow
};

// Flow types based on characteristics
export const FLOW_TYPES = {
  BIDIRECTIONAL: 'bidirectional',  // Flow in both directions
  UNIDIRECTIONAL: 'unidirectional', // Flow in one direction
  INTERMITTENT: 'intermittent'     // Irregular flow
};

// Network metrics thresholds
export const NETWORK_THRESHOLDS = {
  DENSITY: {
    HIGH: 0.6,    // High network density
    MEDIUM: 0.3,  // Medium network density
    LOW: 0.1      // Low network density
  },
  CENTRALITY: {
    HIGH: 0.8,    // High centrality
    MEDIUM: 0.5,  // Medium centrality
    LOW: 0.2      // Low centrality
  }
};

// Flow visualization parameters
export const VISUALIZATION_PARAMS = {
  MIN_FLOW_WIDTH: 1,      // Minimum flow line width
  MAX_FLOW_WIDTH: 10,     // Maximum flow line width
  MIN_OPACITY: 0.3,       // Minimum flow opacity
  MAX_OPACITY: 0.9,       // Maximum flow opacity
  ANIMATION_DURATION: 300 // Animation duration in ms
};

// Flow analysis parameters
export const ANALYSIS_PARAMS = {
  MIN_FLOW_VALUE: 0.1,    // Minimum significant flow value
  MIN_CONNECTIONS: 2,     // Minimum connections for analysis
  TIME_WINDOW: 3,         // Default time window for analysis
  SIGNIFICANCE_LEVEL: 0.05 // Statistical significance threshold
};

// Flow color scheme
export const FLOW_COLORS = {
  POSITIVE: '#2196f3',    // Positive flow direction
  NEGATIVE: '#f44336',    // Negative flow direction
  NEUTRAL: '#9e9e9e',     // Neutral or baseline flow
  SELECTED: '#ffc107'     // Selected flow highlight
};

// Flow status indicators
export const FLOW_STATUS = {
  ACTIVE: 'active',           // Currently active flow
  INACTIVE: 'inactive',       // Currently inactive flow
  INCREASING: 'increasing',   // Flow volume increasing
  DECREASING: 'decreasing',   // Flow volume decreasing
  STABLE: 'stable'           // Stable flow volume
};

// Export all types and constants
export default {
  FLOW_THRESHOLDS,
  FLOW_TYPES,
  NETWORK_THRESHOLDS,
  VISUALIZATION_PARAMS,
  ANALYSIS_PARAMS,
  FLOW_COLORS,
  FLOW_STATUS
};
