// src/components/analysis/spatial-analysis/utils/shockMapUtils.js

import { validateNumber } from '../../../../utils/numberValidation';
import { getTextColor } from '../../../../utils/colorUtils';
import { backgroundMonitor } from '../../../../utils/backgroundMonitor';
import { DEBUG_SHOCK_ANALYSIS } from '../../../../utils/shockAnalysisDebug';

/**
 * Get feature style for map rendering
 * @param {number} magnitude - Total shock magnitude
 * @param {Function} colorScale - D3 color scale function
 * @returns {Object} Leaflet style object
 */
export const getFeatureStyle = (magnitude, colorScale) => {
  const metric = backgroundMonitor.startMetric('feature-style-calculation');
  
  try {
    // Ensure magnitude is a valid number
    const validMagnitude = typeof magnitude === 'number' && !isNaN(magnitude) 
      ? magnitude 
      : 0;
    
    const style = {
      fillColor: validMagnitude > 0 ? colorScale(validMagnitude) : '#cccccc',
      weight: 1,
      opacity: 1,
      color: 'white',
      fillOpacity: validMagnitude > 0 ? 0.7 : 0.3
    };

    metric.finish({ status: 'success', magnitude: validMagnitude });
    return style;
  } catch (error) {
    console.error('Error generating feature style:', error);
    metric.finish({ status: 'failed', error: error.message });
    return {
      fillColor: '#cccccc',
      weight: 1,
      opacity: 1,
      color: 'white',
      fillOpacity: 0.3
    };
  }
};

/**
 * Generate tooltip content for map features
 * @param {Object} feature - GeoJSON feature
 * @param {Array} regionShocks - Array of shocks for the region
 * @returns {string} HTML tooltip content
 */
export const getTooltipContent = (feature, regionShocks) => {
  const metric = backgroundMonitor.startMetric('tooltip-content-generation');
  
  try {
    if (!feature?.properties?.region_id) {
      throw new Error('Invalid feature properties');
    }

    if (!Array.isArray(regionShocks)) {
      regionShocks = [];
    }

    const metrics = {
      shockCount: regionShocks.length,
      avgMagnitude: regionShocks.length > 0
        ? regionShocks.reduce((sum, s) => sum + s.magnitude, 0) / regionShocks.length
        : 0,
      totalImpact: regionShocks.reduce((sum, s) => sum + s.magnitude, 0),
      latestShock: regionShocks.length > 0
        ? [...regionShocks].sort((a, b) => new Date(b.date) - new Date(a.date))[0]
        : null
    };

    DEBUG_SHOCK_ANALYSIS.log('Tooltip metrics:', {
      region: feature.properties.region_id,
      metrics
    });

    const content = `
      <div class="shock-tooltip">
        <strong>${escapeHtml(feature.properties.region_id)}</strong>
        <br/>
        ${metrics.shockCount > 0 ? `
          <span>Number of Shocks: ${metrics.shockCount}</span><br/>
          <span>Average Magnitude: ${metrics.avgMagnitude.toFixed(1)}%</span><br/>
          <span>Total Impact: ${metrics.totalImpact.toFixed(1)}%</span><br/>
          ${metrics.latestShock ? `
            <span>Latest: ${formatShockType(metrics.latestShock.shock_type)}</span>
          ` : ''}
        ` : 'No significant shocks detected'}
      </div>
    `;

    metric.finish({ status: 'success', shockCount: metrics.shockCount });
    return content;
  } catch (error) {
    console.error('Error generating tooltip:', error);
    metric.finish({ status: 'failed', error: error.message });
    return '<div class="shock-tooltip">Error loading shock data</div>';
  }
};

/**
 * Format shock type for display
 * @param {string} shockType - Raw shock type string
 * @returns {string} Formatted shock type
 */
export const formatShockType = (shockType) => {
  if (!shockType) return 'Unknown';
  return shockType
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

/**
 * Calculate shock intensity for region
 * @param {Array} regionShocks - Array of shocks for region
 * @param {number} threshold - Magnitude threshold
 * @returns {Object} Shock intensity metrics
 */
export const calculateShockIntensity = (regionShocks, threshold = 0) => {
  const metric = backgroundMonitor.startMetric('shock-intensity-calculation');

  try {
    if (!Array.isArray(regionShocks)) {
      throw new Error('Invalid shocks data');
    }

    // Filter valid shocks
    const significantShocks = regionShocks.filter(shock => 
      shock && 
      typeof shock.magnitude === 'number' && 
      !isNaN(shock.magnitude) &&
      shock.magnitude >= threshold
    );

    const metrics = {
      totalShocks: significantShocks.length,
      totalMagnitude: significantShocks.reduce(
        (sum, shock) => sum + shock.magnitude,
        0
      ),
      averageMagnitude: 0,
      maxMagnitude: Math.max(
        ...significantShocks.map(shock => shock.magnitude),
        0
      ),
      shockTypes: significantShocks.reduce((acc, shock) => {
        if (shock.shock_type) {
          acc[shock.shock_type] = (acc[shock.shock_type] || 0) + 1;
        }
        return acc;
      }, {})
    };

    metrics.averageMagnitude = metrics.totalShocks > 0 ?
      metrics.totalMagnitude / metrics.totalShocks : 0;

    DEBUG_SHOCK_ANALYSIS.log('Shock intensity metrics:', metrics);
    metric.finish({ status: 'success', metrics });
    return metrics;

  } catch (error) {
    console.error('Error calculating shock intensity:', error);
    metric.finish({ status: 'failed', error: error.message });
    return {
      totalShocks: 0,
      totalMagnitude: 0,
      averageMagnitude: 0,
      maxMagnitude: 0,
      shockTypes: {}
    };
  }
};

const escapeHtml = (str) => {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
};

// Export for testing
export const __testing = {
  escapeHtml,
  calculateShockIntensity,
  getFeatureStyle,
  getTooltipContent,
  formatShockType
};