// src/selectors/shockSelectors.js

import { createSelector } from 'reselect';
import {
  selectTimeSeriesData as baseTimeSeriesSelector,
  selectGeometryData as baseGeometrySelector,
  selectMarketShocks as baseMarketShocksSelector,
  selectSpatialAutocorrelation as baseSpatialAutocorrelationSelector
} from './optimizedSelectors';

// Base selector
const selectSpatialSlice = state => state.spatial || {};
const selectSpatialData = state => state.spatial?.data || {};

// Base selector for market shocks
export const selectMarketShocks = createSelector(
  [selectSpatialData],
  data => {
    try {
      return Array.isArray(data.marketShocks) ? data.marketShocks : [];
    } catch (error) {
      console.error('Error selecting market shocks:', error);
      return [];
    }
  }
);

// Selector for time series data
export const selectTimeSeriesData = createSelector(
  [selectSpatialData],
  (data) => {
    try {
      // Ensure data includes region
      return Array.isArray(data.timeSeriesData)
        ? data.timeSeriesData.filter((entry) => entry.region)
        : [];
    } catch (error) {
      console.error('Error selecting time series data:', error);
      return [];
    }
  }
);

// Selector for spatial autocorrelation
export const selectSpatialAutocorrelation = createSelector(
  [baseSpatialAutocorrelationSelector],
  (autocorrelation) => autocorrelation || {}
);

// Enhanced geometry selector with proper structure handling
export const selectGeometryData = createSelector(
  [baseGeometrySelector],
  (geometry) => {
    try {
      if (!geometry) return null;

      return {
        points: Array.isArray(geometry.points) ? geometry.points : [],
        polygons: Array.isArray(geometry.polygons) ? geometry.polygons : [],
        unified: geometry.unified || null,
        type: geometry.type || 'unified'
      };
    } catch (error) {
      console.error('Error selecting geometry data:', error);
      return null;
    }
  }
);

// Memoized selector for filtered shocks
export const selectFilteredShocks = createSelector(
  [
    baseMarketShocksSelector,
    (_, filters) => filters?.date,
    (_, filters) => filters?.shockType,
    (_, filters) => filters?.threshold,
  ],
  (shocks, date, shockType, threshold) => {
    try {
      if (!Array.isArray(shocks)) return [];

      return shocks.filter((shock) => {
        if (!shock.region || typeof shock.magnitude !== 'number') return false;
        if (date && shock.date !== date) return false;
        if (shockType && shockType !== 'all' && shock.shock_type !== shockType)
          return false;
        if (typeof threshold === 'number' && shock.magnitude < threshold)
          return false;
        return true;
      });
    } catch (error) {
      console.error('Error filtering shocks:', error);
      return [];
    }
  }
);



// Selector for shocks by region
export const selectShocksByRegion = createSelector(
  [selectMarketShocks, (_, regionId) => regionId],
  (shocks, regionId) => {
    if (!regionId) return [];
    return shocks.filter(shock => shock.region === regionId);
  }
);

// Selector for shock statistics
export const selectShockStats = createSelector(
  [selectMarketShocks],
  shocks => {
    try {
      if (!shocks.length) return null;

      const stats = {
        totalShocks: shocks.length,
        maxMagnitude: Math.max(...shocks.map(s => s.magnitude)),
        avgMagnitude: shocks.reduce((sum, s) => sum + s.magnitude, 0) / shocks.length,
        regionsAffected: new Set(shocks.map(s => s.region)).size,
        shockTypes: shocks.reduce((acc, s) => {
          acc[s.shock_type] = (acc[s.shock_type] || 0) + 1;
          return acc;
        }, {}),
        temporalDistribution: shocks.reduce((acc, s) => {
          const month = s.date.substring(0, 7);
          acc[month] = (acc[month] || 0) + 1;
          return acc;
        }, {})
      };

      return stats;
    } catch (error) {
      console.error('Error calculating shock stats:', error);
      return null;
    }
  }
);

// Selector for shock timeline
export const selectShockTimeline = createSelector(
  [selectMarketShocks],
  shocks => {
    try {
      if (!shocks.length) return [];

      return shocks
        .map(shock => ({
          date: shock.date,
          region: shock.region,
          magnitude: shock.magnitude,
          type: shock.shock_type
        }))
        .sort((a, b) => new Date(a.date) - new Date(b.date));
    } catch (error) {
      console.error('Error creating shock timeline:', error);
      return [];
    }
  }
);

// Helper function to calculate distance between points
const calculateDistance = (point1, point2) => {
  if (!point1 || !point2) return null;
  
  const [lon1, lat1] = point1;
  const [lon2, lat2] = point2;
  
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

const toRad = (value) => value * Math.PI / 180;

// Selector for shock propagation
export const selectShockPropagation = createSelector(
  [selectMarketShocks, selectSpatialData],
  (shocks, spatialData) => {
    try {
      if (!shocks.length || !spatialData.spatialAutocorrelation) return [];

      const propagationPatterns = [];
      const shocksByMonth = {};

      // Group shocks by month
      shocks.forEach(shock => {
        const month = shock.date.substring(0, 7);
        if (!shocksByMonth[month]) shocksByMonth[month] = [];
        shocksByMonth[month].push(shock);
      });

      // Analyze propagation for each month
      Object.entries(shocksByMonth).forEach(([month, monthShocks]) => {
        const propagation = monthShocks.map(shock => {
          const { region, magnitude, date } = shock;
          const neighbors = spatialData.spatialAutocorrelation[region] || [];
          return {
            region,
            magnitude,
            date,
            neighbors: neighbors.map(neighbor => ({
              region: neighbor,
              distance: calculateDistance(
                spatialData.geometry.points[region],
                spatialData.geometry.points[neighbor]
              )
            }))
          };
        });
        propagationPatterns.push({ month, propagation });
      });

      return propagationPatterns;
    } catch (error) {
      console.error('Error calculating shock propagation:', error);
      return [];
    }
  }
);

// Selector for shock intensity by region
export const selectShockIntensityByRegion = createSelector(
  [selectMarketShocks, (_, regionId) => regionId],
  (shocks, regionId) => {
    if (!regionId || !shocks.length) return null;

    const regionShocks = shocks.filter(s => s.region === regionId);
    if (!regionShocks.length) return null;

    return {
      totalShocks: regionShocks.length,
      avgMagnitude: regionShocks.reduce((sum, s) => sum + s.magnitude, 0) / regionShocks.length,
      maxMagnitude: Math.max(...regionShocks.map(s => s.magnitude)),
      types: regionShocks.reduce((acc, s) => {
        acc[s.shock_type] = (acc[s.shock_type] || 0) + 1;
        return acc;
      }, {}),
      latestShock: [...regionShocks].sort((a, b) => new Date(b.date) - new Date(a.date))[0]
    };
  }
);

// Helper function to calculate correlation coefficient
const calculateCorrelation = (x, y) => {
  const n = x.length;
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
  const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);
  const sumYY = y.reduce((sum, yi) => sum + yi * yi, 0);

  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt((n * sumXX - sumX * sumX) * (n * sumYY - sumY * sumY));

  return denominator === 0 ? 0 : numerator / denominator;
};

// Selector for shock correlation with conflict
export const selectShockCorrelationWithConflict = createSelector(
  [selectMarketShocks, selectSpatialData],
  (shocks, spatialData) => {
    if (!shocks.length || !spatialData.timeSeriesData) return null;

    try {
      const correlations = shocks.map(shock => {
        const timeSeriesEntry = spatialData.timeSeriesData.find(
          ts => ts.region === shock.region && ts.month === shock.date.substring(0, 7)
        );

        return timeSeriesEntry ? {
          magnitude: shock.magnitude,
          conflictIntensity: timeSeriesEntry.conflictIntensity || 0,
          region: shock.region,
          date: shock.date
        } : null;
      }).filter(Boolean);

      if (correlations.length < 2) return null;

      // Calculate correlation coefficient
      const magnitudes = correlations.map(c => c.magnitude);
      const conflictIntensities = correlations.map(c => c.conflictIntensity);
      
      return calculateCorrelation(magnitudes, conflictIntensities);
    } catch (error) {
      console.error('Error calculating shock-conflict correlation:', error);
      return null;
    }
  }
);


export default {
  selectMarketShocks,
  selectTimeSeriesData,
  selectSpatialAutocorrelation,
  selectGeometryData,
  selectFilteredShocks,
  selectShocksByRegion,
  selectShockStats,
  selectShockTimeline,
  selectShockPropagation,
  selectShockIntensityByRegion,
  selectShockCorrelationWithConflict
};