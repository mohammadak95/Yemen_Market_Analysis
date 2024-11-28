// src/components/analysis/spatial-analysis/components/clusters/SpatialClusterAnalysis.js

import React, { useState, useMemo } from 'react';
import { 
  Grid, 
  Paper, 
  Typography, 
  Card,
  CardContent,
  Box,
  Alert,
  Tooltip,
  IconButton,
  Tabs,
  Tab
} from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';
import { useTheme } from '@mui/material/styles';
import useClusterAnalysis from '../../hooks/useClusterAnalysis';
import ClusterMap from './ClusterMap';
import ClusterMetricsPanel from './ClusterMetricsPanel';
import EfficiencyExplanation from './EfficiencyExplanation';

const SpatialClusterAnalysis = ({ 
  spatialData, 
  marketClusters, 
  geometry 
}) => {
  const theme = useTheme();
  const [selectedClusterId, setSelectedClusterId] = useState(null);
  const [comparisonClusterId, setComparisonClusterId] = useState(null);
  const [currentTab, setCurrentTab] = useState(0);

  // Process cluster data using the hook
  const { 
    clusters: processedClusters, 
    metrics: overallMetrics, 
    error, 
    isValid 
  } = useClusterAnalysis(marketClusters, spatialData?.flowMaps, geometry);

  // Get selected and comparison clusters
  const selectedCluster = useMemo(() => 
    processedClusters.find(c => c.cluster_id === selectedClusterId),
    [processedClusters, selectedClusterId]
  );

  const comparisonCluster = useMemo(() => 
    processedClusters.find(c => c.cluster_id === comparisonClusterId),
    [processedClusters, comparisonClusterId]
  );

  // Calculate comparative statistics
  const statistics = useMemo(() => {
    if (!processedClusters?.length) return null;

    const efficiencies = processedClusters.map(c => c.metrics.efficiency);
    return {
      avgEfficiency: efficiencies.reduce((a, b) => a + b, 0) / efficiencies.length,
      maxEfficiency: Math.max(...efficiencies),
      minEfficiency: Math.min(...efficiencies),
      totalMarkets: processedClusters.reduce((sum, c) => sum + c.markets.length, 0),
      highPerforming: efficiencies.filter(e => e >= 0.7).length,
      lowPerforming: efficiencies.filter(e => e < 0.4).length
    };
  }, [processedClusters]);

  // Handle cluster selection
  const handleClusterSelect = (clusterId) => {
    if (selectedClusterId === clusterId) {
      setSelectedClusterId(null);
    } else if (selectedClusterId === null) {
      setSelectedClusterId(clusterId);
    } else {
      setComparisonClusterId(clusterId);
    }
  };

  // Show error state
  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        Error analyzing market clusters: {error}
      </Alert>
    );
  }

  // Show loading/empty state
  if (!isValid || !processedClusters?.length) {
    return (
      <Alert severity="warning" sx={{ m: 2 }}>
        No valid market cluster data available for analysis.
      </Alert>
    );
  }

  return (
    <Grid container spacing={3}>
      {/* Header Section */}
      <Grid item xs={12}>
        <Paper sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              Market Cluster Analysis
              <Tooltip title="Analysis of market groupings based on price patterns and trade flows">
                <IconButton size="small" sx={{ ml: 1 }}>
                  <InfoIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Typography>
          </Box>

          <Tabs 
            value={currentTab} 
            onChange={(e, newValue) => setCurrentTab(newValue)}
            sx={{ borderBottom: 1, borderColor: 'divider' }}
          >
            <Tab label="Spatial View" />
            <Tab label="Analysis" />
            <Tab label="Methodology" />
          </Tabs>
        </Paper>
      </Grid>

      {/* Main Content */}
      {currentTab === 0 && (
        <>
          {/* Map and Metrics View */}
          <Grid item xs={12} md={8}>
            <Paper sx={{ p: 2, height: '600px' }}>
              <ClusterMap
                clusters={processedClusters}
                selectedClusterId={selectedClusterId}
                onClusterSelect={handleClusterSelect}
                geometry={geometry}
              />
            </Paper>
          </Grid>

          <Grid item xs={12} md={4}>
            <ClusterMetricsPanel
              selectedCluster={selectedCluster}
              comparisonCluster={comparisonCluster}
              overallMetrics={statistics}
            />
          </Grid>

          {/* Overall Statistics */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Market Integration Overview
                </Typography>
                <Grid container spacing={3}>
                  <Grid item xs={12} md={3}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Total Clusters
                    </Typography>
                    <Typography variant="h4">
                      {processedClusters.length}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Average Efficiency
                    </Typography>
                    <Typography variant="h4">
                      {(statistics.avgEfficiency * 100).toFixed(1)}%
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <Typography variant="subtitle2" color="text.secondary">
                      High Performing
                    </Typography>
                    <Typography variant="h4" color="success.main">
                      {statistics.highPerforming}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Total Markets
                    </Typography>
                    <Typography variant="h4">
                      {statistics.totalMarkets}
                    </Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </>
      )}

      {/* Analysis View */}
      {currentTab === 1 && (
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Detailed Cluster Analysis
            </Typography>
            {/* Add detailed analysis components here */}
          </Paper>
        </Grid>
      )}

      {/* Methodology View */}
      {currentTab === 2 && (
        <Grid item xs={12}>
          <EfficiencyExplanation />
        </Grid>
      )}
    </Grid>
  );
};

export default React.memo(SpatialClusterAnalysis);