// src/components/analysis/spatial/utils/mapUtils.js

import chroma from 'chroma-js';

/**
 * Formats a number to a fixed decimal or exponential notation if too small.
 * @param {number} value - The number to format.
 * @param {number} decimals - Number of decimal places.
 * @returns {string} - Formatted number.
 */
export const formatNumber = (value, decimals = 2) => {
  if (value === null || value === undefined || isNaN(value)) return 'N/A';
  if (Math.abs(value) < 0.01) return value.toExponential(decimals);
  return value.toFixed(decimals);
};

/**
 * Formats a p-value appropriately.
 * @param {number} value - The p-value to format.
 * @returns {string} - Formatted p-value.
 */
export const formatPValue = (value) => {
  if (value === null || value === undefined || isNaN(value)) return 'N/A';
  if (value < 0.01) return '< 0.01';
  return value.toFixed(2);
};

/**
 * Calculates statistical summaries of residuals.
 * @param {Array} residuals - Array of residual objects.
 * @returns {Object|null} - Statistical summaries or null if invalid input.
 */
export const getResidualStats = (residuals) => {
  if (!residuals || residuals.length === 0) return null;

  const values = residuals.map(r => r.residual).filter(r => !isNaN(r));
  if (values.length === 0) return null;

  const mean = _.mean(values);
  const stdDev = Math.sqrt(_.sum(values.map(r => Math.pow(r - mean, 2))) / values.length);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const domainPadding = (max - min) * 0.1; // Add 10% padding

  return {
    min: min - domainPadding,
    max: max + domainPadding,
    mean: Number(mean.toFixed(2)),
    stdDev: Number(stdDev.toFixed(2)),
    q1: Number(getQuantile(values, 0.25).toFixed(2)),
    q3: Number(getQuantile(values, 0.75).toFixed(2))
  };
};

/**
 * Determines map dimensions based on window width.
 * @param {number} windowWidth - The width of the window.
 * @returns {Object} - Map height and legend width.
 */
export const getMapDimensions = (windowWidth) => {
  if (windowWidth < 600) return { height: 300, legendWidth: 120 };
  if (windowWidth < 960) return { height: 400, legendWidth: 150 };
  return { height: 500, legendWidth: 180 };
};

/**
 * Generates a color scale based on residuals.
 * @param {number} min - Minimum residual value.
 * @param {number} max - Maximum residual value.
 * @param {Object} theme - Material-UI theme.
 * @returns {Function} - Chroma color scale function.
 */
export const getColorScale = (min, max, theme) => {
  // Ensure the scale is centered around zero for balanced visualization
  const maxAbs = Math.max(Math.abs(min), Math.abs(max));
  const scaleDomain = [-maxAbs, 0, maxAbs];

  return chroma.scale([
    theme.palette.error.main,
    theme.palette.grey[300],
    theme.palette.success.main,
  ]).domain(scaleDomain).classes(5);
};

/**
 * Styles for the map components.
 * @param {Object} theme - Material-UI theme.
 * @returns {Object} - Style definitions.
 */
export const MAP_STYLES = (theme) => ({
  container: {
    position: 'relative',
    width: '100%',
    borderRadius: theme.shape.borderRadius,
    overflow: 'hidden',
    boxShadow: theme.shadows[2]
  },
  tooltip: {
    backgroundColor: theme.palette.background.paper,
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: theme.shape.borderRadius,
    padding: theme.spacing(1),
    boxShadow: theme.shadows[2],
    fontSize: '0.875rem'
  }
});

/**
 * Calculates the quantile of an array.
 * @param {Array} arr - The array of numbers.
 * @param {number} q - The quantile to calculate (between 0 and 1).
 * @returns {number} - The quantile value.
 */
export const getQuantile = (arr, q) => {
  const sorted = Array.from(arr).sort((a, b) => a - b);
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;

  if (sorted[base + 1] !== undefined) {
    return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
  } else {
    return sorted[base];
  }
};

/**
 * Calculates the spatial lag based on weights.
 * @param {Array} values - Array of values.
 * @param {Array} weights - Array of weight arrays.
 * @returns {Array|null} - Array of spatial lag values or null if invalid input.
 */
export const calculateSpatialLag = (values, weights) => {
  if (!values || !weights || values.length !== weights.length) return null;

  return values.map((_, i) => {
    let weightedSum = 0;
    let totalWeight = 0;

    weights[i].forEach((weight, j) => {
      if (values[j] !== undefined && !isNaN(values[j])) {
        weightedSum += weight * values[j];
        totalWeight += weight;
      }
    });

    return totalWeight > 0 ? weightedSum / totalWeight : null;
  });
};

/**
 * Determines the style of a GeoJSON feature based on its value.
 * @param {number} value - The residual or spillover value.
 * @param {Function} colorScale - Chroma color scale function.
 * @param {Object} theme - Material-UI theme.
 * @param {boolean} selected - Whether the region is selected.
 * @returns {Object} - Style properties.
 */
export const getFeatureStyle = (value, colorScale, theme, selected = false) => {
  return {
    fillColor: value != null ? colorScale(value).hex() : theme.palette.grey[300],
    weight: selected ? 2 : 1,
    opacity: 1,
    color: selected ? theme.palette.primary.main : theme.palette.grey[500],
    fillOpacity: value != null ? (selected ? 0.8 : 0.7) : 0.3,
    dashArray: selected ? '3' : null
  };
};

/**
 * Formats tooltip values based on type.
 * @param {number} value - The value to format.
 * @param {string} type - The type of value (e.g., 'residual').
 * @returns {string} - Formatted value.
 */
export const formatTooltipValue = (value, type = 'residual') => {
  if (value == null || isNaN(value)) return 'N/A';

  switch (type) {
    case 'residual':
      return value.toFixed(4);
    case 'percentage':
      return `${(value * 100).toFixed(2)}%`;
    case 'price':
      return value.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
    default:
      return value.toString();
  }
};

/**
 * Calculates the bounding box for a set of GeoJSON features.
 * @param {Array} features - Array of GeoJSON features.
 * @returns {Array|null} - Bounding box coordinates or null.
 */
export const calculateBoundingBox = (features) => {
  if (!features || features.length === 0) return null;

  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;

  features.forEach(feature => {
    const coordinates = feature.geometry.coordinates;
    if (!coordinates) return;

    coordinates.forEach(ring => {
      ring.forEach(([lng, lat]) => {
        minLat = Math.min(minLat, lat);
        maxLat = Math.max(maxLat, lat);
        minLng = Math.min(minLng, lng);
        maxLng = Math.max(maxLng, lng);
      });
    });
  });

  return [[minLat, minLng], [maxLat, maxLng]];
};

export const DEFAULT_CENTER = [15.5527, 48.5164];
export const DEFAULT_ZOOM = 6;
export const DEFAULT_BOUNDS = [
  [12.5, 42.5],
  [19.0, 54.5]
];