// src/components/analysis/spatial-analysis/DynamicInterpretation.js

import React, { useMemo, useCallback } from 'react';
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
  LinearProgress,
  Stack
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  Hub,
  Functions,
  Warning,
  Speed,
  CompareArrows,
  AccountTree,
  Analytics
} from '@mui/icons-material';
import { Line } from 'react-chartjs-2';
import { 
  calculatePriceTrend, 
  calculateVolatility, 
  determineStability, 
  generatePolicyImplications, 
  calculateTrend, 
  formatTimeSeriesData, 
  getChartOptions, 
  getPriceAlertSeverity, 
  generatePriceTrendMessage,
  getRegionalConnections,
  determineMarketRole,
  calculateMarketImportance,
  analyzeRegionalPerformance
} from '../../../utils/marketAnalysisHelpers';
import { useWorkerManager } from '../../../workers/enhancedWorkerSystem';
import debounce from 'lodash.debounce';

// Assuming these helper functions are properly optimized and possibly offloaded to workers
// If any of these functions are computation-heavy, consider using web workers

const MetricCard = ({ title, value, icon: Icon, color, subtitle, trend }) => (
  <Box sx={{ p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
      <Icon sx={{ mr: 1, color: `${color}.main` }} />
      <Typography variant="subtitle2">{title}</Typography>
    </Box>
    <Typography variant="h6" color={`${color}.main`}>
      {typeof value === 'number' ? `${(value * 100).toFixed(1)}%` : value}
    </Typography>
    {subtitle && (
      <Typography variant="caption" color="text.secondary">
        {subtitle}
      </Typography>
    )}
    {trend && (
      <Box sx={{ mt: 1, display: 'flex', alignItems: 'center' }}>
        {trend > 0 ? <TrendingUp color="success" /> : <TrendingDown color="error" />}
        <Typography variant="caption" sx={{ ml: 0.5 }}>
          {Math.abs(trend).toFixed(1)}% {trend > 0 ? 'increase' : 'decrease'}
        </Typography>
      </Box>
    )}
  </Box>
);

MetricCard.propTypes = {
  title: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
  icon: PropTypes.elementType.isRequired,
  color: PropTypes.string.isRequired,
  subtitle: PropTypes.string,
  trend: PropTypes.number
};

const DynamicInterpretation = ({
  data,
  spatialWeights,
  selectedRegion,
  marketMetrics,
  timeSeriesData
}) => {
  const worker = useWorkerManager();

  // Memoize diagnostics
  const {
    integrationAnalysis,
    priceAnalysis,
    regionalAnalysis,
    policyImplications
  } = useMemo(() => {
    if (!data) return {};

    // Offload intensive calculations to workers if necessary
    // For demonstration, assuming synchronous calculations
    const integrationAnalysis = {
      status: data.moran_i?.I > 0.3 ? 'high' : data.moran_i?.I > 0 ? 'moderate' : 'low',
      efficiency: data.r_squared || 0,
      transmission: data.coefficients?.spatial_lag_price || 0,
      coverage: marketMetrics?.marketCoverage || 0,
      significance: data.moran_i?.['p-value'] < 0.05
    };

    const priceAnalysisResult = timeSeriesData ? {
      trend: calculatePriceTrend(timeSeriesData),
      volatility: calculateVolatility(timeSeriesData),
      stability: determineStability(timeSeriesData),
      convergence: data.moran_i?.I > 0
    } : null;

    const regionalAnalysisResult = selectedRegion ? {
      connections: getRegionalConnections(selectedRegion, spatialWeights),
      role: determineMarketRole(selectedRegion, spatialWeights),
      importance: calculateMarketImportance(selectedRegion, spatialWeights),
      performance: analyzeRegionalPerformance(selectedRegion, data.residual)
    } : null;

    const policyImplicationsResult = generatePolicyImplications(
      integrationAnalysis,
      priceAnalysisResult,
      regionalAnalysisResult
    );

    return {
      integrationAnalysis,
      priceAnalysis: priceAnalysisResult,
      regionalAnalysis: regionalAnalysisResult,
      policyImplications: policyImplicationsResult
    };
  }, [data, spatialWeights, selectedRegion, marketMetrics, timeSeriesData]);

  if (!data) return null;

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Dynamic Market Interpretation
        {selectedRegion && ` - ${selectedRegion}`}
      </Typography>

      {/* Market Integration Status */}
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Integration Level"
            value={integrationAnalysis.efficiency}
            icon={Functions}
            color="primary"
            subtitle="Overall market efficiency"
            trend={calculateTrend(timeSeriesData, 'integration')}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Price Transmission"
            value={integrationAnalysis.transmission}
            icon={Speed}
            color="success"
            subtitle="Speed of price adjustments"
            trend={calculateTrend(timeSeriesData, 'transmission')}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Market Coverage"
            value={integrationAnalysis.coverage}
            icon={Hub}
            color="info"
            subtitle="Network connectivity"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Market Stability"
            value={priceAnalysis?.stability === 'stable' ? 1 : 0}
            icon={CompareArrows}
            color={priceAnalysis?.stability === 'stable' ? 'success' : 'warning'}
            subtitle={`Volatility: ${(priceAnalysis?.volatility || 0).toFixed(1)}%`}
          />
        </Grid>
      </Grid>

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
                <Line
                  data={formatTimeSeriesData(timeSeriesData)}
                  options={getChartOptions()}
                />
              </Box>
            </Grid>
            <Grid item xs={12} md={4}>
              <Stack spacing={1}>
                <Alert 
                  severity={getPriceAlertSeverity(priceAnalysis)}
                  icon={<Analytics />}
                >
                  <AlertTitle>Price Trend Analysis</AlertTitle>
                  {generatePriceTrendMessage(priceAnalysis)}
                </Alert>
                <Box sx={{ p: 1, bgcolor: 'background.default', borderRadius: 1 }}>
                  <Typography variant="body2" gutterBottom>
                    Market Stability Indicators
                  </Typography>
                  <Stack spacing={1}>
                    <LinearProgress 
                      variant="determinate" 
                      value={(1 - priceAnalysis.volatility) * 100}
                      color={priceAnalysis.stability === 'stable' ? 'success' : 'warning'}
                    />
                    <Typography variant="caption" color="text.secondary">
                      Price Stability: {priceAnalysis.stability}
                    </Typography>
                  </Stack>
                </Box>
              </Stack>
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
                  color={regionalAnalysis.role === 'hub' ? "primary" : "default"}
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
                <Box sx={{ mt: 1 }}>
                  <LinearProgress
                    variant="determinate"
                    value={regionalAnalysis.importance * 100}
                    color={regionalAnalysis.importance > 0.3 ? 'success' : 'warning'}
                  />
                  <Typography variant="caption" sx={{ mt: 0.5, display: 'block' }}>
                    {(regionalAnalysis.importance * 100).toFixed(1)}% of total market connections
                  </Typography>
                </Box>
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
        <Grid container spacing={2}>
          {policyImplications.map((implication, index) => (
            <Grid item xs={12} key={index}>
              <Alert severity={implication.severity}>
                <AlertTitle>{implication.title}</AlertTitle>
                {implication.message}
                {implication.recommendation && (
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    Recommendation: {implication.recommendation}
                  </Typography>
                )}
              </Alert>
            </Grid>
          ))}
        </Grid>
      </Box>
    </Paper>
  );
};

DynamicInterpretation.propTypes = {
  data: PropTypes.shape({
    moran_i: PropTypes.shape({
      I: PropTypes.number,
      'p-value': PropTypes.number,
    }),
    r_squared: PropTypes.number,
    coefficients: PropTypes.shape({
      spatial_lag_price: PropTypes.number
    }),
    residual: PropTypes.arrayOf(PropTypes.shape({
      region_id: PropTypes.string,
      date: PropTypes.string,
      residual: PropTypes.number
    }))
  }),
  spatialWeights: PropTypes.object,
  selectedRegion: PropTypes.string,
  marketMetrics: PropTypes.shape({
    marketCoverage: PropTypes.number,
    integrationLevel: PropTypes.number,
    stability: PropTypes.number
  }),
  timeSeriesData: PropTypes.arrayOf(PropTypes.shape({
    date: PropTypes.string,
    price: PropTypes.number,
    region_id: PropTypes.string
  }))
};

export default React.memo(DynamicInterpretation);
