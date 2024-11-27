// src/components/analysis/spatial-analysis/utils/shockMapUtils.js

import { backgroundMonitor } from '../../../../utils/backgroundMonitor';

/**
 * Get map feature style based on shock magnitude with error handling and caching
 * @param {number} magnitude - Total shock magnitude for the region
 * @param {Function} colorScale - D3 color scale function
 * @returns {Object} Leaflet style object
 */
const styleCache = new Map();

const getFeatureStyle = (magnitude, colorScale) => {
  const cacheKey = `${magnitude}-${colorScale?.(magnitude)}`;
  
  if (styleCache.has(cacheKey)) {
    return styleCache.get(cacheKey);
  }

  try {
    const style = {
      fillColor: magnitude > 0 ? colorScale(magnitude) : '#cccccc',
      weight: 1,
      opacity: 1,
      color: 'white',
      fillOpacity: magnitude > 0 ? 0.7 : 0.4
    };

/**
 * Analyze shock clusters and their characteristics
 * @param {Array} shocks - Array of shock objects
 * @param {Object} spatialAutocorrelation - Spatial autocorrelation data
 * @returns {Object} Cluster analysis results
 */
const analyzeShockClusters = (shocks, spatialAutocorrelation) => {
  const metric = backgroundMonitor.startMetric('shock-cluster-analysis');

  try {
    if (!shocks?.length || !spatialAutocorrelation) {
      metric.finish({ status: 'skipped', reason: 'missing-data' });
      return {
        clusters: [],
        metrics: getDefaultClusterMetrics()
      };
    }

    // Group shocks by region and time window
    const clusters = [];
    const processedShocks = new Set();

    shocks.forEach(shock => {
      if (!processedShocks.has(shock)) {
        const cluster = findConnectedShocks(
          shock,
          shocks,
          spatialAutocorrelation,
          processedShocks
        );

        if (cluster.shocks.length > 1) {
          clusters.push(cluster);
        }
      }
    });

    // Calculate cluster metrics
    const metrics = {
      totalClusters: clusters.length,
      averageClusterSize: clusters.reduce((sum, c) => sum + c.shocks.length, 0) / clusters.length || 0,
      maxClusterSize: Math.max(...clusters.map(c => c.shocks.length), 0),
      clusterCoverage: new Set(clusters.flatMap(c => c.shocks.map(s => s.region))).size / 
                      new Set(shocks.map(s => s.region)).size,
      averageIntensity: clusters.reduce((sum, c) => sum + c.intensity, 0) / clusters.length || 0
    };

    metric.finish({ 
      status: 'success', 
      clusterCount: clusters.length,
      totalShocks: shocks.length
    });

    return { clusters, metrics };
  } catch (error) {
    backgroundMonitor.logError('shock-cluster-analysis', {
      message: error.message,
      stack: error.stack
    });

    metric.finish({ status: 'failed', error: error.message });
    return {
      clusters: [],
      metrics: getDefaultClusterMetrics()
    };
  }
};

/**
 * Find connected shocks using spatial and temporal proximity
 * @param {Object} initialShock - Starting shock
 * @param {Array} allShocks - All shocks
 * @param {Object} spatialAutocorrelation - Spatial autocorrelation data
 * @param {Set} processedShocks - Set of processed shocks
 * @returns {Object} Cluster information
 */
const findConnectedShocks = (
  initialShock,
  allShocks,
  spatialAutocorrelation,
  processedShocks
) => {
  const cluster = {
    shocks: [initialShock],
    regions: new Set([initialShock.region]),
    startDate: new Date(initialShock.date),
    endDate: new Date(initialShock.date),
    intensity: initialShock.magnitude
  };

  processedShocks.add(initialShock);
  const queue = [initialShock];

  while (queue.length > 0) {
    const currentShock = queue.shift();
    const currentDate = new Date(currentShock.date);

    allShocks.forEach(shock => {
      if (!processedShocks.has(shock)) {
        const shockDate = new Date(shock.date);
        const timeDiff = Math.abs(shockDate - currentDate) / (1000 * 60 * 60 * 24);

        if (timeDiff <= 30) {
          const correlation = spatialAutocorrelation.local?.[currentShock.region]?.local_i || 0;
          const targetCorrelation = spatialAutocorrelation.local?.[shock.region]?.local_i || 0;

          if (correlation > 0 && targetCorrelation > 0) {
            cluster.shocks.push(shock);
            cluster.regions.add(shock.region);
            cluster.startDate = new Date(Math.min(cluster.startDate, shockDate));
            cluster.endDate = new Date(Math.max(cluster.endDate, shockDate));
            cluster.intensity += shock.magnitude;

            processedShocks.add(shock);
            queue.push(shock);
          }
        }
      }
    });
  }

  return {
    ...cluster,
    regions: Array.from(cluster.regions),
    duration: (cluster.endDate - cluster.startDate) / (1000 * 60 * 60 * 24),
    averageIntensity: cluster.intensity / cluster.shocks.length
  };
};

/**
 * Get default cluster metrics
 * @returns {Object} Default metrics
 */
const getDefaultClusterMetrics = () => ({
  totalClusters: 0,
  averageClusterSize: 0,
  maxClusterSize: 0,
  clusterCoverage: 0,
  averageIntensity: 0
});

    styleCache.set(cacheKey, style);
    return style;
  } catch (error) {
    backgroundMonitor.logError('feature-style-calculation', {
      magnitude,
      error: error.message
    });
    
    return {
      fillColor: '#cccccc',
      weight: 1,
      opacity: 1,
      color: 'white',
      fillOpacity: 0.4
    };
  }
};

/**
 * Generate tooltip content with proper sanitization and formatting
 * @param {Object} feature - GeoJSON feature
 * @param {Array} regionShocks - Array of shocks for the region
 * @returns {string} HTML content for tooltip
 */
const getTooltipContent = (feature, regionShocks) => {
  try {
    if (!feature?.properties?.region_id) {
      throw new Error('Invalid feature properties');
    }

    if (!Array.isArray(regionShocks)) {
      throw new Error('Invalid shock data');
    }

    const metrics = calculateShockMetrics(regionShocks);

    return `
      <div class="shock-tooltip">
        <strong>${escapeHtml(feature.properties.region_id)}</strong>
        <br/>
        ${metrics.shockCount > 0 ? `
          <span>Number of Shocks: ${metrics.shockCount}</span><br/>
          <span>Average Magnitude: ${metrics.avgMagnitude}%</span><br/>
          <span>Total Impact: ${metrics.totalImpact}%</span><br/>
          <span>Latest: ${metrics.latestShockType}</span>
        ` : 'No significant shocks detected'}
      </div>
    `;
  } catch (error) {
    backgroundMonitor.logError('tooltip-generation', {
      feature: feature?.properties?.region_id,
      error: error.message
    });
    
    return '<div class="shock-tooltip">Error loading shock data</div>';
  }
};

/**
 * Calculate shock metrics for tooltip
 * @param {Array} shocks - Array of shocks
 * @returns {Object} Calculated metrics
 */
const calculateShockMetrics = (shocks) => {
  if (!shocks.length) {
    return {
      shockCount: 0,
      avgMagnitude: 0,
      totalImpact: 0,
      latestShockType: 'None'
    };
  }

  const totalMagnitude = shocks.reduce((sum, shock) => sum + shock.magnitude, 0);
  const latestShock = [...shocks].sort((a, b) => 
    new Date(b.date) - new Date(a.date)
  )[0];

  return {
    shockCount: shocks.length,
    avgMagnitude: (totalMagnitude / shocks.length * 100).toFixed(1),
    totalImpact: (totalMagnitude * 100).toFixed(1),
    latestShockType: formatShockType(latestShock.shock_type)
  };
};

/**
 * Format shock type for display
 * @param {string} shockType - Raw shock type
 * @returns {string} Formatted shock type
 */
const formatShockType = (shockType) => {
  return shockType
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

/**
 * Escape HTML characters for safety
 * @param {string} str - Input string
 * @returns {string} Escaped string
 */
const escapeHtml = (str) => {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
};

/**
 * Calculate propagation time between regions
 * @param {Array} shocks - Array of shock objects
 * @param {Object} spatialAutocorrelation - Spatial autocorrelation data
 * @returns {number} Average propagation time in days
 */
const calculatePropagationTime = (shocks, spatialAutocorrelation) => {
  const metric = backgroundMonitor.startMetric('propagation-time-calculation');

  try {
    if (!shocks?.length || !spatialAutocorrelation) {
      metric.finish({ status: 'skipped', reason: 'missing-data' });
      return {
        averagePropagationTime: 0,
        propagationPaths: [],
        metrics: {
          totalPaths: 0,
          maxDelay: 0,
          minDelay: 0
        }
      };
    }

    const propagationPaths = [];
    let totalTime = 0;
    let count = 0;
    let maxDelay = 0;
    let minDelay = Infinity;

    // Sort shocks by date for efficient processing
    const sortedShocks = [...shocks].sort((a, b) => new Date(a.date) - new Date(b.date));

    // Calculate propagation paths and times
    sortedShocks.forEach((shock1, i) => {
      const shock1Time = new Date(shock1.date);
      
      sortedShocks.slice(i + 1).forEach(shock2 => {
        const shock2Time = new Date(shock2.date);
        const timeDiff = (shock2Time - shock1Time) / (1000 * 60 * 60 * 24); // Convert to days

        // Only consider shocks within 30 days and check spatial correlation
        if (timeDiff <= 30) {
          const correlation = spatialAutocorrelation.local?.[shock1.region]?.local_i || 0;
          const targetCorrelation = spatialAutocorrelation.local?.[shock2.region]?.local_i || 0;
          
          // Check if regions are spatially correlated
          if (correlation > 0 && targetCorrelation > 0) {
            propagationPaths.push({
              source: {
                region: shock1.region,
                date: shock1.date,
                magnitude: shock1.magnitude,
                correlation
              },
              target: {
                region: shock2.region,
                date: shock2.date,
                magnitude: shock2.magnitude,
                correlation: targetCorrelation
              },
              propagationTime: timeDiff,
              strengthIndex: calculatePropagationStrength(
                shock1.magnitude, 
                shock2.magnitude, 
                correlation,
                targetCorrelation
              )
            });

            totalTime += timeDiff;
            count++;
            maxDelay = Math.max(maxDelay, timeDiff);
            minDelay = Math.min(minDelay, timeDiff);
          }
        }
      });
    });

    const averagePropagationTime = count > 0 ? totalTime / count : 0;

    // Calculate additional metrics
    const metrics = {
      totalPaths: count,
      maxDelay,
      minDelay: minDelay === Infinity ? 0 : minDelay,
      pathDensity: count / (shocks.length * (shocks.length - 1) / 2),
      averageStrength: propagationPaths.reduce((sum, path) => sum + path.strengthIndex, 0) / count || 0
    };

    metric.finish({ 
      status: 'success', 
      pathCount: count,
      avgPropagationTime: averagePropagationTime 
    });

    return {
      averagePropagationTime,
      propagationPaths: propagationPaths.sort((a, b) => b.strengthIndex - a.strengthIndex),
      metrics
    };
  } catch (error) {
    backgroundMonitor.logError('propagation-time-calculation', {
      message: error.message,
      stack: error.stack
    });

    metric.finish({ status: 'failed', error: error.message });

    return {
      averagePropagationTime: 0,
      propagationPaths: [],
      metrics: {
        totalPaths: 0,
        maxDelay: 0,
        minDelay: 0,
        pathDensity: 0,
        averageStrength: 0
      }
    };
  }
};

/**
 * Calculate propagation strength between two shocks
 * @param {number} sourceMagnitude - Magnitude of source shock
 * @param {number} targetMagnitude - Magnitude of target shock
 * @param {number} sourceCorrelation - Spatial correlation of source region
 * @param {number} targetCorrelation - Spatial correlation of target region
 * @returns {number} Strength index between 0 and 1
 */
const calculatePropagationStrength = (
  sourceMagnitude,
  targetMagnitude,
  sourceCorrelation,
  targetCorrelation
) => {
  try {
    // Weight factors for different components
    const weights = {
      magnitudeRatio: 0.4,
      correlationProduct: 0.3,
      magnitudeProduct: 0.3
    };

    // Calculate magnitude ratio (closer to 1 means similar magnitudes)
    const magnitudeRatio = Math.min(sourceMagnitude, targetMagnitude) / 
                          Math.max(sourceMagnitude, targetMagnitude);

    // Calculate correlation product (higher means stronger spatial relationship)
    const correlationProduct = Math.abs(sourceCorrelation * targetCorrelation);

    // Calculate magnitude product (higher means stronger combined effect)
    const magnitudeProduct = Math.min(1, (sourceMagnitude * targetMagnitude) / 2);

    // Combine components using weights
    const strength = (magnitudeRatio * weights.magnitudeRatio) +
                    (correlationProduct * weights.correlationProduct) +
                    (magnitudeProduct * weights.magnitudeProduct);

    return Math.max(0, Math.min(1, strength));
  } catch (error) {
    backgroundMonitor.logError('propagation-strength-calculation', {
      message: error.message,
      sourceMagnitude,
      targetMagnitude,
      sourceCorrelation,
      targetCorrelation
    });
    return 0;
  }
};

export {
  getFeatureStyle,
  analyzeShockClusters,
  findConnectedShocks,
  getDefaultClusterMetrics,
  getTooltipContent,
  calculateShockMetrics,
  formatShockType,
  escapeHtml,
  calculatePropagationTime,
  calculatePropagationStrength
};