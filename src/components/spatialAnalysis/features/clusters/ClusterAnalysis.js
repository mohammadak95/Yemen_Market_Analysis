import React, { useState, useMemo } from 'react';
import {
  Grid,
  Paper,
  Typography,
  Box,
  Divider
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useSelector } from 'react-redux';

import ClusterMap from '../../organisms/ClusterMap';
import MetricCard from '../../atoms/MetricCard';
import MetricProgress from '../../molecules/MetricProgress';

import { calculateClusterMetrics } from './utils/clusterCalculations';

import {
  selectTimeSeriesData,
  selectGeometryData,
  selectMarketClusters
} from '../../../../selectors/optimizedSelectors';

const ClusterAnalysis = () => {
  const theme = useTheme();
  const [selectedClusterId, setSelectedClusterId] = useState(null);

  // Get data from selectors
  const timeSeriesData = useSelector(selectTimeSeriesData);
  const geometry = useSelector(selectGeometryData);
  const rawClusters = useSelector(selectMarketClusters);

  // Calculate enhanced metrics
  const { clusters: enhancedClusters, metrics: overallMetrics } = useMemo(() => 
    calculateClusterMetrics(rawClusters, timeSeriesData),
    [rawClusters, timeSeriesData]
  );

  // Get selected cluster
  const selectedCluster = useMemo(() => 
    enhancedClusters?.find(c => c.cluster_id === selectedClusterId),
    [enhancedClusters, selectedClusterId]
  );

  return (
    <Grid container spacing={2}>
      {/* Map View */}
      <Grid item xs={12}>
        <Paper sx={{ height: 500 }}>
          <ClusterMap
            clusters={enhancedClusters}
            selectedClusterId={selectedClusterId}
            onClusterSelect={setSelectedClusterId}
            geometry={geometry}
            defaultCenter={[15.3694, 44.1910]} // Yemen coordinates
            defaultZoom={6.5}
            disablePanning={true}
          />
        </Paper>
      </Grid>

      {/* Metrics Overview */}
      <Grid item xs={12}>
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Market Integration Overview
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={3}>
              <MetricProgress
                title="System Integration"
                value={overallMetrics?.systemIntegration || 0}
                description="Overall market integration level"
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <MetricProgress
                title="System Stability"
                value={overallMetrics?.systemStability || 0}
                description="Overall price stability"
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <MetricProgress
                title="System Resilience"
                value={overallMetrics?.systemResilience || 0}
                description="Overall market resilience"
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <MetricCard
                title="Total Markets"
                value={overallMetrics?.totalMarkets || 0}
                format="integer"
                description="Number of markets analyzed"
              />
            </Grid>
          </Grid>
        </Paper>
      </Grid>

      {/* Selected Cluster Details */}
      {selectedCluster && (
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              {selectedCluster.main_market} Market Cluster
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={3}>
                <MetricCard
                  title="Markets in Cluster"
                  value={selectedCluster.metrics.marketCount}
                  format="integer"
                  description="Number of connected markets"
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <MetricCard
                  title="Integration Score"
                  value={selectedCluster.metrics.integrationScore}
                  format="percentage"
                  description="Market integration level"
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <MetricCard
                  title="Stability Score"
                  value={selectedCluster.metrics.stabilityScore}
                  format="percentage"
                  description="Price stability level"
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <MetricCard
                  title="Price Volatility"
                  value={selectedCluster.metrics.priceVolatility}
                  format="percentage"
                  description="Price variation level"
                />
              </Grid>
            </Grid>
          </Paper>
        </Grid>
      )}

      {/* About Section */}
      <Grid item xs={12}>
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            About Market Integration Analysis
          </Typography>
          <Typography variant="body1" paragraph>
            Market integration analysis examines the interconnectedness and efficiency of Yemen's market system. 
            This analysis identifies market clusters based on price co-movement patterns and trade relationships, 
            helping to understand how well different markets are connected and how effectively price signals 
            propagate through the system.
          </Typography>
          <Divider sx={{ my: 2 }} />
          <Typography variant="h6" gutterBottom>
            Integration Metrics Explained
          </Typography>
          <Typography variant="body2" paragraph>
            • Integration Score: Measures how well a market is connected to other markets in the system
          </Typography>
          <Typography variant="body2" paragraph>
            • Stability Score: Indicates the consistency of prices within a market cluster
          </Typography>
          <Typography variant="body2" paragraph>
            • System Resilience: Combines integration and stability to assess overall market health
          </Typography>
        </Paper>
      </Grid>
    </Grid>
  );
};

export default React.memo(ClusterAnalysis);
