// src/components/analysis/spatial-analysis/components/clusters/ClusterMetricsPanel.js

import React, { useMemo } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Grid,
  LinearProgress,
  Tooltip,
  IconButton,
  Divider,
} from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import { useTheme } from '@mui/material/styles';
import { useSelector } from 'react-redux';
import { selectClusterMetrics } from '../../../../selectors/clusterSelectors';

const MetricProgress = React.memo(({ value, label, description, threshold = { low: 0.4, high: 0.7 } }) => {
  const color = useMemo(() => {
    return value >= threshold.high ? 'success' :
           value >= threshold.low ? 'warning' : 'error';
  }, [value, threshold]);

  return (
    <Box sx={{ mb: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
        <Typography variant="body2" color="text.secondary">
          {label}
        </Typography>
        <Tooltip title={description}>
          <IconButton size="small" sx={{ ml: 0.5 }}>
            <InfoIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        <Box sx={{ flex: 1, mr: 1 }}>
          <LinearProgress
            variant="determinate"
            value={value * 100}
            color={color}
            sx={{ height: 8, borderRadius: 4 }}
          />
        </Box>
        <Typography variant="body2" color={`${color}.main`}>
          {(value * 100).toFixed(1)}%
        </Typography>
      </Box>
    </Box>
  );
});

const ClusterMetricsPanel = React.memo(() => {
  const theme = useTheme();
  const metrics = useSelector(selectClusterMetrics);

  const aggregateStats = useMemo(() => {
    if (!metrics?.length) return null;
    const totalMarkets = metrics.reduce((sum, m) => sum + m.marketCount, 0);
    const avgEfficiency = metrics.reduce((sum, m) => sum + m.efficiency, 0) / metrics.length;
    const avgCorrelation = metrics.reduce((sum, m) => sum + m.avgPriceCorrelation, 0) / metrics.length;
    const avgDispersion = metrics.reduce((sum, m) => sum + m.priceDispersion, 0) / metrics.length;
    return { totalMarkets, avgEfficiency, avgCorrelation, avgDispersion };
  }, [metrics]);

  const interpretClusterMetrics = useMemo(() => {
    if (!metrics?.length) return '';
    const highEfficiency = metrics.filter((m) => m.efficiency >= 0.7).length;
    const lowEfficiency = metrics.filter((m) => m.efficiency < 0.4).length;
    const { avgEfficiency, avgDispersion } = aggregateStats;

    if (avgEfficiency >= 0.7) {
      return `Strong market integration with ${highEfficiency} highly efficient clusters indicates effective price transmission and trade flows. Low price dispersion (${(avgDispersion * 100).toFixed(1)}%) suggests well-functioning markets.`;
    } else if (avgEfficiency >= 0.4) {
      return `Moderate market integration with mixed performance across clusters. ${highEfficiency} high-performing and ${lowEfficiency} low-performing clusters suggest regional variations in market efficiency.`;
    } else {
      return `Limited market integration with ${lowEfficiency} underperforming clusters indicates significant barriers to trade and price transmission. High price dispersion (${(avgDispersion * 100).toFixed(1)}%) suggests market fragmentation.`;
    }
  }, [metrics, aggregateStats]);

  if (!metrics?.length) {
    return (
      <Card>
        <CardContent>
          <Typography color="text.secondary">
            No cluster metrics available
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Cluster Performance Metrics
          <Tooltip title="Analysis of market cluster efficiency and integration patterns">
            <IconButton size="small" sx={{ ml: 1 }}>
              <InfoIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Typography>

        {/* Overall Statistics */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={6}>
            <Typography variant="subtitle2" color="text.secondary">
              Total Clusters
            </Typography>
            <Typography variant="h4">
              {metrics.length}
            </Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="subtitle2" color="text.secondary">
              Total Markets
            </Typography>
            <Typography variant="h4">
              {aggregateStats.totalMarkets}
            </Typography>
          </Grid>
        </Grid>

        <Divider sx={{ my: 2 }} />

        {/* Network-wide Metrics */}
        <Typography variant="subtitle2" gutterBottom>
          Network-wide Performance
        </Typography>

        <MetricProgress
          value={aggregateStats.avgEfficiency}
          label="Average Cluster Efficiency"
          description="Overall efficiency of market clusters in price transmission and trade flows"
        />

        <MetricProgress
          value={aggregateStats.avgCorrelation}
          label="Price Integration"
          description="Average price correlation between markets within clusters"
        />

        <MetricProgress
          value={1 - aggregateStats.avgDispersion}
          label="Price Stability"
          description="Inverse of price dispersion across clusters (higher is better)"
        />

        <Divider sx={{ my: 2 }} />

        {/* Individual Cluster Metrics */}
        <Typography variant="subtitle2" gutterBottom>
          Individual Cluster Performance
        </Typography>

        {metrics
          .slice()
          .sort((a, b) => b.efficiency - a.efficiency)
          .map((metric, index) => (
            <Box key={index} sx={{ mb: 2 }}>
              <Typography variant="subtitle2">
                Cluster {metric.id} ({metric.mainMarket})
                {metric.efficiency >= 0.7 && (
                  <TrendingUpIcon
                    sx={{ ml: 1, color: theme.palette.success.main, fontSize: 16 }}
                  />
                )}
                {metric.efficiency < 0.4 && (
                  <TrendingDownIcon
                    sx={{ ml: 1, color: theme.palette.error.main, fontSize: 16 }}
                  />
                )}
              </Typography>

              <Grid container spacing={1} sx={{ mt: 0.5 }}>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    Markets: {metric.marketCount}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    Efficiency: {(metric.efficiency * 100).toFixed(1)}%
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    Integration: {(metric.avgPriceCorrelation * 100).toFixed(1)}%
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    Dispersion: {(metric.priceDispersion * 100).toFixed(1)}%
                  </Typography>
                </Grid>
              </Grid>

              {metric.conflictImpact !== undefined && (
                <Box sx={{ mt: 0.5 }}>
                  <Typography variant="caption" color="text.secondary">
                    Conflict Impact:{' '}
                    {Math.abs(metric.conflictImpact) > 0.7
                      ? 'High'
                      : Math.abs(metric.conflictImpact) > 0.4
                      ? 'Moderate'
                      : 'Low'}
                  </Typography>
                </Box>
              )}
            </Box>
          ))}

        <Divider sx={{ my: 2 }} />

        {/* Economic Implications */}
        <Typography variant="subtitle2" gutterBottom>
          Economic Implications
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {interpretClusterMetrics}
        </Typography>
      </CardContent>
    </Card>
  );
});

export default ClusterMetricsPanel;
