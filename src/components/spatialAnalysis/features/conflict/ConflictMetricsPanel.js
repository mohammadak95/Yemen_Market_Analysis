import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import {
  Paper,
  Typography,
  Box,
  Divider,
  Grid,
  LinearProgress
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import WarningIcon from '@mui/icons-material/Warning';

import MetricCard from '../../atoms/MetricCard';
import MetricProgress from '../../molecules/MetricProgress';

const ConflictMetricsPanel = ({
  timeSeriesData,
  selectedRegion,
  timeWindow,
  marketIntegration
}) => {
  const theme = useTheme();

  // Calculate metrics for selected region with safe defaults
  const regionMetrics = useMemo(() => {
    if (!selectedRegion || !timeSeriesData?.length) {
      return {
        currentIntensity: 0,
        intensityTrend: 0,
        currentPrice: 0,
        priceTrend: 0,
        accessibility: 0,
        resilience: 0,
        riskLevel: 0
      };
    }

    // Get data for selected region
    const regionData = timeSeriesData.filter(d => 
      d.region === selectedRegion
    ).sort((a, b) => new Date(a.month) - new Date(b.month));

    if (!regionData.length) {
      return {
        currentIntensity: 0,
        intensityTrend: 0,
        currentPrice: 0,
        priceTrend: 0,
        accessibility: 0,
        resilience: 0,
        riskLevel: 0
      };
    }

    // Get current and previous period data
    const currentData = regionData.find(d => d.month === timeWindow) || regionData[regionData.length - 1];
    const previousData = regionData[regionData.length - 2];

    // Ensure we have valid numbers for all metrics
    const currentIntensity = currentData?.conflictIntensity || 0;
    const previousIntensity = previousData?.conflictIntensity || 0;
    const currentPrice = currentData?.usdPrice || 0;
    const previousPrice = previousData?.usdPrice || 0;
    const accessibility = marketIntegration?.accessibility?.[selectedRegion] || 0;

    // Calculate trends with safety checks
    const intensityTrend = previousIntensity ? 
      ((currentIntensity - previousIntensity) / previousIntensity) * 100 : 0;

    const priceTrend = previousPrice ? 
      ((currentPrice - previousPrice) / previousPrice) * 100 : 0;

    // Calculate market resilience
    const resilience = calculateResilience(
      currentIntensity,
      accessibility,
      priceTrend
    );

    // Ensure all values are within valid ranges
    return {
      currentIntensity: Math.max(0, Math.min(1, currentIntensity)),
      intensityTrend: Math.max(-100, Math.min(100, intensityTrend)),
      currentPrice: Math.max(0, currentPrice),
      priceTrend: Math.max(-100, Math.min(100, priceTrend)),
      accessibility: Math.max(0, Math.min(1, accessibility)),
      resilience: Math.max(0, Math.min(1, resilience)),
      riskLevel: calculateRiskLevel(currentIntensity, accessibility)
    };
  }, [selectedRegion, timeSeriesData, timeWindow, marketIntegration]);

  // Calculate temporal patterns with safe defaults
  const temporalPatterns = useMemo(() => {
    if (!selectedRegion || !timeSeriesData?.length) {
      return {
        volatility: 0,
        trend: 0,
        duration: 0,
        peakIntensity: 0
      };
    }

    const regionData = timeSeriesData.filter(d => 
      d.region === selectedRegion
    ).sort((a, b) => new Date(a.month) - new Date(b.month));

    if (regionData.length < 2) {
      return {
        volatility: 0,
        trend: 0,
        duration: regionData.length,
        peakIntensity: regionData[0]?.conflictIntensity || 0
      };
    }

    // Calculate volatility with safety checks
    const intensityValues = regionData.map(d => d.conflictIntensity || 0);
    const meanIntensity = intensityValues.reduce((sum, val) => sum + val, 0) / 
      intensityValues.length || 1; // Avoid division by zero
    const variance = intensityValues.reduce((sum, val) => 
      sum + Math.pow(val - meanIntensity, 2), 0
    ) / intensityValues.length;
    const volatility = meanIntensity ? Math.sqrt(variance) / meanIntensity : 0;

    // Detect trends with safety checks
    const recentData = regionData.slice(-6); // Last 6 months
    const trend = calculateTrend(recentData);

    return {
      volatility: Math.max(0, Math.min(1, volatility)),
      trend: Math.max(-100, Math.min(100, trend)),
      duration: regionData.length,
      peakIntensity: Math.max(0, Math.min(1, Math.max(...intensityValues)))
    };
  }, [selectedRegion, timeSeriesData]);

  // Ensure we have valid values for display
  const safeMetrics = {
    currentIntensity: regionMetrics?.currentIntensity || 0,
    intensityTrend: regionMetrics?.intensityTrend || 0,
    accessibility: regionMetrics?.accessibility || 0,
    resilience: regionMetrics?.resilience || 0,
    riskLevel: regionMetrics?.riskLevel || 0
  };

  if (!selectedRegion) {
    return (
      <Paper sx={{ p: 2, height: '100%' }}>
        <Typography color="textSecondary" align="center">
          Select a region to view conflict impact metrics
        </Typography>
      </Paper>
    );
  }

  if (!regionMetrics) {
    return (
      <Paper sx={{ p: 2, height: '100%' }}>
        <Typography color="textSecondary" align="center">
          No metrics available for selected region
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 2, height: '100%' }}>
      {/* Region Header */}
      <Typography variant="h6" gutterBottom>
        {selectedRegion} Impact Analysis
      </Typography>

      {/* Current Metrics */}
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <MetricProgress
            title="Conflict Impact"
            value={safeMetrics.currentIntensity}
            target={0.5}
            format="percentage"
            description="Current conflict intensity level"
            trend={safeMetrics.intensityTrend}
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <MetricCard
            title="Market Accessibility"
            value={safeMetrics.accessibility}
            format="percentage"
            description="Current market access level"
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <MetricCard
            title="Market Resilience"
            value={safeMetrics.resilience}
            format="percentage"
            description="Market adaptation capacity"
          />
        </Grid>
      </Grid>

      <Divider sx={{ my: 2 }} />

      {/* Risk Assessment */}
      <Typography variant="subtitle2" gutterBottom>
        Risk Assessment
      </Typography>
      <Box sx={{ mb: 2 }}>
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center',
          mb: 1
        }}>
          <WarningIcon 
            sx={{ 
              color: getRiskColor(regionMetrics.riskLevel, theme),
              mr: 1
            }} 
          />
          <Typography variant="body2">
            {getRiskLabel(regionMetrics.riskLevel)}
          </Typography>
        </Box>
        <LinearProgress
          variant="determinate"
          value={regionMetrics.riskLevel * 100}
          sx={{
            height: 8,
            borderRadius: 4,
            backgroundColor: theme.palette.grey[200],
            '& .MuiLinearProgress-bar': {
              backgroundColor: getRiskColor(regionMetrics.riskLevel, theme)
            }
          }}
        />
      </Box>

      {/* Temporal Analysis */}
      {temporalPatterns && (
        <>
          <Typography variant="subtitle2" gutterBottom>
            Temporal Patterns
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <Box>
                <Typography variant="caption" color="textSecondary">
                  Volatility
                </Typography>
                <Typography variant="body1">
                  {(temporalPatterns.volatility * 100).toFixed(1)}%
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={6}>
              <Box>
                <Typography variant="caption" color="textSecondary">
                  Duration
                </Typography>
                <Typography variant="body1">
                  {temporalPatterns.duration} months
                </Typography>
              </Box>
            </Grid>
          </Grid>

          <Box sx={{ mt: 2 }}>
            <Typography variant="caption" color="textSecondary">
              Trend Analysis
            </Typography>
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center',
              color: temporalPatterns.trend > 0 ? 
                theme.palette.error.main : 
                theme.palette.success.main
            }}>
              {temporalPatterns.trend > 0 ? (
                <TrendingUpIcon sx={{ mr: 1 }} />
              ) : (
                <TrendingDownIcon sx={{ mr: 1 }} />
              )}
              <Typography variant="body2">
                {Math.abs(temporalPatterns.trend).toFixed(1)}% per month
              </Typography>
            </Box>
          </Box>
        </>
      )}

      {/* Impact Summary */}
      <Box 
        sx={{ 
          mt: 2,
          p: 1.5,
          bgcolor: theme.palette.grey[50],
          borderRadius: 1
        }}
      >
        <Typography variant="subtitle2" gutterBottom>
          Impact Summary
        </Typography>
        <Typography variant="body2" color="textSecondary">
          {generateImpactSummary(regionMetrics, temporalPatterns)}
        </Typography>
      </Box>
    </Paper>
  );
};

// Helper functions
const calculateResilience = (intensity, accessibility, priceTrend) => {
  // Higher resilience when market remains accessible despite conflict
  const baseResilience = accessibility * (1 - intensity);
  // Adjust for price stability
  const priceStability = 1 - Math.min(Math.abs(priceTrend) / 100, 1);
  return (baseResilience + priceStability) / 2;
};

const calculateRiskLevel = (intensity, accessibility) => {
  // Risk increases with intensity and decreases with accessibility
  return Math.min(intensity * (1 - accessibility) * 1.5, 1);
};

const calculateTrend = (data) => {
  if (data.length < 2) return 0;
  
  const firstValue = data[0].conflictIntensity || 0;
  const lastValue = data[data.length - 1].conflictIntensity || 0;
  const monthsDiff = data.length - 1;

  return monthsDiff > 0 ? 
    ((lastValue - firstValue) / firstValue) * (100 / monthsDiff) : 0;
};

const getRiskColor = (risk, theme) => {
  if (risk >= 0.7) return theme.palette.error.main;
  if (risk >= 0.4) return theme.palette.warning.main;
  return theme.palette.success.main;
};

const getRiskLabel = (risk) => {
  if (risk >= 0.7) return 'High Risk - Severe Market Disruption';
  if (risk >= 0.4) return 'Medium Risk - Significant Impact';
  return 'Low Risk - Manageable Impact';
};

const generateImpactSummary = (metrics, patterns) => {
  const parts = [];

  if (metrics.currentIntensity > 0.7) {
    parts.push('Severe conflict impact with critical market disruption.');
  } else if (metrics.currentIntensity > 0.4) {
    parts.push('Moderate conflict impact affecting market operations.');
  } else {
    parts.push('Limited conflict impact with maintained market function.');
  }

  if (patterns) {
    if (patterns.trend > 0) {
      parts.push('Deteriorating conditions require immediate attention.');
    } else {
      parts.push('Showing signs of stability or improvement.');
    }
  }

  if (metrics.resilience > 0.6) {
    parts.push('Markets demonstrate strong resilience.');
  } else {
    parts.push('Support needed to enhance market resilience.');
  }

  return parts.join(' ');
};

ConflictMetricsPanel.propTypes = {
  timeSeriesData: PropTypes.arrayOf(PropTypes.shape({
    month: PropTypes.string.isRequired,
    region: PropTypes.string.isRequired,
    conflictIntensity: PropTypes.number,
    usdPrice: PropTypes.number
  })).isRequired,
  selectedRegion: PropTypes.string,
  timeWindow: PropTypes.string.isRequired,
  marketIntegration: PropTypes.shape({
    accessibility: PropTypes.object
  })
};

export default React.memo(ConflictMetricsPanel);
