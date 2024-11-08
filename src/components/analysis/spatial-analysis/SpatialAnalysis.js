// src/components/analysis/spatial-analysis/SpatialAnalysis.js

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import PropTypes from 'prop-types';
import { useDispatch, useSelector } from 'react-redux';
import { 
  fetchSpatialData, 
  selectSpatialData,
  setSelectedRegion 
} from '../../../slices/spatialSlice';
import { Box, Grid, Alert, AlertTitle, Paper, Typography, Chip, Tabs, Tab, Button, Tooltip, IconButton } from '@mui/material';
import { Timeline, TrendingUp, Warning, GroupWork, CompareArrows, Download } from '@mui/icons-material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip } from 'recharts';
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

// Constants for Visualization Modes
const VISUALIZATION_MODES = {
  PRICES: 'prices',
  MARKET_INTEGRATION: 'integration',
  CLUSTERS: 'clusters',
  SHOCKS: 'shocks'
};

// Helper function to format month strings
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
  const [selectedRegion, setSelectedRegion] = useState(null);
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [dateError, setDateError] = useState(null);
  const [analysisTab, setAnalysisTab] = useState(0);
  const [detectedShocks, setDetectedShocks] = useState([]);

  // Initialize date on component mount or when uniqueMonths changes
  useEffect(() => {
    if (uniqueMonths?.length) {
      if (!selectedDate) {
        // Select most recent date if none selected
        const sortedMonths = [...uniqueMonths].sort((a, b) => new Date(b) - new Date(a));
        setSelectedDate(sortedMonths[0]);
      } else if (!uniqueMonths.includes(selectedDate)) {
        // Reset to most recent date if current selection is invalid
        const sortedMonths = [...uniqueMonths].sort((a, b) => new Date(b) - new Date(a));
        setSelectedDate(sortedMonths[0]);
        setDateError('Selected date not available. Defaulting to most recent.');
      } else {
        setDateError(null);
      }
    }
  }, [uniqueMonths, selectedDate]);

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

  // Handle Commodity Change
  const handleCommodityChange = useCallback((commodity) => {
    dispatch(fetchSpatialData({ selectedCommodity: commodity, selectedDate }));
  }, [dispatch, selectedDate]);

  // Handle Date Change
  const handleDateChange = useCallback((date) => {
    if (!uniqueMonths?.includes(date)) {
      setDateError('Selected date is not available in the dataset');
      return;
    }
    setSelectedDate(date);
    setDateError(null);
    dispatch(fetchSpatialData({ selectedCommodity, selectedDate: date }));
  }, [dispatch, selectedCommodity, uniqueMonths]);

  // Handle Refresh
  const handleRefresh = useCallback(() => {
    dispatch(fetchSpatialData({ selectedCommodity, selectedDate }));
  }, [dispatch, selectedCommodity, selectedDate]);

  // Handle Region Selection
  const handleRegionSelect = useCallback((region) => {
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
      const dateStr = feature.properties.date || feature.properties.Date || '';
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
      const price = parseFloat(feature.properties.usdprice) || parseFloat(feature.properties.price) || 0;
      acc[month].totalPrice += price;
      acc[month].count += 1;
      acc[month].prices.push(price);
      return acc;
    }, {});

    // Calculate averages and volatility (standard deviation)
    return Object.values(monthlyData).map(data => {
      const avgPrice = data.totalPrice / data.count;
      const priceVariance = data.prices.reduce((acc, price) => acc + Math.pow(price - avgPrice, 2), 0) / data.count;
      const volatility = Math.sqrt(priceVariance);

      return {
        month: data.month,
        avgPrice,
        volatility,
        count: data.count,
      };
    }).sort((a, b) => new Date(a.month) - new Date(b.month));
  }, [geoData]);

  const marketComparison = useMemo(() => {
    if (!analysis || !flows || !marketClusters.length) return null;

    const baselineIntegration = 1.0; // Adjust based on your analysis
    const baselineTransmission = 1.0; // Adjust based on your analysis

    return {
      integrationEfficiency: (analysis?.r_squared || 0) / baselineIntegration,
      transmissionEfficiency: (analysis?.coefficients?.spatial_lag_price || 0) / baselineTransmission,
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
    a.download = `market-analysis-${selectedCommodity}-${selectedDate || 'latest'}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [selectedCommodity, selectedDate, timeSeriesData, detectedShocks, marketClusters, marketComparison, analysis]);

  // Memoized color scales based on visualization mode
  const colorScales = useMemo(() => {
    if (!geoData) return {};

    const scales = {};

    if (visualizationMode === VISUALIZATION_MODES.PRICES) {
      const prices = geoData.features
        .map(feature => parseFloat(feature.properties.price))
        .filter(price => !isNaN(price));

      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);

      scales.getColor = feature => {
        const price = parseFloat(feature.properties.price);
        if (isNaN(price)) return '#ccc';
        const ratio = (price - minPrice) / (maxPrice - minPrice || 1);
        const red = Math.floor(255 * (1 - ratio));
        const green = Math.floor(255 * ratio);
        const blue = 0;
        return `rgb(${red},${green},${blue})`;
      };
    } else if (visualizationMode === VISUALIZATION_MODES.MARKET_INTEGRATION) {
      const residuals = geoData.features
        .map(feature => parseFloat(feature.properties.residual))
        .filter(residual => !isNaN(residual));

      const minResidual = Math.min(...residuals);
      const maxResidual = Math.max(...residuals);

      scales.getColor = feature => {
        const residual = parseFloat(feature.properties.residual);
        if (isNaN(residual)) return '#ccc';
        const ratio = (residual - minResidual) / (maxResidual - minResidual || 1);
        const red = Math.floor(255 * ratio);
        const green = 0;
        const blue = Math.floor(255 * (1 - ratio));
        return `rgb(${red},${green},${blue})`;
      };
    } else if (visualizationMode === VISUALIZATION_MODES.CLUSTERS) {
      const clusterColors = [
        '#e41a1c', '#377eb8', '#4daf4a', '#984ea3', '#ff7f00',
        '#ffff33', '#a65628', '#f781bf', '#999999'
      ];
      const clusterMap = new Map();
      marketClusters.forEach((cluster, index) => {
        cluster.connectedMarkets.forEach(market => {
          clusterMap.set(market, clusterColors[index % clusterColors.length]);
        });
      });

      scales.getColor = feature => {
        const region = feature.properties.region_id || feature.properties.region;
        return clusterMap.get(region) || '#ccc';
      };
    } else if (visualizationMode === VISUALIZATION_MODES.SHOCKS) {
      const shockedRegions = new Set(detectedShocks.map(shock => shock.region));

      scales.getColor = feature => {
        const region = feature.properties.region_id || feature.properties.region;
        return shockedRegions.has(region) ? 'red' : '#ccc';
      };
    }

    return scales;
  }, [geoData, marketClusters, detectedShocks, visualizationMode]);

  // Render Analysis Panels based on selected tab
  const renderAnalysisPanel = useCallback(() => {
    if (!analysis) return null;

    switch (analysisTab) {
      case 0: // Time Series
        return (
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>Time Series Analysis</Typography>
            {timeSeriesData.length > 0 ? (
              <LineChart width={800} height={300} data={timeSeriesData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tickFormatter={formatMonth} />
                <YAxis />
                <ChartTooltip labelFormatter={formatMonth} />
                <Line type="monotone" dataKey="avgPrice" stroke="#8884d8" name="Average Price (YER)" />
                <Line type="monotone" dataKey="volatility" stroke="#82ca9d" name="Volatility" />
              </LineChart>
            ) : (
              <Typography variant="body2">No time series data available.</Typography>
            )}
          </Paper>
        );
      case 1: // Market Shocks
        return (
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>Market Shocks</Typography>
            {detectedShocks.length > 0 ? (
              detectedShocks.map((shock, index) => (
                <Alert 
                  key={index}
                  severity={shock.severity === 'high' ? 'error' : 'warning'}
                  sx={{ mb: 1 }}
                >
                  {shock.type === 'price_surge' ? 'Price Surge' : 'Price Drop'} detected in {formatMonth(shock.month)}
                  (Magnitude: {(shock.magnitude * 100).toFixed(1)}%)
                </Alert>
              ))
            ) : (
              <Typography variant="body2">No significant market shocks detected.</Typography>
            )}
          </Paper>
        );
      case 2: // Market Clusters
        return (
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>Market Clusters</Typography>
            {marketClusters.length > 0 ? (
              marketClusters.map((cluster, index) => (
                <Paper key={index} sx={{ p: 1, mb: 1 }}>
                  <Typography variant="subtitle1">
                    Cluster {index + 1}: {cluster.mainMarket}
                  </Typography>
                  <Typography variant="body2">
                    Connected Markets: {Array.from(cluster.connectedMarkets).join(', ')}
                  </Typography>
                </Paper>
              ))
            ) : (
              <Typography variant="body2">No market clusters identified.</Typography>
            )}
          </Paper>
        );
      case 3: // Market Comparison
        return marketComparison ? (
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>Market Integration Comparison</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={3}>
                <Typography variant="subtitle2" gutterBottom>
                  Integration Efficiency
                </Typography>
                <Chip 
                  label={`${(marketComparison.integrationEfficiency * 100).toFixed(1)}%`}
                  color={marketComparison.integrationEfficiency > 0.7 ? "success" : "warning"}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <Typography variant="subtitle2" gutterBottom>
                  Transmission Efficiency
                </Typography>
                <Chip 
                  label={`${(marketComparison.transmissionEfficiency * 100).toFixed(1)}%`}
                  color={marketComparison.transmissionEfficiency > 0.7 ? "success" : "warning"}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <Typography variant="subtitle2" gutterBottom>
                  Market Coverage
                </Typography>
                <Chip 
                  label={`${(marketComparison.marketCoverage * 100).toFixed(1)}%`}
                  color={marketComparison.marketCoverage > 0.6 ? "success" : "warning"}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <Typography variant="subtitle2" gutterBottom>
                  Price Convergence
                </Typography>
                <Chip 
                  label={marketComparison.priceConvergence > 0 ? "Converging" : "Diverging"}
                  color={marketComparison.priceConvergence > 0 ? "success" : "error"}
                />
              </Grid>
            </Grid>
          </Paper>
        ) : null;
      default:
        return null;
    }
  }, [analysis, analysisTab, timeSeriesData, detectedShocks, marketClusters, marketComparison]);

  // Render Economic Insights Panel
  const renderEconomicInsights = useCallback(() => {
    if (!analysis || !marketComparison) return null;

    const moranI = analysis?.moran_i?.I ?? null;
    const rSquared = analysis?.r_squared ?? null;
    const spatialLagPrice = analysis?.coefficients?.spatial_lag_price ?? null;

    return (
      <Grid item xs={12}>
        <Paper sx={{ p: 2, mt: 2 }}>
          <Typography variant="h6" gutterBottom>
            Economic Insights
          </Typography>
          <Grid container spacing={2}>
            {/* Market Efficiency Metrics */}
            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 2, bgcolor: 'background.default' }}>
                <Typography variant="subtitle1" gutterBottom>
                  Market Efficiency
                </Typography>
                <Grid container spacing={1}>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="textSecondary">
                      Price Discovery:
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Chip
                      size="small"
                      label={rSquared !== null ? `${(rSquared * 100).toFixed(1)}%` : 'N/A'}
                      color={rSquared > 0.5 ? "success" : "warning"}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="textSecondary">
                      Transmission Speed:
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Chip
                      size="small"
                      label={spatialLagPrice !== null ? `${(spatialLagPrice * 100).toFixed(1)}%` : 'N/A'}
                      color={spatialLagPrice > 0.7 ? "success" : "warning"}
                    />
                  </Grid>
                </Grid>
              </Paper>
            </Grid>

            {/* Market Integration Status */}
            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 2, bgcolor: 'background.default' }}>
                <Typography variant="subtitle1" gutterBottom>
                  Integration Status
                </Typography>
                <Grid container spacing={1}>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="textSecondary">
                      Spatial Correlation:
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Chip
                      size="small"
                      label={moranI !== null ? `${(moranI * 100).toFixed(1)}%` : 'N/A'}
                      color={moranI > 0 ? "success" : "error"}
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

            {/* Market Volatility Analysis */}
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

            {/* Policy Recommendations */}
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
        </Paper>
      </Grid>
    );
  }, [analysis, marketComparison, detectedShocks, marketClusters]);

  // Memoized render for analysis panels and economic insights
  const renderPanels = useMemo(() => (
    <>
      {renderAnalysisPanel()}
      {renderEconomicInsights()}
    </>
  ), [renderAnalysisPanel, renderEconomicInsights]);

  // Loading state
  if (status === 'loading' || status === 'idle') {
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
        error={error || 'Failed to load spatial analysis data'}
        title="Analysis Error"
      />
    );
  }

  // Ensure selectedDate is valid
  const isSelectedDateValid = useMemo(() => {
    return uniqueMonths && uniqueMonths.includes(selectedDate);
  }, [uniqueMonths, selectedDate]);

  if (!uniqueMonths || uniqueMonths.length === 0) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: 400
        }}
      >
        <Typography variant="h6">No available data to display.</Typography>
      </Box>
    );
  }

  if (!isSelectedDateValid) {
    return (
      <Alert severity="warning" sx={{ mt: 2 }}>
        <AlertTitle>Invalid Selected Date</AlertTitle>
        The selected date is not available. Please select a different date.
      </Alert>
    );
  }

  return (
    <Box sx={{ width: '100%' }}>
      <ErrorBoundary fallback={<ErrorDisplay error="An unknown error occurred" />}>
        <Grid container spacing={2}>
          {/* Date Error Alert */}
          {dateError && (
            <Grid item xs={12}>
              <Alert severity="warning">
                <AlertTitle>Date Selection Issue</AlertTitle>
                {dateError}
              </Alert>
            </Grid>
          )}

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

          {/* Map Controls */}
          <Grid item xs={12}>
            <MapControls
              selectedCommodity={selectedCommodity}
              selectedDate={selectedDate}
              uniqueMonths={uniqueMonths}
              commodities={commodities}
              analysisResults={analysis}
              onCommodityChange={handleCommodityChange}
              onDateChange={handleDateChange}
              onRefresh={handleRefresh}
            />
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
                onToggleFlows={() => setShowFlows(prev => !prev)}
                analysisResults={analysis}
                selectedCommodity={selectedCommodity}
                marketClusters={marketClusters}
                detectedShocks={detectedShocks}
                visualizationMode={visualizationMode}
                colorScales={colorScales}
                onRegionSelect={setSelectedRegion}
              />
            </Box>
          </Grid>

          {/* Analysis Tabs */}
          <Grid item xs={12}>
            <Tabs value={analysisTab} onChange={handleTabChange}>
              <Tab icon={<Timeline />} label="Time Series" />
              <Tab icon={<TrendingUp />} label="Market Shocks" />
              <Tab icon={<GroupWork />} label="Market Clusters" />
              <Tab icon={<CompareArrows />} label="Comparison" />
            </Tabs>
          </Grid>

          {/* Render Analysis and Insights Panels */}
          <Grid item xs={12}>
            {renderPanels}
          </Grid>

          {/* Map Legend */}
          {colorScales && (
            <MapLegend
              title={`${selectedCommodity} Distribution`}
              colorScale={colorScales.getColor}
              unit={analysis?.units || ''}
              description="Spatial distribution of values"
              position="bottomright"
              statistics={{
                'Spatial Effect': analysis?.coefficients?.spatial_lag_price,
                'Integration': analysis?.r_squared,
                'Correlation': analysis?.moran_i?.I
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
      </ErrorBoundary>
    </Box>
  );
};

// PropTypes for type checking
SpatialAnalysis.propTypes = {
  selectedCommodity: PropTypes.string.isRequired,
  selectedDate: PropTypes.string,
};

export default React.memo(SpatialAnalysis);