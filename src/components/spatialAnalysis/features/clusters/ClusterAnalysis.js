// src/components/spatialAnalysis/features/clusters/ClusterAnalysis.js

import React, { useState, useCallback, useEffect } from 'react';
import {
  Grid,
  Paper,
  Typography,
  Box,
  Alert,
  useTheme,
  Fade
} from '@mui/material';
import { useSelector } from 'react-redux';
import MouseIcon from '@mui/icons-material/Mouse';

import ClusterMap from '../../organisms/ClusterMap';
import MetricCard from '../../atoms/MetricCard';
import MetricProgress from '../../molecules/MetricProgress';
import { useClustersWithCoordinates } from '../../../../hooks/useSpatialSelectors';
import { selectGeometryData } from '../../../../selectors/optimizedSelectors';
import { useClusterAnalysis } from '../../hooks/useClusterAnalysis';

// Add this new component for the efficiency explanation
const EfficiencyExplanation = ({ efficiencyComponents }) => {
  const theme = useTheme();
  
  useEffect(() => {
    console.debug('Efficiency Components:', efficiencyComponents);
  }, [efficiencyComponents]);
  
  return (
    <Box sx={{ 
      mt: 2,
      p: 2,
      bgcolor: theme.palette.grey[50],
      borderRadius: 1
    }}>
      <Typography variant="subtitle2" gutterBottom>
        Efficiency Components
      </Typography>
      <Grid container spacing={2}>
        <Grid item xs={12} md={3}>
          <Typography variant="caption" color="textSecondary">
            Market Connectivity (40%)
          </Typography>
          <Typography variant="body2">
            {(efficiencyComponents?.connectivity * 100).toFixed(1)}%
          </Typography>
          <Typography variant="caption" color="textSecondary">
            Measures internal market connections
          </Typography>
        </Grid>
        <Grid item xs={12} md={3}>
          <Typography variant="caption" color="textSecondary">
            Price Integration (30%)
          </Typography>
          <Typography variant="body2">
            {(efficiencyComponents?.priceIntegration * 100).toFixed(1)}%
          </Typography>
          <Typography variant="caption" color="textSecondary">
            Price correlation between markets
          </Typography>
        </Grid>
        <Grid item xs={12} md={3}>
          <Typography variant="caption" color="textSecondary">
            Price Stability (20%)
          </Typography>
          <Typography variant="body2">
            {(efficiencyComponents?.stability * 100).toFixed(1)}%
          </Typography>
          <Typography variant="caption" color="textSecondary">
            Consistency of prices over time
          </Typography>
        </Grid>
        <Grid item xs={12} md={3}>
          <Typography variant="caption" color="textSecondary">
            Conflict Resilience (10%)
          </Typography>
          <Typography variant="body2">
            {(efficiencyComponents?.conflictResilience * 100).toFixed(1)}%
          </Typography>
          <Typography variant="caption" color="textSecondary">
            Market function under conflict
          </Typography>
        </Grid>
      </Grid>
    </Box>
  );
};

// Update the efficiency metric card in ClusterAnalysis component
const ClusterEfficiencyMetric = ({ value, showTooltip = false }) => {
  useEffect(() => {
    console.debug('Cluster Efficiency Value:', value);
  }, [value]);

  return (
    <MetricProgress
      title="Cluster Efficiency"
      value={value}
      format="percentage"
      description="Market integration efficiency"
      showTarget={false}
      tooltip={showTooltip ? `
        Cluster efficiency is calculated using:
        - Market Connectivity (40%): Proportion of active market connections
        - Price Integration (30%): Price correlation between markets
        - Price Stability (20%): Consistency of prices over time
        - Conflict Resilience (10%): Market function under conflict
      ` : undefined}
    />
  );
};

const ClusterAnalysis = () => {
  const theme = useTheme();
  const [selectedClusterId, setSelectedClusterId] = useState(null);
  const [showHelp, setShowHelp] = useState(true);
  
  // Use cluster analysis hook
  const { clusters: processedClusters, selectedCluster, metrics: overallMetrics } = useClusterAnalysis(selectedClusterId);
  const geometry = useSelector(selectGeometryData);

  // Hide help text when a cluster is selected
  useEffect(() => {
    if (selectedClusterId) {
      setShowHelp(false);
    }
  }, [selectedClusterId]);

  // Handle cluster selection
  const handleClusterSelect = useCallback((clusterId) => {
    console.debug('Selected Cluster ID:', clusterId);
    setSelectedClusterId(clusterId);
  }, []);

  if (!processedClusters?.length) {
    return (
      <Alert severity="info" sx={{ m: 2 }}>
        No market cluster data available for analysis.
      </Alert>
    );
  }

  return (
    <Grid container spacing={2}>
      {/* Overview Metrics */}
      <Grid item xs={12}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={3}>
            <MetricCard
              title="Total Markets"
              value={overallMetrics?.totalMarkets}
              format="integer"
              description="Number of markets in clusters"
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <MetricProgress
              title="Market Coverage"
              value={overallMetrics?.marketCoverage}
              format="percentage"
              description="Percentage of markets in clusters"
              showTarget={false}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <MetricCard
              title="Average Price"
              value={overallMetrics?.avgPrice}
              format="currency"
              description="Average price across clusters"
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <MetricCard
              title="Conflict Impact"
              value={overallMetrics?.avgConflict}
              format="number"
              description="Average conflict intensity"
            />
          </Grid>
        </Grid>
      </Grid>

      {/* Cluster Map */}
      <Grid item xs={12}>
        <Paper sx={{ height: 600, p: 2, position: 'relative' }}>
          <ClusterMap
            clusters={processedClusters}
            selectedClusterId={selectedClusterId}
            onClusterSelect={handleClusterSelect}
            geometry={geometry}
          />
          
          {/* Help Text */}
          <Fade in={showHelp}>
            <Box
              sx={{
                position: 'absolute',
                top: 16,
                right: 16,
                bgcolor: 'rgba(255, 255, 255, 0.9)',
                p: 2,
                borderRadius: 1,
                boxShadow: 1,
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                zIndex: 1000
              }}
            >
              <MouseIcon color="action" />
              <Typography variant="body2" color="text.secondary">
                Click on a colored region to view cluster details
              </Typography>
            </Box>
          </Fade>
        </Paper>
      </Grid>

      {/* Selected Cluster Details */}
      {selectedCluster && selectedCluster.metrics && (
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              {selectedCluster.main_market} Market Cluster
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={3}>
                <MetricCard
                  title="Markets"
                  value={selectedCluster.metrics.marketCount}
                  format="integer"
                  description="Connected markets"
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <ClusterEfficiencyMetric 
                  value={selectedCluster.metrics.efficiency}
                  showTooltip={true}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <MetricCard
                  title="Average Price"
                  value={selectedCluster.metrics.avgPrice}
                  format="currency"
                  description="Average cluster price"
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <MetricCard
                  title="Conflict Level"
                  value={selectedCluster.metrics.avgConflict}
                  format="number"
                  description="Average conflict intensity"
                />
              </Grid>
            </Grid>
            
            <EfficiencyExplanation 
              efficiencyComponents={selectedCluster.metrics.efficiencyComponents}
            />

            <Box sx={{ mt: 2, p: 2, bgcolor: theme.palette.grey[50], borderRadius: 1 }}>
              <Typography variant="body2" color="textSecondary">
                {`This cluster contains ${selectedCluster.metrics.marketCount} markets with an efficiency rating of 
                ${(selectedCluster.metrics.efficiency * 100).toFixed(1)}%. 
                ${selectedCluster.metrics.avgConflict > 0.5 ? 
                  'High conflict intensity may affect market integration.' : 
                  'Market integration remains stable under current conditions.'}`}
              </Typography>
            </Box>
          </Paper>
        </Grid>
      )}
    </Grid>
  );
};

export default React.memo(ClusterAnalysis);
