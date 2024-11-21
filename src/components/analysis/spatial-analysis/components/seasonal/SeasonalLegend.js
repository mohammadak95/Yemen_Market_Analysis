// src/components/analysis/spatial-analysis/components/seasonal/SeasonalLegend.js

import React from 'react';
import { Box, Typography } from '@mui/material';

const SeasonalLegend = ({ colorScale }) => {
  const values = [-1, -0.5, 0, 0.5, 1];

  return (
    <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
      {values.map((value, i) => (
        <Box key={i} sx={{ textAlign: 'center' }}>
          <Box
            sx={{
              width: 20,
              height: 20,
              backgroundColor: colorScale(value),
              border: '1px solid rgba(0,0,0,0.1)'
            }}
          />
          <Typography variant="caption">
            {(value * 100).toFixed(0)}%
          </Typography>
        </Box>
      ))}
      <Typography variant="body2" sx={{ ml: 2 }}>
        Seasonal Price Effect
      </Typography>
    </Box>
  );
};

export default SeasonalLegend;