// src/components/analysis/spatial-analysis/SpatialAnalysis.js

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import PropTypes from 'prop-types';
import { 
  Box, 
  Grid2 as Grid, 
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
  selectCurrentAnalysis,
  selectSpatialMetrics,
  setSelectedRegion 
} from '../../../slices/spatialSlice';
import { backgroundMonitor } from '../../../utils/backgroundMonitor';
import MapControls from './MapControls';
import MapLegend from './MapLegend';
import TimeControls from './TimeControls';
import LoadingSpinner from '../../common/LoadingSpinner';
import ErrorDisplay from '../../common/ErrorDisplay';
import SpatialMap from './SpatialMap';
import SpatialDiagnostics from './SpatialDiagnostics';
import DynamicInterpretation from './DynamicInterpretation';
import ErrorBoundary from './SpatialErrorBoundary';
import { memoizedComputeClusters, detectMarketShocks } from '../../../utils/spatialUtils';
import { VISUALIZATION_MODES, COLOR_SCALES, ANALYSIS_THRESHOLDS } from '../../../constants/spatialConstants';

// Format month strings for charts
const formatMonth = (monthStr) => {
  const date = new Date(monthStr);
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
};

const SpatialAnalysis = ({ selectedCommodity, selectedDate: initialDate = '' }) => {
  const dispatch = useDispatch();
  const {
    geoData,
    analysis,
    flows,
    weights,
    uniqueMonths,
    commodities,
    status,
    error,
    loadingProgress
  } = useSelector(selectSpatialData);

  // Local state management
  const [visualizationMode, setVisualizationMode] = useState(VISUALIZATION_MODES.PRICES);
  const [showFlows, setShowFlows] = useState(true);
  const [selectedRegion, setSelectedRegionLocal] = useState(null);
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [dateError, setDateError] = useState(null);
  const [analysisTab, setAnalysisTab] = useState(0);
  const [detectedShocks, setDetectedShocks] = useState([]);

  // Get additional analysis data from Redux
  const currentAnalysis = useSelector(state => selectCurrentAnalysis(state, selectedCommodity));
  const spatialMetrics = useSelector(state => 
    selectSpatialMetrics(state, selectedCommodity, selectedDate)
  );

  // Initialize date on component mount or when uniqueMonths changes
  useEffect(() => {
    if (uniqueMonths?.length) {
      if (!selectedDate) {
        const sortedMonths = [...uniqueMonths].sort((a, b) => new Date(b) - new Date(a));
        setSelectedDate(sortedMonths[0]);
      } else if (!uniqueMonths.includes(selectedDate)) {
        const sortedMonths = [...uniqueMonths].sort((a, b) => new Date(b) - new Date(a));
        setSelectedDate(sortedMonths[0]);
        setDateError('Selected date not available. Defaulting to most recent.');
      } else {
        setDateError(null);
      }
    }
  }, [uniqueMonths, selectedDate]);

  // Initialize monitoring
  useEffect(() => {
    const metric = backgroundMonitor.startMetric('spatial-analysis-load', {
      commodity: selectedCommodity,
      date: selectedDate
    });
    return () => metric.finish();
  }, [selectedCommodity, selectedDate]);

  // Fetch data when commodity or date changes
  useEffect(() => {
    if (selectedCommodity && selectedDate) {
      dispatch(fetchSpatialData({ selectedCommodity, selectedDate }));
    }
  }, [selectedCommodity, selectedDate, dispatch]);

  // Handle Tab Change
  const handleTabChange = (event, newValue) => {
    setAnalysisTab(newValue);
  };

  // Handle Region Selection
  const handleRegionSelect = useCallback((region) => {
    setSelectedRegionLocal(region);
    dispatch(setSelectedRegion(region));
  }, [dispatch]);

  // Handle Month Change
  const handleMonthChange = useCallback((newMonth) => {
    if (selectedCommodity && uniqueMonths?.includes(newMonth)) {
      setSelectedDate(newMonth);
      dispatch(fetchSpatialData({ 
        selectedCommodity, 
        selectedDate: newMonth 
      }));
    }
  }, [selectedCommodity, dispatch, uniqueMonths]);

  // Add missing handler for commodity change
  const handleCommodityChange = useCallback((commodity) => {
    dispatch(fetchSpatialData({ selectedCommodity: commodity, selectedDate }));
  }, [dispatch, selectedDate]);

  // Add refresh handler
  const handleRefresh = useCallback(() => {
    dispatch(fetchSpatialData({ selectedCommodity, selectedDate }));
  }, [dispatch, selectedCommodity, selectedDate]);

  // Memoized computations
  const marketClusters = useMemo(() => {
    if (!flows || !weights) return [];
    return memoizedComputeClusters(flows, weights);
  }, [flows, weights]);

  const detectedShocksMemo = useMemo(() => {
    if (!geoData?.features) return [];
    return detectMarketShocks(geoData.features, selectedDate);
  }, [geoData?.features, selectedDate]);

  useEffect(() => {
    setDetectedShocks(detectedShocksMemo);
  }, [detectedShocksMemo]);

  const timeSeriesData = useMemo(() => {
    if (!geoData?.features) return [];
    
    // Aggregate data by month
    const monthlyData = geoData.features.reduce((acc, feature) => {
      const dateStr = feature.properties.date;
      const month = dateStr.slice(0, 7);
      if (!month) return acc;

      if (!acc[month]) {
        acc[month] = {
          month,
          totalPrice: 0,
          count: 0,
          prices: [],
        };
      }
      const price = parseFloat(feature.properties.price) || 0;
      acc[month].totalPrice += price;
      acc[month].count += 1;
      acc[month].prices.push(price);
      return acc;
    }, {});

    // Calculate averages and volatility
    return Object.values(monthlyData)
      .map(data => {
        const avgPrice = data.totalPrice / data.count;
        const priceVariance = data.prices.reduce((acc, price) => 
          acc + Math.pow(price - avgPrice, 2), 0) / data.count;
        
        return {
          month: data.month,
          avgPrice,
          volatility: Math.sqrt(priceVariance),
          count: data.count,
        };
      })
      .sort((a, b) => new Date(a.month) - new Date(b.month));
  }, [geoData]);

  const marketComparison = useMemo(() => {
    if (!analysis || !flows || !marketClusters.length) return null;

    return {
      integrationEfficiency: (analysis?.r_squared || 0),
      transmissionEfficiency: (analysis?.coefficients?.spatial_lag_price || 0),
      marketCoverage: marketClusters.length / (Object.keys(weights || {}).length || 1),
      priceConvergence: analysis?.moran_i?.I ?? null,
    };
  }, [analysis, flows, marketClusters, weights]);

  // Export Analysis Data
  const exportAnalysis = useCallback(() => {
    const exportData = {
      commodity: selectedCommodity,
      date: selectedDate,
      timeSeriesAnalysis: timeSeriesData,
      marketShocks: detectedShocks,
      marketClusters: marketClusters.map(cluster => ({
        mainMarket: cluster.mainMarket,
        connectedMarkets: Array.from(cluster.connectedMarkets),
        marketCount: cluster.marketCount,
      })),
      comparison: marketComparison,
      spatialAnalysis: analysis,
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
  }, [selectedCommodity, selectedDate, timeSeriesData, detectedShocks, marketClusters, marketComparison, analysis]);

  // Fix the analysis results type by selecting the correct data
  const currentAnalysisResults = useMemo(() => {
    if (!analysis?.length) return null;
    return analysis.find(a => 
      a.commodity === selectedCommodity && 
      a.regime === 'unified'
    ) || null;
  }, [analysis, selectedCommodity]);

  // Fix color scales to handle missing properties
  const colorScales = useMemo(() => {
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

      // ... other visualization modes ...
    }

    return scales;
  }, [geoData, visualizationMode, marketClusters, detectedShocks]);

  // Update MapControls props
  const mapControlsProps = useMemo(() => ({
    selectedCommodity,
    selectedDate,
    uniqueMonths,
    commodities,
    analysisResults: currentAnalysisResults,
    onDateChange: handleMonthChange,
    onCommodityChange: handleCommodityChange,
    onRefresh: handleRefresh,
    visualizationMode,
    onVisualizationModeChange: setVisualizationMode,
    showFlows,
    onToggleFlows: () => setShowFlows(prev => !prev)
  }), [
    selectedCommodity,
    selectedDate,
    uniqueMonths,
    commodities,
    currentAnalysisResults,
    handleMonthChange,
    handleCommodityChange,
    handleRefresh,
    visualizationMode,
    showFlows
  ]);

  // Fix MapLegend null check
  const shouldShowLegend = useMemo(() => 
    colorScales?.getColor && geoData?.features?.length > 0, 
    [colorScales, geoData]
  );

  // Loading state
  if (status === 'loading') {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <LoadingSpinner progress={loadingProgress} />
      </Box>
    );
  }

  // Error state
  if (status === 'failed') {
    return (
      <ErrorDisplay
        error={error}
        title="Analysis Error"
        onRetry={() => dispatch(fetchSpatialData({ selectedCommodity, selectedDate }))}
      />
    );
  }

  return (
    <ErrorBoundary>
      <Box sx={{ width: '100%' }}>
        <Grid container spacing={2} />
          {/* Title and Export Button */}
          <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h5">
              Market Integration Analysis: {selectedCommodity}
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

          {/* Updated MapControls */}
          <Grid item xs={12}>
            <MapControls {...mapControlsProps} />
          </Grid>

          {/* Map Component */}
          <Grid item xs={12}>
            <Box sx={{ height: 500, position: 'relative' }}>
              <SpatialMap
                geoData={geoData}
                flowMaps={flows}
                selectedMonth={selectedDate}
                onMonthChange={handleMonthChange}
                availableMonths={uniqueMonths}
                spatialWeights={weights}
                showFlows={showFlows}
                analysisResults={analysis}
                selectedCommodity={selectedCommodity}
                marketClusters={marketClusters}
                detectedShocks={detectedShocks}
                visualizationMode={visualizationMode}
                colorScales={colorScales}
                onRegionSelect={handleRegionSelect}
              />
            </Box>
          </Grid>

          {/* Analysis Tabs */}
          <Grid item xs={12}>
            <Tabs value={analysisTab} onChange={handleTabChange}>
              <Tab icon={<Timeline />} label="Time Series" />
              <Tab icon={<TrendingUp />} label="Market Shocks" />
              <Tab icon={<GroupWork />} label="Market Clusters" />
              <Tab icon={<CompareArrows />} label="Market Integration" />
            </Tabs>
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

          {/* Updated MapLegend */}
          {shouldShowLegend && (
            <MapLegend
              title={`${selectedCommodity} Distribution`}
              colorScale={colorScales.getColor}
              unit={currentAnalysisResults?.units || ''}
              description="Spatial distribution of values"
              position="bottomright"
              statistics={{
                'Spatial Effect': currentAnalysisResults?.coefficients?.spatial_lag_price,
                'Integration': currentAnalysisResults?.r_squared,
                'Correlation': currentAnalysisResults?.moran_i?.I
              }}
            />
          )}

          {/* Time Controls */}
          <Grid item xs={12}>
            <TimeControls
              availableMonths={uniqueMonths}
              selectedMonth={selectedDate}
              onMonthChange={handleMonthChange}
              analysisResults={analysis}
              spatialWeights={weights}
            />
          </Grid>
        </Grid>
      </Box>
    </ErrorBoundary>
  );
};

SpatialAnalysis.propTypes = {
  selectedCommodity: PropTypes.string.isRequired,
  selectedDate: PropTypes.string
};

export default React.memo(SpatialAnalysis);