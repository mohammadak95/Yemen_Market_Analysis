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
  CircularProgress
} from '@mui/material';
import {
  Timeline,
  TrendingUp,
  GroupWork,
  CompareArrows,
  Download
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ChartTooltip
} from 'recharts';
import {
  fetchSpatialData,
  setSelectedRegion,
  setSelectedCommodity,
  setSelectedDate,
  selectTimeSeriesData,      // Now exported from spatialSlice.js
  selectAnalysisMetrics,
} from '../../../slices/spatialSlice';
import { useSpatialDataOptimized } from '../../../hooks';
import { VISUALIZATION_MODES, COLOR_SCALES, ANALYSIS_THRESHOLDS } from '../../../constants/spatialConstants';
import SpatialErrorBoundary from './SpatialErrorBoundary';
import { interpolateBlues, interpolateReds } from 'd3-scale-chromatic';

// Lazy loaded components
const MapControls = lazy(() => import('./MapControls'));
const MapLegend = lazy(() => import('./MapLegend'));
const TimeControls = lazy(() => import('./TimeControls'));
const LoadingSpinner = lazy(() => import('../../common/LoadingSpinner'));
const ErrorDisplay = lazy(() => import('../../common/ErrorDisplay'));
const SpatialMap = lazy(() => import('./SpatialMap'));

// Constants for safe state management
const DEFAULT_UI_STATE = {
  mode: VISUALIZATION_MODES.PRICES,
  showFlows: true,
  selectedRegion: null,
  analysisTab: 0,
  dateError: null
};

// Helper function for month formatting
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

// Data validation utilities
const validateGeoData = (data) => {
  return Boolean(data?.features?.length);
};

const getColorScales = (mode, data) => {
  if (!validateGeoData(data)) return { getColor: () => '#ccc' };

  try {
    const priceValues = data.features
      .map(f => f.properties?.price)
      .filter(price => typeof price === 'number' && !isNaN(price));

    if (!priceValues.length) return { getColor: () => '#ccc' };

    const min = Math.min(...priceValues);
    const max = Math.max(...priceValues);

    const scales = {
      prices: (feature) => {
        const value = feature.properties?.price;
        if (typeof value !== 'number' || isNaN(value)) return '#ccc';
        return interpolateBlues((value - min) / (max - min));
      },
      volatility: (feature) => {
        const volatility = feature.properties?.volatility || 0;
        return interpolateReds(Math.min(volatility / 100, 1));
      },
      residuals: (feature) => {
        const residual = Math.abs(feature.properties?.residual || 0);
        return interpolateReds(Math.min(residual / 2, 1));
      }
    };

    return {
      getColor: scales[mode] || (() => '#ccc')
    };
  } catch (error) {
    console.error('Error creating color scales:', error);
    return { getColor: () => '#ccc' };
  }
};

const SpatialAnalysis = () => {
  const dispatch = useDispatch();

  // Use the optimized hook
  const {
    spatialData,
    uiState,
    isProcessing,
    error,
    processSpatialData,
    selectRegion,
  } = useSpatialDataOptimized();

  const {
    geoData,
    flowMaps,
    flows,
    weights,
    uniqueMonths,
    commodities,
    regimes,
    marketClusters: marketClustersData,
    detectedShocks: detectedShocksData,
  } = spatialData;

  const {
    selectedCommodity: currentCommodity,
    selectedDate,
    selectedRegion,
  } = uiState;

  const timeSeriesData = useSelector(selectTimeSeriesData, shallowEqual);
  const analysisMetrics = useSelector(selectAnalysisMetrics, shallowEqual);

  // State management with safe defaults
  const [visualizationState, setVisualizationState] = useState(DEFAULT_UI_STATE);

  // Data validation
  const isDataValid = useCallback(() => {
    return Boolean(
      validateGeoData(geoData) &&
      currentCommodity &&
      selectedDate &&
      Array.isArray(regimes) &&
      regimes.includes('unified')
    );
  }, [geoData, currentCommodity, selectedDate, regimes]);

  // Initialize data on mount
  useEffect(() => {
    if (currentCommodity && uniqueMonths?.[0]) {
      processSpatialData(currentCommodity, uniqueMonths[0]);
    }
  }, [currentCommodity, uniqueMonths, processSpatialData]);

  // Handler for commodity change
  const handleCommodityChange = useCallback(async (commodity) => {
    if (commodities.includes(commodity)) {
      try {
        await processSpatialData(commodity, selectedDate);
      } catch (error) {
        console.error('Error changing commodity:', error);
      }
    }
  }, [processSpatialData, selectedDate, commodities]);

  // Handler for date change
  const handleDateChange = useCallback(async (date) => {
    if (uniqueMonths.includes(date)) {
      try {
        await processSpatialData(currentCommodity, date);
      } catch (error) {
        console.error('Error changing date:', error);
      }
    }
  }, [processSpatialData, currentCommodity, uniqueMonths]);

  // Handle visualization state updates
  const handleVisualizationUpdate = useCallback((updates) => {
    setVisualizationState(prevState => ({
      ...prevState,
      ...updates
    }));
  }, []);

  // Handle region selection
  const handleRegionSelect = useCallback((region) => {
    handleVisualizationUpdate({ selectedRegion: region });
    selectRegion(region);
  }, [selectRegion, handleVisualizationUpdate]);

  // Handle manual refresh
  const handleRefresh = useCallback(async () => {
    try {
      await processSpatialData(currentCommodity, selectedDate);
    } catch (error) {
      console.error('Error refreshing data:', error);
    }
  }, [processSpatialData, currentCommodity, selectedDate]);

  // Export Analysis Data
  const exportAnalysis = useCallback(() => {
    const exportData = {
      commodity: currentCommodity,
      date: selectedDate,
      timeSeriesAnalysis: timeSeriesData,
      marketShocks: detectedShocksData,
      marketClusters: marketClustersData.map(cluster => ({
        mainMarket: cluster.mainMarket,
        connectedMarkets: Array.from(cluster.connectedMarkets),
        marketCount: cluster.marketCount,
      })),
      // Include analysis metrics if available
      analysisMetrics,
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `market-analysis-${currentCommodity}-${selectedDate}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [currentCommodity, selectedDate, timeSeriesData, detectedShocksData, marketClustersData, analysisMetrics]);

  // Updated Map Controls props
  const mapControlsProps = useMemo(() => ({
    selectedCommodity: currentCommodity,
    selectedDate,
    uniqueMonths,
    commodities,
    onDateChange: handleDateChange,
    onCommodityChange: handleCommodityChange,
    onRefresh: handleRefresh,
    visualizationMode: visualizationState.mode,
    onVisualizationModeChange: (mode) => handleVisualizationUpdate({ mode }),
    showFlows: visualizationState.showFlows,
    onToggleFlows: () => handleVisualizationUpdate({
      showFlows: !visualizationState.showFlows
    })
  }), [
    currentCommodity,
    selectedDate,
    uniqueMonths,
    commodities,
    visualizationState.mode,
    visualizationState.showFlows,
    handleDateChange,
    handleCommodityChange,
    handleRefresh,
    handleVisualizationUpdate
  ]);

  // Updated mapProps
  const mapProps = useMemo(() => ({
    geoData,
    flowMaps: visualizationState.showFlows ? flowMaps : [],
    selectedMonth: selectedDate,
    onMonthChange: handleDateChange,
    availableMonths: uniqueMonths,
    spatialWeights: weights,
    showFlows: visualizationState.showFlows,
    analysisResults: analysisMetrics,
    selectedCommodity: currentCommodity,
    marketClusters: marketClustersData,
    detectedShocks: detectedShocksData,
    visualizationMode: visualizationState.mode,
    colorScales: getColorScales(visualizationState.mode, geoData),
    onRegionSelect: handleRegionSelect
  }), [
    geoData,
    flowMaps,
    visualizationState.showFlows,
    selectedDate,
    handleDateChange,
    uniqueMonths,
    weights,
    analysisMetrics,
    currentCommodity,
    marketClustersData,
    detectedShocksData,
    visualizationState.mode,
    handleRegionSelect
  ]);

  // Time controls props
  const timeControlsProps = useMemo(() => ({
    availableMonths: uniqueMonths,
    selectedMonth: selectedDate,
    onMonthChange: handleDateChange,
    analysisResults: analysisMetrics,
    spatialWeights: weights
  }), [
    uniqueMonths,
    selectedDate,
    handleDateChange,
    analysisMetrics,
    weights
  ]);

  // Determine if legend should be shown
  const shouldShowLegend = useMemo(() =>
    geoData?.features?.length > 0 && getColorScales(visualizationState.mode, geoData).getColor !== undefined,
    [visualizationState.mode, geoData]
  );

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
          onRetry={() => processSpatialData(currentCommodity, selectedDate)}
        />
      </Suspense>
    );
  }

  return (
    <SpatialErrorBoundary onRetry={() => {
      if (currentCommodity && selectedDate) {
        processSpatialData(currentCommodity, selectedDate);
      }
    }}>
      <Suspense fallback={<div>Loading components...</div>}>
        <Box sx={{ width: '100%' }}>
          <Grid container spacing={2}>
            {/* Title and Export Button */}
            <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h5">
                Market Integration Analysis: {currentCommodity}
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

            {/* Time Controls */}
            <Grid item xs={12}>
              <Suspense fallback={<div>Loading Time Controls...</div>}>
                <TimeControls {...timeControlsProps} />
              </Suspense>
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
                  <Typography variant="h6" gutterBottom>Time Series Analysis</Typography>
                  {timeSeriesData.length > 0 ? (
                    <Box sx={{ height: 300 }}>
                      <LineChart
                        width={800}
                        height={300}
                        data={timeSeriesData}
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="date"
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
                          dataKey="price"
                          stroke="#8884d8"
                          name="Average Price (YER)"
                          dot={false}
                          activeDot={{ r: 8 }}
                        />
                        <Line
                          type="monotone"
                          dataKey="conflictIntensity"
                          stroke="#82ca9d"
                          name="Conflict Intensity"
                          dot={false}
                          activeDot={{ r: 8 }}
                        />
                        {/* Add additional lines for USD prices if available */}
                        {timeSeriesData.some(d => d.usdPrice) && (
                          <Line
                            type="monotone"
                            dataKey="usdPrice"
                            stroke="#ffc658"
                            name="Average Price (USD)"
                            dot={false}
                            activeDot={{ r: 8 }}
                          />
                        )}
                      </LineChart>
                      {/* Add statistics summary */}
                      <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-around' }}>
                        <Typography variant="body2" color="textSecondary">
                          Sample Size: {analysisMetrics?.observations || 'N/A'}
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          Price Range: {analysisMetrics?.priceRange?.min?.toFixed(2) || 'N/A'} - {analysisMetrics?.priceRange?.max?.toFixed(2) || 'N/A'} YER
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          Average Conflict Intensity: {analysisMetrics?.averageConflictIntensity?.toFixed(2) || 'N/A'}
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

              {/* Market Shocks Panel */}
              {visualizationState.analysisTab === 1 && (
                <Paper sx={{ p: 2 }}>
                  <Typography variant="h6" gutterBottom>Market Shocks Analysis</Typography>
                  {detectedShocksData.length > 0 ? (
                    <Grid container spacing={2}>
                      {detectedShocksData.map((shock, index) => (
                        <Grid item xs={12} key={index}>
                          <Alert
                            severity={shock.severity === 'high' ? 'error' : 'warning'}
                            sx={{ mb: 1 }}
                          >
                            <AlertTitle>
                              {shock.type === 'price_surge' ? 'Price Surge' : 'Price Drop'} - {shock.region}
                            </AlertTitle>
                            <Typography variant="body2">
                              Date: {formatMonth(shock.date)}<br />
                              Magnitude: {(shock.magnitude * 100).toFixed(1)}%<br />
                              Price Change: {(shock.price_change * 100).toFixed(1)}%<br />
                              Conflict Intensity: {(shock.conflict_intensity * 100).toFixed(1)}%
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
                  <Typography variant="h6" gutterBottom>Market Clusters Analysis</Typography>
                  {marketClustersData.length > 0 ? (
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
                              Connected Markets: {cluster.connectedMarkets.length}
                            </Typography>
                            <Box sx={{ mt: 1 }}>
                              {cluster.connectedMarkets.map((market) => (
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

              {/* Market Integration Panel */}
              {visualizationState.analysisTab === 3 && (
                <Paper sx={{ p: 2 }}>
                  <Typography variant="h6" gutterBottom>Market Integration Analysis</Typography>
                  {analysisMetrics ? (
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
                                label={`${(analysisMetrics.integrationScore * 100).toFixed(1)}%`}
                                color={analysisMetrics.integrationScore > ANALYSIS_THRESHOLDS.INTEGRATION.HIGH ? "success" : "warning"}
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
                                label={`${(analysisMetrics.marketCoverage * 100).toFixed(1)}%`}
                                color={analysisMetrics.marketCoverage > 60 ? "success" : "warning"}
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
                                label={`${(analysisMetrics.transmissionEfficiency * 100).toFixed(1)}%`}
                                color={analysisMetrics.transmissionEfficiency > 70 ? "success" : "warning"}
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
                                label={analysisMetrics.priceConvergence > 0 ? "Converging" : "Diverging"}
                                color={analysisMetrics.priceConvergence > 0 ? "success" : "error"}
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
                          severity={analysisMetrics.integrationScore > 0.7 ? "success" : "warning"}
                          sx={{ mt: 2 }}
                        >
                          <AlertTitle>Policy Implications</AlertTitle>
                          {analysisMetrics.integrationScore > 0.7 ? (
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
                    title={`${currentCommodity} Distribution`}
                    colorScale={getColorScales(visualizationState.mode, geoData).getColor}
                    unit="YER" // Assuming YER as currency
                    description="Spatial distribution of values"
                    position="bottomright"
                    statistics={{
                      'Integration Score': analysisMetrics?.integrationScore,
                      'Transmission Efficiency': analysisMetrics?.transmissionEfficiency,
                      'Price Convergence': analysisMetrics?.priceConvergence
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
