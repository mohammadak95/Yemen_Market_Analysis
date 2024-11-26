// src/components/analysis/spatial-analysis/components/network/NetworkGraphLegend.js

import React from 'react';
import { Box, Typography, Tooltip, LinearProgress } from '@mui/material';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';

const DEBUG = process.env.NODE_ENV === 'development';

const NetworkGraphLegend = ({ metrics, maxCentrality, minCentrality }) => {
  if (DEBUG) {
    console.group('NetworkGraphLegend Render');
    console.log('Network Metrics:', metrics);
    console.log('Centrality Range:', { min: minCentrality, max: maxCentrality });
  }

  // Format metrics for display
  const formattedMetrics = {
    density: (metrics?.density || 0) * 100,
    averageConnectivity: metrics?.averageConnectivity || 0,
    marketCount: metrics?.marketCount || 0
  };

  if (DEBUG) {
    console.log('Formatted Metrics:', formattedMetrics);
    console.groupEnd();
  }

  return (
    <Box sx={{ p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
      <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
        Network Metrics
        <Tooltip title="Key metrics describing the market network structure and connectivity">
          <HelpOutlineIcon sx={{ ml: 1, fontSize: 16 }} />
        </Tooltip>
      </Typography>

      {/* Centrality Scale */}
      <Box sx={{ mt: 2 }}>
        <Typography variant="caption" display="block" gutterBottom>
          Market Centrality
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <Box sx={{ flex: 1 }}>
            <LinearProgress
              variant="determinate"
              value={100}
              sx={{
                height: 8,
                borderRadius: 1,
                background: 'linear-gradient(to right, #e3f2fd, #2196f3)',
                '& .MuiLinearProgress-bar': {
                  display: 'none'
                }
              }}
            />
          </Box>
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Typography variant="caption">
            {minCentrality?.toFixed(3) || '0.000'}
          </Typography>
          <Typography variant="caption">
            {maxCentrality?.toFixed(3) || '1.000'}
          </Typography>
        </Box>
      </Box>

      {/* Network Metrics */}
      <Box sx={{ mt: 3 }}>
        <Tooltip title="Percentage of possible connections that are active">
          <Box sx={{ mb: 2 }}>
            <Typography variant="caption" display="block">
              Network Density
            </Typography>
            <Typography variant="body2">
              {formattedMetrics.density.toFixed(1)}%
            </Typography>
            <LinearProgress 
              variant="determinate" 
              value={formattedMetrics.density}
              sx={{ mt: 0.5 }}
            />
          </Box>
        </Tooltip>

        <Tooltip title="Average number of connections per market">
          <Box sx={{ mb: 2 }}>
            <Typography variant="caption" display="block">
              Average Connectivity
            </Typography>
            <Typography variant="body2">
              {formattedMetrics.averageConnectivity.toFixed(2)} connections
            </Typography>
            <LinearProgress 
              variant="determinate" 
              value={(formattedMetrics.averageConnectivity / 10) * 100}
              sx={{ mt: 0.5 }}
            />
          </Box>
        </Tooltip>

        <Tooltip title="Total number of active markets in the network">
          <Box>
            <Typography variant="caption" display="block">
              Active Markets
            </Typography>
            <Typography variant="body2">
              {formattedMetrics.marketCount} markets
            </Typography>
          </Box>
        </Tooltip>
      </Box>

      {/* Flow Legend */}
      <Box sx={{ mt: 3 }}>
        <Typography variant="caption" display="block" gutterBottom>
          Flow Strength
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
          <Box sx={{ width: 30, height: 2, bgcolor: 'grey.300', mr: 1 }} />
          <Typography variant="caption">Low Flow</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
          <Box sx={{ width: 30, height: 3, bgcolor: 'grey.500', mr: 1 }} />
          <Typography variant="caption">Medium Flow</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Box sx={{ width: 30, height: 4, bgcolor: 'grey.700', mr: 1 }} />
          <Typography variant="caption">High Flow</Typography>
        </Box>
      </Box>
    </Box>
  );
};

export default NetworkGraphLegend;