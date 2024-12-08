/**
 * Types and constants for market cluster analysis
 */

// Integration levels for market clusters
export const ClusterTypes = {
  HIGH_INTEGRATION: 'high_integration',      // Strong market connections and price correlation
  MODERATE_INTEGRATION: 'moderate_integration', // Partial market integration
  LOW_INTEGRATION: 'low_integration',        // Weak or fragmented markets
  TRANSITIONAL: 'transitional'               // Markets in transition
};

// Significance levels for statistical testing
export const SIGNIFICANCE_LEVELS = {
  HIGH: 0.01,    // 99% confidence
  MEDIUM: 0.05,  // 95% confidence
  LOW: 0.1       // 90% confidence
};

// Thresholds for efficiency classification
export const EFFICIENCY_THRESHOLDS = {
  HIGH: 0.7,     // High efficiency (>70%)
  MEDIUM: 0.4,   // Medium efficiency (40-70%)
  LOW: 0.2       // Low efficiency (<40%)
};

// Component weights for efficiency calculation
export const COMPONENT_WEIGHTS = {
  CONNECTIVITY: 0.4,      // Market network strength (40%)
  PRICE_INTEGRATION: 0.3, // Price correlation (30%)
  STABILITY: 0.2,         // Price stability (20%)
  RESILIENCE: 0.1        // Conflict resilience (10%)
};

// Default metrics for market clusters
export const DEFAULT_METRICS = {
  // Basic metrics
  avgPrice: 0,
  avgConflict: 0,
  marketCount: 0,
  
  // Efficiency components
  efficiency: 0,
  efficiencyComponents: {
    connectivity: 0,
    priceIntegration: 0,
    stability: 0,
    conflictResilience: 0
  },

  // Statistical measures
  significance: {
    pValue: 1,
    confidence: 0,
    reliability: 0
  },

  // Detailed metrics
  details: {
    priceVolatility: 0,
    integrationScore: 0,
    stabilityScore: 0,
    resilience: 0,
    coverage: 0,
    dataQuality: 0
  }
};

// Analysis parameters
export const ANALYSIS_PARAMS = {
  MIN_MARKETS: 2,           // Minimum markets for valid cluster
  MIN_DATA_POINTS: 3,       // Minimum data points for analysis
  MAX_PRICE_VARIANCE: 10,   // Maximum acceptable price variance
  CONFIDENCE_LEVEL: 0.95    // Default confidence level
};

// Market relationship types
export const MARKET_RELATIONSHIPS = {
  LEADER: 'leader',           // Price-setting market
  FOLLOWER: 'follower',       // Price-following market
  INDEPENDENT: 'independent', // Autonomous market
  ISOLATED: 'isolated'       // Disconnected market
};

// Data quality indicators
export const DATA_QUALITY = {
  HIGH: 'high',       // Complete and reliable data
  MEDIUM: 'medium',   // Partial or moderately reliable data
  LOW: 'low',         // Limited or potentially unreliable data
  INSUFFICIENT: 'insufficient' // Not enough data for analysis
};

// Metric calculation methods
export const CALCULATION_METHODS = {
  PEARSON: 'pearson',           // Pearson correlation
  SPEARMAN: 'spearman',         // Spearman rank correlation
  KENDALL: 'kendall',           // Kendall rank correlation
  CUSTOM: 'custom'              // Custom calculation method
};

// Export all types and constants
export default {
  ClusterTypes,
  SIGNIFICANCE_LEVELS,
  EFFICIENCY_THRESHOLDS,
  COMPONENT_WEIGHTS,
  DEFAULT_METRICS,
  ANALYSIS_PARAMS,
  MARKET_RELATIONSHIPS,
  DATA_QUALITY,
  CALCULATION_METHODS
};
