// src/components/analysis/spatial-analysis/components/network/ClusterEfficiencyDashboard.js

import React, { useState, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { 
  Paper, 
  Typography, 
  Box, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem, 
  Grid,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tooltip,
  IconButton
} from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';
import { ResponsiveLine } from '@nivo/line';
import { useClusterEfficiency } from '../../hooks/useClusterEfficiency';

const DEBUG = process.env.NODE_ENV === 'development';

const ClusterEfficiencyDashboard = () => {
  const [selectedClusterId, setSelectedClusterId] = useState(1);
  
  // Using the custom hook to get processed cluster data
  const clusters = useClusterEfficiency();

  if (DEBUG) {
    console.group('ClusterEfficiencyDashboard Render');
    console.log('Clusters:', clusters);
    console.log('Selected Cluster ID:', selectedClusterId);
  }

  const selectedCluster = clusters.find(c => c.cluster_id === selectedClusterId);

  if (DEBUG && selectedCluster) {
    console.log('Selected Cluster Data:', selectedCluster);
  }

  const handleClusterChange = useCallback((event) => {
    setSelectedClusterId(event.target.value);
  }, []);

  // Early return if no data
  if (!clusters.length) {
    console.warn('No cluster data available');
    return (
      <Paper sx={{ p: 2 }}>
        <Typography>No cluster data available.</Typography>
      </Paper>
    );
  }

  // Prepare efficiency metrics for visualization
  const metricsData = selectedCluster ? [
    { metric: 'Internal Connectivity', value: selectedCluster.metrics.internal_connectivity },
    { metric: 'Market Coverage', value: selectedCluster.metrics.market_coverage },
    { metric: 'Price Convergence', value: selectedCluster.metrics.price_convergence },
    { metric: 'Stability', value: selectedCluster.metrics.stability }
  ] : [];

  if (DEBUG) {
    console.log('Metrics Data:', metricsData);
    console.groupEnd();
  }

  return (
    <Paper sx={{ p: 3 }}>
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h6">
          Cluster Efficiency Analysis
          <Tooltip title="Analysis of market cluster efficiency based on internal connectivity, market coverage, price convergence, and stability metrics">
            <IconButton size="small" sx={{ ml: 1 }}>
              <InfoIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Typography>
      </Box>

      <FormControl fullWidth sx={{ mb: 3 }}>
        <InputLabel>Select Cluster</InputLabel>
        <Select
          value={selectedClusterId}
          onChange={handleClusterChange}
          label="Select Cluster"
        >
          {clusters.map((cluster) => (
            <MenuItem key={cluster.cluster_id} value={cluster.cluster_id}>
              Cluster {cluster.cluster_id} - {cluster.main_market} 
              ({cluster.connected_markets.length} markets)
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {selectedCluster && (
        <Grid container spacing={3}>
          {/* Metrics Overview */}
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle1" gutterBottom>
              Efficiency Metrics
            </Typography>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Metric</TableCell>
                  <TableCell align="right">Value</TableCell>
                  <TableCell align="right">Rating</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {metricsData.map(({ metric, value }) => (
                  <TableRow key={metric}>
                    <TableCell>{metric}</TableCell>
                    <TableCell align="right">{(value * 100).toFixed(1)}%</TableCell>
                    <TableCell align="right">
                      {value >= 0.7 ? '🟢 High' : 
                       value >= 0.4 ? '🟡 Medium' : '🔴 Low'}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow>
                  <TableCell><strong>Overall Efficiency</strong></TableCell>
                  <TableCell align="right">
                    <strong>
                      {(selectedCluster.metrics.efficiency_score * 100).toFixed(1)}%
                    </strong>
                  </TableCell>
                  <TableCell align="right">
                    {selectedCluster.metrics.efficiency_score >= 0.7 ? '🟢 High' : 
                     selectedCluster.metrics.efficiency_score >= 0.4 ? '🟡 Medium' : '🔴 Low'}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </Grid>

          {/* Connected Markets */}
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle1" gutterBottom>
              Connected Markets
            </Typography>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Market</TableCell>
                  <TableCell align="right">Flow Count</TableCell>
                  <TableCell align="right">Avg Flow</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {selectedCluster.connected_markets.map((market) => (
                  <TableRow key={market}>
                    <TableCell>{market}</TableCell>
                    <TableCell align="right">
                      {selectedCluster.flows?.[market]?.count || 0}
                    </TableCell>
                    <TableCell align="right">
                      {(selectedCluster.flows?.[market]?.avgFlow || 0).toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Grid>
        </Grid>
      )}
    </Paper>
  );
};

export default ClusterEfficiencyDashboard;