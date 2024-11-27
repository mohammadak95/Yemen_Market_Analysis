// src/components/analysis/spatial-analysis/utils/shockMapUtils.js

import { validateNumber } from '../../../../utils/numberValidation';
import { getTextColor } from '../../../../utils/colorUtils';
import { backgroundMonitor } from '../../../../utils/backgroundMonitor';

/**
 * Get feature style for map rendering
 * @param {number} magnitude - Total shock magnitude
 * @param {Function} colorScale - D3 color scale function
 * @returns {Object} Leaflet style object
 */
export const getFeatureStyle = (magnitude, colorScale) => {
  try {
    const validMagnitude = validateNumber(magnitude, 0);
    const color = colorScale(validMagnitude);
    
    return {
      fillColor: color,
      weight: 1,
      opacity: 1,
      color: 'white',
      fillOpacity: validMagnitude > 0 ? 0.7 : 0.3,
      className: `shock-magnitude-${Math.round(validMagnitude * 100)}`
    };
  } catch (error) {
    console.error('Error generating feature style:', error);
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
 * Generate tooltip content for features
 * @param {Object} feature - GeoJSON feature
 * @param {Array} regionShocks - Array of shocks for the region
 * @returns {string} HTML content for tooltip
 */
export const getTooltipContent = (feature, regionShocks) => {
  try {
    if (!feature?.properties?.region_id || !Array.isArray(regionShocks)) {
      return 'Invalid region data';
    }

    const totalMagnitude = regionShocks.reduce(
      (sum, shock) => sum + validateNumber(shock.magnitude, 0),
      0
    );

    const avgMagnitude = regionShocks.length > 0 ? 
      totalMagnitude / regionShocks.length : 0;

    const latestShock = [...regionShocks]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      [0];

    const shockTypes = regionShocks.reduce((acc, shock) => {
      acc[shock.shock_type] = (acc[shock.shock_type] || 0) + 1;
      return acc;
    }, {});

    return `
      <div class="shock-tooltip">
        <h4>${feature.properties.originalName || feature.properties.region_id}</h4>
        ${regionShocks.length > 0 ? `
          <div class="shock-stats">
            <p>Number of Shocks: ${regionShocks.length}</p>
            <p>Average Magnitude: ${(avgMagnitude * 100).toFixed(1)}%</p>
            <p>Total Impact: ${(totalMagnitude * 100).toFixed(1)}%</p>
            ${latestShock ? `
              <p>Latest Shock: ${formatShockType(latestShock.shock_type)}</p>
              <p>Date: ${new Date(latestShock.date).toLocaleDateString()}</p>
            ` : ''}
          </div>
          ${Object.keys(shockTypes).length > 0 ? `
            <div class="shock-types">
              <h5>Shock Distribution:</h5>
              ${Object.entries(shockTypes)
                .map(([type, count]) => 
                  `<p>${formatShockType(type)}: ${count}</p>`
                )
                .join('')}
            </div>
          ` : ''}
        ` : '<p>No significant shocks detected</p>'}
      </div>
    `;
  } catch (error) {
    console.error('Error generating tooltip content:', error);
    return 'Error loading region data';
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

    const significantShocks = regionShocks.filter(
      shock => validateNumber(shock.magnitude, 0) >= threshold
    );

    const metrics = {
      totalShocks: significantShocks.length,
      totalMagnitude: significantShocks.reduce(
        (sum, shock) => sum + validateNumber(shock.magnitude, 0),
        0
      ),
      averageMagnitude: 0,
      maxMagnitude: Math.max(
        ...significantShocks.map(shock => validateNumber(shock.magnitude, 0))
      ),
      shockTypes: significantShocks.reduce((acc, shock) => {
        acc[shock.shock_type] = (acc[shock.shock_type] || 0) + 1;
        return acc;
      }, {})
    };

    metrics.averageMagnitude = metrics.totalShocks > 0 ?
      metrics.totalMagnitude / metrics.totalShocks : 0;

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

/**
 * Generate legend data for shock map
 * @param {number} maxMagnitude - Maximum shock magnitude
 * @param {number} steps - Number of legend steps
 * @returns {Array} Legend data array
 */
export const generateLegendData = (maxMagnitude, steps = 5) => {
  try {
    const validMax = validateNumber(maxMagnitude, 1);
    return Array.from({ length: steps }, (_, i) => ({
      value: (validMax * i) / (steps - 1),
      label: `${((validMax * i * 100) / (steps - 1)).toFixed(0)}%`
    }));
  } catch (error) {
    console.error('Error generating legend data:', error);
    return Array.from({ length: steps }, (_, i) => ({
      value: i / (steps - 1),
      label: `${((i * 100) / (steps - 1)).toFixed(0)}%`
    }));
  }
};