// src/components/analysis/spatial-analysis/MapLegend.js

import React from 'react';
import PropTypes from 'prop-types';
import { Paper, Box, Typography } from '@mui/material';

export const MapLegend = ({ colorScale, variable, position = 'bottomright' }) => {
  if (!colorScale) return null;

  const domain = colorScale.domain();
  const steps = 5;
  const values = Array.from({ length: steps }, (_, i) => 
    domain[0] + (domain[1] - domain[0]) * (i / (steps - 1))
  );

  return (
    <Paper
      elevation={3}
      sx={{
        position: 'absolute',
        [position]: '10px',
        zIndex: 1000,
        p: 1,
        minWidth: 150,
      }}
    >
      <Typography variant="caption" gutterBottom>
        {variable}
      </Typography>
      
      <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
        {values.map((value, i) => (
          <Box
            key={i}
            sx={{
              width: 20,
              height: 20,
              bgcolor: colorScale(value),
              border: '1px solid',
              borderColor: 'divider',
            }}
          />
        ))}
      </Box>
      
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
        <Typography variant="caption">
          {domain[0].toFixed(1)}
        </Typography>
        <Typography variant="caption">
          {domain[1].toFixed(1)}
        </Typography>
      </Box>
    </Paper>
  );
};

MapLegend.propTypes = {
  colorScale: PropTypes.func,
  variable: PropTypes.string.isRequired,
  position: PropTypes.oneOf(['topleft', 'topright', 'bottomleft', 'bottomright']),
};

export default MapLegend;