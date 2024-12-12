import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import {
  Grid,
  Paper,
  Typography,
  Box,
  Alert,
  Divider
} from '@mui/material';
import { useTheme } from '@mui/material/styles';

import MetricCard from '../../atoms/MetricCard';
import MetricProgress from '../../molecules/MetricProgress';

const MarketHealthMetrics = ({
  timeSeriesData,
  marketIntegration,
  networkMetrics,
  spatialAutocorrelation,
  selectedRegion
}) => {
  const theme = useTheme();

  // Calculate overall market health metrics with safe defaults
  const healthMetrics = useMemo(() => {
    if (!timeSeriesData?.length) {
      return {
        overall: 0,
        integration: { score: 0, factors: {}, trend: 0 },
        stability: { score: 0, factors: {}, trend: 0 },
        resilience: { score: 0, factors: {}, trend: 0 },
        accessibility: { score: 0, factors: {}, trend: 0 }
      };
    }

    // Calculate integration health
    const integration = calculateIntegrationHealth(marketIntegration);

    // Calculate stability health
    const stability = calculateStabilityHealth(timeSeriesData);

    // Calculate resilience health
    const resilience = calculateResilienceHealth(
      networkMetrics,
      spatialAutocorrelation
    );

    // Calculate accessibility health
    const accessibility = calculateAccessibilityHealth(marketIntegration);

    // Calculate overall health with safety checks
    const overall = Math.max(0, Math.min(1,
      (integration.score +
       stability.score +
       resilience.score +
       accessibility.score) / 4
    ));

    return {
      overall,
      integration,
      stability,
      resilience,
      accessibility
    };
  }, [timeSeriesData, marketIntegration, networkMetrics, spatialAutocorrelation]);

  // Calculate regional health metrics with safe defaults
  const regionalMetrics = useMemo(() => {
    if (!selectedRegion || !timeSeriesData?.length) return null;

    const metrics = calculateRegionalHealth(
      selectedRegion,
      timeSeriesData,
      marketIntegration,
      networkMetrics
    );

    return metrics || {
      overall: 0,
      marketRole: 'Unknown',
      riskLevel: 'Unknown',
      metrics: {}
    };
  }, [selectedRegion, timeSeriesData, marketIntegration, networkMetrics]);

  // Ensure we have valid values for display
  const safeMetrics = {
    overall: healthMetrics?.overall || 0,
    integration: healthMetrics?.integration || { score: 0, factors: {}, trend: 0 },
    stability: healthMetrics?.stability || { score: 0, factors: {}, trend: 0 },
    resilience: healthMetrics?.resilience || { score: 0, factors: {}, trend: 0 },
    accessibility: healthMetrics?.accessibility || { score: 0, factors: {}, trend: 0 }
  };

  if (!timeSeriesData?.length) {
    return (
      <Alert severity="warning" sx={{ m: 2 }}>
        No market health data available for analysis
      </Alert>
    );
  }

  return (
    <Grid container spacing={2}>
      {/* Overall Health Score */}
      <Grid item xs={12}>
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Market System Health
          </Typography>
          <MetricProgress
            title="Overall Health Score"
            value={safeMetrics.overall}
            target={0.7}
            format="percentage"
            description="Composite market health indicator"
          />
        </Paper>
      </Grid>

      {/* Core Health Metrics */}
      <Grid item xs={12}>
        <Paper sx={{ p: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Core Health Indicators
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={3}>
              <MetricCard
                title="Market Integration"
                value={safeMetrics.integration.score}
                format="percentage"
                description="Price correlation and trade flow strength"
                trend={safeMetrics.integration.trend}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <MetricCard
                title="Market Stability"
                value={safeMetrics.stability.score}
                format="percentage"
                description="Price and supply consistency"
                trend={safeMetrics.stability.trend}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <MetricCard
                title="Market Resilience"
                value={safeMetrics.resilience.score}
                format="percentage"
                description="Shock absorption capacity"
                trend={safeMetrics.resilience.trend}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <MetricCard
                title="Market Accessibility"
                value={safeMetrics.accessibility.score}
                format="percentage"
                description="Physical and economic access"
                trend={safeMetrics.accessibility.trend}
              />
            </Grid>
          </Grid>
        </Paper>
      </Grid>

      {/* Detailed Analysis */}
      <Grid item xs={12}>
        <Paper sx={{ p: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Health Analysis Details
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Box>
                <Typography variant="body2" color="textSecondary" gutterBottom>
                  Integration Factors
                </Typography>
                <Box sx={{ pl: 2 }}>
                  {Object.entries(healthMetrics.integration.factors).map(([key, value]) => (
                    <Typography key={key} variant="body2">
                      • {key}: {(value * 100).toFixed(1)}%
                    </Typography>
                  ))}
                </Box>
              </Box>
            </Grid>
            <Grid item xs={12} md={6}>
              <Box>
                <Typography variant="body2" color="textSecondary" gutterBottom>
                  Stability Factors
                </Typography>
                <Box sx={{ pl: 2 }}>
                  {Object.entries(healthMetrics.stability.factors).map(([key, value]) => (
                    <Typography key={key} variant="body2">
                      • {key}: {(value * 100).toFixed(1)}%
                    </Typography>
                  ))}
                </Box>
              </Box>
            </Grid>
          </Grid>

          <Divider sx={{ my: 2 }} />

          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Box>
                <Typography variant="body2" color="textSecondary" gutterBottom>
                  Resilience Factors
                </Typography>
                <Box sx={{ pl: 2 }}>
                  {Object.entries(healthMetrics.resilience.factors).map(([key, value]) => (
                    <Typography key={key} variant="body2">
                      • {key}: {(value * 100).toFixed(1)}%
                    </Typography>
                  ))}
                </Box>
              </Box>
            </Grid>
            <Grid item xs={12} md={6}>
              <Box>
                <Typography variant="body2" color="textSecondary" gutterBottom>
                  Accessibility Factors
                </Typography>
                <Box sx={{ pl: 2 }}>
                  {Object.entries(healthMetrics.accessibility.factors).map(([key, value]) => (
                    <Typography key={key} variant="body2">
                      • {key}: {(value * 100).toFixed(1)}%
                    </Typography>
                  ))}
                </Box>
              </Box>
            </Grid>
          </Grid>
        </Paper>
      </Grid>

      {/* Regional Health Analysis */}
      {regionalMetrics && (
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Regional Health Analysis: {selectedRegion}
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <MetricCard
                  title="Regional Health Score"
                  value={regionalMetrics.overall}
                  format="percentage"
                  description="Overall regional market health"
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <MetricCard
                  title="Market Role"
                  value={regionalMetrics.marketRole}
                  format="string"
                  description="Market's role in the system"
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <MetricCard
                  title="Risk Level"
                  value={regionalMetrics.riskLevel}
                  format="string"
                  description="Current risk assessment"
                />
              </Grid>
            </Grid>

            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" color="textSecondary" gutterBottom>
                Key Metrics
              </Typography>
              <Grid container spacing={2}>
                {Object.entries(regionalMetrics.metrics).map(([key, value]) => (
                  <Grid item xs={6} md={3} key={key}>
                    <Typography variant="caption" color="textSecondary">
                      {key}
                    </Typography>
                    <Typography variant="body2">
                      {typeof value === 'number' ? 
                        `${(value * 100).toFixed(1)}%` : value}
                    </Typography>
                  </Grid>
                ))}
              </Grid>
            </Box>
          </Paper>
        </Grid>
      )}

      {/* Health Summary */}
      <Grid item xs={12}>
        <Paper sx={{ p: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Health Assessment Summary
          </Typography>
          <Typography variant="body2" color="textSecondary">
            {generateHealthSummary(healthMetrics, regionalMetrics)}
          </Typography>
        </Paper>
      </Grid>
    </Grid>
  );
};

// Helper functions for health calculations
const calculateIntegrationHealth = (marketIntegration) => {
  const factors = {
    priceCorrelation: Object.values(marketIntegration?.price_correlation || {})
      .reduce((sum, corr) => sum + Object.values(corr)
      .reduce((s, v) => s + Math.abs(v), 0), 0) / 
      (Object.keys(marketIntegration?.price_correlation || {}).length || 1),
    marketConnectivity: Object.values(marketIntegration?.accessibility || {})
      .reduce((sum, val) => sum + val, 0) / 
      (Object.keys(marketIntegration?.accessibility || {}).length || 1)
  };

  return {
    score: (factors.priceCorrelation + factors.marketConnectivity) / 2,
    factors,
    trend: 0 // Calculate trend if historical data available
  };
};

const calculateStabilityHealth = (timeSeriesData) => {
  const factors = {
    priceStability: calculatePriceStability(timeSeriesData),
    supplyConsistency: calculateSupplyConsistency(timeSeriesData),
    seasonalPattern: calculateSeasonalPattern(timeSeriesData)
  };

  return {
    score: Object.values(factors).reduce((sum, val) => sum + val, 0) / 3,
    factors,
    trend: calculateStabilityTrend(timeSeriesData)
  };
};

const calculateResilienceHealth = (networkMetrics, spatialAutocorrelation) => {
  const factors = {
    networkRedundancy: networkMetrics?.clustering || 0,
    spatialDiversity: 1 - (spatialAutocorrelation?.global?.moran_i || 0),
    marketAdaptability: networkMetrics?.health?.resilience || 0
  };

  return {
    score: Object.values(factors).reduce((sum, val) => sum + val, 0) / 3,
    factors,
    trend: 0 // Calculate trend if historical data available
  };
};

const calculateAccessibilityHealth = (marketIntegration) => {
  const factors = {
    physicalAccess: Object.values(marketIntegration?.accessibility || {})
      .reduce((sum, val) => sum + val, 0) / 
      (Object.keys(marketIntegration?.accessibility || {}).length || 1),
    economicAccess: 0.7, // Placeholder - implement actual calculation
    infrastructureQuality: 0.6 // Placeholder - implement actual calculation
  };

  return {
    score: Object.values(factors).reduce((sum, val) => sum + val, 0) / 3,
    factors,
    trend: 0 // Calculate trend if historical data available
  };
};

const calculateRegionalHealth = (
  region,
  timeSeriesData,
  marketIntegration,
  networkMetrics
) => {
  const regionData = timeSeriesData.filter(d => d.region === region);
  if (!regionData.length) return null;

  const metrics = {
    priceStability: calculatePriceStability(regionData),
    marketAccess: marketIntegration?.accessibility?.[region] || 0,
    networkCentrality: networkMetrics?.centrality?.[region]?.degree || 0,
    tradingVolume: calculateTradingVolume(region, timeSeriesData)
  };

  return {
    overall: Object.values(metrics).reduce((sum, val) => 
      sum + (typeof val === 'number' ? val : 0), 0
    ) / Object.values(metrics).length,
    marketRole: determineMarketRole(metrics),
    riskLevel: assessRiskLevel(metrics),
    metrics
  };
};

// Helper functions for specific calculations
const calculatePriceStability = (data) => {
  if (!data?.length) return 0;
  const prices = data.map(d => d.usdPrice || 0);
  const mean = prices.reduce((sum, p) => sum + p, 0) / prices.length;
  const variance = prices.reduce((sum, p) => 
    sum + Math.pow(p - mean, 2), 0
  ) / prices.length;
  return 1 - Math.min(Math.sqrt(variance) / mean, 1);
};

const calculateSupplyConsistency = (data) => {
  // Placeholder - implement actual supply consistency calculation
  return 0.75;
};

const calculateSeasonalPattern = (data) => {
  // Placeholder - implement actual seasonal pattern calculation
  return 0.8;
};

const calculateStabilityTrend = (data) => {
  // Placeholder - implement actual stability trend calculation
  return 0.05;
};

const calculateTradingVolume = (region, data) => {
  // Placeholder - implement actual trading volume calculation
  return 0.7;
};

const determineMarketRole = (metrics) => {
  if (metrics.networkCentrality > 0.7) return 'Hub Market';
  if (metrics.networkCentrality > 0.4) return 'Regional Center';
  return 'Local Market';
};

const assessRiskLevel = (metrics) => {
  const riskScore = (
    (1 - metrics.priceStability) +
    (1 - metrics.marketAccess) +
    (1 - metrics.networkCentrality)
  ) / 3;

  if (riskScore > 0.7) return 'High Risk';
  if (riskScore > 0.4) return 'Medium Risk';
  return 'Low Risk';
};

const generateHealthSummary = (health, regional) => {
  const parts = [];

  // Overall health assessment
  if (health.overall > 0.7) {
    parts.push('Market system shows strong overall health with robust integration and stability.');
  } else if (health.overall > 0.4) {
    parts.push('Market system demonstrates moderate health with areas for improvement.');
  } else {
    parts.push('Market system shows significant health challenges requiring attention.');
  }

  // Key strengths and weaknesses
  const metrics = [
    { name: 'Integration', score: health.integration.score },
    { name: 'Stability', score: health.stability.score },
    { name: 'Resilience', score: health.resilience.score },
    { name: 'Accessibility', score: health.accessibility.score }
  ];

  const strengths = metrics.filter(m => m.score > 0.7)
    .map(m => m.name.toLowerCase());
  const weaknesses = metrics.filter(m => m.score < 0.4)
    .map(m => m.name.toLowerCase());

  if (strengths.length) {
    parts.push(`Strong performance in ${strengths.join(', ')}.`);
  }
  if (weaknesses.length) {
    parts.push(`Improvement needed in ${weaknesses.join(', ')}.`);
  }

  // Regional insight if available
  if (regional) {
    parts.push(`${regional.marketRole} shows ${
      regional.overall > 0.7 ? 'strong' : 
      regional.overall > 0.4 ? 'moderate' : 'weak'
    } health with ${regional.riskLevel.toLowerCase()} risk level.`);
  }

  return parts.join(' ');
};

MarketHealthMetrics.propTypes = {
  timeSeriesData: PropTypes.arrayOf(PropTypes.shape({
    month: PropTypes.string.isRequired,
    region: PropTypes.string.isRequired,
    usdPrice: PropTypes.number
  })).isRequired,
  marketIntegration: PropTypes.shape({
    price_correlation: PropTypes.object,
    accessibility: PropTypes.object
  }),
  networkMetrics: PropTypes.shape({
    centrality: PropTypes.object,
    clustering: PropTypes.number,
    health: PropTypes.object
  }),
  spatialAutocorrelation: PropTypes.shape({
    global: PropTypes.shape({
      moran_i: PropTypes.number
    })
  }),
  selectedRegion: PropTypes.string
};

export default React.memo(MarketHealthMetrics);
