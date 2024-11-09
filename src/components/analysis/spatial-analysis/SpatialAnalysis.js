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

const SpatialAnalysis = ({ selectedCommodity, selectedDate: initialDate = '' }) => {
  const dispatch = useDispatch();
  
  // Select necessary data from Redux store
  const {
    geoData,
    analysis,
    flows,
    weights,
    uniqueMonths = [],
    regimes = [],
    commodities = [],
    status,
    error,
    loadingProgress,
    selectedCommodity: storeCommodity,
    selectedDate: storeDate
  } = useSelector(selectSpatialData);

  // Ensure commodity is valid
  const validCommodity = useMemo(() => 
    commodities.includes(selectedCommodity) ? selectedCommodity : commodities[0] || '',
    [commodities, selectedCommodity]
  );

  // Initialize date
  const [selectedDate, setSelectedDateLocal] = useState(initialDate);
  const validDate = useMemo(() => 
    uniqueMonths.includes(selectedDate) ? selectedDate : uniqueMonths[0],
    [uniqueMonths, selectedDate]
  );

  // Date error state
  const [dateError, setDateError] = useState(null);

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
    try {
      metric = backgroundMonitor?.startMetric('spatial-analysis-load', {
        commodity: validCommodity,
        date: validDate
      });
    } catch (err) {
      console.warn('Background monitor not available:', err);
    }
    
    return () => {
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

  // Local state management
  const [visualizationMode, setVisualizationMode] = useState(VISUALIZATION_MODES.PRICES);
  const [showFlows, setShowFlows] = useState(true);
  const [selectedRegion, setSelectedRegionLocal] = useState(null);
  const [analysisTab, setAnalysisTab] = useState(0);

  // Initialize worker manager
  const worker = useWorkerManager();

  // Callback for handling commodity change with debounce
  const handleCommodityChange = useCallback(debounce((commodity) => {
    if (commodities.includes(commodity)) {
      dispatch(setSelectedCommodity(commodity));
      // Optionally, fetch data again if necessary
      dispatch(fetchSpatialData());
    }
  }, 300), [dispatch, commodities]);

  // Callback for handling month change with debounce
  const handleMonthChange = useCallback(debounce((newMonth) => {
    if (validCommodity && uniqueMonths?.includes(newMonth)) {
      setSelectedDateLocal(newMonth);
      dispatch(setSelectedDate(newMonth));
    }
  }, 300), [validCommodity, dispatch, uniqueMonths]);

  // Callback for refreshing data
  const handleRefresh = useCallback(() => {
    dispatch(fetchSpatialData());
  }, [dispatch]);

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
  const marketClusters = useMemo(() => {
    if (!currentFlows || !weights) return [];
    // Offload computeClusters to worker
    worker.processSpatialData({ flows: currentFlows, weights }).then(result => {
      // Assuming result contains clusters
      return result.clusters;
    }).catch(error => {
      console.error('Error computing clusters:', error);
      return [];
    });
    return []; // Initial empty state
  }, [currentFlows, weights, worker]);

  const detectedShocks = useMemo(() => {
    if (!geoData?.features) return [];
    // Offload detectMarketShocks to worker
    worker.processSpatialData({ geoData: geoData, additionalData: {} }).then(result => {
      // Assuming result contains shocks
      return result.shocks;
    }).catch(error => {
      console.error('Error detecting shocks:', error);
      return [];
    });
    return []; // Initial empty state
  }, [geoData, worker]);

  const timeSeriesData = useMemo(() => {
    if (!geoData?.features) return [];
    // Offload time series data aggregation to worker
    worker.processSpatialData({ geoData: geoData, additionalData: {} }).then(result => {
      // Assuming result contains time series
      return result.timeSeries;
    }).catch(error => {
      console.error('Error processing time series data:', error);
      return [];
    });
    return []; // Initial empty state
  }, [geoData, worker]);

  const marketComparison = useMemo(() => {
    if (!analysisData || !marketClusters.length) return null;

    return {
      integrationEfficiency: (analysisData?.r_squared || 0),
      transmissionEfficiency: (analysisData?.coefficients?.spatial_lag_price || 0),
      marketCoverage: marketClusters.length / (Object.keys(spatialMetrics?.weights || {}).length || 1),
      priceConvergence: analysisData?.moran_i?.I ?? null,
    };
  }, [analysisData, marketClusters, spatialMetrics]);

  // Export Analysis Data
  const exportAnalysis = useCallback(() => {
    const exportData = {
      commodity: validCommodity,
      date: validDate,
      timeSeriesAnalysis: timeSeriesData,
      marketShocks: detectedShocks,
      marketClusters: marketClusters.map(cluster => ({
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
  }, [validCommodity, validDate, timeSeriesData, detectedShocks, marketClusters, marketComparison, analysisData]);

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
    marketClusters,
    detectedShocks,
    visualizationMode,
    colorScales: colorScalesMemo,
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
    marketClusters,
    detectedShocks,
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
                  <AlertTitle>Date Selection Issue</AlertTitle>
                  {dateError}
                </Alert>
              </Grid>
            )}

            {/* Market Shocks Alert */}
            {detectedShocks.length > 0 && (
              <Grid item xs={12}>
                <Alert 
                  severity="warning" 
                  icon={<Warning />}
                  action={
                    <Button color="inherit" size="small" onClick={() => setAnalysisTab(1)}>
                      View Details
                    </Button>
                  }
                >
                  {detectedShocks.length} market shock{detectedShocks.length > 1 ? 's' : ''} detected
                </Alert>
              </Grid>
            )}

            {/* Map Controls with valid props */}
            <Grid item xs={12}>
              <Suspense fallback={<div>Loading Map Controls...</div>}>
                <MapControls {...mapControlsProps} />
              </Suspense>
            </Grid>

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
                // Time Series Analysis Panel
                <Paper sx={{ p: 2 }}>
                  <Typography variant="h6" gutterBottom>Time Series Analysis</Typography>
                  {timeSeriesData.length > 0 ? (
                    <Box sx={{ height: 300 }}>
                      <LineChart width={800} height={300} data={timeSeriesData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="month" 
                          tickFormatter={formatMonth}
                        />
                        <YAxis />
                        <ChartTooltip 
                          labelFormatter={formatMonth}
                          formatter={(value) => value.toFixed(2)}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="avgPrice" 
                          stroke="#8884d8" 
                          name="Average Price (YER)" 
                        />
                        <Line 
                          type="monotone" 
                          dataKey="volatility" 
                          stroke="#82ca9d" 
                          name="Volatility" 
                        />
                      </LineChart>
                    </Box>
                  ) : (
                    <Typography variant="body2">No time series data available.</Typography>
                  )}
                </Paper>
              )}

              {analysisTab === 1 && (
                // Market Shocks Panel
                <Paper sx={{ p: 2 }}>
                  <Typography variant="h6" gutterBottom>Market Shocks Analysis</Typography>
                  {detectedShocks.length > 0 ? (
                    <Grid container spacing={2}>
                      {detectedShocks.map((shock, index) => (
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
                  {marketClusters.length > 0 ? (
                    <Grid container spacing={2}>
                      {marketClusters.map((cluster, index) => (
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
                                label={detectedShocks.length > 0 ? "Volatile" : "Stable"}
                                color={detectedShocks.length > 0 ? "error" : "success"}
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
                                label={marketClusters.length > 3 ? "High" : "Low"}
                                color={marketClusters.length > 3 ? "success" : "warning"}
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
                          {detectedShocks.length > 0 && (
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

            {/* Time Controls */}
            <Grid item xs={12}>
              <Suspense fallback={<div>Loading Time Controls...</div>}>
                <TimeControls {...timeControlsProps} />
              </Suspense>
            </Grid>
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
