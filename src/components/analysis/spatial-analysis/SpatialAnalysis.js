// src/components/analysis/spatial-analysis/SpatialAnalysis.js

import React, { useEffect, useState, useMemo, useCallback, Suspense, lazy } from 'react';
import { useDispatch, useSelector, shallowEqual } from 'react-redux';
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
  Tooltip,
  IconButton,
} from '@mui/material';
import {
  Timeline,
  TrendingUp,
  GroupWork,
  CompareArrows,
  Download,
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ChartTooltip,
} from 'recharts';
import {
  fetchSpatialData,
  setSelectedRegion,
  setSelectedCommodity,
  setSelectedDate,
  selectTimeSeriesData,
  selectAnalysisMetrics,
} from '../../../slices/spatialSlice';
import { usePrecomputedData } from '../../../hooks/usePrecomputedData';
import {
  VISUALIZATION_MODES,
  COLOR_SCALES,
  ANALYSIS_THRESHOLDS,
} from '../../../constants/index.js';
import { processTimeSeriesData, getColorScales } from '../../../utils/spatialUtils';
import SpatialErrorBoundary from './SpatialErrorBoundary';
import { interpolateBlues, interpolateReds } from 'd3-scale-chromatic';

// Lazy loaded components
const MapLegend = lazy(() => import('./MapLegend'));
const TimeControls = lazy(() => import('./TimeControls'));
const LoadingSpinner = lazy(() => import('../../common/LoadingSpinner'));
const ErrorDisplay = lazy(() => import('../../common/ErrorDisplay'));
const SpatialMap = lazy(() => import('./SpatialMap'));

const DEFAULT_UI_STATE = {
  mode: VISUALIZATION_MODES.PRICES,
  showFlows: true,
  selectedRegion: null,
  analysisTab: 0,
  dateError: null,
};

const formatMonth = (monthStr) => {
  if (!monthStr) return '';
  try {
    const date = new Date(monthStr);
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  } catch (error) {
    console.error('Error formatting month:', error);
    return monthStr;
  }
};

const SpatialAnalysis = () => {
  const dispatch = useDispatch();
  const [visualizationState, setVisualizationState] = useState(DEFAULT_UI_STATE);

  // Use the precomputed data hook
  const {
    data: spatialData,
    loading: isProcessing,
    error,
    metrics: analysisMetrics
  } = usePrecomputedData();

  // Extract data from the preprocessed results
  const {
    geoData,
    flowMaps,
    marketClusters: marketClustersData,
    detectedShocks: detectedShocksData,
    timeSeriesData,
    analysisResults
  } = spatialData || {};

  const { selectedCommodity, selectedDate, selectedRegion } = useSelector(
    state => state.spatial.ui,
    shallowEqual
  );

  // Data validation
  const isDataValid = useCallback(() => {
    return Boolean(
      geoData?.features?.length &&
      selectedCommodity &&
      selectedDate
    );
  }, [geoData, selectedCommodity, selectedDate]);

  // Handler for commodity change
  const handleCommodityChange = useCallback(async (commodity) => {
    try {
      await dispatch(setSelectedCommodity(commodity));
      await dispatch(fetchSpatialData({ selectedCommodity: commodity, selectedDate }));
    } catch (error) {
      console.error('Error changing commodity:', error);
    }
  }, [dispatch, selectedDate]);

  // Handler for date change
  const handleDateChange = useCallback(async (date) => {
    try {
      await dispatch(setSelectedDate(date));
      await dispatch(fetchSpatialData({ selectedCommodity, selectedDate: date }));
    } catch (error) {
      console.error('Error changing date:', error);
    }
  }, [dispatch, selectedCommodity]);

  // Handle visualization state updates
  const handleVisualizationUpdate = useCallback((updates) => {
    setVisualizationState(prevState => ({
      ...prevState,
      ...updates,
    }));
  }, []);

  // Handle region selection
  const handleRegionSelect = useCallback((region) => {
    handleVisualizationUpdate({ selectedRegion: region });
    dispatch(setSelectedRegion(region));
  }, [dispatch, handleVisualizationUpdate]);

  // Export Analysis Data
  const exportAnalysis = useCallback(() => {
    if (!spatialData) return;

    const exportData = {
      commodity: selectedCommodity,
      date: selectedDate,
      timeSeriesAnalysis: timeSeriesData,
      marketShocks: detectedShocksData,
      marketClusters: marketClustersData,
      analysisMetrics,
      analysisResults
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `market-analysis-${selectedCommodity}-${selectedDate}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [
    spatialData,
    selectedCommodity,
    selectedDate,
    timeSeriesData,
    detectedShocksData,
    marketClustersData,
    analysisMetrics,
    analysisResults
  ]);

  // Props for child components
  const mapControlsProps = useMemo(() => ({
    selectedCommodity,
    selectedDate,
    uniqueMonths: timeSeriesData?.map(d => d.month) || [],
    commodities: [], // This should come from your commodities list
    onDateChange: handleDateChange,
    onCommodityChange: handleCommodityChange,
    onRefresh: () => dispatch(fetchSpatialData({ selectedCommodity, selectedDate })),
    visualizationMode: visualizationState.mode,
    onVisualizationModeChange: (mode) => handleVisualizationUpdate({ mode }),
    showFlows: visualizationState.showFlows,
    onToggleFlows: () => handleVisualizationUpdate({
      showFlows: !visualizationState.showFlows,
    }),
  }), [
    selectedCommodity,
    selectedDate,
    timeSeriesData,
    handleDateChange,
    handleCommodityChange,
    dispatch,
    visualizationState.mode,
    visualizationState.showFlows,
    handleVisualizationUpdate
  ]);

  const mapProps = useMemo(() => ({
    geoData,
    flowMaps: visualizationState.showFlows ? flowMaps : [],
    selectedMonth: selectedDate,
    onMonthChange: handleDateChange,
    availableMonths: timeSeriesData?.map(d => d.month) || [],
    showFlows: visualizationState.showFlows,
    analysisResults,
    selectedCommodity,
    marketClusters: marketClustersData,
    detectedShocks: detectedShocksData,
    visualizationMode: visualizationState.mode,
    colorScales: getColorScales(visualizationState.mode, geoData),
    onRegionSelect: handleRegionSelect,
  }), [
    geoData,
    flowMaps,
    visualizationState.showFlows,
    selectedDate,
    handleDateChange,
    timeSeriesData,
    analysisResults,
    selectedCommodity,
    marketClustersData,
    detectedShocksData,
    visualizationState.mode,
    handleRegionSelect
  ]);

  // Loading state check
  if (isProcessing || !isDataValid()) {
    return (
      <Suspense fallback={<LoadingSpinner />}>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
          <LoadingSpinner />
        </Box>
      </Suspense>
    );
  }

  // Error state check
  if (error) {
    return (
      <Suspense fallback={<div>Loading...</div>}>
        <ErrorDisplay
          error={error}
          title="Analysis Error"
          onRetry={() => dispatch(fetchSpatialData({ selectedCommodity, selectedDate }))}
        />
      </Suspense>
    );
  }

  // Render visualization tabs...
  return (
    <SpatialErrorBoundary
      onRetry={() => dispatch(fetchSpatialData({ selectedCommodity, selectedDate }))}
    >
      <Suspense fallback={<div>Loading components...</div>}>
        <Box sx={{ width: '100%' }}>
          <Grid container spacing={2}>
            {/* Title and Export Button */}
            <Grid
              item
              xs={12}
              sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
            >
              <Typography variant="h5">
                Market Integration Analysis: {selectedCommodity}
              </Typography>
              <Tooltip title="Export Analysis">
                <IconButton onClick={exportAnalysis} aria-label="export analysis">
                  <Download />
                </IconButton>
              </Tooltip>
            </Grid>

            {/* Date Error Alert */}
            {visualizationState.dateError && (
              <Grid item xs={12}>
                <Alert severity="warning">
                  <AlertTitle>Warning</AlertTitle>
                  {visualizationState.dateError}
                </Alert>
              </Grid>
            )}

            {/* Map Controls */}
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

            {/* Analysis Tabs */}
            <Grid item xs={12}>
              <Tabs
                value={visualizationState.analysisTab}
                onChange={(e, newValue) => handleVisualizationUpdate({ analysisTab: newValue })}
                aria-label="Analysis Tabs"
              >
                <Tab icon={<Timeline />} label="Time Series" />
                <Tab icon={<TrendingUp />} label="Market Shocks" />
                <Tab icon={<GroupWork />} label="Market Clusters" />
                <Tab icon={<CompareArrows />} label="Market Integration" />
              </Tabs>
            </Grid>

            {/* Tab Panels */}
            <Grid item xs={12}>
              {/* Time Series Analysis Panel */}
              {visualizationState.analysisTab === 0 && (
                <Paper sx={{ p: 2 }}>
                  <Typography variant="h6" gutterBottom>
                    Time Series Analysis
                  </Typography>
                  {timeSeriesData?.length > 0 ? (
                    <Box sx={{ height: 300 }}>
                      <LineChart
                        width={800}
                        height={300}
                        data={processTimeSeriesData(timeSeriesData)}
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" tickFormatter={formatMonth} />
                        <YAxis />
                        <ChartTooltip
                          labelFormatter={formatMonth}
                          formatter={(value) => typeof value === 'number' ? value.toFixed(2) : value}
                        />
                        <Line
                          type="monotone"
                          dataKey="avgUsdPrice"
                          stroke="#8884d8"
                          name="Average Price (USD)"
                          dot={false}
                          activeDot={{ r: 8 }}
                        />
                        <Line
                          type="monotone"
                          dataKey="volatility"
                          stroke="#82ca9d"
                          name="Volatility"
                          dot={false}
                          activeDot={{ r: 8 }}
                        />
                      </LineChart>
                    </Box>
                  ) : (
                    <Alert severity="info">
                      No time series data available for the selected commodity and period.
                    </Alert>
                  )}
                </Paper>
              )}

              {/* Market Shocks Panel */}
              {visualizationState.analysisTab === 1 && (
                <Paper sx={{ p: 2 }}>
                  <Typography variant="h6" gutterBottom>
                    Market Shocks Analysis
                  </Typography>
                  {detectedShocksData?.length > 0 ? (
                    <Grid container spacing={2}>
                      {detectedShocksData.map((shock, index) => (
                        <Grid item xs={12} key={index}>
                          <Alert
                            severity={shock.severity === 'high' ? 'error' : 'warning'}
                            sx={{ mb: 1 }}
                          >
                            <AlertTitle>
                              {shock.type === 'price_surge' ? 'Price Surge' : 'Price Drop'} -{' '}
                              {shock.region}
                            </AlertTitle>
                            <Typography variant="body2">
                              Date: {formatMonth(shock.date)}
                              <br />
                              Magnitude: {shock.magnitude.toFixed(1)}%
                              <br />
                              Previous Price: ${shock.previous_price.toFixed(2)}
                              <br />
                              Current Price: ${shock.current_price.toFixed(2)}
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

              {/* Market Clusters Panel */}
              {visualizationState.analysisTab === 2 && (
                <Paper sx={{ p: 2 }}>
                  <Typography variant="h6" gutterBottom>
                    Market Clusters Analysis
                  </Typography>
                  {marketClustersData?.length > 0 ? (
                    <Grid container spacing={2}>
                      {marketClustersData.map((cluster, index) => (
                        <Grid item xs={12} md={6} key={index}>
                          <Paper
                            sx={{
                              p: 2,
                              backgroundColor: COLOR_SCALES.CLUSTERS[index % COLOR_SCALES.CLUSTERS.length] + '20',
                            }}
                          >
                            <Typography variant="subtitle1" gutterBottom>
                              Cluster {cluster.cluster_id}: {cluster.main_market}
                            </Typography>
                            <Typography variant="body2" gutterBottom>
                              Connected Markets: {cluster.connected_markets.length}
                            </Typography>
                            <Box sx={{ mt: 1 }}>
                              {cluster.connected_markets.map((market) => (
                                <Chip
                                  key={market}
                                  label={market}
                                  size="small"
                                  sx={{ m: 0.5 }}
                                  onClick={() => handleRegionSelect(market)}
                                />
                              ))}
                            </Box>
                            {/* Add cluster metrics */}
                            <Box sx={{ mt: 2 }}>
                              <Typography variant="caption" display="block">
                                Market Integration: {(cluster.connected_markets.length / (analysisMetrics?.totalMarkets || 1) * 100).toFixed(1)}%
                              </Typography>
                              <Typography variant="caption" display="block">
                                Average Flow: {cluster.avgFlow?.toFixed(2) || 'N/A'}
                              </Typography>
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

              {/* Market Integration Panel */}
              {visualizationState.analysisTab === 3 && (
                <Paper sx={{ p: 2 }}>
                  <Typography variant="h6" gutterBottom>
                    Market Integration Analysis
                  </Typography>
                  {analysisResults?.spatialAutocorrelation ? (
                    <Grid container spacing={3}>
                      <Grid item xs={12} md={4}>
                        <Paper sx={{ p: 2 }}>
                          <Typography variant="subtitle2" gutterBottom>
                            Spatial Correlation
                          </Typography>
                          <Typography variant="h4">
                            {(analysisResults.spatialAutocorrelation.moran_i * 100).toFixed(1)}%
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {analysisResults.spatialAutocorrelation.significance ? 
                              'Statistically Significant' : 'Not Statistically Significant'}
                          </Typography>
                        </Paper>
                      </Grid>

                      <Grid item xs={12} md={4}>
                        <Paper sx={{ p: 2 }}>
                          <Typography variant="subtitle2" gutterBottom>
                            Market Coverage
                          </Typography>
                          <Typography variant="h4">
                            {marketClustersData?.length || 0} Clusters
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {marketClustersData?.reduce((acc, cluster) => 
                              acc + cluster.connected_markets.length, 0) || 0} Connected Markets
                          </Typography>
                        </Paper>
                      </Grid>

                      <Grid item xs={12} md={4}>
                        <Paper sx={{ p: 2 }}>
                          <Typography variant="subtitle2" gutterBottom>
                            Price Integration
                          </Typography>
                          <Typography variant="h4">
                            {(analysisMetrics?.integrationLevel * 100).toFixed(1)}%
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Based on price correlation across markets
                          </Typography>
                        </Paper>
                      </Grid>

                      {/* Flow Analysis Summary */}
                      <Grid item xs={12}>
                        <Paper sx={{ p: 2, mt: 2 }}>
                          <Typography variant="subtitle1" gutterBottom>
                            Flow Analysis Summary
                          </Typography>
                          <Grid container spacing={2}>
                            <Grid item xs={12} md={6}>
                              <Typography variant="body2">
                                Total Flows: {flowMaps?.length || 0}
                              </Typography>
                              <Typography variant="body2">
                                Average Flow Weight: {
                                  (flowMaps?.reduce((acc, flow) => acc + flow.flow_weight, 0) / 
                                  (flowMaps?.length || 1)).toFixed(2)
                                }
                              </Typography>
                            </Grid>
                            <Grid item xs={12} md={6}>
                              <Typography variant="body2">
                                Price Differential Range: {
                                  flowMaps?.length ? 
                                  `${Math.min(...flowMaps.map(f => f.price_differential)).toFixed(2)} - 
                                   ${Math.max(...flowMaps.map(f => f.price_differential)).toFixed(2)}` :
                                  'N/A'
                                }
                              </Typography>
                            </Grid>
                          </Grid>
                        </Paper>
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
            {geoData?.features?.length > 0 && (
              <Grid item xs={12}>
                <Suspense fallback={<div>Loading Legend...</div>}>
                  <MapLegend
                    title={`${selectedCommodity} Distribution`}
                    colorScale={getColorScales(visualizationState.mode, geoData).getColor}
                    unit="USD"
                    description="Spatial distribution of prices"
                    position="bottomright"
                    statistics={{
                      'Integration Score': analysisResults?.spatialAutocorrelation?.moran_i?.toFixed(3),
                      'Price Correlation': analysisMetrics?.integrationLevel?.toFixed(3),
                      'Market Coverage': `${marketClustersData?.length || 0} clusters`
                    }}
                  />
                </Suspense>
              </Grid>
            )}
          </Grid>
        </Box>
      </Suspense>
    </SpatialErrorBoundary>
  );
};

export default React.memo(SpatialAnalysis);
