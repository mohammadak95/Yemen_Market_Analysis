// src/hooks/useSpatialAnalysis.js

import { useEffect, useMemo, useCallback, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { 
  fetchSpatialData, 
  selectSpatialState, 
  selectAnalysisData,
  selectFlowsForPeriod,
  setSelectedRegion,
  setView,
  clearCache
} from '../slices/spatialSlice';

export const useSpatialAnalysis = ({
  selectedCommodity,
  selectedDate,
  options = {}
}) => {
  const dispatch = useDispatch();
  const prevDataRef = useRef(null);
  const processingTimeoutRef = useRef(null);
  
  // Selector for spatial state
  const {
    data,
    ui,
    status,
    metadata
  } = useSelector(selectSpatialState);

  // Memoized analysis data
  const analysisData = useSelector(
    state => selectAnalysisData(state, selectedCommodity)
  );

  // Memoized flows data
  const flowsData = useSelector(
    state => selectFlowsForPeriod(state, selectedDate)
  );

  // Compute derived statistics
  const statistics = useMemo(() => {
    if (!analysisData || !flowsData) return null;

    return {
      marketIntegration: calculateMarketIntegration(analysisData),
      spatialCorrelation: calculateSpatialCorrelation(analysisData),
      flowDynamics: analyzeFlowDynamics(flowsData),
      temporalTrends: analyzeTemporalTrends(analysisData)
    };
  }, [analysisData, flowsData]);

  // Handle data fetching
  useEffect(() => {
    if (!selectedCommodity || !selectedDate) return;

    const fetchData = async () => {
      try {
        await dispatch(fetchSpatialData({ 
          selectedCommodity, 
          selectedDate 
        }));
      } catch (error) {
        console.error('Error fetching spatial data:', error);
      }
    };

    fetchData();

    // Cleanup
    return () => {
      if (processingTimeoutRef.current) {
        clearTimeout(processingTimeoutRef.current);
      }
    };
  }, [selectedCommodity, selectedDate, dispatch]);

  // Monitor data changes
  useEffect(() => {
    const hasDataChanged = prevDataRef.current !== data;
    if (hasDataChanged && data) {
      prevDataRef.current = data;
      
      // Perform any necessary post-processing
      processingTimeoutRef.current = setTimeout(() => {
        console.debug('Processing new spatial data:', {
          features: data.geoData?.features?.length,
          flows: data.flows?.length,
          timestamp: new Date().toISOString()
        });
      }, 0);
    }
  }, [data]);

  // Handlers
  const handleRegionSelect = useCallback((region) => {
    dispatch(setSelectedRegion(region));
  }, [dispatch]);

  const handleViewChange = useCallback((view) => {
    dispatch(setView(view));
  }, [dispatch]);

  const clearAnalysisCache = useCallback(() => {
    dispatch(clearCache());
  }, [dispatch]);

  // Calculate additional metrics
  const metrics = useMemo(() => {
    if (!data || !statistics) return null;

    return {
      marketCoverage: calculateMarketCoverage(data.weights),
      integrationEfficiency: calculateIntegrationEfficiency(statistics),
      spatialConnectivity: analyzeSpatialConnectivity(data.weights),
      temporalStability: assessTemporalStability(statistics)
    };
  }, [data, statistics]);

  return {
    // Data
    data,
    analysisData,
    flowsData,
    statistics,
    metrics,
    
    // UI State
    selectedRegion: ui.selectedRegion,
    view: ui.view,
    
    // Status
    isLoading: status.loading,
    error: status.error,
    progress: status.progress,
    stage: status.stage,
    
    // Metadata
    processingStats: metadata.processingStats,
    lastUpdated: metadata.lastUpdated,
    
    // Handlers
    onRegionSelect: handleRegionSelect,
    onViewChange: handleViewChange,
    clearCache: clearAnalysisCache
  };
};

// Utility functions for calculations
const calculateMarketIntegration = (analysisData) => {
  if (!analysisData) return null;
  
  const { coefficients, r_squared, moran_i } = analysisData;
  return {
    spatialLagCoefficient: coefficients?.spatial_lag_price || 0,
    rSquared: r_squared || 0,
    moranI: moran_i?.I || 0,
    significance: moran_i?.['p-value'] || 1
  };
};

const calculateSpatialCorrelation = (analysisData) => {
  if (!analysisData?.moran_i) return null;
  
  return {
    globalIndex: analysisData.moran_i.I,
    pValue: analysisData.moran_i['p-value'],
    zScore: analysisData.moran_i.z_score
  };
};

const analyzeFlowDynamics = (flows) => {
  if (!flows?.length) return null;

  return {
    totalFlows: flows.length,
    averageWeight: flows.reduce((acc, flow) => acc + (flow.flow_weight || 0), 0) / flows.length,
    maxFlow: Math.max(...flows.map(f => f.flow_weight || 0)),
    minFlow: Math.min(...flows.map(f => f.flow_weight || 0))
  };
};

const analyzeTemporalTrends = (analysisData) => {
  if (!analysisData?.residuals) return null;

  const residuals = analysisData.residuals;
  return {
    trend: calculateTrend(residuals),
    seasonality: detectSeasonality(residuals),
    volatility: calculateVolatility(residuals)
  };
};

const calculateMarketCoverage = (weights) => {
  if (!weights) return 0;
  
  const regions = Object.keys(weights);
  const totalConnections = regions.reduce((acc, region) => {
    return acc + (weights[region].neighbors?.length || 0);
  }, 0);
  
  return totalConnections / (regions.length * (regions.length - 1));
};

const calculateIntegrationEfficiency = (statistics) => {
  if (!statistics?.marketIntegration) return null;
  
  const { spatialLagCoefficient, rSquared } = statistics.marketIntegration;
  return {
    transmissionEfficiency: spatialLagCoefficient,
    marketEfficiency: rSquared,
    overallEfficiency: (spatialLagCoefficient + rSquared) / 2
  };
};

const analyzeSpatialConnectivity = (weights) => {
  if (!weights) return null;
  
  const regions = Object.keys(weights);
  return {
    totalRegions: regions.length,
    averageConnections: regions.reduce((acc, region) => 
      acc + (weights[region].neighbors?.length || 0), 0) / regions.length,
    isolatedRegions: regions.filter(r => 
      !weights[r].neighbors?.length).length
  };
};

const assessTemporalStability = (statistics) => {
  if (!statistics?.temporalTrends) return null;
  
  return {
    trendStrength: statistics.temporalTrends.trend,
    seasonalityScore: statistics.temporalTrends.seasonality,
    volatilityIndex: statistics.temporalTrends.volatility
  };
};

// Helper functions for trend analysis
const calculateTrend = (residuals) => {
  // Implement linear trend calculation
  return 0;
};

const detectSeasonality = (residuals) => {
  // Implement seasonality detection
  return 0;
};

const calculateVolatility = (residuals) => {
  // Implement volatility calculation
  return 0;
};