import React, { useEffect, useState, useMemo, useCallback } from 'react';
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
  ResponsiveContainer
} from 'recharts';
import {
  fetchSpatialData,
  setSelectedRegion,
  setSelectedCommodity,
  setSelectedDate,
  selectTimeSeriesData,
  selectAnalysisMetrics,
} from '../../../slices/spatialSlice';

import MapControls from './MapControls';
import SpatialMap from './SpatialMap';
import TimeControls from './TimeControls';
import MapLegend from './MapLegend';
import LoadingSpinner from '../../common/LoadingSpinner';
import ErrorDisplay from '../../common/ErrorDisplay';
import SpatialErrorBoundary from './SpatialErrorBoundary';

import {
  VISUALIZATION_MODES,
  COLOR_SCALES,
  ANALYSIS_THRESHOLDS,
} from '../../../constants';
import { processTimeSeriesData, getColorScales } from '../../../utils/spatialUtils';

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

  const {
    loading,
    error,
    isInitialized
  } = useSelector(state => state.spatial.status);

  const {
    geoData,
    flowMaps,
    marketClusters: marketClustersData,
    detectedShocks: detectedShocksData,
    timeSeriesData,
    analysisResults,
    analysisMetrics
  } = useSelector(state => state.spatial.data);

  const { selectedCommodity, selectedDate } = useSelector(
    state => state.spatial.ui,
    shallowEqual
  );

  const isDataValid = useCallback(() => {
    return Boolean(
      geoData?.features?.length &&
      selectedCommodity &&
      selectedDate &&
      isInitialized
    );
  }, [geoData, selectedCommodity, selectedDate, isInitialized]);

  const showLoading = loading || !isInitialized;

  const handleCommodityChange = useCallback(async (commodity) => {
    try {
      await dispatch(setSelectedCommodity(commodity));
      await dispatch(fetchSpatialData({ selectedCommodity: commodity, selectedDate }));
    } catch (error) {
      console.error('Error changing commodity:', error);
    }
  }, [dispatch, selectedDate]);

  const handleDateChange = useCallback(async (date) => {
    try {
      await dispatch(setSelectedDate(date));
      await dispatch(fetchSpatialData({ selectedCommodity, selectedDate: date }));
    } catch (error) {
      console.error('Error changing date:', error);
    }
  }, [dispatch, selectedCommodity]);

  const handleVisualizationUpdate = useCallback((updates) => {
    setVisualizationState(prevState => ({
      ...prevState,
      ...updates,
    }));
  }, []);

  const handleRegionSelect = useCallback((region) => {
    handleVisualizationUpdate({ selectedRegion: region });
    dispatch(setSelectedRegion(region));
  }, [dispatch, handleVisualizationUpdate]);

  const exportAnalysis = useCallback(() => {
    if (!geoData) return;

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
    selectedCommodity,
    selectedDate,
    timeSeriesData,
    detectedShocksData,
    marketClustersData,
    analysisMetrics,
    analysisResults,
    geoData
  ]);

  const mapControlsProps = useMemo(() => ({
    selectedCommodity,
    selectedDate,
    uniqueMonths: timeSeriesData?.map(d => d.month) || [],
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

  if (showLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <LoadingSpinner />
      </Box>
    );
  }

  if (error) {
    return (
      <ErrorDisplay
        error={error}
        title="Analysis Error"
        onRetry={() => dispatch(fetchSpatialData({ selectedCommodity, selectedDate }))}
      />
    );
  }

  if (!isDataValid()) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <Typography>Please select a commodity and date to view analysis</Typography>
      </Box>
    );
  }

  // Render Error State
  if (error) {
    return (
      <ErrorDisplay
        error={error}
        title="Analysis Error"
        onRetry={() => dispatch(fetchSpatialData({ selectedCommodity, selectedDate }))}
      />
    );
  }

  // Main render
  return (
    <SpatialErrorBoundary
      onRetry={() => dispatch(fetchSpatialData({ selectedCommodity, selectedDate }))}
    >
      <Box sx={{ width: '100%' }}>
        <Grid container spacing={2}>
          {/* Header Section */}
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

          {/* Warning Alert */}
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
            <MapControls {...mapControlsProps} />
          </Grid>

          {/* Map Component */}
          <Grid item xs={12}>
            <Box sx={{ height: 500, position: 'relative' }}>
              <SpatialMap {...mapProps} />
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

          {/* Tab Panels Container */}
          <Grid item xs={12}>
          {/* Time Series Analysis Panel */}
          {visualizationState.analysisTab === 0 && (
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Time Series Analysis
                </Typography>
                {timeSeriesData?.length > 0 ? (
                  <Box sx={{ height: 300, width: '100%' }}>
                    <ResponsiveContainer>
                      <LineChart
                        data={processTimeSeriesData(timeSeriesData)}
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="month" 
                          tickFormatter={formatMonth}
                          height={40}
                          tick={{ angle: -45, textAnchor: 'end' }}
                        />
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
                          strokeWidth={2}
                        />
                        <Line
                          type="monotone"
                          dataKey="volatility"
                          stroke="#82ca9d"
                          name="Volatility"
                          dot={false}
                          activeDot={{ r: 8 }}
                          strokeWidth={2}
                        />
                      </LineChart>
                    </ResponsiveContainer>
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
                      <Grid item xs={12} md={6} key={index}>
                        <Alert
                          severity={shock.magnitude > ANALYSIS_THRESHOLDS.PRICE_SHOCK.SEVERE ? 'error' : 
                                  shock.magnitude > ANALYSIS_THRESHOLDS.PRICE_SHOCK.MODERATE ? 'warning' : 'info'}
                          sx={{ mb: 1 }}
                        >
                          <AlertTitle>
                            {shock.type === 'price_surge' ? 'Price Surge' : 'Price Drop'} - {shock.region}
                          </AlertTitle>
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                            <Typography variant="body2">
                              Date: {formatMonth(shock.date)}
                            </Typography>
                            <Typography variant="body2">
                              Magnitude: {shock.magnitude.toFixed(1)}%
                            </Typography>
                            <Typography variant="body2">
                              Previous Price: ${shock.previous_price.toFixed(2)}
                            </Typography>
                            <Typography variant="body2">
                              Current Price: ${shock.current_price.toFixed(2)}
                            </Typography>
                          </Box>
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
                          elevation={3}
                          sx={{
                            p: 2,
                            backgroundColor: `${COLOR_SCALES.CLUSTERS[index % COLOR_SCALES.CLUSTERS.length]}20`,
                            borderRadius: 2,
                          }}
                        >
                          <Typography variant="subtitle1" gutterBottom>
                            Cluster {cluster.cluster_id}: {cluster.main_market}
                          </Typography>
                          <Box sx={{ mb: 2 }}>
                            <Typography variant="body2" color="text.secondary">
                              Connected Markets: {cluster.connected_markets.length}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Market Coverage: {
                                ((cluster.connected_markets.length / 
                                  (analysisMetrics?.totalMarkets || 1)) * 100).toFixed(1)
                              }%
                            </Typography>
                          </Box>
                          <Box sx={{ 
                            display: 'flex', 
                            flexWrap: 'wrap', 
                            gap: 1, 
                            mb: 2 
                          }}>
                            {cluster.connected_markets.map((market) => (
                              <Chip
                                key={market}
                                label={market}
                                size="small"
                                onClick={() => handleRegionSelect(market)}
                                sx={{
                                  backgroundColor: COLOR_SCALES.CLUSTERS[index % COLOR_SCALES.CLUSTERS.length],
                                  color: 'white'
                                }}
                              />
                            ))}
                          </Box>
                          <Box sx={{ mt: 2 }}>
                            <Typography variant="caption" display="block">
                              Average Flow: {cluster.avgFlow?.toFixed(2) || 'N/A'}
                            </Typography>
                            <Typography variant="caption" display="block">
                              Integration Level: {
                                ((cluster.connected_markets.length / 
                                  cluster.market_count) * 100).toFixed(1)
                              }%
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
                      <Paper 
                        elevation={3}
                        sx={{ 
                          p: 2,
                          backgroundColor: theme => 
                            theme.palette.mode === 'dark' ? 'rgba(0, 30, 60, 0.8)' : 'rgba(232, 244, 253, 0.8)'
                        }}
                      >
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
                      <Paper 
                        elevation={3}
                        sx={{ 
                          p: 2,
                          backgroundColor: theme => 
                            theme.palette.mode === 'dark' ? 'rgba(0, 30, 60, 0.8)' : 'rgba(232, 244, 253, 0.8)'
                        }}
                      >
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
                      <Paper 
                        elevation={3}
                        sx={{ 
                          p: 2,
                          backgroundColor: theme => 
                            theme.palette.mode === 'dark' ? 'rgba(0, 30, 60, 0.8)' : 'rgba(232, 244, 253, 0.8)'
                        }}
                      >
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
            </Grid>
          )}
        </Grid>
      </Box>
    </SpatialErrorBoundary>
  );
};

export default React.memo(SpatialAnalysis);