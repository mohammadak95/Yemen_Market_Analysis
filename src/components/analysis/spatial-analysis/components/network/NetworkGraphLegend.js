// src/components/analysis/spatial-analysis/components/network/NetworkGraphLegend.js

import React from 'react';
import { Box, Typography } from '@mui/material';

const NetworkGraphLegend = () => {
  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="body2">Node Centrality</Typography>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          mt: 1,
        }}
      >
        <Box
          sx={{
            width: 20,
            height: 20,
            backgroundColor: 'success.main',
            mr: 1,
          }}
        ></Box>
        <Typography variant="caption">Low Centrality</Typography>
      </Box>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          mt: 1,
        }}
      >
        <Box
          sx={{
            width: 20,
            height: 20,
            backgroundColor: 'warning.main',
            mr: 1,
          }}
        ></Box>
        <Typography variant="caption">Medium Centrality</Typography>
      </Box>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          mt: 1,
        }}
      >
        <Box
          sx={{
            width: 20,
            height: 20,
            backgroundColor: 'error.main',
            mr: 1,
          }}
        ></Box>
        <Typography variant="caption">High Centrality</Typography>
      </Box>
    </Box>
  );
};

export default NetworkGraphLegend;