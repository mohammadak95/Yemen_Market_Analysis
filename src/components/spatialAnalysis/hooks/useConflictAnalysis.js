// src/components/spatialAnalysis/hooks/useConflictAnalysis.js

import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { backgroundMonitor } from '../../../utils/backgroundMonitor';
import { selectConflictAnalysisData } from '../../../selectors/spatialAnalysisSelectors';

/**
 * Custom hook for analyzing conflict impact on markets
 * @returns {Object} Conflict analysis results
 */
export const useConflictAnalysis = () => {
  const conflictData = useSelector(selectConflictAnalysisData);

  return useMemo(() => {
    const metric = backgroundMonitor.startMetric('conflict-analysis-hook');

    try {
      if (!conflictData) {
        return {
          data: null,
          loading: false,
          error: 'No conflict data available'
        };
      }

      const { conflictData: regionData, geometry, summary } = conflictData;

      // Format data for visualization and analysis
      const formattedData = {
        // Regional conflict data with additional metrics
        regions: Object.entries(regionData).map(([region, data]) => {
          const intensities = data.intensities;
          const trend = intensities.length > 1 ? 
            (intensities[intensities.length - 1] - intensities[0]) / intensities[0] : 0;

          return {
            region,
            average: data.average,
            maximum: data.max,
            trend,
            volatility: Math.sqrt(
              intensities.reduce((sum, val) => 
                sum + Math.pow(val - data.average, 2), 0
              ) / intensities.length
            ),
            intensity: {
              current: intensities[intensities.length - 1],
              historical: intensities,
              increasing: trend > 0,
              severity: data.average > summary.averageIntensity ? 'high' : 
                       data.average > summary.averageIntensity * 0.5 ? 'medium' : 'low'
            }
          };
        }),

        // Time series analysis
        temporal: regionData[Object.keys(regionData)[0]]?.intensities.map((_, index) => {
          const monthData = {
            average: 0,
            max: 0,
            regions: {}
          };

          Object.entries(regionData).forEach(([region, data]) => {
            const value = data.intensities[index] || 0;
            monthData.regions[region] = value;
            monthData.average += value;
            monthData.max = Math.max(monthData.max, value);
          });

          monthData.average /= Object.keys(regionData).length;
          return monthData;
        }),

        // Conflict clusters based on intensity
        clusters: {
          high: Object.entries(regionData)
            .filter(([_, data]) => data.average > summary.averageIntensity)
            .map(([region]) => region),
          medium: Object.entries(regionData)
            .filter(([_, data]) => 
              data.average <= summary.averageIntensity && 
              data.average > summary.averageIntensity * 0.5
            )
            .map(([region]) => region),
          low: Object.entries(regionData)
            .filter(([_, data]) => data.average <= summary.averageIntensity * 0.5)
            .map(([region]) => region)
        },

        // Enhanced summary statistics
        summary: {
          ...summary,
          volatility: Math.sqrt(
            Object.values(regionData)
              .reduce((sum, data) => 
                sum + Math.pow(data.average - summary.averageIntensity, 2), 0
              ) / Object.keys(regionData).length
          ),
          trendDirection: Object.values(regionData)
            .reduce((acc, data) => {
              const trend = data.intensities[data.intensities.length - 1] - 
                          data.intensities[0];
              return acc + (trend > 0 ? 1 : trend < 0 ? -1 : 0);
            }, 0) > 0 ? 'increasing' : 'decreasing',
          impactedRegions: Object.values(regionData)
            .filter(data => data.average > summary.averageIntensity * 0.5).length
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
      console.error('Error in useConflictAnalysis:', error);
      metric.finish({ status: 'error', error: error.message });

      return {
        data: null,
        loading: false,
        error: error.message
      };
    }
  }, [conflictData]);
};

export default useConflictAnalysis;
