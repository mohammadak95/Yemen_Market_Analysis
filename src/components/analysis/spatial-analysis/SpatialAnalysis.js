// src/components/analysis/spatial-analysis/SpatialAnalysis.js

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import PropTypes from 'prop-types';
import { useDispatch, useSelector } from 'react-redux';
import { 
  fetchSpatialData, 
  selectSpatialData 
} from '../../../slices/spatialSlice';
import LoadingSpinner from '../../common/LoadingSpinner';
import { 
  Box, 
  Alert, 
  AlertTitle, 
  Paper, 
  Typography,
  Grid,
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
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ChartTooltip,
  ResponsiveContainer
} from 'recharts';
import SpatialMap from './SpatialMap';
import SpatialDiagnostics from './SpatialDiagnostics';
import DynamicInterpretation from './DynamicInterpretation';

// Helper function to format month strings
const formatMonth = (monthStr) => {
  const date = new Date(monthStr);
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
};

const SpatialAnalysis = ({ selectedCommodity, selectedDate = '' }) => {
  const dispatch = useDispatch();

  // Ensure selectedCommodity is a string and convert to lowercase
  if (typeof selectedCommodity !== 'string' || !selectedCommodity.trim()) {
    console.warn('Invalid selectedCommodity in SpatialAnalysis:', {
      value: selectedCommodity,
      type: typeof selectedCommodity
    });
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: 400
        }}
      >
        <Alert severity="error">
          <AlertTitle>Error Loading Data</AlertTitle>
          Please select a valid commodity from the sidebar.
        </Alert>
      </Box>
    );
  } else {
    selectedCommodity = selectedCommodity.toLowerCase();
  }

  // Ensure selectedCommodity is defined
  if (!selectedCommodity) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: 400
        }}
      >
        <Alert severity="warning" sx={{ mt: 2 }}>
          <AlertTitle>No Commodity Selected</AlertTitle>
          Please select a commodity to view the analysis.
        </Alert>
      </Box>
    );
  }

  // Destructure spatial data from Redux store
  const {
    geoData = null,
    analysis = null,
    flows = [],
    weights = {},
    uniqueMonths = [],
    status = 'idle',
    error = null,
    loadingProgress = 0,
  } = useSelector(selectSpatialData) || {};

  const [selectedMonth, setSelectedMonth] = useState(selectedDate || '');
  const [showFlows, setShowFlows] = useState(true);
  const [selectedRegion, setSelectedRegion] = useState(null);
  const [analysisTab, setAnalysisTab] = useState(0);
  const [detectedShocks, setDetectedShocks] = useState([]);

  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setAnalysisTab(newValue);
  };

  // Handle month change
  const handleMonthChange = (newMonth) => {
    setSelectedMonth(newMonth);
  };

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

  const detectMarketShocks = useCallback(() => {
    if (!timeSeriesData.length) return [];

    const shocks = [];
    const volatilityThreshold = 5; // Adjust based on actual volatility calculation
    const priceChangeThreshold = 0.15; // 15% change

    timeSeriesData.forEach((data, index) => {
      if (index === 0) return;

      const prevPrice = timeSeriesData[index - 1].avgPrice;
      const priceChange = (data.avgPrice - prevPrice) / prevPrice;

      if (Math.abs(priceChange) > priceChangeThreshold || data.volatility > volatilityThreshold) {
        shocks.push({
          month: data.month,
          region: data.region || 'Unknown',
          magnitude: Math.abs(priceChange),
          type: priceChange > 0 ? 'price_surge' : 'price_drop',
          severity: data.volatility > volatilityThreshold ? 'high' : 'medium',
          lat: data.lat || null,
          lng: data.lng || null,
        });
      }
    });

    return shocks;
  }, [timeSeriesData]);

  const marketClusters = useMemo(() => {
    if (!flows || !weights) return [];

    // Simple clustering based on connected components
    const clusters = [];
    const visited = new Set();

    const addToCluster = (region, cluster) => {
      if (visited.has(region)) return;
      visited.add(region);
      cluster.connectedMarkets.add(region);

      const neighbors = weights[region]?.neighbors || [];
      neighbors.forEach(neighbor => {
        addToCluster(neighbor, cluster);
      });
    };

    Object.keys(weights).forEach(region => {
      if (!visited.has(region)) {
        const cluster = {
          mainMarket: region,
          connectedMarkets: new Set(),
        };
        addToCluster(region, cluster);
        cluster.marketCount = cluster.connectedMarkets.size;
        clusters.push(cluster);
      }
    });

    return clusters;
  }, [flows, weights]);

  const marketComparison = useMemo(() => {
    if (!analysis || !flows || !marketClusters.length) return null;

    const baselineIntegration = 1.0; // Adjust based on your analysis
    const baselineTransmission = 1.0; // Adjust based on your analysis

    return {
      integrationEfficiency: (analysis.r_squared || 0) / baselineIntegration,
      transmissionEfficiency: (analysis.coefficients?.spatial_lag_price || 0) / baselineTransmission,
      marketCoverage: marketClusters.length / (geoData?.features?.length || 1),
      priceConvergence: analysis.moran_i?.I || 0,
    };
  }, [analysis, flows, marketClusters, geoData]);

  const exportAnalysis = useCallback(() => {
    const exportData = {
      commodity: selectedCommodity,
      date: selectedMonth,
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
    a.download = `market-analysis-${selectedCommodity}-${selectedMonth || 'latest'}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [selectedCommodity, selectedMonth, timeSeriesData, detectedShocks, marketClusters, marketComparison, analysis]);

  useEffect(() => {
    if (selectedCommodity && typeof selectedCommodity === 'string' && selectedMonth) {
      dispatch(fetchSpatialData({ selectedCommodity, selectedDate: selectedMonth }));
    }
  }, [selectedCommodity, selectedMonth, dispatch]);

  useEffect(() => {
    if (uniqueMonths?.length > 0 && !selectedMonth) {
      setSelectedMonth(uniqueMonths[uniqueMonths.length - 1]); // Set to latest month
    }
  }, [uniqueMonths, selectedMonth]);

  useEffect(() => {
    const shocks = detectMarketShocks();
    setDetectedShocks(shocks);
  }, [detectMarketShocks]);

  // Now, place your conditional returns after all hooks
  if (status === 'loading' || status === 'idle') {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <LoadingSpinner progress={loadingProgress} />
      </Box>
    );
  }

  if (status === 'failed') {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        <AlertTitle>Error Loading Data</AlertTitle>
        {error || 'An unexpected error occurred while loading spatial data.'}
      </Alert>
    );
  }

  // Ensure selectedMonth is valid
  const isSelectedMonthValid = useMemo(() => {
    return uniqueMonths && uniqueMonths.includes(selectedMonth);
  }, [uniqueMonths, selectedMonth]);

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

  if (!isSelectedMonthValid) {
    return (
      <Alert severity="warning" sx={{ mt: 2 }}>
        <AlertTitle>Invalid Selected Month</AlertTitle>
        The selected month is not available. Please select a different month.
      </Alert>
    );
  }

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ p: 2, mt: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
        <Grid container spacing={2}>
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

          {/* Analysis Tabs */}
          <Grid item xs={12}>
            <Tabs value={analysisTab} onChange={handleTabChange}>
              <Tab icon={<Timeline />} label="Time Series" />
              <Tab icon={<TrendingUp />} label="Market Shocks" />
              <Tab icon={<GroupWork />} label="Market Clusters" />
              <Tab icon={<CompareArrows />} label="Comparison" />
            </Tabs>
          </Grid>

          {/* Tab Content */}
          <Grid item xs={12}>
            {analysisTab === 0 && (
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>Time Series Analysis</Typography>
                {timeSeriesData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={timeSeriesData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" tickFormatter={formatMonth} />
                      <YAxis />
                      <ChartTooltip labelFormatter={formatMonth} />
                      <Line type="monotone" dataKey="avgPrice" stroke="#8884d8" name="Average Price (YER)" />
                      <Line type="monotone" dataKey="volatility" stroke="#82ca9d" name="Volatility" />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <Typography variant="body2">No time series data available.</Typography>
                )}
              </Paper>
            )}

            {analysisTab === 1 && (
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
            )}

            {analysisTab === 2 && (
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
            )}

            {analysisTab === 3 && marketComparison && (
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
            )}
          </Grid>

          {/* Map and Original Analysis Components */}
          <Grid item xs={12}>
            <Box sx={{ height: 500, mb: 3 }}>
              <SpatialMap
                geoData={geoData}
                flowMaps={flows}
                selectedMonth={selectedMonth}
                onMonthChange={handleMonthChange}
                availableMonths={uniqueMonths}
                spatialWeights={weights}
                showFlows={showFlows}
                onToggleFlows={() => setShowFlows(prev => !prev)}
                analysisResults={analysis}
                selectedCommodity={selectedCommodity}
                marketClusters={marketClusters}
                detectedShocks={detectedShocks}
              />
            </Box>
          </Grid>

          {/* Additional Analysis Panels */}
          {analysis && marketComparison && (
            <>
              <Grid item xs={12} md={6}>
                <SpatialDiagnostics 
                  data={analysis} 
                  selectedMonth={selectedMonth}
                  selectedRegion={selectedRegion}
                  marketClusters={marketClusters}
                  shocks={detectedShocks.filter(shock => 
                    shock.month === selectedMonth
                  )}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <DynamicInterpretation
                  data={analysis}
                  spatialWeights={weights}
                  selectedRegion={selectedRegion}
                  marketMetrics={marketComparison}
                  timeSeriesData={timeSeriesData}
                />
              </Grid>

              {/* Advanced Economic Insights Panel */}
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
                              label={`${(analysis.r_squared * 100).toFixed(1)}%`}
                              color={analysis.r_squared > 0.5 ? "success" : "warning"}
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
                              label={`${(analysis.coefficients?.spatial_lag_price * 100).toFixed(1)}%`}
                              color={analysis.coefficients?.spatial_lag_price > 0.7 ? "success" : "warning"}
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
                              label={`${(analysis.moran_i.I * 100).toFixed(1)}%`}
                              color={analysis.moran_i.I > 0 ? "success" : "error"}
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
            </>
          )}
        </Grid>
      </Box>
    </Box>
  );
};

// PropTypes
SpatialAnalysis.propTypes = {
  selectedCommodity: PropTypes.string.isRequired,
  selectedDate: PropTypes.string,
};

export default SpatialAnalysis;