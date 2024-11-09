// src/components/analysis/spatial-analysis/SpatialAnalysis.js

import React, { useEffect, useState, useMemo, useCallback, Suspense, lazy } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import PropTypes from 'prop-types';
import { 
  Box, 
  Grid, 
  Alert, 
  AlertTitle, 
  Paper, 
  Typography, 
  Chip, 
  Tabs, 
  Tab, 
  Button,
  Tooltip,
  IconButton
} from '@mui/material';
import { 
  Timeline, 
  TrendingUp, 
  Warning, 
  GroupWork, 
  CompareArrows, 
  Download 
} from '@mui/icons-material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip } from 'recharts';
import { 
  fetchSpatialData, 
  selectSpatialData,
  selectAnalysisData,
  selectFlowsForPeriod,
  selectSpatialMetrics,
  setSelectedRegion,
  setSelectedCommodity,
  setSelectedDate
} from '../../../slices/spatialSlice';
import { backgroundMonitor } from '../../../utils/backgroundMonitor';
// Lazy load components to optimize initial load
const MapControls = lazy(() => import('./MapControls'));
const MapLegend = lazy(() => import('./MapLegend'));
const TimeControls = lazy(() => import('./TimeControls'));
const LoadingSpinner = lazy(() => import('../../common/LoadingSpinner'));
const ErrorDisplay = lazy(() => import('../../common/ErrorDisplay'));
const SpatialMap = lazy(() => import('./SpatialMap'));
const ErrorBoundary = lazy(() => import('./SpatialErrorBoundary'));
const DynamicInterpretation = lazy(() => import('./DynamicInterpretation'));
import { memoizedComputeClusters, detectMarketShocks } from '../../../utils/spatialUtils';
import { VISUALIZATION_MODES, COLOR_SCALES, ANALYSIS_THRESHOLDS } from '../../../constants/spatialConstants';
import { useWorkerManager } from '../../../workers/enhancedWorkerSystem';
import debounce from 'lodash.debounce';

// Format month strings for charts
const formatMonth = (monthStr) => {
  const date = new Date(monthStr);
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
};

// Helper function for feature validation
const validateFeatures = (features) => {
  if (!Array.isArray(features)) return [];
  return features.filter(feature => 
    feature?.properties?.region_id &&
    feature?.geometry &&
    !isNaN(parseFloat(feature.properties?.price))
  );
};
const SpatialAnalysis = ({ selectedCommodity: initialCommodity, selectedDate: initialDate = '' }) => {
  const dispatch = useDispatch();
  
  // Redux selectors
  const {
    geoData,
    analysis,
    flows,
    weights,
    uniqueMonths = [],
    commodities = [],
    status,
    error,
    loadingProgress,
    selectedCommodity: storeCommodity,
    selectedDate: storeDate
  } = useSelector(selectSpatialData);

  // Local state for tracking initialization
  const [isInitialized, setIsInitialized] = useState(false);

  // Ensure we have valid commodity and date
  const validCommodity = useMemo(() => {
    if (!initialCommodity && commodities.length > 0) {
      return commodities[0];
    }
    return initialCommodity && commodities.includes(initialCommodity) 
      ? initialCommodity 
      : commodities[0] || '';
  }, [initialCommodity, commodities]);

  const validDate = useMemo(() => {
    if (!initialDate && uniqueMonths.length > 0) {
      return uniqueMonths[0];
    }
    return initialDate && uniqueMonths.includes(initialDate)
      ? initialDate
      : uniqueMonths[0] || '';
  }, [initialDate, uniqueMonths]);

  // Initialize data loading
  useEffect(() => {
    if (!isInitialized && validCommodity) {
      const loadData = async () => {
        try {
          await dispatch(setSelectedCommodity(validCommodity));
          if (validDate) {
            await dispatch(setSelectedDate(validDate));
          }
          await dispatch(fetchSpatialData({ 
            selectedCommodity: validCommodity,
            selectedDate: validDate
          }));
          setIsInitialized(true);
        } catch (error) {
          console.error('Error initializing spatial data:', error);
        }
      };

      loadData();
    }
  }, [dispatch, validCommodity, validDate, isInitialized]);

  // Handle commodity change with proper data fetching
  const handleCommodityChange = useCallback(async (commodity) => {
    if (commodities.includes(commodity)) {
      try {
        await dispatch(setSelectedCommodity(commodity));
        await dispatch(fetchSpatialData({ 
          selectedCommodity: commodity,
          selectedDate: validDate 
        }));
      } catch (error) {
        console.error('Error changing commodity:', error);
      }
    }
  }, [dispatch, validDate, commodities]);

  // Handle date change with proper data fetching
  const handleDateChange = useCallback(async (date) => {
    if (uniqueMonths.includes(date)) {
      try {
        await dispatch(setSelectedDate(date));
        await dispatch(fetchSpatialData({
          selectedCommodity: validCommodity,
          selectedDate: date
        }));
      } catch (error) {
        console.error('Error changing date:', error);
      }
    }
  }, [dispatch, validCommodity, uniqueMonths]);

  // Handle manual refresh
  const handleRefresh = useCallback(async () => {
    try {
      await dispatch(fetchSpatialData({
        selectedCommodity: validCommodity,
        selectedDate: validDate
      }));
    } catch (error) {
      console.error('Error refreshing data:', error);
    }
  }, [dispatch, validCommodity, validDate]);

  // Worker manager hooks
  const { 
    processClusterData: workerProcessClusters,
    processShockData: workerProcessShocks,
    processTimeSeries: workerProcessTimeSeries,
    initialize: initWorker,
    subscribeToProgress,
    subscribeToError 
  } = useWorkerManager();

  // Local state hooks - keep them in consistent order
  const [workerInitialized, setWorkerInitialized] = useState(false);
  const [workerError, setWorkerError] = useState(null);
  const [selectedDate, setSelectedDateLocal] = useState(initialDate);
  const [dateError, setDateError] = useState(null);
  const [timeSeriesData, setTimeSeriesData] = useState([]);
  const [timeSeriesLoading, setTimeSeriesLoading] = useState(false);
  const [timeSeriesError, setTimeSeriesError] = useState(null);
  const [marketClustersData, setMarketClustersData] = useState([]);
  const [detectedShocksData, setDetectedShocksData] = useState([]);
  const [clusterLoading, setClusterLoading] = useState(false);
  const [shocksLoading, setShocksLoading] = useState(false);
  const [visualizationMode, setVisualizationMode] = useState(VISUALIZATION_MODES.PRICES);
  const [showFlows, setShowFlows] = useState(true);
  const [selectedRegion, setSelectedRegionLocal] = useState(null);
  const [analysisTab, setAnalysisTab] = useState(0);

  // Worker initialization effect
  useEffect(() => {
    let mounted = true;

    const initializeWorkerAsync = async () => {
      try {
        await initWorker();
        if (mounted) setWorkerInitialized(true);
      } catch (error) {
        console.error('Worker initialization failed:', error);
        if (mounted) setWorkerError(error.message);
      }
    };

    initializeWorkerAsync();
    
    const unsubscribeProgress = subscribeToProgress((progress) => {
      if (mounted) console.log('Worker progress:', progress);
    });

    const unsubscribeError = subscribeToError((error) => {
      console.error('Worker error:', error);
      if (mounted) setWorkerError(error.message);
    });

    return () => {
      mounted = false;
      unsubscribeProgress();
      unsubscribeError();
    };
  }, [initWorker, subscribeToProgress, subscribeToError]);

  // Handle date initialization and validation with debounce
  const validateDate = useCallback(() => {
    if (uniqueMonths?.length) {
      if (!selectedDate) {
        const sortedMonths = [...uniqueMonths].sort((a, b) => new Date(b) - new Date(a));
        setSelectedDateLocal(sortedMonths[0]);
        dispatch(setSelectedDate(sortedMonths[0]));
      } else if (!uniqueMonths.includes(selectedDate)) {
        const sortedMonths = [...uniqueMonths].sort((a, b) => new Date(b) - new Date(a));
        setSelectedDateLocal(sortedMonths[0]);
        dispatch(setSelectedDate(sortedMonths[0]));
        setDateError('Selected date not available. Defaulting to most recent.');
      } else {
        setDateError(null);
      }
    }
  }, [uniqueMonths, selectedDate, dispatch]);

  const debouncedValidateDate = useMemo(() => debounce(validateDate, 300), [validateDate]);

  useEffect(() => {
    debouncedValidateDate();
    return () => {
      debouncedValidateDate.cancel();
    };
  }, [debouncedValidateDate]);

  // Dispatch fetchSpatialData on component mount
  useEffect(() => {
    if (status !== 'loading' && !geoData) {
      dispatch(fetchSpatialData());
    }
  }, [dispatch, status, geoData]);

  // Safe background monitor usage
  useEffect(() => {
    let metric;
    const metricTimeout = setTimeout(() => {
      try {
        metric = backgroundMonitor?.startMetric('spatial-analysis-load', {
          commodity: validCommodity,
          date: validDate
        });
      } catch (err) {
        console.warn('Background monitor not available:', err);
      }
    }, 0);
    
    return () => {
      clearTimeout(metricTimeout);
      try {
        metric?.finish();
      } catch (err) {
        console.warn('Error finishing metric:', err);
      }
    };
  }, [validCommodity, validDate]);

  // Get additional analysis data from Redux
  const analysisData = useSelector(state => selectAnalysisData(state, validCommodity));
  const spatialMetrics = useSelector(state => 
    selectSpatialMetrics(state, validCommodity)
  );
  const currentFlows = useSelector(state => selectFlowsForPeriod(state, validDate, validCommodity));

  // Callback for handling month change with debounce
  const handleMonthChange = useCallback(debounce((newMonth) => {
    if (validCommodity && uniqueMonths?.includes(newMonth)) {
      setSelectedDateLocal(newMonth);
      dispatch(setSelectedDate(newMonth));
    }
  }, 300), [validCommodity, dispatch, uniqueMonths]);

  // Handle Tab Change
  const handleTabChange = (event, newValue) => {
    setAnalysisTab(newValue);
  };

  // Handle Region Selection
  const handleRegionSelect = useCallback((region) => {
    setSelectedRegionLocal(region);
    dispatch(setSelectedRegion(region));
  }, [dispatch]);

  // Memoized computations using workers
  const processClusterData = useCallback(async (flows, weights, features) => {
    if (!flows?.length || !weights || !features?.length) {
      console.warn('Invalid data for cluster processing');
      return [];
    }

    try {
      return await workerProcessClusters({
        flows: flows.map(flow => ({
          ...flow,
          flow_weight: parseFloat(flow.flow_weight) || 0
        })),
        weights,
        geoData: {
          features: features.map(feature => ({
            properties: {
              region_id: feature.properties.region_id,
              region: feature.properties.region
            },
            geometry: feature.geometry
          }))
        }
      });
    } catch (error) {
      console.error('Error computing clusters:', error);
      return [];
    }
  }, [workerProcessClusters]);

  const processShockData = useCallback(async (features, date) => {
    if (!features?.length || !date) return [];
    try {
      return await workerProcessShocks({
        geoData: {
          features: features.map(feature => ({
            properties: {
              region_id: feature.properties.region_id,
              region: feature.properties.region,
              price: feature.properties.price,
              date: feature.properties.date
            },
            geometry: feature.geometry
          }))
        },
        date
      });
    } catch (error) {
      console.error('Error detecting shocks:', error);
      return [];
    }
  }, [workerProcessShocks]);

  const processTimeSeriesData = useCallback(async (features, commodity, date) => {
    if (!features?.length || !commodity || !date) return [];
    try {
      return await workerProcessTimeSeries({
        features: features.map(feature => ({
          properties: {
            region_id: feature.properties.region_id,
            region: feature.properties.region,
            price: feature.properties.price,
            date: feature.properties.date
          },
          geometry: feature.geometry
        })),
        commodity,
        selectedDate: date
      });
    } catch (error) {
      console.error('Error processing time series:', error);
      return [];
    }
  }, [workerProcessTimeSeries]);


  // Compute Clusters with debounce and proper dependency handling
  useEffect(() => {
    let isMounted = true;
    let timeoutId;

    const computeClusters = async () => {
      if (!currentFlows?.length || !weights || !geoData?.features?.length) {
        if (isMounted) setMarketClustersData([]);
        return;
      }

      // Add debounce to prevent too frequent updates
      clearTimeout(timeoutId);
      timeoutId = setTimeout(async () => {
        if (isMounted) setClusterLoading(true);
        
        try {
          const clusters = await processClusterData(
            currentFlows,
            weights,
            geoData.features
          );
          
          if (isMounted && Array.isArray(clusters)) {
            setMarketClustersData(clusters);
          }
        } catch (error) {
          console.error('Cluster computation error:', error);
          if (isMounted) setMarketClustersData([]);
        } finally {
          if (isMounted) setClusterLoading(false);
        }
      }, 300); // Add debounce delay
    };

    computeClusters();

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [currentFlows, weights, geoData?.features, processClusterData]);

  // Detect Shocks
  useEffect(() => {
    let isMounted = true;
  
    const detectShocks = async () => {
      if (!geoData?.features?.length || !validDate) {
        if (isMounted) setDetectedShocksData([]);
        return;
      }
  
      if (isMounted) setShocksLoading(true);
      try {
        const shocks = await processShockData(
          geoData.features,
          validDate
        );
        
        if (isMounted && Array.isArray(shocks)) {
          setDetectedShocksData(shocks);
        }
      } catch (error) {
        console.error('Error detecting shocks:', error);
        if (isMounted) setDetectedShocksData([]);
      } finally {
        if (isMounted) setShocksLoading(false);
      }
    };
  
    detectShocks();
    return () => { isMounted = false; };
  }, [geoData?.features, validDate, processShockData]);

  // Fetch Time Series Data
  useEffect(() => {
    let isMounted = true;
  
    const fetchTimeSeriesData = async () => {
      if (!geoData?.features?.length || !validCommodity || !validDate) {
        if (isMounted) {
          setTimeSeriesData([]);
          setTimeSeriesError(null);
        }
        return;
      }
  
      if (isMounted) {
        setTimeSeriesLoading(true);
        setTimeSeriesError(null);
      }
  
      try {
        const data = await processTimeSeriesData(
          geoData.features,
          validCommodity,
          validDate
        );
        
        if (isMounted) {
          setTimeSeriesData(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        if (isMounted) {
          setTimeSeriesError(error.message);
          setTimeSeriesData([]);
        }
      } finally {
        if (isMounted) setTimeSeriesLoading(false);
      }
    };
  
    fetchTimeSeriesData();
    return () => { isMounted = false; };
  }, [geoData?.features, validCommodity, validDate, processTimeSeriesData]);

  const marketComparison = useMemo(() => {
    try {
      if (!analysisData || !marketClustersData?.length) return null;
      
      const totalMarkets = Object.keys(spatialMetrics?.weights || {}).length;
      if (!totalMarkets) return null;

      return {
        integrationEfficiency: (analysisData?.r_squared || 0),
        transmissionEfficiency: (analysisData?.coefficients?.spatial_lag_price || 0),
        marketCoverage: marketClustersData.length / totalMarkets,
        priceConvergence: analysisData?.moran_i?.I ?? null,
      };
    } catch (error) {
      console.error('Error calculating market comparison:', error);
      return null;
    }
  }, [analysisData, marketClustersData, spatialMetrics?.weights]);

  // Export Analysis Data
  const exportAnalysis = useCallback(() => {
    const exportData = {
      commodity: validCommodity,
      date: validDate,
      timeSeriesAnalysis: timeSeriesData,
      marketShocks: detectedShocksData,
      marketClusters: marketClustersData.map(cluster => ({
        mainMarket: cluster.mainMarket,
        connectedMarkets: Array.from(cluster.connectedMarkets),
        marketCount: cluster.marketCount,
      })),
      comparison: marketComparison,
      spatialAnalysis: analysisData,
    };
  
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `market-analysis-${validCommodity}-${validDate}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [validCommodity, validDate, timeSeriesData, detectedShocksData, marketClustersData, marketComparison, analysisData]);

  // Define color scales based on visualization mode
  const colorScalesMemo = useMemo(() => {
    if (!geoData?.features) return {};

    const scales = {};

    switch (visualizationMode) {
      case VISUALIZATION_MODES.PRICES:
        const prices = geoData.features
          .map(feature => feature.properties?.price)
          .filter(price => price != null && !isNaN(price));

        if (!prices.length) return { getColor: () => '#ccc' };

        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);

        scales.getColor = feature => {
          const price = feature.properties?.price;
          if (price == null || isNaN(price)) return '#ccc';
          const ratio = (price - minPrice) / (maxPrice - minPrice || 1);
          return COLOR_SCALES.PRICES[Math.floor(ratio * (COLOR_SCALES.PRICES.length - 1))];
        };
        break;

      case VISUALIZATION_MODES.VOLATILITY:
        const volatilities = geoData.features
          .map(feature => feature.properties?.volatility)
          .filter(vol => vol != null && !isNaN(vol));

        if (!volatilities.length) return { getColor: () => '#ccc' };

        const minVol = Math.min(...volatilities);
        const maxVol = Math.max(...volatilities);

        scales.getColor = feature => {
          const vol = feature.properties?.volatility;
          if (vol == null || isNaN(vol)) return '#ccc';
          const ratio = (vol - minVol) / (maxVol - minVol || 1);
          return COLOR_SCALES.VOLATILITY[Math.floor(ratio * (COLOR_SCALES.VOLATILITY.length - 1))];
        };
        break;

      case VISUALIZATION_MODES.RESIDUALS:
        const residuals = geoData.features
          .map(feature => feature.properties?.residual)
          .filter(res => res != null && !isNaN(res));

        if (!residuals.length) return { getColor: () => '#ccc' };

        const minRes = Math.min(...residuals);
        const maxRes = Math.max(...residuals);

        scales.getColor = feature => {
          const res = feature.properties?.residual;
          if (res == null || isNaN(res)) return '#ccc';
          const ratio = (res - minRes) / (maxRes - minRes || 1);
          return COLOR_SCALES.RESIDUALS[Math.floor(ratio * (COLOR_SCALES.RESIDUALS.length - 1))];
        };
        break;

      // Add more visualization modes here if needed

      default:
        scales.getColor = () => '#ccc';
    }

    return scales;
  }, [geoData, visualizationMode]);

  // Define Map Controls props using the callbacks
  const mapControlsProps = useMemo(() => ({
    selectedCommodity: validCommodity,
    selectedDate: validDate,
    uniqueMonths,
    commodities,
    onDateChange: handleMonthChange,
    onCommodityChange: handleCommodityChange,
    onRefresh: handleRefresh,
    visualizationMode,
    onVisualizationModeChange: setVisualizationMode,
    showFlows,
    onToggleFlows: () => setShowFlows(prev => !prev)
  }), [
    validCommodity,
    validDate,
    uniqueMonths,
    commodities,
    visualizationMode,
    showFlows,
    handleMonthChange,
    handleCommodityChange,
    handleRefresh
  ]);

  // Map props
  const mapProps = useMemo(() => ({
    geoData,
    flowMaps: currentFlows,
    selectedMonth: validDate,
    onMonthChange: handleMonthChange,
    availableMonths: uniqueMonths,
    spatialWeights: weights,
    showFlows,
    analysisResults: analysisData,
    selectedCommodity: validCommodity,
    marketClusters: marketClustersData,
    detectedShocks: detectedShocksData,
    visualizationMode,
    colorScales: colorScalesMemo, // Pass the entire scales object, not just getColor
    onRegionSelect: handleRegionSelect
  }), [
    geoData,
    currentFlows,
    validDate,
    handleMonthChange,
    uniqueMonths,
    weights,
    showFlows,
    analysisData,
    validCommodity,
    marketClustersData,
    detectedShocksData,
    visualizationMode,
    colorScalesMemo,
    handleRegionSelect
  ]);

  // Time controls props
  const timeControlsProps = useMemo(() => ({
    availableMonths: uniqueMonths,
    selectedMonth: validDate,
    onMonthChange: handleMonthChange,
    analysisResults: analysisData,
    spatialWeights: spatialMetrics?.weights
  }), [
    uniqueMonths,
    validDate,
    handleMonthChange,
    analysisData,
    spatialMetrics
  ]);

  // Determine if legend should be shown
  const shouldShowLegend = useMemo(() => 
    colorScalesMemo?.getColor && geoData?.features?.length > 0, 
    [colorScalesMemo, geoData]
  );

  // Loading state
  if (status === 'loading' || !geoData || !uniqueMonths.length) {
    return (
      <Suspense fallback={<LoadingSpinner progress={loadingProgress} />}>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
          <LoadingSpinner progress={loadingProgress} />
        </Box>
      </Suspense>
    );
  }

  // Error state
  if (status === 'failed') {
    return (
      <Suspense fallback={<div>Loading...</div>}>
        <ErrorDisplay
          error={error}
          title="Analysis Error"
          onRetry={() => dispatch(fetchSpatialData())}
        />
      </Suspense>
    );
  }

  return (
    <ErrorBoundary>
      <Suspense fallback={<div>Loading components...</div>}>
        <Box sx={{ width: '100%' }}>
          <Grid container spacing={2}>
            {/* Title and Export Button */}
            <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h5">
                Market Integration Analysis: {validCommodity}
              </Typography>
              <Tooltip title="Export Analysis">
                <IconButton onClick={exportAnalysis}>
                  <Download />
                </IconButton>
              </Tooltip>
            </Grid>

            {/* Date Error Alert */}
            {dateError && (
              <Grid item xs={12}>
                <Alert severity="warning">
                  <AlertTitle>Warning</AlertTitle>
                  {dateError}
                </Alert>
              </Grid>
            )}

            {/* Map Component */}
            <Grid item xs={12}>
              <Box sx={{ height: 500, position: 'relative' }}>
                <Suspense fallback={<div>Loading Map...</div>}>
                  <SpatialMap {...mapProps} />
                </Suspense>
              </Box>
            </Grid>

            {/* Time Controls */}
            <Grid item xs={12}>
              <Suspense fallback={<div>Loading Time Controls...</div>}>
                <TimeControls {...timeControlsProps} />
              </Suspense>
            </Grid>

            {/* Analysis Tabs */}
            <Grid item xs={12}>
              <Tabs value={analysisTab} onChange={handleTabChange}>
                <Tab icon={<Timeline />} label="Time Series" />
                <Tab icon={<TrendingUp />} label="Market Shocks" />
                <Tab icon={<GroupWork />} label="Market Clusters" />
                <Tab icon={<CompareArrows />} label="Market Integration" />
              </Tabs>
            </Grid>

            {/* Tab Panels */}
            <Grid item xs={12}>
              {analysisTab === 0 && (
                <Paper sx={{ p: 2 }}>
                  <Typography variant="h6" gutterBottom>Time Series Analysis</Typography>
                  {timeSeriesLoading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                      <LoadingSpinner />
                    </Box>
                  ) : timeSeriesError ? (
                    <Alert severity="error">
                      <AlertTitle>Error Loading Time Series Data</AlertTitle>
                      {timeSeriesError}
                    </Alert>
                  ) : timeSeriesData.length > 0 ? (
                    <Box sx={{ height: 300 }}>
                      <LineChart 
                        width={800} 
                        height={300} 
                        data={timeSeriesData}
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="month" 
                          tickFormatter={formatMonth}
                        />
                        <YAxis />
                        <ChartTooltip 
                          labelFormatter={formatMonth}
                          formatter={(value) => 
                            typeof value === 'number' ? value.toFixed(2) : value
                          }
                        />
                        <Line 
                          type="monotone" 
                          dataKey="avgPrice" 
                          stroke="#8884d8" 
                          name="Average Price (YER)" 
                          dot={false}
                          activeDot={{ r: 8 }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="volatility" 
                          stroke="#82ca9d" 
                          name="Volatility (%)" 
                          dot={false}
                          activeDot={{ r: 8 }}
                        />
                        {/* Add additional lines for USD prices if available */}
                        {timeSeriesData.some(d => d.avgUsdPrice) && (
                          <Line
                            type="monotone"
                            dataKey="avgUsdPrice"
                            stroke="#ffc658"
                            name="Average Price (USD)"
                            dot={false}
                            activeDot={{ r: 8 }}
                          />
                        )}
                        {/* Add conflict intensity if available */}
                        {timeSeriesData.some(d => d.avgConflictIntensity) && (
                          <Line
                            type="monotone"
                            dataKey="avgConflictIntensity"
                            stroke="#ff7300"
                            name="Conflict Intensity"
                            dot={false}
                            activeDot={{ r: 8 }}
                          />
                        )}
                      </LineChart>
                      {/* Add statistics summary */}
                      <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-around' }}>
                        <Typography variant="body2" color="textSecondary">
                          Sample Size: {timeSeriesData[0]?.sampleSize || 'N/A'}
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          Price Range: {timeSeriesData[0]?.priceRange?.min?.toFixed(2) || 'N/A'} - {timeSeriesData[0]?.priceRange?.max?.toFixed(2) || 'N/A'} YER
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          Average Volatility: {(timeSeriesData.reduce((acc, cur) => acc + (cur.volatility || 0), 0) / timeSeriesData.length).toFixed(2)}%
                        </Typography>
                      </Box>
                    </Box>
                  ) : (
                    <Alert severity="info">
                      No time series data available for the selected commodity and period.
                    </Alert>
                  )}
                </Paper>
              )}

              {analysisTab === 1 && (
                // Market Shocks Panel
                <Paper sx={{ p: 2 }}>
                  <Typography variant="h6" gutterBottom>Market Shocks Analysis</Typography>
                  {shocksLoading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                      <LoadingSpinner />
                    </Box>
                  ) : detectedShocksData.length > 0 ? (
                    <Grid container spacing={2}>
                      {detectedShocksData.map((shock, index) => (
                        <Grid item xs={12} key={index}>
                          <Alert 
                            severity={shock.severity === 'high' ? 'error' : 'warning'}
                            sx={{ mb: 1 }}
                          >
                            <AlertTitle>
                              {shock.type === 'surge' ? 'Price Surge' : 'Price Drop'} - {shock.region}
                            </AlertTitle>
                            <Typography variant="body2">
                              Date: {formatMonth(shock.date)}<br />
                              Magnitude: {(shock.magnitude * 100).toFixed(1)}%<br />
                              Price Change: {(shock.price_change * 100).toFixed(1)}%<br />
                              Volatility: {(shock.volatility * 100).toFixed(1)}%
                            </Typography>
                          </Alert>
                        </Grid>
                      ))}
                    </Grid>
                  ) : (
                    <Alert severity="info">
                      No significant market shocks detected during this period.
                    </Alert>
                  )}
                </Paper>
              )}

              {analysisTab === 2 && (
                // Market Clusters Panel
                <Paper sx={{ p: 2 }}>
                  <Typography variant="h6" gutterBottom>Market Clusters Analysis</Typography>
                  {clusterLoading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                      <LoadingSpinner />
                    </Box>
                  ) : marketClustersData.length > 0 ? (
                    <Grid container spacing={2}>
                      {marketClustersData.map((cluster, index) => (
                        <Grid item xs={12} md={6} key={index}>
                          <Paper 
                            sx={{ 
                              p: 2, 
                              backgroundColor: COLOR_SCALES.CLUSTERS[index % COLOR_SCALES.CLUSTERS.length] + '20'
                            }}
                          >
                            <Typography variant="subtitle1" gutterBottom>
                              Cluster {index + 1}: {cluster.mainMarket}
                            </Typography>
                            <Typography variant="body2" gutterBottom>
                              Connected Markets: {Array.from(cluster.connectedMarkets).length}
                            </Typography>
                            <Box sx={{ mt: 1 }}>
                              {Array.from(cluster.connectedMarkets).map((market) => (
                                <Chip
                                  key={market}
                                  label={market}
                                  size="small"
                                  sx={{ m: 0.5 }}
                                  onClick={() => handleRegionSelect(market)}
                                />
                              ))}
                            </Box>
                          </Paper>
                        </Grid>
                      ))}
                    </Grid>
                  ) : (
                    <Alert severity="info">
                      No market clusters identified. This could indicate isolated markets.
                    </Alert>
                  )}
                </Paper>
              )}

              {analysisTab === 3 && (
                // Market Integration Panel
                <Paper sx={{ p: 2 }}>
                  <Typography variant="h6" gutterBottom>Market Integration Analysis</Typography>
                  {marketComparison ? (
                    <Grid container spacing={3}>
                      {/* Integration Metrics */}
                      <Grid item xs={12} md={4}>
                        <Paper sx={{ p: 2, bgcolor: 'background.default' }}>
                          <Typography variant="subtitle1" gutterBottom>
                            Integration Efficiency
                          </Typography>
                          <Grid container spacing={1}>
                            <Grid item xs={6}>
                              <Typography variant="body2" color="textSecondary">
                                Price Integration:
                              </Typography>
                            </Grid>
                            <Grid item xs={6}>
                              <Chip 
                                size="small"
                                label={`${(marketComparison.integrationEfficiency * 100).toFixed(1)}%`}
                                color={marketComparison.integrationEfficiency > ANALYSIS_THRESHOLDS.INTEGRATION.HIGH ? "success" : "warning"}
                              />
                            </Grid>
                            <Grid item xs={6}>
                              <Typography variant="body2" color="textSecondary">
                                Market Coverage:
                              </Typography>
                            </Grid>
                            <Grid item xs={6}>
                              <Chip
                                size="small"
                                label={`${(marketComparison.marketCoverage * 100).toFixed(1)}%`}
                                color={marketComparison.marketCoverage > 0.6 ? "success" : "warning"}
                              />
                            </Grid>
                          </Grid>
                        </Paper>
                      </Grid>

                      {/* Transmission Metrics */}
                      <Grid item xs={12} md={4}>
                        <Paper sx={{ p: 2, bgcolor: 'background.default' }}>
                          <Typography variant="subtitle1" gutterBottom>
                            Price Transmission
                          </Typography>
                          <Grid container spacing={1}>
                            <Grid item xs={6}>
                              <Typography variant="body2" color="textSecondary">
                                Transmission Rate:
                              </Typography>
                            </Grid>
                            <Grid item xs={6}>
                              <Chip
                                size="small"
                                label={`${(marketComparison.transmissionEfficiency * 100).toFixed(1)}%`}
                                color={marketComparison.transmissionEfficiency > 0.7 ? "success" : "warning"}
                              />
                            </Grid>
                            <Grid item xs={6}>
                              <Typography variant="body2" color="textSecondary">
                                Price Convergence:
                              </Typography>
                            </Grid>
                            <Grid item xs={6}>
                              <Chip
                                size="small"
                                label={marketComparison.priceConvergence > 0 ? "Converging" : "Diverging"}
                                color={marketComparison.priceConvergence > 0 ? "success" : "error"}
                              />
                            </Grid>
                          </Grid>
                        </Paper>
                      </Grid>

                      {/* Market Stability */}
                      <Grid item xs={12} md={4}>
                        <Paper sx={{ p: 2, bgcolor: 'background.default' }}>
                          <Typography variant="subtitle1" gutterBottom>
                            Market Stability
                          </Typography>
                          <Grid container spacing={1}>
                            <Grid item xs={6}>
                              <Typography variant="body2" color="textSecondary">
                                Price Stability:
                              </Typography>
                            </Grid>
                            <Grid item xs={6}>
                              <Chip
                                size="small"
                                label={detectedShocksData.length > 0 ? "Volatile" : "Stable"}
                                color={detectedShocksData.length > 0 ? "error" : "success"}
                              />
                            </Grid>
                            <Grid item xs={6}>
                              <Typography variant="body2" color="textSecondary">
                                Market Resilience:
                              </Typography>
                            </Grid>
                            <Grid item xs={6}>
                              <Chip
                                size="small"
                                label={marketClustersData.length > 3 ? "High" : "Low"}
                                color={marketClustersData.length > 3 ? "success" : "warning"}
                              />
                            </Grid>
                          </Grid>
                        </Paper>
                      </Grid>

                      {/* Policy Implications */}
                      <Grid item xs={12}>
                        <Alert 
                          severity={marketComparison.integrationEfficiency > 0.7 ? "success" : "warning"}
                          sx={{ mt: 2 }}
                        >
                          <AlertTitle>Policy Implications</AlertTitle>
                          {marketComparison.integrationEfficiency > 0.7 ? (
                            "Markets show strong integration. Focus on maintaining current trade flows and monitoring for potential shocks."
                          ) : (
                            "Market integration is below optimal levels. Consider interventions to improve connectivity and reduce trade barriers between identified market clusters."
                          )}
                          {detectedShocksData.length > 0 && (
                            <Typography variant="body2" sx={{ mt: 1 }}>
                              Recent market shocks suggest the need for enhanced price stabilization mechanisms.
                            </Typography>
                          )}
                        </Alert>
                      </Grid>
                    </Grid>
                  ) : (
                    <Alert severity="info">
                      Insufficient data for market integration analysis.
                    </Alert>
                  )}
                </Paper>
              )}
            </Grid>

            {/* Map Legend */}
            {shouldShowLegend && (
              <Grid item xs={12}>
                <Suspense fallback={<div>Loading Legend...</div>}>
                  <MapLegend
                    title={`${validCommodity} Distribution`}
                    colorScale={colorScalesMemo.getColor}
                    unit={analysisData?.units || ''}
                    description="Spatial distribution of values"
                    position="bottomright"
                    statistics={{
                      'Spatial Effect': analysisData?.coefficients?.spatial_lag_price,
                      'Integration': analysisData?.r_squared,
                      'Correlation': analysisData?.moran_i?.I
                    }}
                  />
                </Suspense>
              </Grid>
            )}
          </Grid>
        </Box>
      </Suspense>
    </ErrorBoundary>
  );
};

SpatialAnalysis.propTypes = {
  selectedCommodity: PropTypes.string.isRequired,
  selectedDate: PropTypes.string
};

export default React.memo(SpatialAnalysis);