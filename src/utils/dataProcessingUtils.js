// src/utils/dataProcessingUtils.js

/**
 * Process regression data into standardized format
 */
export const processRegressionData = (data, selectedCommodity) => {
    if (!Array.isArray(data)) return null;
    
    const filteredData = data.filter(item => 
      item.commodity?.toLowerCase() === selectedCommodity?.toLowerCase()
    )[0];
  
    if (!filteredData) return null;
  
    // Create consistent format for regression data
    return {
      model: {
        coefficients: filteredData.coefficients || {},
        intercept: filteredData.intercept || 0,
        p_values: filteredData.p_values || {},
        r_squared: filteredData.r_squared || 0,
        adj_r_squared: filteredData.adj_r_squared || 0,
        mse: filteredData.mse || 0,
        observations: filteredData.observations || 0
      },
      spatial: {
        moran_i: filteredData.moran_i || { I: 0, 'p-value': 1 },
        vif: filteredData.vif || []
      },
      residuals: processResiduals(filteredData.residual || [])
    };
  };
  
  /**
   * Process residuals with consistent formatting
   */
  const processResiduals = (residuals) => {
    const processed = residuals.map(r => ({
      region_id: r.region_id,
      date: new Date(r.date).toISOString(),
      residual: Number(r.residual)
    }));
  
    return {
      raw: processed,
      byRegion: groupResidualsByRegion(processed),
      stats: calculateResidualStats(processed)
    };
  };
  
  /**
   * Group residuals by region
   */
  const groupResidualsByRegion = (residuals) => {
    return residuals.reduce((acc, r) => {
      if (!acc[r.region_id]) acc[r.region_id] = [];
      acc[r.region_id].push(r);
      return acc;
    }, {});
  };
  
  /**
   * Calculate residual statistics
   */
  const calculateResidualStats = (residuals) => {
    const values = residuals.map(r => r.residual);
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    
    return {
      mean,
      variance: values.reduce((sum, val) => 
        sum + Math.pow(val - mean, 2), 0) / (values.length - 1),
      maxAbsolute: Math.max(...values.map(Math.abs))
    };
  };

// Helper functions for processing selector data

export const calculateAutocorrelationMetrics = (autocorrelation) => {
  if (!autocorrelation?.local) return {
    highHigh: 0,
    lowLow: 0,
    highLow: 0,
    lowHigh: 0,
    notSignificant: 0,
    totalClusters: 0,
    globalIndex: 0,
    significance: false
  };

  try {
    const clusters = Object.values(autocorrelation.local);
    const clusterTypes = clusters.map(c => c.cluster_type);
    
    return {
      highHigh: clusterTypes.filter(t => t === 'high-high').length,
      lowLow: clusterTypes.filter(t => t === 'low-low').length,
      highLow: clusterTypes.filter(t => t === 'high-low').length,
      lowHigh: clusterTypes.filter(t => t === 'low-high').length,
      notSignificant: clusterTypes.filter(t => t === 'not-significant').length,
      totalClusters: clusters.length,
      globalIndex: autocorrelation.global?.moran_i || 0,
      significance: autocorrelation.global?.p_value < 0.05
    };
  } catch (error) {
    console.error('Error calculating autocorrelation metrics:', error);
    return {
      highHigh: 0,
      lowLow: 0,
      highLow: 0,
      lowHigh: 0,
      notSignificant: 0,
      totalClusters: 0,
      globalIndex: 0,
      significance: false
    };
  }
};

export const processFeatureData = (geometry, timeSeriesData) => {
  if (!geometry?.points || !Array.isArray(timeSeriesData)) {
    return null;
  }

  try {
    const timeSeriesByRegion = _.groupBy(timeSeriesData, 'region');
    const regionalMetrics = processRegionalMetrics(timeSeriesByRegion);

    const processedPoints = geometry.points.map(point => ({
      ...point,
      properties: {
        ...point.properties,
        metrics: regionalMetrics[point.properties?.region_id] || getDefaultRegionalMetrics(),
        region_id: transformRegionName(
          point.properties?.normalizedName || 
          point.properties?.region_id || 
          point.properties?.name
        ),
        coordinates: validateCoordinates(point.coordinates)
      }
    }));

    return {
      points: processedPoints,
      metrics: regionalMetrics,
      timestamp: Date.now()
    };
  } catch (error) {
    console.error('Error processing feature data:', error);
    return null;
  }
};

export const processClustersWithCoordinates = (clusters, geometry) => {
  if (!clusters?.length || !geometry?.points) {
    return [];
  }

  try {
    const coordMap = new Map();
    geometry.points.forEach(point => {
      const normalizedName = transformRegionName(
        point.properties?.normalizedName || 
        point.properties?.region_id || 
        point.properties?.name
      );
      if (normalizedName && Array.isArray(point.coordinates)) {
        coordMap.set(normalizedName, validateCoordinates(point.coordinates));
      }
    });

    return clusters.map(cluster => {
      const marketCoords = (cluster.connected_markets || [])
        .map(market => {
          const normalizedName = transformRegionName(market);
          const coordinates = coordMap.get(normalizedName) || 
                            getRegionCoordinates(normalizedName);
          return coordinates ? {
            name: market,
            normalizedName,
            coordinates,
            isMainMarket: market === cluster.main_market
          } : null;
        })
        .filter(Boolean);

      const center = calculateCenter(marketCoords.map(m => m.coordinates));
      
      return {
        ...cluster,
        markets: marketCoords,
        center: center || [0, 0],
        metrics: processClusterMetrics(cluster, marketCoords)
      };
    });
  } catch (error) {
    console.error('Error processing clusters with coordinates:', error);
    return [];
  }
};

export const processFlowsWithCoordinates = (flows, geometry) => {
  if (!flows || !geometry?.points) {
    return [];
  }

  try {
    const pointsMap = new Map();
    geometry.points.forEach(point => {
      const normalizedName = transformRegionName(
        point.properties?.normalizedName ||
        point.properties?.region_id ||
        point.properties?.name
      );
      if (normalizedName && Array.isArray(point.coordinates)) {
        pointsMap.set(normalizedName, validateCoordinates(point.coordinates));
      }
    });

    return flows.map(flow => {
      const sourceNormalized = transformRegionName(flow.source);
      const targetNormalized = transformRegionName(flow.target);

      const sourceCoords = pointsMap.get(sourceNormalized) || getRegionCoordinates(flow.source);
      const targetCoords = pointsMap.get(targetNormalized) || getRegionCoordinates(flow.target);

      if (!sourceCoords || !targetCoords) return null;

      return {
        ...flow,
        source_normalized: sourceNormalized,
        target_normalized: targetNormalized,
        sourceCoordinates: sourceCoords,
        targetCoordinates: targetCoords,
        flow_strength: validateNumber(flow.total_flow),
        price_differential: validateNumber(flow.avg_price_differential)
      };
    }).filter(Boolean);
  } catch (error) {
    console.error('Error processing flows with coordinates:', error);
    return [];
  }
};

const getDefaultRegionalMetrics = () => ({
  averagePrice: 0,
  priceVolatility: 0,
  conflictIntensity: 0,
  dataPoints: 0,
  lastUpdate: null
});

const processRegionalMetrics = (timeSeriesByRegion) => {
  return Object.entries(timeSeriesByRegion).reduce((acc, [region, data]) => {
    const prices = data.map(d => d.usdPrice).filter(p => typeof p === 'number');
    const conflicts = data.map(d => d.conflictIntensity).filter(c => typeof c === 'number');
    
    acc[region] = {
      averagePrice: prices.length ? _.mean(prices) : 0,
      priceVolatility: prices.length > 1 ? calculateVolatility(prices) : 0,
      conflictIntensity: conflicts.length ? _.mean(conflicts) : 0,
      dataPoints: data.length,
      lastUpdate: data.reduce((latest, point) => {
        const date = point.additionalProperties?.date;
        return date && (!latest || new Date(date) > new Date(latest)) ? date : latest;
      }, null)
    };
    return acc;
  }, {});
};

const processClusterMetrics = (cluster, marketCoords) => {
  return {
    marketCount: cluster.connected_markets?.length || 0,
    spatial_coverage: marketCoords.length / (cluster.connected_markets?.length || 1),
    avg_distance: calculateAverageDistance(marketCoords.map(m => m.coordinates)),
    spatial_metrics: {
      centerLat: cluster.center ? cluster.center[1] : 0,
      centerLon: cluster.center ? cluster.center[0] : 0,
      boundingBox: calculateBoundingBox(marketCoords.map(m => m.coordinates)),
      marketDensity: marketCoords.length / (calculateAverageDistance(marketCoords.map(m => m.coordinates)) || 1),
      spatialDispersion: calculateSpatialDispersion(marketCoords.map(m => m.coordinates))
    },
    ...cluster.metrics
  };
};

const validateNumber = (value) => {
  return typeof value === 'number' && !isNaN(value) ? value : 0;
};