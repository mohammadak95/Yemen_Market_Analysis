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
  Stack,
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
  Analytics,
} from '@mui/icons-material';
import { Line } from 'recharts';

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
    {trend !== undefined && (
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
  trend: PropTypes.number,
};

const DynamicInterpretation = ({
  preprocessedData,
  selectedRegion,
  selectedCommodity,
}) => {
  // Memoize analysis results
  const {
    integrationAnalysis,
    priceAnalysis,
    regionalAnalysis,
    policyImplications,
  } = useMemo(() => {
    if (!preprocessedData || !selectedCommodity) return {};

    // Integration Analysis using pre-computed data
    const integrationAnalysis = {
      status: preprocessedData.spatial_autocorrelation.moran_i > 0.3 ? 
        'high' : preprocessedData.spatial_autocorrelation.moran_i > 0 ? 'moderate' : 'low',
      efficiency: preprocessedData.spatial_autocorrelation.moran_i,
      significance: preprocessedData.spatial_autocorrelation.significance,
      clusterCount: preprocessedData.market_clusters.length,
    };

    // Price Analysis using pre-computed time series
    const priceAnalysis = preprocessedData.time_series_data ? {
      trend: calculatePriceTrend(preprocessedData.time_series_data),
      volatility: calculateAverageVolatility(preprocessedData.time_series_data),
      stability: calculateStability(preprocessedData.time_series_data),
      shockCount: preprocessedData.market_shocks.length
    } : null;

    // Regional Analysis using pre-computed clusters
    const regionalAnalysis = selectedRegion ? {
      cluster: findClusterForRegion(preprocessedData.market_clusters, selectedRegion),
      flows: findFlowsForRegion(preprocessedData.flow_analysis, selectedRegion),
      shocks: findShocksForRegion(preprocessedData.market_shocks, selectedRegion)
    } : null;

    // Generate policy implications
    const policyImplications = generatePolicyImplications(
      integrationAnalysis,
      priceAnalysis,
      regionalAnalysis,
      preprocessedData.metadata
    );

    return {
      integrationAnalysis,
      priceAnalysis,
      regionalAnalysis,
      policyImplications
    };
  }, [preprocessedData, selectedRegion, selectedCommodity]);

  if (!preprocessedData || !selectedCommodity) return null;

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Dynamic Market Interpretation
        {selectedRegion && ` - ${selectedRegion}`}
      </Typography>

      {/* Market Integration Metrics */}
      <Grid container spacing={2}>
        <Grid item xs={12} md={4}>
          <MetricCard
            title="Market Integration"
            value={integrationAnalysis.efficiency}
            icon={CompareArrows}
            color="primary"
            subtitle={`${integrationAnalysis.status} integration level`}
            trend={calculateIntegrationTrend(preprocessedData.time_series_data)}
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <MetricCard
            title="Price Stability"
            value={priceAnalysis.stability}
            icon={Speed}
            color={priceAnalysis.stability > 0.7 ? "success" : "warning"}
            subtitle={`${priceAnalysis.shockCount} price shocks detected`}
            trend={-priceAnalysis.volatility}
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <MetricCard
            title="Market Coverage"
            value={integrationAnalysis.clusterCount / 20} // Assuming 20 total possible markets
            icon={Hub}
            color="info"
            subtitle={`${integrationAnalysis.clusterCount} active market clusters`}
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
            <Grid item xs={12} md={6}>
              <Alert 
                severity={priceAnalysis.volatility > 0.2 ? "warning" : "info"}
                sx={{ mb: 2 }}
              >
                <AlertTitle>Volatility Analysis</AlertTitle>
                Price volatility is {priceAnalysis.volatility < 0.1 ? "low" : 
                  priceAnalysis.volatility < 0.2 ? "moderate" : "high"} 
                at {(priceAnalysis.volatility * 100).toFixed(1)}%
              </Alert>
            </Grid>
            <Grid item xs={12} md={6}>
              <Alert 
                severity={priceAnalysis.trend > 0 ? "warning" : "success"}
                sx={{ mb: 2 }}
              >
                <AlertTitle>Price Trend</AlertTitle>
                Prices show a {Math.abs(priceAnalysis.trend).toFixed(1)}% 
                {priceAnalysis.trend > 0 ? " increase" : " decrease"} over the period
              </Alert>
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
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Market Role
                </Typography>
                <Stack direction="row" spacing={1}>
                  <Chip 
                    label={regionalAnalysis.cluster?.mainMarket === selectedRegion ? 
                      "Hub Market" : "Connected Market"}
                    color="primary"
                    icon={<Hub />}
                  />
                  <Chip 
                    label={`${regionalAnalysis.flows.length} Connections`}
                    color="secondary"
                    icon={<AccountTree />}
                  />
                </Stack>
              </Paper>
            </Grid>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Market Performance
                </Typography>
                <Stack spacing={1}>
                  <Typography variant="body2">
                    Average Flow: {calculateAverageFlow(regionalAnalysis.flows).toFixed(2)}
                  </Typography>
                  <Typography variant="body2">
                    Shock Frequency: {regionalAnalysis.shocks.length} events
                  </Typography>
                </Stack>
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

// Helper functions
const calculatePriceTrend = (timeSeriesData) => {
  const firstPrice = timeSeriesData[0]?.avgUsdPrice;
  const lastPrice = timeSeriesData[timeSeriesData.length - 1]?.avgUsdPrice;
  return ((lastPrice - firstPrice) / firstPrice) * 100;
};

const calculateAverageVolatility = (timeSeriesData) => {
  return timeSeriesData.reduce((acc, entry) => acc + entry.volatility, 0) / timeSeriesData.length;
};

const calculateStability = (timeSeriesData) => {
  const volatilities = timeSeriesData.map(entry => entry.volatility);
  const maxVol = Math.max(...volatilities);
  return 1 - (maxVol / 100); // Normalize to 0-1 range
};

const findClusterForRegion = (clusters, region) => {
  return clusters.find(cluster => 
    cluster.main_market === region || cluster.connected_markets.includes(region)
  );
};

const findFlowsForRegion = (flows, region) => {
  return flows.filter(flow => 
    flow.source === region || flow.target === region
  );
};

const findShocksForRegion = (shocks, region) => {
  return shocks.filter(shock => shock.region === region);
};

const calculateAverageFlow = (flows) => {
  return flows.reduce((acc, flow) => acc + flow.total_flow, 0) / flows.length;
};

const calculateIntegrationTrend = (timeSeriesData) => {
  const periods = Math.ceil(timeSeriesData.length / 3);
  const earlier = timeSeriesData.slice(0, periods);
  const later = timeSeriesData.slice(-periods);
  
  const earlierAvg = earlier.reduce((acc, entry) => acc + entry.volatility, 0) / earlier.length;
  const laterAvg = later.reduce((acc, entry) => acc + entry.volatility, 0) / later.length;
  
  return ((laterAvg - earlierAvg) / earlierAvg) * 100;
};

const generatePolicyImplications = (integration, price, regional, metadata) => {
  const implications = [];

  // Integration-based implications
  if (integration.efficiency < 0.3) {
    implications.push({
      severity: "warning",
      title: "Low Market Integration",
      message: "Markets show weak price transmission and limited connectivity.",
      recommendation: "Invest in market infrastructure and information systems."
    });
  }

  // Price stability implications
  if (price.volatility > 0.2) {
    implications.push({
      severity: "error",
      title: "High Price Volatility",
      message: `Price volatility at ${(price.volatility * 100).toFixed(1)}% exceeds stability thresholds.`,
      recommendation: "Consider price stabilization mechanisms and buffer stocks."
    });
  }

  // Regional implications
  if (regional && regional.shocks.length > 2) {
    implications.push({
      severity: "warning",
      title: "Frequent Market Shocks",
      message: `${regional.shocks.length} price shocks detected in this region.`,
      recommendation: "Strengthen early warning systems and market monitoring."
    });
  }

  return implications;
};

DynamicInterpretation.propTypes = {
  preprocessedData: PropTypes.shape({
    spatial_autocorrelation: PropTypes.shape({
      moran_i: PropTypes.number,
      significance: PropTypes.bool,
    }),
    market_clusters: PropTypes.array,
    market_shocks: PropTypes.array,
    time_series_data: PropTypes.array,
    flow_analysis: PropTypes.array,
    metadata: PropTypes.object,
  }),
  selectedRegion: PropTypes.string,
  selectedCommodity: PropTypes.string,
};

export default React.memo(DynamicInterpretation);