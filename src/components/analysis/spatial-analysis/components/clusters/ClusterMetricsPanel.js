//src/components/analysis/spatial-analysis/components/clusters/ClusterMetricsPanel.js

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
  Chip,
  Button
} from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import { useTheme } from '@mui/material/styles';
import { EfficiencyRadarChart } from './index';

const MetricProgress = React.memo(({ 
  value, 
  label, 
  description, 
  threshold = { low: 0.4, high: 0.7 },
  showTrend = true
}) => {
  const theme = useTheme();
  
  const { color, icon } = useMemo(() => {
    if (typeof value !== 'number' || isNaN(value)) {
      return { color: 'warning', icon: null };
    }
    if (value >= threshold.high) {
      return { 
        color: 'success',
        icon: showTrend && <TrendingUpIcon fontSize="small" sx={{ ml: 1, color: 'success.main' }} />
      };
    }
    if (value >= threshold.low) {
      return { color: 'warning', icon: null };
    }
    return { 
      color: 'error',
      icon: showTrend && <TrendingDownIcon fontSize="small" sx={{ ml: 1, color: 'error.main' }} />
    };
  }, [value, threshold, showTrend, theme]);

  const safeValue = typeof value === 'number' && !isNaN(value) ? 
    Math.min(Math.max(value, 0), 1) : 0;

  return (
    <Box sx={{ mb: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
        <Typography variant="body2" color="text.secondary">
          {label}
        </Typography>
        {icon}
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
            value={safeValue * 100}
            color={color}
            sx={{ 
              height: 8, 
              borderRadius: 4,
              bgcolor: theme.palette.grey[200],
              '& .MuiLinearProgress-bar': {
                borderRadius: 4
              }
            }}
          />
        </Box>
        <Typography variant="body2" color={`${color}.main`} sx={{ minWidth: 45 }}>
          {(safeValue * 100).toFixed(1)}%
        </Typography>
      </Box>
    </Box>
  );
});

const SummaryStatistics = React.memo(({ cluster }) => {
  const stats = [
    {
      label: 'Markets',
      value: cluster.markets?.length || 0,
      format: 'number'
    },
    {
      label: 'Efficiency',
      value: (cluster.metrics?.efficiency || 0) * 100,
      format: 'percentage'
    },
    {
      label: 'Flow Strength',
      value: ((cluster.metrics?.total_flow || 0) / 1000),
      format: 'kilo'
    },
    {
      label: 'Price Stability',
      value: (1 - (cluster.metrics?.price_volatility || 0)) * 100,
      format: 'percentage'
    }
  ];

  return (
    <Grid container spacing={2}>
      {stats.map(({ label, value, format }) => (
        <Grid item xs={6} md={3} key={label}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            {label}
          </Typography>
          <Typography variant="h4">
            {format === 'percentage' ? `${value.toFixed(1)}%` :
             format === 'kilo' ? `${value.toFixed(1)}K` :
             value}
          </Typography>
        </Grid>
      ))}
    </Grid>
  );
});

const MarketList = React.memo(({ markets, mainMarket, onMarketClick }) => {
  if (!markets?.length) return null;

  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="subtitle2" gutterBottom>
        Connected Markets ({markets.length})
      </Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
        {markets.map(market => (
          <Chip
            key={market}
            label={market}
            size="small"
            color={market === mainMarket ? "primary" : "default"}
            variant={market === mainMarket ? "filled" : "outlined"}
            onClick={() => onMarketClick?.(market)}
            sx={{ 
              fontWeight: market === mainMarket ? 500 : 400,
              cursor: 'pointer'
            }}
          />
        ))}
      </Box>
    </Box>
  );
});

const PerformanceMetrics = React.memo(({ cluster }) => {
  const metrics = [
    {
      key: 'internal_connectivity',
      label: 'Internal Connectivity',
      description: 'Measure of market connections within the cluster'
    },
    {
      key: 'coverage',
      label: 'Market Coverage',
      description: 'Proportion of total markets in the cluster'
    },
    {
      key: 'price_convergence',
      label: 'Price Convergence',
      description: 'Uniformity of prices across cluster markets'
    },
    {
      key: 'stability',
      label: 'Market Stability',
      description: 'Consistency of trade flows and prices'
    }
  ];

  return (
    <Box>
      {metrics.map(({ key, label, description }) => (
        <MetricProgress
          key={key}
          label={label}
          description={description}
          value={cluster.metrics?.[key] || 0}
        />
      ))}
    </Box>
  );
});

const ClusterMetricsPanel = ({ 
  selectedCluster, 
  comparisonCluster,
  overallMetrics,
  onMarketClick,
  onCompareClick
}) => {
  const theme = useTheme();

  if (!selectedCluster) {
    return (
      <Card>
        <CardContent>
          <Typography color="text.secondary">
            Select a cluster to view detailed metrics
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <Typography variant="h6">
            {selectedCluster.main_market} Cluster
          </Typography>
          {selectedCluster.metrics?.efficiency >= 0.7 && (
            <TrendingUpIcon sx={{ ml: 1, color: theme.palette.success.main }} />
          )}
          {!comparisonCluster && (
            <Button
              startIcon={<CompareArrowsIcon />}
              onClick={onCompareClick}
              sx={{ ml: 'auto' }}
              size="small"
            >
              Compare
            </Button>
          )}
        </Box>

        {/* Summary Statistics */}
        <SummaryStatistics cluster={selectedCluster} />
        
        <Divider sx={{ my: 3 }} />

        {/* Performance Metrics */}
        <Typography variant="subtitle1" gutterBottom>
          Performance Metrics
        </Typography>
        <PerformanceMetrics cluster={selectedCluster} />

        {/* Radar Chart - only show if we have comparison data */}
        {comparisonCluster && (
          <>
            <Divider sx={{ my: 3 }} />
            <Typography variant="subtitle1" gutterBottom>
              Cluster Comparison
            </Typography>
            <Box sx={{ height: 300, mt: 2 }}>
              <EfficiencyRadarChart 
                cluster={selectedCluster}
                compareCluster={comparisonCluster}
              />
            </Box>
          </>
        )}

        <Divider sx={{ my: 3 }} />

        {/* Market List */}
        <MarketList 
          markets={selectedCluster.markets} 
          mainMarket={selectedCluster.main_market}
          onMarketClick={onMarketClick}
        />

        {/* Analysis Summary */}
        <Divider sx={{ my: 3 }} />
        <Typography variant="subtitle1" gutterBottom>
          Analysis Summary
        </Typography>
        <PerformanceSummary 
          cluster={selectedCluster} 
          stats={overallMetrics}
        />
      </CardContent>
    </Card>
  );
};

const PerformanceSummary = React.memo(({ cluster, stats }) => {
  const efficiency = cluster.metrics?.efficiency || 0;
  const relativeSize = cluster.markets?.length / (stats?.totalClusters || 1);

  let summary = '';
  let color = '';

  if (efficiency >= 0.7) {
    summary = `High-performing cluster with strong market integration and efficient price transmission. 
      ${cluster.markets?.length} connected markets (${(relativeSize * 100).toFixed(1)}% of total) 
      demonstrate robust trade flows and price stability.`;
    color = 'success.main';
  } else if (efficiency >= 0.4) {
    summary = `Moderate performance with some integration challenges. 
      ${cluster.markets?.length} connected markets show potential for improved 
      price transmission and trade flow efficiency.`;
    color = 'warning.main';
  } else {
    summary = `Significant integration challenges present. Potential barriers to trade 
      affecting market connectivity and price transmission efficiency. 
      Consider targeted interventions for improvement.`;
    color = 'error.main';
  }

  return (
    <Box sx={{ mt: 2 }}>
      <Typography 
        variant="body2" 
        sx={{ 
          color,
          fontWeight: 500,
          mb: 1
        }}
      >
        Performance Rating: {efficiency >= 0.7 ? 'High' : efficiency >= 0.4 ? 'Moderate' : 'Low'}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {summary}
      </Typography>
    </Box>
  );
});

export default React.memo(ClusterMetricsPanel);