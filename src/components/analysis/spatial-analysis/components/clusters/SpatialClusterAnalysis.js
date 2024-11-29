//src/components/analysis/spatial-analysis/components/clusters/SpatialClusterAnalysis.js

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
  Tab,
  CircularProgress,
  Divider,
  Chip
} from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import { useTheme } from '@mui/material/styles';
import useClusterAnalysis from '../../hooks/useClusterAnalysis';
import useClusterEfficiency from '../../hooks/useClusterEfficiency';
import ClusterMap from './ClusterMap';
import ClusterMetricsPanel from './ClusterMetricsPanel';
import EfficiencyExplanation from './EfficiencyExplanation';
import ClusterComparisonTable from './ClusterComparisonTable';

const SummaryMetric = ({ label, value, format = 'number', color, icon }) => (
  <Card sx={{ height: '100%' }}>
    <CardContent>
      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
        {label}
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        <Typography variant="h4">
          {format === 'percentage' ? `${(value * 100).toFixed(1)}%` : value}
        </Typography>
        {icon && (
          <Box component="span" sx={{ ml: 1, color: `${color}.main` }}>
            {icon}
          </Box>
        )}
      </Box>
    </CardContent>
  </Card>
);

const SpatialClusterAnalysis = ({ 
  spatialData, 
  marketClusters, 
  geometry
}) => {
  const theme = useTheme();
  const [selectedClusterId, setSelectedClusterId] = useState(null);
  const [comparisonClusterId, setComparisonClusterId] = useState(null);
  const [currentTab, setCurrentTab] = useState(0);
  const [loading, setLoading] = useState(false);

  // Process cluster data using both hooks
  const { 
    clusters: processedClusters, 
    metrics: analysisMetrics, 
    error: analysisError, 
    isValid 
  } = useClusterAnalysis(marketClusters, spatialData?.flowMaps, geometry);

  const { 
    clusters: efficiencyClusters, 
    metrics: efficiencyMetrics 
  } = useClusterEfficiency(marketClusters, spatialData?.flowMaps);

  // Combine metrics
  const combinedMetrics = useMemo(() => ({
    averageEfficiency: (analysisMetrics.averageEfficiency + efficiencyMetrics.averageEfficiency) / 2,
    totalCoverage: Math.max(analysisMetrics.totalCoverage, efficiencyMetrics.totalCoverage),
    networkDensity: analysisMetrics.networkDensity,
    clusterCount: processedClusters.length
  }), [analysisMetrics, efficiencyMetrics, processedClusters]);

  // Selected clusters
  const selectedCluster = useMemo(() => 
    processedClusters.find(c => c.cluster_id === selectedClusterId),
    [processedClusters, selectedClusterId]
  );

  const comparisonCluster = useMemo(() => 
    processedClusters.find(c => c.cluster_id === comparisonClusterId),
    [processedClusters, comparisonClusterId]
  );

  // Calculate statistics
  const statistics = useMemo(() => {
    if (!processedClusters?.length) return null;

    const efficiencies = processedClusters.map(c => c.metrics.efficiency);
    return {
      avgEfficiency: _.mean(efficiencies),
      maxEfficiency: Math.max(...efficiencies),
      minEfficiency: Math.min(...efficiencies),
      totalMarkets: processedClusters.reduce((sum, c) => sum + c.markets.length, 0),
      highPerforming: efficiencies.filter(e => e >= 0.7).length,
      lowPerforming: efficiencies.filter(e => e < 0.4).length,
      volatility: calculateVolatility(processedClusters)
    };
  }, [processedClusters]);

  // Handle cluster selection
  const handleClusterSelect = (clusterId) => {
    if (selectedClusterId === clusterId) {
      setSelectedClusterId(null);
      setComparisonClusterId(null);
    } else if (selectedClusterId === null) {
      setSelectedClusterId(clusterId);
    } else {
      setComparisonClusterId(clusterId);
    }
  };

  // Error state
  if (analysisError) {
    return (
      <Alert 
        severity="error" 
        sx={{ m: 2 }}
        action={
          <IconButton
            color="inherit"
            size="small"
            onClick={() => window.location.reload()}
          >
            Retry
          </IconButton>
        }
      >
        Error analyzing market clusters: {analysisError}
      </Alert>
    );
  }

  // Loading/empty state
  if (!isValid || !processedClusters?.length) {
    return (
      <Alert severity="warning" sx={{ m: 2 }}>
        No valid market cluster data available for analysis.
      </Alert>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Grid container spacing={3}>
        {/* Header */}
        <Grid item xs={12}>
          <Box sx={{ mb: 3 }}>
            <Typography variant="h5" gutterBottom>
              Market Cluster Analysis
              <Tooltip title="Analysis of market groupings based on price patterns and trade flows">
                <IconButton size="small" sx={{ ml: 1 }}>
                  <InfoIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Typography>
            
            <Typography variant="body2" color="text.secondary">
              Analyzing {processedClusters.length} market clusters across {statistics.totalMarkets} markets
            </Typography>
          </Box>

          <Tabs 
            value={currentTab} 
            onChange={(e, newValue) => setCurrentTab(newValue)}
            sx={{ 
              borderBottom: 1, 
              borderColor: 'divider',
              mb: 3
            }}
          >
            <Tab label="Spatial Analysis" />
            <Tab label="Cluster Metrics" />
            <Tab label="Methodology" />
          </Tabs>
        </Grid>

        {currentTab === 0 && (
          <>
            {/* Summary Metrics */}
            <Grid item xs={12}>
              <Grid container spacing={2}>
                <Grid item xs={12} md={3}>
                  <SummaryMetric
                    label="Total Clusters"
                    value={processedClusters.length}
                    color="primary"
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <SummaryMetric
                    label="Average Efficiency"
                    value={statistics.avgEfficiency}
                    format="percentage"
                    color="success"
                    icon={statistics.avgEfficiency >= 0.7 && <TrendingUpIcon />}
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <SummaryMetric
                    label="Market Coverage"
                    value={combinedMetrics.totalCoverage}
                    format="percentage"
                    color="info"
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <SummaryMetric
                    label="Network Density"
                    value={combinedMetrics.networkDensity}
                    format="percentage"
                    color="secondary"
                  />
                </Grid>
              </Grid>
            </Grid>

            {/* Map and Details */}
            <Grid item xs={12} md={8}>
              <Paper sx={{ height: '600px', position: 'relative' }}>
                {loading ? (
                  <Box sx={{ 
                    position: 'absolute', 
                    top: 0, 
                    left: 0, 
                    right: 0, 
                    bottom: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: 'rgba(255,255,255,0.8)'
                  }}>
                    <CircularProgress />
                  </Box>
                ) : (
                  <ClusterMap
                    clusters={processedClusters}
                    selectedClusterId={selectedClusterId}
                    onClusterSelect={handleClusterSelect}
                    geometry={geometry}
                  />
                )}
              </Paper>
            </Grid>

            <Grid item xs={12} md={4}>
              <ClusterMetricsPanel
                selectedCluster={selectedCluster}
                comparisonCluster={comparisonCluster}
                overallMetrics={statistics}
              />
            </Grid>

            {/* Cluster Comparison */}
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Cluster Comparison
                  </Typography>
                  <ClusterComparisonTable 
                    clusters={processedClusters} 
                    selectedClusterId={selectedClusterId}
                  />
                </CardContent>
              </Card>
            </Grid>
          </>
        )}

        {currentTab === 1 && (
          <Grid item xs={12}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Detailed Cluster Metrics
              </Typography>
              {/* Add detailed metrics components */}
            </Paper>
          </Grid>
        )}

        {currentTab === 2 && (
          <Grid item xs={12}>
            <EfficiencyExplanation />
          </Grid>
        )}
      </Grid>
    </Box>
  );
};

const calculateVolatility = (clusters) => {
  if (!clusters?.length) return 0;
  const efficiencies = clusters.map(c => c.metrics.efficiency);
  const mean = _.mean(efficiencies);
  return Math.sqrt(_.meanBy(efficiencies, e => Math.pow(e - mean, 2)));
};

export default React.memo(SpatialClusterAnalysis);