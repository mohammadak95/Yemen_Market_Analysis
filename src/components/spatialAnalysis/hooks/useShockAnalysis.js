// src/components/spatialAnalysis/hooks/useShockAnalysis.js

import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { backgroundMonitor } from '../../../utils/backgroundMonitor';
import { selectShockAnalysisData } from '../../../selectors/spatialAnalysisSelectors';

/**
 * Custom hook for analyzing market shocks
 * @returns {Object} Shock analysis results
 */
export const useShockAnalysis = () => {
  const shockData = useSelector(selectShockAnalysisData);

  return useMemo(() => {
    const metric = backgroundMonitor.startMetric('shock-analysis-hook');

    try {
      if (!shockData) {
        return {
          data: null,
          loading: false,
          error: 'No shock data available'
        };
      }

      const { shocks, shocksByType, geometry, summary } = shockData;

      // Format data for visualization and analysis
      const formattedData = {
        // All shocks with additional computed fields
        shocks: shocks.map(shock => ({
          ...shock,
          normalizedMagnitude: shock.magnitude / summary.averageMagnitude,
          severity: shock.magnitude > summary.averageMagnitude * 1.5 ? 'high' :
                   shock.magnitude > summary.averageMagnitude ? 'medium' : 'low'
        })),

        // Shocks grouped by type with summary stats
        categories: {
          price_drop: {
            shocks: shocksByType.price_drop || [],
            count: summary.priceDrops,
            averageMagnitude: shocksByType.price_drop ?
              shocksByType.price_drop.reduce((sum, s) => sum + s.magnitude, 0) / 
              shocksByType.price_drop.length : 0
          },
          price_surge: {
            shocks: shocksByType.price_surge || [],
            count: summary.priceSurges,
            averageMagnitude: shocksByType.price_surge ?
              shocksByType.price_surge.reduce((sum, s) => sum + s.magnitude, 0) / 
              shocksByType.price_surge.length : 0
          }
        },

        // Regional analysis
        regions: Object.values(shocks.reduce((acc, shock) => {
          if (!acc[shock.region]) {
            acc[shock.region] = {
              region: shock.region,
              shockCount: 0,
              totalMagnitude: 0,
              shocks: []
            };
          }
          acc[shock.region].shockCount++;
          acc[shock.region].totalMagnitude += shock.magnitude;
          acc[shock.region].shocks.push(shock);
          return acc;
        }, {})).map(region => ({
          ...region,
          averageMagnitude: region.totalMagnitude / region.shockCount,
          vulnerability: region.shockCount / summary.totalShocks
        })),

        // Time-based analysis
        temporal: shocks.reduce((acc, shock) => {
          const date = shock.date.slice(0, 7); // YYYY-MM
          if (!acc[date]) {
            acc[date] = {
              date,
              shocks: [],
              totalMagnitude: 0
            };
          }
          acc[date].shocks.push(shock);
          acc[date].totalMagnitude += shock.magnitude;
          return acc;
        }, {}),

        // Overall summary with additional metrics
        summary: {
          ...summary,
          shockFrequency: summary.totalShocks / 
            Object.keys(shocks.reduce((acc, s) => {
              acc[s.date.slice(0, 7)] = true;
              return acc;
            }, {})).length,
          volatilityIndex: Math.sqrt(
            shocks.reduce((sum, s) => sum + Math.pow(s.magnitude, 2), 0) / 
            shocks.length
          )
        },

        // Geometry data for mapping
        geometry
      };

      metric.finish({ status: 'success' });

      return {
        data: formattedData,
        loading: false,
        error: null
      };

    } catch (error) {
      console.error('Error in useShockAnalysis:', error);
      metric.finish({ status: 'error', error: error.message });

      return {
        data: null,
        loading: false,
        error: error.message
      };
    }
  }, [shockData]);
};

export default useShockAnalysis;
