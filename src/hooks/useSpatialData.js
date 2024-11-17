import { useState, useEffect, useMemo } from 'react';
import { spatialSystem } from '../utils/SpatialSystem';
import { monitoringSystem } from '../utils/MonitoringSystem';
import _ from 'lodash';

/**
 * Custom hook for spatial econometric analysis
 * @param {Object} options Analysis configuration
 * @param {Object} options.geoData GeoJSON data for analysis
 * @param {Array} options.timeSeriesData Time series data
 * @param {string} options.selectedDate Selected analysis date
 * @param {Object} options.weightMatrix Spatial weights matrix
 */
export const useSpatialAnalysis = ({ 
  geoData, 
  timeSeriesData, 
  selectedDate,
  weightMatrix
}) => {
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);
  const [results, setResults] = useState(null);

  useEffect(() => {
    const analyzeSpatialPatterns = async () => {
      if (!geoData || !timeSeriesData || !selectedDate) return;

      const metric = monitoringSystem.startMetric('spatial-analysis');
      setStatus('loading');
      setError(null);

      try {
        // Process spatial data and calculate metrics
        const spatialResults = await spatialSystem.processSpatialData({
          geoData,
          timeSeriesData,
          date: selectedDate,
          weightMatrix
        });

        // Run spatial regression analysis
        const regressionResults = await spatialSystem.spatialRegression({
          data: spatialResults.processedData,
          weights: weightMatrix,
          model: 'SAR' // Spatial Autoregressive Model
        });

        // Detect spatial clusters and hotspots
        const clusters = await spatialSystem.detectClusters({
          data: spatialResults.processedData,
          weights: weightMatrix,
          method: 'LISA' // Local Indicators of Spatial Association
        });

        setResults({
          spatialAutocorrelation: spatialResults.spatialAutocorrelation,
          clusters,
          regression: regressionResults,
          metadata: {
            date: selectedDate,
            processedAt: new Date().toISOString()
          }
        });

        setStatus('succeeded');
        metric.finish({ status: 'success' });

      } catch (err) {
        console.error('Error in spatial analysis:', err);
        setError(err.message);
        setStatus('failed');
        metric.finish({ status: 'error', error: err.message });
      }
    };

    analyzeSpatialPatterns();
  }, [geoData, timeSeriesData, selectedDate, weightMatrix]);

  // Compute derived spatial metrics
  const spatialMetrics = useMemo(() => {
    if (!results) return null;

    return {
      // Global spatial autocorrelation
      global: {
        moranI: results.spatialAutocorrelation.global.moran_i,
        pValue: results.spatialAutocorrelation.global.p_value,
        significance: results.spatialAutocorrelation.global.significance,
        interpretation: interpretMoranI(
          results.spatialAutocorrelation.global.moran_i,
          results.spatialAutocorrelation.global.p_value
        )
      },

      // Local spatial patterns
      local: {
        clusters: summarizeClusters(results.clusters),
        hotspots: summarizeHotspots(results.clusters),
        significance: calculateLocalSignificance(results.clusters)
      },

      // Spatial regression results
      regression: {
        spatialDependence: results.regression.rho, // Spatial lag coefficient
        modelFit: results.regression.r2,
        aic: results.regression.aic,
        coefficients: results.regression.coefficients,
        interpretation: interpretSpatialRegression(results.regression)
      }
    };
  }, [results]);

  return {
    results,
    spatialMetrics,
    status,
    error
  };
};

/**
 * Interpret Moran's I statistic
 */
function interpretMoranI(moranI, pValue) {
  if (pValue > 0.05) return 'No significant spatial autocorrelation';

  if (moranI > 0) {
    return moranI > 0.3 
      ? 'Strong positive spatial autocorrelation'
      : 'Moderate positive spatial autocorrelation';
  } else {
    return moranI < -0.3
      ? 'Strong negative spatial autocorrelation'
      : 'Moderate negative spatial autocorrelation';
  }
}

/**
 * Summarize spatial clusters
 */
function summarizeClusters(clusters) {
  const clusterTypes = _.countBy(clusters, 'type');
  const significantClusters = clusters.filter(c => c.pValue < 0.05);

  return {
    total: clusters.length,
    byType: clusterTypes,
    significant: significantClusters.length,
    significantTypes: _.countBy(significantClusters, 'type')
  };
}

/**
 * Summarize spatial hotspots
 */
function summarizeHotspots(clusters) {
  const hotspots = clusters.filter(c => 
    c.type === 'high-high' && c.pValue < 0.05
  );
  const coldspots = clusters.filter(c => 
    c.type === 'low-low' && c.pValue < 0.05
  );

  return {
    hotspots: {
      count: hotspots.length,
      regions: hotspots.map(h => h.region)
    },
    coldspots: {
      count: coldspots.length,
      regions: coldspots.map(c => c.region)
    }
  };
}

/**
 * Calculate local significance metrics
 */
function calculateLocalSignificance(clusters) {
  const significantClusters = clusters.filter(c => c.pValue < 0.05);
  const totalRegions = clusters.length;

  return {
    proportion: significantClusters.length / totalRegions,
    distribution: _.countBy(significantClusters, 'type'),
    averagePValue: _.meanBy(clusters, 'pValue')
  };
}

/**
 * Interpret spatial regression results
 */
function interpretSpatialRegression(regression) {
  const { rho, r2, coefficients } = regression;

  return {
    spatialDependence: rho > 0.3 ? 'Strong' : rho > 0.1 ? 'Moderate' : 'Weak',
    modelFit: r2 > 0.7 ? 'Strong' : r2 > 0.3 ? 'Moderate' : 'Weak',
    significantFactors: Object.entries(coefficients)
      .filter(([_, coef]) => coef.pValue < 0.05)
      .map(([name, coef]) => ({
        name,
        coefficient: coef.value,
        impact: coef.value > 0 ? 'Positive' : 'Negative'
      }))
  };
}