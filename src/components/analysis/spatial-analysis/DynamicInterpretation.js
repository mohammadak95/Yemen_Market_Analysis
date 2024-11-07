// src/components/analysis/spatial-analysis/DynamicInterpretation.js

import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import {
  Paper,
  Typography,
  Alert,
  AlertTitle,
  Box,
  Grid,
  Chip,
  Divider,
  Tooltip,
  LinearProgress,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  Hub,
  Functions,
  Warning,
  Speed,
  CompareArrows,
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip as ChartTooltip,
  CartesianGrid,
} from 'recharts';

const DynamicInterpretation = ({
  data,
  spatialWeights,
  selectedRegion,
  marketMetrics,
  timeSeriesData,
}) => {
  if (!data) return null;

  const {
    moran_i,
    r_squared,
    coefficients,
    residual,
    p_values,
  } = data;

  // Market Integration Analysis
  const integrationAnalysis = useMemo(() => {
    const spatialLag = coefficients?.spatial_lag_price || 0;
    const significance = p_values?.spatial_lag_price < 0.05;
    const marketCoverage = marketMetrics?.marketCoverage || 0;

    let status = 'fragmented';
    if (spatialLag > 0.7 && significance) status = 'highly_integrated';
    else if (spatialLag > 0.4 && significance) status = 'moderately_integrated';

    return {
      status,
      efficiency: r_squared,
      transmission: spatialLag,
      coverage: marketCoverage,
      significance,
    };
  }, [coefficients, p_values, r_squared, marketMetrics]);

  // Price Dynamics Analysis
  const priceAnalysis = useMemo(() => {
    if (!timeSeriesData?.length) return null;

    const recentPrices = timeSeriesData.slice(-6);
    const priceChanges = recentPrices.map((data, i) => {
      if (i === 0) return 0;
      return (
        ((data.avgPrice - recentPrices[i - 1].avgPrice) /
          recentPrices[i - 1].avgPrice) *
        100
      );
    });
    const avgChange =
      priceChanges.reduce((a, b) => a + b, 0) / priceChanges.length;
    const volatility = Math.sqrt(
      priceChanges.reduce((acc, val) => acc + Math.pow(val - avgChange, 2), 0) /
        priceChanges.length
    );

    return {
      trend: avgChange,
      volatility,
      stability:
        volatility < 5 ? 'stable' : volatility < 10 ? 'moderate' : 'volatile',
      convergence: moran_i?.I > 0,
    };
  }, [timeSeriesData, moran_i]);

  // Regional Market Analysis
  const regionalAnalysis = useMemo(() => {
    if (!selectedRegion || !spatialWeights) return null;

    const regionalWeights = spatialWeights[selectedRegion];
    if (!regionalWeights) return null;

    const connectedMarkets = regionalWeights.neighbors.length;
    const marketRole =
      connectedMarkets > 3
        ? 'hub'
        : connectedMarkets > 1
        ? 'intermediary'
        : 'peripheral';

    return {
      connections: connectedMarkets,
      role: marketRole,
      importance: connectedMarkets / Object.keys(spatialWeights).length,
      residuals: residual?.filter((r) => r.region_id === selectedRegion) || [],
    };
  }, [selectedRegion, spatialWeights, residual]);

  // Policy Implications
  const policyImplications = useMemo(() => {
    const implications = [];

    // Market Integration Implications
    if (integrationAnalysis.status === 'fragmented') {
      implications.push({
        type: 'warning',
        title: 'Market Integration',
        message:
          'Market fragmentation indicates need for improved trade infrastructure and reduced barriers.',
        priority: 'high',
      });
    }

    // Price Stability Implications
    if (priceAnalysis?.stability === 'volatile') {
      implications.push({
        type: 'error',
        title: 'Price Stability',
        message:
          'High price volatility suggests need for price stabilization mechanisms.',
        priority: 'high',
      });
    }

    // Regional Development Implications
    if (regionalAnalysis?.role === 'peripheral') {
      implications.push({
        type: 'info',
        title: 'Regional Development',
        message:
          'Low market connectivity indicates opportunity for regional market development.',
        priority: 'medium',
      });
    }

    return implications;
  }, [integrationAnalysis, priceAnalysis, regionalAnalysis]);

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Dynamic Market Interpretation
      </Typography>

      {/* Market Integration Status */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle1" gutterBottom>
          Market Integration Status
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}>
            <Tooltip title="Overall market integration efficiency">
              <Box>
                <Typography variant="body2" color="textSecondary">
                  Integration Level
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={integrationAnalysis.efficiency * 100}
                  color={
                    integrationAnalysis.efficiency > 0.5 ? 'success' : 'warning'
                  }
                  sx={{ mt: 1, mb: 0.5 }}
                />
                <Typography variant="caption">
                  {(integrationAnalysis.efficiency * 100).toFixed(1)}%
                </Typography>
              </Box>
            </Tooltip>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Tooltip title="Speed of price transmission between markets">
              <Box>
                <Typography variant="body2" color="textSecondary">
                  Price Transmission
                </Typography>
                <Chip
                  icon={<Speed />}
                  label={`${(integrationAnalysis.transmission * 100).toFixed(
                    1
                  )}%`}
                  color={
                    integrationAnalysis.transmission > 0.5 ? 'success' : 'warning'
                  }
                  size="small"
                  sx={{ mt: 1 }}
                />
              </Box>
            </Tooltip>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Tooltip title="Market coverage and connectivity">
              <Box>
                <Typography variant="body2" color="textSecondary">
                  Market Coverage
                </Typography>
                <Chip
                  icon={<Hub />}
                  label={`${(integrationAnalysis.coverage * 100).toFixed(1)}%`}
                  color={integrationAnalysis.coverage > 0.6 ? 'success' : 'warning'}
                  size="small"
                  sx={{ mt: 1 }}
                />
              </Box>
            </Tooltip>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Tooltip title="Statistical significance of market integration">
              <Box>
                <Typography variant="body2" color="textSecondary">
                  Significance
                </Typography>
                <Chip
                  icon={integrationAnalysis.significance ? <Functions /> : <Warning />}
                  label={integrationAnalysis.significance ? 'Significant' : 'Not Significant'}
                  color={integrationAnalysis.significance ? 'success' : 'default'}
                  size="small"
                  sx={{ mt: 1 }}
                />
              </Box>
            </Tooltip>
          </Grid>
        </Grid>
      </Box>

      <Divider sx={{ my: 2 }} />

      {/* Price Dynamics */}
      {priceAnalysis && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" gutterBottom>
            Price Dynamics
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={8}>
              <Box sx={{ height: 200 }}>
                <LineChart
                  data={timeSeriesData}
                  width={600}
                  height={200}
                  margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <ChartTooltip />
                  <Line type="monotone" dataKey="avgPrice" stroke="#8884d8" />
                </LineChart>
              </Box>
            </Grid>
            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 2, bgcolor: 'background.default' }}>
                <Typography variant="body2" gutterBottom>
                  Price Trend
                </Typography>
                <Chip
                  icon={
                    priceAnalysis.trend > 0 ? <TrendingUp /> : <TrendingDown />
                  }
                  label={`${priceAnalysis.trend.toFixed(1)}%`}
                  color={Math.abs(priceAnalysis.trend) < 5 ? 'success' : 'warning'}
                  size="small"
                  sx={{ mb: 1 }}
                />
                <Typography variant="body2" gutterBottom>
                  Volatility
                </Typography>
                <Chip
                  icon={<CompareArrows />}
                  label={priceAnalysis.stability}
                  color={
                    priceAnalysis.stability === 'stable'
                      ? 'success'
                      : priceAnalysis.stability === 'moderate'
                      ? 'warning'
                      : 'error'
                  }
                  size="small"
                />
              </Paper>
            </Grid>
          </Grid>
        </Box>
      )}

      {/* Regional Analysis */}
      {regionalAnalysis && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" gutterBottom>
            Regional Market Analysis
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Paper sx={{ p: 2, bgcolor: 'background.default' }}>
                <Typography variant="body2" gutterBottom>
                  Market Role
                </Typography>
                <Chip
                  icon={<Hub />}
                  label={regionalAnalysis.role}
                  color={
                    regionalAnalysis.role === 'hub'
                      ? 'success'
                      : regionalAnalysis.role === 'intermediary'
                      ? 'primary'
                      : 'default'
                  }
                  size="small"
                />
                <Typography variant="body2" sx={{ mt: 1 }}>
                  Connected Markets: {regionalAnalysis.connections}
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Paper sx={{ p: 2, bgcolor: 'background.default' }}>
                <Typography variant="body2" gutterBottom>
                  Market Importance
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={regionalAnalysis.importance * 100}
                  color={
                    regionalAnalysis.importance > 0.3 ? 'success' : 'warning'
                  }
                  sx={{ mt: 1, mb: 0.5 }}
                />
                <Typography variant="caption">
                  {(regionalAnalysis.importance * 100).toFixed(1)}% of total
                  market connections
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        </Box>
      )}

      {/* Policy Implications */}
      <Box>
        <Typography variant="subtitle1" gutterBottom>
          Policy Implications
        </Typography>
        {policyImplications.map((implication, index) => (
          <Alert key={index} severity={implication.type} sx={{ mb: 1 }}>
            <AlertTitle>{implication.title}</AlertTitle>
            {implication.message}
          </Alert>
        ))}
      </Box>
    </Paper>
  );
};

DynamicInterpretation.propTypes = {
  data: PropTypes.object.isRequired, // Change from array to object
  spatialWeights: PropTypes.object,
  selectedRegion: PropTypes.string,
  marketMetrics: PropTypes.shape({
    marketCoverage: PropTypes.number,
    integrationLevel: PropTypes.number,
    transmissionEfficiency: PropTypes.number
  }),
  timeSeriesData: PropTypes.array
};

DynamicInterpretation.defaultProps = {
  spatialWeights: {},
  marketMetrics: {
    marketCoverage: 0,
    integrationLevel: 0,
    transmissionEfficiency: 0
  },
  timeSeriesData: []
};

export default DynamicInterpretation;