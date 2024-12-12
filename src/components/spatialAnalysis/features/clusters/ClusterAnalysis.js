// src/components/spatialAnalysis/features/clusters/ClusterAnalysis.js

import React, { useState, useCallback, useEffect } from 'react';
import {
  Grid,
  Paper,
  Typography,
  Box,
  Alert,
  useTheme,
  Fade,
  Button,
  Collapse,
  List,
  ListItem,
  ListItemText,
  Divider,
  Tooltip
} from '@mui/material';
import { useSelector } from 'react-redux';
import MouseIcon from '@mui/icons-material/Mouse';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';

import ClusterMap from '../../organisms/ClusterMap';
import MetricCard from '../../atoms/MetricCard';
import MetricProgress from '../../molecules/MetricProgress';
import { useClustersWithCoordinates } from '../../../../hooks/useSpatialSelectors';
import { selectGeometryData } from '../../../../selectors/optimizedSelectors';
import { useClusterAnalysis } from '../../hooks/useClusterAnalysis';

// Enhanced efficiency explanation with tooltips
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
      borderRadius: 1,
      boxShadow: 1
    }}>
      <Typography variant="subtitle2" gutterBottom color="primary">
        Market Efficiency Components
      </Typography>
      <Grid container spacing={2}>
        <Grid item xs={12} md={3}>
          <Tooltip title="Measures the strength and density of market connections within the cluster">
            <Box>
              <Typography variant="caption" color="textSecondary">
                Market Connectivity (40%)
              </Typography>
              <Typography variant="body2" fontWeight="medium">
                {(efficiencyComponents?.connectivity * 100).toFixed(1)}%
              </Typography>
              <Typography variant="caption" color="textSecondary">
                Internal market connections
              </Typography>
            </Box>
          </Tooltip>
        </Grid>
        <Grid item xs={12} md={3}>
          <Tooltip title="Evaluates the degree of price correlation between markets in the cluster">
            <Box>
              <Typography variant="caption" color="textSecondary">
                Price Integration (30%)
              </Typography>
              <Typography variant="body2" fontWeight="medium">
                {(efficiencyComponents?.priceIntegration * 100).toFixed(1)}%
              </Typography>
              <Typography variant="caption" color="textSecondary">
                Price correlation between markets
              </Typography>
            </Box>
          </Tooltip>
        </Grid>
        <Grid item xs={12} md={3}>
          <Tooltip title="Measures the consistency and predictability of prices over time">
            <Box>
              <Typography variant="caption" color="textSecondary">
                Price Stability (20%)
              </Typography>
              <Typography variant="body2" fontWeight="medium">
                {(efficiencyComponents?.stability * 100).toFixed(1)}%
              </Typography>
              <Typography variant="caption" color="textSecondary">
                Price consistency over time
              </Typography>
            </Box>
          </Tooltip>
        </Grid>
        <Grid item xs={12} md={3}>
          <Tooltip title="Assesses the market's ability to maintain function during conflict">
            <Box>
              <Typography variant="caption" color="textSecondary">
                Conflict Resilience (10%)
              </Typography>
              <Typography variant="body2" fontWeight="medium">
                {(efficiencyComponents?.conflictResilience * 100).toFixed(1)}%
              </Typography>
              <Typography variant="caption" color="textSecondary">
                Market function under conflict
              </Typography>
            </Box>
          </Tooltip>
        </Grid>
      </Grid>
    </Box>
  );
};

// Enhanced efficiency metric card
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
        Comprehensive measure of market cluster performance:
        • Market Connectivity (40%): Network strength
        • Price Integration (30%): Price correlation
        • Price Stability (20%): Temporal consistency
        • Conflict Resilience (10%): Stress resistance
      ` : undefined}
    />
  );
};

const ClusterAnalysis = () => {
  const theme = useTheme();
  const [selectedClusterId, setSelectedClusterId] = useState(null);
  const [showHelp, setShowHelp] = useState(true);
  const [showMethodology, setShowMethodology] = useState(false);
  
  // Use cluster analysis hook
  const { clusters: processedClusters, selectedCluster, metrics: overallMetrics } = useClusterAnalysis(selectedClusterId);
  const geometry = useSelector(selectGeometryData);

  // Ensure we have valid values for metrics
  const safeMetrics = {
    totalMarkets: overallMetrics?.totalMarkets || 0,
    marketCoverage: overallMetrics?.marketCoverage || 0,
    avgPrice: overallMetrics?.avgPrice || 0,
    avgConflict: overallMetrics?.avgConflict || 0
  };

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
        No market cluster data available for analysis. Please ensure data is properly loaded.
      </Alert>
    );
  }

  return (
    <Grid container spacing={2}>
      {/* Overview Metrics */}
      <Grid item xs={12}>
        <Paper sx={{ p: 2, boxShadow: 2 }}>
          <Typography variant="h6" gutterBottom color="primary">
            Market Cluster Overview
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={3}>
              <Tooltip title="Total number of markets included in identified clusters">
                <Box>
                  <MetricCard
                    title="Total Markets"
                    value={safeMetrics.totalMarkets}
                    format="integer"
                    description="Markets in clusters"
                  />
                </Box>
              </Tooltip>
            </Grid>
            <Grid item xs={12} md={3}>
              <Tooltip title="Percentage of total markets that are part of identified clusters">
                <Box>
                  <MetricProgress
                    title="Market Coverage"
                    value={safeMetrics.marketCoverage}
                    format="percentage"
                    description="Markets in clusters"
                    showTarget={false}
                  />
                </Box>
              </Tooltip>
            </Grid>
            <Grid item xs={12} md={3}>
              <Tooltip title="Average commodity price across all clustered markets">
                <Box>
                  <MetricCard
                    title="Average Price"
                    value={safeMetrics.avgPrice}
                    format="currency"
                    description="Across clusters"
                  />
                </Box>
              </Tooltip>
            </Grid>
            <Grid item xs={12} md={3}>
              <Tooltip title="Average conflict intensity affecting market clusters">
                <Box>
                  <MetricCard
                    title="Conflict Impact"
                    value={safeMetrics.avgConflict}
                    format="number"
                    description="Conflict intensity"
                  />
                </Box>
              </Tooltip>
            </Grid>
          </Grid>
        </Paper>
      </Grid>

      {/* Cluster Map */}
      <Grid item xs={12}>
        <Paper sx={{ height: 600, p: 2, position: 'relative', boxShadow: 2 }}>
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
                bgcolor: 'rgba(255, 255, 255, 0.95)',
                p: 2,
                borderRadius: 1,
                boxShadow: 2,
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                zIndex: 1000
              }}
            >
              <MouseIcon color="primary" />
              <Typography variant="body2" color="text.secondary">
                Click on any colored region to view detailed cluster analysis
              </Typography>
            </Box>
          </Fade>
        </Paper>
      </Grid>

      {/* Selected Cluster Details */}
      {selectedCluster && selectedCluster.metrics && (
        <Grid item xs={12}>
          <Paper sx={{ p: 2, boxShadow: 2 }}>
            <Typography variant="h6" gutterBottom color="primary">
              {selectedCluster.main_market} Market Cluster Analysis
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={3}>
                <Tooltip title="Number of markets connected within this cluster">
                  <Box>
                    <MetricCard
                      title="Connected Markets"
                      value={selectedCluster.metrics.marketCount}
                      format="integer"
                      description="Active connections"
                    />
                  </Box>
                </Tooltip>
              </Grid>
              <Grid item xs={12} md={3}>
                <ClusterEfficiencyMetric 
                  value={selectedCluster.metrics.efficiency}
                  showTooltip={true}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <Tooltip title="Average commodity price within this cluster">
                  <Box>
                    <MetricCard
                      title="Average Price"
                      value={selectedCluster.metrics.avgPrice}
                      format="currency"
                      description="Cluster average"
                    />
                  </Box>
                </Tooltip>
              </Grid>
              <Grid item xs={12} md={3}>
                <Tooltip title="Average conflict intensity affecting this cluster">
                  <Box>
                    <MetricCard
                      title="Conflict Impact"
                      value={selectedCluster.metrics.avgConflict}
                      format="number"
                      description="Local intensity"
                    />
                  </Box>
                </Tooltip>
              </Grid>
            </Grid>
            
            <EfficiencyExplanation 
              efficiencyComponents={selectedCluster.metrics.efficiencyComponents}
            />

            <Box sx={{ mt: 2, p: 2, bgcolor: theme.palette.grey[50], borderRadius: 1, boxShadow: 1 }}>
              <Typography variant="body2" color="text.secondary">
                {`This cluster contains ${selectedCluster.metrics.marketCount} interconnected markets with an efficiency rating of 
                ${(selectedCluster.metrics.efficiency * 100).toFixed(1)}%. 
                ${selectedCluster.metrics.avgConflict > 0.5 ? 
                  'High conflict intensity may be impacting market integration and efficiency.' : 
                  'Market integration remains robust under current conditions.'}`}
              </Typography>
            </Box>
          </Paper>
        </Grid>
      )}

      {/* Methodology Section */}
      <Grid item xs={12}>
        <Paper sx={{ p: 2, boxShadow: 2 }}>
          <Button
            fullWidth
            onClick={() => setShowMethodology(!showMethodology)}
            endIcon={showMethodology ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            startIcon={<InfoOutlinedIcon />}
          >
            Market Cluster Analysis Methodology
          </Button>
          <Collapse in={showMethodology}>
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle1" gutterBottom color="primary">
              Understanding Market Cluster Analysis
            </Typography>
            <Typography variant="body2" paragraph>
              Market clusters are identified and analyzed using a comprehensive approach that combines
              spatial relationships, price dynamics, and conflict impact assessment:
            </Typography>
            <List dense>
              <ListItem>
                <ListItemText
                  primary={
                    <Typography variant="subtitle2" color="primary">
                      Cluster Identification
                    </Typography>
                  }
                  secondary={
                    <Typography variant="body2" color="textSecondary">
                      Markets are grouped based on spatial proximity, trade relationships,
                      and price correlation patterns
                    </Typography>
                  }
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary={
                    <Typography variant="subtitle2" color="primary">
                      Efficiency Calculation
                    </Typography>
                  }
                  secondary={
                    <Typography variant="body2" color="textSecondary">
                      Cluster efficiency is measured through market connectivity (40%),
                      price integration (30%), stability (20%), and conflict resilience (10%)
                    </Typography>
                  }
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary={
                    <Typography variant="subtitle2" color="primary">
                      Impact Assessment
                    </Typography>
                  }
                  secondary={
                    <Typography variant="body2" color="textSecondary">
                      Conflict impact is evaluated through market disruption patterns,
                      price volatility, and trade flow changes
                    </Typography>
                  }
                />
              </ListItem>
            </List>
            <Box sx={{ mt: 2, p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
              <Typography variant="subtitle2" gutterBottom color="primary">
                Interpretation Guide:
              </Typography>
              <Typography variant="body2" component="div">
                • High Efficiency (&gt;70%): Strong market integration and resilience<br/>
                • Medium Efficiency (40-70%): Moderate market function with some constraints<br/>
                • Low Efficiency (&lt;40%): Significant market fragmentation or disruption
              </Typography>
            </Box>
          </Collapse>
        </Paper>
      </Grid>
    </Grid>
  );
};

export default React.memo(ClusterAnalysis);
