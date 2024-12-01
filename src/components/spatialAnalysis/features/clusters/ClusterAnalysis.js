import React, { useState, useCallback } from 'react';
import { 
  Grid, 
  Paper, 
  Typography,
  Box
} from '@mui/material';
import { useTheme } from '@mui/material/styles';

import ClusterMap from '../../organisms/ClusterMap';
import MetricCard from '../../atoms/MetricCard';
import MetricProgress from '../../molecules/MetricProgress';
import ClusterMetricsPanel from './ClusterMetricsPanel';

import { useClusterAnalysis } from '../../hooks/useClusterAnalysis';
import { useSelector } from 'react-redux';
import { selectGeometryData } from '../../../../selectors/optimizedSelectors';

const ClusterAnalysis = () => {
  const theme = useTheme();
  const [selectedClusterId, setSelectedClusterId] = useState(null);

  // Get data using the hook
  const { clusters, metrics, loading, error } = useClusterAnalysis();
  const geometry = useSelector(selectGeometryData);

  // Handle cluster selection
  const handleClusterSelect = useCallback((clusterId) => {
    setSelectedClusterId(clusterId === selectedClusterId ? null : clusterId);
  }, [selectedClusterId]);

  // Get selected cluster
  const selectedCluster = clusters?.find(c => c.cluster_id === selectedClusterId);

  // Show loading state
  if (loading) {
    return (
      <Box sx={{ p: 2 }}>
        <MetricProgress message="Loading cluster analysis..." />
      </Box>
    );
  }

  // Show error state
  if (error) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  return (
    <Grid container spacing={2}>
      {/* Overview Metrics */}
      <Grid item xs={12}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <MetricCard
              title="Total Markets"
              value={metrics?.totalMarkets || 0}
              format="number"
              description="Total number of markets"
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <MetricCard
              title="Average Price"
              value={metrics?.avgPrice || 0}
              format="currency"
              description="Average price across all markets"
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <MetricCard
              title="Average Conflict"
              value={metrics?.avgConflict || 0}
              format="number"
              description="Average conflict intensity"
            />
          </Grid>
        </Grid>
      </Grid>

      {/* Map and Analysis */}
      <Grid item xs={12} md={8}>
        <Paper sx={{ height: 600, p: 2 }}>
          <ClusterMap
            clusters={clusters}
            selectedClusterId={selectedClusterId}
            onClusterSelect={handleClusterSelect}
            geometry={geometry}
          />
        </Paper>
      </Grid>

      {/* Metrics Panel */}
      <Grid item xs={12} md={4}>
        <ClusterMetricsPanel
          selectedCluster={selectedCluster}
        />
      </Grid>

      {/* Cluster Summary */}
      <Grid item xs={12}>
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Cluster Summary
          </Typography>
          <Typography variant="body2" color="textSecondary">
            The analysis shows {clusters?.length || 0} distinct market clusters in Yemen. 
            {selectedCluster ? (
              ` The selected ${selectedCluster.main_market} cluster contains ${selectedCluster.connected_markets.length} markets 
              with an average price of ${selectedCluster.metrics.avgPrice.toFixed(2)} USD and conflict intensity of 
              ${selectedCluster.metrics.avgConflict.toFixed(2)}.`
            ) : ' Select a cluster on the map to view detailed metrics.'}
          </Typography>
        </Paper>
      </Grid>
    </Grid>
  );
};

export default React.memo(ClusterAnalysis);
