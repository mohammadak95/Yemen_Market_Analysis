// src/components/analysis/spatial-analysis/components/network/NetworkGraphLegend.js

import React from 'react';
import { Box, Typography } from '@mui/material';

const NetworkGraphLegend = ({ colorScale }) => {
  const gradientId = 'centrality-gradient';

  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="body2">Node Centrality</Typography>
      <svg width="100%" height="10">
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
            {colorScale.range().map((color, index) => (
              <stop
                key={index}
                offset={`${(index / (colorScale.range().length - 1)) * 100}%`}
                stopColor={color}
              />
            ))}
          </linearGradient>
        </defs>
        <rect width="100%" height="10" fill={`url(#${gradientId})`} />
      </svg>
      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
        <Typography variant="caption">Low</Typography>
        <Typography variant="caption">High</Typography>
      </Box>
    </Box>
  );
};

export default NetworkGraphLegend;