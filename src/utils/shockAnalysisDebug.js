// src/utils/shockAnalysisDebug.js

export const DEBUG_SHOCK_ANALYSIS = {
  enabled: process.env.NODE_ENV === 'development',
  
  log: (message, data = {}) => {
    if (!DEBUG_SHOCK_ANALYSIS.enabled) return;
    
    console.group(`🔍 Shock Analysis: ${message}`);
    Object.entries(data).forEach(([key, value]) => {
      console.log(`${key}:`, value);
    });
    console.groupEnd();
  },

  error: (message, error) => {
    if (!DEBUG_SHOCK_ANALYSIS.enabled) return;
    
    console.group(`❌ Shock Analysis Error: ${message}`);
    console.error(error);
    console.groupEnd();
  },

  initializeDebugMonitor: (componentName) => {
    if (!DEBUG_SHOCK_ANALYSIS.enabled) return { finish: () => {} };

    const startTime = performance.now();
    console.log(`🏁 ${componentName} render started`);

    return {
      finish: () => {
        const duration = performance.now() - startTime;
        console.log(`✅ ${componentName} render completed in ${duration.toFixed(2)}ms`);
      }
    };
  }
};

export const monitorMapPerformance = (componentName) => {
  if (!DEBUG_SHOCK_ANALYSIS.enabled) return () => {};

  const monitor = {
    renders: 0,
    startTime: performance.now(),
    lastRenderTime: performance.now()
  };

  console.log(`🗺️ ${componentName} monitoring started`);

  return () => {
    const totalDuration = performance.now() - monitor.startTime;
    const avgRenderTime = totalDuration / (monitor.renders || 1);

    console.group(`🗺️ ${componentName} Performance Summary`);
    console.log('Total renders:', monitor.renders);
    console.log('Average render time:', avgRenderTime.toFixed(2) + 'ms');
    console.log('Total monitoring duration:', totalDuration.toFixed(2) + 'ms');
    console.groupEnd();
  };
};

export const validateShockData = (data) => {
  if (!DEBUG_SHOCK_ANALYSIS.enabled) return true;

  const issues = [];

  if (!data) {
    issues.push('Data object is null or undefined');
    return { valid: false, issues };
  }

  // Validate required fields
  const requiredFields = ['timeSeriesData', 'marketShocks', 'spatialAutocorrelation'];
  requiredFields.forEach(field => {
    if (!data[field]) {
      issues.push(`Missing required field: ${field}`);
    }
  });

  // Validate time series data
  if (Array.isArray(data.timeSeriesData)) {
    data.timeSeriesData.forEach((entry, index) => {
      if (!entry.region || !entry.month || typeof entry.usdPrice !== 'number') {
        issues.push(`Invalid time series entry at index ${index}`);
      }
    });
  }

  // Validate market shocks
  if (Array.isArray(data.marketShocks)) {
    data.marketShocks.forEach((shock, index) => {
      if (!shock.region || !shock.date || typeof shock.magnitude !== 'number') {
        issues.push(`Invalid shock entry at index ${index}`);
      }
    });
  }

  // Validate spatial autocorrelation
  if (data.spatialAutocorrelation) {
    if (!data.spatialAutocorrelation.global || !data.spatialAutocorrelation.local) {
      issues.push('Invalid spatial autocorrelation structure');
    }
  }

  return {
    valid: issues.length === 0,
    issues
  };
};

export default {
  DEBUG_SHOCK_ANALYSIS,
  monitorMapPerformance,
  validateShockData
};