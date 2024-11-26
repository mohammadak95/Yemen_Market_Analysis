// src/components/analysis/spatial-analysis/components/shocks/shockMapUtils.js

/**
 * Get map feature style based on shock magnitude
 * @param {number} magnitude - Total shock magnitude for the region
 * @param {Function} colorScale - D3 color scale function
 * @returns {Object} Leaflet style object
 */
export const getFeatureStyle = (magnitude, colorScale) => ({
    fillColor: magnitude > 0 ? colorScale(magnitude) : '#cccccc',
    weight: 1,
    opacity: 1,
    color: 'white',
    fillOpacity: magnitude > 0 ? 0.7 : 0.4
  });
  
  /**
   * Generate tooltip content for map features
   * @param {Object} feature - GeoJSON feature
   * @param {Array} regionShocks - Array of shocks for the region
   * @returns {string} HTML content for tooltip
   */
  export const getTooltipContent = (feature, regionShocks) => {
    if (!regionShocks.length) return `
      <strong>${feature.properties.region_id}</strong><br/>
      No significant shocks detected
    `;
  
    const totalMagnitude = regionShocks.reduce((sum, shock) => sum + shock.magnitude, 0);
    const avgMagnitude = totalMagnitude / regionShocks.length;
    
    return `
      <strong>${feature.properties.region_id}</strong><br/>
      Number of Shocks: ${regionShocks.length}<br/>
      Average Magnitude: ${(avgMagnitude * 100).toFixed(1)}%<br/>
      Total Impact: ${(totalMagnitude * 100).toFixed(1)}%<br/>
      ${regionShocks.length > 0 ? 
        `Latest: ${regionShocks[regionShocks.length - 1].shock_type.replace('_', ' ')}` : 
        ''}
    `;
  };
  
  /**
   * Calculate the average propagation time between regions
   * @param {Array} shocks - Array of shock objects
   * @param {Object} spatialAutocorrelation - Spatial autocorrelation data
   * @returns {number} Average propagation time in days
   */
  export const calculatePropagationTime = (shocks, spatialAutocorrelation) => {
    if (!shocks?.length || !spatialAutocorrelation) return 0;
  
    let totalTime = 0;
    let count = 0;
  
    shocks.forEach((shock1, i) => {
      shocks.slice(i + 1).forEach(shock2 => {
        // Check if regions are connected in spatial autocorrelation
        const correlation = spatialAutocorrelation.local[shock1.region]?.local_i || 0;
        
        if (correlation > 0) {
          const time1 = new Date(shock1.date);
          const time2 = new Date(shock2.date);
          const timeDiff = Math.abs(time2 - time1) / (1000 * 60 * 60 * 24); // Convert to days
          
          if (timeDiff <= 30) { // Only consider shocks within 30 days
            totalTime += timeDiff;
            count++;
          }
        }
      });
    });
  
    return count > 0 ? totalTime / count : 0;
  };
  
  /**
   * Calculate shock intensity for a region
   * @param {Array} shocks - Array of shocks for the region
   * @param {number} threshold - Magnitude threshold
   * @returns {Object} Shock intensity metrics
   */
  export const calculateShockIntensity = (shocks, threshold) => {
    if (!shocks?.length) return { 
      intensity: 0, 
      frequency: 0, 
      avgMagnitude: 0 
    };
  
    const significantShocks = shocks.filter(shock => shock.magnitude >= threshold);
    
    return {
      intensity: significantShocks.reduce((sum, shock) => sum + shock.magnitude, 0),
      frequency: significantShocks.length,
      avgMagnitude: significantShocks.length > 0 ? 
        significantShocks.reduce((sum, shock) => sum + shock.magnitude, 0) / significantShocks.length : 
        0
    };
  };