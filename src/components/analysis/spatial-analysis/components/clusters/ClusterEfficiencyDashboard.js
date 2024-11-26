// src/components/analysis/spatial-analysis/components/clusters/ClusterEfficiencyDashboard.js

import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Grid, Typography, Box, Paper, List, ListItem, ListItemText, Divider } from '@mui/material';
import { useClusterEfficiency } from '../../hooks/useClusterEfficiency';
import ClusterMap from './ClusterMap';
import EfficiencyRadarChart from './EfficiencyRadarChart';
import ClusterComparisonTable from './ClusterComparisonTable';
import EfficiencyExplanation from './EfficiencyExplanation';

const ClusterEfficiencyDashboard = ({ geometry }) => {
  const clusters = useClusterEfficiency();
  const [selectedClusterId, setSelectedClusterId] = useState(null);

  const selectedCluster = clusters.find(cluster => cluster.cluster_id === selectedClusterId);

  const handleClusterSelect = (clusterId) => {
    setSelectedClusterId(clusterId);
  };

  const formatValue = (value) => {
    if (value === null || value === undefined) return 'N/A';
    return Number(value).toFixed(2);
  };

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h5" gutterBottom>
        Cluster Efficiency Analysis
      </Typography>

      <Grid container spacing={3}>
        {/* Map and Explanations */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <ClusterMap
              clusters={clusters}
              selectedClusterId={selectedClusterId}
              onClusterSelect={handleClusterSelect}
              geometry={geometry}
            />
          </Paper>

          <EfficiencyExplanation />
        </Grid>

        {/* Cluster Details */}
        <Grid item xs={12} md={6}>
          {selectedCluster ? (
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Cluster Details: {selectedCluster.main_market || 'Unknown'}
              </Typography>

              <List dense>
                <ListItem>
                  <ListItemText
                    primary="Efficiency Score"
                    secondary={formatValue(selectedCluster.efficiency_metrics?.efficiency_score)}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Internal Connectivity"
                    secondary={formatValue(selectedCluster.efficiency_metrics?.internal_connectivity)}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Market Coverage"
                    secondary={formatValue(selectedCluster.efficiency_metrics?.market_coverage)}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Price Convergence"
                    secondary={formatValue(selectedCluster.efficiency_metrics?.price_convergence)}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Stability"
                    secondary={formatValue(selectedCluster.efficiency_metrics?.stability)}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Number of Markets"
                    secondary={selectedCluster.connected_markets?.length || 0}
                  />
                </ListItem>
              </List>

              <Divider sx={{ my: 2 }} />

              <Typography variant="subtitle1" gutterBottom>
                Efficiency Radar Chart
              </Typography>
              <EfficiencyRadarChart cluster={selectedCluster} />
            </Paper>
          ) : (
            <Paper sx={{ p: 2 }}>
              <Typography variant="body1">Select a cluster on the map to view details.</Typography>
            </Paper>
          )}
        </Grid>

        {/* Cluster Comparison Table */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Cluster Comparison
            </Typography>
            <ClusterComparisonTable clusters={clusters || []} />
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

ClusterEfficiencyDashboard.propTypes = {
  geometry: PropTypes.object.isRequired,
};

export default React.memo(ClusterEfficiencyDashboard);
