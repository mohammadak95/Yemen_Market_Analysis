/**
 * Types and constants for market shock analysis
 */

// Shock magnitude thresholds
export const SHOCK_THRESHOLDS = {
  SEVERE: 0.25,    // 25% price change
  MODERATE: 0.15,  // 15% price change
  MILD: 0.10      // 10% price change
};

// Shock types based on characteristics
export const SHOCK_TYPES = {
  PRICE_SURGE: 'price_surge',   // Sudden price increase
  PRICE_DROP: 'price_drop',     // Sudden price decrease
  VOLATILITY: 'volatility'      // High price volatility
};

// Shock propagation thresholds
export const PROPAGATION_THRESHOLDS = {
  DISTANCE: {
    HIGH: 300,    // High propagation distance (km)
    MEDIUM: 150,  // Medium propagation distance (km)
    LOW: 50       // Low propagation distance (km)
  },
  TIME: {
    FAST: 7,      // Fast propagation (days)
    MEDIUM: 14,   // Medium propagation (days)
    SLOW: 30      // Slow propagation (days)
  }
};

// Shock visualization parameters
export const VISUALIZATION_PARAMS = {
  // Shock point parameters
  MIN_SHOCK_SIZE: 6,       // Minimum shock point size
  MAX_SHOCK_SIZE: 15,      // Maximum shock point size
  MIN_OPACITY: 0.6,        // Minimum shock opacity
  MAX_OPACITY: 1.0,        // Maximum shock opacity
  
  // Propagation parameters
  PROPAGATION_OPACITY: 0.4,  // Propagation area opacity
  PROPAGATION_WEIGHT: 2,     // Propagation border weight
  
  // Selection parameters
  SELECTION_SCALE: 1.5,    // Scale factor for selected elements
  HOVER_SCALE: 1.2,        // Scale factor for hovered elements
  
  // Animation parameters
  ANIMATION_DURATION: 300  // Animation duration in ms
};

// Shock color scheme
export const SHOCK_COLORS = {
  PRICE_SURGE: '#d32f2f',    // Price surge color (red)
  PRICE_DROP: '#1976d2',     // Price drop color (blue)
  VOLATILITY: '#ff9800',     // Volatility color (orange)
  PROPAGATION: '#757575',    // Propagation color (gray)
  SELECTED: '#ffc107',       // Selected shock highlight (amber)
  INACTIVE: '#bdbdbd'        // Inactive shock color (light gray)
};

// Shock status indicators
export const SHOCK_STATUS = {
  ACTIVE: 'Active',           // Currently active shock
  PROPAGATING: 'Propagating', // Shock is propagating
  DISSIPATING: 'Dissipating', // Shock is dissipating
  RESOLVED: 'Resolved'        // Shock has resolved
};

// Analysis parameters
export const ANALYSIS_PARAMS = {
  MIN_MAGNITUDE: 0.10,     // Minimum shock magnitude
  MIN_DURATION: 1,         // Minimum shock duration (months)
  SIGNIFICANCE_LEVEL: 0.05 // Statistical significance threshold
};

// Helper functions for shock validation and processing
export const shockValidation = {
  // Filter shocks by date
  filterShocksByDate: (shocks, selectedDate) => {
    if (!Array.isArray(shocks) || !selectedDate) {
      console.debug('Invalid parameters for filterShocksByDate:', { 
        hasShocks: Boolean(shocks), 
        isArray: Array.isArray(shocks),
        selectedDate 
      });
      return [];
    }

    // Convert selectedDate to YYYY-MM format if it's in YYYY-MM-DD format
    const targetDate = selectedDate.substring(0, 7);

    return shocks.filter(shock => {
      if (!shock || !shock.date) {
        console.debug('Invalid shock object:', shock);
        return false;
      }
      // Convert shock date to YYYY-MM format for comparison
      const shockDate = shock.date.substring(0, 7);
      return shockDate === targetDate;
    });
  },

  // Validate basic shock structure
  isValidShock: (shock) => {
    const isValid = shock && 
      typeof shock === 'object' &&
      typeof shock.region === 'string' &&
      typeof shock.date === 'string' &&
      typeof shock.magnitude === 'number' &&
      !isNaN(shock.magnitude) &&
      typeof shock.shock_type === 'string' &&
      ['price_surge', 'price_drop'].includes(shock.shock_type);

    if (!isValid && shock) {
      console.debug('Invalid shock:', {
        hasRegion: typeof shock.region === 'string',
        hasDate: typeof shock.date === 'string',
        hasMagnitude: typeof shock.magnitude === 'number',
        hasType: typeof shock.shock_type === 'string',
        validType: ['price_surge', 'price_drop'].includes(shock.shock_type),
        shock
      });
    }

    return isValid;
  },

  // Get shock magnitude
  getShockMagnitude: (shock) => {
    if (!shock || typeof shock.magnitude !== 'number' || isNaN(shock.magnitude)) {
      return 0;
    }
    return shock.magnitude;
  },

  // Get shock severity based on magnitude
  getShockSeverity: (magnitude) => {
    if (typeof magnitude !== 'number' || isNaN(magnitude)) {
      console.debug('Invalid magnitude for severity:', magnitude);
      return 'mild';
    }

    if (magnitude >= SHOCK_THRESHOLDS.SEVERE) return 'severe';
    if (magnitude >= SHOCK_THRESHOLDS.MODERATE) return 'moderate';
    if (magnitude >= SHOCK_THRESHOLDS.MILD) return 'mild';
    return 'insignificant';
  },

  // Calculate shock metrics for an array of shocks
  calculateShockMetrics: (shocks) => {
    if (!Array.isArray(shocks)) {
      console.debug('Invalid shocks array for metrics calculation');
      return null;
    }

    const validShocks = shocks.filter(shockValidation.isValidShock);
    if (!validShocks.length) {
      console.debug('No valid shocks found for metrics calculation');
      return null;
    }

    const magnitudes = validShocks.map(shockValidation.getShockMagnitude);
    const avgMagnitude = magnitudes.reduce((sum, val) => sum + val, 0) / magnitudes.length;
    const maxMagnitude = Math.max(...magnitudes);
    const minMagnitude = Math.min(...magnitudes);

    // Calculate standard deviation
    const variance = magnitudes.reduce((sum, val) => 
      sum + Math.pow(val - avgMagnitude, 2), 0) / magnitudes.length;
    const stdDev = Math.sqrt(variance);

    // Count shock types
    const priceSurges = validShocks.filter(s => s.shock_type === 'price_surge').length;
    const priceDrops = validShocks.filter(s => s.shock_type === 'price_drop').length;

    return {
      totalShocks: validShocks.length,
      avgMagnitude,
      maxMagnitude,
      minMagnitude,
      stdDev,
      priceSurges,
      priceDrops,
      affectedRegions: new Set(validShocks.map(s => s.region)).size
    };
  }
};

export default {
  SHOCK_THRESHOLDS,
  SHOCK_TYPES,
  PROPAGATION_THRESHOLDS,
  VISUALIZATION_PARAMS,
  SHOCK_COLORS,
  SHOCK_STATUS,
  ANALYSIS_PARAMS,
  shockValidation
};
