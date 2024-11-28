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
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import { useTheme } from '@mui/material/styles';
import { EfficiencyRadarChart } from './index';

const MetricProgress = React.memo(({ value, label, description, threshold = { low: 0.4, high: 0.7 } }) => {
  const theme = useTheme();
  
  const color = useMemo(() => {
    if (typeof value !== 'number' || isNaN(value)) return 'warning';
    return value >= threshold.high ? 'success' :
           value >= threshold.low ? 'warning' : 'error';
  }, [value, threshold]);

  const safeValue = typeof value === 'number' && !isNaN(value) ? 
    Math.min(Math.max(value, 0), 1) : 0;

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
            value={safeValue * 100}
            color={color}
            sx={{ 
              height: 8, 
              borderRadius: 4,
              bgcolor: theme.palette.grey[200]
            }}
          />
        </Box>
        <Typography variant="body2" color={`${color}.main`}>
          {(safeValue * 100).toFixed(1)}%
        </Typography>
      </Box>
    </Box>
  );
});

const ClusterMetricsList = React.memo(({ cluster }) => {
  if (!cluster?.metrics) return null;

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
      key: 'flow_density',
      label: 'Flow Density',
      description: 'Intensity of trade flows within the cluster'
    }
  ];

  return (
    <List dense>
      {metrics.map(({ key, label, description }) => (
        <ListItem key={key} sx={{ px: 0 }}>
          <ListItemText
            primary={
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Typography variant="body2">{label}</Typography>
                <Tooltip title={description}>
                  <IconButton size="small" sx={{ ml: 0.5 }}>
                    <InfoIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
            }
            secondary={
              <Typography 
                variant="body2" 
                color="text.secondary"
              >
                {((cluster.metrics[key] || 0) * 100).toFixed(1)}%
              </Typography>
            }
          />
        </ListItem>
      ))}
    </List>
  );
});

const MarketList = React.memo(({ markets }) => {
  if (!markets?.length) return null;

  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="subtitle2" gutterBottom>
        Connected Markets
      </Typography>
      <Box 
        sx={{ 
          display: 'flex', 
          flexWrap: 'wrap', 
          gap: 0.5 
        }}
      >
        {markets.map(market => (
          <Box
            key={market}
            sx={{
              px: 1,
              py: 0.5,
              bgcolor: 'action.hover',
              borderRadius: 1,
              fontSize: '0.875rem'
            }}
          >
            {market}
          </Box>
        ))}
      </Box>
    </Box>
  );
});

const ClusterMetricsPanel = ({ 
  selectedCluster, 
  comparisonCluster,
  overallMetrics
}) => {
  const theme = useTheme();

  const aggregateStats = useMemo(() => {
    if (!overallMetrics) return null;
    
    return {
      totalClusters: overallMetrics.totalClusters || 0,
      avgEfficiency: overallMetrics.averageEfficiency || 0,
      highPerforming: overallMetrics.clusterStats?.highPerforming || 0,
      lowPerforming: overallMetrics.clusterStats?.lowPerforming || 0
    };
  }, [overallMetrics]);

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
        <Typography variant="h6" gutterBottom>
          Cluster Analysis: {selectedCluster.main_market}
          {selectedCluster.metrics?.efficiency >= 0.7 && (
            <TrendingUpIcon 
              sx={{ 
                ml: 1, 
                color: theme.palette.success.main, 
                verticalAlign: 'bottom' 
              }} 
            />
          )}
        </Typography>

        {/* Overall Statistics */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={6} sm={3}>
            <Typography variant="subtitle2" color="text.secondary">
              Markets
            </Typography>
            <Typography variant="h4">
              {selectedCluster.markets?.length || 0}
            </Typography>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Typography variant="subtitle2" color="text.secondary">
              Efficiency
            </Typography>
            <Typography variant="h4">
              {((selectedCluster.metrics?.efficiency || 0) * 100).toFixed(1)}%
            </Typography>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Typography variant="subtitle2" color="text.secondary">
              Flow Strength
            </Typography>
            <Typography variant="h4">
              {((selectedCluster.metrics?.total_flow || 0) / 1000).toFixed(1)}K
            </Typography>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Typography variant="subtitle2" color="text.secondary">
              Price Stability
            </Typography>
            <Typography variant="h4">
              {((1 - (selectedCluster.metrics?.price_volatility || 0)) * 100).toFixed(1)}%
            </Typography>
          </Grid>
        </Grid>

        <Divider sx={{ my: 2 }} />

        {/* Efficiency Radar Chart */}
        <Typography variant="subtitle1" gutterBottom>
          Efficiency Metrics
        </Typography>
        <EfficiencyRadarChart
          cluster={selectedCluster}
          compareCluster={comparisonCluster}
        />

        <Divider sx={{ my: 2 }} />

        {/* Detailed Metrics */}
        <Typography variant="subtitle1" gutterBottom>
          Detailed Performance
        </Typography>
        <ClusterMetricsList cluster={selectedCluster} />

        {/* Connected Markets */}
        <MarketList markets={selectedCluster.markets} />

        <Divider sx={{ my: 2 }} />

        {/* Analysis Summary */}
        <Typography variant="subtitle1" gutterBottom>
          Analysis Summary
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {interpretClusterPerformance(selectedCluster, aggregateStats)}
        </Typography>
      </CardContent>
    </Card>
  );
};

const interpretClusterPerformance = (cluster, stats) => {
  if (!cluster?.metrics || !stats) return '';

  const efficiency = cluster.metrics.efficiency;
  const relativeSize = cluster.markets.length / (stats.totalClusters || 1);

  if (efficiency >= 0.7) {
    return `This is a high-performing cluster showing strong market integration and efficient price transmission. 
    With ${cluster.markets.length} connected markets (${(relativeSize * 100).toFixed(1)}% of total), 
    it demonstrates robust trade flows and price stability.`;
  } else if (efficiency >= 0.4) {
    return `This cluster shows moderate performance with some integration challenges. 
    While maintaining connections between ${cluster.markets.length} markets, there is room for 
    improving price transmission and trade flow efficiency.`;
  } else {
    return `This cluster shows significant integration challenges, indicating potential barriers 
    to trade or market fragmentation. Targeted interventions may be needed to improve market 
    connectivity and price transmission efficiency.`;
  }
};

export default React.memo(ClusterMetricsPanel);